"""
Tripo intake pipeline (Intake worker; territory: assets/creatures/tripo/).

Turns the raw Tripo export into game-ready derivatives plus previews, using the same cream 3/4-view
EEVEE stage as tools/creature-factory (imported read-only) so renders are comparable with
assets/creatures/generated/renders/*.png.

Regenerate (Blender 5.2 LTS, headless), from the repo root:

  B=/Applications/Blender.app/Contents/MacOS/Blender
  P=assets/creatures/tripo/tripo_intake.py
  $B -b --python $P -- --stage probe                   # 4 horizontal views -> /tmp/tripo-probe (find the face)
  $B -b --python $P -- --stage build --front posz      # whole-model derivatives + previews + comparison.png
  $B -b --python $P -- --stage split                   # loose-part census -> components-sheet.png, components.json
  $B -b --python $P -- --stage exemplar --exemplar 0   # one component through the same pipeline (creature budget)

`--front` is the glTF axis the face points to in the RAW file; the outputs always face glTF +Z.
"""

import argparse
import json
import math
import os
import sys
import time

import bpy
import numpy as np
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
sys.path.insert(0, os.path.join(REPO, "tools", "creature-factory"))
import generate_creatures as gc  # noqa: E402  (read-only reuse of Stage / colour helpers)

STEM = "pokemon-like-3d-model"
SRC = os.path.join(HERE, STEM + ".glb")
GEN_RENDERS = os.path.join(REPO, "assets", "creatures", "generated", "renders")
COMPARE_IDS = ["blob-ice-1", "bird-ice-1", "biped-ice-2"]
TRI_BUDGET = 3000
SPLIT_CACHE = "/tmp/tripo-split/components.blend"

# glTF front axis of the raw file -> rotation about Blender Z that brings the face to Blender -Y
# (Blender -Y == glTF +Z after the exporter's axis swap, which is the fleet's "+Z is the front").
FRONT_ROT_Z = {"posz": 0.0, "negz": 180.0, "posx": -90.0, "negx": 90.0}


def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    p = argparse.ArgumentParser(prog="tripo_intake.py")
    p.add_argument("--stage", choices=["probe", "build", "split", "exemplar"], default="build")
    p.add_argument("--front", choices=sorted(FRONT_ROT_Z), default="posz",
                   help="glTF axis the model's face points to in the raw file (see probe renders)")
    p.add_argument("--tris", type=int, default=2900, help="decimation target for the whole model (budget 3000)")
    p.add_argument("--exemplar", type=int, default=0, help="component index (from components.json)")
    p.add_argument("--exemplar-tris", type=int, default=1400, help="creature budget in the charter is < 1500")
    p.add_argument("--k", type=int, default=5, help="toybox palette size (4-6)")
    p.add_argument("--height", type=float, default=0.8)
    p.add_argument("--tex", type=int, default=1024, help="baseColor size for the textured variant")
    p.add_argument("--preview", type=int, default=512)
    p.add_argument("--samples", type=int, default=24)
    p.add_argument("--min-tris", type=int, default=1500, help="split: ignore debris clusters below this")
    p.add_argument("--cluster-eps", type=float, default=0.004, help="split: bbox padding (m) that joins shells")
    p.add_argument("--probe-dir", default="/tmp/tripo-probe")
    return p.parse_args(argv)


# ----------------------------------------------------------------------------- helpers

def log(msg):
    print(f"[tripo-intake] {msg}", flush=True)


def tri_count(me):
    n = len(me.polygons)
    lt = np.empty(n, dtype=np.int32)
    me.polygons.foreach_get("loop_total", lt)
    return int((lt - 2).sum())


def world_bbox(ob):
    pts = [ob.matrix_world @ Vector(c) for c in ob.bound_box]
    mn = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    mx = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    return mn, mx


def srgb_to_linear_np(c):
    c = np.asarray(c, dtype=np.float64)
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def linear_to_srgb_np(c):
    c = np.clip(np.asarray(c, dtype=np.float64), 0.0, 1.0)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * np.power(c, 1 / 2.4) - 0.055)


def to_hex(srgb):
    return "#" + "".join(f"{int(round(float(v) * 255)):02x}" for v in srgb)


def select_only(ob):
    for o in bpy.data.objects:
        try:
            o.select_set(False)
        except RuntimeError:
            pass
    ob.hide_viewport = False
    ob.hide_set(False)
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob


def import_source():
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=SRC)
    new = [o for o in bpy.data.objects if o not in before]
    meshes = [o for o in new if o.type == "MESH"]
    arms = [o for o in new if o.type == "ARMATURE"]
    if not meshes:
        raise RuntimeError("no mesh in source GLB")
    if arms:
        log(f"WARNING: {len(arms)} armature(s) found; pipeline was written for the unrigged Tripo export")
    for ob in meshes:  # bake importer node transforms so the object matrix is free for our framing
        mw = ob.matrix_world.copy()
        ob.parent = None
        ob.data.transform(mw)
        ob.matrix_world = Matrix.Identity(4)
    for o in new:
        if o.type == "EMPTY":
            bpy.data.objects.remove(o, do_unlink=True)
    if len(meshes) > 1:
        select_only(meshes[0])
        for o in meshes:
            o.select_set(True)
        bpy.ops.object.join()
    ob = meshes[0]
    ob.name = STEM + "-original"
    return ob


def framing_matrix(ob, front, height):
    """Rotation (front -> -Y), uniform scale (height) and translation (feet centre at origin)."""
    rot = Matrix.Rotation(math.radians(FRONT_ROT_Z[front]), 4, "Z")
    ob.matrix_world = rot
    mn, mx = world_bbox(ob)
    size = mx - mn
    s = height / max(size.z, 1e-9)
    centre = Vector(((mn.x + mx.x) / 2, (mn.y + mx.y) / 2, mn.z))
    ob.matrix_world = Matrix.Translation(-centre * s) @ Matrix.Scale(s, 4) @ rot
    bpy.context.view_layer.update()
    return dict(native_size_m=[round(v, 4) for v in size], scale=round(s, 5),
                rotation_deg_about_up=FRONT_ROT_Z[front])


def bake_matrix(ob):
    ob.data.transform(ob.matrix_world)
    ob.matrix_world = Matrix.Identity(4)
    ob.data.update()


def clear_custom_normals(me):
    attr = me.attributes.get("custom_normal")
    if attr is not None:
        me.attributes.remove(attr)


def duplicate(ob, name):
    new = ob.copy()
    new.data = ob.data.copy()
    new.name = name
    new.data.name = name
    bpy.context.scene.collection.objects.link(new)
    return new


def decimate_to(ob, target):
    me = ob.data
    before = tri_count(me)
    for attempt in range(3):
        cur = tri_count(me)
        if cur <= target:
            break
        mod = ob.modifiers.new("decimate", "DECIMATE")
        mod.decimate_type = "COLLAPSE"
        mod.ratio = min(1.0, target / cur * (1.0 - 0.02 * attempt))
        mod.use_collapse_triangulate = True
        select_only(ob)
        t0 = time.time()
        bpy.ops.object.modifier_apply(modifier=mod.name)
        log(f"decimate pass {attempt + 1}: {cur:,} -> {tri_count(me):,} tris (ratio {mod.ratio:.5f}, "
            f"{time.time() - t0:.1f}s)")
    return before, tri_count(me)


def find_basecolor_image(mat):
    if mat and mat.use_nodes:
        bsdf = next((n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)
        if bsdf is not None:
            for link in mat.node_tree.links:
                if link.to_node == bsdf and link.to_socket.name == "Base Color" and link.from_node.type == "TEX_IMAGE":
                    return link.from_node.image
    for img in bpy.data.images:
        if "basecolor" in img.name.lower() or "base_color" in img.name.lower():
            return img
    raise RuntimeError("baseColor texture not found")


def make_textured_material(name, image):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Roughness"].default_value = 0.6
    bsdf.inputs["Metallic"].default_value = 0.0
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = image
    tex.interpolation = "Linear"
    nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    return mat


def face_colours(me, image):
    """Mean linear-RGB of the baseColor texture sampled at every corner UV, per face."""
    w, h = image.size
    buf = np.empty(w * h * 4, dtype=np.float32)
    image.pixels.foreach_get(buf)
    px = buf.reshape(h, w, 4)[..., :3]  # byte images: display (sRGB) values, rows bottom-up like UV v
    nl = len(me.loops)
    uv = np.empty(nl * 2, dtype=np.float32)
    layer = me.uv_layers.active
    try:
        layer.uv.foreach_get("vector", uv)
    except Exception:
        layer.data.foreach_get("uv", uv)
    uv = uv.reshape(nl, 2)
    x = np.clip((np.mod(uv[:, 0], 1.0) * w).astype(np.int64), 0, w - 1)
    y = np.clip((np.mod(uv[:, 1], 1.0) * h).astype(np.int64), 0, h - 1)
    loop_lin = srgb_to_linear_np(px[y, x])
    npoly = len(me.polygons)
    lt = np.empty(npoly, dtype=np.int64)
    me.polygons.foreach_get("loop_total", lt)
    face_of_loop = np.repeat(np.arange(npoly), lt)
    sums = np.zeros((npoly, 3))
    np.add.at(sums, face_of_loop, loop_lin)
    return sums / lt[:, None]


def kmeans(x, k, iters=40, seed=2026):
    """Plain k-means with k-means++ seeding (unweighted, so small high-contrast regions like eyes survive)."""
    rng = np.random.default_rng(seed)
    centres = [x[rng.integers(len(x))]]
    for _ in range(1, k):
        d2 = ((x[:, None, :] - np.array(centres)[None]) ** 2).sum(-1).min(1)
        p = d2 / d2.sum() if d2.sum() > 0 else None
        centres.append(x[rng.choice(len(x), p=p)])
    c = np.array(centres)
    labels = None
    for _ in range(iters):
        d2 = ((x[:, None, :] - c[None]) ** 2).sum(-1)
        new_labels = d2.argmin(1)
        if labels is not None and np.array_equal(new_labels, labels):
            break
        labels = new_labels
        for j in range(k):
            m = labels == j
            if m.any():
                c[j] = x[m].mean(0)
    order = np.argsort(-np.bincount(labels, minlength=k))  # biggest cluster first
    remap = np.empty(k, dtype=np.int64)
    remap[order] = np.arange(k)
    return c[order], remap[labels]


def export_glb(ob, path, textured):
    select_only(ob)
    kw = dict(filepath=path, export_format="GLB", use_selection=True, export_apply=True, export_yup=True,
              export_animations=False, export_skins=False, export_morph=False, export_cameras=False,
              export_lights=False, export_extras=False, export_draco_mesh_compression_enable=False,
              export_materials="EXPORT", export_normals=True, export_tangents=False,
              export_texcoords=textured, export_image_format="JPEG" if textured else "NONE",
              export_vertex_color="NONE", export_attributes=False, export_unused_images=False,
              export_unused_textures=False, export_try_sparse_sk=False, export_shared_accessors=False,
              export_hierarchy_full_collections=False, export_gn_mesh=False, export_original_specular=False,
              export_import_convert_lighting_mode="SPEC")
    props = set(bpy.ops.export_scene.gltf.get_rna_type().properties.keys())
    kw = {k: v for k, v in kw.items() if k in props}
    bpy.ops.export_scene.gltf(**kw)
    return os.path.getsize(path)


def compose(paths, out_path, cols, cell):
    """Tile PNG cells (rescaled to `cell`) on the cream backdrop; numpy + bpy.data.images, no PIL."""
    n = len(paths)
    cols = max(1, min(cols, n))
    rows = math.ceil(n / cols)
    h = gc.BACKDROP.lstrip("#")
    sheet = np.empty((rows * cell, cols * cell, 4), dtype=np.float32)
    sheet[..., :3] = [int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4)]
    sheet[..., 3] = 1.0
    for i, path in enumerate(paths):
        img = bpy.data.images.load(path, check_existing=False)
        if tuple(img.size) != (cell, cell):
            img.scale(cell, cell)
        buf = np.empty(cell * cell * 4, dtype=np.float32)
        img.pixels.foreach_get(buf)
        r, c = divmod(i, cols)
        y0 = (rows - 1 - r) * cell
        sheet[y0:y0 + cell, c * cell:(c + 1) * cell] = buf.reshape(cell, cell, 4)
        bpy.data.images.remove(img)
    out = bpy.data.images.new("comparison", cols * cell, rows * cell, alpha=False)
    out.pixels.foreach_set(sheet.ravel())
    out.filepath_raw = out_path
    out.file_format = "PNG"
    out.save()
    bpy.data.images.remove(out)


def only_visible(objs, keep):
    for o in objs:
        o.hide_render = o is not keep


def generated_cells():
    cells, used = [], []
    for cid in COMPARE_IDS:
        p = os.path.join(GEN_RENDERS, cid + ".png")
        if os.path.exists(p):
            cells.append(p)
            used.append(cid)
        else:
            log(f"comparison: generated render missing, skipped: {p}")
    return cells, used


def make_variants(original, tag, base_img, tris, k, tex):
    """Shared derivative pipeline: decimate once, then (a) textured low-poly and (b) toybox flat-colour."""
    info = {}
    t0 = time.time()
    low = duplicate(original, f"{tag}-lowpoly-textured")
    before, after = decimate_to(low, min(tris, TRI_BUDGET))
    bake_matrix(low)
    clear_custom_normals(low.data)
    low.data.shade_smooth()
    info["decimate_s"] = round(time.time() - t0, 1)
    info["tris_before"], info["tris_after"] = before, after
    info["vertices_after"] = len(low.data.vertices)
    assert after <= TRI_BUDGET, f"decimation missed the budget: {after}"

    # (a) baseColor only, resized; metal/rough/normal dropped
    small = base_img.copy()
    small.name = f"{tag}_basecolor_{tex}"
    small.scale(tex, tex)
    small.pack()
    low.data.materials.clear()
    low.data.materials.append(make_textured_material(f"{tag}-basecolor", small))
    low_path = os.path.join(HERE, f"{tag}-lowpoly-textured.glb")
    low_size = export_glb(low, low_path, textured=True)
    info["lowpoly_textured"] = dict(file=os.path.basename(low_path), bytes=low_size, tris=after,
                                    texture=f"baseColor {tex}x{tex} JPEG (metal/rough/normal dropped)")
    log(f"{tag} lowpoly-textured: {after:,} tris, {low_size / 1e6:.2f} MB")

    # (b) texture -> per-face colour -> k-means palette -> one flat baseColorFactor material per colour
    toy = duplicate(low, f"{tag}-toybox")
    me = toy.data
    fc_lin = face_colours(me, small)
    centres_srgb, labels = kmeans(linear_to_srgb_np(fc_lin), k)
    me.materials.clear()
    palette = []
    for j, c in enumerate(centres_srgb):
        hx = to_hex(c)
        me.materials.append(gc.make_material(f"toybox-{j}-{hx.lstrip('#')}", hx, roughness=0.6))
        palette.append(dict(index=j, hex=hx, face_share=round(float((labels == j).mean()), 3)))
    me.polygons.foreach_set("material_index", labels.astype(np.int32))
    while me.uv_layers:
        me.uv_layers.remove(me.uv_layers[0])
    me.shade_flat()
    me.update()
    toy_path = os.path.join(HERE, f"{tag}-toybox.glb")
    toy_size = export_glb(toy, toy_path, textured=False)
    info["toybox"] = dict(file=os.path.basename(toy_path), bytes=toy_size, tris=tri_count(me), k=k, palette=palette,
                          method="baseColor sampled at every corner UV (nearest), averaged per face in linear RGB, "
                                 "k-means in sRGB, one flat baseColorFactor material per palette entry, flat "
                                 "shading, UVs removed")
    log(f"{tag} toybox: {tri_count(me):,} tris, {toy_size / 1e6:.2f} MB, palette {[p['hex'] for p in palette]}")
    return low, toy, info


def render_trio(stage, original, low, toy, prefix, labels, others=()):
    creatures = [original, low, toy, *others]
    out_paths = []
    for ob, suffix, label in ((original, "original", labels[0]), (low, "lowpoly", labels[1]), (toy, "toybox", labels[2])):
        only_visible(creatures, ob)
        mn, mx = world_bbox(ob)
        stage.frame(mn, mx)
        out = os.path.join(HERE, f"{prefix}-{suffix}.png")
        stage.render(label, out)
        out_paths.append(out)
        log(f"preview -> {out}")
    return out_paths


# ----------------------------------------------------------------------------- stages

def stage_probe(args):
    os.makedirs(args.probe_dir, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    stage = gc.Stage(8, args.preview)
    ob = import_source()
    framing_matrix(ob, "posz", args.height)
    mn, mx = world_bbox(ob)
    size = mx - mn
    target = Vector((0.0, 0.0, size.z * 0.5))
    dist = max(size.length * 0.5, 0.3) / math.tan(math.atan(18.0 / 50.0)) * 1.15 + 0.15
    for name, d in (("posz", (0, -1)), ("negz", (0, 1)), ("posx", (1, 0)), ("negx", (-1, 0))):
        dirn = Vector((d[0], d[1], 0.25)).normalized()
        pos = target + dirn * dist
        stage.cam.location = pos
        stage.cam.rotation_euler = (target - pos).to_track_quat("-Z", "Y").to_euler()
        for lo in stage.lights:
            lo.rotation_euler = (target - lo.location).to_track_quat("-Z", "Y").to_euler()
        out = os.path.join(args.probe_dir, f"from_{name}.png")
        stage.render(f"camera at glTF {name}", out)
        log(f"probe {name} -> {out}")


def stage_build(args):
    t_start = time.time()
    report = dict(source=os.path.relpath(SRC, REPO), front_axis_raw=args.front, timings_s={})
    bpy.ops.wm.read_factory_settings(use_empty=True)
    stage = gc.Stage(args.samples, args.preview)

    t0 = time.time()
    original = import_source()
    report["timings_s"]["import"] = round(time.time() - t0, 1)
    report["source_tris"] = tri_count(original.data)
    report["source_vertices"] = len(original.data.vertices)
    report["framing"] = framing_matrix(original, args.front, args.height)
    log(f"imported {report['source_tris']:,} tris / {report['source_vertices']:,} verts; "
        f"native size {report['framing']['native_size_m']}")
    src_mat = original.data.materials[0] if original.data.materials else None
    base_img = find_basecolor_image(src_mat)
    report["source_basecolor"] = dict(name=base_img.name, size=list(base_img.size))

    low, toy, info = make_variants(original, STEM, base_img, args.tris, args.k, args.tex)
    report.update(info)

    t0 = time.time()
    previews = render_trio(stage, original, low, toy, "preview",
                           (f"tripo original  {report['source_tris'] // 1000}k tris",
                            f"lowpoly-textured  {info['tris_after']} tris",
                            f"toybox  {info['tris_after']} tris  {args.k} colours"))
    report["timings_s"]["previews"] = round(time.time() - t0, 1)
    gen, used = generated_cells()
    compose(previews + gen, os.path.join(HERE, "comparison.png"), cols=3, cell=256)
    report["comparison"] = dict(file="comparison.png", cells=[os.path.basename(c) for c in previews] + used)
    report["animations"] = "none in source; no motion strip rendered"
    report["timings_s"]["total"] = round(time.time() - t_start, 1)
    with open(os.path.join(HERE, "pipeline-report.json"), "w") as fh:
        json.dump(report, fh, indent=2)
    log(json.dumps(report, indent=2))


def stage_split(args):
    """Separate loose parts, render a cell per part, cache the parts for the exemplar stage."""
    t_start = time.time()
    os.makedirs(os.path.dirname(SPLIT_CACHE), exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    stage = gc.Stage(16, 256)
    original = import_source()
    framing_matrix(original, args.front, args.height)
    bake_matrix(original)  # components inherit the front-facing, metre-scaled panel space
    work = duplicate(original, "split-work")
    bpy.data.objects.remove(original, do_unlink=True)
    select_only(work)
    t0 = time.time()
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.separate(type="LOOSE")
    bpy.ops.object.mode_set(mode="OBJECT")
    parts = [o for o in bpy.data.objects if o.type == "MESH" and o.name.startswith("split-work")]
    log(f"separate: {len(parts)} loose parts in {time.time() - t0:.1f}s")

    # Tripo figures are not watertight: each one is many shells. Cluster shells whose (slightly padded)
    # bounding boxes touch; the grid gaps between figures are wider than the padding.
    n = len(parts)
    mins = np.empty((n, 3))
    maxs = np.empty((n, 3))
    for i, o in enumerate(parts):
        mn, mx = world_bbox(o)
        mins[i], maxs[i] = mn, mx
    eps = args.cluster_eps
    touch = np.all((mins[:, None, :] - eps <= maxs[None, :, :]) & (maxs[:, None, :] + eps >= mins[None, :, :]), axis=2)
    label = np.arange(n)
    changed = True
    while changed:  # label propagation = connected components of the touch graph
        new = np.where(touch, label[None, :], n).min(axis=1)
        changed = not np.array_equal(new, label)
        label = new
    clusters = {}
    for i, lab in enumerate(label):
        clusters.setdefault(int(lab), []).append(i)
    log(f"{len(clusters)} clusters from {n} shells (eps {eps} m)")

    rows = []
    for idx in clusters.values():
        objs_c = [parts[i] for i in idx]
        tris = sum(tri_count(o.data) for o in objs_c)
        mn = Vector(mins[idx].min(axis=0))
        mx = Vector(maxs[idx].max(axis=0))
        rows.append(dict(objs=objs_c, tris=tris, shells=len(idx), min=mn, max=mx))
    big = [r for r in rows if r["tris"] >= args.min_tris]
    small = [r for r in rows if r["tris"] < args.min_tris]
    # grid order: top row first (panel "up" is Blender z), then left to right
    big.sort(key=lambda r: (-round((r["min"].z + r["max"].z) / 2 / 0.08), (r["min"].x + r["max"].x) / 2))
    census = []
    for i, r in enumerate(big):
        select_only(r["objs"][0])
        for o in r["objs"]:
            o.select_set(True)
        if len(r["objs"]) > 1:
            bpy.ops.object.join()
        o = bpy.context.view_layer.objects.active
        o.name = f"component-{i:02d}"
        o.data.name = o.name
        r["ob"] = o
        c = (r["min"] + r["max"]) / 2
        size = r["max"] - r["min"]
        census.append(dict(index=i, name=o.name, tris=r["tris"], shells=r["shells"], vertices=len(o.data.vertices),
                           panel_centre=[round(c.x, 3), round(c.y, 3), round(c.z, 3)],
                           size_m=[round(size.x, 3), round(size.y, 3), round(size.z, 3)]))
    for r in small:
        for o in r["objs"]:
            bpy.data.objects.remove(o, do_unlink=True)
    log(f"{len(big)} figures >= {args.min_tris} tris, {len(small)} debris clusters dropped")

    # each component rendered alone, grounded and centred, at the display height
    cells = []
    objs = [r["ob"] for r in big]
    for i, r in enumerate(big):
        o = r["ob"]
        saved = o.matrix_world.copy()
        c = (r["min"] + r["max"]) / 2
        s = args.height / max((r["max"] - r["min"]).z, 1e-9)
        o.matrix_world = Matrix.Translation((-c.x * s, -c.y * s, -r["min"].z * s)) @ Matrix.Scale(s, 4)
        bpy.context.view_layer.update()
        only_visible(objs, o)
        mn, mx = world_bbox(o)
        stage.frame(mn, mx)
        cell = f"/tmp/tripo-split/cell-{i:02d}.png"
        stage.render(f"c{i:02d}  {r['tris'] // 1000}k tris", cell)
        cells.append(cell)
        o.matrix_world = saved
    for o in objs:
        o.hide_render = False
    compose(cells, os.path.join(HERE, "components-sheet.png"), cols=6, cell=256)
    with open(os.path.join(HERE, "components.json"), "w") as fh:
        json.dump(dict(source=os.path.relpath(SRC, REPO), loose_shells=n, clusters=len(clusters),
                       cluster_eps_m=eps, min_tris=args.min_tris, components=census,
                       dropped_debris_clusters=len(small)), fh, indent=2)
    for o in list(stage.stage_objects):
        bpy.data.objects.remove(o, do_unlink=True)
    bpy.ops.wm.save_as_mainfile(filepath=SPLIT_CACHE, compress=True)
    log(f"split done in {time.time() - t_start:.1f}s -> components-sheet.png, components.json, {SPLIT_CACHE}")


def stage_exemplar(args):
    """Run one cached component through make_variants at the charter's creature budget."""
    if not os.path.exists(SPLIT_CACHE):
        raise SystemExit("run --stage split first")
    bpy.ops.wm.open_mainfile(filepath=SPLIT_CACHE)
    name = f"component-{args.exemplar:02d}"
    ob = bpy.data.objects.get(name)
    if ob is None:
        raise SystemExit(f"{name} not in cache")
    for o in list(bpy.data.objects):
        if o is not ob:
            bpy.data.objects.remove(o, do_unlink=True)
    stage = gc.Stage(args.samples, args.preview)
    tag = f"exemplar-c{args.exemplar:02d}"
    ob.name = tag + "-original"
    framing_matrix(ob, "posz", args.height)  # already front-facing from the split stage
    base_img = find_basecolor_image(ob.data.materials[0] if ob.data.materials else None)
    report = dict(component=name, source_tris=tri_count(ob.data))
    low, toy, info = make_variants(ob, tag, base_img, args.exemplar_tris, args.k, args.tex)
    report.update(info)
    previews = render_trio(stage, ob, low, toy, f"preview-{tag}",
                           (f"{tag} original  {report['source_tris'] // 1000}k tris",
                            f"{tag} lowpoly-textured  {info['tris_after']} tris",
                            f"{tag} toybox  {info['tris_after']} tris  {args.k} colours"))
    gen, used = generated_cells()
    compose(previews + gen, os.path.join(HERE, f"comparison-{tag}.png"), cols=3, cell=256)
    report["comparison"] = f"comparison-{tag}.png"
    with open(os.path.join(HERE, f"pipeline-report-{tag}.json"), "w") as fh:
        json.dump(report, fh, indent=2)
    log(json.dumps(report, indent=2))


def main():
    args = parse_args()
    {"probe": stage_probe, "build": stage_build, "split": stage_split, "exemplar": stage_exemplar}[args.stage](args)


if __name__ == "__main__":
    main()
