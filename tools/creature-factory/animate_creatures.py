"""
StudyGotchi Animator: bake skeleton-free node animation clips (idle / walk / happy / sad / sleep) into every
generated creature GLB. Blender 5.2 LTS, headless.

  /Applications/Blender.app/Contents/MacOS/Blender -b --python tools/creature-factory/animate_creatures.py -- [options]

Reads the read-only snapshot in assets/creatures/animated/_input_snapshot/ (copied from assets/creatures/generated/),
writes assets/creatures/animated/<id>.glb + manifest.json, and (unless --no-motion) motion strips / videos under
assets/creatures/animated/motion/. See tools/creature-factory/animation/README.md for the clip spec.
"""

import argparse
import datetime as _dt
import glob
import json
import os
import sys
import time

import bpy

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
sys.path.insert(0, SCRIPT_DIR)

from animation import clips as C  # noqa: E402
from animation import rig as RG  # noqa: E402

DEFAULT_IN = "assets/creatures/animated/_input_snapshot"
DEFAULT_OUT = "assets/creatures/animated"
DEFAULT_MOTION_IDS = ("blob-forest-1,bean-city-1,bird-ice-1,biped-sand-1,sprite-forest-1,flat-city-1,"
                      "blob-space-1,biped-medieval-1")
DEFAULT_VIDEO_IDS = "sprite-forest-1,flat-city-1"


def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    p = argparse.ArgumentParser(prog="animate_creatures.py")
    p.add_argument("--in", dest="inp", default=DEFAULT_IN, help="folder with the input GLBs (+ manifest.json)")
    p.add_argument("--out", default=DEFAULT_OUT, help="output folder")
    p.add_argument("--only", default="", help="substring filter on creature id")
    p.add_argument("--fps", type=int, default=C.FPS, help="sampling rate baked into the clips")
    p.add_argument("--no-export", action="store_true", help="skip GLB export (motion renders only)")
    p.add_argument("--no-motion", action="store_true", help="skip motion strips and videos")
    p.add_argument("--motion-ids", default=DEFAULT_MOTION_IDS, help="comma list of ids to render walk/happy strips")
    p.add_argument("--video-ids", default=DEFAULT_VIDEO_IDS, help="comma list of ids to render a 2 s walk video")
    p.add_argument("--strip-frames", type=int, default=8)
    p.add_argument("--cell", type=int, default=200, help="strip cell size in px")
    p.add_argument("--samples", type=int, default=16, help="EEVEE samples")
    return p.parse_args(argv)


def resolve(path):
    return path if os.path.isabs(path) else os.path.join(REPO_ROOT, path)


def export_glb(rig, filepath):
    for o in bpy.context.scene.objects:
        o.select_set(o in rig.objects)
    bpy.context.view_layer.objects.active = rig.root
    bpy.ops.export_scene.gltf(
        filepath=filepath,
        export_format="GLB",
        use_selection=True,
        export_apply=False,
        export_yup=True,
        export_materials="EXPORT",
        export_normals=True,
        export_texcoords=False,
        export_extras=False,
        export_cameras=False,
        export_lights=False,
        export_animations=True,
        export_animation_mode="ACTIONS",      # one glTF animation per Blender action ...
        export_merge_animation="ACTION",      # ... merged across Body/Eyes by action name -> clip names survive
        export_nla_strips=True,
        export_force_sampling=True,           # bake Bezier/QUAD easing to per-frame LINEAR samples
        export_frame_step=1,
        export_optimize_animation_size=True,
        export_optimize_animation_keep_anim_object=True,
        export_anim_slide_to_zero=False,
        export_negative_frame="CROP",
        export_bake_animation=False,
        export_skins=False,
        export_morph=False,
    )
    for o in rig.objects:
        o.select_set(False)


def read_glb_json(path):
    import struct
    with open(path, "rb") as fh:
        data = fh.read()
    magic, _version, _length = struct.unpack_from("<III", data, 0)
    if magic != 0x46546C67:
        raise ValueError(f"{path}: not a GLB")
    chunk_len, chunk_type = struct.unpack_from("<II", data, 12)
    if chunk_type != 0x4E4F534A:
        raise ValueError(f"{path}: first chunk is not JSON")
    return json.loads(data[20:20 + chunk_len].decode("utf-8"))


def summarize_glb(path):
    """Clip names/durations, node names, triangle count and extensions straight from the GLB header (no deps)."""
    g = read_glb_json(path)
    accessors = g.get("accessors", [])
    anims = []
    for a in g.get("animations", []):
        dur = 0.0
        keys = 0
        for s in a.get("samplers", []):
            acc = accessors[s["input"]]
            dur = max(dur, float(acc.get("max", [0.0])[0]))
            keys += acc["count"]
        nodes = sorted({g["nodes"][ch["target"]["node"]].get("name", "?") for ch in a.get("channels", [])})
        anims.append({"name": a.get("name"), "seconds": round(dur, 4), "channels": len(a.get("channels", [])),
                      "keyframes": keys, "nodes": nodes})
    tris = 0
    for m in g.get("meshes", []):
        for p in m.get("primitives", []):
            if "indices" in p:
                tris += accessors[p["indices"]]["count"] // 3
            else:
                tris += accessors[p["attributes"]["POSITION"]]["count"] // 3
    body_min_y = None
    for n in g.get("nodes", []):
        if n.get("name") == "Body" and "mesh" in n:
            body_min_y = min(accessors[p["attributes"]["POSITION"]]["min"][1]
                             for p in g["meshes"][n["mesh"]]["primitives"])
    return {
        "animations": anims,
        "nodes": [n.get("name") for n in g.get("nodes", [])],
        "triangles": tris,
        "extensions_used": g.get("extensionsUsed", []),
        "body_min_y": body_min_y,
    }


def main():
    t0 = time.time()
    args = parse_args()
    in_dir = resolve(args.inp)
    out_dir = resolve(args.out)
    os.makedirs(out_dir, exist_ok=True)
    C.FPS = args.fps

    src_manifest = {}
    mpath = os.path.join(in_dir, "manifest.json")
    if os.path.exists(mpath):
        with open(mpath) as fh:
            src_manifest = {c["id"]: c for c in json.load(fh).get("creatures", [])}

    files = sorted(glob.glob(os.path.join(in_dir, "*.glb")))
    if args.only:
        files = [f for f in files if args.only in os.path.basename(f)]
    print(f"[animator] {len(files)} input GLBs from {in_dir}")

    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.fps = args.fps
    scene.render.fps_base = 1.0
    scene.frame_start = 0
    scene.frame_end = max(f for f, _ in C.CLIP_SPEC.values())
    scene.frame_set(0)

    entries = []
    failures = []
    for path in files:
        cid = os.path.splitext(os.path.basename(path))[0]
        src = src_manifest.get(cid, {})
        try:
            rig = RG.build_rig(cid, path, eye_hints=src.get("eyes"), archetype=src.get("archetype"))
            clip_info = C.build_clips(rig)
            RG.rest_pose(rig)
            scene.frame_set(0)
            out_glb = os.path.join(out_dir, f"{cid}.glb")
            if not args.no_export:
                export_glb(rig, out_glb)
            entry = {
                "id": cid,
                "source": os.path.relpath(path, REPO_ROOT).replace(os.sep, "/"),
                "file": os.path.relpath(out_glb, REPO_ROOT).replace(os.sep, "/"),
                "archetype": rig.archetype,
                "biome": src.get("biome", cid.split("-")[1] if "-" in cid else None),
                "family": src.get("family", src.get("biome", cid.split("-")[1] if "-" in cid else None)),
                "personality": src.get("personality"),
                "profile": rig.archetype if rig.archetype in C.PROFILES else "default",
                "happy_variant": C.happy_variant_name(rig),
                "nodes": [o.name for o in rig.objects],
                "eyes_separated": rig.eyes is not None,
                "eye_source": rig.eye_source,
                "eye_center_gltf": [round(rig.eye_center.x, 4), round(rig.eye_center.z, 4), round(-rig.eye_center.y, 4)]
                if rig.eye_center is not None else None,
                "height": round(rig.height, 4),
                "triangles": rig.tris,
                "clips": clip_info,
            }
            if os.path.exists(out_glb):
                entry["bytes"] = os.path.getsize(out_glb)
                summary = summarize_glb(out_glb)
                entry["exported"] = summary
                names = sorted(a["name"] for a in summary["animations"])
                ok = names == sorted(C.CLIP_ORDER) and all(
                    abs(a["seconds"] - clip_info[a["name"]]["seconds"]) < 1e-3 for a in summary["animations"])
                grounded = summary["body_min_y"] is not None and abs(summary["body_min_y"]) < 1e-3
                entry["verified"] = bool(ok and not summary["extensions_used"] and grounded)
                if not entry["verified"]:
                    print(f"[animator] WARNING {cid}: verification failed: {summary}")
            entries.append(entry)
            print(f"[animator] {cid}: {rig.tris} tris, eyes={rig.eye_source}, "
                  f"{len(clip_info)} clips, {entry.get('bytes', 0)} bytes")
            RG.remove_rig(rig)
        except Exception as exc:  # keep going; report at the end
            import traceback
            traceback.print_exc()
            failures.append({"id": cid, "error": str(exc)})
            print(f"[animator] FAILED {cid}: {exc}")

    manifest = {
        "version": 1,
        "animation_version": 4,  # 1 = v1 clips, 2 = profiles + eye hints, 3 = per-archetype happy, 4 = 16-family set
        "generated_at": _dt.datetime.now().astimezone().isoformat(timespec="seconds"),
        "generator": "tools/creature-factory/animate_creatures.py",
        "blender": bpy.app.version_string,
        "input": os.path.relpath(in_dir, REPO_ROOT).replace(os.sep, "/"),
        "conventions": {
            "up": "+Y (glTF)", "front": "+Z", "ground": "feet on y=0 at rest, Root at origin (never animated)",
            "nodes": "Root (empty) > Body (mesh) > Eyes (mesh, optional)",
            "sampling_fps": args.fps,
            "interpolation": "LINEAR samples baked per frame from Bezier/QUAD curves",
            "clips": {k: {"seconds": f / args.fps, "loop": loop} for k, (f, loop) in C.CLIP_SPEC.items()},
            "profiles": "default for blob/bean/bird/biped/sprite; flat = long-axis squash/stretch, pitch x0.4, "
                        "sleep roll 10 deg",
            "happy_variants": {k: v.__name__.replace("happy_", "") for k, v in C.HAPPY_VARIANTS.items()},
        },
        "count": len(entries),
        "creatures": entries,
        "failures": failures,
    }
    if not args.no_export:
        with open(os.path.join(out_dir, "manifest.json"), "w") as fh:
            json.dump(manifest, fh, indent=2)

    if not args.no_motion and entries:
        from animation import motion as M
        ids = [i for i in args.motion_ids.split(",") if i]
        vids = [i for i in args.video_ids.split(",") if i]
        done = {e["id"] for e in entries}
        M.render_motion(out_dir, [i for i in ids if i in done], [i for i in vids if i in done],
                        frames=args.strip_frames, cell=args.cell, samples=args.samples, fps=args.fps)

    print(f"[animator] done: {len(entries)} animated, {len(failures)} failed, {time.time() - t0:.1f}s")


if __name__ == "__main__":
    main()
