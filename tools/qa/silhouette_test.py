"""
Silhouette readability test (Blender 5.2 headless, EEVEE, numpy + bpy.data.images; no PIL).

For every GLB: import, clear animation (rest pose), drop the importer's bone-shape helpers, fit an
orthographic 3/4 camera (azimuth 34 deg, elevation 22 deg, same view as the contact sheets) to the
evaluated bounding box, render the alpha mask at 96x96 and 48x48 and compute

  fill          black pixels / the silhouette's own bounding rectangle  want 0.25 - 0.75
                (aspect-neutral; `frame_fill` = share of the fitted square is reported too)
  components    8-connected blobs in the mask (at 96 and at 48)          want exactly 1
                (a detached part counts when >= 2 % of the body at 96 px or >= 3 px at 48 px)
  distinctness  mean per-pixel difference of the 48 px silhouette against every other member of
                the same family (archetype token of the file name, or the parent folder); low = samey

Outputs `<out-dir>/silhouettes-<set>.png` (grid: 96 px mask | 48 px mask upscaled, label + metrics,
green/red border) and `<out-dir>/silhouettes-<set>.json`.

  /Applications/Blender.app/Contents/MacOS/Blender -b --python tools/qa/silhouette_test.py -- \
      --in assets/creatures/generated --set creatures-generated [--out-dir tools/qa/out] \
      [--exclude "*_input_snapshot*"] [--family archetype|folder|all] [--cols 6] [--samples 8] [--limit N]

Exit code is 0 even when files fail (the JSON carries the verdicts; run_all.sh aggregates).
"""

import argparse
import fnmatch
import glob
import json
import math
import os
import sys
import tempfile
import time

import bpy
import numpy as np
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
AZIMUTH, ELEVATION = 34.0, 22.0
SIZES = (96, 48)
MARGIN = 1.04           # ortho view is 4 % wider than the projected bbox
ALPHA_THRESHOLD = 0.5


def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    p = argparse.ArgumentParser(prog="silhouette_test.py")
    p.add_argument("--in", dest="inputs", nargs="+", required=True, help="folders (recursive), files or globs")
    p.add_argument("--set", dest="set_name", required=True, help="set label used in the output file names")
    p.add_argument("--out-dir", default="tools/qa/out")
    p.add_argument("--exclude", action="append", default=[], help="glob on relative path / basename to skip")
    p.add_argument("--family", default="archetype", choices=["archetype", "biome", "folder", "all"],
                   help="how files are grouped for the distinctness score")
    p.add_argument("--min-fill", type=float, default=0.25)
    p.add_argument("--max-fill", type=float, default=0.75)
    p.add_argument("--min-distinct", type=float, default=0.05, help="below this the file gets a WARN (samey)")
    p.add_argument("--cols", type=int, default=6)
    p.add_argument("--samples", type=int, default=8)
    p.add_argument("--limit", type=int, default=0)
    p.add_argument("--manifest", default="", help="manifest.json; items tagged 'decor' skip the fill and distinctness rules")
    return p.parse_args(argv)


def load_manifest_tags(path):
    """repo-relative file path / basename -> {tags, kind}."""
    if not path or not os.path.isfile(resolve(path)):
        return {}
    with open(resolve(path)) as fh:
        m = json.load(fh)
    items = m.get("assets") or m.get("creatures") or m.get("items") or []
    index = {}
    for it in items:
        f = it.get("file")
        if f:
            info = {"tags": [t.lower() for t in (it.get("tags") or [])], "kind": it.get("kind")}
            index[os.path.normpath(f).replace("\\", "/")] = info
            index.setdefault(os.path.basename(f), info)
    return index


def resolve(path):
    return path if os.path.isabs(path) else os.path.join(REPO_ROOT, path)


def expand_inputs(inputs, excludes):
    files = []
    for inp in inputs:
        inp = resolve(inp)
        if os.path.isdir(inp):
            for ext in ("glb", "gltf"):
                files += glob.glob(os.path.join(inp, "**", f"*.{ext}"), recursive=True)
        elif any(ch in inp for ch in "*?["):
            files += glob.glob(inp, recursive=True)
        elif os.path.isfile(inp):
            files.append(inp)
    out = []
    for f in sorted(set(files)):
        rel = os.path.relpath(f, REPO_ROOT)
        if any(fnmatch.fnmatch(rel, pat) or fnmatch.fnmatch(os.path.basename(rel), pat) for pat in excludes):
            continue
        out.append(f)
    return out


def family_of(path, mode):
    label = os.path.splitext(os.path.basename(path))[0]
    parts = label.split("-")
    if mode == "all":
        return "all"
    if mode == "folder":
        return os.path.basename(os.path.dirname(path))
    if len(parts) >= 3 and parts[-1].isdigit():   # <archetype>-<biome>-<seed>
        return parts[0] if mode == "archetype" else parts[1]
    return os.path.basename(os.path.dirname(path))


# ----------------------------------------------------------------------------- scene

class SilhouetteStage:
    def __init__(self, samples):
        bpy.ops.wm.read_factory_settings(use_empty=True)
        scene = bpy.context.scene
        self.scene = scene
        scene.render.resolution_percentage = 100
        scene.render.image_settings.file_format = "PNG"
        scene.render.image_settings.color_mode = "RGBA"
        scene.render.image_settings.compression = 15
        scene.render.film_transparent = True   # the alpha channel is the silhouette
        scene.render.engine = "BLENDER_EEVEE"
        ee = scene.eevee
        ee.taa_render_samples = samples
        for attr, val in (("use_raytracing", False), ("use_shadows", False)):
            if hasattr(ee, attr):
                setattr(ee, attr, val)
        try:
            scene.view_settings.view_transform = "Standard"
            scene.view_settings.look = "None"
        except TypeError:
            pass
        if scene.world is None:
            scene.world = bpy.data.worlds.new("World")
        cam_data = bpy.data.cameras.new("sil_cam")
        cam_data.type = "ORTHO"
        cam_data.clip_start = 0.01
        cam_data.clip_end = 100000.0
        self.cam = bpy.data.objects.new("sil_cam", cam_data)
        scene.collection.objects.link(self.cam)
        scene.camera = self.cam
        self.stage_objects = {self.cam}
        scene.frame_set(1)

    def frame(self, mn, mx):
        size = mx - mn
        target = (mn + mx) * 0.5
        radius = max(size.length * 0.5, 1e-3)
        az, el = math.radians(AZIMUTH), math.radians(ELEVATION)
        dirn = Vector((math.sin(az) * math.cos(el), -math.cos(az) * math.cos(el), math.sin(el)))
        pos = target + dirn * (radius * 4.0 + 1.0)
        self.cam.location = pos
        self.cam.rotation_euler = (target - pos).to_track_quat("-Z", "Y").to_euler()
        bpy.context.view_layer.update()
        rot = self.cam.matrix_world.to_3x3()
        right, up = rot @ Vector((1, 0, 0)), rot @ Vector((0, 1, 0))
        ext = 0.0
        for i in range(8):
            c = Vector((mx.x if i & 1 else mn.x, mx.y if i & 2 else mn.y, mx.z if i & 4 else mn.z)) - target
            ext = max(ext, abs(c.dot(right)), abs(c.dot(up)))
        self.cam.data.ortho_scale = 2.0 * ext * MARGIN
        # far/near: keep the whole box in front of the camera
        self.cam.data.clip_end = radius * 4.0 + 1.0 + radius * 2.0 + 1.0

    def render_mask(self, px, filepath):
        self.scene.render.resolution_x = px
        self.scene.render.resolution_y = px
        self.scene.render.filepath = filepath
        try:
            bpy.ops.render.render(write_still=True)
        except Exception as exc:
            if self.scene.render.engine != "CYCLES":
                print(f"[silhouette] EEVEE failed ({exc}); falling back to CYCLES")
                self.scene.render.engine = "CYCLES"
                self.scene.cycles.samples = 16
                self.scene.cycles.device = "CPU"
                bpy.ops.render.render(write_still=True)
            else:
                raise
        img = bpy.data.images.load(filepath, check_existing=False)
        w, h = img.size
        buf = np.empty(w * h * 4, dtype=np.float32)
        img.pixels.foreach_get(buf)
        bpy.data.images.remove(img)
        alpha = buf.reshape(h, w, 4)[..., 3]
        return np.flipud(alpha) > ALPHA_THRESHOLD   # top row first


def evaluated_bounds(objects):
    deps = bpy.context.evaluated_depsgraph_get()
    mn = Vector((math.inf,) * 3)
    mx = Vector((-math.inf,) * 3)
    for ob in objects:
        if ob.type != "MESH":
            continue
        ev = ob.evaluated_get(deps)
        me = ev.to_mesh()
        if me is None:
            continue
        n = len(me.vertices)
        if n:
            co = np.empty(n * 3, dtype=np.float32)
            me.vertices.foreach_get("co", co)
            co = co.reshape(n, 3)
            m = np.array(ev.matrix_world, dtype=np.float64)
            world = co @ m[:3, :3].T + m[:3, 3]
            lo, hi = world.min(axis=0), world.max(axis=0)
            mn = Vector((min(mn.x, lo[0]), min(mn.y, lo[1]), min(mn.z, lo[2])))
            mx = Vector((max(mx.x, hi[0]), max(mx.y, hi[1]), max(mx.z, hi[2])))
        ev.to_mesh_clear()
    if not math.isfinite(mn.x):
        return None, None
    return mn, mx


def import_rest_pose(path, stage_objects):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    new = [o for o in bpy.data.objects if o not in before and o not in stage_objects]
    # the importer's bone display helpers (e.g. "Icosphere") are not part of the asset
    helpers = {pb.custom_shape for o in new if o.type == "ARMATURE" for pb in o.pose.bones if pb.custom_shape}
    for o in new:
        o.animation_data_clear()
        if o.type == "ARMATURE":
            if o.data.animation_data:
                o.data.animation_data_clear()
            for pb in o.pose.bones:
                pb.matrix_basis.identity()
        if o.type == "MESH" and o.data.shape_keys and o.data.shape_keys.animation_data:
            o.data.shape_keys.animation_data_clear()
    for h in helpers:
        h.hide_render = True
        h.hide_viewport = True
    bpy.context.view_layer.update()
    measurable = [o for o in new if o not in helpers]
    return new, measurable


# ----------------------------------------------------------------------------- pixel work

def tight_fill(mask):
    """Filled fraction of the silhouette's own bounding rectangle (aspect-neutral compactness)."""
    ys, xs = np.nonzero(mask)
    if len(ys) == 0:
        return 0.0
    box = (ys.max() - ys.min() + 1) * (xs.max() - xs.min() + 1)
    return float(len(ys)) / float(box)


def components(mask):
    """Number of 8-connected components and the pixel area of each (largest first)."""
    h, w = mask.shape
    seen = np.zeros_like(mask, dtype=bool)
    areas = []
    ys, xs = np.nonzero(mask)
    for sy, sx in zip(ys.tolist(), xs.tolist()):
        if seen[sy, sx]:
            continue
        stack = [(sy, sx)]
        seen[sy, sx] = True
        area = 0
        while stack:
            y, x = stack.pop()
            area += 1
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        stack.append((ny, nx))
        areas.append(area)
    areas.sort(reverse=True)
    return len(areas), areas


FONT = {  # 3x5 glyphs, rows top to bottom
    "a": ".#.,#.#,###,#.#,#.#", "b": "##.,#.#,##.,#.#,##.", "c": "###,#..,#..,#..,###", "d": "##.,#.#,#.#,#.#,##.",
    "e": "###,#..,###,#..,###", "f": "###,#..,###,#..,#..", "g": "###,#..,#.#,#.#,###", "h": "#.#,#.#,###,#.#,#.#",
    "i": "###,.#.,.#.,.#.,###", "j": "..#,..#,..#,#.#,###", "k": "#.#,#.#,##.,#.#,#.#", "l": "#..,#..,#..,#..,###",
    "m": "#.#,###,###,#.#,#.#", "n": "##.,#.#,#.#,#.#,#.#", "o": "###,#.#,#.#,#.#,###", "p": "###,#.#,###,#..,#..",
    "q": "###,#.#,#.#,###,..#", "r": "###,#.#,##.,#.#,#.#", "s": "###,#..,###,..#,###", "t": "###,.#.,.#.,.#.,.#.",
    "u": "#.#,#.#,#.#,#.#,###", "v": "#.#,#.#,#.#,#.#,.#.", "w": "#.#,#.#,###,###,#.#", "x": "#.#,#.#,.#.,#.#,#.#",
    "y": "#.#,#.#,.#.,.#.,.#.", "z": "###,..#,.#.,#..,###", "0": "###,#.#,#.#,#.#,###", "1": ".#.,##.,.#.,.#.,###",
    "2": "###,..#,###,#..,###", "3": "###,..#,###,..#,###", "4": "#.#,#.#,###,..#,..#", "5": "###,#..,###,..#,###",
    "6": "###,#..,###,#.#,###", "7": "###,..#,..#,..#,..#", "8": "###,#.#,###,#.#,###", "9": "###,#.#,###,..#,###",
    "-": "...,...,###,...,...", "_": "...,...,...,...,###", ".": "...,...,...,...,.#.", " ": "...,...,...,...,...",
    ":": "...,.#.,...,.#.,...", "/": "..#,..#,.#.,#..,#..", "!": ".#.,.#.,.#.,...,.#.",
}


def draw_text(canvas, x0, y0, text, color, scale=2):
    """Blit `text` (lower-cased, unknown glyphs as '.') onto an RGB float canvas."""
    x = x0
    for ch in text.lower():
        rows = FONT.get(ch, FONT["."]).split(",")
        for r, row in enumerate(rows):
            for c, cell in enumerate(row):
                if cell == "#":
                    ys, xs = y0 + r * scale, x + c * scale
                    canvas[ys:ys + scale, xs:xs + scale] = color
        x += 4 * scale
        if x + 3 * scale > canvas.shape[1]:
            break


def upscale(mask, factor):
    return np.repeat(np.repeat(mask, factor, axis=0), factor, axis=1)


def compose_grid(cells, out_path, cols):
    """cells: list of dicts with mask96, mask48, label, metrics, ok. Writes the PNG via bpy.data.images."""
    border = 2
    cw, ch = 196 + 2 * border, 126 + 2 * border   # inner: 96 | 4 px gap | 96 wide, 96 + 30 px label strip tall
    n = len(cells)
    cols = max(1, min(cols, n))
    rows = math.ceil(n / cols)
    sheet = np.full((rows * ch, cols * cw, 3), 0.93, dtype=np.float32)
    for i, cell in enumerate(cells):
        r, c = divmod(i, cols)
        y0, x0 = r * ch, c * cw
        col = (0.35, 0.72, 0.42) if cell["ok"] else (0.88, 0.30, 0.30)
        sheet[y0:y0 + ch, x0:x0 + cw] = col
        inner = np.ones((ch - 2 * border, cw - 2 * border, 3), dtype=np.float32)
        m96 = cell["mask96"]
        inner[0:96, 0:96] = np.where(m96[..., None], 0.0, 1.0)
        m48 = upscale(cell["mask48"], 2)
        inner[0:96, 100:196] = np.where(m48[..., None], 0.0, 1.0)
        # thin separator so the two views read as two panels
        inner[0:96, 96:100] = 0.85
        draw_text(inner, 2, 100, cell["label"][:24], (0.1, 0.1, 0.12))
        draw_text(inner, 2, 114, cell["metrics"][:24], (0.35, 0.35, 0.4) if cell["ok"] else (0.75, 0.15, 0.15))
        sheet[y0 + border:y0 + ch - border, x0 + border:x0 + cw - border] = inner
    h, w = sheet.shape[:2]
    rgba = np.empty((h, w, 4), dtype=np.float32)
    rgba[..., :3] = np.flipud(sheet)   # Blender stores rows bottom-up
    rgba[..., 3] = 1.0
    img = bpy.data.images.new("silhouette_grid", w, h, alpha=False)
    img.pixels.foreach_set(rgba.ravel())
    img.filepath_raw = out_path
    img.file_format = "PNG"
    img.save()
    bpy.data.images.remove(img)
    return rows, cols


# ----------------------------------------------------------------------------- main

def main():
    t0 = time.time()
    args = parse_args()
    files = expand_inputs(args.inputs, args.exclude)
    if args.limit:
        files = files[:args.limit]
    out_dir = resolve(args.out_dir)
    os.makedirs(out_dir, exist_ok=True)
    png_path = os.path.join(out_dir, f"silhouettes-{args.set_name}.png")
    json_path = os.path.join(out_dir, f"silhouettes-{args.set_name}.json")
    report = {
        "tool": "silhouette_test.py", "version": 1, "set": args.set_name,
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%S%z"), "blender": bpy.app.version_string,
        "thresholds": {"fill": [args.min_fill, args.max_fill], "components": 1, "min_distinct": args.min_distinct},
        "view": {"projection": "orthographic", "azimuth_deg": AZIMUTH, "elevation_deg": ELEVATION, "sizes": list(SIZES)},
        "family_mode": args.family, "grid": None, "files": [],
    }
    if not files:
        print(f"[silhouette] no GLB/glTF under {args.inputs}")
        report["summary"] = {"count": 0, "pass": 0, "fail": 0}
        with open(json_path, "w") as fh:
            json.dump(report, fh, indent=1)
        return

    stage = SilhouetteStage(args.samples)
    tmp = tempfile.mkdtemp(prefix="silhouette-")
    tags_index = load_manifest_tags(args.manifest)
    report["manifest"] = args.manifest or None
    records = []
    for path in files:
        label = os.path.splitext(os.path.basename(path))[0]
        rel = os.path.relpath(path, REPO_ROOT).replace("\\", "/")
        info = tags_index.get(rel) or tags_index.get(os.path.basename(path)) or {}
        decor = "decor" in info.get("tags", [])
        rec = {"file": path, "rel": rel, "label": label, "family": family_of(path, args.family),
               "tags": info.get("tags", []), "decor": decor, "status": "PASS", "reasons": [], "warnings": []}
        try:
            new, measurable = import_rest_pose(path, stage.stage_objects)
        except Exception as exc:
            rec["status"] = "FAIL"
            rec["reasons"].append(f"import failed: {exc}")
            records.append(rec)
            continue
        mn, mx = evaluated_bounds(measurable)
        if mn is None:
            rec["status"] = "FAIL"
            rec["reasons"].append("no mesh geometry")
        else:
            stage.frame(mn, mx)
            masks = {}
            for px in SIZES:
                masks[px] = stage.render_mask(px, os.path.join(tmp, f"{label}-{px}.png"))
            rec["mask96"], rec["mask48"] = masks[96], masks[48]
            for px in SIZES:
                m = masks[px]
                n_comp, areas = components(m)
                rec[f"fill{px}"] = round(tight_fill(m), 4)
                rec[f"frame_fill{px}"] = round(float(m.mean()), 4)
                rec[f"components{px}"] = n_comp
                rec[f"component_areas{px}"] = areas[:6]
            fill = rec["fill96"]
            if not (args.min_fill <= fill <= args.max_fill):
                if decor:
                    rec["warnings"].append(f"fill {fill:.2f} outside {args.min_fill:.2f}-{args.max_fill:.2f} (decor: not gated)")
                else:
                    rec["reasons"].append(f"fill {fill:.2f} outside {args.min_fill:.2f}-{args.max_fill:.2f}")
            # detached parts: at 96 px anything >= 2 % of the main body is a real floating piece; at 48 px
            # (the target size) >= 3 px counts. Smaller specks (whisker dashes, AA crumbs) are warnings.
            a96 = rec["component_areas96"]
            parts96 = [a for a in a96[1:] if a >= 0.02 * a96[0]] if a96 else []
            if parts96:
                rec["reasons"].append(f"{len(parts96) + 1} components at 96 px (floating parts of {parts96[:3]} px)")
            elif len(a96) > 1:
                rec["warnings"].append(f"{len(a96) - 1} speck(s) of {a96[1:4]} px at 96 px (thin feature breaks up)")
            a48 = rec["component_areas48"]
            parts48 = [a for a in a48[1:] if a >= 3] if a48 else []
            if parts48:
                rec["reasons"].append(f"{len(parts48) + 1} components at 48 px (parts of {parts48[:3]} px break off)")
            elif len(a48) > 1:
                rec["warnings"].append(f"{len(a48) - 1} speck(s) at 48 px")
            if rec["fill48"] == 0:
                rec["reasons"].append("empty silhouette at 48 px")
        for o in new:
            try:
                bpy.data.objects.remove(o, do_unlink=True)
            except ReferenceError:
                pass
        bpy.ops.outliner.orphans_purge(do_local_ids=True, do_linked_ids=True, do_recursive=True)
        if rec["reasons"]:
            rec["status"] = "FAIL"
        records.append(rec)
        print(f"[silhouette] {label}: fill96={rec.get('fill96', '-')} (frame {rec.get('frame_fill96', '-')}) "
              f"comp96={rec.get('components96', '-')} comp48={rec.get('components48', '-')} {rec['status']}")

    # distinctness within each family (48 px masks)
    by_family = {}
    for r in records:
        if "mask48" in r and not r.get("decor"):   # ground decor (rocks, discs) is allowed to look alike
            by_family.setdefault(r["family"], []).append(r)
        elif r.get("decor"):
            r["distinctness"] = None
            r["nearest"] = None
    for fam, members in by_family.items():
        if len(members) < 2:
            for r in members:
                r["distinctness"] = None
                r["nearest"] = None
            continue
        stack = np.stack([m["mask48"].astype(np.float32) for m in members])
        for i, r in enumerate(members):
            diffs = np.abs(stack - stack[i]).mean(axis=(1, 2))
            diffs[i] = np.inf
            j = int(np.argmin(diffs))
            others = np.delete(diffs, i)
            r["distinctness"] = round(float(others.mean()), 4)
            r["nearest"] = members[j]["label"]
            r["nearest_score"] = round(float(diffs[j]), 4)
            if r["distinctness"] < args.min_distinct:
                r["warnings"].append(f"samey: mean difference {r['distinctness']:.3f} within family '{fam}' (nearest {r['nearest']} {r['nearest_score']:.3f})")

    cells = []
    for r in records:
        if "mask96" not in r:
            continue
        d = r.get("distinctness")
        metrics = f"f{r['fill96']:.2f} c{r['components96']}/{r['components48']}" + (f" d{d:.2f}" if d is not None else "") \
            + (" decor" if r.get("decor") else "")
        cells.append({"mask96": r["mask96"], "mask48": r["mask48"], "label": r["label"], "metrics": metrics,
                      "ok": r["status"] == "PASS"})
    if cells:
        report["grid"] = {"png": os.path.relpath(png_path, REPO_ROOT), "rows_cols": compose_grid(cells, png_path, args.cols),
                          "cell": "96 px silhouette | 48 px silhouette x2 | label | f=fill c=components96/48 d=distinctness"}

    for r in records:
        r.pop("mask96", None)
        r.pop("mask48", None)
    report["files"] = records
    report["summary"] = {
        "count": len(records), "pass": sum(r["status"] == "PASS" for r in records),
        "fail": sum(r["status"] == "FAIL" for r in records),
        "samey": sum(1 for r in records if r.get("distinctness") is not None and r["distinctness"] < args.min_distinct),
        "decor": sum(1 for r in records if r.get("decor")),
        "fill_range": [min((r["fill96"] for r in records if "fill96" in r), default=None),
                       max((r["fill96"] for r in records if "fill96" in r), default=None)],
        "seconds": round(time.time() - t0, 1),
    }
    with open(json_path, "w") as fh:
        json.dump(report, fh, indent=1)
    s = report["summary"]
    print(f"[silhouette] {s['count']} files: {s['pass']} pass, {s['fail']} fail, {s['samey']} samey -> {png_path} ({s['seconds']}s)")


if __name__ == "__main__":
    main()
