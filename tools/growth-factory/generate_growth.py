"""
StudyGotchi growth factory: environment GROWTH heroes (4 stages per biome family, g0 seed -> g3 huge),
CONSTRUCTION states (city tower, medieval keep) and the family-agnostic CATASTROPHE kit (crater,
scorch, comic boom puffs, debris, storm cloud + lightning, rubble, recovery sprout).
Blender 5.2 LTS, headless, fully deterministic (seeded jitter only).

Regenerate everything (GLBs, manifest, contact sheets, renders):

  /Applications/Blender.app/Contents/MacOS/Blender -b --python tools/growth-factory/generate_growth.py

Options after `--`: --families forest,moon  --only boom  --no-render  --no-kit  --no-growth  --cell 320  --samples 16

Conventions (same as the landmark factory, whose Builder / Stage / sheet code is imported read-only):
  * glTF 2.0 binary, +Y up, base on y=0, origin at the base centre, metres, front toward +Z
  * flat baseColorFactor materials only (roughness 0.6), no textures, no extensions, no animation
  * every stage g1..g3 contains a shrunken copy of the previous stage (motif continuity, `motif_of`)
  * budgets: g0 < 300, g1 < 700, g2 < 1200, g3 < 2500 tris; construction < 2500; kit piece < 300
  * target heights: g0 0.4, g1 1.2, g2 2.6, g3 4.5 m (a stage-3 landmark is 1.8 m)
"""

import argparse
import datetime as _dt
import json
import math
import os
import random
import sys
import time

import bpy
from mathutils import Vector

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
LANDMARK_DIR = os.path.join(REPO_ROOT, "tools", "landmark-factory")
sys.path.insert(0, LANDMARK_DIR)
import generate_landmarks as lf  # noqa: E402  (read-only reuse: Builder, Stage, compose_sheet, motifs)
import validate_glbs as vg  # noqa: E402

Builder, Stage, compose_sheet = lf.Builder, lf.Stage, lf.compose_sheet
polar, rot_z, rot_x, rot_y, track_z, FRONT, UP = lf.polar, lf.rot_z, lf.rot_x, lf.rot_y, lf.track_z, lf.FRONT, lf.UP
mound, rock, lighthouse_tower, smoke_column, pyramid_roof, gable = (
    lf.mound, lf.rock, lf.lighthouse_tower, lf.smoke_column, lf.pyramid_roof, lf.gable)

FAMILIES = ["forest", "city", "ice", "sand", "meadow", "ocean", "volcanic", "moon", "medieval"]
PALETTE = dict(lf.PALETTE)
PALETTE.update({
    "moon":     {"ground": "#cfd3dc", "accent": "#7d86a3"},
    "medieval": {"ground": "#a7c17e", "accent": "#6b4a3a"},
})
EXTRAS = {"lava": "#f2a86f", "grey": "#b7a58f", "lavender": "#6b5f7a", "bandage": "#fffaf3", "sprout": "#8fbf6a",
          "concrete": "#cfc8bd", "steel": "#6b5f7a", "gold": "#ffe9a8"}
KIT_PALETTE = {"ground": "#b7a58f", "accent": "#8a7a68"}   # family-agnostic kit: neutral stone
BUDGET = {0: 300, 1: 700, 2: 1200, 3: 2500, "construction": 2500, "kit": 300}
TARGET_H = {0: 0.4, 1: 1.2, 2: 2.6, 3: 4.5}
LANDMARK_S3_H = 1.8
DECOR = {"crater-s", "crater-m", "crater-l", "scorch", "rubble-pile"}
GHOST = "#8d8397"


def colours_for(family):
    c = dict(lf.NEUTRALS)
    c.update(lf.EXTRAS)
    c.update(EXTRAS)
    c.update(PALETTE[family] if family in PALETTE else KIT_PALETTE)
    return c


def tri_count(mesh):
    return sum(len(p.vertices) - 2 for p in mesh.polygons)


# ============================================================================ growth heroes
# ---------------------------------------------------------------- forest: great tree

def forest_g0(B):
    """Sapling in a dirt mound."""
    mound(B, (0, 0), 0.24, 0.45, "wood", "sap-dirt", sxy=(1.0, 0.9))
    B.cyl((0, 0, 0.05), 0.24, 0.04, segs=5, mat="leaf")
    top = Vector((0, 0, 0.29))
    for a, tilt in ((200, 0.5), (330, 0.5), (90, 0.45)):
        B.cone(top, polar(1.0, a, tilt), 0.24, 0.10, 0.0, segs=4, mat="ground", scale=(1.0, 0.35, 1.0))
    B.ico(top + Vector((0, 0, 0.07)), 0.09, "leaf", subdiv=1)


def forest_g1(B):
    """Young tree."""
    B.lathe([(0.17, 0.0), (0.13, 0.35), (0.10, 0.64)], 7, "wood")
    for a in (40, 160, 280):
        B.box(polar(0.16, a, 0.04), (0.16, 0.10, 0.08), "wood", rot=rot_z(a))
    B.ico((0, 0, 0.86), 0.36, "accent", jitter=0.04, seed="yt-a")
    B.ico((0.24, 0.08, 0.72), 0.24, "accent", jitter=0.04, seed="yt-b")
    B.ico((-0.06, -0.08, 1.02), 0.18, "ground")
    with B.at((0.46, -0.28, 0), 0.6):
        forest_g0(B)


def forest_g2(B):
    """Tree with roots."""
    B.lathe([(0.34, 0.0), (0.26, 0.5), (0.20, 1.1), (0.17, 1.55)], 8, "wood")
    for a in (30, 120, 210, 300):
        B.box(polar(0.34, a, 0.07), (0.30, 0.16, 0.14), "wood", rot=rot_z(a))
    B.ico((0, 0, 1.95), 0.70, "accent", jitter=0.04, seed="t2-a")
    B.ico((0.56, 0.16, 1.62), 0.48, "accent", jitter=0.04, seed="t2-b")
    B.ico((-0.54, -0.05, 1.70), 0.45, "accent", jitter=0.04, seed="t2-c")
    B.ico((-0.15, -0.22, 2.24), 0.32, "ground")
    B.door((0, -0.33, 0.14), FRONT, 0.14, 0.26)
    with B.at((0.80, -0.50, 0), 0.5):
        forest_g1(B)


def forest_g3(B):
    """Colossal tree: 4-lobe canopy, roots, motif chain g2 > g1 > g0 at its foot."""
    B.lathe([(0.72, 0.0), (0.56, 0.7), (0.44, 1.7), (0.38, 2.7)], 8, "wood")
    for k in range(6):
        a = 15 + 60 * k
        B.box(polar(0.75, a, 0.14), (0.60, 0.30, 0.28), "wood", rot=rot_z(a))
        B.cone(polar(0.55, a, 0.55), polar(1.0, a, -0.55), 0.8, 0.16, 0.06, segs=5, mat="wood")
    B.ico((0, 0, 3.45), 1.10, "accent", jitter=0.04, seed="t3-a")
    B.ico((0.98, 0.30, 3.00), 0.82, "accent", jitter=0.04, seed="t3-b")
    B.ico((-0.92, -0.10, 3.10), 0.78, "accent", jitter=0.04, seed="t3-c")
    B.ico((0.10, -0.88, 2.85), 0.66, "accent", jitter=0.04, seed="t3-d")
    B.ico((-0.30, -0.40, 3.95), 0.52, "ground")
    B.door((0, -0.70, 0.30), FRONT, 0.28, 0.52)
    B.window((0.35, -0.60, 1.30), (0.5, -0.86, 0), 0.16, 0.20)
    B.window((-0.35, -0.60, 1.70), (-0.5, -0.86, 0), 0.16, 0.20)
    with B.at((1.45, -0.85, 0), 0.45):
        forest_g2(B)


# ---------------------------------------------------------------- ice: glacier / mountain

def ice_g0(B):
    """Icy mound with a snow cap."""
    mound(B, (0, 0), 0.30, 0.9, "accent", "ice-m0", sxy=(1.0, 0.8))
    B.ico((0.0, 0.0, 0.36), 0.15, "snow", scale=(1.0, 1.0, 0.5), jitter=0.05, seed="ice-cap0")
    B.lathe([(0.0, 0.0), (0.09, 0.08), (0.06, 0.30), (0.0, 0.38)], 5, "water", center=(0.30, -0.16, 0.0),
            rot=track_z((0.35, -0.2, 1.0)))


def ice_g1(B):
    """Single peak."""
    B.lathe([(0.60, 0.0), (0.42, 0.5), (0.24, 0.96)], 7, "accent", phase=0.2)
    B.lathe([(0.26, 0.93), (0.13, 1.08), (0.0, 1.2)], 7, "snow", phase=0.2)
    with B.at((0.62, -0.32, 0), 0.6):
        ice_g0(B)


def ice_g2(B):
    """Twin peaks."""
    B.lathe([(1.05, 0.0), (0.78, 0.9), (0.46, 1.9), (0.30, 2.25)], 7, "accent", phase=0.3)
    B.lathe([(0.32, 2.22), (0.15, 2.45), (0.0, 2.6)], 7, "snow", phase=0.3)
    B.lathe([(0.72, 0.0), (0.52, 0.7), (0.28, 1.55)], 7, "accent", center=(0.85, 0.35, 0), phase=0.1)
    B.lathe([(0.30, 1.52), (0.14, 1.72), (0.0, 1.88)], 7, "snow", center=(0.85, 0.35, 0), phase=0.1)
    B.ico((-0.55, -0.55, 0.62), 0.28, "snow", scale=(1.0, 1.0, 0.4), jitter=0.05, seed="ledge2")
    with B.at((-1.05, -0.5, 0), 0.5):
        ice_g1(B)


def ice_g3(B):
    """Massive mountain with snow caps and a front ice cliff."""
    B.lathe([(1.95, 0.0), (1.55, 1.2), (1.05, 2.8), (0.62, 3.95)], 8, "accent", phase=0.2)
    B.lathe([(0.64, 3.9), (0.32, 4.28), (0.0, 4.5)], 8, "snow", phase=0.2)
    B.lathe([(1.15, 0.0), (0.85, 1.1), (0.45, 2.4)], 7, "accent", center=(-1.3, 0.6, 0), phase=0.1)
    B.lathe([(0.47, 2.36), (0.22, 2.62), (0.0, 2.85)], 7, "snow", center=(-1.3, 0.6, 0), phase=0.1)
    # ice cliff: a sheer pale slab embedded in the front face
    B.box((0.15, -1.45, 1.05), (1.5, 0.45, 2.1), "water", rot=rot_x(-16))
    B.box((0.15, -1.45, 2.15), (1.2, 0.32, 0.18), "snow", rot=rot_x(-16))
    for xy, r, s in (((0.9, -0.9), 0.42, "l3a"), ((-0.6, -1.3), 0.36, "l3b"), ((1.4, 0.4), 0.34, "l3c")):
        B.ico((xy[0], xy[1], 1.3 - 0.4 * r), r, "snow", scale=(1.0, 1.0, 0.4), jitter=0.05, seed=s)
    with B.at((1.85, -0.85, 0), 0.45):
        ice_g2(B)


# ---------------------------------------------------------------- meadow: flower field

def flower(B, h, colour, r=0.10, stem_r=0.03, leaves=True):
    B.cyl((0, 0, 0), h, stem_r, segs=5, mat="leaf")
    big = r >= 0.12
    B.sphere((0, 0, h), r, colour, scale=(1.0, 1.0, 0.7), segs=6 if big else 5, rings=3)
    if big:
        B.ico((0, 0, h + r * 0.55), r * 0.4, "gold", subdiv=1)
    if leaves:
        for a in (200, 340):
            B.cone(polar(0.0, a, h * 0.45), polar(0.7, a, 0.45), r * 2.4, r * 0.9, 0.0, segs=4, mat="accent",
                   scale=(1.0, 0.3, 1.0))


def meadow_g0(B):
    """Single flower."""
    mound(B, (0, 0), 0.20, 0.45, "leaf", "flower-mound0")
    with B.at((0, 0, 0.06), 1.0):
        flower(B, 0.27, "peach", r=0.10, stem_r=0.035)


def meadow_g1(B):
    """Flower cluster."""
    mound(B, (0, 0), 0.40, 0.4, "leaf", "flower-mound1")
    spec = ((0.0, 0.0, 1.02, "coral", 0.14), (0.22, -0.16, 0.62, "peach", 0.10), (-0.24, -0.10, 0.72, "lilac", 0.11),
            (0.06, 0.25, 0.55, "peach", 0.09), (-0.10, -0.30, 0.48, "coral", 0.08))
    for x, y, h, c, r in spec:
        with B.at((x, y, 0.05), 1.0):
            flower(B, h, c, r=r, stem_r=0.03 + r * 0.1, leaves=(r >= 0.10))
    with B.at((0.55, -0.35, 0), 0.7):
        meadow_g0(B)


def meadow_g2(B):
    """Flower carpet disc with 12 flowers and one tall bloom."""
    B.cyl((0, 0, 0), 0.10, 1.25, segs=12, mat="leaf")
    B.cyl((0, 0, 0.10), 0.03, 1.10, segs=12, mat="ground")
    rng = random.Random("carpet-12")
    cols = ("peach", "coral", "lilac", "coral", "peach", "lilac")
    for i in range(12):
        a = 30 * i + 15
        rr = 0.62 + 0.35 * ((i * 7) % 3) / 2.0
        h = 0.55 + rng.uniform(0.0, 0.7)
        with B.at(polar(rr, a, 0.12), 1.0):
            flower(B, h, cols[i % 6], r=0.11, stem_r=0.035, leaves=(i % 4 == 0))
    with B.at((0, 0, 0.12), 1.0):
        flower(B, 2.2, "coral", r=0.28, stem_r=0.06)
    with B.at((-0.55, -0.62, 0.12), 0.5):
        meadow_g1(B)


def meadow_g3(B):
    """Giant sunflower over the carpet."""
    B.cyl((0, 0, 0), 0.12, 1.75, segs=12, mat="leaf")
    B.cyl((0, 0, 0.12), 0.03, 1.55, segs=12, mat="ground")
    B.lathe([(0.16, 0.14), (0.13, 1.8), (0.10, 3.45)], 6, "leaf")
    for a, z, L in ((210, 1.3, 1.1), (340, 1.9, 1.0), (120, 0.9, 0.9)):
        B.cone((0, 0, z), polar(0.85, a, 0.45), L, 0.32, 0.0, segs=4, mat="accent", scale=(1.0, 0.25, 1.0))
    hc = Vector((0, -0.12, 3.5))
    B.cone(hc, FRONT, 0.16, 0.66, 0.60, segs=10, mat="gold")
    B.cone(hc + Vector((0, -0.16, 0)), FRONT, 0.06, 0.40, 0.40, segs=10, mat="ink")
    for k in range(10):
        a = 36 * k + 18
        p = hc + Vector((0.58 * math.cos(math.radians(a)), 0.0, 0.58 * math.sin(math.radians(a))))
        d = Vector((math.cos(math.radians(a)), 0.0, math.sin(math.radians(a))))
        B.cone(p, d, 0.42, 0.17, 0.0, segs=4, mat="gold", scale=(1.0, 0.35, 1.0))
    B.ico((0, -0.05, 3.55), 0.24, "leaf", scale=(1.0, 0.6, 1.0), jitter=0.05, seed="sun-calyx")
    rng = random.Random("carpet-g3")
    cols = ("peach", "coral", "lilac")
    for i in range(12):
        a = 30 * i
        rr = 0.95 + 0.45 * ((i * 5) % 3) / 2.0
        h = 0.5 + rng.uniform(0.0, 0.6)
        with B.at(polar(rr, a, 0.14), 1.0):
            flower(B, h, cols[i % 3], r=0.11, stem_r=0.035, leaves=(i % 4 == 0))
    with B.at((0.85, -0.85, 0.14), 0.45):
        meadow_g2(B)


# ---------------------------------------------------------------- city: tower

def city_g0(B):
    """Foundation slab with rebar."""
    B.box((0, 0, 0.11), (1.20, 1.0, 0.22), "stone")
    B.box((0, 0, 0.26), (1.0, 0.8, 0.08), "concrete")
    for x in (-0.35, -0.12, 0.12, 0.35):
        for y in (-0.25, 0.25):
            B.cyl((x, y, 0.28), 0.14, 0.02, segs=4, mat="accent")
    B.box((0.45, -0.38, 0.37), (0.22, 0.22, 0.14), "wood")


def crane(B, z0, h, arm=1.0, mat="accent"):
    B.box((0, 0, z0 + 0.03), (0.30, 0.30, 0.06), "steel")
    B.cyl((0, 0, z0), h, 0.06, segs=4, mat=mat)
    B.box((0, 0, z0 + h + 0.06), (0.18, 0.18, 0.16), "steel")
    B.box((arm * 0.30, 0, z0 + h + 0.02), (arm, 0.08, 0.08), mat)
    B.box((arm * 0.72, 0, z0 + h - 0.14), (0.06, 0.06, 0.30), "ink")
    B.box((arm * 0.72, 0, z0 + h - 0.32), (0.14, 0.14, 0.12), "ink")
    B.box((-arm * 0.22, 0, z0 + h + 0.02), (0.20, 0.10, 0.10), "ink")


def city_g1(B):
    """Two floors on the slab, with a crane."""
    city_g0(B)
    B.box((-0.1, 0.05, 0.62), (0.80, 0.66, 0.66), "cream")
    B.box((-0.1, 0.05, 0.97), (0.84, 0.70, 0.05), "slate")
    for z in (0.50, 0.82):
        for x in (-0.32, -0.10, 0.12):
            B.window((x, -0.28, z), FRONT, 0.10, 0.14)
        B.window((0.30, 0.05, z), (1, 0, 0), 0.10, 0.14)
    B.door((-0.10, -0.28, 0.42), FRONT, 0.14, 0.24, mat="accent")
    with B.at((0.60, -0.10, 0.30), 1.0):
        crane(B, 0.0, 0.85, arm=0.9)


def city_g2(B):
    """Five floors."""
    B.box((0, 0, 0.11), (1.35, 1.10, 0.22), "stone")
    B.box((0, 0, 1.32), (1.0, 0.8, 2.2), "cream")
    B.box((0, 0, 2.44), (1.06, 0.86, 0.06), "slate")
    B.box((0.25, 0.15, 2.55), (0.22, 0.22, 0.16), "ink")
    for i in range(5):
        z = 0.50 + 0.42 * i
        for x in (-0.30, 0.0, 0.30):
            B.window((x, -0.40, z), FRONT, 0.14, 0.20)
        for y in (-0.20, 0.20):
            B.window((0.50, y, z), (1, 0, 0), 0.14, 0.20)
            B.window((-0.50, y, z), (-1, 0, 0), 0.14, 0.20)
    B.door((0, -0.40, 0.40), FRONT, 0.22, 0.36, mat="accent")
    B.box((0, -0.52, 0.62), (0.50, 0.24, 0.05), "accent")
    with B.at((0.95, -0.40, 0), 0.5):
        city_g1(B)


def city_g3(B):
    """Eight-floor tower with spire and lit windows."""
    B.box((0, 0, 0.13), (1.75, 1.45, 0.26), "stone")
    B.box((0, 0, 1.96), (1.25, 1.05, 3.4), "cream")
    B.box((0, 0, 3.69), (1.33, 1.13, 0.08), "slate")
    B.box((0, 0, 3.95), (0.80, 0.70, 0.44), "cream2")
    B.box((0, 0, 4.19), (0.88, 0.78, 0.06), "slate")
    B.cone((0, 0, 4.22), UP, 0.28, 0.28, 0.0, segs=6, mat="accent")
    B.ico((0, 0, 4.48), 0.045, "window", subdiv=1)
    for i in range(8):
        z = 0.62 + 0.41 * i
        for x in (-0.38, 0.0, 0.38):
            B.window((x, -0.525, z), FRONT, 0.15, 0.20)
            B.window((x, 0.525, z), (0, 1, 0), 0.15, 0.20)
        for y in (-0.28, 0.0, 0.28):
            B.window((0.625, y, z), (1, 0, 0), 0.15, 0.20)
            B.window((-0.625, y, z), (-1, 0, 0), 0.15, 0.20)
    B.door((0, -0.525, 0.50), FRONT, 0.28, 0.48, mat="accent")
    B.box((0, -0.68, 0.80), (0.70, 0.32, 0.06), "accent")
    for x in (-0.28, 0.28):
        B.cyl((x, -0.80, 0.26), 0.52, 0.04, segs=5, mat="cream2")
    with B.at((1.20, -0.60, 0), 0.40):
        city_g2(B)


def city_build1(B):
    """Construction 1: slab, scaffold cage, crane (~1.6 m)."""
    city_g0(B)
    x0, y0, w, d, h = -0.1, 0.05, 0.86, 0.72, 1.20
    for sx in (-1, 1):
        for sy in (-1, 1):
            B.box((x0 + sx * w / 2, y0 + sy * d / 2, 0.30 + h / 2), (0.05, 0.05, h), "steel")
    for z in (0.62, 0.98, 1.34, 1.50):
        B.box((x0, y0 - d / 2, z), (w + 0.05, 0.04, 0.04), "steel")
        B.box((x0, y0 + d / 2, z), (w + 0.05, 0.04, 0.04), "steel")
        B.box((x0 - w / 2, y0, z), (0.04, d + 0.05, 0.04), "steel")
        B.box((x0 + w / 2, y0, z), (0.04, d + 0.05, 0.04), "steel")
    for z in (0.64, 1.00):
        B.box((x0, y0 - d / 2 + 0.10, z), (w, 0.18, 0.03), "wood")
    B.box((x0 + 0.1, y0 + 0.1, 0.42), (0.40, 0.30, 0.24), "concrete")
    B.box((x0 - 0.2, y0 - 0.1, 0.80), (0.24, 0.28, 0.52), "concrete")
    with B.at((0.60, -0.10, 0.30), 1.0):
        crane(B, 0.0, 1.30, arm=0.9)


def city_build2(B):
    """Construction 2: half-built concrete frame, 5 storeys tall (~2.8 m)."""
    B.box((0, 0, 0.11), (1.35, 1.10, 0.22), "stone")
    for i in range(5):
        z = 0.22 + 0.44 * i
        B.box((0, 0, z + 0.04), (1.0, 0.8, 0.08), "concrete")
        for sx in (-1, 1):
            for sy in (-1, 1):
                B.box((sx * 0.45, sy * 0.35, z + 0.26), (0.08, 0.08, 0.44), "concrete")
        B.box((0, 0, z + 0.26), (0.08, 0.08, 0.44), "concrete")
    B.box((-0.25, 0, 0.66), (0.48, 0.78, 0.80), "cream")
    for z in (0.50, 0.82):
        for x in (-0.38, -0.12):
            B.window((x, -0.40, z), FRONT, 0.12, 0.18)
    B.box((0.30, 0.0, 1.10), (0.40, 0.78, 0.88), "cream2")
    B.box((0.55, -0.55, 1.20), (0.05, 0.05, 2.40), "steel")
    B.box((-0.55, -0.55, 1.20), (0.05, 0.05, 2.40), "steel")
    for z in (0.66, 1.10, 1.54, 1.98, 2.36):
        B.box((0, -0.55, z), (1.15, 0.04, 0.04), "steel")
    with B.at((0.85, -0.05, 0.22), 1.0):
        crane(B, 0.0, 2.35, arm=1.2)


# ---------------------------------------------------------------- sand: pyramid

def sand_g0(B):
    """Stone ring with a standing stone."""
    for k in range(8):
        a = 22.5 + 45 * k
        B.box(polar(0.42, a, 0.09), (0.24, 0.18, 0.18), "accent", rot=rot_z(a))
    B.box((0, 0, 0.20), (0.22, 0.16, 0.40), "stone", rot=rot_z(15))
    B.box((0.02, 0.0, 0.40), (0.14, 0.12, 0.04), "gold", rot=rot_z(15))


def sand_g1(B):
    """Small step pyramid."""
    for i, s in enumerate((1.30, 1.02, 0.74, 0.46)):
        B.box((0, 0, 0.15 + 0.30 * i), (s, s, 0.30), "accent" if i % 2 == 0 else "ground")
    for i in range(4):
        B.box((0, -0.65 + 0.14 * i + 0.07, 0.30 * i + 0.075), (0.28, 0.14, 0.15), "straw")
    B.door((0, -0.23, 1.02), FRONT, 0.12, 0.18)
    with B.at((0.95, -0.55, 0), 0.6):
        sand_g0(B)


def sand_g2(B):
    """Pyramid with a golden cap."""
    B.box((0, 0, 0.10), (3.0, 3.0, 0.20), "ground")
    half = 1.40
    B.cone((0, 0, 0.20), UP, 2.40, half * math.sqrt(2.0), 0.0, segs=4, mat="accent", phase=math.pi / 4)
    B.cone((0, 0, 2.02), UP, 0.60, 0.34 * math.sqrt(2.0), 0.0, segs=4, mat="gold", phase=math.pi / 4)
    B.door((0, -1.30, 0.42), FRONT, 0.30, 0.44)
    B.box((0, -1.42, 0.30), (0.50, 0.30, 0.20), "ground")
    with B.at((1.35, -1.15, 0.20), 0.5):
        sand_g1(B)


def sand_g3(B):
    """Great pyramid with an obelisk."""
    B.box((0, 0, 0.12), (5.2, 4.6, 0.24), "ground")
    half = 2.30
    B.cone((0, 0, 0.24), UP, 4.26, half * math.sqrt(2.0), 0.0, segs=4, mat="accent", phase=math.pi / 4)
    B.cone((0, 0, 3.72), UP, 0.78, 0.42 * math.sqrt(2.0), 0.0, segs=4, mat="gold", phase=math.pi / 4)
    B.door((0, -2.18, 0.60), FRONT, 0.44, 0.70)
    B.box((0, -2.30, 0.36), (0.80, 0.40, 0.24), "ground")
    ox, oy = 2.05, -1.55
    B.box((ox, oy, 0.44), (0.62, 0.62, 0.40), "ground")
    B.box((ox, oy, 2.05), (0.36, 0.36, 2.90), "stone")
    B.cone((ox, oy, 3.50), UP, 0.36, 0.18 * math.sqrt(2.0), 0.0, segs=4, mat="gold", phase=math.pi / 4)
    with B.at((-1.95, -1.65, 0.24), 0.42):
        sand_g2(B)


# ---------------------------------------------------------------- ocean: sea stack / lighthouse rock

def ocean_g0(B):
    """Tide rock with a tuft of grass."""
    mound(B, (0, 0), 0.34, 0.72, "stone", "sea-g0", jitter=0.08, sxy=(1.0, 0.85))
    mound(B, (0.30, -0.14), 0.20, 0.7, "stone", "sea-g0-lobe", jitter=0.08, sxy=(1.0, 0.9))
    B.ico((-0.05, 0.02, 0.33), 0.11, "leaf", scale=(1.0, 1.0, 0.6), jitter=0.06, seed="tuft0")


def ocean_g1(B):
    """Sea stack."""
    B.lathe([(0.46, 0.0), (0.52, 0.32), (0.40, 0.82), (0.36, 1.10)], 7, "stone", phase=0.3)
    B.ico((0.02, 0.0, 1.10), 0.34, "leaf", scale=(1.0, 1.0, 0.4), jitter=0.05, seed="stack-grass1")
    B.ring(0.46, 0.66, 0.0, 0.05, 10, "snow")
    with B.at((0.70, -0.42, 0), 0.6):
        ocean_g0(B)


def ocean_g2(B):
    """Sea stack with a lighthouse."""
    B.lathe([(0.75, 0.0), (0.82, 0.4), (0.62, 1.0), (0.52, 1.30)], 8, "stone", phase=0.2)
    B.ring(0.75, 1.0, 0.0, 0.05, 12, "snow")
    B.ico((-0.30, 0.25, 1.28), 0.22, "leaf", scale=(1.0, 1.0, 0.4), jitter=0.05, seed="stack-grass2")
    lighthouse_tower(B, 1.30, "coral", "accent", gallery="ink")
    with B.at((0.95, -0.70, 0), 0.5):
        ocean_g1(B)


def bird(B, p, mat="ink", s=1.0):
    x, y, z = p
    B.ico((x, y, z + 0.05 * s), 0.06 * s, mat, subdiv=1)
    for sx in (-1, 1):
        B.cone((x, y, z + 0.06 * s), (sx * 1.0, 0.15, 0.55), 0.22 * s, 0.05 * s, 0.0, segs=3, mat=mat)


def ocean_g3(B):
    """Tall sea stack, lighthouse on top, birds on the ledges."""
    B.lathe([(1.0, 0.0), (1.12, 0.6), (0.85, 1.7), (0.78, 2.7), (0.62, 3.05)], 8, "stone", phase=0.2)
    B.ring(1.0, 1.35, 0.0, 0.06, 12, "snow")
    B.ico((0.55, -0.55, 1.75), 0.40, "stone", scale=(1.0, 0.9, 0.5), jitter=0.07, seed="ledge3")
    B.ico((-0.45, 0.35, 3.02), 0.28, "leaf", scale=(1.0, 1.0, 0.4), jitter=0.05, seed="stack-grass3")
    lighthouse_tower(B, 3.05, "coral", "accent", gallery="ink")
    bird(B, (0.62, -0.60, 1.93), s=1.2)
    bird(B, (0.28, -0.20, 3.87 + 0.06), s=1.0)   # perched on the gallery rim
    bird(B, (-0.70, 0.10, 0.06), s=1.1)
    with B.at((1.45, -1.05, 0), 0.42):
        ocean_g2(B)


# ---------------------------------------------------------------- volcanic: volcano

def volcanic_g0(B):
    """Steam vent."""
    B.lathe([(0.45, 0.0), (0.32, 0.22), (0.18, 0.30), (0.12, 0.30), (0.12, 0.24), (0.0, 0.24)], 7, "accent", phase=0.3)
    B.cyl((0, 0, 0.24), 0.02, 0.11, segs=7, mat="lava")
    B.cyl((0, 0, 0.26), 0.08, 0.05, segs=5, mat="pale")
    B.ico((0.02, -0.02, 0.33), 0.09, "pale", jitter=0.05, seed="vent0")


def volcanic_g1(B):
    """Cinder cone."""
    B.lathe([(0.95, 0.0), (0.62, 0.7), (0.36, 1.05), (0.28, 1.05), (0.28, 0.92), (0.0, 0.92)], 7, "accent", phase=0.2)
    B.cyl((0, 0, 0.92), 0.03, 0.27, segs=7, mat="lava", phase=0.2)
    B.cyl((0, 0, 0.95), 0.10, 0.06, segs=5, mat="pale")
    B.ico((0.03, -0.03, 1.10), 0.12, "pale", jitter=0.05, seed="cone1")
    with B.at((0.95, -0.55, 0), 0.6):
        volcanic_g0(B)


def volcanic_g2(B):
    """Cone with a lava rim and a front lava streak."""
    B.lathe([(1.55, 0.0), (1.05, 1.2), (0.62, 2.1), (0.50, 2.25), (0.44, 2.25), (0.44, 2.05), (0.0, 2.05)], 8,
            "accent", phase=0.2)
    B.ring(0.42, 0.60, 2.22, 2.30, 8, "coral")
    B.cyl((0, 0, 2.05), 0.03, 0.44, segs=8, mat="lava", phase=0.2)
    # lava streak down the front slope (embedded square tube)
    a, b = polar(0.55, 270, 2.2), polar(1.30, 270, 0.30)
    B.cone(a, b - a, (b - a).length, 0.14, 0.18, segs=4, mat="coral")
    B.cyl((0.0, -1.42, 0.0), 0.05, 0.32, segs=7, mat="coral")
    with B.at((0, 0, 2.28), 0.45):
        smoke_column(B, (0, 0, 0), r0=0.06)
    with B.at((1.35, -0.85, 0), 0.5):
        volcanic_g1(B)


def volcanic_g3(B):
    """Big volcano with lava rivers."""
    B.lathe([(2.65, 0.0), (1.95, 1.4), (1.25, 2.9), (0.88, 3.8), (0.72, 3.8), (0.72, 3.5), (0.0, 3.5)], 8,
            "accent", phase=0.2)
    B.ring(0.70, 0.98, 3.76, 3.88, 8, "coral")
    B.cyl((0, 0, 3.50), 0.04, 0.72, segs=8, mat="lava", phase=0.2)
    for ang, w in ((270, 0.22), (205, 0.16), (335, 0.18)):
        a, b = polar(0.82, ang, 3.75), polar(2.25, ang, 0.45)
        B.cone(a, b - a, (b - a).length, w, w * 1.4, segs=4, mat="coral")
        B.cyl(polar(2.55, ang, 0.0), 0.06, 0.48, segs=7, mat="coral")
    B.ico((-1.9, -1.2, 0.5), 0.55, "ink", scale=(1.0, 0.9, 0.7), zmin=-0.7, jitter=0.08, seed="volc-rock",
          facet_mat="coral", facet_every=4)
    with B.at((0, 0, 3.84), 0.85):
        smoke_column(B, (0, 0, 0), r0=0.09)
    with B.at((2.05, -1.35, 0), 0.4):
        volcanic_g2(B)


# ---------------------------------------------------------------- moon: crater dome

def moon_g0(B):
    """Rover."""
    B.box((0, 0, 0.20), (0.50, 0.34, 0.18), "accent")
    B.box((0, 0, 0.11), (0.44, 0.44, 0.06), "ink")
    for sx in (-1, 1):
        for sy in (-1, 1):
            B.cone((sx * 0.16 - 0.04, sy * 0.19, 0.10), (0, 1, 0), 0.08, 0.10, 0.10, segs=8, mat="ink")
    B.box((0.12, 0.0, 0.31), (0.20, 0.26, 0.04), "water")
    B.cyl((-0.14, 0.0, 0.29), 0.10, 0.02, segs=4, mat="ink")
    B.cone((-0.14, 0.0, 0.39), UP, 0.05, 0.09, 0.03, segs=6, mat="snow")


def moon_g1(B):
    """Habitat pod."""
    B.cyl((0, 0, 0), 0.50, 0.62, segs=10, mat="ground")
    B.dome((0, 0, 0.50), 0.62, "snow", subdiv=2)
    B.box((0, -0.55, 0.22), (0.34, 0.36, 0.44), "accent")
    B.door((0, -0.73, 0.20), FRONT, 0.18, 0.28)
    B.ring_windows(0.62, 0.32, (215, 325), 0.12, 0.12)
    B.cyl((0.20, 0.15, 1.02), 0.12, 0.03, segs=4, mat="ink")
    B.ico((0.20, 0.15, 1.15), 0.05, "coral", subdiv=1)
    with B.at((0.85, -0.45, 0), 0.7):
        moon_g0(B)


def moon_g2(B):
    """Dome cluster joined by tubes."""
    B.cyl((0, 0, 0), 1.20, 1.0, segs=10, mat="ground")
    B.dome((0, 0, 1.20), 1.0, "snow", subdiv=2)
    B.cyl((0, 0, 2.18), 0.24, 0.06, segs=5, mat="ink")
    B.cone((0, 0, 2.42), UP, 0.18, 0.22, 0.06, segs=6, mat="accent")
    B.ring_windows(1.0, 0.70, (230, 270, 310), 0.16, 0.18)
    B.door((0, -1.0, 0.24), FRONT, 0.26, 0.40)
    for (x, y), r in (((1.35, 0.35), 0.55), ((-1.25, -0.30), 0.50)):
        B.cyl((x, y, 0), 0.40, r, segs=8, mat="ground")
        B.dome((x, y, 0.40), r, "snow", subdiv=2)
        d = Vector((x, y, 0))
        B.cone((0, 0, 0.30), d, d.length, 0.18, 0.18, segs=6, mat="accent")
    with B.at((0.75, -1.35, 0), 0.5):
        moon_g1(B)


def moon_g3(B):
    """Great observatory dome with antenna mast."""
    B.cyl((0, 0, 0), 0.30, 1.75, segs=12, mat="ground")
    B.cyl((0, 0, 0.30), 1.95, 1.40, segs=12, mat="accent")
    B.dome((0, 0, 2.25), 1.40, "snow", subdiv=2)
    B.box((0, -0.85, 3.10), (0.36, 1.2, 0.80), "ink", rot=rot_x(-42))
    B.cyl((0, 0, 3.60), 0.62, 0.05, segs=5, mat="ink")
    B.cone((0, 0, 4.22), UP, 0.20, 0.34, 0.10, segs=8, mat="ground")
    B.ico((0, 0, 4.44), 0.06, "coral", subdiv=1)
    B.ring_windows(1.40, 1.30, (225, 255, 285, 315), 0.18, 0.26)
    B.door((0, -1.40, 0.62), FRONT, 0.36, 0.60)
    B.box((0, -1.62, 0.36), (0.9, 0.5, 0.12), "ground")
    for sx in (-1, 1):
        B.box((sx * 1.75, 0.3, 0.60), (0.85, 0.06, 0.55), "water", rot=rot_y(sx * 20))
        B.box((sx * 1.75, 0.3, 0.45), (0.08, 0.08, 0.36), "ink")
    with B.at((1.95, -1.55, 0), 0.4):
        moon_g2(B)


# ---------------------------------------------------------------- medieval: keep

def med_tent(B):
    B.box((0, 0, 0.01), (0.80, 0.76, 0.02), "stone")
    B.extrude_xz([(-0.36, 0.02), (0.36, 0.02), (0.0, 0.40)], -0.32, 0.32, "accent")
    B.extrude_xz([(-0.12, 0.02), (0.12, 0.02), (0.0, 0.24)], -0.34, -0.30, "ink")
    B.cyl((0, -0.32, 0.0), 0.42, 0.025, segs=5, mat="wood")
    B.box((0.05, -0.32, 0.39), (0.10, 0.02, 0.06), "coral")


def medieval_g0(B):
    """Camp tent."""
    med_tent(B)


def log_post(B, p, h, r=0.09, mat="wood"):
    B.cyl(p, h, r, segs=5, mat=mat)
    B.cone((p[0], p[1], p[2] + h), UP, r * 1.3, r, 0.0, segs=5, mat=mat)


def medieval_g1(B):
    """Wooden palisade with a gate."""
    B.cyl((0, 0, 0), 0.06, 1.0, segs=12, mat="ground")
    for k in range(12):
        a = 15 + 30 * k
        if a in (255, 285):
            continue
        log_post(B, polar(0.90, a, 0.0), 0.90 + 0.06 * (k % 3))
    for sx in (-1, 1):
        log_post(B, (sx * 0.30, -0.86, 0.0), 1.05, r=0.10)
    B.box((0, -0.86, 1.02), (0.85, 0.12, 0.12), "wood")
    B.door((0, -0.92, 0.35), FRONT, 0.34, 0.60, mat="accent")
    with B.at((0.05, 0.10, 0.06), 0.9):
        med_tent(B)


def crenellate(B, cx, cy, hw, hd, z, n_side, mat, size=0.16):
    for i in range(n_side):
        t = -hw + (2 * hw) * (i + 0.5) / n_side
        B.box((cx + t, cy - hd, z), (size, size, size), mat)
        B.box((cx + t, cy + hd, z), (size, size, size), mat)
    for i in range(1, n_side - 1):
        t = -hd + (2 * hd) * (i + 0.5) / n_side
        B.box((cx - hw, cy + t, z), (size, size, size), mat)
        B.box((cx + hw, cy + t, z), (size, size, size), mat)


def medieval_g2(B):
    """Stone keep."""
    B.box((0, 0, 0.10), (1.9, 1.7, 0.20), "stone")
    B.box((0, 0, 1.15), (1.30, 1.10, 1.90), "grey")
    B.box((0, 0, 2.14), (1.42, 1.22, 0.10), "stone")
    crenellate(B, 0, 0, 0.64, 0.54, 2.27, 4, "grey", size=0.16)
    B.cyl((0, 0, 2.18), 0.42, 0.025, segs=4, mat="wood")
    B.box((0.09, 0, 2.55), (0.16, 0.02, 0.10), "coral")
    B.door((0, -0.55, 0.42), FRONT, 0.26, 0.44)
    B.box((0, -0.62, 0.72), (0.40, 0.08, 0.10), "wood")
    for z in (1.0, 1.6):
        B.window((-0.32, -0.55, z), FRONT, 0.10, 0.20)
        B.window((0.32, -0.55, z), FRONT, 0.10, 0.20)
    B.window((0.65, 0.0, 1.3), (1, 0, 0), 0.10, 0.20)
    with B.at((1.20, -0.70, 0), 0.45):
        medieval_g1(B)


def medieval_g3(B):
    """Castle: curtain wall, four towers, tall keep."""
    B.box((0, 0, 0.12), (4.4, 4.0, 0.24), "stone")
    hw, hd = 1.55, 1.40
    for sx in (-1, 1):
        B.box((sx * hw, 0, 0.95), (0.30, 2 * hd, 1.45), "grey")
        B.box((0, sx * hd, 0.95), (2 * hw, 0.30, 1.45), "grey")
    crenellate(B, 0, 0, hw, hd, 1.75, 5, "grey", size=0.20)
    for sx in (-1, 1):
        for sy in (-1, 1):
            B.cyl((sx * hw, sy * hd, 0.24), 2.30, 0.48, segs=8, mat="stone")
            B.cyl((sx * hw, sy * hd, 2.54), 0.08, 0.54, segs=8, mat="grey")
            B.cone((sx * hw, sy * hd, 2.62), UP, 0.80, 0.54, 0.0, segs=8, mat="accent")
            B.window((sx * hw, sy * hd - sy * 0.48, 1.60), (0, sy, 0), 0.12, 0.24)
    B.box((0, -hd - 0.10, 0.90), (1.0, 0.50, 1.35), "grey")
    B.door((0, -hd - 0.35, 0.60), FRONT, 0.46, 0.76)
    B.box((0, 0, 2.0), (1.5, 1.4, 3.5), "grey")
    B.box((0, 0, 3.78), (1.62, 1.52, 0.10), "stone")
    crenellate(B, 0, 0, 0.74, 0.69, 3.92, 4, "grey", size=0.18)
    B.box((0, 0, 4.0), (0.9, 0.85, 0.30), "stone")
    pyramid_roof(B, (0, 0, 4.15), 0.42, 0.28, "accent")
    B.cyl((0, 0, 4.36), 0.16, 0.03, segs=4, mat="wood")
    B.box((0.10, 0, 4.50), (0.20, 0.02, 0.12), "coral")
    for z in (2.3, 3.2):
        B.window((-0.35, -0.70, z), FRONT, 0.14, 0.26)
        B.window((0.35, -0.70, z), FRONT, 0.14, 0.26)
        B.window((0.75, 0.0, z), (1, 0, 0), 0.14, 0.26)
    with B.at((-2.55, -1.75, 0), 0.4):
        medieval_g2(B)


def treadwheel_crane(B, z0, h=1.6):
    B.box((0, 0, z0 + 0.05), (0.5, 0.5, 0.10), "wood")
    B.cyl((0, 0, z0), h, 0.07, segs=5, mat="wood")
    B.box((0.45, 0, z0 + h), (1.3, 0.10, 0.10), "wood")
    B.box((-0.25, 0, z0 + h - 0.25), (0.06, 0.06, 0.55), "wood")
    B.cone((-0.25, -0.12, z0 + h * 0.55), (0, 1, 0), 0.24, 0.32, 0.32, segs=8, mat="straw")
    B.box((0.95, 0, z0 + h - 0.22), (0.06, 0.06, 0.48), "ink")
    B.box((0.95, 0, z0 + h - 0.54), (0.26, 0.26, 0.22), "grey")


def medieval_build1(B):
    """Construction 1: cleared footing, wooden scaffold, treadwheel crane, camp tent (~1.9 m)."""
    B.box((0, 0, 0.10), (1.9, 1.7, 0.20), "stone")
    B.box((0, 0, 0.32), (1.30, 1.10, 0.24), "grey")
    for sx in (-1, 1):
        for sy in (-1, 1):
            B.box((sx * 0.72, sy * 0.62, 0.20 + 0.75), (0.07, 0.07, 1.50), "wood")
    for z in (0.75, 1.25, 1.65):
        B.box((0, -0.62, z), (1.50, 0.06, 0.06), "wood")
        B.box((0, 0.62, z), (1.50, 0.06, 0.06), "wood")
        B.box((-0.72, 0, z), (0.06, 1.30, 0.06), "wood")
        B.box((0.72, 0, z), (0.06, 1.30, 0.06), "wood")
    B.box((0, -0.55, 0.78), (1.40, 0.22, 0.04), "straw")
    with B.at((1.15, -0.55, 0.20), 1.0):
        treadwheel_crane(B, 0.0, h=1.4)
    with B.at((-0.95, -0.72, 0), 0.8):
        med_tent(B)


def medieval_build2(B):
    """Construction 2: half-built stone keep with a jagged top, scaffold and crane (~2.4 m)."""
    B.box((0, 0, 0.10), (1.9, 1.7, 0.20), "stone")
    B.box((0, 0, 0.70), (1.30, 1.10, 1.00), "grey")
    B.box((-0.40, 0, 1.45), (0.50, 1.10, 0.50), "grey")
    B.box((0.20, -0.35, 1.35), (0.70, 0.40, 0.30), "grey")
    B.box((0.30, 0.30, 1.30), (0.40, 0.40, 0.20), "grey")
    B.door((0, -0.55, 0.42), FRONT, 0.26, 0.44)
    B.window((-0.32, -0.55, 1.0), FRONT, 0.10, 0.20)
    for sx in (-1, 1):
        B.box((sx * 0.75, -0.65, 0.20 + 1.10), (0.07, 0.07, 2.20), "wood")
        B.box((sx * 0.75, 0.65, 0.20 + 1.10), (0.07, 0.07, 2.20), "wood")
    for z in (1.0, 1.6, 2.2):
        B.box((0, -0.65, z), (1.55, 0.06, 0.06), "wood")
        B.box((-0.75, 0, z), (0.06, 1.36, 0.06), "wood")
    B.box((0, -0.58, 1.62), (1.45, 0.20, 0.04), "straw")
    with B.at((1.20, -0.55, 0.20), 1.0):
        treadwheel_crane(B, 0.0, h=2.0)
    with B.at((-1.15, -0.85, 0), 0.7):
        med_tent(B)


GROWTH = {
    "forest":   ((forest_g0, "sapling"), (forest_g1, "young tree"), (forest_g2, "tree with roots"),
                 (forest_g3, "colossal tree")),
    "city":     ((city_g0, "foundation slab"), (city_g1, "two floors + crane"), (city_g2, "five-floor block"),
                 (city_g3, "eight-floor tower with spire")),
    "ice":      ((ice_g0, "icy mound"), (ice_g1, "peak"), (ice_g2, "twin peaks"),
                 (ice_g3, "massive mountain with ice cliff")),
    "sand":     ((sand_g0, "stone ring"), (sand_g1, "small step pyramid"), (sand_g2, "pyramid"),
                 (sand_g3, "great pyramid with obelisk")),
    "meadow":   ((meadow_g0, "single flower"), (meadow_g1, "flower cluster"), (meadow_g2, "flower carpet"),
                 (meadow_g3, "giant sunflower over a carpet")),
    "ocean":    ((ocean_g0, "tide rock"), (ocean_g1, "sea stack"), (ocean_g2, "sea stack with lighthouse"),
                 (ocean_g3, "tall sea stack, lighthouse, birds")),
    "volcanic": ((volcanic_g0, "steam vent"), (volcanic_g1, "cinder cone"), (volcanic_g2, "cone with lava rim"),
                 (volcanic_g3, "big volcano with lava rivers")),
    "moon":     ((moon_g0, "rover"), (moon_g1, "habitat pod"), (moon_g2, "dome cluster"),
                 (moon_g3, "great observatory dome with antenna")),
    "medieval": ((medieval_g0, "camp tent"), (medieval_g1, "wooden palisade"), (medieval_g2, "stone keep"),
                 (medieval_g3, "castle with four towers")),
}
CONSTRUCTION = {
    "city": (("build-1", city_build1, "scaffold cage + crane on the slab", "city-g1"),
             ("build-2", city_build2, "half-built concrete frame + crane", "city-g2")),
    "medieval": (("build-1", medieval_build1, "wooden scaffold + treadwheel crane", "medieval-g1"),
                 ("build-2", medieval_build2, "half-built stone keep + scaffold", "medieval-g2")),
}


# ============================================================================ catastrophe kit
# Family-agnostic (neutral stone) plus tinted crater / scorch per family. All opaque, one silhouette.

def crater(B, r):
    """Disc with a raised rim and cracked-earth wedges around it."""
    B.cyl((0, 0, 0), 0.03, r, segs=10, mat="ink")
    B.lathe([(r * 0.62, 0.0), (r * 0.70, 0.02), (r * 0.86, 0.16 * r), (r * 1.0, 0.16 * r), (r * 1.15, 0.03), (r * 1.15, 0.0)],
            10, "ground", phase=0.1)
    rng = random.Random(f"crater-{r}")
    for k in range(6):
        a = 60 * k + rng.uniform(-10, 10)
        r0, r1 = r * 1.05, r * (1.35 + rng.uniform(0.0, 0.25))
        w0, w1 = 6, 22 + rng.uniform(0, 10)
        pts = [polar(r0, a - w0)[:2], polar(r1, a - w1)[:2], polar(r1 * 1.02, a + w1 * 0.4)[:2], polar(r0, a + w0)[:2]]
        B.prism(pts, 0.0, 0.04 + 0.03 * (k % 2), "accent")
    B.ico((r * 0.25, -r * 0.15, 0.06 * r), r * 0.18, "ground", scale=(1.0, 0.9, 0.6), jitter=0.08, seed="crater-rock",
          subdiv=1)


def scorch(B):
    """Dark decal disc with an irregular edge."""
    rng = random.Random("scorch")
    pts = [polar(0.55 + rng.uniform(-0.12, 0.10), a)[:2] for a in range(0, 360, 20)]
    B.prism(pts, 0.0, 0.03, "ink")
    pts2 = [polar(0.32 + rng.uniform(-0.06, 0.06), a)[:2] for a in range(0, 360, 30)]
    B.prism(pts2, 0.0, 0.055, "lavender")
    for a in (40, 170, 290):
        B.prism([polar(0.36, a - 6)[:2], polar(0.78, a - 3)[:2], polar(0.80, a + 3)[:2], polar(0.36, a + 6)[:2]], 0.0, 0.03, "ink")


def puff(B, p, r, mat, seed, flat=False):
    if flat:
        cz = p[2] + r * 0.6
        B.ico((p[0], p[1], cz), r, mat, scale=(1.0, 1.0, 1.0), zmin=-r * 0.6, jitter=0.06, seed=seed, subdiv=1)
    else:
        B.ico(p, r, mat, jitter=0.07, seed=seed, subdiv=1)


def boom_1(B):
    """Small comic explosion (frame 1)."""
    puff(B, (0, 0, 0.0), 0.28, "cream", "b1-core", flat=True)
    puff(B, (0.22, -0.10, 0.34), 0.20, "coral", "b1-a")
    puff(B, (-0.22, 0.05, 0.36), 0.18, "grey", "b1-b")
    puff(B, (0.02, 0.10, 0.52), 0.18, "cream", "b1-c")
    puff(B, (0.05, -0.24, 0.20), 0.14, "coral", "b1-d")
    B.cone((0, 0, 0.55), UP, 0.22, 0.10, 0.0, segs=4, mat="gold")


def boom_2(B):
    """Big comic explosion (frame 2), ~1.4 m."""
    puff(B, (0, 0, 0.0), 0.50, "coral", "b2-core", flat=True)
    puff(B, (0.42, -0.20, 0.55), 0.36, "cream", "b2-a")
    puff(B, (-0.45, 0.10, 0.60), 0.34, "cream", "b2-b")
    puff(B, (0.05, 0.30, 0.85), 0.34, "coral", "b2-c")
    puff(B, (0.02, -0.40, 0.80), 0.30, "grey", "b2-d")
    puff(B, (0.0, 0.0, 1.10), 0.30, "cream", "b2-e")
    puff(B, (-0.30, -0.28, 0.25), 0.26, "grey", "b2-f")
    for a, tilt in ((90, 1.0), (30, 0.5), (150, 0.5), (270, 0.4)):
        B.cone((0, 0, 0.95), polar(1.0, a, tilt), 0.50, 0.12, 0.0, segs=4, mat="gold")


def boom_3(B):
    """Dissipating smoke (frame 3): flatter, greyer, drifting up."""
    puff(B, (0, 0, 0.0), 0.34, "grey", "b3-core", flat=True)
    puff(B, (0.34, -0.14, 0.40), 0.28, "grey", "b3-a")
    puff(B, (-0.36, 0.10, 0.48), 0.26, "pale", "b3-b")
    puff(B, (0.10, 0.20, 0.78), 0.26, "pale", "b3-c")
    puff(B, (-0.12, -0.22, 0.95), 0.22, "grey", "b3-d")
    puff(B, (0.18, 0.05, 1.12), 0.18, "pale", "b3-e")
    puff(B, (-0.02, 0.10, 1.28), 0.13, "pale", "b3-f")


def debris(B, k):
    rng = random.Random(f"debris-{k}")
    if k == 1:
        B.ico((0, 0, 0.16), 0.24, "ground", scale=(1.0, 0.8, 0.7), zmin=-0.7, jitter=0.10, seed="deb1", subdiv=1)
        B.box((0.10, -0.04, 0.30), (0.16, 0.14, 0.14), "accent", rot=rot_z(25))
    elif k == 2:
        B.prism([(-0.22, -0.16), (0.26, -0.12), (0.20, 0.18), (-0.14, 0.14)], 0.0, 0.16, "accent")
        B.prism([(-0.10, -0.08), (0.14, -0.06), (0.10, 0.10), (-0.06, 0.08)], 0.16, 0.30, "ground")
    else:
        B.lathe([(0.0, 0.0), (0.20, 0.06), (0.12, 0.30), (0.0, 0.42)], 5, "ground", rot=track_z((0.4, -0.2, 1.0)))
        B.ico((0.12, 0.08, 0.10), 0.14, "accent", scale=(1.0, 0.9, 0.7), zmin=-0.7, jitter=0.08, seed=f"deb3-{rng.random():.2f}", subdiv=1)


def storm_cloud(B):
    """Flat-bottomed puff cluster, dark lavender."""
    for p, r, s in (((0.0, 0.0, 0.0), 0.36, "sc-a"), ((0.42, -0.06, 0.0), 0.28, "sc-b"), ((-0.42, 0.04, 0.0), 0.26, "sc-c"),
                    ((0.08, 0.10, 0.34), 0.30, "sc-d"), ((-0.20, -0.12, 0.30), 0.22, "sc-e")):
        puff(B, p, r, "lavender", s, flat=(p[2] == 0.0))
    B.box((0, 0, 0.03), (1.0, 0.5, 0.06), "lavender")


def lightning_bolt(B):
    """Zig-zag bolt, tip on the ground."""
    pts = [(0.0, 0.0), (0.16, 0.34), (0.06, 0.36), (0.26, 0.72), (0.12, 0.74), (0.32, 1.10),
           (0.10, 1.10), (-0.04, 0.78), (0.08, 0.76), (-0.10, 0.40), (0.02, 0.38)]
    B.extrude_xz([(x - 0.11, z) for x, z in pts], -0.06, 0.06, "gold")
    # impact flash under the tip: spans the bolt's footprint so the origin sits at the bbox centre
    B.prism([(-0.21, -0.04), (0.0, -0.10), (0.21, -0.04), (0.16, 0.06), (0.0, 0.10), (-0.16, 0.06)], 0.0, 0.03, "gold")


def rubble_pile(B):
    mound(B, (0, 0), 0.45, 0.5, "ground", "rubble-mound", sxy=(1.0, 0.85))
    rng = random.Random("rubble")
    for k in range(7):
        a = 51 * k
        rr = 0.12 + 0.22 * ((k * 3) % 4) / 3
        z = lf.mound_z((rr * math.cos(math.radians(a)), rr * math.sin(math.radians(a))), 0.45, 0.5, (1.0, 0.85)) - 0.04
        s = 0.10 + rng.uniform(0.0, 0.08)
        B.box(polar(rr, a, z), (s * 1.4, s, s), "accent" if k % 2 else "ink", rot=rot_z(a + rng.uniform(0, 40)))
    B.box((0.02, -0.05, 0.42), (0.16, 0.14, 0.20), "accent", rot=rot_z(30))


def recovery_sprout(B):
    """Bright green sprout with a white bandage band: the topic is healing."""
    mound(B, (0, 0), 0.24, 0.45, "wood", "sprout-dirt")
    B.cyl((0, 0, 0.05), 0.34, 0.05, segs=6, mat="sprout")
    B.cyl((0, 0, 0.18), 0.09, 0.062, segs=6, mat="bandage")
    B.box((0.055, 0.0, 0.225), (0.03, 0.05, 0.04), "coral")
    top = Vector((0, 0, 0.39))
    for a, tilt in ((210, 0.45), (330, 0.45)):
        B.cone(top, polar(1.0, a, tilt), 0.30, 0.13, 0.0, segs=4, mat="sprout", scale=(1.0, 0.35, 1.0))
    B.ico(top + Vector((0, 0, 0.08)), 0.10, "leaf", subdiv=1)


KIT = [
    ("crater-s", lambda B: crater(B, 0.30), "small impact crater", ("decor",)),
    ("crater-m", lambda B: crater(B, 0.50), "medium impact crater", ("decor",)),
    ("crater-l", lambda B: crater(B, 0.80), "large impact crater", ("decor",)),
    ("scorch", scorch, "scorch decal disc", ("decor",)),
    ("boom-1", boom_1, "comic explosion, frame 1 (small)", ()),
    ("boom-2", boom_2, "comic explosion, frame 2 (big)", ()),
    ("boom-3", boom_3, "comic explosion, frame 3 (dissipating)", ()),
    ("debris-1", lambda B: debris(B, 1), "chunky shard 1", ()),
    ("debris-2", lambda B: debris(B, 2), "chunky shard 2", ()),
    ("debris-3", lambda B: debris(B, 3), "chunky shard 3", ()),
    ("storm-cloud", storm_cloud, "flat-bottomed storm cloud", ()),
    ("lightning-bolt", lightning_bolt, "zig-zag lightning bolt (separate piece)", ()),
    ("rubble-pile", rubble_pile, "rubble pile", ("decor",)),
    ("recovery-sprout", recovery_sprout, "recovery sprout with bandage", ()),
]
TINTED = ("crater-m", "scorch")   # per-family tinted copies of these kit pieces


# ============================================================================ pipeline

def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    p = argparse.ArgumentParser(prog="generate_growth.py")
    p.add_argument("--out", default="assets/growth")
    p.add_argument("--families", default=",".join(FAMILIES))
    p.add_argument("--only", default="", help="substring filter on asset id")
    p.add_argument("--no-render", action="store_true")
    p.add_argument("--no-export", action="store_true")
    p.add_argument("--no-growth", action="store_true")
    p.add_argument("--no-construction", action="store_true")
    p.add_argument("--no-kit", action="store_true")
    p.add_argument("--cell", type=int, default=320)
    p.add_argument("--samples", type=int, default=16)
    return p.parse_args(argv)


def build_asset(aid, colours, fn):
    B = Builder(colours)
    fn(B)
    height, radius, footprint = B.finalize()
    obj, mats = B.to_object(aid)
    used = {role: B.colours[role] for role in B.roles}
    return obj, mats, used, height, radius, footprint


def world_bbox(obj):
    pts = [obj.matrix_world @ Vector(c) for c in obj.bound_box]
    mn = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    mx = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    return mn, mx


def load_ghost(family):
    """1.8 m scale reference: the family's stage-3 landmark, flat-shaded in one ghost colour (or a stand-in)."""
    path = os.path.join(REPO_ROOT, "assets", "landmarks", family, f"{family}-landmark-s3.glb")
    ghost_mat = lf.make_material("ghost", GHOST, roughness=0.8)
    objs = []
    if os.path.exists(path):
        before = set(bpy.data.objects)
        try:
            bpy.ops.import_scene.gltf(filepath=path)
            objs = [o for o in bpy.data.objects if o not in before]
        except Exception as exc:
            print(f"[growth-factory] ghost import failed for {family}: {exc}")
            objs = []
    meshes = [o for o in objs if o.type == "MESH"]
    if not meshes:
        for o in objs:
            bpy.data.objects.remove(o)
        B = Builder({"ghost": GHOST})
        B.box((0, 0, 0.60), (0.9, 0.8, 1.20), "ghost")
        pyramid_roof(B, (0, 0, 1.20), 0.45, 0.60, "ghost")
        B.finalize()
        obj, mats = B.to_object(f"ghost-{family}")
        meshes = [obj]
        objs = [obj]
    for o in meshes:
        for i in range(len(o.data.materials)):
            o.data.materials[i] = ghost_mat
        if not o.data.materials:
            o.data.materials.append(ghost_mat)
    root = [o for o in objs if o.parent is None]
    return objs, root, ghost_mat


def remove_objs(objs):
    for o in objs:
        data = o.data
        bpy.data.objects.remove(o)
        if data is not None and isinstance(data, bpy.types.Mesh) and data.users == 0:
            bpy.data.meshes.remove(data)


def main():
    t0 = time.time()
    args = parse_args()
    out_dir = args.out if os.path.isabs(args.out) else os.path.join(REPO_ROOT, args.out)
    renders_dir = os.path.join(out_dir, "renders")
    os.makedirs(renders_dir, exist_ok=True)
    families = [f for f in args.families.split(",") if f]

    bpy.ops.wm.read_factory_settings(use_empty=True)
    stage = None if args.no_render else Stage(args.samples, args.cell)
    entries, issues_total = [], 0
    growth_cells, closeup_cells, kit_cells = [], [], []

    def record(aid, family, kind, stage_no, name, fn, rel_dir, budget, target_h=None, tags=(), motif_of=None,
               colours=None):
        nonlocal issues_total
        obj, mats, used, height, radius, footprint = build_asset(aid, colours or colours_for(family), fn)
        tris = tri_count(obj.data)
        glb_path = os.path.join(out_dir, rel_dir, f"{aid}.glb")
        os.makedirs(os.path.dirname(glb_path), exist_ok=True)
        slots = [m.name for m in mats]
        window_slot = next((s for s in slots if s.endswith("-window")), None)
        entry = {
            "id": aid, "family": family, "kind": kind, "stage": stage_no, "name": name,
            "file": os.path.join(args.out, rel_dir, f"{aid}.glb").replace(os.sep, "/"),
            "triangles": tris, "budget": budget, "height": round(height, 3),
            "footprint_radius": round(radius, 3), "footprint": [round(footprint[0], 3), round(footprint[1], 3)],
            "colours": used, "material_slots": slots, "tags": list(tags), "motif_of": motif_of,
            "night": {"window_material": window_slot, "window_color": lf.NEUTRALS["window"]} if window_slot else None,
            "notes": [],
        }
        if target_h is not None:
            entry["target_height"] = target_h
            if abs(height - target_h) > 0.15 * target_h:
                entry["notes"].append(f"height {height:.2f} m deviates from target {target_h} m")
        if tris >= budget:
            entry["notes"].append(f"{tris} triangles >= budget {budget}")
        for note in entry["notes"]:
            print(f"[growth-factory] NOTE {aid}: {note}")
        if not args.no_export:
            lf.export_glb(obj, glb_path)
            entry["bytes"] = os.path.getsize(glb_path)
            info = vg.inspect_glb(glb_path)
            issues = vg.validate(glb_path, budget, info)
            entry["glb_triangles"] = info["triangles"]
            entry["validation"] = "ok" if not issues else issues
            if issues:
                issues_total += 1
                print(f"[growth-factory] VALIDATION {aid}: " + "; ".join(issues))
        print(f"[growth-factory] {aid}: {tris} tris, h={height:.2f} m, r={radius:.2f} m")
        entries.append(entry)
        return obj, mats, entry

    # ---- growth heroes: one row per family, shared camera, 1.8 m ghost landmark for scale
    if not args.no_growth:
        for fam in families:
            built = []
            prev = None
            for g, (fn, name) in enumerate(GROWTH[fam]):
                aid = f"{fam}-g{g}"
                if args.only and args.only not in aid:
                    continue
                obj, mats, entry = record(aid, fam, "growth", g, name, fn, fam, BUDGET[g], TARGET_H[g],
                                          motif_of=prev)
                prev = aid
                obj.hide_render = True
                built.append((obj, mats, entry))
            if not args.no_construction and fam in CONSTRUCTION:
                for suffix, fn, name, motif in CONSTRUCTION[fam]:
                    aid = f"{fam}-{suffix}"
                    if args.only and args.only not in aid:
                        continue
                    obj, mats, entry = record(aid, fam, "construction", None, name, fn, fam, BUDGET["construction"],
                                              motif_of=motif, tags=("construction",))
                    obj.hide_render = True
                    built.append((obj, mats, entry))
            if stage is not None and built:
                ghost_objs, ghost_roots, ghost_mat = load_ghost(fam)
                for o in ghost_objs:
                    o.hide_render = True
                g3 = next((b for b in built if b[2]["kind"] == "growth" and b[2]["stage"] == 3), built[-1])
                r3 = g3[2]["footprint_radius"]
                sep = r3 + 1.0 + 0.5
                h_row = max(g3[2]["height"], LANDMARK_S3_H)
                mn = Vector((-sep / 2 - r3, -max(r3, 1.0), 0.0))
                mx = Vector((sep / 2 + 1.0, max(r3, 1.0), h_row))
                for root in ghost_roots:
                    root.location = (sep / 2, 0.0, 0.0)
                for obj, _, entry in built:
                    obj.hide_render = False
                    for o in ghost_objs:
                        o.hide_render = False
                    obj.location = (-sep / 2, 0.0, 0.0)
                    cell_path = os.path.join(renders_dir, f"{entry['id']}.png")
                    stage.frame(mn, mx, tile=(sep / 2 + max(r3, 1.0) + 0.3, PALETTE[fam]["ground"]))
                    stage.render(f"{entry['id']}  ({entry['height']:.1f} m vs 1.8 m)", cell_path)
                    growth_cells.append(cell_path)
                    entry["render"] = os.path.relpath(cell_path, out_dir).replace(os.sep, "/")
                    for o in ghost_objs:
                        o.hide_render = True
                    obj.location = (0.0, 0.0, 0.0)
                    a, b = world_bbox(obj)
                    close_path = os.path.join(renders_dir, f"{entry['id']}-closeup.png")
                    stage.frame(a, b, tile=(entry["footprint_radius"] * 1.15 + 0.15, PALETTE[fam]["ground"]))
                    stage.render(entry["id"], close_path)
                    closeup_cells.append(close_path)
                    entry["render_closeup"] = os.path.relpath(close_path, out_dir).replace(os.sep, "/")
                    obj.hide_render = True
                remove_objs(ghost_objs)
                bpy.data.materials.remove(ghost_mat)
            for obj, mats, _ in built:
                lf.remove_asset(obj, mats)

    # ---- catastrophe kit
    if not args.no_kit:
        kit_plan = [(name, fn, desc, tags, None) for name, fn, desc, tags in KIT]
        for fam in families:
            for name, fn, desc, tags in KIT:
                if name in TINTED:
                    kit_plan.append((f"{name}-{fam}", fn, f"{desc} ({fam} tint)", tags + ("tinted",), fam))
        for name, fn, desc, tags, fam in kit_plan:
            aid = name
            if args.only and args.only not in aid:
                continue
            rel_dir = os.path.join("catastrophe", "tinted") if fam else "catastrophe"
            obj, mats, entry = record(aid, fam or "any", "catastrophe", None, desc, fn, rel_dir, BUDGET["kit"],
                                      tags=tags, colours=colours_for(fam) if fam else colours_for("kit"))
            if stage is not None and fam is None:
                cell_path = os.path.join(renders_dir, f"{aid}.png")
                mn, mx = world_bbox(obj)
                stage.frame(mn, mx, tile=(entry["footprint_radius"] * 1.15 + 0.12, "#e6d9cf"))
                stage.render(aid, cell_path)
                kit_cells.append(cell_path)
                entry["render"] = os.path.relpath(cell_path, out_dir).replace(os.sep, "/")
            lf.remove_asset(obj, mats)

    manifest = {
        "version": 1,
        "generated_at": _dt.datetime.now().astimezone().isoformat(timespec="seconds"),
        "generator": "tools/growth-factory/generate_growth.py",
        "blender": bpy.app.version_string,
        "deterministic": True,
        "conventions": {
            "up": "+Y (glTF)", "front": "+Z", "ground": "base on y=0, origin at the centre of the contact footprint",
            "units": "metres",
            "kinds": {"growth": "4-stage growth hero g0..g3 (stage = 0..3)",
                      "construction": "build-1 scaffold + crane, build-2 half-built frame (city, medieval)",
                      "catastrophe": "family-agnostic kit piece; tagged 'tinted' copies use a family palette"},
            "stage_bands": {"g0": "0-25 % of the topic demonstrated", "g1": "25-50 %", "g2": "50-75 %",
                            "g3": "75-100 %"},
            "target_heights_m": {f"g{k}": v for k, v in TARGET_H.items()},
            "triangle_budgets": {"g0": BUDGET[0], "g1": BUDGET[1], "g2": BUDGET[2], "g3": BUDGET[3],
                                 "construction": BUDGET["construction"], "catastrophe": BUDGET["kit"]},
            "motif_of": "id of the previous stage whose shrunken copy is embedded in this asset",
            "tags": {"decor": "ground disc / pile: silhouette fill + distinctness not gated",
                     "tinted": "family-palette copy of a kit piece", "construction": "kind=construction"},
            "night": "assets with a 'window' slot list it under night.window_material (swap to emissive #ffe9a8)",
            "materials": "flat Principled BSDF baseColorFactor, roughness 0.6, no textures, no extensions",
            "scale_reference": f"growth-contact-sheet cells show the family's stage-3 landmark ({LANDMARK_S3_H} m) as a grey ghost",
        },
        "palette": PALETTE, "kit_palette": KIT_PALETTE, "neutrals": lf.NEUTRALS, "extras": {**lf.EXTRAS, **EXTRAS},
        "count": len(entries),
        "assets": entries,
    }
    partial = bool(args.only) or args.families != ",".join(FAMILIES) or args.no_growth or args.no_kit or args.no_construction
    if partial:
        manifest["partial"] = True
    manifest_path = os.path.join(out_dir, "manifest.partial.json" if partial else "manifest.json")
    with open(manifest_path, "w") as fh:
        json.dump(manifest, fh, indent=2)

    if stage is not None:
        if growth_cells:
            cols = 4 + max((len(CONSTRUCTION.get(f, ())) for f in families), default=0)
            # rows: families without construction get padding so every row starts at column 0
            padded = []
            i = 0
            for fam in families:
                n = 4 + (len(CONSTRUCTION.get(fam, ())) if not args.no_construction else 0)
                row = growth_cells[i:i + n]
                i += n
                padded.extend(row + [None] * (cols - len(row)))
            blank = os.path.join(renders_dir, "_blank.png")
            stage.frame(Vector((-0.5, -0.5, 0)), Vector((0.5, 0.5, 1.0)), tile=None)
            stage.render("", blank)
            padded = [p or blank for p in padded]
            grid = compose_sheet(padded, os.path.join(out_dir, "growth-contact-sheet.png"), cols, args.cell)
            print(f"[growth-factory] growth sheet {grid} -> {out_dir}/growth-contact-sheet.png")
            padded_c = []
            i = 0
            for fam in families:
                n = 4 + (len(CONSTRUCTION.get(fam, ())) if not args.no_construction else 0)
                row = closeup_cells[i:i + n]
                i += n
                padded_c.extend(row + [blank] * (cols - len(row)))
            grid = compose_sheet(padded_c, os.path.join(out_dir, "growth-contact-sheet-closeup.png"), cols, args.cell)
            print(f"[growth-factory] growth close-up sheet {grid}")
        if kit_cells:
            grid = compose_sheet(kit_cells, os.path.join(out_dir, "catastrophe-contact-sheet.png"), 7, args.cell)
            print(f"[growth-factory] catastrophe sheet {grid} -> {out_dir}/catastrophe-contact-sheet.png")

    def rng_of(kind):
        t = [e["triangles"] for e in entries if e["kind"] == kind]
        return f"{len(t)} {kind} (tris {min(t) if t else 0}..{max(t) if t else 0})"

    notes = sum(len(e["notes"]) for e in entries)
    print(f"[growth-factory] done: {rng_of('growth')}, {rng_of('construction')}, {rng_of('catastrophe')}, "
          f"{issues_total} validation issue(s), {notes} note(s), manifest {manifest_path}, {time.time() - t0:.1f}s")


if __name__ == "__main__":
    main()
