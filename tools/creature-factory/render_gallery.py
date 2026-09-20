"""
Render a contact sheet for a folder of GLB files (e.g. the CC0 mini-models) with the same
cream 3/4-view stage used by generate_creatures.py. Doubles as a glTF re-import smoke test.

  /Applications/Blender.app/Contents/MacOS/Blender -b --python tools/creature-factory/render_gallery.py -- \
      --in assets/creatures/cc0 --out assets/creatures/cc0/contact-sheet.png [--cell 256 --cols 8 --samples 16]

`--in` is searched recursively for *.glb / *.gltf. Each model is scaled to a 1.2 m display height (packs
ship in wildly different units), grounded (min z -> 0) and centred; native sizes are printed. Nothing is
written except the PNG cells (temp dir) + the sheet.
"""

import argparse
import glob
import os
import sys
import tempfile
import time

import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import generate_creatures as gc  # noqa: E402


def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    p = argparse.ArgumentParser(prog="render_gallery.py")
    p.add_argument("--in", dest="inp", required=True, help="folder with .glb/.gltf (recursive)")
    p.add_argument("--out", required=True, help="contact sheet PNG path")
    p.add_argument("--cell", type=int, default=256)
    p.add_argument("--cols", type=int, default=8)
    p.add_argument("--samples", type=int, default=16)
    p.add_argument("--limit", type=int, default=0, help="only the first N models (debugging)")
    return p.parse_args(argv)


def resolve(path):
    return path if os.path.isabs(path) else os.path.join(gc.REPO_ROOT, path)


def evaluated_bbox(objects):
    deps = bpy.context.evaluated_depsgraph_get()
    mn = Vector((1e9, 1e9, 1e9))
    mx = Vector((-1e9, -1e9, -1e9))
    found = False
    for ob in objects:
        if ob.type != "MESH":
            continue
        ev = ob.evaluated_get(deps)
        for c in ev.bound_box:
            p = ev.matrix_world @ Vector(c)
            mn = Vector((min(mn.x, p.x), min(mn.y, p.y), min(mn.z, p.z)))
            mx = Vector((max(mx.x, p.x), max(mx.y, p.y), max(mx.z, p.z)))
            found = True
    if not found:
        return Vector((-0.5, -0.5, 0.0)), Vector((0.5, 0.5, 1.0))
    return mn, mx


def main():
    t0 = time.time()
    args = parse_args()
    in_dir = resolve(args.inp)
    out_png = resolve(args.out)
    files = sorted(glob.glob(os.path.join(in_dir, "**", "*.glb"), recursive=True) +
                   glob.glob(os.path.join(in_dir, "**", "*.gltf"), recursive=True))
    if args.limit:
        files = files[:args.limit]
    if not files:
        print(f"[gallery] no glb/gltf files under {in_dir}")
        return
    os.makedirs(os.path.dirname(out_png), exist_ok=True)
    cells_dir = tempfile.mkdtemp(prefix="gallery-cells-")

    bpy.ops.wm.read_factory_settings(use_empty=True)
    stage = gc.Stage(args.samples, args.cell)
    scene = bpy.context.scene
    scene.frame_set(1)

    cell_paths = []
    report = []
    for path in files:
        label = os.path.splitext(os.path.basename(path))[0]
        before = set(bpy.data.objects)
        try:
            bpy.ops.import_scene.gltf(filepath=path)
        except Exception as exc:
            print(f"[gallery] FAILED import {path}: {exc}")
            report.append((label, "import failed"))
            continue
        new = [o for o in bpy.data.objects if o not in before]
        roots = [o for o in new if o.parent is None or o.parent not in new]
        mn, mx = evaluated_bbox(new)
        size0 = mx - mn
        # packs come in wildly different units (Gobkit v1 is ~400 units tall): normalise to a 1.2 m
        # display height under a parent empty, then ground + centre it
        pivot = bpy.data.objects.new(f"pivot-{label}", None)
        scene.collection.objects.link(pivot)
        for r in roots:
            r.parent = pivot
        s = 1.2 / max(size0.z, 1e-6)
        pivot.scale = (s, s, s)
        bpy.context.view_layer.update()
        mn, mx = evaluated_bbox(new)
        pivot.location = Vector((-(mn.x + mx.x) / 2, -(mn.y + mx.y) / 2, -mn.z))
        bpy.context.view_layer.update()
        mn, mx = evaluated_bbox(new)
        new.append(pivot)
        tris = sum(len(p.vertices) - 2 for o in new if o.type == "MESH" for p in o.data.polygons)
        stage.frame(mn, mx)
        cell = os.path.join(cells_dir, f"{len(cell_paths):03d}-{label}.png")
        stage.render(label, cell)
        cell_paths.append(cell)
        report.append((label, f"{tris} tris, native size {size0.x:.2f}x{size0.y:.2f}x{size0.z:.2f}"))
        print(f"[gallery] {label}: {tris} tris, native height {size0.z:.2f}")
        for o in new:
            bpy.data.objects.remove(o, do_unlink=True)
        bpy.ops.outliner.orphans_purge(do_local_ids=True, do_linked_ids=True, do_recursive=True)

    grid = gc.compose_sheet(cell_paths, out_png, args.cols, args.cell)
    print(f"[gallery] {len(cell_paths)}/{len(files)} models rendered, grid {grid} -> {out_png} "
          f"({time.time() - t0:.1f}s)")
    for label, info in report:
        print(f"[gallery]   {label}: {info}")


if __name__ == "__main__":
    main()
