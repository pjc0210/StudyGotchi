"""
Motion sheets and preview videos for the animated creature GLBs.

Everything here is rendered from a RE-IMPORT of the exported GLB (not from the authoring scene), so the strips show
exactly the baked LINEAR samples the runtime will play. Uses the cream 3/4-view EEVEE stage from generate_creatures.py.
"""

import math
import os
import sys
import tempfile

import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import generate_creatures as gc  # noqa: E402  (read-only reuse of the Stage + sheet tiler)

from . import clips as C  # noqa: E402

JUMP_HEADROOM = 0.45  # happy jump 0.35 + stretch


def _import_animated(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    new = [o for o in bpy.data.objects if o not in before]
    return new


def _tracks(objects, clip):
    """NLA tracks the importer created for glTF animation `clip` (one per animated object)."""
    found = []
    for o in objects:
        ad = o.animation_data
        if ad is None:
            continue
        ad.action = None
        for t in ad.nla_tracks:
            hit = t.name == clip or any(s.name == clip or (s.action and s.action.name.split(".")[0] == clip)
                                        for s in t.strips)
            t.mute = not hit
            if hit:
                found.append(t)
    return found


def _strip_span(tracks):
    start = min(s.frame_start for t in tracks for s in t.strips)
    end = max(s.frame_end for t in tracks for s in t.strips)
    return start, end


def _bbox(objects):
    deps = bpy.context.evaluated_depsgraph_get()
    mn = Vector((1e9, 1e9, 1e9))
    mx = Vector((-1e9, -1e9, -1e9))
    for ob in objects:
        if ob.type != "MESH":
            continue
        ev = ob.evaluated_get(deps)
        for c in ev.bound_box:
            p = ev.matrix_world @ Vector(c)
            mn = Vector((min(mn.x, p.x), min(mn.y, p.y), min(mn.z, p.z)))
            mx = Vector((max(mx.x, p.x), max(mx.y, p.y), max(mx.z, p.z)))
    return mn, mx


def _cleanup(objects):
    for o in objects:
        bpy.data.objects.remove(o, do_unlink=True)
    bpy.ops.outliner.orphans_purge(do_local_ids=True, do_linked_ids=True, do_recursive=True)


def render_motion(out_dir, strip_ids, video_ids, frames=8, cell=200, samples=16, fps=30):
    motion_dir = os.path.join(out_dir, "motion")
    os.makedirs(motion_dir, exist_ok=True)
    cells_dir = tempfile.mkdtemp(prefix="motion-cells-")

    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.fps = fps
    scene.render.fps_base = 1.0
    stage = gc.Stage(samples, cell)
    outputs = []

    for cid in sorted(set(strip_ids) | set(video_ids)):
        path = os.path.join(out_dir, f"{cid}.glb")
        if not os.path.exists(path):
            print(f"[animator] motion: missing {path}")
            continue
        objs = _import_animated(path)
        for o in objs:
            if o.animation_data:
                for t in o.animation_data.nla_tracks:
                    t.mute = True
        scene.frame_set(0)
        mn, mx = _bbox(objs)
        mx_head = Vector((mx.x, mx.y, mx.z + JUMP_HEADROOM))
        stage.frame(mn, mx_head)

        if cid in strip_ids:
            for clip in ("walk", "happy"):
                tracks = _tracks(objs, clip)
                if not tracks:
                    print(f"[animator] motion: {cid} has no '{clip}' track after re-import")
                    continue
                f0, f1 = _strip_span(tracks)
                n_frames = C.CLIP_SPEC[clip][0]
                loop = C.CLIP_SPEC[clip][1]
                cells = []
                for i in range(frames):
                    # loops: sample [0, T) so the strip does not end on a duplicate of frame 0; one-shots: [0, T]
                    t = i / frames if loop else i / max(frames - 1, 1)
                    frame = f0 + t * (f1 - f0)
                    scene.frame_set(int(math.floor(frame)), subframe=frame - math.floor(frame))
                    cp = os.path.join(cells_dir, f"{cid}-{clip}-{i}.png")
                    stage.render(f"{cid}  {clip}  {t * n_frames / fps:.2f}s", cp)
                    cells.append(cp)
                out = os.path.join(motion_dir, f"{cid}-{clip}.png")
                gc.compose_sheet(cells, out, cols=frames, cell=cell)
                outputs.append(out)
                print(f"[animator] motion strip -> {out}")

        if cid in video_ids:
            tracks = _tracks(objs, "walk")
            if tracks:
                f0, f1 = _strip_span(tracks)
                for t in tracks:
                    for s in t.strips:
                        s.repeat = 4  # ~3.2 s of hopping available; we render 2.0 s
                out = os.path.join(motion_dir, f"{cid}-walk.mp4")
                ok = _render_video(scene, int(f0), int(f0 + 2 * fps) - 1, out)
                for t in tracks:
                    for s in t.strips:
                        s.repeat = 1
                if ok:
                    outputs.append(out)
                    print(f"[animator] motion video -> {out}")
                stage.scene.render.image_settings.file_format = "PNG"
                stage.scene.render.image_settings.color_mode = "RGB"
        _cleanup(objs)

    return outputs


def _render_video(scene, frame_start, frame_end, out_path):
    """Blender's built-in FFmpeg output when the build has it, else a PNG sequence encoded by a system ffmpeg."""
    import shutil
    import subprocess

    rs = scene.render
    scene.frame_start = frame_start
    scene.frame_end = frame_end
    has_ffmpeg_output = True
    try:
        rs.image_settings.file_format = "FFMPEG"  # dynamic enum: the static item list lies, only assignment tells
    except TypeError:
        has_ffmpeg_output = False
    if has_ffmpeg_output:
        rs.ffmpeg.format = "MPEG4"
        rs.ffmpeg.codec = "H264"
        rs.ffmpeg.constant_rate_factor = "MEDIUM"
        rs.ffmpeg.audio_codec = "NONE"
        rs.filepath = out_path
        rs.use_file_extension = False
        try:
            bpy.ops.render.render(animation=True)
        finally:
            rs.use_file_extension = True
        return os.path.exists(out_path) and os.path.getsize(out_path) > 0

    ffmpeg = shutil.which("ffmpeg") or next((p for p in ("/opt/homebrew/bin/ffmpeg", "/usr/local/bin/ffmpeg")
                                             if os.path.exists(p)), None)
    if ffmpeg is None:
        print(f"[animator] video: this Blender build has no FFMPEG output and no system ffmpeg was found; "
              f"skipping {out_path}")
        return False
    seq_dir = tempfile.mkdtemp(prefix="motion-video-")
    rs.image_settings.file_format = "PNG"
    rs.image_settings.color_mode = "RGB"
    rs.filepath = os.path.join(seq_dir, "frame-")
    bpy.ops.render.render(animation=True)
    cmd = [ffmpeg, "-y", "-loglevel", "error", "-framerate", str(scene.render.fps),
           "-start_number", str(frame_start), "-i", os.path.join(seq_dir, "frame-%04d.png"),
           "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", "-movflags", "+faststart", out_path]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        print(f"[animator] video: ffmpeg failed: {res.stderr.strip()}")
        return False
    print(f"[animator] video: encoded with system ffmpeg ({ffmpeg}); Blender build lacks FFMPEG output")
    return os.path.exists(out_path) and os.path.getsize(out_path) > 0
