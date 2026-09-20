#!/usr/bin/env python3
"""
StudyGotchi GLB quality gate (Python 3, stdlib only).

Parses glTF 2.0 binaries (.glb) and JSON (.gltf, with data: or side-car buffers) without any
third-party library and checks them against the technical contract in `.fleet/org.md`:

  +Y up, +Z front, feet on y = 0, origin at the base centre, metres, flat baseColorFactor
  materials, no textures, no glTF extensions, no Draco, triangle budgets per asset kind,
  animation clips named idle / walk / happy / sad / sleep when present.

Usage:
  python3 tools/qa/check_glb.py assets/creatures/generated --kind creature
  python3 tools/qa/check_glb.py "assets/creatures/cc0/**/*.glb" --third-party
  python3 tools/qa/check_glb.py assets/creatures/animated --kind creature \
      --expect-clips idle,walk,happy,sad,sleep --exclude "*_input_snapshot*" --json-out tools/qa/out/x.json
  python3 tools/qa/check_glb.py some.glb --json          # machine output on stdout

Exit code 0 when every first-party file passes, 1 when any first-party file fails, 2 on usage
errors. Third-party files (`--third-party`, or any path containing a `cc0` folder) are reported
and tagged but never fail the gate unless `--strict-third-party` is given.
"""

import argparse
import base64
import fnmatch
import glob
import json
import math
import os
import struct
import sys
import time

# ----------------------------------------------------------------------------- budgets (org.md + briefs)

KINDS = {
    # triangles: org.md technical contract. heights: creature = generator convention 0.70-0.90 m
    # (manifest `conventions.height_m`), landmarks = Brief 4 (s1 ~0.5, s2 ~1.0, s3 ~1.8 m) with
    # generous bands, prop = anything hand-held to bench-sized. max_kb is a soft (WARN) budget.
    "creature":    {"tris": 1500, "height": (0.69, 0.91), "front": True,  "max_kb": 512},
    "landmark-s1": {"tris": 400,  "height": (0.30, 0.70), "front": False, "max_kb": 256},
    "landmark-s2": {"tris": 900,  "height": (0.70, 1.30), "front": False, "max_kb": 384},
    "landmark-s3": {"tris": 1600, "height": (1.40, 2.20), "front": False, "max_kb": 512},
    "prop":        {"tris": 300,  "height": (0.01, 1.50), "front": False, "max_kb": 128},
    # terrain pieces (landmark manifest v2 `kind: "terrain"`): hills, mountain cones, lake discs
    "terrain":     {"tris": 2500, "height": (0.02, 3.00), "front": False, "max_kb": 768},
    # growth manifest: hero growth stages g0..g3, construction states; landmark manifest v4 kinds
    "growth":       {"tris": 2500, "height": (0.05, 5.00), "front": False, "max_kb": 768},
    "construction": {"tris": 800,  "height": (0.05, 3.00), "front": False, "max_kb": 384},
    "ruin":         {"tris": 600,  "height": (0.05, 1.20), "front": False, "max_kb": 256},
    "scaffold":     {"tris": 400,  "height": (0.05, 1.30), "front": False, "max_kb": 256},
    "hero":         {"tris": 2500, "height": (0.05, 5.00), "front": False, "max_kb": 768},
    "shared":       {"tris": 300,  "height": (0.01, 3.00), "front": False, "max_kb": 128},  # pedestal tiers <= 3 m
}
# manifest kind -> budget key when the names differ
KIND_ALIASES = {"catastrophe": "prop", "decor": "prop", "landmark-prop": "prop"}
# height caps that depend on the item name inside a kind (org: signpost <= 2 m, shared props are small)
SHARED_NAME_HEIGHTS = (("signpost", 2.00), ("pedestal", 3.00), ("tier", 3.00))
MIN_CONTRAST = 1.4   # Art Director rule: creature body vs family ground (assets/biomes/catalog.json)
FAMILY_ALIASES = {"moon": "space"}
CANONICAL_CLIPS = ("idle", "walk", "happy", "sad", "sleep")
MIN_Y_TOL = 0.005          # feet must sit on y = 0 within +-5 mm
ORIGIN_FRAC = 0.25         # bbox centre x/z must be within 25 % of the footprint of (0, 0)
ROUGHNESS_BAND = (0.4, 0.8)  # contract says ~0.6; outside this band is a WARN
DRACO = "KHR_draco_mesh_compression"
COMPRESSION_EXTS = {DRACO, "EXT_meshopt_compression", "KHR_texture_basisu", "EXT_texture_webp"}

# ----------------------------------------------------------------------------- glTF parsing

MAGIC = b"glTF"
CHUNK_JSON = 0x4E4F534A
CHUNK_BIN = 0x004E4942
COMPONENT = {5120: ("b", 1), 5121: ("B", 1), 5122: ("h", 2), 5123: ("H", 2), 5125: ("I", 4), 5126: ("f", 4)}
NORMALIZE_DIV = {5120: 127.0, 5121: 255.0, 5122: 32767.0, 5123: 65535.0, 5125: 4294967295.0}
NCOMP = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT2": 4, "MAT3": 9, "MAT4": 16}
MODE_TRIS = {4: lambda n: n // 3, 5: lambda n: max(0, n - 2), 6: lambda n: max(0, n - 2)}


class GltfError(Exception):
    pass


def load_uri(uri, base_dir):
    if uri.startswith("data:"):
        comma = uri.find(",")
        if comma < 0:
            raise GltfError("malformed data URI")
        return base64.b64decode(uri[comma + 1:])
    path = os.path.join(base_dir, uri)
    if not os.path.isfile(path):
        raise GltfError(f"missing side-car buffer {uri}")
    with open(path, "rb") as f:
        return f.read()


def load_gltf(path):
    """Return (gltf_json, buffers[bytes], container) for a .glb or .gltf file."""
    with open(path, "rb") as f:
        data = f.read()
    base_dir = os.path.dirname(os.path.abspath(path))
    if data[:4] == MAGIC:
        if len(data) < 12:
            raise GltfError("truncated GLB header")
        _, version, length = struct.unpack_from("<4sII", data, 0)
        if version != 2:
            raise GltfError(f"GLB container version {version} (expected 2)")
        if length != len(data):
            raise GltfError(f"GLB header length {length} != file size {len(data)}")
        offset, json_chunk, bin_chunk = 12, None, None
        while offset + 8 <= length:
            clen, ctype = struct.unpack_from("<II", data, offset)
            offset += 8
            if offset + clen > length:
                raise GltfError("GLB chunk overruns file")
            chunk = data[offset:offset + clen]
            offset += clen
            if ctype == CHUNK_JSON and json_chunk is None:
                json_chunk = chunk
            elif ctype == CHUNK_BIN and bin_chunk is None:
                bin_chunk = chunk
        if json_chunk is None:
            raise GltfError("GLB has no JSON chunk")
        gltf = json.loads(json_chunk.decode("utf-8"))
        buffers = []
        for b in gltf.get("buffers", []):
            if "uri" in b:
                buffers.append(load_uri(b["uri"], base_dir))
            else:
                if bin_chunk is None:
                    raise GltfError("buffer refers to the BIN chunk but GLB has none")
                buffers.append(bin_chunk)
        container = "glb"
    else:
        try:
            gltf = json.loads(data.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise GltfError(f"not a GLB and not JSON glTF ({exc.__class__.__name__})")
        buffers = [load_uri(b["uri"], base_dir) if "uri" in b else b"" for b in gltf.get("buffers", [])]
        container = "gltf"
    version = str(gltf.get("asset", {}).get("version", ""))
    if not version.startswith("2."):
        raise GltfError(f"asset.version {version!r} is not glTF 2.x")
    return gltf, buffers, container


def read_accessor(gltf, buffers, idx):
    """Decode an accessor into a list of tuples (one tuple per element)."""
    acc = gltf["accessors"][idx]
    n = acc["count"]
    fmt, csize = COMPONENT[acc["componentType"]]
    ncomp = NCOMP[acc["type"]]
    elem_size = csize * ncomp
    if "bufferView" in acc:
        bv = gltf["bufferViews"][acc["bufferView"]]
        buf = buffers[bv["buffer"]]
        base = bv.get("byteOffset", 0) + acc.get("byteOffset", 0)
        stride = bv.get("byteStride") or elem_size
        end = base + (n - 1) * stride + elem_size if n else base
        if end > len(buf) or end > bv.get("byteOffset", 0) + bv["byteLength"]:
            raise GltfError(f"accessor {idx} overruns its bufferView/buffer")
        s = struct.Struct("<" + fmt * ncomp)
        if stride == elem_size:
            values = list(s.iter_unpack(buf[base:base + n * elem_size]))
        else:
            values = [s.unpack_from(buf, base + i * stride) for i in range(n)]
    else:
        values = [(0,) * ncomp] * n
    sparse = acc.get("sparse")
    if sparse:
        values = [list(v) for v in values]
        si, sv = sparse["indices"], sparse["values"]
        ibv = gltf["bufferViews"][si["bufferView"]]
        ifmt, _ = COMPONENT[si["componentType"]]
        ibuf = buffers[ibv["buffer"]]
        ibase = ibv.get("byteOffset", 0) + si.get("byteOffset", 0)
        idxs = struct.unpack_from("<" + ifmt * sparse["count"], ibuf, ibase)
        vbv = gltf["bufferViews"][sv["bufferView"]]
        vbuf = buffers[vbv["buffer"]]
        vbase = vbv.get("byteOffset", 0) + sv.get("byteOffset", 0)
        s = struct.Struct("<" + fmt * ncomp)
        for k, target in enumerate(idxs):
            values[target] = list(s.unpack_from(vbuf, vbase + k * elem_size))
        values = [tuple(v) for v in values]
    if acc.get("normalized") and acc["componentType"] in NORMALIZE_DIV:
        d = NORMALIZE_DIV[acc["componentType"]]
        values = [tuple(c / d for c in v) for v in values]
    return values


def accessor_range(gltf, buffers, idx):
    """(min, max) of a SCALAR accessor using the declared bounds when present."""
    acc = gltf["accessors"][idx]
    if "min" in acc and "max" in acc:
        return float(acc["min"][0]), float(acc["max"][0])
    vals = [v[0] for v in read_accessor(gltf, buffers, idx)]
    return (min(vals), max(vals)) if vals else (0.0, 0.0)


# ----------------------------------------------------------------------------- transforms

def mat_identity():
    return [[1.0, 0.0, 0.0, 0.0], [0.0, 1.0, 0.0, 0.0], [0.0, 0.0, 1.0, 0.0], [0.0, 0.0, 0.0, 1.0]]


def mat_mul(a, b):
    return [[sum(a[r][k] * b[k][c] for k in range(4)) for c in range(4)] for r in range(4)]


def node_local_matrix(node):
    if "matrix" in node:
        m = node["matrix"]  # column-major in glTF
        return [[float(m[c * 4 + r]) for c in range(4)] for r in range(4)]
    t = node.get("translation", (0.0, 0.0, 0.0))
    x, y, z, w = node.get("rotation", (0.0, 0.0, 0.0, 1.0))
    s = node.get("scale", (1.0, 1.0, 1.0))
    rot = [
        [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
        [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
        [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)],
    ]
    m = [[rot[r][c] * s[c] for c in range(3)] + [float(t[r])] for r in range(3)]
    m.append([0.0, 0.0, 0.0, 1.0])
    return m


def transform_point(m, p):
    x, y, z = p[0], p[1], p[2]
    return (
        m[0][0] * x + m[0][1] * y + m[0][2] * z + m[0][3],
        m[1][0] * x + m[1][1] * y + m[1][2] * z + m[1][3],
        m[2][0] * x + m[2][1] * y + m[2][2] * z + m[2][3],
    )


def scene_roots(gltf):
    nodes = gltf.get("nodes", [])
    scenes = gltf.get("scenes")
    if scenes:
        return list(scenes[gltf.get("scene", 0)].get("nodes", []))
    children = {c for n in nodes for c in n.get("children", [])}
    return [i for i in range(len(nodes)) if i not in children]


def walk_nodes(gltf):
    """Yield (node_index, node, world_matrix) depth-first from the default scene."""
    nodes = gltf.get("nodes", [])
    stack = [(i, mat_identity()) for i in reversed(scene_roots(gltf))]
    seen = set()
    while stack:
        i, parent = stack.pop()
        if i in seen or i >= len(nodes):
            continue
        seen.add(i)
        node = nodes[i]
        world = mat_mul(parent, node_local_matrix(node))
        yield i, node, world
        for c in reversed(node.get("children", [])):
            stack.append((c, world))


def all_node_worlds(gltf):
    """World matrix for every node (joints may live outside the default scene's mesh subtree)."""
    nodes = gltf.get("nodes", [])
    parent = {}
    for i, n in enumerate(nodes):
        for c in n.get("children", []):
            parent[c] = i
    worlds = {}

    def world(i, depth=0):
        if i in worlds:
            return worlds[i]
        local = node_local_matrix(nodes[i])
        if i in parent and depth < len(nodes):
            m = mat_mul(world(parent[i], depth + 1), local)
        else:
            m = local
        worlds[i] = m
        return m

    for i in range(len(nodes)):
        world(i)
    return worlds


def skin_matrices(gltf, buffers, skin_idx, worlds):
    """Per-joint (jointWorld x inverseBind) matrices: bind-pose linear blend skinning."""
    skin = gltf["skins"][skin_idx]
    joints = skin["joints"]
    if "inverseBindMatrices" in skin:
        ibms = read_accessor(gltf, buffers, skin["inverseBindMatrices"])
    else:
        ibms = [None] * len(joints)
    mats = []
    for jn, ibm in zip(joints, ibms):
        jw = worlds.get(jn, mat_identity())
        if ibm is None:
            mats.append(jw)
        else:
            mats.append(mat_mul(jw, [[float(ibm[c * 4 + r]) for c in range(4)] for r in range(4)]))
    return mats


def skin_points(pos, joints, weights, mats):
    out = []
    for p, jw, ww in zip(pos, joints, weights):
        x = y = z = 0.0
        total = 0.0
        for j, w in zip(jw, ww):
            if w <= 0.0 or int(j) >= len(mats):
                continue
            q = transform_point(mats[int(j)], p)
            x += w * q[0]
            y += w * q[1]
            z += w * q[2]
            total += w
        if total <= 0.0:
            out.append(p)
        else:
            out.append((x / total, y / total, z / total))
    return out


# ----------------------------------------------------------------------------- material helpers

TEXTURE_KEYS = ("baseColorTexture", "metallicRoughnessTexture", "normalTexture", "occlusionTexture",
                "emissiveTexture", "diffuseTexture", "specularGlossinessTexture", "specularTexture",
                "specularColorTexture", "clearcoatTexture", "sheenColorTexture", "transmissionTexture",
                "thicknessTexture", "iridescenceTexture", "anisotropyTexture")


def material_uses_textures(mat):
    def scan(obj):
        if isinstance(obj, dict):
            for k, v in obj.items():
                if k in TEXTURE_KEYS or (k.endswith("Texture") and isinstance(v, dict) and "index" in v):
                    return True
                if scan(v):
                    return True
        elif isinstance(obj, list):
            return any(scan(v) for v in obj)
        return False
    return scan(mat)


def material_luminance(mat):
    pbr = mat.get("pbrMetallicRoughness", {})
    r, g, b = (pbr.get("baseColorFactor", [1.0, 1.0, 1.0, 1.0]) + [1.0, 1.0, 1.0])[:3]
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def rgb_hex(mat):
    pbr = mat.get("pbrMetallicRoughness", {})
    c = pbr.get("baseColorFactor")
    if not c:
        return None
    lin_to_srgb = lambda v: 12.92 * v if v <= 0.0031308 else 1.055 * v ** (1 / 2.4) - 0.055
    return "#" + "".join(f"{int(round(max(0.0, min(1.0, lin_to_srgb(v))) * 255)):02X}" for v in c[:3])


# ----------------------------------------------------------------------------- the inspection

def load_manifest(path):
    """Map repo-relative file path (and basename) -> manifest item for any of the fleet manifests."""
    with open(path) as fh:
        m = json.load(fh)
    items = m.get("assets") or m.get("creatures") or m.get("items") or m.get("files") or []
    if isinstance(items, dict):
        items = list(items.values())
    index = {}
    for it in items:
        f = it.get("file")
        if not f:
            continue
        index[os.path.normpath(f).replace("\\", "/")] = it
        index.setdefault(os.path.basename(f), it)
    return {"path": path, "items": items, "index": index, "dir": os.path.dirname(os.path.abspath(path))}


def manifest_item(manifest, path):
    if not manifest:
        return None
    rel = os.path.relpath(os.path.abspath(path), REPO_ROOT).replace("\\", "/")
    return manifest["index"].get(rel) or manifest["index"].get(os.path.basename(path))


def kind_from_manifest(item):
    """kind/stage/variant -> budget key: landmark stage 2 (also s2b/s2c variants) -> landmark-s2;
    growth/hero keep their stage (g0..g3) in the record; catastrophe kit -> prop budget."""
    k = str(item.get("kind", "")).lower()
    if k == "landmark":
        stage = item.get("stage")
        if stage is None and item.get("variant"):
            digits = "".join(ch for ch in str(item["variant"]) if ch.isdigit())
            stage = int(digits[0]) if digits else None
        if stage is None:
            digits = "".join(ch for ch in os.path.basename(str(item.get("file", ""))).split("-s")[-1][:1] if ch.isdigit())
            stage = int(digits) if digits else None
        if stage in (1, 2, 3, "1", "2", "3"):
            return f"landmark-s{int(stage)}"
        return None
    k = KIND_ALIASES.get(k, k)
    if k in KINDS:
        return k
    if "decor" in [str(t).lower() for t in (item.get("tags") or [])]:
        return "prop"
    return None


def load_catalog(path):
    """assets/biomes/catalog.json -> {family id: ground hex}."""
    with open(path) as fh:
        c = json.load(fh)
    fams = c.get("families") or c.get("biomes") or []
    if isinstance(fams, dict):
        fams = [dict(v, id=k) for k, v in fams.items()]
    grounds = {}
    for f in fams:
        pal = f.get("palette") or {}
        ground = pal.get("ground") or f.get("ground")
        if f.get("id") and ground:
            grounds[str(f["id"]).lower()] = ground
    return grounds


def srgb_hex_to_linear(h):
    h = h.lstrip("#")
    out = []
    for i in (0, 2, 4):
        c = int(h[i:i + 2], 16) / 255.0
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return out


def contrast_ratio(hex_a, hex_b):
    """WCAG relative-luminance contrast ratio between two sRGB hex colours (>= 1)."""
    la = sum(w * c for w, c in zip((0.2126, 0.7152, 0.0722), srgb_hex_to_linear(hex_a)))
    lb = sum(w * c for w, c in zip((0.2126, 0.7152, 0.0722), srgb_hex_to_linear(hex_b)))
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))


def infer_kind(path):
    p = path.replace("\\", "/").lower()
    if "/terrain/" in p:
        return "terrain", None
    name = os.path.basename(p)
    if "/props/" in p or name.startswith("prop") or "/catastrophe/" in p:   # prop subfolders of other packs
        return "prop", None
    if "/growth/" in p:
        return ("construction" if "build" in name else "growth"), None
    if "/landmarks/" in p or "landmark" in name:
        for stage in ("1", "2", "3"):
            for pat in (f"-s{stage}", f"_s{stage}", f"stage{stage}", f"stage-{stage}", f"stage_{stage}", f"-{stage}.gl"):
                if pat in name:
                    return f"landmark-s{stage}", None
        return "landmark-s3", "landmark stage not inferable from file name; using the stage 3 budget"
    if "/creatures/" in p:
        return "creature", None
    return "creature", "kind not inferable from path; assuming creature"


def inspect(path, kind, third_party, expect_clips, allow_ext, allow_textures, rules=None, item=None):
    t0 = time.time()
    rules = rules or {}
    rec = {
        "file": path, "rel": os.path.relpath(path), "third_party": third_party, "kind": kind,
        "status": "PASS", "reasons": [], "warnings": [], "bytes": os.path.getsize(path),
        "manifest": bool(item), "tags": list((item or {}).get("tags") or []),
        "stage": (item or {}).get("stage"), "variant": (item or {}).get("variant"),
        "family": FAMILY_ALIASES.get(str((item or {}).get("family") or (item or {}).get("biome") or "").lower(),
                                     str((item or {}).get("family") or (item or {}).get("biome") or "").lower()) or None,
    }
    fail = rec["reasons"].append
    warn = rec["warnings"].append

    try:
        gltf, buffers, container = load_gltf(path)
    except (GltfError, struct.error, KeyError, ValueError, IndexError) as exc:
        fail(f"unreadable: {exc}")
        rec["status"] = "FAIL"
        return rec
    rec["container"] = container
    rec["generator"] = gltf.get("asset", {}).get("generator", "")
    rec["copyright"] = gltf.get("asset", {}).get("copyright", "")

    # ---- extensions
    used = sorted(gltf.get("extensionsUsed", []))
    required = sorted(gltf.get("extensionsRequired", []))
    rec["extensions_used"], rec["extensions_required"] = used, required
    if DRACO in used or DRACO in required:
        fail("Draco compression (KHR_draco_mesh_compression); contract forbids Draco")
    other_compress = sorted((set(used) | set(required)) & COMPRESSION_EXTS - {DRACO})
    if other_compress:
        fail(f"compressed data extension(s) {', '.join(other_compress)}")
    disallowed = [e for e in used if e not in allow_ext and e not in COMPRESSION_EXTS]
    if disallowed:
        fail(f"glTF extension(s) used: {', '.join(disallowed)} (contract: none)")
    if required:
        hard = [e for e in required if e not in allow_ext]
        if hard:
            fail(f"extensionsRequired: {', '.join(hard)}")

    # ---- materials
    materials = gltf.get("materials", [])
    rec["materials"] = len(materials)
    rec["material_names"] = [m.get("name", f"material_{i}") for i, m in enumerate(materials)]
    textured = [m.get("name", f"material_{i}") for i, m in enumerate(materials) if material_uses_textures(m)]
    rec["textured_materials"] = textured
    rec["textures"] = len(gltf.get("textures", []))
    rec["images"] = len(gltf.get("images", []))
    rec["uses_textures"] = bool(textured) or rec["textures"] > 0
    missing_images = []
    for img in gltf.get("images", []):
        uri = img.get("uri")
        if uri and not uri.startswith("data:"):
            if not os.path.isfile(os.path.join(os.path.dirname(os.path.abspath(path)), uri)):
                missing_images.append(uri)
    rec["missing_images"] = missing_images
    if rec["uses_textures"] and not allow_textures:
        fail(f"uses textures ({len(textured)} textured material(s), {rec['images']} image(s)); contract: flat baseColorFactor only")
    if missing_images:
        fail(f"texture file(s) not beside the GLB: {', '.join(missing_images[:3])}")
    rough = [m.get("pbrMetallicRoughness", {}).get("roughnessFactor", 1.0) for m in materials]
    metal = [m.get("pbrMetallicRoughness", {}).get("metallicFactor", 1.0) for m in materials]
    rec["roughness"] = [round(r, 3) for r in rough]
    rec["colors"] = [rgb_hex(m) for m in materials]
    if materials:
        if min(rough) < ROUGHNESS_BAND[0] or max(rough) > ROUGHNESS_BAND[1]:
            warn(f"roughness {min(rough):.2f}-{max(rough):.2f} outside ~0.6 band {ROUGHNESS_BAND}")
        if max(metal) > 0.05:
            warn(f"metallicFactor up to {max(metal):.2f} (contract: flat non-metallic colours)")
        no_factor = [m.get("name", f"material_{i}") for i, m in enumerate(materials)
                     if "baseColorFactor" not in m.get("pbrMetallicRoughness", {}) and not material_uses_textures(m)]
        if no_factor:
            warn(f"{len(no_factor)} material(s) without baseColorFactor (default white)")
    else:
        warn("no materials (renders with the viewer default)")

    # ---- geometry: walk the scene graph, apply world transforms, collect positions per primitive
    meshes = gltf.get("meshes", [])
    rec["meshes"] = len(meshes)
    rec["nodes"] = len(gltf.get("nodes", []))
    rec["node_names"] = [n.get("name", f"node_{i}") for i, n in enumerate(gltf.get("nodes", []))]
    skinned_nodes = 0
    tris_total = 0
    prim_count = 0
    bbox_min = [math.inf] * 3
    bbox_max = [-math.inf] * 3
    dark_pts = []          # world-space vertices of the darkest material
    all_count = 0
    nan_found = False
    index_overrun = False
    mesh_instances = 0
    vertex_total = 0
    darkest = None
    if materials:
        lum = [material_luminance(m) for m in materials]
        order = sorted(range(len(materials)), key=lambda i: lum[i])
        # only trust "darkest = eyes" when it is clearly darker than the next material
        if len(order) >= 2 and lum[order[0]] < 0.25 and lum[order[1]] - lum[order[0]] > 0.05:
            darkest = order[0]
        elif len(order) == 1 and lum[order[0]] < 0.25:
            darkest = order[0]
    rec["darkest_material"] = rec["material_names"][darkest] if darkest is not None else None

    try:
        worlds = all_node_worlds(gltf) if gltf.get("skins") else {}
        skin_cache = {}
        for _, node, world in walk_nodes(gltf):
            if "mesh" not in node:
                continue
            mesh_instances += 1
            skinned = "skin" in node
            if skinned:
                skinned_nodes += 1
                if node["skin"] not in skin_cache:
                    skin_cache[node["skin"]] = skin_matrices(gltf, buffers, node["skin"], worlds)
            for prim in meshes[node["mesh"]].get("primitives", []):
                prim_count += 1
                mode = prim.get("mode", 4)
                attrs = prim.get("attributes", {})
                if "POSITION" not in attrs:
                    warn("primitive without POSITION")
                    continue
                pos = read_accessor(gltf, buffers, attrs["POSITION"])
                vertex_total += len(pos)
                if "indices" in prim:
                    idx = read_accessor(gltf, buffers, prim["indices"])
                    n_idx = len(idx)
                    if any(i[0] >= len(pos) for i in idx):
                        index_overrun = True
                else:
                    n_idx = len(pos)
                tris_total += MODE_TRIS.get(mode, lambda n: 0)(n_idx)
                if skinned and "JOINTS_0" in attrs and "WEIGHTS_0" in attrs:
                    # spec: a skinned mesh ignores its node transform; the joints place it (bind pose here)
                    wp = skin_points(pos, read_accessor(gltf, buffers, attrs["JOINTS_0"]),
                                     read_accessor(gltf, buffers, attrs["WEIGHTS_0"]), skin_cache[node["skin"]])
                else:
                    wp = [transform_point(world, p) for p in pos]
                for p in wp:
                    if any(math.isnan(c) or math.isinf(c) for c in p):
                        nan_found = True
                        continue
                    for a in range(3):
                        if p[a] < bbox_min[a]:
                            bbox_min[a] = p[a]
                        if p[a] > bbox_max[a]:
                            bbox_max[a] = p[a]
                all_count += len(wp)
                if darkest is not None and prim.get("material") == darkest:
                    dark_pts.extend(wp)
    except (GltfError, struct.error, KeyError, IndexError, ValueError) as exc:
        fail(f"geometry unreadable: {exc}")
        rec["status"] = "FAIL"
        return rec

    rec["mesh_instances"] = mesh_instances
    rec["primitives"] = prim_count
    rec["vertices"] = vertex_total
    rec["skinned"] = skinned_nodes > 0
    rec["triangles"] = tris_total
    if nan_found:
        fail("NaN/inf vertex positions")
    if index_overrun:
        fail("index buffer references vertices outside POSITION")
    if all_count == 0 or tris_total == 0:
        fail("no renderable triangles in the default scene")
        rec["status"] = "FAIL"
        return rec

    budget = KINDS[kind]
    if tris_total > budget["tris"]:
        fail(f"{tris_total} triangles > {budget['tris']} budget for {kind}")

    size = [bbox_max[a] - bbox_min[a] for a in range(3)]
    rec["bbox_min"] = [round(v, 4) for v in bbox_min]
    rec["bbox_max"] = [round(v, 4) for v in bbox_max]
    rec["size"] = [round(v, 4) for v in size]
    rec["height"] = round(size[1], 4)
    rec["min_y"] = round(bbox_min[1], 4)
    cx, cz = (bbox_min[0] + bbox_max[0]) / 2, (bbox_min[2] + bbox_max[2]) / 2
    rec["centre_xz"] = [round(cx, 4), round(cz, 4)]
    if abs(bbox_min[1]) > MIN_Y_TOL:
        fail(f"min y = {bbox_min[1]:+.3f} m (feet/base must sit on y = 0 within +-{MIN_Y_TOL})")
    if size[1] < 1e-6:
        fail("zero height")
    else:
        lo, hi = budget["height"]
        if kind == "shared":
            stem = os.path.basename(path).lower() + " " + str((item or {}).get("name", "")).lower()
            for needle, cap in SHARED_NAME_HEIGHTS:
                if needle in stem:
                    hi = min(hi, cap)
                    break
        if not (lo <= size[1] <= hi):
            fail(f"height {size[1]:.3f} m outside {lo:.2f}-{hi:.2f} for {kind}")
    rec["origin_ok"] = abs(cx) <= ORIGIN_FRAC * max(size[0], 1e-9) and abs(cz) <= ORIGIN_FRAC * max(size[2], 1e-9)
    if not rec["origin_ok"]:
        fail(f"origin off base centre: bbox centre x/z = ({cx:+.3f}, {cz:+.3f}) vs footprint {size[0]:.2f}x{size[2]:.2f}")
    if max(size) > 50:
        warn(f"largest extent {max(size):.1f}: probably not in metres")

    # ---- front heuristic: eyes = darkest material. Eyes are a mirrored (off-axis) pair above the legs, so
    # drop on-axis dark vertices (crests, antennae, mouth lines) and the lowest quarter (feet, stick legs):
    # both would otherwise drag the centroid back to the body centre. Big-headed blobs carry their eyes
    # below mid-height, hence the low cut instead of an "upper half" rule.
    front = {"material": rec["darkest_material"], "centroid_z": None, "centroid_z_eyes": None, "eye_vertices": 0, "ok": None}
    if dark_pts:
        leg_y = bbox_min[1] + size[1] * 0.25
        off_axis = 0.08 * max(size[0], 1e-9)
        cz_all = sum(p[2] for p in dark_pts) / len(dark_pts)
        side = [p for p in dark_pts if abs(p[0] - cx) > off_axis] or dark_pts
        eyes = [p for p in side if p[1] >= leg_y] or side
        cz_eyes = sum(p[2] for p in eyes) / len(eyes)
        front.update(centroid_z=round(cz_all, 4), centroid_z_eyes=round(cz_eyes, 4), eye_vertices=len(eyes), ok=cz_eyes > 0)
        if budget["front"] and not front["ok"]:
            fail(f"front heuristic: darkest material '{front['material']}' eye centroid z = {cz_eyes:+.3f} (eyes must face +Z)")
    elif budget["front"]:
        warn("front heuristic n/a: no clearly darkest flat material (eyes)")
    rec["front"] = front

    # ---- animations
    anims = []
    node_names = rec["node_names"]
    for a in gltf.get("animations", []):
        dur = 0.0
        try:
            for s in a.get("samplers", []):
                lo, hi = accessor_range(gltf, buffers, s["input"])
                dur = max(dur, hi - lo)
        except (GltfError, KeyError, IndexError, struct.error):
            warn(f"animation {a.get('name', '?')}: unreadable sampler input")
        targets = sorted({node_names[ch["target"]["node"]] for ch in a.get("channels", [])
                          if "node" in ch.get("target", {}) and ch["target"]["node"] < len(node_names)})
        anims.append({"name": a.get("name", ""), "duration": round(dur, 3), "channels": len(a.get("channels", [])),
                      "nodes": targets})
    rec["animations"] = anims
    names = [a["name"] for a in anims]
    if expect_clips:
        missing = [c for c in expect_clips if c not in names]
        if missing:
            fail(f"missing animation clip(s): {', '.join(missing)}")
    for clip, want in (rules.get("clip_durations") or {}).items():
        got = [a["duration"] for a in anims if a["name"] == clip]
        if got and abs(got[0] - want) > rules.get("clip_tol", 0.05):
            fail(f"clip '{clip}' lasts {got[0]:.3f} s, expected {want:.2f} s (+-{rules.get('clip_tol', 0.05)})")
    if rules.get("expect_nodes"):
        missing_nodes = [n for n in rules["expect_nodes"] if n not in node_names]
        if missing_nodes:
            fail(f"missing node(s): {', '.join(missing_nodes)} (have {', '.join(node_names[:6])})")
    for static in rules.get("static_nodes") or []:
        hit = [a["name"] for a in anims if static in a["nodes"]]
        if hit:
            fail(f"node '{static}' is animated by clip(s) {', '.join(hit)} (must stay static for placement)")
    # ---- contrast vs the family ground (creatures). Ground comes from the biome catalogue when given,
    # body colour from the GLB's "<id>-body" material; the manifest's own figure is recorded as a cross-check.
    if budget["front"]:
        min_c = rules.get("min_contrast", MIN_CONTRAST)
        manifest_ratio = None
        if item is not None and "contrast_vs_ground" in item:
            cvg = item["contrast_vs_ground"]
            try:
                manifest_ratio = float(cvg["ratio"] if isinstance(cvg, dict) else cvg)
            except (TypeError, ValueError, KeyError):
                warn("manifest contrast_vs_ground has no numeric ratio")
        rec["manifest_contrast_vs_ground"] = manifest_ratio
        grounds = rules.get("grounds") or {}
        fam = rec.get("family")
        body_hex = None
        for mname, mhex in zip(rec["material_names"], rec["colors"]):
            if mname.lower().endswith("-body") or mname.lower() == "body":
                body_hex = mhex
                break
        if body_hex is None and item and isinstance(item.get("colors"), dict):
            body_hex = item["colors"].get("body")
        if fam and fam in grounds and body_hex:
            ratio = contrast_ratio(body_hex, grounds[fam])
            rec["contrast_vs_ground"] = round(ratio, 3)
            rec["contrast_ground"] = grounds[fam]
            rec["contrast_body"] = body_hex
            if ratio < min_c:
                fail(f"contrast vs {fam} ground {grounds[fam]}: body {body_hex} ratio {ratio:.2f} < {min_c} (Art Director rule)")
            if manifest_ratio is not None and abs(manifest_ratio - ratio) > 0.15:
                warn(f"manifest contrast {manifest_ratio:.2f} differs from catalogue-based {ratio:.2f}")
        elif grounds and fam and fam not in grounds and fam not in ("any", "none", ""):
            warn(f"family '{fam}' not in the biome catalogue; contrast not checked")
        elif grounds and not body_hex:
            warn("no '-body' material; contrast not checked")
        elif manifest_ratio is not None:
            rec["contrast_vs_ground"] = round(manifest_ratio, 3)
            if manifest_ratio < min_c:
                fail(f"contrast vs ground {manifest_ratio:.2f} < {min_c} (Art Director rule, manifest value)")
    if anims:
        odd = [n for n in names if n not in CANONICAL_CLIPS]
        if odd:
            warn(f"non-canonical clip name(s): {', '.join(odd[:6])}{'...' if len(odd) > 6 else ''}")
        zero = [n for n, a in zip(names, anims) if a["duration"] <= 0]
        if zero:
            warn(f"zero-length clip(s): {', '.join(zero[:6])}")

    # ---- size
    kb = rec["bytes"] / 1024
    if kb > budget["max_kb"]:
        warn(f"{kb:.0f} KB > soft budget {budget['max_kb']} KB for {kind}")

    rec["seconds"] = round(time.time() - t0, 3)
    if rec["reasons"]:
        rec["status"] = "FAIL"
    return rec


# ----------------------------------------------------------------------------- CLI

def expand_inputs(inputs, excludes):
    files = []
    for inp in inputs:
        if os.path.isdir(inp):
            for ext in ("glb", "gltf"):
                files += glob.glob(os.path.join(inp, "**", f"*.{ext}"), recursive=True)
        elif any(ch in inp for ch in "*?["):
            files += glob.glob(inp, recursive=True)
        elif os.path.isfile(inp):
            files.append(inp)
        else:
            print(f"[check_glb] warning: {inp} does not exist", file=sys.stderr)
    out = []
    for f in sorted(set(os.path.normpath(f) for f in files)):
        rel = os.path.relpath(f).replace("\\", "/")
        if any(fnmatch.fnmatch(rel, pat) or fnmatch.fnmatch(os.path.basename(rel), pat) for pat in excludes):
            continue
        out.append(f)
    return out


def fmt_clips(anims):
    if not anims:
        return "-"
    short = lambda n: (n.split("|")[-1] or "?")[:14]
    return ",".join(f"{short(a['name'])}({a['duration']:.1f})" for a in anims[:3]) + (f" +{len(anims) - 3}" if len(anims) > 3 else "")


def print_table(records, verbose):
    cols = ["status", "file", "tris", "h(m)", "minY", "cx,cz", "frontZ", "mats", "tex", "ext", "clips", "KB"]
    rows = []
    for r in records:
        tag = ("3P " if r["third_party"] else "") + r["status"]
        front = r.get("front", {}) or {}
        fz = front.get("centroid_z_eyes")
        rows.append([
            tag, os.path.basename(r["rel"]), str(r.get("triangles", "-")),
            f"{r['height']:.3f}" if "height" in r else "-",
            f"{r['min_y']:+.3f}" if "min_y" in r else "-",
            f"{r['centre_xz'][0]:+.2f},{r['centre_xz'][1]:+.2f}" if "centre_xz" in r else "-",
            f"{fz:+.2f}" if fz is not None else "n/a",
            str(r.get("materials", "-")) if "materials" in r else "-", "yes" if r.get("uses_textures") else "no",
            str(len(r.get("extensions_used", []))), fmt_clips(r.get("animations", [])), f"{r['bytes'] / 1024:.0f}",
        ])
    widths = [max(len(c), *(len(row[i]) for row in rows)) if rows else len(c) for i, c in enumerate(cols)]
    line = "  ".join(c.ljust(widths[i]) for i, c in enumerate(cols))
    print(line)
    print("-" * len(line))
    for r, row in zip(records, rows):
        print("  ".join(v.ljust(widths[i]) for i, v in enumerate(row)))
        for reason in r["reasons"]:
            print(f"      FAIL: {reason}")
        if verbose:
            for w in r["warnings"]:
                print(f"      warn: {w}")


def main(argv=None):
    p = argparse.ArgumentParser(prog="check_glb.py", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("inputs", nargs="+", help="GLB/glTF files, directories (recursive) or glob patterns")
    p.add_argument("--kind", default="auto", choices=["auto"] + list(KINDS), help="budget set; auto infers from the path")
    p.add_argument("--expect-clips", default="", help="comma list of animation clip names that must exist")
    p.add_argument("--expect-clip-durations", default="", help="e.g. idle=2.0,walk=0.8 (seconds, checked +-tol)")
    p.add_argument("--clip-tol", type=float, default=0.05, help="tolerance for --expect-clip-durations")
    p.add_argument("--expect-nodes", default="", help="comma list of node names that must exist (e.g. Root,Body)")
    p.add_argument("--static-nodes", default="", help="comma list of nodes no animation channel may target (e.g. Root)")
    p.add_argument("--manifest", default="", help="manifest.json: kind/stage/variant per file, tags, contrast_vs_ground; "
                                                  "listed files that are missing on disk fail")
    p.add_argument("--min-contrast", type=float, default=MIN_CONTRAST, help="fail creatures whose body/ground contrast is below this")
    p.add_argument("--catalog", default="", help="assets/biomes/catalog.json: family ground colours for the contrast rule")
    p.add_argument("--third-party", action="store_true", help="tag every input as third-party (report, never fail)")
    p.add_argument("--no-auto-third-party", action="store_true", help="do not auto-tag paths containing a cc0 folder")
    p.add_argument("--strict-third-party", action="store_true", help="third-party failures also set exit code 1")
    p.add_argument("--allow-ext", default="", help="comma list of glTF extensions that are tolerated")
    p.add_argument("--allow-textures", action="store_true", help="textures are declared in the README and shipped beside the file")
    p.add_argument("--exclude", action="append", default=[], help="glob on the relative path or basename to skip (repeatable)")
    p.add_argument("--set", dest="set_name", default="", help="label stored in the JSON (used by run_all.sh)")
    p.add_argument("--json", action="store_true", help="print JSON instead of the table")
    p.add_argument("--json-out", default="", help="also write the JSON report to this path")
    p.add_argument("-v", "--verbose", action="store_true", help="print warnings under each row")
    args = p.parse_args(argv)

    files = expand_inputs(args.inputs, args.exclude)
    expect = [c.strip() for c in args.expect_clips.split(",") if c.strip()]
    allow_ext = {e.strip() for e in args.allow_ext.split(",") if e.strip()}
    csv = lambda s: [x.strip() for x in s.split(",") if x.strip()]
    rules = {"expect_nodes": csv(args.expect_nodes), "static_nodes": csv(args.static_nodes),
             "clip_tol": args.clip_tol, "min_contrast": args.min_contrast, "clip_durations": {}}
    for pair in csv(args.expect_clip_durations):
        name, _, secs = pair.partition("=")
        try:
            rules["clip_durations"][name.strip()] = float(secs)
        except ValueError:
            p.error(f"bad --expect-clip-durations entry {pair!r}")
    if args.catalog:
        if os.path.isfile(args.catalog):
            rules["grounds"] = load_catalog(args.catalog)
        else:
            print(f"[check_glb] warning: catalogue {args.catalog} not found; contrast uses manifest values", file=sys.stderr)
    manifest = None
    if args.manifest:
        if not os.path.isfile(args.manifest):
            print(f"[check_glb] warning: manifest {args.manifest} not found; falling back to path inference", file=sys.stderr)
        else:
            manifest = load_manifest(args.manifest)
    records = []
    for f in files:
        third = args.third_party or (not args.no_auto_third_party and "cc0" in f.replace("\\", "/").split("/"))
        item = manifest_item(manifest, f)
        kind = args.kind
        kind_warn = None
        if kind == "auto":
            kind = kind_from_manifest(item) if item else None
            if kind is None:
                kind, kind_warn = infer_kind(f)
                if manifest and item:
                    kind_warn = f"manifest kind/stage unusable ({item.get('kind')}/{item.get('stage')}); kind from path"
                elif manifest:
                    kind_warn = "not listed in the manifest; kind from path"
        rec = inspect(f, kind, third, expect, allow_ext, args.allow_textures, rules, item)
        if kind_warn:
            rec["warnings"].insert(0, kind_warn)
        records.append(rec)
    # org.md: the QA Inspector checks that the files a worker claims actually exist
    missing_listed = []
    if manifest:
        have = {os.path.relpath(os.path.abspath(f), REPO_ROOT).replace("\\", "/") for f in files}
        for it in manifest["items"]:
            fp = it.get("file")
            if fp and os.path.normpath(fp).replace("\\", "/") not in have and not os.path.isfile(os.path.join(REPO_ROOT, fp)):
                missing_listed.append(fp)
                records.append({"file": fp, "rel": fp, "third_party": args.third_party, "kind": kind_from_manifest(it) or args.kind,
                                "status": "FAIL", "reasons": [f"listed in {os.path.relpath(args.manifest)} but missing on disk"],
                                "warnings": [], "bytes": 0, "manifest": True, "tags": list(it.get("tags") or [])})

    first = [r for r in records if not r["third_party"]]
    third = [r for r in records if r["third_party"]]
    summary = {
        "count": len(records),
        "first_party": len(first), "pass": sum(r["status"] == "PASS" for r in first),
        "fail": sum(r["status"] == "FAIL" for r in first),
        "third_party": len(third), "third_party_pass": sum(r["status"] == "PASS" for r in third),
        "third_party_fail": sum(r["status"] == "FAIL" for r in third),
        "triangles": [min((r.get("triangles", 0) for r in records), default=0), max((r.get("triangles", 0) for r in records), default=0)],
        "height": [min((r.get("height", 0) for r in records if "height" in r), default=0),
                   max((r.get("height", 0) for r in records if "height" in r), default=0)],
        "missing_listed": missing_listed,
        "manifest": os.path.relpath(args.manifest) if manifest else None,
        "manifest_generated_at": (json.load(open(args.manifest)).get("generated_at") if manifest else None),
        "manifest_mtime": time.strftime("%Y-%m-%dT%H:%M:%S", time.localtime(os.path.getmtime(args.manifest))) if manifest else None,
    }
    report = {
        "tool": "check_glb.py", "version": 1, "generated_at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "set": args.set_name, "kind": args.kind, "expect_clips": expect,
        "rules": {k: v for k, v in rules.items() if k != "grounds"}, "catalog": args.catalog or None,
        "families": sorted({r["family"] for r in records if r.get("family")}), "inputs": args.inputs,
        "summary": summary, "files": records,
    }
    if args.json_out:
        os.makedirs(os.path.dirname(os.path.abspath(args.json_out)), exist_ok=True)
        with open(args.json_out, "w") as fh:
            json.dump(report, fh, indent=1)
    if args.json:
        json.dump(report, sys.stdout, indent=1)
        print()
    else:
        if not records:
            print("[check_glb] no GLB/glTF files found")
        else:
            print_table(records, args.verbose)
            print()
            print(f"[check_glb] {summary['first_party']} first-party: {summary['pass']} pass, {summary['fail']} fail; "
                  f"{summary['third_party']} third-party: {summary['third_party_pass']} pass, "
                  f"{summary['third_party_fail']} fail (reported only)"
                  + (f"; JSON -> {args.json_out}" if args.json_out else ""))
    failed = summary["fail"] + (summary["third_party_fail"] if args.strict_third_party else 0)
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
