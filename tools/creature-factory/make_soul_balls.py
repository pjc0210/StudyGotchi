"""Four original little-ball soul characters. Headless Blender only.

  /Applications/Blender.app/Contents/MacOS/Blender -b --python tools/creature-factory/make_soul_balls.py

These are StudyGotchi originals (toybox low-poly balls), not ThatMob / Blastnit rips.
"""

from __future__ import annotations

import os
import sys

import bpy
from mathutils import Vector

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
sys.path.insert(0, SCRIPT_DIR)

from generate_creatures import (  # noqa: E402
    Builder,
    MAT_ACCENT,
    MAT_BODY,
    MAT_DARK,
    MAT_SECOND,
    MAT_WHITE,
    add_face,
    export_glb,
    make_material,
    surf,
)

OUT_DIR = os.path.join(REPO_ROOT, "assets", "creatures", "original", "souls")


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()
    for block in (bpy.data.meshes, bpy.data.materials, bpy.data.armatures):
        for item in list(block):
            block.remove(item)


def ball(B: Builder, radius=0.34, squash=0.92):
    scale = (1.05, 1.0, squash)
    center = Vector((0.0, 0.0, radius * squash))
    B.sphere(center, radius, scale=scale, segs=14, rings=10, mat=MAT_BODY, zmin=-0.55)
    return center, radius, scale


def make_verity():
    B = Builder(personality="curious")
    c, r, scale = ball(B)
    add_face(B, {"eyes": "big", "mouth": "line"}, c, r, scale, eye_low=0.02, eye_spread=0.42)
    tip = surf(c, r, scale, (0.0, 0.15, 1.0), 0.98)
    B.cyl(tip, (0.0, 0.1, 1.0), r * 0.38, r * 0.055, segs=8, mat=MAT_ACCENT)
    B.sphere(tip + Vector((0.0, 0.04, r * 0.40)), r * 0.10, segs=8, rings=6, mat=MAT_SECOND)
    return B


def make_falsity():
    B = Builder(personality="shy")
    c, r, scale = ball(B, squash=0.88)
    add_face(B, {"eyes": "sleepy", "mouth": "line"}, c, r, scale, eye_low=0.04, eye_spread=0.48, draw_mouth=False)
    mask_c = surf(c, r, scale, (0.0, -1.0, 0.12), 0.96)
    B.sphere(mask_c, r * 0.42, scale=(1.15, 0.28, 0.55), segs=10, rings=6, mat=MAT_SECOND)
    B.sphere(surf(c, r, scale, (0.55, -0.2, 0.35), 0.94), r * 0.18, scale=(1.0, 0.7, 0.55), segs=8, rings=5, mat=MAT_ACCENT)
    return B


def make_cruelty():
    B = Builder(personality="grumpy")
    c, r, scale = ball(B, radius=0.32, squash=0.95)
    add_face(B, {"eyes": "dot", "mouth": "line"}, c, r, scale, eye_low=0.10, eye_spread=0.50)
    for sx in (-1, 1):
        fang = surf(c, r, scale, (sx * 0.18, -1.0, -0.28), 0.98)
        B.cone(fang, (0.0, -0.4, -0.9), r * 0.16, r * 0.045, 0.0, segs=6, mat=MAT_WHITE)
    horn = surf(c, r, scale, (0.0, 0.2, 1.0), 0.97)
    B.cone(horn, (0.0, 0.15, 1.0), r * 0.28, r * 0.08, 0.0, segs=6, mat=MAT_DARK)
    return B


def make_lovity():
    B = Builder(personality="bold")
    c, r, scale = ball(B, radius=0.36, squash=0.90)
    add_face(B, {"eyes": "big", "mouth": "line"}, c, r, scale, eye_low=-0.02, eye_spread=0.40)
    for sx in (-1, 1):
        B.sphere(surf(c, r, scale, (sx * 0.62, -0.55, -0.12), 0.96), r * 0.14, scale=(1.1, 0.7, 0.55), segs=8, rings=5, mat=MAT_SECOND)
    bow = surf(c, r, scale, (0.0, 0.1, 1.0), 0.98)
    B.sphere(bow + Vector((-r * 0.12, 0.0, r * 0.02)), r * 0.11, scale=(1.4, 0.6, 0.8), segs=8, rings=5, mat=MAT_ACCENT)
    B.sphere(bow + Vector((r * 0.12, 0.0, r * 0.02)), r * 0.11, scale=(1.4, 0.6, 0.8), segs=8, rings=5, mat=MAT_ACCENT)
    B.sphere(bow, r * 0.06, segs=6, rings=4, mat=MAT_SECOND)
    return B


SOULS = [
    ("verity", make_verity, {"body": "#F4E8D0", "secondary": "#8FC9D8", "accent": "#B9C96F", "dark": "#2B241C", "white": "#FFF8EE"}),
    ("falsity", make_falsity, {"body": "#C9A2E6", "secondary": "#6B4F8A", "accent": "#F2A86F", "dark": "#2B241C", "white": "#FFF8EE"}),
    ("cruelty", make_cruelty, {"body": "#C45C4A", "secondary": "#8A2C12", "accent": "#2B241C", "dark": "#1A1210", "white": "#FFF8EE"}),
    ("lovity", make_lovity, {"body": "#F2A86F", "secondary": "#E88A8A", "accent": "#C9A2E6", "dark": "#2B241C", "white": "#FFF8EE"}),
]


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    written = []
    for name, builder, colors in SOULS:
        clear_scene()
        B = builder()
        B.finalize()
        mats = [make_material(f"{name}-{key}", colors[key]) for key in ("body", "secondary", "accent", "dark", "white")]
        obj = B.to_object(name, mats)
        path = os.path.join(OUT_DIR, f"{name}.glb")
        export_glb(obj, path)
        written.append(path)
        print(f"wrote {path} ({os.path.getsize(path)} bytes)")
    print(f"done {len(written)} souls")


if __name__ == "__main__":
    main()
