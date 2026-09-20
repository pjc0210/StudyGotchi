#!/usr/bin/env python3
"""
Stdlib-only GLB inspector / validator for the landmark factory outputs (no bpy, no numpy, no PIL).

  python3 tools/landmark-factory/validate_glbs.py [assets/landmarks] [--verbose]

Checks every *.glb under the folder against the fleet technical contract:
  * glTF 2.0 binary container, JSON + BIN chunks, no extensionsUsed / extensionsRequired
  * no images / textures / samplers, every material has a flat pbrMetallicRoughness.baseColorFactor
  * base on y = 0 (|min y| <= 5 mm), origin at the base centre (contact footprint centred within 2 cm)
  * triangle budget inferred from the file name: -s1 < 400, -s2 < 900, -s3 < 1600, props/ < 300
Also importable: `inspect_glb(path)` returns the measurements, `validate(path, budget)` returns a list of issues.
"""

import argparse
import glob
import json
import math
import os
import re
import struct
import sys

BUDGETS = {"s1": 400, "s2": 900, "s3": 1600, "prop": 300, "terrain": 1600}
COMPONENT_FMT = {5120: "b", 5121: "B", 5122: "h", 5123: "H", 5125: "I", 5126: "f"}
COMPONENT_SIZE = {5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4}
TYPE_COUNT = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}


def read_glb(path):
    with open(path, "rb") as fh:
        data = fh.read()
    if len(data) < 12:
        raise ValueError("file too small for a GLB header")
    magic, version, length = struct.unpack_from("<4sII", data, 0)
    if magic != b"glTF":
        raise ValueError(f"bad magic {magic!r}")
    if version != 2:
        raise ValueError(f"unsupported GLB container version {version}")
    if length != len(data):
        raise ValueError(f"header length {length} != file size {len(data)}")
    off = 12
    gltf, bin_chunk = None, b""
    while off + 8 <= length:
        clen, ctype = struct.unpack_from("<II", data, off)
        off += 8
        chunk = data[off:off + clen]
        off += clen
        if ctype == 0x4E4F534A:  # JSON
            gltf = json.loads(chunk.decode("utf-8"))
        elif ctype == 0x004E4942:  # BIN
            bin_chunk = chunk
    if gltf is None:
        raise ValueError("no JSON chunk")
    return gltf, bin_chunk


def read_accessor(gltf, bin_chunk, index):
    """Decode an accessor into a list of tuples (or scalars) from the single GLB buffer."""
    acc = gltf["accessors"][index]
    if "bufferView" not in acc:
        return []
    view = gltf["bufferViews"][acc["bufferView"]]
    ncomp = TYPE_COUNT[acc["type"]]
    fmt = COMPONENT_FMT[acc["componentType"]]
    csize = COMPONENT_SIZE[acc["componentType"]]
    stride = view.get("byteStride", ncomp * csize)
    base = view.get("byteOffset", 0) + acc.get("byteOffset", 0)
    out = []
    for i in range(acc["count"]):
        o = base + i * stride
        vals = struct.unpack_from("<" + fmt * ncomp, bin_chunk, o)
        out.append(vals[0] if ncomp == 1 else vals)
    return out


def inspect_glb(path):
    gltf, bin_chunk = read_glb(path)
    accessors = gltf.get("accessors", [])
    meshes = gltf.get("meshes", [])
    nodes = gltf.get("nodes", [])
    info = {
        "file": path,
        "asset_version": gltf.get("asset", {}).get("version"),
        "generator": gltf.get("asset", {}).get("generator"),
        "extensions_used": gltf.get("extensionsUsed", []),
        "extensions_required": gltf.get("extensionsRequired", []),
        "images": len(gltf.get("images", [])),
        "textures": len(gltf.get("textures", [])),
        "animations": len(gltf.get("animations", [])),
        "materials": [],
        "nodes": len(nodes),
        "meshes": len(meshes),
        "primitives": 0,
        "triangles": 0,
        "positions": 0,
        "min": [math.inf] * 3,
        "max": [-math.inf] * 3,
        "contact_center": None,
        "transformed_nodes": 0,
        "bytes": os.path.getsize(path),
    }
    for m in gltf.get("materials", []):
        pbr = m.get("pbrMetallicRoughness", {})
        info["materials"].append({
            "name": m.get("name"),
            "baseColorFactor": pbr.get("baseColorFactor"),
            "textured": "baseColorTexture" in pbr or "normalTexture" in m or "emissiveTexture" in m,
            "roughness": pbr.get("roughnessFactor"),
            "doubleSided": m.get("doubleSided", False),
        })

    positions = []

    def visit(ni):
        node = nodes[ni]
        if any(k in node for k in ("translation", "rotation", "scale", "matrix")):
            info["transformed_nodes"] += 1
        if "mesh" in node:
            for prim in meshes[node["mesh"]].get("primitives", []):
                info["primitives"] += 1
                mode = prim.get("mode", 4)
                pos_idx = prim.get("attributes", {}).get("POSITION")
                n_idx = accessors[prim["indices"]]["count"] if "indices" in prim else (
                    accessors[pos_idx]["count"] if pos_idx is not None else 0)
                if mode == 4:
                    info["triangles"] += n_idx // 3
                elif mode in (5, 6):
                    info["triangles"] += max(0, n_idx - 2)
                if pos_idx is not None:
                    pts = read_accessor(gltf, bin_chunk, pos_idx)
                    positions.extend(pts)
        for c in node.get("children", []):
            visit(c)

    for scene in gltf.get("scenes", []):
        for n in scene.get("nodes", []):
            visit(n)
    if positions:
        info["positions"] = len(positions)
        for k in range(3):
            info["min"][k] = min(p[k] for p in positions)
            info["max"][k] = max(p[k] for p in positions)
        contact = [p for p in positions if p[1] < info["min"][1] + 0.03]
        cx = (min(p[0] for p in contact) + max(p[0] for p in contact)) / 2.0
        cz = (min(p[2] for p in contact) + max(p[2] for p in contact)) / 2.0
        info["contact_center"] = [cx, cz]
        info["footprint_radius"] = max(math.hypot(p[0], p[2]) for p in positions)
    info["height"] = info["max"][1] - info["min"][1] if positions else 0.0
    return info


def budget_for(path):
    name = os.path.basename(path)
    norm = path.replace(os.sep, "/")
    if "/props/" in norm:
        return BUDGETS["prop"]
    if "/terrain/" in norm:
        return BUDGETS["terrain"]
    m = re.search(r"-(s[123])[a-z]?\.glb$", name)   # -s2.glb, -s2b.glb, -s2c.glb ...
    return BUDGETS[m.group(1)] if m else None


def validate(path, budget=None, info=None):
    info = info or inspect_glb(path)
    issues = []
    if info["asset_version"] != "2.0":
        issues.append(f"asset.version is {info['asset_version']!r}, expected '2.0'")
    if info["extensions_used"] or info["extensions_required"]:
        issues.append(f"uses glTF extensions {info['extensions_used']}")
    if info["images"] or info["textures"]:
        issues.append(f"has {info['images']} images / {info['textures']} textures")
    if info["animations"]:
        issues.append(f"has {info['animations']} animations (landmarks/props are static)")
    for m in info["materials"]:
        # the Blender exporter omits baseColorFactor when it equals the default white [1,1,1,1]
        if m["textured"]:
            issues.append(f"material {m['name']!r} is textured, expected a flat baseColorFactor material")
    if info["positions"] == 0:
        issues.append("no POSITION data")
    else:
        if abs(info["min"][1]) > 0.005:
            issues.append(f"min y = {info['min'][1]:.4f} (base must sit on y=0)")
        cx, cz = info["contact_center"]
        if abs(cx) > 0.02 or abs(cz) > 0.02:
            issues.append(f"contact footprint centre off origin by ({cx:.3f}, {cz:.3f})")
    if info["transformed_nodes"]:
        issues.append(f"{info['transformed_nodes']} node(s) carry a transform (expected identity)")
    if budget is not None and info["triangles"] >= budget:
        issues.append(f"{info['triangles']} triangles >= budget {budget}")
    return issues


def main():
    p = argparse.ArgumentParser(prog="validate_glbs.py")
    p.add_argument("root", nargs="?", default="assets/landmarks")
    p.add_argument("--verbose", action="store_true")
    args = p.parse_args()
    root = args.root
    if not os.path.isabs(root):
        repo = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
        root = os.path.join(repo, root)
    files = sorted(glob.glob(os.path.join(root, "**", "*.glb"), recursive=True))
    if not files:
        print(f"[validate] no GLB files under {root}")
        return 1
    bad = 0
    tris = []
    for f in files:
        try:
            info = inspect_glb(f)
            issues = validate(f, budget_for(f), info)
        except Exception as exc:  # unreadable container
            info, issues = {"triangles": 0, "height": 0.0}, [f"unreadable: {exc}"]
        tris.append(info["triangles"])
        rel = os.path.relpath(f, root)
        flag = "FAIL" if issues else "ok  "
        line = f"[validate] {flag} {rel}: {info['triangles']} tris, h={info['height']:.3f} m"
        if args.verbose and info.get("materials"):
            line += ", " + ", ".join(f"{m['name']}" for m in info["materials"])
        print(line)
        for issue in issues:
            print(f"[validate]        - {issue}")
        bad += 1 if issues else 0
    print(f"[validate] {len(files) - bad}/{len(files)} files pass; triangles {min(tris)}..{max(tris)}")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
