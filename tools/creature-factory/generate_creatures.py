"""
StudyGotchi creature factory v2: procedural "toybox low-poly" creatures (Blender 5.2 LTS, headless).

Usage (never disturbs a running GUI session; runs in its own headless process):

  /Applications/Blender.app/Contents/MacOS/Blender -b --python tools/creature-factory/generate_creatures.py -- [options]

Options are parsed after the `--` separator, see `parse_args()` or README.md.

Conventions of the exported GLBs (relied on by the R3F code):
  * glTF +Y up, feet on the ground plane y=0, origin at the feet centre
  * face / front toward +Z   (built toward -Y in Blender; the exporter maps Blender -Y -> glTF +Z)
  * overall height clamped into 0.70..0.90 m, < 1500 triangles (typically 300..1200)
  * flat-shaded, textureless: 2-3 flat body colours + one accent, encoded as glTF material baseColorFactor
  * deterministic: a creature is fully defined by `archetype|biome|seed` (features, colours, personality)

v2 (2026-09-19): rebuilt bean (capsule quadruped on visible legs), bigger biped heads / wider feet, two new
archetypes (`sprite`, `flat`), `ocean` + `volcanic` palettes, saturated accents / darker darks, a per-creature
`personality` (sleepy / bold / curious / grumpy / shy) that biases eyes and pose, a stdlib GLB validator whose
result is recorded per creature in the manifest, and a second contact sheet grouped by archetype.
"""

import argparse
import colorsys
import contextlib
import datetime as _dt
import glob
import json
import math
import os
import random
import struct
import sys
import time

import bpy
import bmesh
from mathutils import Matrix, Vector

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))

VERSION = 2.3
ARCHETYPES = ["blob", "bean", "bird", "biped", "sprite", "flat"]
CATALOG_REL = "assets/biomes/catalog.json"  # v2.3: the biome family catalogue is the single source of palettes
CATALOG_PATH = os.path.join(REPO_ROOT, CATALOG_REL)
# Charter creature accents; the accessory / hero accent rotates through these by seed (v2.2).
CREATURE_ACCENTS = ["#F2A86F", "#E88A8A", "#B9C96F", "#C9A2E6", "#8FC9D8"]  # peach, coral, olive, lilac, mint
ACCENT_SHADES = (1.0, 0.78, 0.62)  # HSV value ladder tried after the charter tones when the body is pastel too
CONTRAST_MIN_RATIO = 1.4    # WCAG-style luminance contrast ratio
CONTRAST_MIN_HUE = 25.0     # degrees, OR ...
CONTRAST_MIN_LIGHT = 0.18   # ... HSL lightness difference
HEAD_SCALE = {"default": (1.15, 1.5), "biped": (1.35, 1.5), "flat": (1.2, 1.5)}

# v2.1 silhouette-connectivity rules (QA gate: 1 connected component at 96 px and 48 px). Every connector
# (stem, leg, whisker, tail root) is at least this thick and overlaps its parent by at least MIN_OVERLAP.
MIN_CONNECTOR = 0.045
MIN_OVERLAP = 0.02
ORIGIN_FRAC = 0.18  # origin stays within this fraction of the footprint of the bbox centre (QA limit: 0.25)


def thick(radius):
    """Radius floor for connectors (MIN_CONNECTOR is a diameter)."""
    return max(radius, MIN_CONNECTOR / 2.0)


PERSONALITIES = ["sleepy", "bold", "curious", "grumpy", "shy"]

# ----------------------------------------------------------------------------- colours / materials

DARK_VALUE = 0.85         # v2: eye / leg / brow tone ~15% darker so dot eyes still read at 48 px


def _hex_to_rgb01(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4))


def _rgb01_to_hex(rgb):
    return "#" + "".join(f"{max(0, min(255, round(c * 255))):02X}" for c in rgb)


def hsv_adjust(hexcolor, sat=1.0, val=1.0):
    h, s, v = colorsys.rgb_to_hsv(*_hex_to_rgb01(hexcolor))
    return _rgb01_to_hex(colorsys.hsv_to_rgb(h, min(1.0, s * sat), min(1.0, v * val)))


def srgb_to_linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def rel_luminance(hexcolor):
    r, g, b = (srgb_to_linear(c) for c in _hex_to_rgb01(hexcolor))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast_ratio(a, b):
    la, lb = rel_luminance(a), rel_luminance(b)
    return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)


def hsl_of(hexcolor):
    h, l, s = colorsys.rgb_to_hls(*_hex_to_rgb01(hexcolor))
    return h * 360.0, s, l


def hue_distance(a, b):
    """Degrees between hues; near-grey colours (saturation < 0.08) have no hue and count as fully distinct."""
    ha, sa, _ = hsl_of(a)
    hb, sb, _ = hsl_of(b)
    if sa < 0.08 or sb < 0.08:
        return 180.0
    d = abs(ha - hb) % 360.0
    return min(d, 360.0 - d)


def contrast_info(color, against):
    ratio = contrast_ratio(color, against)
    hue = hue_distance(color, against)
    dl = abs(hsl_of(color)[2] - hsl_of(against)[2])
    ok = ratio >= CONTRAST_MIN_RATIO and (hue >= CONTRAST_MIN_HUE or dl >= CONTRAST_MIN_LIGHT)
    return {"ratio": round(ratio, 3), "hue_deg": round(hue, 1), "lightness_diff": round(dl, 3), "pass": ok}


def contrast_ok(color, against):
    return contrast_info(color, against)["pass"]


# v2.3: palettes come from the biome family catalogue. `families[].palette.ground` is the ground the body must
# read against, `palette.creature[]` the body palette (the catalogue stores its own contrast ratios; we re-check
# with the full rule and would re-roll at runtime), `palette.ink` the family ink, `creature_archetype_weights`
# the archetype mix for the per-family random extras. `secondary` (patches / ears / paws) and `dark` (eyes /
# legs / brows) are not in the catalogue yet: the seven shipped families keep their v2 constants so their
# output stays identical, planned families use pale creams and the catalogue ink.
_FAMILY_SECONDARY = {
    "forest": ["#F2E3C6", "#A9744F", "#C9E4A5"], "city": ["#FBF1DC", "#F7E7C6", "#FFD1E3"],
    "ice": ["#F4F9FB", "#DDF3F0", "#C4E5FA"], "sand": ["#FFF3C9", "#EAD2A5", "#F7E8B8"],
    "meadow": ["#EAF5D6", "#E6DDF5", "#FFF0E2"], "ocean": ["#F4FAFC", "#DCEFF5", "#FFE9D6"],
    "volcanic": ["#F7E2D2", "#F2C9B4", "#FFF1E3"],
}
_FAMILY_DARK = {"forest": "#2E2A26", "city": "#3A2E3F", "ice": "#2A3340", "sand": "#3B3226", "meadow": "#33303A",
                "ocean": "#22303D", "volcanic": "#3A2626"}
_GENERIC_SECONDARY = ["#FBF1DC", "#F4F9FB", "#FFE9D6"]


def load_catalog(path=CATALOG_PATH):
    with open(path) as fh:
        return json.load(fh)


def build_palettes(catalog):
    """-> (families in catalogue order, PALETTES, GROUND, STATUS, WEIGHTS)."""
    palettes, ground, status, weights = {}, {}, {}, {}
    ids = []
    for fam in catalog["families"]:
        fid = fam["id"]
        p = fam["palette"]
        ids.append(fid)
        ground[fid] = p["ground"].upper()
        status[fid] = fam.get("status", "planned")
        weights[fid] = fam.get("creature_archetype_weights") or {a: 1.0 for a in ARCHETYPES}
        dark = _FAMILY_DARK.get(fid)
        palettes[fid] = dict(
            ground=ground[fid],
            body=[c["hex"].upper() for c in p["creature"]],
            body_names=[c["name"] for c in p["creature"]],
            catalog_contrast=[c.get("contrast_vs_ground") for c in p["creature"]],
            secondary=list(_FAMILY_SECONDARY.get(fid, _GENERIC_SECONDARY)),
            dark=hsv_adjust(dark, val=DARK_VALUE) if dark else p["ink"].upper(),
            ink=p["ink"].upper(),
            family_accent=p.get("accent", "").upper() or None,
            family_accent_2=(p.get("accent_2") or "").upper() or None,
            display_name=fam.get("display_name", fid),
            aliases=list(fam.get("aliases", [])),
        )
        for c in palettes[fid]["body"]:
            if not contrast_ok(c, ground[fid]):
                print(f"[creature-factory] WARNING catalogue {fid} body {c} fails the full contrast rule against "
                      f"{ground[fid]}; the runtime roll will skip it")
    return ids, palettes, ground, status, weights


CATALOG = load_catalog()
BIOMES, PALETTES, GROUND, FAMILY_STATUS, ARCHETYPE_WEIGHTS = build_palettes(CATALOG)
SHIPPED_FAMILIES = [b for b in BIOMES if FAMILY_STATUS[b] == "shipped"]
PLANNED_FAMILIES = [b for b in BIOMES if FAMILY_STATUS[b] != "shipped"]
EYE_WHITE = "#FAF7F2"
BACKDROP = "#FBF3E4"  # pale cream for renders

MAT_BODY, MAT_SECOND, MAT_ACCENT, MAT_DARK, MAT_WHITE = range(5)
MAT_NAMES = ["body", "secondary", "accent", "dark", "white"]

HEIGHT_MIN, HEIGHT_MAX = 0.70, 0.90
TRI_BUDGET = 1500


def hex_to_linear_rgba(h):
    r, g, b = _hex_to_rgb01(h)
    return (srgb_to_linear(r), srgb_to_linear(g), srgb_to_linear(b), 1.0)


def make_material(name, hexcolor, roughness=0.6):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    rgba = hex_to_linear_rgba(hexcolor)
    bsdf.inputs["Base Color"].default_value = rgba
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = 0.0
    mat.diffuse_color = rgba
    mat.use_backface_culling = True  # exports as single-sided glTF material (closed shells anyway)
    return mat


# ----------------------------------------------------------------------------- geometry helpers

def track(axis, direction, up="Z"):
    """Rotation matrix that maps local `axis` onto `direction` (Blender's track-quat heuristic for the roll)."""
    d = Vector(direction)
    if d.length < 1e-9:
        return Matrix.Identity(4)
    if up == axis:
        up = "Y" if axis != "Y" else "Z"
    return d.normalized().to_track_quat(axis, up).to_matrix().to_4x4()


def track_z(direction):
    return track("Z", direction, "Y")


def frame_z(direction, y_hint=(0.0, -1.0, 0.0)):
    """Rotation whose local Z is `direction` and whose local Y is as close to `y_hint` (default: the front) as
    possible. Deterministic roll, unlike `track_z`, so flat parts (ears, brows, fins) face where we want."""
    z = Vector(direction).normalized()
    x = Vector(y_hint).cross(z)
    if x.length < 1e-6:
        x = Vector((1.0, 0.0, 0.0)).cross(z)
    x.normalize()
    y = z.cross(x)
    return Matrix(((x.x, y.x, z.x, 0.0), (x.y, y.y, z.y, 0.0), (x.z, y.z, z.z, 0.0), (0.0, 0.0, 0.0, 1.0)))


def frame_x(direction, z_hint=(0.0, 0.0, 1.0)):
    """Rotation whose local X is `direction` and whose local Z is as close to `z_hint` (default: up) as possible."""
    x = Vector(direction).normalized()
    y = Vector(z_hint).cross(x)
    if y.length < 1e-6:
        y = Vector((0.0, -1.0, 0.0)).cross(x)
    y.normalize()
    z = x.cross(y)
    return Matrix(((x.x, y.x, z.x, 0.0), (x.y, y.y, z.y, 0.0), (x.z, y.z, z.z, 0.0), (0.0, 0.0, 0.0, 1.0)))


def surf(center, radius, scale, direction, inset=1.0):
    """Point on the ellipsoid (center, radius*scale) in roughly `direction`."""
    d = Vector(direction).normalized()
    return Vector(center) + Vector((d.x * scale[0], d.y * scale[1], d.z * scale[2])) * (radius * inset)


class Builder:
    """Accumulates flat-shaded primitives into a single bmesh, one material index per part.

    Parts created inside `with B.group("head"):` are remembered so the personality pass can rotate them as a
    unit; the dark pupil spheres are remembered in `eyes` so the export can verify the face points at +Z."""

    def __init__(self, personality="curious"):
        self.bm = bmesh.new()
        self.personality = personality
        self.groups = {}
        self._active = []
        self.eyes = []

    # -- internals
    def _xform(self, center, scale=(1, 1, 1), rot=None):
        m = Matrix.Translation(Vector(center))
        if rot is not None:
            m = m @ rot
        return m @ Matrix.Diagonal(Vector((scale[0], scale[1], scale[2], 1.0)))

    def _finish(self, verts, matrix, mat):
        faces = {f for v in verts for f in v.link_faces}
        for f in faces:
            f.material_index = mat
            f.smooth = False
        bmesh.ops.transform(self.bm, matrix=matrix, verts=verts)
        for g in self._active:
            self.groups.setdefault(g, []).extend(verts)
        return verts

    @contextlib.contextmanager
    def group(self, name):
        self._active.append(name)
        try:
            yield
        finally:
            self._active.pop()

    # -- primitives
    def sphere(self, center, radius, scale=(1, 1, 1), segs=12, rings=8, mat=MAT_BODY, rot=None, zmin=None):
        res = bmesh.ops.create_uvsphere(self.bm, u_segments=segs, v_segments=rings, radius=radius)
        verts = res["verts"]
        if zmin is not None:  # flatten the bottom (local units) -> dome / sitting blob
            for v in verts:
                if v.co.z < zmin:
                    v.co.z = zmin
        return self._finish(verts, self._xform(center, scale, rot), mat)

    def ico(self, center, radius, scale=(1, 1, 1), subdiv=2, mat=MAT_BODY, rot=None, zmin=None):
        res = bmesh.ops.create_icosphere(self.bm, subdivisions=subdiv, radius=radius)
        verts = res["verts"]
        if zmin is not None:
            for v in verts:
                if v.co.z < zmin:
                    v.co.z = zmin
        return self._finish(verts, self._xform(center, scale, rot), mat)

    def capsule(self, center, radius, length, axis=(0, 1, 0), segs=12, rings=7, mat=MAT_BODY, taper=1.0,
                scale=(1, 1, 1)):
        """Capsule: UV sphere split at the equator and pulled apart by `length` along `axis`. Use an odd ring
        count so no vertex ring sits exactly on the equator. `taper` scales the cross-section linearly from 1 at
        the -axis end to `taper` at the +axis end (fish / slug bodies)."""
        res = bmesh.ops.create_uvsphere(self.bm, u_segments=segs, v_segments=rings, radius=radius)
        verts = res["verts"]
        half = length / 2.0
        full = 2.0 * (radius + half)
        for v in verts:
            if v.co.z > 1e-6:
                v.co.z += half
            elif v.co.z < -1e-6:
                v.co.z -= half
            if taper != 1.0:
                t = (v.co.z + radius + half) / full
                f = 1.0 + (taper - 1.0) * t
                v.co.x *= f
                v.co.y *= f
        return self._finish(verts, self._xform(center, scale, track_z(Vector(axis))), mat)

    def cone(self, base, direction, length, r1, r2=0.0, segs=6, mat=MAT_ACCENT, scale=(1, 1, 1), rot=None):
        """Cone/cylinder starting at `base`, pointing along `direction`. `rot` overrides the default roll."""
        d = Vector(direction).normalized()
        res = bmesh.ops.create_cone(self.bm, cap_ends=True, cap_tris=False, segments=segs,
                                    radius1=r1, radius2=r2, depth=length)
        center = Vector(base) + d * (length / 2.0)
        r = rot if rot is not None else track_z(d)
        m = Matrix.Translation(center) @ r @ Matrix.Diagonal(Vector((scale[0], scale[1], scale[2], 1.0)))
        return self._finish(res["verts"], m, mat)

    def cyl(self, base, direction, length, r, segs=6, mat=MAT_DARK):
        return self.cone(base, direction, length, r, r, segs=segs, mat=mat)

    def cube(self, center, size, mat=MAT_SECOND, rot=None, bevel=0.0):
        before = set(self.bm.verts)
        res = bmesh.ops.create_cube(self.bm, size=1.0)
        verts = res["verts"]
        if bevel > 0.0:
            edges = list({e for v in verts for e in v.link_edges})
            bmesh.ops.bevel(self.bm, geom=edges, offset=bevel, offset_type="OFFSET", segments=1,
                            profile=0.5, affect="EDGES", clamp_overlap=True)
            verts = [v for v in self.bm.verts if v not in before]
        return self._finish(verts, self._xform(center, tuple(size), rot), mat)

    def torus(self, center, R, r, segs=12, rings=6, mat=MAT_ACCENT, rot=None):
        bm = self.bm
        verts = []
        for i in range(segs):
            a = 2.0 * math.pi * i / segs
            for j in range(rings):
                b = 2.0 * math.pi * j / rings
                x = (R + r * math.cos(b)) * math.cos(a)
                y = (R + r * math.cos(b)) * math.sin(a)
                z = r * math.sin(b)
                verts.append(bm.verts.new((x, y, z)))
        faces = []
        for i in range(segs):
            for j in range(rings):
                v1 = verts[i * rings + j]
                v2 = verts[((i + 1) % segs) * rings + j]
                v3 = verts[((i + 1) % segs) * rings + (j + 1) % rings]
                v4 = verts[i * rings + (j + 1) % rings]
                faces.append(bm.faces.new((v1, v2, v3, v4)))
        bmesh.ops.recalc_face_normals(bm, faces=faces)
        return self._finish(verts, self._xform(center, (1, 1, 1), rot), mat)

    # -- posing (personality pass)
    def rotate_group(self, name, pivot, axis, degrees):
        verts = self.groups.get(name)
        if not verts or abs(degrees) < 1e-6:
            return
        rot = Matrix.Rotation(math.radians(degrees), 3, axis)
        bmesh.ops.rotate(self.bm, cent=Vector(pivot), matrix=rot, verts=verts)

    def shear_all(self, dx_per_z=0.0, dy_per_z=0.0):
        """Lean the whole creature: the ground contact stays put, the top slides sideways/back."""
        for v in self.bm.verts:
            v.co.x += v.co.z * dx_per_z
            v.co.y += v.co.z * dy_per_z

    def yaw_all(self, degrees):
        rot = Matrix.Rotation(math.radians(degrees), 3, "Z")
        bmesh.ops.rotate(self.bm, cent=Vector((0.0, 0.0, 0.0)), matrix=rot, verts=list(self.bm.verts))

    # -- finalisation
    def finalize(self):
        """Feet on z=0, clamp height into range, origin at the feet centre. Returns (height, scale_factor)."""
        bm = self.bm
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        zmin = min(v.co.z for v in bm.verts)
        if zmin > 0.0:
            for v in bm.verts:
                v.co.z -= zmin
        else:  # feet are built on z=0; anything dangling below (scarf ends, resting bellies) is squashed flat
            for v in bm.verts:
                if v.co.z < 0.0:
                    v.co.z = 0.0
        height = max(v.co.z for v in bm.verts)
        s = 1.0
        if height < HEIGHT_MIN:
            s = HEIGHT_MIN / height
        elif height > HEIGHT_MAX:
            s = HEIGHT_MAX / height
        if s != 1.0:
            for v in bm.verts:
                v.co *= s
            height *= s
        contact = [v for v in bm.verts if v.co.z < 0.02]
        if not contact:
            contact = list(bm.verts)
        cx = sum(v.co.x for v in contact) / len(contact)
        cy = sum(v.co.y for v in contact) / len(contact)
        # v2.1: the QA gate wants the origin within 25 % of the footprint of the bounding-box centre; a sitting
        # seal (tail behind, flipper tips in front) pushes the contact centroid too far forward, so clamp it.
        xs = [v.co.x for v in bm.verts]
        ys = [v.co.y for v in bm.verts]
        bx, by = (min(xs) + max(xs)) * 0.5, (min(ys) + max(ys)) * 0.5
        lim_x, lim_y = ORIGIN_FRAC * (max(xs) - min(xs)), ORIGIN_FRAC * (max(ys) - min(ys))
        cx = min(max(cx, bx - lim_x), bx + lim_x)
        cy = min(max(cy, by - lim_y), by + lim_y)
        for v in bm.verts:
            v.co.x -= cx
            v.co.y -= cy
        return height, s

    def eye_centres_gltf(self):
        """Centroid of each pupil in glTF coordinates (x, y=up, z=front)."""
        out = []
        for verts in self.eyes:
            c = sum((v.co for v in verts), Vector()) / max(1, len(verts))
            out.append([round(c.x, 3), round(c.z, 3), round(-c.y, 3)])
        return out

    def to_object(self, name, materials):
        mesh = bpy.data.meshes.new(name)
        self.bm.to_mesh(mesh)
        self.bm.free()
        for m in materials:
            mesh.materials.append(m)
        if hasattr(mesh, "shade_flat"):
            mesh.shade_flat()
        obj = bpy.data.objects.new(name, mesh)
        bpy.context.scene.collection.objects.link(obj)
        return obj


def tri_count(mesh):
    return sum(len(p.vertices) - 2 for p in mesh.polygons)


# ----------------------------------------------------------------------------- feature rolls

SLOT_OPTIONS = {
    "ear":       (["none", "round", "pointy", "long"], [0.35, 0.25, 0.25, 0.15]),
    "tail":      (["none", "nub", "long", "leaf"], [0.30, 0.30, 0.20, 0.20]),
    "crest":     (["none", "tuft", "horn", "antenna"], [0.45, 0.20, 0.15, 0.20]),
    "accessory": (["none", "scarf", "hat", "backpack", "bow"], [0.45, 0.15, 0.15, 0.10, 0.15]),
}
HERO_SLOTS = {
    "blob":   ["ear", "tail", "crest", "accessory"],
    "bean":   ["ear", "tail", "accessory", "crest"],
    "bird":   ["beak", "crest", "tail", "accessory"],
    "biped":  ["ear", "tail", "crest", "accessory"],
    "sprite": ["cap", "cap", "cap", "accessory"],
    "flat":   ["fin", "fin", "crest", "accessory"],
}
HEAD_ACCESSORIES = ("hat", "bow")
BODY_ACCESSORIES = ("scarf", "backpack")


def roll_features(rng, archetype):
    """Slot rolls. The draw order for blob / bird / biped is unchanged from v1 so their ids keep their look;
    archetype-specific rolls are appended at the end of each branch."""
    F = {"hero": rng.choice(HERO_SLOTS[archetype]), "hero_scale": 1.35}
    for slot, (opts, weights) in SLOT_OPTIONS.items():
        if slot == F["hero"]:
            F[slot] = rng.choices(opts[1:], weights=weights[1:])[0]
        else:
            F[slot] = rng.choices(opts, weights=weights)[0]
    F["eyes"] = rng.choices(["dot", "big", "half"], weights=[0.5, 0.3, 0.2])[0]
    F["mouth"] = rng.choices(["none", "line", "beak"], weights=[0.45, 0.40, 0.15])[0]
    F["pattern"] = rng.choices(["none", "belly", "spots"], weights=[0.40, 0.40, 0.20])[0]
    F["body_squash"] = round(rng.uniform(0.85, 1.15), 3)
    F["head_scale"] = round(rng.uniform(0.85, 1.30), 3)

    # archetype flavour
    if archetype == "bird":
        F["mouth"] = "beak"
        F["beak_len"] = round(rng.uniform(0.45, 1.25) * (1.4 if F["hero"] == "beak" else 1.0), 2)
        F["wing_secondary"] = rng.random() < 0.5
        if F["ear"] == "long":
            F["ear"] = "pointy"  # owl horns rather than rabbit ears
    elif archetype == "bean":
        if F["ear"] == "none" and rng.random() < 0.6:
            F["ear"] = "round"   # mice have ears
        if F["mouth"] == "beak":
            F["mouth"] = "none"
        rng.random()             # v2.2: whiskers removed; the draw is kept so later rolls stay identical
        if F["ear"] == "long":
            F["ear"] = "round"   # v2 bean ears are flat facets: round discs or pointy cones only
        F["feet_secondary"] = rng.random() < 0.5
    elif archetype == "blob":
        if F["ear"] != "none" and F["hero"] != "ear" and rng.random() < 0.5:
            F["ear"] = "none"    # keep the dome silhouette clean
        if F["mouth"] == "beak":
            F["mouth"] = "line"
    elif archetype == "biped":
        F["feet_secondary"] = rng.random() < 0.5
    elif archetype == "sprite":
        F["cap"] = rng.choice(["mushroom", "cactus", "sprout", "flower"])
        if F["ear"] != "none" and rng.random() < 0.8:
            F["ear"] = "none"    # the cap is the silhouette
        F["tail"] = "none"
        F["crest"] = "none"
        if F["accessory"] == "hat":
            F["accessory"] = "bow"
        if F["mouth"] == "beak":
            F["mouth"] = "line"
    elif archetype == "flat":
        F["fin"] = rng.choice(["fish", "seal"])
        F["dorsal"] = rng.random() < 0.5
        F["tail"] = "none"
        F["ear"] = "round" if (F["ear"] != "none" and rng.random() < 0.35) else "none"
        if F["mouth"] == "beak":
            F["mouth"] = "none"
        F["feet_secondary"] = rng.random() < 0.5
    return F


HERO_CREST = ("tuft", "horn", "antenna")
HERO_ACCESSORY = ("scarf", "hat", "backpack", "bow")


def normalize_hero(F, archetype, biome, seed):
    """v2.2 'one hero feature': exactly one of {hat, scarf, crest, backpack, bow, cap} per creature (plus at
    most the single body pattern). Applied after the rolls without touching the base RNG; a creature that
    rolled neither gets one from its own seeded stream. Also clamps head_scale into the v2.2 range."""
    lo, hi = HEAD_SCALE.get(archetype, HEAD_SCALE["default"])
    t = (F["head_scale"] - 0.85) / 0.45
    F["head_scale_roll"] = F["head_scale"]
    F["head_scale"] = round(lo + (hi - lo) * t, 3)
    if archetype == "bird":
        F["head_merged"] = F["head_scale_roll"] < 0.98  # kiwi look: face on the body

    if archetype == "sprite":  # the cap is the one feature
        F["crest"] = "none"
        F["accessory"] = "none"
        F["hero"] = "cap"
        return F
    if archetype == "bird" and F["crest"] == "antenna":
        F["crest"] = "tuft"       # review: an antenna doubles a bird's height
    if archetype == "flat":
        F["crest"] = "none"       # review: no crest on flat
        if F["hero"] == "crest":
            F["hero"] = "accessory"
    has_crest = F["crest"] != "none"
    has_acc = F["accessory"] != "none"
    if has_crest and has_acc:  # keep the hero one; if neither is the hero, the accessory is the bigger read
        if F["hero"] == "crest":
            F["accessory"] = "none"
        else:
            F["crest"] = "none"
    elif not has_crest and not has_acc:
        hrng = random.Random(f"{archetype}|{biome}|{seed}|hero")
        options = HERO_ACCESSORY if archetype == "flat" else HERO_ACCESSORY + HERO_CREST
        pick = hrng.choice(options)
        if pick in HERO_CREST:
            F["crest"] = pick
        else:
            F["accessory"] = pick
    if F["hero"] == "accessory" and F["accessory"] == "none":
        F["hero"] = "crest"
    if F["hero"] == "crest" and F["crest"] == "none":
        F["hero"] = "accessory"
    if archetype == "blob":
        F["hat_k_max"] = 1.15      # review: the blob's hero hat cone was taller than the head
    return F


def roll_personality(archetype, biome, seed, F):
    """Personality comes from its own RNG stream so it never shifts the v1 feature rolls. It biases (80%)
    the eye style; the pose bias is applied after the build in `apply_personality`."""
    prng = random.Random(f"{archetype}|{biome}|{seed}|personality")
    P = prng.choice(PERSONALITIES)
    biased = prng.random() < 0.8
    if P == "sleepy" and biased:
        F["eyes"] = "half"
    elif P == "bold" and biased:
        F["eyes"] = "big"
    elif P == "grumpy":
        F["eyes"] = "dot"
        if F["mouth"] != "beak":
            F["mouth"] = "line"
    elif P == "shy" and biased:
        F["eyes"] = "dot"
    return P


def pick_colors(rng, biome):
    """v2.2: body from the biome's creature palette, re-rolled (seeded) until it reads against the ground;
    hero accent rotated through the charter creature accents from a seeded start until it reads against the
    body (fallback: the highest-contrast one). Returns (colors, contrast report)."""
    pal = PALETTES[biome]
    ground = pal["ground"]
    body = rng.choice(pal["body"])
    body_rerolls = 0
    while not contrast_ok(body, ground) and body_rerolls < 20:
        body = rng.choice(pal["body"])
        body_rerolls += 1
    secondary = rng.choice([c for c in pal["secondary"] if c != body] or pal["secondary"])
    start = rng.randrange(len(CREATURE_ACCENTS))
    order = [CREATURE_ACCENTS[(start + i) % len(CREATURE_ACCENTS)] for i in range(len(CREATURE_ACCENTS))]
    accent, accent_base, accent_rerolls = None, None, 0
    # pastel body + pastel accent rarely reaches 1.4, so after the five charter tones the rotation continues
    # through deeper shades of the same five hues (still on-charter, deterministic)
    for shade in ACCENT_SHADES:
        for base in order:
            cand = base if shade == 1.0 else hsv_adjust(base, sat=1.1, val=shade)
            if contrast_ok(cand, body):
                accent, accent_base = cand, base
                break
            accent_rerolls += 1
        if accent is not None:
            break
    if accent is None:  # cannot happen with the shade ladder, kept as a guard
        accent_base = max(CREATURE_ACCENTS, key=lambda c: contrast_ratio(c, body))
        accent = accent_base
    colors = {"body": body, "secondary": secondary, "accent": accent, "dark": pal["dark"], "white": EYE_WHITE}
    report = {
        "contrast_vs_ground": dict(ground=ground, rerolls=body_rerolls, **contrast_info(body, ground)),
        "accent_contrast_vs_body": dict(base=accent_base, rerolls=accent_rerolls, **contrast_info(accent, body)),
    }
    return colors, report


# ----------------------------------------------------------------------------- shared feature builders

def add_face(B, F, center, r, scale, eye_low=-0.06, eye_spread=0.55, draw_mouth=True):
    eyes = F["eyes"]
    for sx in (-1, 1):
        d = Vector((sx * eye_spread, -1.0, eye_low)).normalized()
        p = surf(center, r, scale, d, 0.97)
        if eyes == "dot":
            B.eyes.append(B.sphere(p, r * 0.13, segs=6, rings=4, mat=MAT_DARK))
        elif eyes == "big":
            B.sphere(p, r * 0.20, segs=8, rings=6, mat=MAT_WHITE)
            B.eyes.append(B.sphere(p + d * (r * 0.13), r * 0.11, segs=6, rings=4, mat=MAT_DARK))
        else:  # half-closed / sleepy
            B.eyes.append(B.sphere(p, r * 0.14, scale=(1.15, 1.0, 0.42), segs=6, rings=4, mat=MAT_DARK))
        if B.personality == "grumpy":  # two dark brow facets, inner ends lower
            bd = Vector((sx * eye_spread * 1.05, -1.0, eye_low + 0.36)).normalized()
            bp = surf(center, r, scale, bd, 1.0)
            rot = frame_z(bd) @ Matrix.Rotation(sx * math.radians(22.0), 4, "Z")
            B.cube(bp, (r * 0.28, r * 0.065, r * 0.06), mat=MAT_DARK, rot=rot)
    if not draw_mouth:
        return
    mouth = F["mouth"]
    md = Vector((0.0, -1.0, eye_low - 0.32)).normalized()
    mp = surf(center, r, scale, md, 0.985)
    if mouth == "line":
        B.cube(mp, (r * 0.22, r * 0.05, r * 0.035), mat=MAT_DARK)
    elif mouth == "beak":
        B.cone(mp - md * (r * 0.06), Vector((0, -1.0, -0.3)), r * 0.30, r * 0.11, 0.0, segs=4, mat=MAT_ACCENT)


def add_ears(B, F, center, r, scale, flat=False):
    """`flat=True` (bean): bigger, thinner discs / cones so the ears read as facets. Shy creatures drop the ear
    on the camera side (+X)."""
    style = F["ear"]
    if style == "none":
        return
    k = F["hero_scale"] if F["hero"] == "ear" else 1.0
    for sx in (-1, 1):
        droop = B.personality == "shy" and sx == 1
        d = Vector((sx * 0.95, -0.10, 0.30)).normalized() if droop else Vector((sx * 0.62, -0.08, 0.78)).normalized()
        base = surf(center, r, scale, d, 0.85)
        if style == "round":
            er = r * (0.46 if flat else 0.36) * k
            c = base + d * (er * 0.72)
            up = Vector((sx * 1.0, 0.0, 0.30)) if droop else Vector((sx * 0.35, 0.0, 1.0))
            rot = frame_z(up)
            thick = 0.28 if flat else 0.45
            B.sphere(c, er, scale=(1.0, thick, 1.0), segs=8 if flat else 10, rings=6, mat=MAT_BODY, rot=rot)
            B.sphere(c + Vector((0, -er * thick * 0.55, 0)), er * 0.62, scale=(1.0, thick * 0.9, 1.0), segs=8,
                     rings=5, mat=MAT_SECOND, rot=rot)
        elif style == "pointy":
            L = r * (0.9 if flat else 0.8) * k
            ed = Vector((sx * 1.0, -0.05, 0.35)) if droop else Vector((sx * 0.45, -0.05, 1.0))
            sc = (1.0, 0.45, 1.0) if flat else (1, 1, 1)
            B.cone(base, ed, L, r * 0.32, 0.0, segs=5, mat=MAT_BODY, scale=sc, rot=frame_z(ed) if flat else None)
            B.cone(base + Vector((0, -r * 0.07, 0)), ed, L * 0.6, r * 0.17, 0.0, segs=5, mat=MAT_SECOND, scale=sc,
                   rot=frame_z(ed) if flat else None)
        elif style == "long":
            L = r * 1.5 * k
            d2 = (Vector((sx * 1.0, -0.05, 0.25)) if droop else Vector((sx * 0.32, -0.05, 1.0))).normalized()
            c = base + d2 * (L * 0.45)
            rot = frame_z(d2)
            er = r * 0.20
            B.sphere(c, er, scale=(1.0, 0.65, L / (2 * er)), segs=8, rings=6, mat=MAT_BODY, rot=rot)
            B.sphere(c + Vector((0, -r * 0.09, 0)), er * 0.6, scale=(1.0, 0.5, (L * 0.7) / (2 * er * 0.6)),
                     segs=6, rings=5, mat=MAT_SECOND, rot=rot)


def add_crest(B, F, center, r, scale):
    style = F["crest"]
    if style == "none":
        return
    k = F["hero_scale"] if F["hero"] == "crest" else 1.0
    top = surf(center, r, scale, Vector((0, 0, 1)), 0.9)
    if style == "tuft":
        for i, (dx, dy) in enumerate(((0.0, -0.15), (-0.3, 0.2), (0.3, 0.2))):
            d = Vector((dx, dy, 1.0)).normalized()
            B.cone(top + Vector((dx * r * 0.15, dy * r * 0.15, 0)), d, r * 0.45 * k, r * 0.12, 0.0, segs=4,
                   mat=MAT_ACCENT if i == 0 else MAT_BODY)
    elif style == "horn":
        B.cone(top, Vector((0, 0.25, 1.0)), r * 0.65 * k, r * 0.20, 0.0, segs=5, mat=MAT_ACCENT)
    elif style == "antenna":  # v2.1: thick stem sunk into the head, ball sunk onto the stem
        L = r * 0.7 * k
        d = Vector((0, 0.12, 1.0)).normalized()
        sink = max(r * 0.15, MIN_OVERLAP)
        B.cyl(top - d * sink, d, L + sink, thick(r * 0.09), segs=5, mat=MAT_DARK)
        ball = max(r * 0.17, thick(r * 0.09) * 1.5)
        B.sphere(top + d * (L + ball * 0.55), ball, segs=8, rings=6, mat=MAT_ACCENT)


def add_tail(B, F, root, rb, n=4, r_scale=0.16):
    style = F["tail"]
    if style == "none":
        return
    k = F["hero_scale"] if F["hero"] == "tail" else 1.0
    root = Vector(root)
    if style == "nub":
        B.sphere(root + Vector((0, rb * 0.12, 0)), rb * 0.24 * k, segs=8, rings=6, mat=MAT_BODY)
    elif style == "long":  # v2.1: first bead starts inside the body, beads overlap by ~40 %
        p = Vector(root)
        d = Vector((0, 1.0, 0.15)).normalized()
        r = max(rb * r_scale * k, MIN_CONNECTOR * 0.6)
        for i in range(n):
            p = p + d * (r * (0.6 if i == 0 else 1.3))
            B.sphere(p, r * (1.0 - 0.10 * i), segs=6, rings=4, mat=MAT_BODY if i < n - 1 else MAT_ACCENT)
            d = (d + Vector((0, -0.1, 0.45 * 4.0 / n))).normalized()
    elif style == "leaf":  # v2.1: thick stem sunk into the body, leaf base sunk onto the stem
        d = Vector((0, 0.8, 0.9)).normalized()
        sink = max(rb * 0.2, MIN_OVERLAP)
        B.cyl(root - d * sink, d, rb * 0.35 + sink, thick(rb * 0.09), segs=5, mat=MAT_DARK)
        B.cone(root + d * (rb * 0.22), d, rb * 0.80 * k, rb * 0.30 * k, 0.0, segs=4, mat=MAT_ACCENT,
               scale=(1.0, 0.3, 1.0))


def add_accessory(B, F, ctx, kinds=HEAD_ACCESSORIES + BODY_ACCESSORIES):
    style = F["accessory"]
    if style == "none" or style not in kinds:
        return
    k = F["hero_scale"] if F["hero"] == "accessory" else 1.0
    if style == "scarf":
        c, R, axis = ctx["neck"]
        r = R * 0.17 * k
        if isinstance(axis, str):
            rot = track_z(Vector((0, 1, 0))) if axis == "Y" else None
            side = axis
        else:  # arbitrary neck axis (flat body): torus axis along it, tail hangs off the side
            rot = track_z(Vector(axis))
            side = "Y"
        B.torus(c, R * 1.02, r, segs=12, rings=6, mat=MAT_ACCENT, rot=rot)
        if side == "Y":
            dangle = c + Vector((-R * 0.55, 0.0, -R * 0.95))
        else:
            dangle = c + Vector((-R * 0.6, -R * 0.7, -R * 0.4))
        dl = R * 0.6 * k
        dangle.z = max(dangle.z, 0.04 + dl / 2)  # never below the ground
        B.cube(dangle, (R * 0.28, R * 0.2, dl), mat=MAT_ACCENT, bevel=0.1)
    elif style == "hat":
        k = min(k, F.get("hat_k_max", k))
        center, r, scale = ctx["head"]
        top = surf(center, r, scale, Vector((0, 0, 1)), 0.85)
        d = Vector((0.12, 0.05, 1.0)).normalized()
        L = r * 0.95 * k
        B.cone(top, d, L, r * 0.6, 0.0, segs=7, mat=MAT_ACCENT)
        B.sphere(top + d * L, r * 0.12, segs=6, rings=4, mat=MAT_SECOND)
        B.torus(top + d * (r * 0.02), r * 0.62, r * 0.06, segs=10, rings=5, mat=MAT_SECOND, rot=track_z(d))
    elif style == "backpack":
        p, size = ctx["back"]
        B.cube(p, (size[0] * k, size[1] * k, size[2] * k), mat=MAT_SECOND, bevel=0.12)
        B.cube(p + Vector((0, size[1] * 0.45 * k, size[2] * 0.15 * k)),
               (size[0] * 0.55 * k, size[1] * 0.35 * k, size[2] * 0.45 * k), mat=MAT_ACCENT, bevel=0.12)
    elif style == "bow":
        center, r, scale = ctx["head"]
        n = Vector((-0.55, -0.35, 0.75)).normalized()
        p = surf(center, r, scale, n, 0.92)
        t = Vector((1.0, 0.4, 0.55)).normalized()
        rot = track("X", t, "Z")
        for s in (-1, 1):
            B.sphere(p + t * (s * r * 0.19 * k), r * 0.15 * k, scale=(1.5, 0.75, 1.0), segs=7, rings=5,
                     mat=MAT_ACCENT, rot=rot)
        B.sphere(p + n * (r * 0.03), r * 0.085 * k, segs=6, rings=4, mat=MAT_SECOND)


def add_pattern(B, F, rng, center, rb, scale, front_dir):
    style = F["pattern"]
    if style == "none":
        return
    if style == "belly":
        d = Vector(front_dir).normalized()
        p = surf(center, rb, scale, d, 0.80)
        B.sphere(p, rb * 0.62, scale=(1.0, 1.05, 0.45), segs=10, rings=7, mat=MAT_SECOND, rot=track_z(d))
    elif style == "spots":
        for _ in range(rng.randint(3, 5)):
            theta = rng.uniform(0, 2 * math.pi)
            z = rng.uniform(0.15, 0.85)
            rr = math.sqrt(max(0.0, 1.0 - z * z))
            d = Vector((rr * math.cos(theta), rr * math.sin(theta), z))
            if d.y < -0.35:  # keep the face clean
                d.y = -d.y
            p = surf(center, rb, scale, d, 0.94)
            B.sphere(p, rb * 0.16, scale=(1.0, 1.0, 0.35), segs=7, rings=4, mat=MAT_SECOND, rot=track_z(d))


def add_back_pattern(B, F, rng, points, up, rb):
    """Saddle patch / spots along the spine of a horizontal body. `points` are spine points (front to back),
    `up` the local up direction of the back."""
    style = F["pattern"]
    if style == "none":
        return
    up = Vector(up).normalized()
    if style == "belly":  # one saddle
        mid = points[len(points) // 2]
        B.sphere(mid + up * (rb * 0.72), rb * 0.75, scale=(0.85, 1.0, 0.35), segs=10, rings=6, mat=MAT_SECOND,
                 rot=frame_z(up, y_hint=(0.0, 1.0, 0.0)))
    else:
        for i, p in enumerate(points):
            sx = -1 if i % 2 else 1
            side = Vector((sx * 0.35 + rng.uniform(-0.1, 0.1), 0.0, 1.0)).normalized()
            B.sphere(p + up * (rb * 0.78) + Vector((side.x * rb * 0.35, 0.0, 0.0)), rb * 0.18,
                     scale=(1.0, 1.0, 0.4), segs=7, rings=4, mat=MAT_SECOND, rot=frame_z(up, y_hint=(0.0, 1.0, 0.0)))


# ----------------------------------------------------------------------------- archetypes
# Every builder returns ctx = {"head_pivot": Vector} for the personality pass; head parts are built inside
# `with B.group("head")`. Blender coords: front = -Y, up = +Z.

def build_biped(B, F, rng):
    sq, hs = F["body_squash"], F["head_scale"]
    rb = 0.20
    bscale = Vector((1.0, 0.92, sq))
    foot_r = 0.08
    body_c = Vector((0, 0, 0.06 + rb * sq))
    B.ico(body_c, rb, scale=bscale, subdiv=2, mat=MAT_BODY)
    rh = 0.27 * hs  # v2.2: head_scale 1.35..1.5 (Rumble-toy proportion)
    hscale = Vector((1.0, 0.95, 0.95))
    head_c = Vector((0, -0.01, body_c.z + rb * sq + rh * 0.72))
    for sx in (-1, 1):
        d = Vector((sx * 1.0, -0.15, -0.45)).normalized()
        base = body_c + Vector((sx * rb * 0.8, -0.02, rb * sq * 0.15))
        B.sphere(base + d * (rb * 0.25), rb * 0.32, scale=(0.75, 0.75, 1.3), segs=7, rings=5, mat=MAT_BODY,
                 rot=track_z(d))
    feet_mat = MAT_SECOND if F.get("feet_secondary") else MAT_BODY
    for sx in (-1, 1):  # v2: wider, further apart
        B.sphere(Vector((sx * rb * 0.62, -0.04, foot_r * 0.6)), foot_r, scale=(1.3, 1.35, 0.6), segs=8, rings=5,
                 mat=feet_mat)
    head_ctx = dict(head=(head_c, rh, hscale))
    with B.group("head"):
        B.sphere(head_c, rh, scale=hscale, segs=12, rings=8, mat=MAT_BODY)
        add_face(B, F, head_c, rh, hscale, eye_low=-0.08, eye_spread=0.55)
        add_ears(B, F, head_c, rh, hscale)
        add_crest(B, F, head_c, rh, hscale)
        add_accessory(B, F, head_ctx, HEAD_ACCESSORIES)
    add_tail(B, F, body_c + Vector((0, rb * 0.85, -rb * sq * 0.1)), rb)
    add_pattern(B, F, rng, body_c, rb, bscale, Vector((0, -1.0, -0.25)))
    add_accessory(B, F, dict(
        neck=(Vector((0, 0, body_c.z + rb * sq * 0.88)), rb * 0.72, "Z"),
        back=(body_c + Vector((0, rb * 0.95, rb * sq * 0.15)), Vector((rb * 0.9, rb * 0.5, rb * 0.9))),
    ), BODY_ACCESSORIES)
    return dict(head_pivot=head_c)


def build_blob(B, F, rng):
    sq, hs = F["body_squash"], F["head_scale"]
    rb = 0.34 * (0.9 + 0.2 * (hs - 1.15) / 0.35)
    sz = sq * 1.2
    bscale = Vector((1.0, 0.95, sz))
    body_c = Vector((0, 0, 0.55 * rb * sz))
    B.sphere(body_c, rb, scale=bscale, segs=12, rings=8, mat=MAT_BODY, zmin=-0.55 * rb)
    for sx in (-1, 1):  # nub arms (v2.1: protrude a little more so the dome's fill stays under 0.75)
        d = Vector((sx * 1.0, -0.25, -0.18)).normalized()
        p = surf(body_c, rb, bscale, d, 1.0)
        B.sphere(p, rb * 0.32, scale=(1.5, 0.85, 0.75), segs=7, rings=5, mat=MAT_BODY, rot=track("X", d, "Z"))
    head_c = body_c + Vector((0, 0, rb * sz * 0.08))
    rh = rb * 0.95
    with B.group("head"):
        add_face(B, F, head_c, rh, bscale, eye_low=0.05, eye_spread=0.45)
        add_ears(B, F, head_c, rh, bscale)
        add_crest(B, F, head_c, rh, bscale)
        add_accessory(B, F, dict(head=(head_c, rh, bscale)), HEAD_ACCESSORIES)
    add_tail(B, F, body_c + Vector((0, rb * 0.9, -rb * sz * 0.2)), rb * 0.8)
    add_pattern(B, F, rng, body_c, rb, bscale, Vector((0, -1.0, -0.3)))
    neck_z = body_c.z - rb * sz * 0.25
    add_accessory(B, F, dict(
        neck=(Vector((0, 0, neck_z)), rb * math.sqrt(1 - 0.25 ** 2) * 0.97, "Z"),
        back=(body_c + Vector((0, rb * 0.95, rb * sz * 0.1)), Vector((rb * 0.8, rb * 0.45, rb * 0.8))),
    ), BODY_ACCESSORIES)
    return dict(head_pivot=body_c)


def build_bean(B, F, rng):
    """v2 bean: horizontal capsule on four visible legs (body lifted 0.12 m), distinct big head at the front,
    flat facet ears, 3-sphere or leaf tail, chunky 2-facet whiskers."""
    sq, hs = F["body_squash"], F["head_scale"]
    rb = 0.17
    cl = rb * (1.3 + 0.5 * (sq - 0.85) / 0.30)  # straight part of the capsule: 1.3..1.8 body radii
    lift = 0.12
    body_c = Vector((0, 0, lift + rb))
    B.capsule(body_c, rb, cl, axis=(0, 1, 0), segs=12, rings=7, mat=MAT_BODY)
    leg_r = rb * 0.26
    paws = F.get("feet_secondary")
    for sx in (-1, 1):
        for sy in (-1, 1):
            p = Vector((sx * rb * 0.58, sy * cl * 0.48, 0.0))
            B.cyl(p, Vector((0, 0, 1)), lift + rb * 0.45, leg_r, segs=6, mat=MAT_BODY)
            if paws:
                B.sphere(Vector((p.x, p.y - 0.004, 0.02)), leg_r * 1.3, scale=(1.0, 1.15, 0.5), segs=7, rings=4,
                         mat=MAT_SECOND)
    rh = rb * hs  # v2.2: 1.15..1.5 x body radius
    hscale = Vector((1.0, 0.95, 0.95))
    front_pole = body_c + Vector((0, -(cl / 2 + rb), 0))
    head_c = Vector((0, front_pole.y + rh * 0.35, body_c.z + rb * 0.40))
    head_ctx = dict(head=(head_c, rh, hscale))
    with B.group("head"):
        B.sphere(head_c, rh, scale=hscale, segs=12, rings=8, mat=MAT_BODY)
        nd = Vector((0, -1.0, -0.22)).normalized()
        nose = surf(head_c, rh, hscale, nd, 0.98)
        B.sphere(nose, rh * 0.16, segs=6, rings=4, mat=MAT_ACCENT)
        add_face(B, F, head_c, rh, hscale, eye_low=0.02, eye_spread=0.62)
        add_ears(B, F, head_c, rh, hscale, flat=True)
        add_crest(B, F, head_c, rh, hscale)
        add_accessory(B, F, head_ctx, HEAD_ACCESSORIES)
    add_tail(B, F, body_c + Vector((0, cl / 2 + rb * 0.85, rb * 0.15)), rb, n=3, r_scale=0.20)
    spine = [body_c + Vector((0, t * cl * 0.5, 0)) for t in (-0.6, 0.0, 0.6)]
    add_back_pattern(B, F, rng, spine, (0, 0, 1), rb)
    add_accessory(B, F, dict(
        neck=(Vector((0, head_c.y + rh * 0.62, (head_c.z + body_c.z) / 2 + 0.01)), rb * 0.92, "Y"),
        back=(body_c + Vector((0, 0, rb * 0.9)), Vector((rb * 0.9, rb * 0.8, rb * 0.5))),
    ), BODY_ACCESSORIES)
    return dict(head_pivot=head_c)


def build_bird(B, F, rng):
    sq, hs = F["body_squash"], F["head_scale"]
    rb = 0.24
    bscale = Vector((1.0, 1.08, sq))
    leg_len = 0.16
    body_c = Vector((0, 0, leg_len + rb * sq * 0.88))
    B.ico(body_c, rb, scale=bscale, subdiv=2, mat=MAT_BODY)
    for sx in (-1, 1):  # v2.1: short tapered cone legs fused into the body, thicker foot slabs
        x = sx * rb * 0.36
        B.cone(Vector((x, 0.02, 0.0)), Vector((0, 0, 1)), leg_len + rb * sq * 0.45, thick(0.026), thick(0.04),
               segs=5, mat=MAT_DARK)
        B.cube(Vector((x, -0.03, 0.018)), (0.085, 0.16, 0.036), mat=MAT_DARK, bevel=0.1)
    separate_head = not F.get("head_merged", False)
    if separate_head:
        rh = 0.19 * hs  # v2.2: head_scale 1.15..1.5 -> head about the body radius
        hscale = Vector((1.0, 1.0, 1.0))
        head_c = Vector((0, -rb * 0.55, body_c.z + rb * sq * 0.78))
        face_c, face_r, face_scale = head_c, rh, hscale
        eye_low = -0.05
    else:
        rh = rb * 0.85
        hscale = bscale
        head_c = body_c
        face_c, face_r, face_scale = body_c + Vector((0, 0, rb * sq * 0.18)), rb, bscale
        eye_low = 0.05
    wing_mat = MAT_SECOND if F.get("wing_secondary") else MAT_BODY
    for sx in (-1, 1):
        d = Vector((sx * 1.0, 0.1, -0.35)).normalized()
        p = surf(body_c, rb, bscale, d, 0.85)
        B.sphere(p + d * (rb * 0.05), rb * 0.42, scale=(0.3, 0.9, 0.75), segs=8, rings=5, mat=wing_mat,
                 rot=track("X", d, "Z"))
    head_ctx = dict(head=(head_c, rh if separate_head else rb, hscale))
    with B.group("head"):
        if separate_head:
            B.sphere(head_c, rh, segs=12, rings=8, mat=MAT_BODY)
        beak_len = rb * F["beak_len"]
        bp = surf(face_c, face_r, face_scale, Vector((0, -1.0, -0.15)), 0.9)
        B.cone(bp, Vector((0, -1.0, -0.25)), beak_len, face_r * 0.14, 0.0, segs=4, mat=MAT_ACCENT)
        add_face(B, F, face_c, face_r, face_scale, eye_low=eye_low, eye_spread=0.55, draw_mouth=False)
        ear_c = head_c if separate_head else body_c + Vector((0, 0, rb * sq * 0.1))
        add_ears(B, F, ear_c, rh, hscale)
        add_crest(B, F, head_c if separate_head else body_c, rh if separate_head else rb, hscale)
        add_accessory(B, F, head_ctx, HEAD_ACCESSORIES)
    add_tail(B, F, body_c + Vector((0, rb * 1.0, rb * sq * 0.15)), rb)
    add_pattern(B, F, rng, body_c, rb, bscale, Vector((0, -1.0, -0.35)))
    neck_c = Vector((0, -rb * 0.2, body_c.z + rb * sq * 0.6))
    add_accessory(B, F, dict(
        neck=(neck_c, rb * 0.72, "Z"),
        back=(body_c + Vector((0, rb * 0.9, rb * sq * 0.25)), Vector((rb * 0.7, rb * 0.4, rb * 0.7))),
    ), BODY_ACCESSORIES)
    return dict(head_pivot=head_c if separate_head else body_c)


def build_sprite(B, F, rng):
    """v2 sprite: Kirby-world-select pedestal creature. Short round body sitting on the ground, tiny arms, no
    legs, and a big cap (mushroom / cactus pads + flower / sprout leaves / flower crown) as the hero."""
    sq, hs = F["body_squash"], F["head_scale"]
    cap = F["cap"]
    k = F["hero_scale"] if F["hero"] == "cap" else 1.0
    rb = 0.25 * (0.92 + 0.16 * (hs - 1.15) / 0.35)
    sz = sq * (1.25 if cap == "cactus" else 0.95)
    bscale = Vector((1.0, 0.95, sz))
    body_c = Vector((0, 0, rb * sz * 0.80))
    B.sphere(body_c, rb, scale=bscale, segs=12, rings=8, mat=MAT_BODY, zmin=-0.80 * rb)
    for sx in (-1, 1):  # tiny arms
        d = Vector((sx * 1.0, -0.35, -0.15)).normalized()
        p = surf(body_c, rb, bscale, d, 0.95)
        B.sphere(p, rb * 0.19, scale=(1.25, 0.8, 0.7), segs=7, rings=5, mat=MAT_BODY, rot=track("X", d, "Z"))
    top = surf(body_c, rb, bscale, Vector((0, 0, 1)), 1.0)
    eye_low = 0.02
    with B.group("head"):
        if cap == "mushroom":
            R = rb * 1.2 * k
            cc = Vector((0, 0, body_c.z + rb * sz * 0.75))
            B.sphere(cc, R, scale=(1.0, 1.0, 0.55), segs=12, rings=6, mat=MAT_ACCENT, zmin=-0.2 * R)
            for i in range(3):
                a = math.radians(-100 + 100 * i)
                d = Vector((math.cos(a) * 0.62, math.sin(a) * 0.62, 0.78)).normalized()
                p = surf(cc, R, (1.0, 1.0, 0.55), d, 0.98)
                B.sphere(p, R * 0.17, scale=(1.0, 1.0, 0.4), segs=7, rings=4, mat=MAT_WHITE, rot=track_z(d))
        elif cap == "cactus":
            for sx in (-1, 1):  # side pads
                pc = Vector((sx * rb * 0.98, 0.02, body_c.z + rb * sz * 0.05))
                B.sphere(pc, rb * 0.30 * k, scale=(0.7, 0.7, 1.5), segs=8, rings=6, mat=MAT_BODY)
            fc = top + Vector((0, 0, rb * 0.10))
            B.sphere(fc, rb * 0.17 * k, segs=7, rings=5, mat=MAT_SECOND)
            for i in range(5):
                a = 2 * math.pi * i / 5 + math.pi / 2
                d = Vector((math.cos(a), math.sin(a), 0.25)).normalized()
                B.sphere(fc + d * (rb * 0.21 * k), rb * 0.15 * k, scale=(1.0, 1.0, 0.45), segs=6, rings=4,
                         mat=MAT_ACCENT, rot=track_z(Vector((0, -0.1, 1))))
            eye_low = 0.10
        elif cap == "sprout":
            L = rb * 0.40
            sink = max(rb * 0.15, MIN_OVERLAP)
            B.cyl(top - Vector((0, 0, sink)), Vector((0, 0, 1)), L + sink, thick(rb * 0.10), segs=5, mat=MAT_SECOND)
            tip = top + Vector((0, 0, L))
            for sx in (-1, 1):  # two leaf ellipsoids in a V, thin front-to-back so the wide face reads
                d = Vector((sx * 1.0, -0.15, 0.75)).normalized()
                leaf = rb * 0.64 * k
                B.sphere(tip + d * (leaf * 0.42), leaf * 0.5, scale=(0.55, 0.22, 1.0), segs=8, rings=5,
                         mat=MAT_ACCENT, rot=frame_z(d))
            B.sphere(tip, rb * 0.12, segs=6, rings=4, mat=MAT_SECOND)
            eye_low = 0.12
        elif cap == "flower":  # v2.1: crown sunk onto the head with a short thick stem
            fc = top + Vector((0, -rb * 0.04, rb * 0.10 * k))
            n = Vector((0, -0.45, 1.0)).normalized()
            fr = frame_z(n)
            B.cyl(top - Vector((0, 0, rb * 0.2)), Vector((0, 0, 1)), rb * 0.2 + rb * 0.10 * k, thick(rb * 0.12),
                  segs=5, mat=MAT_SECOND)
            B.sphere(fc, rb * 0.24 * k, scale=(1, 1, 0.5), segs=8, rings=5, mat=MAT_SECOND, rot=fr)
            for i in range(6):
                a = 2 * math.pi * i / 6 + math.pi / 6
                off = fr.to_3x3() @ Vector((math.cos(a), math.sin(a), 0.0)) * (rb * 0.40 * k)
                B.sphere(fc + off, rb * 0.20 * k, scale=(1.0, 1.0, 0.35), segs=7, rings=4, mat=MAT_ACCENT, rot=fr)
            eye_low = 0.08
        add_face(B, F, body_c, rb, bscale, eye_low=eye_low, eye_spread=0.5)
        add_ears(B, F, body_c, rb, bscale)
        add_accessory(B, F, dict(head=(body_c, rb, bscale)), HEAD_ACCESSORIES)
    add_pattern(B, F, rng, body_c, rb, bscale, Vector((0, -1.0, -0.4)))
    neck_z = body_c.z - rb * sz * 0.3
    add_accessory(B, F, dict(
        neck=(Vector((0, 0, neck_z)), rb * math.sqrt(1 - 0.3 ** 2) * 0.97, "Z"),
        back=(body_c + Vector((0, rb * 0.95, rb * sz * 0.05)), Vector((rb * 0.8, rb * 0.45, rb * 0.8))),
    ), BODY_ACCESSORIES)
    return dict(head_pivot=body_c)


def build_flat(B, F, rng):
    """v2.1 flat: seal / fish / slug sitting up. Tapered capsule spine sloping ~39 deg from the raised chest
    down to the tail on the ground, big rounded head on a thick neck at +Z, wedge front flippers that run from
    inside the body to the ground, and a wedge tail fin (vertical fish fan or two horizontal seal flippers)
    whose wide base is sunk into the tail. Every appendage overlaps the body so the 96/48 px silhouette is one
    piece, and the upright posture keeps the footprint depth under 1.3 x height."""
    sq, hs = F["body_squash"], F["head_scale"]
    rb = 0.17 * (0.95 + 0.10 * (sq - 0.85) / 0.30)
    cl = rb * 1.6
    axis = Vector((0, 1.0, -0.45)).normalized()          # head end -> tail end, sloping down to the ground
    up = Vector((0, 0.45, 1.0)).normalized()             # perpendicular to the spine, pointing up
    H = rb + cl / 2
    body_c = Vector((0, 0.0, -axis.z * H + rb * 0.50))   # tail cap kisses the ground (flattened by finalize)
    B.capsule(body_c, rb, cl, axis=axis, segs=12, rings=7, mat=MAT_BODY, taper=0.55)
    front_cap = body_c - axis * (cl / 2)                 # centre of the front hemisphere
    tail_cap = body_c + axis * (cl / 2)                  # centre of the tail hemisphere (radius 0.55 rb)
    rh = rb * hs  # v2.2: 1.2..1.5 x body radius
    hscale = Vector((1.0, 0.95, 0.92))
    head_c = front_cap + Vector((0, -rb * 0.12, rb * 0.45 + rh * 0.30))
    neck_d = (head_c - front_cap).normalized()
    B.cyl(front_cap, neck_d, (head_c - front_cap).length, rb * 0.62, segs=8, mat=MAT_BODY)  # thick neck
    seal = F["fin"] == "seal"
    head_ctx = dict(head=(head_c, rh, hscale))
    with B.group("head"):
        B.sphere(head_c, rh, scale=hscale, segs=12, rings=8, mat=MAT_BODY)
        if seal:
            nd = Vector((0, -1.0, -0.25)).normalized()
            B.sphere(surf(head_c, rh, hscale, nd, 0.98), rh * 0.12, segs=6, rings=4, mat=MAT_DARK)
        add_face(B, F, head_c, rh, hscale, eye_low=0.0, eye_spread=0.6, draw_mouth=not seal)
        add_ears(B, F, head_c, rh, hscale)
        add_crest(B, F, head_c, rh, hscale)
        add_accessory(B, F, head_ctx, HEAD_ACCESSORIES)
    flip_mat = MAT_SECOND if F.get("feet_secondary") else MAT_BODY
    for sx in (-1, 1):  # front flippers: short splayed wedges rooted inside the chest, flat pads on the ground
        base = front_cap + Vector((sx * rb * 0.48, -rb * 0.12, -rb * 0.50))
        d = Vector((sx * 0.80, -0.40, -1.0)).normalized()
        L = (base.z + rb * 0.05) / -d.z
        B.cone(base, d, L, rb * 0.42, rb * 0.26, segs=5, mat=flip_mat, scale=(0.6, 1.0, 1.0), rot=frame_z(d))
        tip = base + d * L
        B.sphere(Vector((tip.x, tip.y - rb * 0.05, rb * 0.10)), rb * 0.32, scale=(1.1, 1.25, 0.35), segs=7,
                 rings=4, mat=flip_mat, rot=Matrix.Rotation(math.radians(sx * -25.0), 4, "Z"))
    k = F["hero_scale"] if F["hero"] == "fin" else 1.0
    fin_mat = MAT_ACCENT if F["hero"] == "fin" else MAT_SECOND
    fin_root = tail_cap - axis * (rb * 0.15)  # inside the tail
    if seal:
        for sx in (-1, 1):  # two horizontal wedges in a V
            d = Vector((sx * 0.7, 1.0, -0.12)).normalized()
            B.cone(fin_root + Vector((sx * rb * 0.08, 0, 0)), d, rb * 1.15 * k, rb * 0.42 * k, rb * 0.12, segs=4,
                   mat=fin_mat, scale=(1.0, 0.28, 1.0), rot=frame_z(d, y_hint=(0.0, 0.0, 1.0)))
    else:  # vertical fan wedge rising up-back from the tail
        d = Vector((0, 0.55, 1.0)).normalized()
        B.cone(fin_root, d, rb * 1.35 * k, rb * 0.60 * k, rb * 0.14, segs=4, mat=fin_mat,
               scale=(0.24, 1.0, 1.0), rot=frame_z(d, y_hint=(0.0, 1.0, 0.0)))
    if F.get("dorsal"):
        d = (up + Vector((0, 0.35, 0))).normalized()
        B.cone(body_c + up * (rb * 0.6), d, rb * 0.4 + rb * 0.75, rb * 0.36, 0.0, segs=4, mat=MAT_SECOND,
               scale=(0.25, 1.0, 1.0), rot=frame_z(d, y_hint=(0.0, 1.0, 0.0)))
    spine = [body_c + axis * (t * cl * 0.5) for t in (-0.6, 0.0, 0.6)]
    add_back_pattern(B, F, rng, spine, up, rb)
    add_accessory(B, F, dict(
        neck=((front_cap + head_c) * 0.5, rb * 0.85, neck_d),
        back=(body_c + up * (rb * 0.80), Vector((rb * 0.8, rb * 0.7, rb * 0.45))),
    ), BODY_ACCESSORIES)
    return dict(head_pivot=head_c)


BUILDERS = {"blob": build_blob, "bean": build_bean, "bird": build_bird, "biped": build_biped,
            "sprite": build_sprite, "flat": build_flat}


def apply_personality(B, P, ctx):
    """Pose bias. Head rotations pivot on the head centre so nothing detaches; leans are shears about the
    ground so the feet stay planted; shy turns the whole creature 15 deg away from the camera side."""
    piv = ctx["head_pivot"]
    if P == "sleepy":
        B.rotate_group("head", piv, "X", 9.0)                       # nod forward
        B.shear_all(dx_per_z=math.tan(math.radians(5.0)))           # slight sideways lean
    elif P == "bold":
        B.rotate_group("head", piv, "X", -10.0)                     # chin up
        B.shear_all(dy_per_z=math.tan(math.radians(4.0)))           # lean back -> chest out
    elif P == "curious":
        B.rotate_group("head", piv, "Y", 10.0)                      # head tilt
    elif P == "grumpy":
        B.rotate_group("head", piv, "X", 4.0)                       # brows already added by add_face
    elif P == "shy":
        B.yaw_all(-15.0)                                            # ear droop already added by add_ears


# ----------------------------------------------------------------------------- stage (camera / lights / label)

class Stage:
    def __init__(self, samples, cell):
        scene = bpy.context.scene
        self.scene = scene
        self.cell = cell
        scene.render.resolution_x = cell
        scene.render.resolution_y = cell
        scene.render.resolution_percentage = 100
        scene.render.image_settings.file_format = "PNG"
        scene.render.image_settings.color_mode = "RGB"
        scene.render.image_settings.compression = 25
        scene.render.film_transparent = False
        self.set_engine("BLENDER_EEVEE", samples)
        try:
            scene.view_settings.view_transform = "Standard"
            scene.view_settings.look = "None"
        except TypeError:
            pass

        if scene.world is None:
            scene.world = bpy.data.worlds.new("World")
        world = scene.world
        world.use_nodes = True
        bg = world.node_tree.nodes.get("Background")
        if bg is not None:
            bg.inputs[0].default_value = hex_to_linear_rgba(BACKDROP)
            bg.inputs[1].default_value = 0.7

        # cyclorama: cream ground that sweeps up into a wall behind the creature (no horizon seam)
        gm = bpy.data.meshes.new("stage_ground")
        y0, R = 5.0, 4.0
        profile = [(-12.0, 0.0), (y0, 0.0)]
        for i in range(1, 9):
            a = math.pi / 2 * i / 8
            profile.append((y0 + R * math.sin(a), R - R * math.cos(a)))
        profile.append((y0 + R, R + 14.0))
        verts, faces = [], []
        half = 16.0
        for (y, z) in profile:
            verts.append((-half, y, z))
            verts.append((half, y, z))
        for i in range(len(profile) - 1):
            a, b = 2 * i, 2 * i + 1
            faces.append((a, b, b + 2, a + 2))
        gm.from_pydata(verts, [], faces)
        for p in gm.polygons:
            p.use_smooth = True
        gm.materials.append(make_material("stage_ground", BACKDROP, roughness=1.0))
        self.ground = bpy.data.objects.new("stage_ground", gm)
        scene.collection.objects.link(self.ground)

        # v2.2: a 2 cm pad in the creature's biome ground colour for the "on ground" contrast sheet
        dbm = bmesh.new()
        bmesh.ops.create_cone(dbm, cap_ends=True, cap_tris=False, segments=48, radius1=1.0, radius2=1.0, depth=1.0)
        bmesh.ops.translate(dbm, verts=dbm.verts, vec=(0.0, 0.0, 0.5))
        dm = bpy.data.meshes.new("stage_disc")
        dbm.to_mesh(dm)
        dbm.free()
        self.disc_mat = make_material("stage_disc", "#888888", roughness=0.9)
        dm.materials.append(self.disc_mat)
        self.disc = bpy.data.objects.new("stage_disc", dm)
        self.disc.hide_render = True
        scene.collection.objects.link(self.disc)

        cam_data = bpy.data.cameras.new("stage_cam")
        cam_data.lens = 50.0
        cam_data.sensor_width = 36.0
        cam_data.clip_start = 0.05
        self.cam = bpy.data.objects.new("stage_cam", cam_data)
        scene.collection.objects.link(self.cam)
        scene.camera = self.cam

        self.lights = []
        for name, pos, energy, size, spread, color in (
            ("key", (-1.6, -2.2, 2.6), 190.0, 1.6, 75.0, (1.0, 0.97, 0.92)),
            ("fill", (2.4, -1.8, 1.3), 80.0, 2.5, 90.0, (0.92, 0.96, 1.0)),
            ("rim", (0.6, 2.6, 2.4), 120.0, 1.2, 60.0, (1.0, 1.0, 1.0)),
        ):
            ld = bpy.data.lights.new("stage_" + name, "AREA")
            ld.energy = energy
            ld.size = size
            ld.color = color
            ld.shadow_soft_size = size * 0.5
            if hasattr(ld, "spread"):
                ld.spread = math.radians(spread)  # keep the spill off the backdrop
            lo = bpy.data.objects.new("stage_" + name, ld)
            lo.location = pos
            scene.collection.objects.link(lo)
            self.lights.append(lo)

        # labels: text parented to the camera, always at the bottom of the frame (id, then a smaller sub-label)
        self.label = self._make_label("stage_label", 0.046, (0.0, -0.325, -1.0), (0.02, 0.018, 0.022, 1.0))
        self.sublabel = self._make_label("stage_sublabel", 0.034, (0.0, -0.283, -1.0), (0.16, 0.12, 0.18, 1.0))
        self.stage_objects = {self.ground, self.disc, self.cam, self.label, self.sublabel, *self.lights}

    def _make_label(self, name, size, location, color):
        txt = bpy.data.curves.new(name, "FONT")
        txt.body = ""
        txt.size = size
        txt.align_x = "CENTER"
        txt.align_y = "CENTER"
        lm = bpy.data.materials.new(name)
        lm.use_nodes = True
        nodes = lm.node_tree.nodes
        for n in list(nodes):
            if n.type != "OUTPUT_MATERIAL":
                nodes.remove(n)
        em = nodes.new("ShaderNodeEmission")
        em.inputs[0].default_value = color
        em.inputs[1].default_value = 1.0
        lm.node_tree.links.new(em.outputs[0], nodes["Material Output"].inputs[0])
        txt.materials.append(lm)
        obj = bpy.data.objects.new(name, txt)
        obj.parent = self.cam
        obj.location = location
        self.scene.collection.objects.link(obj)
        return obj

    def set_engine(self, engine, samples):
        scene = self.scene
        scene.render.engine = engine
        if engine.startswith("BLENDER_EEVEE"):
            ee = scene.eevee
            ee.taa_render_samples = samples
            for attr, val in (("use_raytracing", False), ("use_shadows", True), ("shadow_ray_count", 1),
                              ("shadow_step_count", 2)):
                if hasattr(ee, attr):
                    setattr(ee, attr, val)
        elif engine == "CYCLES":
            scene.cycles.samples = max(8, samples)
            scene.cycles.use_denoising = False
            scene.cycles.device = "CPU"

    def frame(self, bbox_min, bbox_max):
        """3/4 front view: front is -Y in Blender, camera sits front-right, slightly above."""
        size = bbox_max - bbox_min
        height = size.z
        target = Vector((0.0, (bbox_min.y + bbox_max.y) * 0.5, height * 0.5))
        radius = max(height * 0.5, math.hypot(size.x, size.y) * 0.5, 0.35)
        half_fov = math.atan(18.0 / self.cam.data.lens)
        dist = radius / math.tan(half_fov) * 1.28 + 0.15
        az, el = math.radians(34.0), math.radians(22.0)
        dirn = Vector((math.sin(az) * math.cos(el), -math.cos(az) * math.cos(el), math.sin(el)))
        pos = target + dirn * dist
        self.cam.location = pos
        self.cam.rotation_euler = (target - pos).to_track_quat("-Z", "Y").to_euler()
        for lo in self.lights:
            lo.rotation_euler = (target - lo.location).to_track_quat("-Z", "Y").to_euler()

    def render(self, label, filepath, sublabel=""):
        self.label.data.body = label
        self.sublabel.data.body = sublabel
        self.scene.render.filepath = filepath
        try:
            bpy.ops.render.render(write_still=True)
        except Exception as exc:  # GPU-less machines: fall back to Cycles CPU
            if self.scene.render.engine != "CYCLES":
                print(f"[creature-factory] EEVEE render failed ({exc}); falling back to CYCLES")
                self.set_engine("CYCLES", 24)
                bpy.ops.render.render(write_still=True)
            else:
                raise

    def render_on_ground(self, obj, ground_hex, bbox_min, bbox_max, label, filepath, sublabel=""):
        """Same view, but the creature stands on a 2 cm pad of its biome ground colour (contrast check)."""
        size = bbox_max - bbox_min
        radius = math.hypot(size.x, size.y) * 0.5 + 0.08
        self.disc.scale = (radius, radius, 0.02)
        self.disc.hide_render = False
        bsdf = self.disc_mat.node_tree.nodes.get("Principled BSDF")
        bsdf.inputs["Base Color"].default_value = hex_to_linear_rgba(ground_hex)
        self.disc_mat.diffuse_color = hex_to_linear_rgba(ground_hex)
        obj.location.z = 0.02
        self.frame(Vector((min(bbox_min.x, -radius), min(bbox_min.y, -radius), 0.0)),
                   Vector((max(bbox_max.x, radius), max(bbox_max.y, radius), bbox_max.z + 0.02)))
        try:
            self.render(label, filepath, sublabel)
        finally:
            obj.location.z = 0.0
            self.disc.hide_render = True


def compose_sheet(cell_paths, out_path, cols, cell):
    """Tile rendered cells into one PNG using Blender's image API (no PIL needed). `None` entries are blank
    cells (used to start every archetype on its own row in the grouped sheet)."""
    import numpy as np
    n = len(cell_paths)
    if n == 0:
        return None
    cols = max(1, min(cols, n))
    rows = math.ceil(n / cols)
    h = BACKDROP.lstrip("#")
    sheet = np.empty((rows * cell, cols * cell, 4), dtype=np.float32)
    sheet[..., :3] = [int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4)]  # byte images hold display (sRGB) values
    sheet[..., 3] = 1.0
    for i, path in enumerate(cell_paths):
        if path is None:
            continue
        img = bpy.data.images.load(path, check_existing=False)
        w, h = img.size
        buf = np.empty(w * h * 4, dtype=np.float32)
        img.pixels.foreach_get(buf)
        buf = buf.reshape(h, w, 4)
        r, c = divmod(i, cols)
        y0 = (rows - 1 - r) * cell  # Blender stores rows bottom-up
        x0 = c * cell
        hh, ww = min(h, cell), min(w, cell)
        sheet[y0:y0 + hh, x0:x0 + ww] = buf[:hh, :ww]
        bpy.data.images.remove(img)
    out = bpy.data.images.new("contact_sheet", cols * cell, rows * cell, alpha=False)
    out.pixels.foreach_set(sheet.ravel())
    out.filepath_raw = out_path
    out.file_format = "PNG"
    out.save()
    bpy.data.images.remove(out)
    return rows, cols


# ----------------------------------------------------------------------------- validation (stdlib only)

def check_glb(path, eyes_gltf=None):
    """Structural check of an exported GLB without any glTF library: header, chunks, no extensions / textures,
    identity node, triangle primitives, flat baseColorFactor materials, min y == 0, triangle budget, and (if
    given) the pupils in front of the origin (+Z)."""
    with open(path, "rb") as fh:
        data = fh.read()
    problems = []
    if len(data) < 20:
        return {"ok": False, "problems": ["file too small"]}
    magic, version, length = struct.unpack_from("<4sII", data, 0)
    if magic != b"glTF" or version != 2:
        problems.append("bad GLB header")
    if length != len(data):
        problems.append("declared length != file size")
    off, doc, bin_len = 12, None, 0
    while off + 8 <= len(data):
        clen, ctype = struct.unpack_from("<I4s", data, off)
        off += 8
        chunk = data[off:off + clen]
        off += clen
        if ctype == b"JSON":
            try:
                doc = json.loads(chunk.decode("utf-8"))
            except ValueError as exc:
                problems.append(f"JSON chunk unreadable: {exc}")
        elif ctype == b"BIN\x00":
            bin_len = clen
    if doc is None:
        return {"ok": False, "problems": problems + ["no JSON chunk"]}
    exts = sorted(set(doc.get("extensionsUsed", [])) | set(doc.get("extensionsRequired", [])))
    if exts:
        problems.append("extensions: " + ",".join(exts))
    if doc.get("textures") or doc.get("images") or doc.get("samplers"):
        problems.append("textures present")
    buffers = doc.get("buffers", [])
    if len(buffers) != 1 or abs(buffers[0].get("byteLength", 0) - bin_len) > 3:
        problems.append("buffer / BIN chunk mismatch")
    for node in doc.get("nodes", []):
        t = node.get("translation", [0, 0, 0])
        r = node.get("rotation", [0, 0, 0, 1])
        s = node.get("scale", [1, 1, 1])
        if ("matrix" in node or any(abs(x) > 1e-6 for x in t) or any(abs(x - 1) > 1e-6 for x in s)
                or any(abs(a - b) > 1e-6 for a, b in zip(r, (0, 0, 0, 1)))):
            problems.append("node transform is not identity")
    ys, tris, prims = [], 0, 0
    for mesh in doc.get("meshes", []):
        for prim in mesh.get("primitives", []):
            prims += 1
            if prim.get("mode", 4) != 4:
                problems.append("non-triangle primitive")
            acc = doc["accessors"][prim["attributes"]["POSITION"]]
            ys.append((acc["min"][1], acc["max"][1]))
            tris += (doc["accessors"][prim["indices"]]["count"] if "indices" in prim else acc["count"]) // 3
            mat = doc.get("materials", [])[prim["material"]] if "material" in prim else None
            if mat is None or "baseColorFactor" not in mat.get("pbrMetallicRoughness", {}):
                problems.append("primitive without a flat baseColorFactor material")
    if not ys:
        problems.append("no geometry")
        min_y = max_y = None
    else:
        min_y = min(a for a, _ in ys)
        max_y = max(b for _, b in ys)
        if abs(min_y) > 1e-3:
            problems.append(f"min y = {min_y:.4f} (feet not on the ground)")
        if not (HEIGHT_MIN - 1e-3 <= max_y - min_y <= HEIGHT_MAX + 1e-3):
            problems.append(f"height {max_y - min_y:.3f} outside {HEIGHT_MIN}..{HEIGHT_MAX}")
    if tris > TRI_BUDGET:
        problems.append(f"{tris} triangles > budget {TRI_BUDGET}")
    eyes_front = None
    if eyes_gltf is not None:
        eyes_front = bool(eyes_gltf) and all(e[2] > 0.05 for e in eyes_gltf)
        if not eyes_front:
            problems.append("eyes are not at +Z")
    return {
        "ok": not problems,
        "problems": problems,
        "min_y": None if min_y is None else round(min_y, 4),
        "height": None if min_y is None else round(max_y - min_y, 3),
        "triangles": tris,
        "primitives": prims,
        "extensions": exts,
        "eyes_front": eyes_front,
    }


# ----------------------------------------------------------------------------- pipeline

def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    p = argparse.ArgumentParser(prog="generate_creatures.py")
    p.add_argument("--out", default="assets/creatures/generated", help="output dir (relative to repo root)")
    p.add_argument("--archetypes", default=",".join(ARCHETYPES))
    p.add_argument("--biomes", default=",".join(BIOMES))
    p.add_argument("--seeds", default="1,2", help="comma list; every archetype x biome x seed is generated")
    p.add_argument("--extra", type=int, default=12,
                   help="random (archetype, family, seed) extras drawn flat over the *shipped* families (v1 rule, "
                        "keeps the 12 legacy extra ids)")
    p.add_argument("--family-extra", type=int, default=2,
                   help="v2.3: extras per *planned* family, archetype drawn by the family's catalogue weights")
    p.add_argument("--master-seed", type=int, default=2026, help="seed for the extra picks")
    p.add_argument("--only", default="", help="substring filter on creature id (debugging; disables --clean)")
    p.add_argument("--no-clean", action="store_true",
                   help="keep stale *.glb / renders/*.png from earlier runs (default: wipe them first)")
    p.add_argument("--no-render", action="store_true", help="skip cell renders + contact sheets")
    p.add_argument("--no-export", action="store_true", help="skip GLB export (render only)")
    p.add_argument("--cell", type=int, default=256, help="contact sheet cell size in px")
    p.add_argument("--cols", type=int, default=8, help="contact sheet columns")
    p.add_argument("--samples", type=int, default=16, help="EEVEE render samples")
    return p.parse_args(argv)


def plan(args):
    """Shipped families first (archetype x family x seed, then the flat legacy extras so the v1/v2 extra ids
    survive), then the planned families (same product, then per-family extras whose archetype follows the
    catalogue's `creature_archetype_weights`). Everything is seeded and independent of the machine."""
    archetypes = [a for a in args.archetypes.split(",") if a]
    biomes = [b for b in args.biomes.split(",") if b]
    for b in biomes:
        if b not in PALETTES:
            raise SystemExit(f"unknown family '{b}'; catalogue families: {', '.join(BIOMES)}")
    seeds = [int(s) for s in args.seeds.split(",") if s.strip()]
    shipped = [b for b in biomes if FAMILY_STATUS[b] == "shipped"]
    planned = [b for b in biomes if FAMILY_STATUS[b] != "shipped"]
    specs = [(a, b, s) for s in seeds for a in archetypes for b in shipped]
    seen = set(specs)
    if args.extra > 0 and shipped:
        mr = random.Random(args.master_seed)
        n_base = len(specs)
        while len(specs) - n_base < args.extra:
            spec = (mr.choice(archetypes), mr.choice(shipped), mr.randint(100, 9999))
            if spec not in seen:
                seen.add(spec)
                specs.append(spec)
    for b in planned:
        fam_specs = [(a, b, s) for s in seeds for a in archetypes]
        seen.update(fam_specs)
        specs.extend(fam_specs)
        if args.family_extra > 0:
            fr = random.Random(f"{b}|extras|{args.master_seed}")
            weights = [ARCHETYPE_WEIGHTS[b].get(a, 0.0) for a in archetypes]
            if sum(weights) <= 0:
                weights = [1.0] * len(archetypes)
            added = 0
            while added < args.family_extra:
                spec = (fr.choices(archetypes, weights=weights)[0], b, fr.randint(100, 9999))
                if spec not in seen:
                    seen.add(spec)
                    specs.append(spec)
                    added += 1
    if args.only:
        specs = [s for s in specs if args.only in f"{s[0]}-{s[1]}-{s[2]}"]
    return specs


def build_creature(archetype, biome, seed):
    rng = random.Random(f"{archetype}|{biome}|{seed}")
    F = roll_features(rng, archetype)
    colors, contrast = pick_colors(rng, biome)
    normalize_hero(F, archetype, biome, seed)
    P = roll_personality(archetype, biome, seed, F)
    if rel_luminance(colors["body"]) < 0.2 and F["eyes"] == "dot":
        F["eyes"] = "big"  # v2.2: dark bodies (brick, plum, navy...) need the white sclera to keep their eyes
    cid = f"{archetype}-{biome}-{seed}"
    B = Builder(personality=P)
    ctx = BUILDERS[archetype](B, F, rng)
    apply_personality(B, P, ctx)
    height, scale = B.finalize()
    eyes = B.eye_centres_gltf()
    mats = [make_material(f"{cid}-{MAT_NAMES[i]}", colors[MAT_NAMES[i]]) for i in range(5)]
    obj = B.to_object(cid, mats)
    return obj, mats, F, colors, contrast, P, eyes, height, scale


def export_glb(obj, filepath):
    scene = bpy.context.scene
    for o in scene.objects:
        o.select_set(False)
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.export_scene.gltf(
        filepath=filepath,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_animations=False,
        export_materials="EXPORT",
        export_normals=True,
        export_texcoords=False,
        export_extras=False,
        export_cameras=False,
        export_lights=False,
    )
    obj.select_set(False)


def world_bbox(obj):
    pts = [obj.matrix_world @ Vector(c) for c in obj.bound_box]
    mn = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    mx = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    return mn, mx


def clean_outputs(out_dir, renders_dir):
    """Remove earlier GLBs and cell renders so the manifest is the single truth (contact sheets, the v1
    reference sheet and anything else in the folder are left alone)."""
    n = 0
    for pattern in (os.path.join(out_dir, "*.glb"), os.path.join(renders_dir, "*.png")):
        for f in glob.glob(pattern):
            os.remove(f)
            n += 1
    return n


def main():
    t0 = time.time()
    args = parse_args()
    out_dir = args.out if os.path.isabs(args.out) else os.path.join(REPO_ROOT, args.out)
    renders_dir = os.path.join(out_dir, "renders")
    os.makedirs(out_dir, exist_ok=True)
    os.makedirs(renders_dir, exist_ok=True)
    if not args.no_clean and not args.only:
        removed = clean_outputs(out_dir, renders_dir)
        if removed:
            print(f"[creature-factory] cleaned {removed} stale files from {out_dir}")

    bpy.ops.wm.read_factory_settings(use_empty=True)
    stage = None if args.no_render else Stage(args.samples, args.cell)

    specs = plan(args)
    print(f"[creature-factory] generating {len(specs)} creatures -> {out_dir}")
    entries = []
    cell_paths = []
    ground_paths = []
    cells_by_arch = {}
    failures = []
    for archetype, biome, seed in specs:
        obj, mats, F, colors, contrast, P, eyes, height, scale = build_creature(archetype, biome, seed)
        cid = obj.name
        tris = tri_count(obj.data)
        if tris > TRI_BUDGET:
            print(f"[creature-factory] WARNING {cid}: {tris} triangles exceeds budget {TRI_BUDGET}")
        rel_glb = os.path.join(args.out, f"{cid}.glb") if not os.path.isabs(args.out) else f"{cid}.glb"
        glb_path = os.path.join(out_dir, f"{cid}.glb")
        if not args.no_export:
            export_glb(obj, glb_path)
        mn, mx = world_bbox(obj)
        entry = {
            "id": cid,
            "archetype": archetype,
            "biome": biome,
            "family": biome,  # v2.3: catalogue family id (== biome; `biome` kept for older consumers)
            "family_status": FAMILY_STATUS[biome],
            "catalog_ref": f"{CATALOG_REL}#families/{biome}",
            "seed": seed,
            "personality": P,
            "features": F,
            "triangles": tris,
            "colors": colors,
            "contrast_vs_ground": contrast["contrast_vs_ground"],
            "accent_contrast_vs_body": contrast["accent_contrast_vs_body"],
            "file": rel_glb.replace(os.sep, "/"),
            "height": round(height, 3),
            "footprint": [round(mx.x - mn.x, 3), round(mx.y - mn.y, 3)],
            "normalize_scale": round(scale, 3),
            "eyes": eyes,  # pupil centres in glTF coords (x, y up, z front)
        }
        if not args.no_export and os.path.exists(glb_path):
            entry["bytes"] = os.path.getsize(glb_path)
            entry["checks"] = check_glb(glb_path, eyes)
            if not entry["checks"]["ok"]:
                failures.append((cid, entry["checks"]["problems"]))
        if stage is not None:
            cell_path = os.path.join(renders_dir, f"{cid}.png")
            stage.frame(mn, mx)
            stage.render(cid, cell_path, sublabel=P)
            cell_paths.append(cell_path)
            cells_by_arch.setdefault(archetype, []).append(cell_path)
            entry["render"] = os.path.relpath(cell_path, out_dir).replace(os.sep, "/")
            ground_path = os.path.join(renders_dir, f"{cid}-ground.png")
            ratio = contrast["contrast_vs_ground"]["ratio"]
            stage.render_on_ground(obj, GROUND[biome], mn, mx, cid, ground_path, sublabel=f"{biome} {ratio:.2f}")
            ground_paths.append(ground_path)
            entry["render_on_ground"] = os.path.relpath(ground_path, out_dir).replace(os.sep, "/")
        entries.append(entry)
        cg = contrast["contrast_vs_ground"]
        print(f"[creature-factory] {cid}: {tris} tris, h={height:.2f}m, hero={F['hero']}, {P}, "
              f"contrast {cg['ratio']:.2f} ({cg['rerolls']} rerolls)")
        # tidy up so the scene only ever holds one creature
        mesh = obj.data
        bpy.data.objects.remove(obj)
        bpy.data.meshes.remove(mesh)
        for m in mats:
            bpy.data.materials.remove(m)

    manifest = {
        "version": VERSION,
        "generated_at": _dt.datetime.now().astimezone().isoformat(timespec="seconds"),
        "generator": "tools/creature-factory/generate_creatures.py",
        "blender": bpy.app.version_string,
        "conventions": {
            "up": "+Y (glTF)",
            "front": "+Z",
            "ground": "feet on y=0, origin at feet centre",
            "height_m": [HEIGHT_MIN, HEIGHT_MAX],
            "triangle_budget": TRI_BUDGET,
            "min_connector_m": MIN_CONNECTOR,
            "min_overlap_m": MIN_OVERLAP,
            "silhouette": "one connected component at 96 px and 48 px (3/4 ortho view), fill 0.25-0.75",
            "contrast": f"body vs biome ground and hero accent vs body: luminance ratio >= {CONTRAST_MIN_RATIO} "
                        f"and (hue distance >= {CONTRAST_MIN_HUE:.0f} deg or lightness diff >= {CONTRAST_MIN_LIGHT})",
            "hero": "exactly one of hat / scarf / crest / backpack / bow / cap, at most one body pattern",
            "head_scale": HEAD_SCALE,
            "materials": "flat Principled BSDF colours (baseColorFactor), roughness 0.6, no textures; "
                         "primitives per GLB: body, secondary, accent, dark, white",
            "determinism": "features + colours from random.Random('archetype|biome|seed'), personality from "
                           "random.Random('archetype|biome|seed|personality')",
        },
        "catalog": {
            "path": CATALOG_REL,
            "version": CATALOG.get("version"),
            "generated_at": CATALOG.get("generated_at"),
            "families": {b: FAMILY_STATUS[b] for b in BIOMES},
            "archetype_weights": ARCHETYPE_WEIGHTS,
        },
        "archetypes": ARCHETYPES,
        "biomes": BIOMES,
        "families": BIOMES,
        "personalities": PERSONALITIES,
        "palettes": PALETTES,
        "creature_accents": CREATURE_ACCENTS,
        "ground": GROUND,
        "count": len(entries),
        "count_by_family": {b: sum(1 for e in entries if e["biome"] == b) for b in BIOMES
                            if any(e["biome"] == b for e in entries)},
        "creatures": entries,
    }
    with open(os.path.join(out_dir, "manifest.json"), "w") as fh:
        json.dump(manifest, fh, indent=2)

    if stage is not None and cell_paths:
        sheet_path = os.path.join(out_dir, "contact-sheet.png")
        grid = compose_sheet(cell_paths, sheet_path, args.cols, args.cell)
        print(f"[creature-factory] contact sheet {grid} -> {sheet_path}")
        grouped = []
        for archetype in ARCHETYPES:
            cells = cells_by_arch.get(archetype, [])
            if not cells:
                continue
            grouped.extend(cells)
            grouped.extend([None] * (-len(cells) % args.cols))  # start the next archetype on a new row
        while grouped and grouped[-1] is None:
            grouped.pop()
        by_arch_path = os.path.join(out_dir, "contact-sheet-by-archetype.png")
        grid = compose_sheet(grouped, by_arch_path, args.cols, args.cell)
        print(f"[creature-factory] contact sheet by archetype {grid} -> {by_arch_path}")
        ground_sheet = os.path.join(out_dir, "contact-sheet-on-ground.png")
        grid = compose_sheet(ground_paths, ground_sheet, args.cols, args.cell)
        print(f"[creature-factory] contact sheet on ground {grid} -> {ground_sheet}")
        new_cells = [e["render"] for e in entries if FAMILY_STATUS[e["biome"]] != "shipped" and "render" in e]
        if new_cells:
            new_sheet = os.path.join(out_dir, "contact-sheet-new-families.png")
            grid = compose_sheet([os.path.join(out_dir, r) for r in new_cells], new_sheet, args.cols, args.cell)
            print(f"[creature-factory] contact sheet new families {grid} -> {new_sheet}")

    tris = [e["triangles"] for e in entries]
    if tris:
        per_arch = {a: sum(1 for e in entries if e["archetype"] == a) for a in ARCHETYPES}
        print(f"[creature-factory] done: {len(entries)} creatures {per_arch}, triangles {min(tris)}..{max(tris)}, "
              f"{time.time() - t0:.1f}s")
        for biome in BIOMES:
            rs = sorted(e["contrast_vs_ground"]["ratio"] for e in entries if e["biome"] == biome)
            if rs:
                rerolls = sum(e["contrast_vs_ground"]["rerolls"] for e in entries if e["biome"] == biome)
                print(f"[creature-factory] contrast {biome}: min {rs[0]:.2f} median {rs[len(rs) // 2]:.2f} "
                      f"({len(rs)} creatures, {rerolls} body re-rolls)")
        low = [e["id"] for e in entries if not e["contrast_vs_ground"]["pass"]]
        if low:
            print(f"[creature-factory] WARNING bodies failing the ground-contrast rule: {low}")
    if failures:
        print(f"[creature-factory] VALIDATION FAILED for {len(failures)} creature(s):")
        for cid, problems in failures:
            print(f"[creature-factory]   {cid}: {'; '.join(problems)}")
        sys.exit(1)
    elif not args.no_export and entries:
        print(f"[creature-factory] validation: {len(entries)}/{len(entries)} GLBs pass "
              f"(header, no extensions/textures, identity node, min y=0, height, triangles, eyes at +Z)")


if __name__ == "__main__":
    main()
