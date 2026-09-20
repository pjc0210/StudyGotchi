"""
StudyGotchi landmark factory: procedural "toybox low-poly" landmarks (3 growth stages per biome) plus
terrain filler props. Blender 5.2 LTS, headless, fully deterministic (only seeded rngs, no randomness).

Regenerate everything (GLBs, manifest, contact sheets, renders):

  /Applications/Blender.app/Contents/MacOS/Blender -b --python tools/landmark-factory/generate_landmarks.py

Options after `--`: --biomes ice,city  --only lighthouse  --no-render  --no-export  --cell 256  --samples 16

Conventions of the exported GLBs (shared with the creature factory, relied on by the R3F world code):
  * glTF 2.0 binary, +Y up, base on y=0, origin at the base centre, metres
  * front / entrance toward +Z (built toward -Y in Blender; the exporter maps Blender -Y -> glTF +Z)
  * flat baseColorFactor materials only (roughness 0.6), no textures, no extensions, no animation
  * budgets: landmark stage 1 < 400 tris, stage 2 < 900, stage 3 < 1600; prop < 300
  * every stage 2/3 landmark carries a shrunken copy of the previous stage (upgrade continuity) and
    warm "window" facets (#ffe9a8) so night lighting can be faked later by swapping that material
"""

import argparse
import datetime as _dt
import json
import math
import os
import random
import sys
import time
from contextlib import contextmanager

import bpy
import bmesh
from mathutils import Matrix, Vector

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
sys.path.insert(0, SCRIPT_DIR)
import validate_glbs as vg  # noqa: E402  (stdlib-only sibling module)

# ----------------------------------------------------------------------------- catalogue (single source of truth)
CATALOG_PATH = os.path.join(REPO_ROOT, "assets", "biomes", "catalog.json")
with open(CATALOG_PATH) as _fh:
    CATALOG = json.load(_fh)
FAMILIES = {f["id"]: f for f in CATALOG["families"]}
BIOMES = [f["id"] for f in CATALOG["families"]]
SHIPPED = [f["id"] for f in CATALOG["families"] if f["status"] == "shipped"]

# palette roles per family straight from the catalogue (ground / accent / accent_2 / alt / water / ink / window / road)
PALETTE = {}
for _f in CATALOG["families"]:
    _p = _f["palette"]
    PALETTE[_f["id"]] = {"ground": _p["ground"], "accent": _p["accent"], "alt": _p.get("ground_alt", _p["ground"]),
                         "accent2": _p.get("accent_2", _p["accent"]), "water": _p.get("water", "#7fb8d8"),
                         "ink": _p.get("ink", "#3a2f45"), "window": _p.get("window", "#ffe9a8"),
                         "road": _p.get("road_core", "#c9b08a"), "road_edge": _p.get("road_edge", "#8f7a5a")}

# the shipped seven were hardcoded before the catalogue existed; kept for the one-release equality check
_LEGACY_PALETTE = {
    "forest": ("#8fc48a", "#4f8a4a"), "city": ("#d9c3d6", "#b98bb0"), "ice": ("#e6f2fb", "#a9cfe8"),
    "sand": ("#efd9a2", "#d2a95e"), "meadow": ("#bfe0a0", "#8fbf6a"), "ocean": ("#9fd3e0", "#4f8fb0"),
    "volcanic": ("#c9a08f", "#8a4a3f"),
}
_LEGACY_S2 = {
    "ice": ("observatory dome", "ice tower with flag", "snow chapel"),
    "city": ("clock tower", "townhouse with awning", "bell gazebo"),
    "forest": ("treehouse", "mushroom cottage", "hunter's lodge"),
    "sand": ("adobe hut", "market stall", "mini ziggurat"),
    "meadow": ("windmill", "barn", "bell tower"),
    "ocean": ("dock with hut", "boathouse", "net-drying rack"),
    "volcanic": ("forge hut", "obsidian shrine", "steam vent house"),
}
_LEGACY_NEUTRALS = {"ink": "#3a2f45", "water": "#7fb8d8", "window": "#ffe9a8"}


def catalogue_diffs():
    """Where the catalogue disagrees with the pre-catalogue constants (catalogue wins; reported)."""
    out = []
    for b, (g, a) in _LEGACY_PALETTE.items():
        p = PALETTE[b]
        if (p["ground"], p["accent"]) != (g, a):
            out.append(f"{b}: palette ground/accent {g}/{a} -> {p['ground']}/{p['accent']}")
        for role, old in _LEGACY_NEUTRALS.items():
            if p[role] != old:
                out.append(f"{b}: {role} {old} -> {p[role]} (catalogue palette.{role})")
    for b, names in _LEGACY_S2.items():
        lm = FAMILIES[b]["landmarks"]
        for k, old in zip(("s2a", "s2b", "s2c"), names):
            if lm[k]["name"] != old:
                out.append(f"{b}: {k} name {old!r} -> {lm[k]['name']!r}")
        for k, suffix in (("s1", "s1"), ("s2a", "s2"), ("s2b", "s2b"), ("s2c", "s2c"), ("s3", "s3")):
            want = f"assets/landmarks/{b}/{b}-landmark-{suffix}.glb"
            if lm[k].get("file") != want:
                out.append(f"{b}: {k} file {lm[k].get('file')} != {want}")
    return out


def landmark_file(family, key):
    """Catalogue file for a landmark stage key (s1, s2a, s2b, s2c, s3); falls back to the convention."""
    suffix = {"s1": "s1", "s2a": "s2", "s2b": "s2b", "s2c": "s2c", "s3": "s3"}[key]
    return FAMILIES[family]["landmarks"][key].get("file") or f"assets/landmarks/{family}/{family}-landmark-{suffix}.glb"


def prop_short(prop_id, family):
    return prop_id[len(family) + 1:] if prop_id.startswith(family + "-") else prop_id


def prop_file(family, prop):
    return prop.get("file") or f"assets/landmarks/{family}/props/{prop_short(prop['id'], family)}.glb"


def terrain_file(family):
    t = FAMILIES[family]["terrain_piece"]
    return t.get("file") or f"assets/landmarks/{family}/terrain/{prop_short(t['id'], family)}.glb"
NEUTRALS = {"wood": "#9a7a55", "stone": "#b7a58f", "ink": "#3a2f45", "window": "#ffe9a8",
            "snow": "#ffffff", "water": "#7fb8d8"}
# extra flat colours, all taken from the charter (creature accents / other biome swatches)
EXTRAS = {"peach": "#f2a86f", "coral": "#e88a8a", "mint": "#8fc9d8", "olive": "#b9c96f", "lilac": "#c9a2e6",
          "pine": "#4f8a4a", "leaf": "#8fbf6a", "pale": "#e6f2fb", "straw": "#efd9a2",
          # art-direction iteration 3: city walls/roofs and frosted greenhouse glass (producer-specified)
          "cream": "#fffaf3", "cream2": "#f6ecd2", "slate": "#6b5f7a",
          "glass_sand": "#f7e9c4", "glass_sand_cap": "#fff6df", "glass_meadow": "#d9f0dc", "glass_meadow_cap": "#f2fbf3"}
BACKDROP = "#FBF3E4"  # same cream as the creature contact sheets
# the creature rig (gain 1.0, world 0.7) clips the cream ground to pure white; snow-white landmarks need
# headroom, so the same rig runs at lower gain here (ground renders at ~0.95 instead of clipping)
LIGHT_GAIN = 0.5
WORLD_STRENGTH = 0.2

BUDGET = {1: 400, 2: 900, 3: 1600, "prop": 300, "terrain": 1600, "ruin": 600, "scaffold": 400, "shared": 400,
          "hero": {0: 300, 1: 600, 2: 1200, 3: 2500}}
HERO_HEIGHT = {0: 0.45, 1: 1.2, 2: 2.6, 3: 4.5}   # same 4-stage convention as tools/growth-factory (<family>-g0..g3)
HERO_FAMILIES = ["lab", "jungle", "wildwest", "cave", "graveyard", "factory", "park"]  # the rest ship in assets/growth/
TARGET_HEIGHT = {1: 0.58, 2: 1.0, 3: 1.8}   # s1 0.55-0.62 m so sprouts read at 48 px
TERRAIN_HEIGHT = (1.4, 3.0)   # terrain budget per the catalogue conventions (kind comes from the manifest)
# props that are ground decor by design (flat discs, rocks): tagged so the gate can skip the
# silhouette-distinctness / fill check on them
DECOR = {"rock", "snow-boulder", "lava-puddle-disc", "frozen-lake-disc", "cracked-earth-tile", "wave-crest-tile",
         "dune-rock", "rock-outcrop", "ember-rock",
         # simple solids of the new families (crates, barrels, blocks, pods): silhouette fill is not gated
         "barrel", "crate", "headstone", "ghost", "pumpkin", "server-rack", "wall-segment", "glass-tower", "plant-pod",
         "habitat-pod", "storefront", "ruin-block", "waterfall-slab", "tumbleweed", "drone-pad", "moon-rock", "crater-rim",
         "boulder", "stalagmite", "hedge-block", "conveyor-segment", "pipe-segment", "tube-pipe"}
SHARED_DECOR = {"pedestal-tier-1", "pedestal-tier-2", "pedestal-tier-3", "shared-tower-block", "shared-peak", "shared-pillar"}
BRIEF = {
    "ice":      ("igloo", "observatory dome", "glacier lighthouse"),
    "city":     ("kiosk", "clock tower", "library"),
    "forest":   ("stump with sprout", "treehouse", "great tree"),
    "sand":     ("tent", "adobe hut", "pyramid greenhouse"),
    "meadow":   ("signpost", "windmill", "greenhouse dome"),
    "ocean":    ("buoy", "dock with hut", "lighthouse on rock"),
    "volcanic": ("campfire ring", "forge hut", "observatory on basalt column"),
}

FRONT = Vector((0.0, -1.0, 0.0))  # Blender -Y == glTF +Z
UP = Vector((0.0, 0.0, 1.0))


# ----------------------------------------------------------------------------- colours / materials

def srgb_to_linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def hex_to_linear_rgba(h):
    h = h.lstrip("#")
    r, g, b = (int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4))
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
    mat.use_backface_culling = True
    return mat


# ----------------------------------------------------------------------------- geometry helpers

def track(axis, direction, up="Z"):
    """Rotation matrix that maps local `axis` onto `direction`."""
    d = Vector(direction)
    if d.length < 1e-9:
        return Matrix.Identity(4)
    if up == axis:
        up = "Y" if axis != "Y" else "Z"
    return d.normalized().to_track_quat(axis, up).to_matrix().to_4x4()


def track_z(direction):
    return track("Z", direction, "Y")


def rot_z(deg):
    return Matrix.Rotation(math.radians(deg), 4, "Z")


def rot_y(deg):
    return Matrix.Rotation(math.radians(deg), 4, "Y")


def rot_x(deg):
    return Matrix.Rotation(math.radians(deg), 4, "X")


def polar(r, deg, z=0.0):
    a = math.radians(deg)
    return Vector((r * math.cos(a), r * math.sin(a), z))


class Builder:
    """Accumulates flat-shaded primitives into one bmesh; material slots are colour roles ("wood", ...)."""

    def __init__(self, colours):
        self.bm = bmesh.new()
        self.colours = colours
        self.roles = []
        self.stack = [Matrix.Identity(4)]

    # -- material roles
    def m(self, role):
        if role not in self.roles:
            if role not in self.colours:
                raise KeyError(f"unknown colour role {role!r}")
            self.roles.append(role)
        return self.roles.index(role)

    # -- nested placement (motif reuse: `with B.at((x, y, z), scale): ...`)
    @contextmanager
    def at(self, offset=(0, 0, 0), scale=1.0, rot=None):
        m = Matrix.Translation(Vector(offset))
        if rot is not None:
            m = m @ rot
        m = m @ Matrix.Scale(scale, 4)
        self.stack.append(self.stack[-1] @ m)
        try:
            yield
        finally:
            self.stack.pop()

    # -- internals
    def _xform(self, center, scale=(1, 1, 1), rot=None):
        m = Matrix.Translation(Vector(center))
        if rot is not None:
            m = m @ rot
        return m @ Matrix.Diagonal(Vector((scale[0], scale[1], scale[2], 1.0)))

    def _finish(self, verts, matrix, mat):
        idx = self.m(mat)
        faces = {f for v in verts for f in v.link_faces}
        for f in faces:
            f.material_index = idx
            f.smooth = False
        bmesh.ops.transform(self.bm, matrix=self.stack[-1] @ matrix, verts=verts)
        return verts

    def _faces_of(self, verts):
        return list({f for v in verts for f in v.link_faces})

    def paint_above(self, verts, z, mat):
        """Recolour the faces of a placed primitive whose centre lies above z (dome caps, snow lines)."""
        idx = self.m(mat)
        for f in self._faces_of(verts):
            if f.calc_center_median().z > z:
                f.material_index = idx

    # -- primitives (all in Blender Z-up space, front = -Y)
    def box(self, center, size, mat, rot=None, bevel=0.0):
        before = set(self.bm.verts)
        res = bmesh.ops.create_cube(self.bm, size=1.0)
        verts = res["verts"]
        if bevel > 0.0:
            edges = list({e for v in verts for e in v.link_edges})
            bmesh.ops.bevel(self.bm, geom=edges, offset=bevel, offset_type="OFFSET", segments=1,
                            profile=0.5, affect="EDGES", clamp_overlap=True)
            verts = [v for v in self.bm.verts if v not in before]
        return self._finish(verts, self._xform(center, tuple(size), rot), mat)

    def cone(self, base, direction, length, r1, r2=0.0, segs=6, mat="stone", scale=(1, 1, 1), phase=0.0):
        """Cone / cylinder starting at `base`, pointing along `direction`. phase rotates the polygon."""
        d = Vector(direction).normalized()
        res = bmesh.ops.create_cone(self.bm, cap_ends=True, cap_tris=False, segments=segs,
                                    radius1=r1, radius2=r2, depth=length)
        center = Vector(base) + d * (length / 2.0)
        m = (Matrix.Translation(center) @ track_z(d) @ Matrix.Rotation(phase, 4, "Z")
             @ Matrix.Diagonal(Vector((scale[0], scale[1], scale[2], 1.0))))
        return self._finish(res["verts"], m, mat)

    def cyl(self, base, length, r, segs=8, mat="stone", phase=0.0, top_mat=None, scale=(1, 1, 1)):
        verts = self.cone(base, UP, length, r, r, segs=segs, mat=mat, phase=phase, scale=scale)
        if top_mat is not None:
            faces = self._faces_of(verts)
            top = max(faces, key=lambda f: f.calc_center_median().z)
            top.material_index = self.m(top_mat)
        return verts

    def sphere(self, center, radius, mat, scale=(1, 1, 1), segs=8, rings=5, rot=None, zmin=None):
        res = bmesh.ops.create_uvsphere(self.bm, u_segments=segs, v_segments=rings, radius=radius)
        verts = res["verts"]
        if zmin is not None:
            for v in verts:
                if v.co.z < zmin:
                    v.co.z = zmin
        return self._finish(verts, self._xform(center, scale, rot), mat)

    def ico(self, center, radius, mat, scale=(1, 1, 1), subdiv=2, rot=None, zmin=None, jitter=0.0, seed="",
            facet_mat=None, facet_every=0):
        """Faceted blob (subdiv 1 = 20 faces, 2 = 80, 3 = 320). jitter displaces vertices radially
        (deterministic per seed); facet_mat paints every n-th face in a second colour (ember rocks)."""
        res = bmesh.ops.create_icosphere(self.bm, subdivisions=subdiv, radius=radius)
        verts = res["verts"]
        if jitter > 0.0:
            rng = random.Random(f"ico|{seed}")
            for v in verts:
                v.co *= 1.0 + rng.uniform(-jitter, jitter)
        if zmin is not None:
            for v in verts:
                if v.co.z < zmin:
                    v.co.z = zmin
        self._finish(verts, self._xform(center, scale, rot), mat)
        if facet_mat is not None and facet_every > 0:
            faces = sorted(self._faces_of(verts), key=lambda f: f.index)
            idx = self.m(facet_mat)
            for i, f in enumerate(faces):
                if i % facet_every == 0 and f.calc_center_median().z > 0.02:
                    f.material_index = idx
        return verts

    def dome(self, center, radius, mat, scale=(1, 1, 1), subdiv=2, uv=None, fill=True):
        """Upper half of an icosphere (or uv sphere when uv=(segs, rings)). Closed underneath by default:
        open shells get inconsistent normals from recalc_face_normals and vanish under backface culling."""
        bm = self.bm
        if uv is not None:
            res = bmesh.ops.create_uvsphere(bm, u_segments=uv[0], v_segments=uv[1], radius=radius)
        else:
            res = bmesh.ops.create_icosphere(bm, subdivisions=subdiv, radius=radius)
        verts = res["verts"]
        edges = list({e for v in verts for e in v.link_edges})
        faces = list({f for v in verts for f in v.link_faces})
        cut = bmesh.ops.bisect_plane(bm, geom=verts + edges + faces, dist=1e-5, plane_co=(0, 0, 0),
                                     plane_no=(0, 0, 1), clear_inner=True, clear_outer=False)
        keep = [g for g in cut["geom"] if isinstance(g, bmesh.types.BMVert) and g.is_valid]
        if fill:
            cut_edges = [g for g in cut["geom_cut"] if isinstance(g, bmesh.types.BMEdge) and g.is_valid]
            if cut_edges:
                bmesh.ops.contextual_create(bm, geom=cut_edges)
        return self._finish(keep, self._xform(center, scale), mat)

    def lathe(self, profile, segs, mat, center=(0, 0, 0), rot=None, phase=0.0, caps=True, closed=False):
        """Revolve a (r, z) profile around Z. r == 0 makes a pole. closed=True welds the last ring to the
        first (ring / annulus shells)."""
        bm = self.bm
        rings, all_verts = [], []
        for k, (r, z) in enumerate(profile):
            if closed and k == len(profile) - 1:
                rings.append(rings[0])
                continue
            if r <= 1e-6:
                v = bm.verts.new((0.0, 0.0, z))
                rings.append([v])
                all_verts.append(v)
            else:
                ring = []
                for i in range(segs):
                    a = 2.0 * math.pi * i / segs + phase
                    v = bm.verts.new((r * math.cos(a), r * math.sin(a), z))
                    ring.append(v)
                rings.append(ring)
                all_verts.extend(ring)
        faces = []
        for a, b in zip(rings[:-1], rings[1:]):
            if len(a) == 1 and len(b) == 1:
                continue
            if len(a) == 1:
                for i in range(segs):
                    faces.append(bm.faces.new((a[0], b[i], b[(i + 1) % segs])))
            elif len(b) == 1:
                for i in range(segs):
                    faces.append(bm.faces.new((a[i], a[(i + 1) % segs], b[0])))
            else:
                for i in range(segs):
                    faces.append(bm.faces.new((a[i], a[(i + 1) % segs], b[(i + 1) % segs], b[i])))
        if caps and not closed:
            if len(rings[0]) > 1:
                faces.append(bm.faces.new(list(reversed(rings[0]))))
            if len(rings[-1]) > 1:
                faces.append(bm.faces.new(rings[-1]))
        bmesh.ops.recalc_face_normals(bm, faces=faces)
        return self._finish(all_verts, self._xform(center, (1, 1, 1), rot), mat)

    def loft(self, ring_a, ring_b, mat, caps=True, center=(0, 0, 0), rot=None):
        """Side quads between two polygons with the same vertex count (+ end caps)."""
        bm = self.bm
        va = [bm.verts.new(Vector(p)) for p in ring_a]
        vb = [bm.verts.new(Vector(p)) for p in ring_b]
        n = len(va)
        faces = [bm.faces.new((va[i], va[(i + 1) % n], vb[(i + 1) % n], vb[i])) for i in range(n)]
        if caps:
            faces.append(bm.faces.new(list(reversed(va))))
            faces.append(bm.faces.new(vb))
        bmesh.ops.recalc_face_normals(bm, faces=faces)
        return self._finish(va + vb, self._xform(center, (1, 1, 1), rot), mat)

    def prism(self, pts, z0, z1, mat, center=(0, 0, 0), rot=None):
        """Vertical prism from a 2D (x, y) polygon."""
        return self.loft([(x, y, z0) for x, y in pts], [(x, y, z1) for x, y in pts], mat, center=center, rot=rot)

    def extrude_xz(self, profile, y0, y1, mat, center=(0, 0, 0), rot=None):
        """Polygon drawn in the XZ plane, extruded along Y (gable roofs, arrow signs, wave crests)."""
        return self.loft([(x, y0, z) for x, z in profile], [(x, y1, z) for x, z in profile], mat,
                         center=center, rot=rot)

    def ring(self, r_in, r_out, z0, z1, segs, mat, center=(0, 0, 0), top_in=None):
        """Closed annulus shell (well rims, basins, lake rims). top_in lowers the inner top edge."""
        ti = z1 if top_in is None else top_in
        prof = [(r_out, z0), (r_out, z1), (r_in, ti), (r_in, z0), (r_out, z0)]
        return self.lathe(prof, segs, mat, center=center, closed=True)

    # -- composed bits
    def window(self, p, n, w=0.10, h=0.14, mat="window", depth=0.02):
        """Warm window facet: thin box slightly proud of a wall with outward normal n."""
        n = Vector(n).normalized()
        rot = track("Y", n, "Z") if abs(n.z) > 0.01 or abs(n.x) > 0.01 or n.y > 0 else None
        return self.box(Vector(p) + n * (depth * 0.5), (w, depth, h), mat, rot=rot)

    def door(self, p, n=FRONT, w=0.14, h=0.24, mat="ink"):
        return self.window(p, n, w, h, mat=mat, depth=0.02)

    def ring_windows(self, r, z, angles, w=0.09, h=0.12, mat="window"):
        for a in angles:
            n = polar(1.0, a)
            self.window(polar(r, a, z), n, w, h, mat)

    # -- finalisation
    def finalize(self):
        """Base on z=0, origin at the centre of the contact footprint. Returns (height, radius, (w, d))."""
        bm = self.bm
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        zmin = min(v.co.z for v in bm.verts)
        for v in bm.verts:
            v.co.z -= zmin
        height = max(v.co.z for v in bm.verts)
        contact = [v for v in bm.verts if v.co.z < 0.03] or list(bm.verts)
        cx = (min(v.co.x for v in contact) + max(v.co.x for v in contact)) / 2.0
        cy = (min(v.co.y for v in contact) + max(v.co.y for v in contact)) / 2.0
        for v in bm.verts:
            v.co.x -= cx
            v.co.y -= cy
        radius = max(math.hypot(v.co.x, v.co.y) for v in bm.verts)
        w = max(v.co.x for v in bm.verts) - min(v.co.x for v in bm.verts)
        d = max(v.co.y for v in bm.verts) - min(v.co.y for v in bm.verts)
        return height, radius, (w, d)

    def to_object(self, name):
        mesh = bpy.data.meshes.new(name)
        self.bm.to_mesh(mesh)
        self.bm.free()
        mats = [make_material(f"{name}-{role}", self.colours[role]) for role in self.roles]
        for m in mats:
            mesh.materials.append(m)
        if hasattr(mesh, "shade_flat"):
            mesh.shade_flat()
        obj = bpy.data.objects.new(name, mesh)
        bpy.context.scene.collection.objects.link(obj)
        return obj, mats


def tri_count(mesh):
    return sum(len(p.vertices) - 2 for p in mesh.polygons)


# ----------------------------------------------------------------------------- shared motifs
# Each motif builds at the origin with its stage-1 size; later stages re-use it via `with B.at(...)`.

def gable(B, half_w, z0, h, y0, y1, mat):
    B.extrude_xz([(-half_w, z0), (half_w, z0), (0.0, z0 + h)], y0, y1, mat)


def ladder(B, x, y, z0, h, w=0.14, rungs=4, mat="wood"):
    for sx in (-1, 1):
        B.box((x + sx * w / 2, y, z0 + h / 2), (0.02, 0.02, h), mat)
    for i in range(rungs):
        B.box((x, y, z0 + h * (i + 0.5) / rungs), (w, 0.02, 0.02), mat)


def pyramid_roof(B, center, half, h, mat, overhang=0.04):
    B.cone(center, UP, h, (half + overhang) * math.sqrt(2.0), 0.0, segs=4, mat=mat, phase=math.pi / 4)


def mound(B, xy, r, sz, mat, seed, jitter=0.06, sxy=(1.0, 0.9)):
    """Flat-bottomed faceted mound (rock, hill, dune); height = 1.5 * r * sz, base exactly on z=0."""
    cz = r * sz * 0.5
    B.ico((xy[0], xy[1], cz), r, mat, scale=(sxy[0], sxy[1], sz), zmin=-cz / sz, jitter=jitter, seed=seed)


def mound_z(xy, r, sz, sxy=(1.0, 0.9)):
    """Surface height of an un-jittered mound() at xy (for parking props on hills)."""
    cz = r * sz * 0.5
    u = (xy[0] / (r * sxy[0])) ** 2 + (xy[1] / (r * sxy[1])) ** 2
    return cz + r * sz * math.sqrt(max(0.0, 1.0 - u))


# stage-1 motifs: chunky (footprint radius >= 0.35 m, height 0.55-0.62 m) because sprouts are the most
# common state on the map and must read at 48 px

def igloo(B):
    B.dome((0, 0, 0), 0.56, "snow")
    B.box((0, -0.50, 0.15), (0.34, 0.36, 0.30), "accent")
    B.door((0, -0.68, 0.13), FRONT, 0.18, 0.22)
    B.box((0.16, 0.12, 0.51), (0.15, 0.15, 0.14), "accent")   # ice-block vent stack
    B.box((0.16, 0.12, 0.585), (0.11, 0.11, 0.05), "snow")


def kiosk(B):
    """City palette: cream walls, city accent only on the awning / hatch trim."""
    B.cyl((0, 0, 0), 0.04, 0.36, segs=6, mat="stone", phase=math.pi / 6)
    B.cyl((0, 0, 0.04), 0.32, 0.27, segs=6, mat="cream", phase=math.pi / 6)
    B.box((0, -0.25, 0.23), (0.36, 0.09, 0.04), "wood")
    B.window((0, -0.234, 0.31), FRONT, 0.20, 0.10, mat="accent")
    B.cone((0, 0, 0.36), UP, 0.18, 0.40, 0.0, segs=6, mat="accent", phase=math.pi / 6)
    B.cyl((0, 0, 0.54), 0.03, 0.03, segs=4, mat="ink")
    B.ico((0, 0, 0.58), 0.03, "window", subdiv=1)


def stump(B, sprout=True):
    B.lathe([(0.34, 0.0), (0.31, 0.08), (0.29, 0.26), (0.26, 0.28)], 8, "wood")
    B.cyl((0, 0, 0.27), 0.02, 0.25, segs=8, mat="straw")
    for a in (60, 180, 300):
        B.box(polar(0.33, a, 0.05), (0.18, 0.12, 0.10), "wood", rot=rot_z(a))
    if sprout:
        top = Vector((0.02, -0.02, 0.46))
        B.cyl((0.02, -0.02, 0.28), 0.20, 0.03, segs=5, mat="leaf")
        for a, tilt in ((200, 0.55), (330, 0.55), (90, 0.5)):
            B.cone(top, polar(1.0, a, tilt), 0.28, 0.11, 0.0, segs=4, mat="ground", scale=(1.0, 0.35, 1.0))
        B.ico(top + Vector((0, 0, 0.06)), 0.07, "leaf", subdiv=1)


def treehouse_hut(B):
    """Platform + hut + gable + door + windows + ladder, base at z=0 (platform underside)."""
    B.box((0, -0.02, 0.025), (0.62, 0.50, 0.05), "wood")
    B.box((0, 0, 0.20), (0.44, 0.36, 0.30), "straw")
    gable(B, 0.27, 0.35, 0.18, -0.24, 0.24, "accent")
    B.door((0, -0.18, 0.13), FRONT, 0.10, 0.16)
    for sx in (-1, 1):
        B.window((sx * 0.22, 0.02, 0.22), (sx, 0, 0), 0.09, 0.09)
    B.window((0.13, -0.18, 0.24), FRONT, 0.08, 0.08)


def tent(B):
    B.box((0, -0.05, 0.01), (1.05, 0.95, 0.02), "stone")
    B.extrude_xz([(-0.50, 0.02), (0.50, 0.02), (0.0, 0.58)], -0.42, 0.42, "accent")
    B.extrude_xz([(-0.17, 0.02), (0.17, 0.02), (0.0, 0.34)], -0.445, -0.41, "ink")
    B.cyl((0, -0.42, 0.0), 0.60, 0.025, segs=5, mat="wood")
    B.box((0.40, -0.52, 0.10), (0.18, 0.18, 0.18), "wood")   # crate by the door


def adobe(B):
    B.loft([(-0.36, -0.30, 0), (0.36, -0.30, 0), (0.36, 0.30, 0), (-0.36, 0.30, 0)],
           [(-0.32, -0.27, 0.72), (0.32, -0.27, 0.72), (0.32, 0.27, 0.72), (-0.32, 0.27, 0.72)], "ground")
    B.dome((0, 0, 0.72), 0.26, "accent")
    for x in (-0.2, 0.0, 0.2):
        B.cone((x, -0.26, 0.62), FRONT, 0.10, 0.025, 0.025, segs=4, mat="wood")
        B.cone((x, 0.26, 0.62), (0, 1, 0), 0.10, 0.025, 0.025, segs=4, mat="wood")
    B.door((0, -0.295, 0.16), FRONT, 0.16, 0.30)
    for sx in (-1, 1):
        B.window((sx * 0.22, -0.29, 0.50), FRONT, 0.10, 0.12)
        B.window((sx * 0.35, 0.0, 0.42), (sx, 0, 0), 0.10, 0.12)


def signpost(B):
    mound(B, (0, 0), 0.24, 0.45, "stone", "sign-stone", sxy=(1.0, 0.85))
    B.cyl((0, 0, 0.0), 0.58, 0.07, segs=6, mat="wood")
    B.cyl((0, 0, 0.58), 0.03, 0.09, segs=6, mat="wood")
    # boards pass through the fat post (one connected silhouette); big arrow reads at 48 px
    B.extrude_xz([(-0.20, 0.38), (0.24, 0.38), (0.36, 0.47), (0.24, 0.56), (-0.20, 0.56)], -0.035, 0.035, "straw")
    B.extrude_xz([(0.18, 0.20), (-0.20, 0.20), (-0.30, 0.27), (-0.20, 0.34), (0.18, 0.34)], -0.035, 0.035, "straw")
    for a, r in ((200, 0.17), (330, 0.19)):
        B.cone(polar(r, a, 0.0), UP, 0.14, 0.05, 0.0, segs=4, mat="accent")


def windmill(B):
    B.cyl((0, 0, 0), 0.08, 0.31, segs=8, mat="stone")
    B.lathe([(0.30, 0.08), (0.24, 0.45), (0.20, 0.65)], 8, "snow")
    B.dome((0, 0, 0.65), 0.21, "accent")
    B.cone((0, -0.20, 0.72), FRONT, 0.10, 0.035, 0.035, segs=6, mat="ink")
    for k in range(4):
        r = rot_y(45 + 90 * k)
        B.box(Vector((0, -0.29, 0.72)) + r @ Vector((0, 0, 0.20)), (0.11, 0.02, 0.34), "wood", rot=r)
    B.door((0, -0.30, 0.19), FRONT, 0.12, 0.22)
    for sx in (-1, 1):
        B.window((sx * 0.245, 0.0, 0.42), (sx, 0, 0), 0.08, 0.10)


def buoy(B):
    B.lathe([(0.24, 0.0), (0.36, 0.10), (0.34, 0.22)], 8, "coral")
    B.lathe([(0.34, 0.22), (0.28, 0.32), (0.12, 0.40)], 8, "snow")
    B.cyl((0, 0, 0.40), 0.08, 0.05, segs=6, mat="ink")
    B.box((0, 0, 0.53), (0.16, 0.16, 0.10), "window")
    B.cone((0, 0, 0.58), UP, 0.04, 0.13, 0.0, segs=4, mat="ink", phase=math.pi / 4)


def dock(B):
    for sx in (-1, 1):
        for sy in (-1, 1):
            B.cyl((sx * 0.40, sy * 0.30, 0.0), 0.30, 0.04, segs=4, mat="ink")
    for i in range(6):
        B.box((-0.40 + 0.16 * i, 0.0, 0.325), (0.13, 0.76, 0.05), "wood")


def campfire(B):
    for k in range(8):
        a = 22.5 + 45 * k
        B.box(polar(0.36, a, 0.07), (0.17, 0.13, 0.14), "stone", rot=rot_z(a))
    for a in (0, 60, 120):
        B.cone(polar(0.30, a, 0.07), polar(-1.0, a, 0.0), 0.60, 0.055, 0.055, segs=5, mat="wood")
    B.cone((0, 0, 0.10), UP, 0.50, 0.20, 0.0, segs=5, mat="peach")
    B.cone((0.12, -0.08, 0.10), (0.3, -0.15, 1.0), 0.36, 0.11, 0.0, segs=5, mat="coral")
    B.cone((-0.10, 0.06, 0.10), (-0.25, 0.12, 1.0), 0.30, 0.08, 0.0, segs=5, mat="window")


def forge_hut(B):
    B.box((0, 0, 0.24), (0.62, 0.50, 0.48), "stone")
    gable(B, 0.36, 0.48, 0.26, -0.29, 0.29, "ink")   # ink roof: the accent roof matched the volcanic ground
    B.box((0.20, 0.08, 0.72), (0.14, 0.14, 0.34), "accent")
    B.cyl((0.20, 0.08, 0.87), 0.08, 0.06, segs=6, mat="pale")   # smoke stem keeps the puff attached
    B.ico((0.20, 0.08, 0.96), 0.11, "pale", jitter=0.05, seed="forge-smoke")
    B.door((-0.10, -0.25, 0.16), FRONT, 0.16, 0.30)
    B.window((0.15, -0.25, 0.30), FRONT, 0.12, 0.10)
    B.window((0.31, 0.0, 0.32), (1, 0, 0), 0.10, 0.10)
    B.cyl((-0.36, -0.29, 0.0), 0.10, 0.07, segs=6, mat="wood")   # anvil block touches the hut corner
    B.box((-0.36, -0.29, 0.13), (0.16, 0.08, 0.06), "ink")


def lighthouse_tower(B, z0, stripe, cap, gallery="accent"):
    """Tapered tower with a mid stripe, gallery, warm lantern room and cap; ~1.4 m tall from z0."""
    B.lathe([(0.30, z0), (0.24, z0 + 0.45), (0.20, z0 + 0.82)], 8, "snow")
    B.cyl((0, 0, z0 + 0.38), 0.14, 0.26, segs=8, mat=stripe)
    B.cyl((0, 0, z0 + 0.82), 0.06, 0.30, segs=8, mat=gallery)
    B.cyl((0, 0, z0 + 0.88), 0.24, 0.19, segs=8, mat="window")
    B.cone((0, 0, z0 + 1.12), UP, 0.22, 0.26, 0.0, segs=8, mat=cap)
    B.ico((0, 0, z0 + 1.36), 0.045, "snow", subdiv=1)
    B.window((0, -0.283, z0 + 0.20), FRONT, 0.08, 0.12)
    B.window((0, -0.237, z0 + 0.62), FRONT, 0.08, 0.12)
    B.door((0, -0.29, z0 + 0.12), FRONT, 0.12, 0.22)


def observatory(B, drum_h=0.55, r=0.42, drum="accent", dome="snow"):
    B.cyl((0, 0, 0), drum_h, r, segs=8, mat=drum)
    B.dome((0, 0, drum_h), r, dome)
    B.box((0, -r * 0.55, drum_h + r * 0.72), (r * 0.22, r * 0.75, r * 0.55), "ink", rot=rot_x(-40))


# ----------------------------------------------------------------------------- landmarks

def ice_s1(B):
    igloo(B)


def ice_s2(B):
    observatory(B)
    B.ring_windows(0.42, 0.30, (215, 325), 0.09, 0.12)
    B.door((0, -0.42, 0.15), FRONT, 0.16, 0.28)
    B.cyl((0.16, 0.10, 0.92), 0.10, 0.012, segs=4, mat="ink")
    B.ico((0.16, 0.10, 1.02), 0.03, "window", subdiv=1)
    with B.at((0.52, -0.28, 0), 0.42):
        igloo(B)


def ice_s3(B):
    B.ico((0, 0, 0.12), 0.62, "accent", scale=(1.0, 0.85, 0.5), zmin=-0.24, jitter=0.06, seed="ice-rock")
    B.ico((0.62, -0.30, 0.06), 0.28, "pale", scale=(1.0, 0.9, 0.55), zmin=-0.11, jitter=0.08, seed="ice-rock2")
    lighthouse_tower(B, 0.40, "accent", "accent")
    with B.at((-0.46, -0.16, 0.28), 0.42):
        observatory(B)
        B.ring_windows(0.42, 0.30, (250, 300), 0.09, 0.12)
    with B.at((0.55, -0.35, 0.10), 0.3):
        igloo(B)


def city_s1(B):
    kiosk(B)


def clock_tower(B, h=0.74, half=0.15):
    B.box((0, 0, h / 2), (2 * half, 2 * half, h), "cream2")
    B.box((0, 0, h + 0.02), (2 * half + 0.04, 2 * half + 0.04, 0.04), "accent")
    pyramid_roof(B, (0, 0, h + 0.04), half, 0.22, "slate")
    B.ico((0, 0, h + 0.28), 0.03, "window", subdiv=1)
    zc = h - 0.16
    rc = half * 0.8   # clock face 0.8 of the tower width (art direction)
    B.cone((0, -half - 0.005, zc), FRONT, 0.02, rc, rc, segs=8, mat="accent")
    B.cone((0, -half - 0.025, zc), FRONT, 0.01, rc * 0.72, rc * 0.72, segs=8, mat="cream")
    B.box((0, -half - 0.04, zc + rc * 0.3), (0.014, 0.01, rc * 0.6), "ink")
    B.box((rc * 0.25, -half - 0.04, zc), (rc * 0.5, 0.01, 0.014), "ink")
    B.door((0, -half, 0.11), FRONT, 0.12, 0.22, mat="accent")
    B.window((0, -half, 0.36), FRONT, 0.09, 0.12)
    for sx in (-1, 1):
        B.window((sx * half, 0.0, 0.48), (sx, 0, 0), 0.09, 0.12)


def city_s2(B):
    clock_tower(B)
    with B.at((0.34, -0.20, 0), 0.6):
        kiosk(B)


def city_s3(B):
    B.box((0, 0, 0.03), (1.10, 0.72, 0.06), "stone")
    B.box((0, 0, 0.46), (1.00, 0.62, 0.86), "cream")
    B.box((0, 0, 0.91), (1.02, 0.64, 0.04), "slate")
    B.box((0, -0.43, 0.025), (0.56, 0.16, 0.05), "stone")
    B.box((0, -0.40, 0.075), (0.48, 0.10, 0.05), "stone")
    for x in (-0.30, -0.10, 0.10, 0.30):
        B.cyl((x, -0.42, 0.06), 0.70, 0.06, segs=6, mat="cream2")
    B.box((0, -0.40, 0.79), (0.76, 0.20, 0.06), "slate")
    B.extrude_xz([(-0.40, 0.82), (0.40, 0.82), (0.0, 1.02)], -0.50, -0.30, "accent")
    B.cyl((0, 0, 0.93), 0.18, 0.26, segs=8, mat="cream2")
    B.dome((0, 0, 1.11), 0.26, "slate")
    B.ico((0, 0, 1.38), 0.03, "window", subdiv=1)
    B.door((0, -0.31, 0.21), FRONT, 0.16, 0.30, mat="accent")
    for x in (-0.20, 0.20):
        B.window((x, -0.31, 0.60), FRONT, 0.10, 0.14)
    for y in (-0.20, 0.0, 0.20):
        B.window((-0.50, y, 0.50), (-1, 0, 0), 0.10, 0.14)
    for x in (-0.30, -0.05, 0.20):
        B.window((x, 0.31, 0.50), (0, 1, 0), 0.10, 0.14)
    with B.at((0.60, 0.10, 0), 1.0):
        clock_tower(B, h=1.50, half=0.16)


def forest_s1(B):
    stump(B)


def forest_s2(B):
    B.lathe([(0.17, 0.0), (0.14, 0.30), (0.12, 0.56)], 7, "wood")
    with B.at((0, 0, 0.52), 1.0):
        treehouse_hut(B)
    ladder(B, 0.0, -0.28, 0.0, 0.52, rungs=5)
    B.ico((0.26, 0.16, 0.80), 0.22, "accent", jitter=0.04, seed="th-a")
    B.ico((-0.25, 0.14, 0.74), 0.20, "accent", jitter=0.04, seed="th-b")
    B.ico((0.05, 0.30, 0.90), 0.14, "ground")
    with B.at((0.45, -0.32, 0), 0.5):
        stump(B, sprout=False)


def forest_s3(B):
    B.lathe([(0.34, 0.0), (0.26, 0.35), (0.20, 0.75), (0.18, 1.05)], 8, "wood")
    for a in (30, 120, 210, 300):
        B.box(polar(0.33, a, 0.06), (0.22, 0.14, 0.12), "wood", rot=rot_z(a))
    B.ico((0, 0, 1.30), 0.50, "accent", jitter=0.04, seed="canopy-a")
    B.ico((0.40, 0.10, 1.12), 0.40, "accent", jitter=0.04, seed="canopy-b")
    B.ico((-0.38, -0.05, 1.18), 0.38, "accent", jitter=0.04, seed="canopy-c")
    B.ico((0.05, -0.38, 1.02), 0.30, "accent", jitter=0.04, seed="canopy-d")
    B.ico((-0.12, -0.14, 1.48), 0.26, "ground")
    B.door((0, -0.335, 0.14), FRONT, 0.14, 0.26)
    B.window((0, -0.30, 0.46), FRONT, 0.09, 0.10)
    with B.at((0.34, -0.14, 0.55), 0.55):
        treehouse_hut(B)
    ladder(B, 0.34, -0.31, 0.0, 0.55, w=0.10, rungs=5)


def sand_s1(B):
    tent(B)


def sand_s2(B):
    adobe(B)
    ladder(B, 0.40, 0.0, 0.0, 0.76, w=0.12, rungs=5)
    with B.at((-0.66, -0.12, 0), 0.5):
        tent(B)


def sand_s3(B):
    B.box((0, 0, 0.10), (1.70, 1.70, 0.20), "accent")
    B.box((0, 0, 0.30), (1.50, 1.50, 0.20), "ground")
    B.box((0, 0, 0.50), (1.30, 1.30, 0.20), "accent")
    # frosted cream-yellow glass with a lighter cap: keeps the sand biome on its own palette
    B.cone((0, 0, 0.60), UP, 0.78, 0.60 * math.sqrt(2.0), 0.21 * math.sqrt(2.0), segs=4, mat="glass_sand",
           phase=math.pi / 4)
    B.cone((0, 0, 1.38), UP, 0.42, 0.21 * math.sqrt(2.0), 0.0, segs=4, mat="glass_sand_cap", phase=math.pi / 4)
    for sx in (-1, 1):
        for sy in (-1, 1):
            d = Vector((0, 0, 1.80)) - Vector((sx * 0.60, sy * 0.60, 0.60))
            B.cone((sx * 0.60, sy * 0.60, 0.60), d, d.length, 0.02, 0.02, segs=3, mat="snow")
    B.ico((0, 0, 1.82), 0.04, "window", subdiv=1)
    n_front = Vector((0, -1.2, 0.6)).normalized()
    for x, t in ((-0.20, 0.30), (0.20, 0.30), (0.0, 0.62)):
        B.window((x, -0.60 * (1 - t), 0.60 + 1.2 * t), n_front, 0.12, 0.16)
    for sx in (-1, 1):
        n_side = Vector((sx * 1.2, 0, 0.6)).normalized()
        B.window((sx * 0.60 * (1 - 0.35), 0.0, 0.60 + 1.2 * 0.35), n_side, 0.12, 0.16)
    with B.at((0, -0.95, 0), 0.55):
        adobe(B)
    B.ico((-0.62, -0.62, 0.72), 0.16, "leaf", jitter=0.05, seed="sand-plant-a")
    B.ico((0.62, -0.62, 0.72), 0.16, "leaf", jitter=0.05, seed="sand-plant-b")
    with B.at((0.95, -0.70, 0), 0.45):
        tent(B)


def meadow_s1(B):
    signpost(B)


def meadow_s2(B):
    windmill(B)
    with B.at((0.55, -0.22, 0), 0.7):
        signpost(B)


def meadow_s3(B):
    B.cyl((0, 0, 0), 0.35, 0.85, segs=12, mat="snow")
    dome = B.dome((0, 0, 0.35), 0.85, "glass_meadow", scale=(1.0, 1.0, 1.55), subdiv=3)   # frosted mint glass
    B.paint_above(dome, 1.30, "glass_meadow_cap")
    B.cyl((0, 0, 0.98), 0.06, 0.75, segs=12, mat="snow")
    B.cyl((0, 0, 1.66), 0.08, 0.02, segs=4, mat="ink")
    B.ico((0, 0, 1.76), 0.05, "window", subdiv=1)
    B.ring_windows(0.85, 0.20, (210, 240, 300, 330, 60, 120), 0.12, 0.14)
    B.door((0, -0.85, 0.16), FRONT, 0.20, 0.30)
    gable(B, 0.20, 0.33, 0.12, -1.05, -0.84, "wood")
    for sx in (-1, 1):
        B.cyl((sx * 0.16, -1.00, 0.0), 0.33, 0.02, segs=4, mat="wood")
    B.ico((-0.72, -0.62, 0.14), 0.15, "leaf", jitter=0.05, seed="gh-plant-a")
    B.ico((0.74, -0.58, 0.14), 0.15, "leaf", jitter=0.05, seed="gh-plant-b")
    B.ico((0.92, 0.20, 0.13), 0.14, "accent", jitter=0.05, seed="gh-plant-c")
    with B.at((-1.02, 0.18, 0), 0.5):
        windmill(B)
    with B.at((0.95, -0.55, 0), 0.5):
        signpost(B)


def ocean_s1(B):
    buoy(B)


def ocean_s2(B):
    dock(B)
    B.box((0.10, 0.12, 0.53), (0.42, 0.34, 0.36), "snow")
    gable(B, 0.26, 0.71, 0.21, -0.08, 0.32, "accent")
    B.cyl((0.0, 0.10, 0.88), 0.18, 0.03, segs=5, mat="ink")   # flag pole on the ridge, thick enough for 48 px
    B.box((0.09, 0.10, 1.00), (0.16, 0.02, 0.10), "coral")
    B.door((0.18, -0.05, 0.46), FRONT, 0.12, 0.22)
    B.window((-0.02, -0.05, 0.56), FRONT, 0.09, 0.10)
    B.window((0.31, 0.12, 0.56), (1, 0, 0), 0.09, 0.10)
    with B.at((-0.44, -0.44, 0), 0.55):   # moored against the front-left post
        buoy(B)


def ocean_s3(B):
    B.ico((0, 0, 0.15), 0.70, "stone", scale=(1.0, 0.85, 0.55), zmin=-0.27, jitter=0.07, seed="sea-rock")
    B.ico((0.55, -0.42, 0.10), 0.34, "stone", scale=(1.0, 0.9, 0.5), zmin=-0.20, jitter=0.08, seed="sea-rock2")
    lighthouse_tower(B, 0.42, "coral", "accent", gallery="ink")
    with B.at((-0.58, -0.58, 0), 0.5):
        dock(B)
    with B.at((0.52, 0.16, 0.34), 0.6):
        B.box((0, 0, 0.18), (0.42, 0.34, 0.36), "snow")
        gable(B, 0.26, 0.36, 0.21, -0.20, 0.20, "accent")
        B.door((0.08, -0.17, 0.11), FRONT, 0.12, 0.22)
        B.window((-0.10, -0.17, 0.22), FRONT, 0.09, 0.10)
    with B.at((-0.78, -0.22, 0), 0.5):
        buoy(B)


def volcanic_s1(B):
    campfire(B)


def volcanic_s2(B):
    forge_hut(B)
    with B.at((0.50, -0.38, 0), 0.5):   # stone ring touches the hut's front-right corner
        campfire(B)


def volcanic_s3(B):
    B.cyl((0, 0, 0), 1.10, 0.42, segs=6, mat="ink", phase=math.pi / 6)
    # side columns overlap the main column; the campfire leans on the front one (one silhouette)
    B.cyl((0.52, -0.20, 0), 0.55, 0.22, segs=6, mat="ink", top_mat="stone")
    B.cyl((0.32, -0.46, 0), 0.32, 0.18, segs=6, mat="ink", top_mat="stone")
    B.cyl((-0.50, 0.25, 0), 0.72, 0.20, segs=6, mat="ink", top_mat="stone")
    B.ring(0.44, 0.64, 0.0, 0.025, 8, "coral")
    with B.at((0, 0, 1.10), 1.0):
        observatory(B, drum_h=0.28, r=0.36, drum="stone", dome="accent")
    B.ring_windows(0.36, 1.24, (240, 270, 300), 0.09, 0.11)
    B.cyl((0, 0, 1.74), 0.06, 0.015, segs=4, mat="ink")
    B.ico((0, 0, 1.80), 0.04, "window", subdiv=1)
    with B.at((-0.48, -0.34, 0), 0.5):   # hut corner embedded in the column base
        forge_hut(B)
    with B.at((0.42, -0.72, 0), 0.4):
        campfire(B)


# ----------------------------------------------------------------------------- stage-2 variants (b, c)
# Same s1 motif, palette, budget (< 900) and height (~1.0 m) as variant a, different silhouette.

def ice_s2b(B):
    """Ice tower with flag."""
    B.cyl((0, 0, 0), 0.08, 0.36, segs=6, mat="pale", phase=math.pi / 6)
    B.cyl((0, 0, 0.08), 0.62, 0.28, segs=6, mat="accent", phase=math.pi / 6)
    B.cone((0, 0, 0.70), UP, 0.22, 0.34, 0.0, segs=6, mat="snow", phase=math.pi / 6)
    B.cyl((0, 0, 0.90), 0.14, 0.02, segs=4, mat="ink")
    B.box((0.07, 0, 0.99), (0.12, 0.02, 0.08), "water")
    B.door((0, -0.2425, 0.24), FRONT, 0.14, 0.26)
    B.ring_windows(0.2425, 0.50, (210, 270, 330), 0.09, 0.12)
    with B.at((0.46, -0.30, 0), 0.42):
        igloo(B)


def ice_s2c(B):
    """Snow chapel."""
    B.box((0, 0.05, 0.26), (0.56, 0.46, 0.52), "snow")
    gable(B, 0.32, 0.52, 0.22, -0.20, 0.30, "accent")
    B.box((0, -0.30, 0.36), (0.26, 0.26, 0.72), "snow")
    pyramid_roof(B, (0, -0.30, 0.72), 0.13, 0.22, "accent")
    B.ico((0, -0.30, 0.98), 0.04, "window", subdiv=1)
    B.door((0, -0.43, 0.16), FRONT, 0.14, 0.30)
    B.window((0, -0.43, 0.52), FRONT, 0.10, 0.14)
    for sx in (-1, 1):
        B.window((sx * 0.28, 0.08, 0.32), (sx, 0, 0), 0.10, 0.14)
    with B.at((0.50, -0.22, 0), 0.40):
        igloo(B)


def city_s2b(B):
    """Townhouse with awning."""
    B.box((0, 0, 0.03), (0.60, 0.50, 0.06), "stone")
    B.box((0, 0, 0.42), (0.50, 0.40, 0.72), "cream2")
    B.box((0, 0, 0.80), (0.54, 0.44, 0.04), "slate")
    B.box((0, 0, 0.85), (0.50, 0.40, 0.06), "slate")
    B.box((0.15, 0.10, 0.92), (0.10, 0.10, 0.16), "ink")
    B.box((0, -0.27, 0.50), (0.30, 0.16, 0.02), "accent", rot=rot_x(20))
    B.door((0, -0.20, 0.20), FRONT, 0.14, 0.28, mat="accent")
    for x in (-0.15, 0.15):
        B.window((x, -0.20, 0.64), FRONT, 0.10, 0.14)
    for sx in (-1, 1):
        for y in (-0.10, 0.10):
            B.window((sx * 0.25, y, 0.50), (sx, 0, 0), 0.09, 0.13)
    with B.at((0.44, -0.20, 0), 0.5):
        kiosk(B)


def city_s2c(B):
    """Bell gazebo."""
    B.cyl((0, 0, 0), 0.06, 0.42, segs=6, mat="stone", phase=math.pi / 6)
    B.cyl((0, 0, 0.06), 0.05, 0.36, segs=6, mat="cream2", phase=math.pi / 6)
    for k in range(6):
        p = polar(0.30, 30 + 60 * k)
        B.cyl((p.x, p.y, 0.11), 0.55, 0.04, segs=6, mat="cream")
    B.cyl((0, 0, 0.66), 0.05, 0.36, segs=6, mat="accent", phase=math.pi / 6)
    B.cone((0, 0, 0.71), UP, 0.24, 0.44, 0.0, segs=6, mat="slate", phase=math.pi / 6)
    B.cyl((0, 0, 0.95), 0.03, 0.03, segs=4, mat="ink")
    B.ico((0, 0, 1.0), 0.035, "window", subdiv=1)
    B.lathe([(0.0, 0.42), (0.10, 0.44), (0.12, 0.56), (0.06, 0.62), (0.0, 0.64)], 6, "window")
    B.cyl((0, 0, 0.63), 0.04, 0.015, segs=4, mat="ink")
    with B.at((0.56, -0.25, 0), 0.5):
        kiosk(B)


def forest_s2b(B):
    """Mushroom cottage."""
    B.lathe([(0.30, 0.0), (0.27, 0.30), (0.25, 0.56)], 8, "straw")
    B.lathe([(0.10, 0.50), (0.52, 0.58), (0.46, 0.74), (0.22, 0.92), (0.0, 1.0)], 8, "coral")
    for p in ((0.30, -0.25, 0.80), (-0.35, 0.10, 0.78), (0.05, 0.30, 0.90)):
        B.ico(p, 0.07, "snow", scale=(1, 1, 0.4), subdiv=1)
    B.box((0.30, -0.10, 0.90), (0.08, 0.08, 0.22), "ink")
    B.door((0, -0.285, 0.16), FRONT, 0.16, 0.30)
    B.window((0.16, -0.23, 0.38), (0.57, -0.82, 0), 0.10, 0.12)
    B.window((-0.16, -0.23, 0.38), (-0.57, -0.82, 0), 0.10, 0.12)
    with B.at((0.55, -0.25, 0), 0.5):
        stump(B, sprout=False)


def forest_s2c(B):
    """Hunter's lodge."""
    B.box((0, 0, 0.03), (0.72, 0.60, 0.06), "stone")
    B.box((0, 0, 0.30), (0.62, 0.50, 0.48), "wood")
    for z in (0.16, 0.40):
        for sx in (-1, 1):
            for sy in (-1, 1):
                B.cone((sx * 0.27, sy * 0.25, z), (sx, 0, 0), 0.12, 0.045, 0.045, segs=5, mat="straw")
    gable(B, 0.38, 0.54, 0.36, -0.31, 0.31, "accent")
    B.box((0.18, 0.10, 0.85), (0.12, 0.12, 0.30), "stone")
    for sx in (-1, 1):
        B.cyl((sx * 0.16, -0.38, 0.06), 0.44, 0.03, segs=5, mat="wood")
    B.box((0, -0.36, 0.52), (0.44, 0.24, 0.04), "accent")
    B.door((0, -0.25, 0.20), FRONT, 0.14, 0.28)
    for sx in (-1, 1):
        B.window((sx * 0.18, -0.25, 0.36), FRONT, 0.09, 0.10)
        B.cone((sx * 0.06, -0.26, 0.44), (sx * 0.5, -0.2, 1.0), 0.14, 0.02, 0.0, segs=4, mat="straw")
    B.window((0.31, 0.05, 0.34), (1, 0, 0), 0.09, 0.10)
    with B.at((0.55, -0.30, 0), 0.5):
        stump(B, sprout=False)


def sand_s2b(B):
    """Market stall."""
    B.box((0, 0, 0.02), (0.90, 0.80, 0.04), "stone")
    for sx in (-1, 1):
        for sy in (-1, 1):
            B.box((sx * 0.38, sy * 0.30, 0.45), (0.06, 0.06, 0.86), "wood")
    B.box((0, 0, 0.32), (0.78, 0.40, 0.28), "accent")
    for i in range(6):
        B.box((-0.375 + 0.15 * i, -0.05, 0.95), (0.15, 0.85, 0.03), "coral" if i % 2 else "snow", rot=rot_x(12))
    B.ico((-0.22, -0.02, 0.52), 0.08, "coral", subdiv=1)
    B.ico((0.0, -0.05, 0.52), 0.08, "leaf", subdiv=1)
    B.box((0.24, 0.0, 0.50), (0.16, 0.14, 0.10), "wood")
    for sx in (-1, 1):
        B.box((sx * 0.30, -0.40, 0.84), (0.06, 0.06, 0.08), "window")
    with B.at((0.62, -0.35, 0), 0.45):
        tent(B)


def sand_s2c(B):
    """Mini ziggurat."""
    for i, (s, mat) in enumerate(((0.90, "accent"), (0.70, "ground"), (0.50, "accent"))):
        B.box((0, 0, 0.11 + 0.22 * i), (s, s, 0.22), mat)
    B.box((0, 0, 0.80), (0.30, 0.30, 0.28), "ground")
    pyramid_roof(B, (0, 0, 0.94), 0.15, 0.08, "accent")
    for i in range(6):
        B.box((0, -0.55 + 0.11 * i, 0.055 + 0.11 * i), (0.16, 0.11, 0.11), "straw")
    B.door((0, -0.15, 0.78), FRONT, 0.10, 0.18)
    for sx in (-1, 1):
        B.window((sx * 0.15, 0.0, 0.82), (sx, 0, 0), 0.08, 0.10)
    with B.at((0.70, -0.45, 0), 0.4):
        tent(B)


def meadow_s2b(B):
    """Barn."""
    B.box((0, 0, 0.03), (0.80, 0.66, 0.06), "stone")
    B.box((0, 0, 0.36), (0.66, 0.56, 0.60), "coral")
    B.extrude_xz([(-0.37, 0.62), (0.37, 0.62), (0.30, 0.84), (0.0, 1.0), (-0.30, 0.84)], -0.31, 0.31, "ink")
    B.box((0, -0.29, 0.26), (0.26, 0.02, 0.40), "snow")
    B.door((0, -0.29, 0.25), FRONT, 0.20, 0.36)
    B.box((0, -0.29, 0.47), (0.30, 0.03, 0.04), "snow")
    B.window((0, -0.31, 0.72), FRONT, 0.12, 0.12)
    for sx in (-1, 1):
        for y in (-0.15, 0.15):
            B.window((sx * 0.33, y, 0.40), (sx, 0, 0), 0.09, 0.10)
    with B.at((0.52, -0.32, 0), 0.6):
        signpost(B)


def meadow_s2c(B):
    """Bell tower."""
    B.box((0, 0, 0.04), (0.56, 0.56, 0.08), "stone")
    B.box((0, 0, 0.36), (0.34, 0.34, 0.56), "stone")
    B.box((0, 0, 0.66), (0.40, 0.40, 0.04), "snow")
    for sx in (-1, 1):
        for sy in (-1, 1):
            B.box((sx * 0.15, sy * 0.15, 0.78), (0.05, 0.05, 0.24), "wood")
    B.lathe([(0.0, 0.70), (0.09, 0.72), (0.11, 0.84), (0.05, 0.88), (0.0, 0.90)], 6, "window")
    pyramid_roof(B, (0, 0, 0.90), 0.20, 0.14, "accent")
    B.door((0, -0.17, 0.20), FRONT, 0.14, 0.26)
    B.window((0, -0.17, 0.50), FRONT, 0.09, 0.12)
    for sx in (-1, 1):
        B.window((sx * 0.17, 0.0, 0.45), (sx, 0, 0), 0.09, 0.12)
    with B.at((0.42, -0.28, 0), 0.6):
        signpost(B)


def ocean_s2b(B):
    """Boathouse."""
    B.box((0, -0.10, 0.02), (0.70, 1.0, 0.04), "water")
    B.box((0, 0.10, 0.36), (0.60, 0.60, 0.64), "snow")
    gable(B, 0.35, 0.68, 0.26, -0.24, 0.44, "accent")
    B.cyl((0.20, 0.30, 0.78), 0.24, 0.03, segs=5, mat="ink")
    B.box((0.27, 0.30, 0.98), (0.14, 0.02, 0.08), "coral")
    B.window((0, -0.20, 0.26), FRONT, 0.30, 0.40, mat="ink")
    B.cone((0, -0.25, 0.10), FRONT, 0.40, 0.11, 0.04, segs=6, mat="coral", scale=(1.2, 0.6, 1.0))
    B.window((0, -0.20, 0.56), FRONT, 0.10, 0.10)
    for sx in (-1, 1):
        B.window((sx * 0.30, 0.10, 0.45), (sx, 0, 0), 0.10, 0.12)
    with B.at((0.50, -0.45, 0), 0.5):
        buoy(B)


def ocean_s2c(B):
    """Net-drying rack."""
    for i in range(3):
        B.box((-0.28 + 0.28 * i, 0, 0.10), (0.26, 0.60, 0.06), "wood")
    for sx in (-1, 1):
        B.cyl((sx * 0.36, 0, 0.0), 1.0, 0.05, segs=6, mat="ink")
    B.cone((-0.40, 0, 0.92), (1, 0, 0), 0.80, 0.035, 0.035, segs=5, mat="wood")
    B.box((0, 0, 0.62), (0.70, 0.02, 0.55), "olive")
    for x in (-0.20, 0.0, 0.20):
        B.box((x, -0.015, 0.62), (0.02, 0.01, 0.55), "ink")
    for z in (0.45, 0.62, 0.79):
        B.box((0, -0.015, z), (0.70, 0.01, 0.02), "ink")
    for x in (-0.25, 0.0, 0.25):
        B.cone((x, -0.06, 0.90), (0, 0, -1), 0.14, 0.05, 0.0, segs=4, mat="coral", scale=(1.0, 0.4, 1.0))
    B.box((0.36, -0.08, 0.84), (0.07, 0.07, 0.09), "window")
    with B.at((-0.55, -0.30, 0), 0.5):
        buoy(B)


def volcanic_s2b(B):
    """Obsidian shrine."""
    B.cyl((0, 0, 0), 0.10, 0.46, segs=6, mat="ink", phase=math.pi / 6)
    B.cyl((0, 0, 0.10), 0.06, 0.36, segs=6, mat="stone", phase=math.pi / 6)
    B.ring(0.38, 0.46, 0.10, 0.13, 6, "coral")
    B.cyl((0, 0, 0.16), 0.03, 0.20, segs=6, mat="coral")
    B.lathe([(0.0, 0.16), (0.16, 0.30), (0.12, 0.80), (0.0, 1.0)], 5, "ink", phase=0.2)
    for a, s in ((30, 0.55), (150, 0.62), (270, 0.48), (210, 0.40), (330, 0.45)):
        B.lathe([(0.0, 0.0), (0.09, 0.12), (0.06, 0.7 * s), (0.0, s)], 5, "ink", center=polar(0.28, a, 0.16),
                rot=track_z(polar(0.35, a, 1.0)))
    B.window((0, -0.135, 0.50), FRONT, 0.05, 0.10)
    B.window((0.11, -0.06, 0.62), (0.87, -0.5, 0), 0.04, 0.08)
    B.window((-0.11, -0.06, 0.40), (-0.87, -0.5, 0), 0.04, 0.08)
    with B.at((0.60, -0.36, 0), 0.45):
        campfire(B)


def volcanic_s2c(B):
    """Steam vent house."""
    B.box((0, 0, 0.03), (0.80, 0.66, 0.06), "ink")
    B.box((0, 0, 0.30), (0.60, 0.50, 0.48), "stone")
    B.dome((0, 0, 0.54), 0.30, "ink")
    B.cyl((0.22, 0.12, 0.54), 0.30, 0.05, segs=6, mat="stone")
    B.ico((0.22, 0.12, 0.92), 0.10, "pale", jitter=0.05, seed="vent-house-a")
    B.cyl((-0.20, -0.10, 0.54), 0.22, 0.045, segs=6, mat="stone")
    B.ico((-0.20, -0.10, 0.82), 0.08, "pale", jitter=0.05, seed="vent-house-b")
    B.door((0, -0.25, 0.18), FRONT, 0.16, 0.30)
    for sx in (-1, 1):
        B.window((sx * 0.18, -0.25, 0.40), FRONT, 0.10, 0.10)
        B.window((sx * 0.30, 0.05, 0.34), (sx, 0, 0), 0.10, 0.10)
    with B.at((0.52, -0.40, 0), 0.45):
        campfire(B)


LANDMARKS = {
    "ice": {"s1": ice_s1, "s2": (ice_s2, ice_s2b, ice_s2c), "s3": ice_s3},
    "city": {"s1": city_s1, "s2": (city_s2, city_s2b, city_s2c), "s3": city_s3},
    "forest": {"s1": forest_s1, "s2": (forest_s2, forest_s2b, forest_s2c), "s3": forest_s3},
    "sand": {"s1": sand_s1, "s2": (sand_s2, sand_s2b, sand_s2c), "s3": sand_s3},
    "meadow": {"s1": meadow_s1, "s2": (meadow_s2, meadow_s2b, meadow_s2c), "s3": meadow_s3},
    "ocean": {"s1": ocean_s1, "s2": (ocean_s2, ocean_s2b, ocean_s2c), "s3": ocean_s3},
    "volcanic": {"s1": volcanic_s1, "s2": (volcanic_s2, volcanic_s2b, volcanic_s2c), "s3": volcanic_s3},
}
VARIANTS = ("a", "b", "c")
S2_NAMES = {
    "ice": ("observatory dome", "ice tower with flag", "snow chapel"),
    "city": ("clock tower", "townhouse with awning", "bell gazebo"),
    "forest": ("treehouse", "mushroom cottage", "hunter's lodge"),
    "sand": ("adobe hut", "market stall", "mini ziggurat"),
    "meadow": ("windmill", "barn", "bell tower"),
    "ocean": ("dock with hut", "boathouse", "net-drying rack"),
    "volcanic": ("forge hut", "obsidian shrine", "steam vent house"),
}


# ----------------------------------------------------------------------------- props

def round_tree(B, trunk_r, trunk_h, canopy_r, highlight=True):
    B.cyl((0, 0, 0), trunk_h, trunk_r, segs=5, mat="wood")
    B.ico((0, 0, trunk_h + canopy_r * 0.75), canopy_r, "accent", jitter=0.04, seed="tree")
    if highlight:
        B.ico((canopy_r * 0.45, canopy_r * 0.25, trunk_h + canopy_r * 1.25), canopy_r * 0.55, "ground")


def rock(B, r, mat="stone", scale=(1.0, 0.8, 0.6), seed="rock", jitter=0.09, notch=True):
    """Boulder with a smaller attached lobe so the silhouette has a notch (fill < 0.75)."""
    B.ico((0, 0, r * scale[2] * 0.7), r, mat, scale=scale, zmin=-0.7, jitter=jitter, seed=seed)
    if notch:
        B.ico((r * 0.95, -r * 0.35, r * scale[2] * 0.42), r * 0.55, mat, scale=(1.0, 0.9, 0.75), jitter=jitter,
              seed=seed + "-lobe")


def dead_tree(B, mat="wood"):
    mound(B, (0, 0), 0.22, 0.4, "stone", "dead-roots")
    B.cone((0, 0, 0), UP, 0.72, 0.10, 0.05, segs=6, mat=mat)
    for base, d, L, r in (((0, 0, 0.40), (0.7, 0.2, 0.75), 0.42, 0.055), ((0, 0, 0.52), (-0.6, -0.3, 0.7), 0.36, 0.05),
                          ((0, 0, 0.60), (0.1, 0.65, 0.85), 0.30, 0.045)):
        B.cone(base, d, L, r, 0.0, segs=4, mat=mat)


def fountain(B):
    B.ring(0.36, 0.45, 0.0, 0.16, 10, "cream2", top_in=0.14)
    B.ring(0.36, 0.47, 0.13, 0.16, 10, "accent")   # accent trim on the rim
    B.cyl((0, 0, 0), 0.11, 0.37, segs=10, mat="water")
    B.cyl((0, 0, 0.11), 0.30, 0.06, segs=6, mat="stone")
    B.cone((0, 0, 0.36), UP, 0.09, 0.07, 0.20, segs=8, mat="cream2")
    B.cyl((0, 0, 0.45), 0.03, 0.17, segs=8, mat="water")
    B.ico((0, 0, 0.51), 0.045, "water", subdiv=1)


def planter_tree(B):
    B.box((0, 0, 0.12), (0.34, 0.34, 0.24), "cream2")
    B.box((0, 0, 0.225), (0.36, 0.36, 0.03), "accent")   # trim band
    B.cyl((0, 0, 0.24), 0.30, 0.04, segs=5, mat="wood")
    B.ico((0, 0, 0.76), 0.28, "leaf", jitter=0.04, seed="planter")


def smoke_column(B, base, r0=0.05):
    """Three overlapping puffs on a stem: one connected silhouette."""
    x, y, z = base
    B.cyl((x, y, z), 0.45, r0, segs=5, mat="pale")
    B.ico((x, y, z + 0.22), 0.22, "pale", zmin=-0.22, jitter=0.05, seed="puff-a")
    B.ico((x + 0.14, y - 0.06, z + 0.40), 0.18, "pale", jitter=0.05, seed="puff-b")
    B.ico((x - 0.02, y + 0.04, z + 0.58), 0.15, "pale", jitter=0.05, seed="puff-c")


def cactus(B, big):
    if big:
        B.lathe([(0.0, 0.0), (0.12, 0.02), (0.14, 0.55), (0.10, 0.85), (0.0, 0.92)], 6, "pine")
        B.cone((0.10, 0.0, 0.42), (1, 0, 0), 0.18, 0.06, 0.06, segs=6, mat="pine")
        B.lathe([(0.06, 0.38), (0.06, 0.62), (0.0, 0.68)], 6, "pine", center=(0.28, 0.0, 0.0))
        B.cone((-0.10, 0.0, 0.55), (-1, 0, 0), 0.15, 0.05, 0.05, segs=6, mat="pine")
        B.lathe([(0.05, 0.52), (0.05, 0.72), (0.0, 0.77)], 6, "pine", center=(-0.25, 0.0, 0.0))
        B.ico((0, 0, 0.93), 0.04, "peach", subdiv=1)
    else:
        B.lathe([(0.0, 0.0), (0.09, 0.02), (0.10, 0.30), (0.07, 0.46), (0.0, 0.50)], 6, "pine")
        B.cone((0.07, 0.0, 0.24), (1, 0, 0), 0.12, 0.04, 0.04, segs=6, mat="pine")
        B.lathe([(0.04, 0.21), (0.04, 0.36), (0.0, 0.40)], 6, "pine", center=(0.19, 0.0, 0.0))
        B.ico((0, 0, 0.51), 0.03, "coral", subdiv=1)


def flower_clump(B, colour):
    rng = random.Random(f"flowers|{colour}")
    mound(B, (0, 0), 0.15, 0.5, "leaf", f"flower-mound-{colour}", sxy=(1.0, 0.9))   # stems grow out of one leaf mound
    for i in range(5):
        a = 72 * i + rng.uniform(-15, 15)
        r = 0.03 + rng.uniform(0.0, 0.05)
        h = 0.20 + rng.uniform(0.0, 0.12)
        p = polar(r, a, 0.04)
        B.cyl(p, h, 0.022, segs=4, mat="leaf")
        B.sphere(p + Vector((0, 0, h)), 0.055, colour, scale=(1.0, 1.0, 0.7), segs=5, rings=3)
    for a in (40, 160, 280):
        B.cone(polar(0.05, a, 0.03), polar(0.6, a, 0.8), 0.16, 0.05, 0.0, segs=4, mat="accent", scale=(1, 0.3, 1))


def scaled(B, s, motif):
    with B.at((0, 0, 0), s):
        motif(B)


def basalt_columns(B):
    B.cyl((0, 0, 0), 0.80, 0.20, segs=6, mat="ink", top_mat="stone")
    B.cyl((0.30, -0.10, 0), 0.50, 0.15, segs=6, mat="ink", top_mat="stone")
    B.cyl((-0.22, -0.20, 0), 0.30, 0.12, segs=6, mat="ink", top_mat="stone")


PROPS = {
    "ice": [
        ("pine-snow", lambda B: (B.cyl((0, 0, 0), 0.25, 0.06, segs=6, mat="wood"),
                                 [(B.cone((0, 0, z0), UP, h, r, 0.0, segs=6, mat="pine"),
                                   B.cone((0, 0, z0 + h * 0.5), UP, h * 0.5 + 0.02, r * 0.5 + 0.01, 0.0, segs=6,
                                          mat="snow"))
                                  for z0, r, h in ((0.18, 0.45, 0.42), (0.55, 0.34, 0.38), (0.85, 0.24, 0.35))])),
        ("ice-crystal-cluster", lambda B: (mound(B, (0, 0), 0.26, 0.5, "pale", "ice-mound"), [
            B.lathe([(0.0, 0.0), (r, 0.22 * s), (r * 0.65, 0.78 * s), (0.0, s)], 5, mat, center=p,
                    rot=track_z(d), phase=0.3)
            for p, d, s, r, mat in (((0, 0, 0.02), (0.05, -0.05, 1), 0.60, 0.12, "accent"),
                                    ((0.14, -0.06, 0.04), (0.5, -0.25, 1), 0.42, 0.09, "water"),
                                    ((-0.13, -0.05, 0.04), (-0.45, -0.2, 1), 0.46, 0.09, "accent"),
                                    ((0.02, 0.13, 0.05), (0.1, 0.6, 1), 0.34, 0.07, "pale"),
                                    ((-0.05, -0.15, 0.03), (-0.2, -0.6, 1), 0.28, 0.06, "water"))])),
        ("snow-boulder", lambda B: (rock(B, 0.34, "accent", (1.0, 0.9, 0.7), "snowb"),
                                    B.ico((-0.02, 0.02, 0.42), 0.26, "snow", scale=(1.0, 0.85, 0.35), seed="cap"))),
        ("frozen-lake-disc", lambda B: (B.cyl((0, 0, 0), 0.04, 1.0, segs=12, mat="water"),
                                        B.lathe([(0.92, 0.0), (0.92, 0.07), (1.08, 0.08), (1.18, 0.0), (0.92, 0.0)],
                                                12, "snow", closed=True),
                                        # ice shards on the far shore break the ellipse silhouette
                                        B.lathe([(0.0, 0.0), (0.14, 0.10), (0.10, 0.40), (0.0, 0.52)], 5, "accent",
                                                center=(-0.35, 0.72, 0.03), rot=track_z((-0.15, 0.1, 1.0))),
                                        B.lathe([(0.0, 0.0), (0.09, 0.06), (0.06, 0.22), (0.0, 0.30)], 5, "pale",
                                                center=(-0.58, 0.55, 0.03), rot=track_z((-0.3, 0.1, 1.0))))),
        ("dock-plank", lambda B: ([B.cyl((sx * 0.22, sy * 0.45, 0.0), 0.24, 0.035, segs=4, mat="ink")
                                   for sx in (-1, 1) for sy in (-1, 1)],
                                  [B.box((-0.20 + 0.10 * i, 0.0, 0.265), (0.09, 1.0, 0.05), "wood")
                                   for i in range(5)])),
        ("ice-block-stack", lambda B: (B.box((0, 0, 0.12), (0.46, 0.34, 0.24), "accent", rot=rot_z(8)),
                                       B.box((0.06, -0.04, 0.35), (0.34, 0.30, 0.22), "pale", rot=rot_z(-12)),
                                       B.box((-0.04, 0.04, 0.55), (0.24, 0.22, 0.18), "accent", rot=rot_z(20)),
                                       B.box((-0.04, 0.04, 0.66), (0.20, 0.18, 0.05), "snow", rot=rot_z(20)),
                                       B.box((0.30, 0.12, 0.09), (0.18, 0.16, 0.18), "pale", rot=rot_z(30)))),
    ],
    "forest": [
        ("round-tree-small", lambda B: round_tree(B, 0.05, 0.30, 0.28, highlight=False)),
        ("round-tree-large", lambda B: round_tree(B, 0.09, 0.50, 0.45)),
        ("mushroom", lambda B: (B.lathe([(0.08, 0.0), (0.07, 0.20), (0.09, 0.22)], 6, "straw"),
                                B.lathe([(0.02, 0.18), (0.24, 0.20), (0.20, 0.30), (0.08, 0.38), (0.0, 0.40)], 8,
                                        "coral"),
                                [B.ico(polar(r, a, z), 0.035, "snow", scale=(1, 1, 0.5), subdiv=1)
                                 for r, a, z in ((0.12, 250, 0.32), (0.16, 130, 0.28), (0.05, 30, 0.38))])),
        ("log", lambda B: (B.cone((0, 0.40, 0.12), FRONT, 0.80, 0.12, 0.12, segs=7, mat="wood"),
                           B.cone((0.08, 0.05, 0.18), (0.6, 0.0, 1.0), 0.14, 0.04, 0.03, segs=5, mat="wood"))),
        ("fern-clump", lambda B: [B.cone(polar(0.03, a, 0.02), polar(0.8, a, 0.75), 0.42, 0.06, 0.0, segs=4,
                                         mat="accent" if i % 2 else "leaf", scale=(1.0, 0.3, 1.0))
                                  for i, a in enumerate(range(0, 360, 51))]),
        ("rock", lambda B: rock(B, 0.30, "stone", (1.0, 0.8, 0.6), "forest-rock")),
    ],
    "city": [
        ("lamp-post", lambda B: (B.cyl((0, 0, 0), 0.08, 0.15, segs=8, mat="slate"),
                                 B.cyl((0, 0, 0.08), 0.06, 0.10, segs=8, mat="accent"),
                                 B.cyl((0, 0, 0.14), 0.90, 0.04, segs=6, mat="slate"),
                                 B.box((0, 0, 1.13), (0.22, 0.22, 0.20), "window"),
                                 B.cone((0, 0, 1.23), UP, 0.09, 0.16 * math.sqrt(2), 0.0, segs=4, mat="ink",
                                        phase=math.pi / 4),
                                 B.ico((0, 0, 1.33), 0.03, "ink", subdiv=1))),
        ("bench", lambda B: (B.box((0, 0, 0.40), (0.70, 0.28, 0.05), "wood"),
                             B.box((0, 0.13, 0.55), (0.70, 0.04, 0.20), "wood"),
                             B.box((0, 0.13, 0.66), (0.72, 0.05, 0.03), "accent"),
                             [B.box((sx * 0.28, 0.0, 0.19), (0.06, 0.26, 0.38), "slate") for sx in (-1, 1)])),
        ("small-house", lambda B: (B.box((0, 0, 0.21), (0.50, 0.45, 0.42), "cream"),
                                   gable(B, 0.30, 0.42, 0.26, -0.26, 0.26, "slate"),
                                   B.box((0.15, 0.08, 0.62), (0.08, 0.08, 0.16), "ink"),
                                   B.box((0, -0.26, 0.30), (0.20, 0.08, 0.02), "accent", rot=rot_x(18)),
                                   B.door((0.0, -0.225, 0.12), FRONT, 0.12, 0.22, mat="accent"),
                                   B.window((-0.15, -0.225, 0.26), FRONT, 0.09, 0.10),
                                   B.window((0.15, -0.225, 0.26), FRONT, 0.09, 0.10))),
        ("fountain", fountain),
        ("planter-tree", planter_tree),
        ("hedge", lambda B: (B.box((0, 0, 0.21), (0.80, 0.30, 0.40), "leaf", bevel=0.07),
                             B.box((0, 0, 0.02), (0.86, 0.36, 0.04), "cream2"),
                             B.box((0, 0, 0.045), (0.84, 0.34, 0.01), "accent"))),
    ],
    "sand": [
        ("cactus-small", lambda B: cactus(B, False)),
        ("cactus-large", lambda B: cactus(B, True)),
        ("dune-rock", lambda B: rock(B, 0.32, "accent", (1.0, 0.75, 0.5), "dune", jitter=0.07)),
        ("dead-tree", lambda B: dead_tree(B, "wood")),
        ("well", lambda B: (B.ring(0.22, 0.30, 0.0, 0.30, 8, "stone"),
                            B.cyl((0, 0, 0), 0.14, 0.23, segs=8, mat="water"),
                            [B.box((sx * 0.28, 0.0, 0.53), (0.05, 0.05, 0.46), "wood") for sx in (-1, 1)],
                            B.cone((-0.30, 0.0, 0.70), (1, 0, 0), 0.60, 0.02, 0.02, segs=5, mat="wood"),
                            gable(B, 0.36, 0.76, 0.16, -0.30, 0.30, "accent"),
                            B.box((0.0, 0.0, 0.40), (0.08, 0.08, 0.08), "wood"))),
        ("cracked-earth-tile", lambda B: (B.cyl((0, 0, 0), 0.02, 0.60, segs=8, mat="ink"),
                                          B.prism([polar(0.24, a)[:2] for a in range(0, 360, 60)], 0.02, 0.06,
                                                  "accent"),
                                          [B.prism([(0.94 * (q.x - c.x) + c.x, 0.94 * (q.y - c.y) + c.y)
                                                    for q in quad], 0.02, 0.06, "accent")
                                           for quad, c in (
                                               (qd, Vector((sum(v.x for v in qd) / 4, sum(v.y for v in qd) / 4, 0)))
                                               for qd in ([polar(0.27, a), polar(0.58, a + 4), polar(0.58, a + 56),
                                                           polar(0.27, a + 60)] for a in range(0, 360, 60)))])),
    ],
    "meadow": [
        ("flower-clump-peach", lambda B: flower_clump(B, "peach")),
        ("flower-clump-coral", lambda B: flower_clump(B, "coral")),
        ("flower-clump-lilac", lambda B: flower_clump(B, "lilac")),
        ("hay-bale", lambda B: (B.cone((0, 0.30, 0.30), FRONT, 0.60, 0.30, 0.30, segs=8, mat="straw"),
                                [B.cone((0, y, 0.30), FRONT, 0.05, 0.31, 0.31, segs=8, mat="wood")
                                 for y in (-0.13, 0.17)])),
        ("fence-segment", lambda B: ([B.box((sx * 0.45, 0.0, 0.30), (0.07, 0.07, 0.60), "wood") for sx in (-1, 1)],
                                     [B.box((0, 0, z), (1.0, 0.04, 0.07), "wood") for z in (0.25, 0.45)])),
        ("bush", lambda B: (B.ico((0, 0, 0.28), 0.30, "accent", scale=(1.0, 0.9, 0.85), zmin=-0.75, jitter=0.05,
                                  seed="bush-a"),
                            B.ico((0.24, -0.10, 0.22), 0.20, "accent", zmin=-0.9, jitter=0.05, seed="bush-b"),
                            B.ico((-0.10, -0.14, 0.42), 0.14, "leaf"))),
    ],
    "ocean": [
        ("rock-outcrop", lambda B: (rock(B, 0.34, "stone", (1.0, 0.8, 0.75), "outcrop-a"),
                                    B.ico((-0.30, -0.22, 0.09), 0.14, "stone", scale=(1.0, 0.9, 0.6), jitter=0.08,
                                          seed="outcrop-c"))),
        ("seaweed-clump", lambda B: [B.cone(polar(0.06, a, 0.0), polar(0.35, a + 40, 1.0), L, 0.05, 0.0, segs=4,
                                            mat="olive" if i % 2 else "leaf", scale=(1.0, 0.4, 1.0))
                                     for i, (a, L) in enumerate(((0, 0.45), (70, 0.38), (140, 0.50), (210, 0.34),
                                                                 (290, 0.42)))]),
        ("buoy-small", lambda B: scaled(B, 0.6, buoy)),
        ("wave-crest-tile", lambda B: (B.box((0, 0, 0.02), (1.0, 1.0, 0.04), "ground"),
                                       B.extrude_xz([(-0.30, 0.04), (0.30, 0.04), (0.25, 0.14), (0.05, 0.24),
                                                     (-0.10, 0.16), (-0.06, 0.09)], -0.40, 0.40, "accent",
                                                    rot=rot_z(90)),
                                       [B.box((x, 0.03, 0.245), (0.12, 0.14, 0.05), "snow")
                                        for x in (-0.26, 0.0, 0.26)])),
        ("shell", lambda B: (B.sphere((0, 0.0, 0.0), 0.20, "peach", scale=(1.0, 0.9, 0.42), segs=7, rings=4, zmin=0.0),
                             B.box((0, 0.17, 0.03), (0.09, 0.07, 0.06), "coral"))),
        ("starfish", lambda B: ([B.cone(polar(0.04, a, 0.03), polar(1.0, a, 0.12), 0.24, 0.055, 0.0, segs=4,
                                        mat="coral", scale=(1.0, 0.5, 1.0)) for a in range(90, 450, 72)],
                                B.ico((0, 0, 0.035), 0.07, "coral", scale=(1.0, 1.0, 0.5), subdiv=1),
                                B.ico((0, 0, 0.06), 0.025, "peach", subdiv=1))),
    ],
    "volcanic": [
        ("basalt-column", basalt_columns),
        ("ember-rock", lambda B: B.ico((0, 0, 0.21), 0.30, "ink", scale=(1.0, 0.85, 0.7), zmin=-0.7, jitter=0.08,
                                       seed="ember", facet_mat="coral", facet_every=4)),
        ("lava-puddle-disc", lambda B: (B.cyl((0, 0, 0), 0.03, 0.50, segs=10, mat="ink"),
                                        B.cyl((0, 0, 0.02), 0.035, 0.42, segs=8, mat="coral", phase=0.2),
                                        B.cyl((0.05, -0.04, 0.045), 0.03, 0.20, segs=6, mat="peach"),
                                        B.ico((-0.18, 0.08, 0.10), 0.13, "ink", scale=(1.0, 0.9, 0.8), jitter=0.08,
                                              seed="lava-rock"))),
        ("dead-tree", lambda B: dead_tree(B, "ink")),
        ("smoke-puff-cluster", lambda B: smoke_column(B, (0, 0, 0))),
        ("geyser-vent", lambda B: (B.lathe([(0.45, 0.0), (0.36, 0.14), (0.20, 0.30), (0.16, 0.30), (0.16, 0.24),
                                            (0.0, 0.24)], 7, "accent", phase=0.3),
                                   B.cyl((0, 0, 0.24), 0.02, 0.15, segs=7, mat="ink"),
                                   B.ico((0.02, -0.02, 0.50), 0.13, "pale", jitter=0.05, seed="vent-a"),
                                   B.ico((-0.04, 0.03, 0.70), 0.09, "pale", jitter=0.05, seed="vent-b"))),
    ],
}


# ----------------------------------------------------------------------------- terrain (one per biome)
# Sub-region scale pieces, 1.5-2.2 m tall, < 1600 triangles, one connected silhouette.

def terrain_mountain_cone(B):
    B.lathe([(1.03, 0.0), (0.85, 0.45), (0.56, 1.17), (0.40, 1.57)], 7, "accent", phase=0.2)
    B.lathe([(0.43, 1.54), (0.22, 1.85), (0.0, 2.10)], 7, "snow", phase=0.2)


def terrain_hill_with_trees(B):
    r, sz, sxy = 1.25, 0.5, (1.0, 0.85)
    mound(B, (0, 0), r, sz, "ground", "hill", jitter=0.03, sxy=sxy)
    for xy, s, big in (((0.0, 0.10), 0.85, True), ((-0.72, -0.30), 0.7, False), ((0.62, -0.42), 0.6, False)):
        with B.at((xy[0], xy[1], mound_z(xy, r, sz, sxy) - 0.06), s):
            if big:
                round_tree(B, 0.09, 0.50, 0.45)
            else:
                round_tree(B, 0.05, 0.30, 0.28, highlight=False)
    xy = (0.45, 0.55)
    with B.at((xy[0], xy[1], mound_z(xy, r, sz, sxy) - 0.05), 0.7):
        rock(B, 0.30, "stone", (1.0, 0.8, 0.6), "hill-rock", notch=False)


def terrain_plaza_slab(B):
    B.cyl((0, 0, 0), 0.12, 1.45, segs=8, mat="stone", phase=math.pi / 8)
    B.cyl((0, 0, 0.12), 0.10, 1.15, segs=8, mat="ground", phase=math.pi / 8)
    with B.at((0, 0, 0.22), 2.5):
        fountain(B)
    for sx in (-1, 1):
        for sy in (-1, 1):
            with B.at((sx * 0.98, sy * 0.98, 0.12), 0.9):
                planter_tree(B)
    for sx in (-1, 1):
        B.box((sx * 0.75, -0.95, 0.12 + 0.36), (0.55, 0.22, 0.04), "wood")
        B.box((sx * 0.75, -0.85, 0.12 + 0.48), (0.55, 0.04, 0.16), "wood")
        for dx in (-0.22, 0.22):
            B.box((sx * 0.75 + dx, -0.95, 0.12 + 0.17), (0.05, 0.20, 0.34), "ink")


def terrain_dune(B):
    r, sz, sxy = 1.3, 0.42, (1.0, 0.7)
    mound(B, (0, 0), r, sz, "ground", "dune-a", jitter=0.03, sxy=sxy)
    mound(B, (0.55, -0.35), 0.8, 0.5, "accent", "dune-b", jitter=0.04, sxy=(1.0, 0.8))
    xy = (-0.25, 0.10)
    with B.at((xy[0], xy[1], mound_z(xy, r, sz, sxy) - 0.05), 0.9):
        cactus(B, True)
    xy = (0.75, 0.30)
    with B.at((xy[0], xy[1], mound_z(xy, r, sz, sxy) - 0.05), 0.8):
        dead_tree(B, "wood")


def terrain_grassy_knoll(B):
    r, sz, sxy = 1.2, 0.5, (1.0, 0.9)
    mound(B, (0, 0), r, sz, "ground", "knoll", jitter=0.03, sxy=sxy)
    xy = (0.10, 0.10)
    with B.at((xy[0], xy[1], mound_z(xy, r, sz, sxy) - 0.06), 0.8):
        round_tree(B, 0.09, 0.50, 0.45)
    xy = (-0.60, -0.55)
    with B.at((xy[0], xy[1], mound_z(xy, r, sz, sxy) - 0.08), 0.9, rot=rot_z(-30)):
        for sx in (-1, 1):
            B.box((sx * 0.45, 0.0, 0.30), (0.07, 0.07, 0.60), "wood")
        for z in (0.25, 0.45):
            B.box((0, 0, z), (1.0, 0.04, 0.07), "wood")
    xy = (0.62, -0.50)
    with B.at((xy[0], xy[1], mound_z(xy, r, sz, sxy) - 0.04), 1.0):
        flower_clump(B, "peach")
    xy = (0.55, 0.65)
    with B.at((xy[0], xy[1], mound_z(xy, r, sz, sxy) - 0.05), 0.8):
        rock(B, 0.28, "stone", (1.0, 0.75, 0.55), "knoll-stone", notch=False)


def terrain_sea_stack(B):
    B.lathe([(0.55, 0.0), (0.62, 0.35), (0.48, 0.90), (0.52, 1.35), (0.36, 1.75), (0.30, 1.85)], 7, "stone",
            phase=0.3)
    B.ico((0.02, 0.0, 1.86), 0.34, "leaf", scale=(1.0, 1.0, 0.45), jitter=0.05, seed="stack-grass")
    B.lathe([(0.55, 0.0), (0.85, 0.0), (0.85, 0.06), (0.55, 0.06), (0.55, 0.0)], 10, "snow", closed=True)
    B.ico((0.72, -0.38, 0.12), 0.22, "stone", scale=(1.0, 0.9, 0.6), jitter=0.08, seed="stack-rock")
    B.ico((-0.62, 0.42, 0.08), 0.16, "stone", scale=(1.0, 0.9, 0.6), jitter=0.08, seed="stack-rock2")


def terrain_caldera_rim(B):
    B.lathe([(1.45, 0.0), (1.10, 0.70), (0.72, 1.30), (0.50, 1.42), (0.44, 1.42), (0.44, 1.22), (0.0, 1.22)], 8,
            "accent", phase=0.2)
    B.cyl((0, 0, 1.20), 0.04, 0.44, segs=8, mat="coral", phase=0.2)
    n = Vector((0.0, -0.894, 0.447))
    B.box(Vector((0.0, -1.275, 0.35)) + n * 0.03, (0.20, 0.06, 0.62), "coral", rot=rot_x(-26.6))
    smoke_column(B, (0, 0, 1.30), r0=0.09)
    with B.at((1.15, -0.65, 0), 0.8):
        basalt_columns(B)


# ----------------------------------------------------------------------------- shape kit for the nine new families

def hut(B, w, d, h, wall, roof, roof_h=None, z0=0.0, door=True, windows=True, door_mat="ink"):
    roof_h = roof_h if roof_h is not None else h * 0.5
    B.box((0, 0, z0 + h / 2), (w, d, h), wall)
    gable(B, w / 2 + 0.03, z0 + h, roof_h, -d / 2 - 0.03, d / 2 + 0.03, roof)
    if door:
        B.door((0, -d / 2, z0 + h * 0.3), FRONT, min(0.16, w * 0.3), h * 0.55, mat=door_mat)
    if windows:
        for sx in (-1, 1):
            B.window((sx * w / 2, 0, z0 + h * 0.6), (sx, 0, 0), 0.09, 0.10)
    return z0 + h + roof_h


def flagpole(B, base, h, cloth="accent", pole="wood", r=0.02, pennant=True):
    x, y, z = base
    B.cyl((x, y, z), h, r, segs=5, mat=pole)
    if pennant:
        B.extrude_xz([(0.0, z + h - 0.16), (0.24, z + h - 0.10), (0.0, z + h - 0.02)], y - 0.012, y + 0.012, cloth,
                     center=(x, 0, 0))
    else:
        B.box((x + 0.11, y, z + h - 0.09), (0.22, 0.02, 0.14), cloth)
    B.ico((x, y, z + h + 0.02), r * 1.6, "window", subdiv=1)


def torch(B, p, h=0.5, pole="wood", flame="peach"):
    x, y, z = p
    B.cyl((x, y, z), h, 0.04, segs=5, mat=pole)
    B.cyl((x, y, z + h - 0.06), 0.06, 0.055, segs=5, mat="ink")
    B.cone((x, y, z + h - 0.02), UP, 0.14, 0.055, 0.0, segs=5, mat=flame)
    B.cone((x + 0.02, y, z + h), UP, 0.09, 0.03, 0.0, segs=4, mat="window")


def crystal(B, p, s, mat, d=(0, 0, 1), r=None):
    r = r if r is not None else s * 0.22
    B.lathe([(0.0, 0.0), (r, s * 0.22), (r * 0.65, s * 0.78), (0.0, s)], 5, mat, center=p, rot=track_z(d), phase=0.3)


def gear(B, p, r, mat="ink", axis="Y", teeth=8, thick=0.05):
    rot = {"Y": track_z((0, 1, 0)), "Z": None, "X": track_z((1, 0, 0))}[axis]
    x, y, z = p
    with B.at((x, y, z), 1.0, rot=rot):
        B.cyl((0, 0, -thick / 2), thick, r, segs=8, mat=mat)
        for k in range(teeth):
            a = 360.0 * k / teeth
            B.box(polar(r, a, 0.0), (r * 0.35, r * 0.28, thick), mat, rot=rot_z(a))
        B.cyl((0, 0, -thick / 2 - 0.005), thick + 0.01, r * 0.3, segs=6, mat="window")


def lantern(B, p, glow="window", frame="ink", size=0.12):
    x, y, z = p
    B.box((x, y, z + size * 0.5), (size, size, size), glow)
    B.cone((x, y, z + size), UP, size * 0.4, size * 0.75 * math.sqrt(2), 0.0, segs=4, mat=frame, phase=math.pi / 4)
    B.box((x, y, z - 0.01), (size * 1.1, size * 1.1, 0.02), frame)


def palm(B, p, h=0.9, trunk="wood", leaf="pine", lean=(0.15, -0.05)):
    x, y, z = p
    d = Vector((lean[0], lean[1], 1.0)).normalized()
    B.cone((x, y, z), d, h, 0.10, 0.07, segs=5, mat=trunk)
    top = Vector((x, y, z)) + d * h
    for a in range(0, 360, 60):
        B.cone(top, polar(1.0, a, 0.05 if a % 120 else -0.15), 0.50, 0.17, 0.0, segs=4, mat=leaf, scale=(1, 0.6, 1))
    B.ico(top, 0.06, "coral", subdiv=1)


def willow(B, p, h=0.9, trunk="wood", leaf="leaf"):
    x, y, z = p
    B.cone((x, y, z), UP, h * 0.7, 0.10, 0.06, segs=6, mat=trunk)
    B.ico((x, y, z + h * 0.78), h * 0.30, leaf, scale=(1.0, 1.0, 0.55), jitter=0.05, seed="willow")
    for a in range(0, 360, 45):
        q = polar(h * 0.27, a, z + h * 0.55)
        B.cone((x + q.x, y + q.y, q.z), (0, 0, -1), h * 0.45, h * 0.045, h * 0.02, segs=4, mat=leaf)


def headstone(B, p, mat="stone", w=0.16, h=0.24):
    x, y, z = p
    B.box((x, y, z + h * 0.45), (w, 0.06, h * 0.9), mat)
    B.cone((x, y - 0.03, z + h * 0.9), (0, 1, 0), 0.06, w / 2, w / 2, segs=8, mat=mat)


def barrel(B, p, r=0.14, h=0.34, mat="wood", band="ink"):
    x, y, z = p
    B.lathe([(r * 0.85, 0.0), (r, h * 0.3), (r, h * 0.7), (r * 0.85, h)], 8, mat, center=(x, y, z))
    for zz in (h * 0.25, h * 0.75):
        B.cyl((x, y, z + zz - 0.015), 0.03, r * 1.03, segs=8, mat=band)


def wheel(B, p, r, axis="X", mat="ink", hub="stone"):
    x, y, z = p
    d = (1, 0, 0) if axis == "X" else (0, 1, 0)
    B.cone((x - d[0] * 0.03, y - d[1] * 0.03, z), d, 0.06, r, r, segs=8, mat=mat)
    B.cone((x - d[0] * 0.04, y - d[1] * 0.04, z), d, 0.08, r * 0.35, r * 0.35, segs=6, mat=hub)


def ring_wall(B, r, h, segs, mat, z0=0.0, crenel=True):
    B.lathe([(r, z0), (r, z0 + h), (r - 0.12, z0 + h), (r - 0.12, z0), (r, z0)], segs, mat, closed=True)
    if crenel:
        for k in range(segs):
            q = polar(r - 0.06, 360.0 * k / segs + 180.0 / segs, z0 + h + 0.05)
            B.box(q, (0.14, 0.12, 0.10), mat, rot=rot_z(360.0 * k / segs + 180.0 / segs))


def smoke(B, p, r=0.10, stem=0.06, subdiv=2):
    x, y, z = p
    B.cyl((x, y, z), stem, 0.6 * r, segs=5, mat="pale")
    B.ico((x, y, z + stem + r * 0.8), r, "pale", subdiv=subdiv, jitter=0.05, seed=f"smk{x:.2f}{y:.2f}")


def star(B, p, r=0.08, mat="window"):
    """Flat comic star lying against whatever it is attached to."""
    x, y, z = p
    for a in range(90, 450, 72):
        B.cone((x, y, z), polar(1.0, a, 0.0), r, r * 0.3, 0.0, segs=4, mat=mat, scale=(1.0, 0.5, 1.0))
    B.ico((x, y, z), r * 0.3, mat, subdiv=1)


# ----------------------------------------------------------------------------- new families: landmarks

def space_s1(B):
    B.cyl((0, 0, 0), 0.05, 0.42, segs=10, mat="alt")
    for a in (200, 330):
        B.box(polar(0.22, a, 0.06), (0.12, 0.08, 0.03), "ink", rot=rot_z(a))
    B.cyl((0, 0, 0.04), 0.10, 0.09, segs=6, mat="snow")
    flagpole(B, (0, 0, 0.12), 0.40, cloth="accent2", pole="snow", r=0.03)


def space_flag(B, base, h=0.3):
    flagpole(B, base, h, cloth="accent2", pole="snow", r=0.02)


def space_s2(B):
    B.cyl((0, 0, 0), 0.15, 0.44, segs=10, mat="snow")
    B.ring_windows(0.44, 0.08, (210, 270, 330), 0.10, 0.06)
    dome = B.dome((0, 0, 0.15), 0.42, "water")
    B.paint_above(dome, 0.50, "pale")
    B.cone((0, -0.30, 0.14), FRONT, 0.32, 0.14, 0.14, segs=8, mat="alt")
    B.door((0, -0.62, 0.14), FRONT, 0.14, 0.18)
    B.cyl((0, 0, 0.56), 0.06, 0.06, segs=6, mat="snow")
    space_flag(B, (0, 0, 0.60), 0.38)
    with B.at((0.62, -0.30, 0), 0.45):
        space_s1(B)


def space_s2b(B):
    for a in (90, 210, 330):
        q = polar(0.32, a, 0.0)
        B.cone(q, (-q.x * 0.6, -q.y * 0.6, 0.5), 0.62, 0.035, 0.03, segs=5, mat="ink")
    B.cyl((0, 0, 0.44), 0.10, 0.10, segs=6, mat="ink")
    with B.at((0, -0.05, 0.55), 1.0, rot=rot_x(-35)):
        B.lathe([(0.0, 0.0), (0.30, 0.04), (0.42, 0.14), (0.44, 0.16), (0.0, 0.10)], 10, "snow")
        B.cyl((0, 0, 0.10), 0.30, 0.02, segs=4, mat="ink")
        B.ico((0, 0, 0.42), 0.04, "accent2", subdiv=1)
        space_flag(B, (0.0, 0.0, 0.14), 0.24)
    B.box((0.16, 0.24, 0.15), (0.36, 0.26, 0.30), "accent")
    B.window((0.16, 0.11, 0.16), FRONT, 0.10, 0.10)
    B.window((0.34, 0.24, 0.16), (1, 0, 0), 0.10, 0.10)
    with B.at((-0.34, -0.28, 0), 0.4):
        space_s1(B)


def space_s2c(B):
    B.box((0, 0, 0.30), (0.70, 0.56, 0.60), "alt")
    B.dome((0, 0, 0.60), 0.35, "alt", scale=(1.0, 0.8, 0.5))
    B.window((0, -0.28, 0.26), FRONT, 0.40, 0.40, mat="ink")
    B.box((0, -0.42, 0.14), (0.30, 0.26, 0.16), "accent")
    B.window((0, -0.55, 0.16), FRONT, 0.16, 0.06)
    for sx in (-1, 1):
        wheel(B, (sx * 0.17, -0.42, 0.08), 0.08)
        B.window((sx * 0.35, 0.10, 0.36), (sx, 0, 0), 0.10, 0.10)
    B.cyl((0, -0.20, 0.66), 0.08, 0.04, segs=5, mat="snow")
    space_flag(B, (0, -0.20, 0.72), 0.30)
    with B.at((0.60, -0.42, 0), 0.4):
        space_s1(B)


def space_s3(B):
    B.cyl((0, 0, 0), 0.10, 0.55, segs=10, mat="alt")
    for sx in (-1, 1):
        for sy in (-1, 1):
            B.box((0.26 + sx * 0.11, sy * 0.11, 0.85), (0.08, 0.08, 1.50), "ink")
    for z in (0.5, 0.9, 1.3):
        B.box((0.26, 0, z), (0.30, 0.30, 0.04), "ink")
        B.box((0.06, 0, z + 0.02), (0.20, 0.06, 0.03), "accent")
    B.lathe([(0.0, 0.10), (0.16, 0.12), (0.17, 1.10), (0.10, 1.40), (0.0, 1.55)], 8, "snow", center=(-0.10, 0, 0))
    B.cyl((-0.10, 0, 0.60), 0.10, 0.175, segs=8, mat="accent")
    for a in (90, 210, 330):
        q = polar(0.17, a, 0.12)
        B.cone((q.x - 0.10, q.y, q.z), polar(1.0, a, 0.9), 0.24, 0.12, 0.0, segs=3, mat="accent2", scale=(1, 0.5, 1))
    B.window((-0.10, -0.165, 0.90), FRONT, 0.08, 0.10)
    B.cyl((-0.10, 0, 1.55), 0.14, 0.03, segs=4, mat="snow")
    B.extrude_xz([(0.0, 1.60), (0.20, 1.66), (0.0, 1.74)], -0.03, 0.03, "accent2", center=(-0.10, 0, 0))
    with B.at((-0.52, -0.32, 0.10), 0.5):
        space_s2(B)


def lab_flask(B, p, s=1.0, glass="snow", liquid="accent"):
    x, y, z = p
    with B.at((x, y, z), s):
        B.lathe([(0.0, 0.0), (0.18, 0.02), (0.20, 0.12), (0.08, 0.28), (0.07, 0.38), (0.09, 0.40), (0.0, 0.41)], 8, glass)
        B.cyl((0, 0, 0.13), 0.04, 0.205, segs=8, mat=liquid)


def lab_s1(B):
    B.cyl((0, 0, 0), 0.10, 0.36, segs=8, mat="snow")
    B.cyl((0, 0, 0.10), 0.03, 0.28, segs=8, mat="accent2")
    lab_flask(B, (0, 0, 0.13), 1.15)
    B.ring_windows(0.36, 0.05, (210, 270, 330), 0.10, 0.05)


def lab_s2(B):
    B.cyl((0, 0, 0), 0.08, 0.38, segs=6, mat="snow", phase=math.pi / 6)
    B.cyl((0, 0, 0.08), 0.64, 0.28, segs=6, mat="water", phase=math.pi / 6)
    B.cyl((0, 0, 0.40), 0.06, 0.31, segs=6, mat="accent2", phase=math.pi / 6)
    lab_flask(B, (0, 0, 0.72), 0.7)
    B.door((0, -0.2425, 0.24), FRONT, 0.14, 0.26)
    B.ring_windows(0.2425, 0.58, (210, 330), 0.10, 0.10)
    with B.at((0.60, -0.30, 0), 0.5):
        lab_s1(B)


def lab_s2b(B):
    B.box((0, 0, 0.05), (0.90, 0.56, 0.10), "snow")
    for sx in (-1, 1):
        B.cyl((sx * 0.24, 0, 0.10), 0.72, 0.14, segs=8, mat="water")
        B.cyl((sx * 0.24, 0, 0.10), 0.10, 0.16, segs=8, mat="ink")
        B.cyl((sx * 0.24, 0, 0.78), 0.06, 0.16, segs=8, mat="ink")
        B.window((sx * 0.24, -0.14, 0.40), FRONT, 0.08, 0.14, mat="accent")
    B.cone((-0.24, 0, 0.90), (1, 0, 0), 0.48, 0.05, 0.05, segs=6, mat="accent2")
    for sx in (-1, 1):
        B.cyl((sx * 0.24, 0, 0.84), 0.06, 0.05, segs=6, mat="accent2")
    B.box((0, -0.40, 0.18), (0.30, 0.22, 0.04), "snow")
    B.box((0, -0.40, 0.08), (0.04, 0.04, 0.16), "ink")
    lab_flask(B, (0, -0.40, 0.20), 0.55)
    with B.at((0.66, -0.36, 0), 0.45):
        lab_s1(B)


def lab_s2c(B):
    B.cyl((0, 0, 0), 0.50, 0.32, segs=8, mat="snow")
    B.dome((0, 0, 0.50), 0.32, "snow", scale=(1, 1, 0.5))
    B.ring_windows(0.32, 0.25, (210, 270, 330), 0.10, 0.12, mat="accent2")
    B.cyl((0, 0, 0.62), 0.16, 0.03, segs=5, mat="accent")
    B.cyl((0, 0, 0.78), 0.03, 0.30, segs=8, mat="accent")
    lab_flask(B, (0, 0, 0.81), 0.5, glass="accent", liquid="accent2")
    with B.at((0.58, -0.30, 0), 0.5):
        lab_s1(B)


def lab_s3(B):
    B.cyl((0, 0, 0), 0.10, 0.72, segs=8, mat="snow")
    for x, h in ((-0.26, 1.30), (0.30, 1.10)):
        B.cyl((x, 0, 0.10), h, 0.20, segs=6, mat="water", phase=math.pi / 6)
        B.door((x, -0.173, 0.24), FRONT, 0.12, 0.24)
        B.ring_windows(0.173, 0.60, (240, 300), 0.08, 0.10) if x < 0 else None
    for z in (0.55, 0.95, 1.20):
        B.cyl((-0.26, 0, z), 0.05, 0.23, segs=6, mat="accent2", phase=math.pi / 6)
    B.cone((-0.26, 0, 0.80), (1, 0, 0), 0.56, 0.06, 0.06, segs=6, mat="snow")
    B.cyl((-0.26, 0, 1.40), 0.05, 0.05, segs=6, mat="ink")
    with B.at((-0.26, 0, 1.44), 0.85):
        B.lathe([(0.0, 0.0), (0.18, 0.02), (0.20, 0.12), (0.08, 0.28), (0.07, 0.38), (0.09, 0.40), (0.0, 0.41)], 8, "window")
    with B.at((0.30, 0, 1.20), 0.6):
        lab_flask(B, (0, 0, 0), 0.8)
    with B.at((0.62, -0.42, 0.06), 0.45):
        lab_s1(B)


def medieval_banner(B, p, h=0.5, pole="wood", cloth="accent"):
    x, y, z = p
    B.cyl((x, y, z), h, 0.022, segs=5, mat=pole)
    B.box((x, y, z + h - 0.02), (0.20, 0.03, 0.03), pole)
    B.extrude_xz([(-0.09, h - 0.30), (0.0, h - 0.36), (0.09, h - 0.30), (0.09, h - 0.04), (-0.09, h - 0.04)],
                 -0.012, 0.012, cloth, center=(x, y, z))
    B.ico((x, y, z + h + 0.02), 0.03, "accent2", subdiv=1)


def medieval_s1(B):
    B.box((0, 0, 0.06), (0.50, 0.50, 0.12), "stone")
    B.box((0, 0, 0.16), (0.30, 0.30, 0.08), "accent2")
    medieval_banner(B, (0, 0, 0.20), 0.36)
    B.box((0.20, -0.20, 0.16), (0.10, 0.10, 0.08), "stone")


def medieval_s2(B):
    for sx in (-1, 1):
        B.cyl((sx * 0.32, 0, 0), 0.72, 0.16, segs=8, mat="stone")
        B.cone((sx * 0.32, 0, 0.72), UP, 0.22, 0.19, 0.0, segs=8, mat="accent")
        B.window((sx * 0.32, -0.16, 0.45), FRONT, 0.08, 0.12)
    B.box((0, 0, 0.30), (0.36, 0.30, 0.60), "stone")
    B.window((0, -0.15, 0.20), FRONT, 0.18, 0.36, mat="ink")
    B.dome((0, -0.155, 0.38), 0.09, "ink", scale=(1, 0.2, 1))
    medieval_banner(B, (0, -0.10, 0.60), 0.42)
    with B.at((0.66, -0.34, 0), 0.5):
        medieval_s1(B)


def medieval_s2b(B):
    B.lathe([(0.34, 0.0), (0.26, 0.5), (0.22, 0.66)], 8, "stone")
    B.dome((0, 0, 0.66), 0.23, "wood")
    B.cone((0, -0.22, 0.72), FRONT, 0.10, 0.035, 0.035, segs=6, mat="ink")
    for k in range(4):
        r = rot_y(45 + 90 * k)
        B.box(Vector((0, -0.31, 0.72)) + r @ Vector((0, 0, 0.19)), (0.12, 0.02, 0.32), "accent2", rot=r)
    B.door((0, -0.335, 0.20), FRONT, 0.12, 0.22)
    B.window((0.26, 0.0, 0.42), (1, 0, 0), 0.08, 0.10)
    medieval_banner(B, (0.05, 0.05, 0.84), 0.22)
    with B.at((0.58, -0.28, 0), 0.5):
        medieval_s1(B)


def medieval_s2c(B):
    B.box((0, 0, 0.03), (0.80, 0.64, 0.06), "stone")
    for sx in (-1, 1):
        for sy in (-1, 1):
            B.box((sx * 0.32, sy * 0.24, 0.30), (0.07, 0.07, 0.54), "wood")
    B.box((0, 0, 0.14), (0.66, 0.44, 0.16), "accent2")
    gable(B, 0.42, 0.57, 0.30, -0.34, 0.34, "accent")
    for x in (-0.30, -0.10, 0.10, 0.30):
        B.box((x, 0, 0.60), (0.06, 0.72, 0.30), "accent2", rot=None)
    B.box((0, -0.24, 0.40), (0.60, 0.04, 0.06), "wood")
    for x in (-0.22, 0.22):
        medieval_banner(B, (x, -0.36, 0.44), 0.30)
    B.window((0.33, 0.0, 0.42), (1, 0, 0), 0.10, 0.10)
    with B.at((0.66, -0.40, 0), 0.45):
        medieval_s1(B)


def medieval_s3(B):
    B.box((0, 0, 0.55), (0.90, 0.90, 1.10), "stone")
    B.box((0, 0, 1.13), (0.96, 0.96, 0.06), "accent2")
    for sx in (-1, 1):
        for sy in (-1, 1):
            B.cyl((sx * 0.42, sy * 0.42, 0), 1.30, 0.14, segs=8, mat="stone")
            B.cone((sx * 0.42, sy * 0.42, 1.30), UP, 0.24, 0.17, 0.0, segs=8, mat="accent")
            B.window((sx * 0.42, sy * 0.42 - 0.14, 0.95), FRONT, 0.07, 0.11) if sy < 0 else None
    B.window((0, -0.45, 0.24), FRONT, 0.22, 0.44, mat="ink")
    B.dome((0, -0.455, 0.46), 0.11, "ink", scale=(1, 0.2, 1))
    for x in (-0.20, 0.20):
        B.window((x, -0.45, 0.80), FRONT, 0.10, 0.14)
    medieval_banner(B, (0, 0, 1.16), 0.64)
    with B.at((0.70, -0.62, 0), 0.4):
        medieval_s1(B)


def jungle_s1(B):
    B.cyl((0, 0, 0), 0.04, 0.42, segs=10, mat="straw")
    for sx in (-1, 1):
        torch(B, (sx * 0.20, 0.0, 0.04), 0.43)
    B.box((0, -0.20, 0.10), (0.16, 0.12, 0.12), "stone")


def jungle_s2(B):
    for sx in (-1, 1):
        for sy in (-1, 1):
            B.cyl((sx * 0.26, sy * 0.22, 0), 0.36, 0.04, segs=5, mat="wood")
    B.box((0, 0, 0.40), (0.62, 0.52, 0.06), "wood")
    B.box((0, 0, 0.62), (0.50, 0.42, 0.38), "straw")
    B.cone((0, 0, 0.80), UP, 0.24, 0.48, 0.0, segs=4, mat="accent", phase=math.pi / 4)
    B.door((0, -0.21, 0.58), FRONT, 0.14, 0.24)
    for sx in (-1, 1):
        B.window((sx * 0.25, 0.0, 0.66), (sx, 0, 0), 0.10, 0.10)
        torch(B, (sx * 0.20, -0.32, 0.43), 0.34)
    B.box((0, -0.30, 0.20), (0.16, 0.02, 0.40), "wood")
    with B.at((0.48, -0.30, 0), 0.5):
        jungle_s1(B)


def jungle_s2b(B):
    B.box((0, 0, 0.10), (0.70, 0.60, 0.20), "stone")
    B.box((0, 0, 0.60), (0.48, 0.40, 0.80), "stone")
    B.box((0, -0.21, 0.72), (0.34, 0.06, 0.10), "ink")
    B.box((0, -0.22, 0.50), (0.14, 0.06, 0.16), "ink")
    for sx in (-1, 1):
        B.box((sx * 0.14, -0.21, 0.74), (0.08, 0.02, 0.06), "window")
        B.box((sx * 0.30, -0.10, 0.36), (0.14, 0.14, 0.14), "stone")
        B.cyl((sx * 0.30, -0.10, 0.43), 0.06, 0.08, segs=6, mat="ink")
        B.cone((sx * 0.30, -0.10, 0.48), UP, 0.16, 0.06, 0.0, segs=5, mat="peach")
    B.ico((0.10, 0.10, 1.02), 0.14, "leaf", scale=(1.2, 1.0, 0.5), jitter=0.05, seed="moss")
    B.ico((-0.22, 0.05, 0.85), 0.10, "leaf", jitter=0.05, seed="moss2")
    with B.at((0.68, -0.38, 0), 0.45):
        jungle_s1(B)


def jungle_s2c(B):
    palm(B, (-0.40, 0.0, 0.0), 0.95, lean=(-0.1, 0.0))
    palm(B, (0.40, 0.0, 0.0), 0.90, lean=(0.1, 0.0))
    B.box((0, 0, 0.42), (0.76, 0.30, 0.06), "wood")
    for x in (-0.30, 0.30):
        B.box((x, -0.16, 0.50), (0.06, 0.06, 0.16), "wood")
    B.box((0, -0.16, 0.58), (0.62, 0.05, 0.05), "straw")
    for sx in (-1, 1):
        B.box((sx * 0.20, 0.0, 0.32), (0.04, 0.30, 0.18), "wood")
    torch(B, (0.0, 0.10, 0.44), 0.36)
    B.window((0, 0.14, 0.50), (0, 1, 0), 0.10, 0.08)
    with B.at((0.0, -0.44, 0), 0.45):
        jungle_s1(B)


def jungle_s3(B):
    for i, s in enumerate((1.30, 1.00, 0.70)):
        B.box((0, 0, 0.2 + 0.4 * i), (s, s, 0.40), "stone")
    B.box((0, 0, 1.32), (0.44, 0.44, 0.24), "accent")
    B.cone((0, 0, 1.44), UP, 0.36, 0.34, 0.0, segs=4, mat="accent", phase=math.pi / 4)
    B.box((0, -0.36, 0.80), (0.24, 0.02, 0.36), "ink")
    for sx in (-1, 1):
        B.box((sx * 0.08, -0.36, 0.88), (0.06, 0.02, 0.05), "window")
    B.box((0.30, -0.55, 0.62), (0.16, 0.12, 1.20), "water")
    B.box((0.30, -0.66, 0.36), (0.20, 0.10, 0.72), "water")
    B.cyl((0.30, -0.85, 0.0), 0.05, 0.32, segs=8, mat="water")
    B.ico((0.30, -0.85, 0.06), 0.10, "pale", scale=(1, 1, 0.5), jitter=0.05, seed="mist")
    for sx in (-1, 1):
        torch(B, (sx * 0.50, -0.55, 0.40), 0.36)
    with B.at((-0.55, -0.60, 0), 0.4):
        jungle_s1(B)


def wildwest_horseshoe(B, p, r=0.07, mat="ink", d=(0, -1, 0)):
    with B.at(p, 1.0, rot=track("Y", d, "Z")):
        B.lathe([(r - 0.02, -0.015), (r + 0.02, -0.015), (r + 0.02, 0.015), (r - 0.02, 0.015), (r - 0.02, -0.015)], 6,
                mat, closed=True)


def wildwest_s1(B):
    B.cyl((0, 0, 0), 0.06, 0.34, segs=8, mat="alt")
    B.box((0, 0, 0.30), (0.10, 0.10, 0.52), "wood")
    B.box((0, 0, 0.56), (0.50, 0.08, 0.06), "wood")
    B.lathe([(0.06, -0.02), (0.09, -0.02), (0.09, 0.02), (0.06, 0.02), (0.06, -0.02)], 6, "straw", closed=True,
            center=(-0.20, 0.0, 0.50), rot=rot_x(90))
    wildwest_horseshoe(B, (0, -0.06, 0.40))
    with B.at((0.26, -0.14, 0.06), 0.6):
        cactus(B, False)


def wildwest_s2(B):
    B.box((0, 0, 0.03), (0.86, 0.70, 0.06), "wood")
    B.box((0, 0.05, 0.36), (0.64, 0.50, 0.60), "accent2")
    B.box((0, -0.22, 0.48), (0.70, 0.04, 0.96), "wood")
    B.box((0, -0.22, 0.98), (0.74, 0.06, 0.06), "accent")
    B.box((0, -0.32, 0.50), (0.70, 0.20, 0.04), "wood")
    for x in (-0.31, 0.31):
        B.box((x, -0.38, 0.25), (0.05, 0.05, 0.50), "wood")
        B.box((x, -0.38, 0.62), (0.05, 0.05, 0.20), "wood")
    B.box((0, -0.40, 0.66), (0.66, 0.02, 0.04), "wood")
    B.door((0, -0.24, 0.20), FRONT, 0.16, 0.30, mat="accent")
    for x in (-0.20, 0.20):
        B.window((x, -0.24, 0.80), FRONT, 0.10, 0.12)
    wildwest_horseshoe(B, (0, -0.27, 0.62), 0.06)
    with B.at((0.62, -0.42, 0), 0.5):
        wildwest_s1(B)


def wildwest_s2b(B):
    for sx in (-1, 1):
        for sy in (-1, 1):
            B.cone((sx * 0.26, sy * 0.26, 0), (-sx * 0.2, -sy * 0.2, 1.0), 0.86, 0.03, 0.02, segs=4, mat="wood")
    for z in (0.30, 0.60):
        B.box((0, 0, z), (0.40 - z * 0.3, 0.40 - z * 0.3, 0.04), "wood")
    B.cyl((0, 0, 0.84), 0.08, 0.05, segs=6, mat="ink")
    with B.at((0, -0.10, 0.90), 1.0, rot=rot_x(90)):
        B.cyl((0, 0, -0.02), 0.04, 0.06, segs=8, mat="ink")
        for k in range(8):
            B.box(polar(0.16, 45 * k, 0.0), (0.16, 0.08, 0.02), "straw", rot=rot_z(45 * k))
    B.box((0.40, 0.10, 0.12), (0.30, 0.20, 0.24), "accent")
    B.cyl((0.40, 0.10, 0.24), 0.02, 0.13, segs=8, mat="water")
    wildwest_horseshoe(B, (0.40, -0.005, 0.12), 0.05)
    B.window((-0.06, -0.14, 0.42), FRONT, 0.06, 0.06)
    with B.at((-0.40, -0.28, 0), 0.5):
        wildwest_s1(B)


def wildwest_s2c(B):
    B.box((0, 0.10, 0.06), (1.00, 0.50, 0.12), "wood")
    top = hut(B, 0.56, 0.40, 0.46, "accent", "ink", 0.22, z0=0.12, door_mat="accent")
    B.box((0, -0.25, 0.86), (0.64, 0.20, 0.04), "ink")
    for x in (-0.28, 0.28):
        B.box((x, -0.32, 0.50), (0.04, 0.04, 0.72), "wood")
    for x in (-0.20, 0.20):
        B.box((x, -0.50, 0.03), (0.05, 0.75, 0.04), "ink")
    for y in (-0.80, -0.60, -0.40, -0.22):
        B.box((0, y, 0.015), (0.52, 0.06, 0.03), "wood")
    wildwest_horseshoe(B, (0, -0.21, 0.55), 0.05)
    with B.at((0.58, -0.16, 0.12), 0.5):
        wildwest_s1(B)


def wildwest_s3(B):
    B.box((0, 0, 0.03), (1.10, 0.90, 0.06), "wood")
    B.box((0, 0.05, 0.56), (0.80, 0.60, 1.00), "accent2")
    B.box((0, 0, 1.08), (0.84, 0.72, 0.04), "ink")
    for z, dep in ((0.50, 0.24), (1.06, 0.10)):
        B.box((0, -0.35 - dep / 2, z), (0.80, dep, 0.04), "wood")
    for x in (-0.36, 0.36):
        B.box((x, -0.55, 0.52), (0.05, 0.05, 1.04), "wood")
    B.box((0, -0.57, 0.66), (0.76, 0.02, 0.04), "wood")
    B.door((0, -0.25, 0.22), FRONT, 0.16, 0.34, mat="accent")
    for x in (-0.28, 0.28):
        B.window((x, -0.25, 0.30), FRONT, 0.10, 0.12)
        B.window((x, -0.25, 0.82), FRONT, 0.10, 0.12)
    for sx in (-1, 1):
        for sy in (-1, 1):
            B.box((0.15 + sx * 0.16, sy * 0.16, 1.28), (0.05, 0.05, 0.36), "wood")
    B.lathe([(0.24, 1.46), (0.26, 1.50), (0.26, 1.72), (0.24, 1.76)], 8, "wood", center=(0.15, 0, 0))
    B.cone((0.15, 0, 1.76), UP, 0.10, 0.30, 0.0, segs=8, mat="ink")
    wildwest_horseshoe(B, (0.15, -0.265, 1.60), 0.06)
    with B.at((-0.60, -0.55, 0.06), 0.45):
        wildwest_s1(B)


def cave_s1(B):
    for k in range(6):
        a = 30 + 60 * k
        B.box(polar(0.30, a, 0.06), (0.16, 0.12, 0.12), "stone", rot=rot_z(a))
    mound(B, (0, 0), 0.22, 0.4, "alt", "cave-mound")
    crystal(B, (0.0, 0.0, 0.05), 0.56, "accent", d=(0.25, -0.15, 1.0), r=0.14)
    crystal(B, (-0.12, 0.08, 0.05), 0.28, "accent2", d=(-0.4, 0.2, 1.0))


def cave_lantern(B, p):
    lantern(B, p, glow="window", frame="ink", size=0.10)


def cave_s2(B):
    mound(B, (0, 0.10), 0.62, 1.05, "alt", "mine-mound", sxy=(1.0, 0.8))
    for x in (-0.22, 0.22):
        B.box((x, -0.40, 0.28), (0.08, 0.08, 0.56), "wood")
    B.box((0, -0.40, 0.58), (0.60, 0.10, 0.08), "wood")
    B.window((0, -0.40, 0.28), FRONT, 0.36, 0.50, mat="ink")
    crystal(B, (0.0, -0.44, 0.62), 0.22, "accent", d=(0, -0.3, 1.0))
    cave_lantern(B, (0.30, -0.44, 0.60))
    B.box((0.30, -0.42, 0.66), (0.04, 0.04, 0.10), "ink")
    with B.at((0.62, -0.40, 0), 0.5):
        cave_s1(B)


def cave_s2b(B):
    B.box((0, 0, 0.26), (0.56, 0.46, 0.52), "stone")
    B.door((0, -0.23, 0.18), FRONT, 0.14, 0.28)
    for sx in (-1, 1):
        B.window((sx * 0.28, 0.0, 0.32), (sx, 0, 0), 0.09, 0.10)
    for p, s, mat, d in (((0, 0, 0.50), 0.50, "accent", (0.1, 0.0, 1.0)), ((0.18, -0.10, 0.50), 0.36, "accent2", (0.5, -0.3, 1.0)),
                         ((-0.18, 0.08, 0.50), 0.40, "accent", (-0.5, 0.3, 1.0)), ((0.06, 0.16, 0.50), 0.30, "accent2", (0.2, 0.6, 1.0)),
                         ((-0.10, -0.16, 0.50), 0.26, "accent", (-0.3, -0.6, 1.0))):
        crystal(B, p, s, mat, d=d, r=s * 0.26)
    with B.at((0.60, -0.36, 0), 0.5):
        cave_s1(B)


def cave_cart(B, p, s=1.0):
    x, y, z = p
    with B.at((x, y, z), s):
        B.loft([(-0.16, -0.12, 0.08), (0.16, -0.12, 0.08), (0.16, 0.12, 0.08), (-0.16, 0.12, 0.08)],
               [(-0.20, -0.15, 0.28), (0.20, -0.15, 0.28), (0.20, 0.15, 0.28), (-0.20, 0.15, 0.28)], "ink")
        for sx in (-1, 1):
            for sy in (-1, 1):
                wheel(B, (sx * 0.10, sy * 0.14, 0.06), 0.06, axis="Y", mat="stone", hub="ink")
        B.ico((0.0, 0.0, 0.30), 0.10, "accent", scale=(1.4, 1.0, 0.6), jitter=0.06, seed="ore")


def cave_s2c(B):
    B.box((0, 0.10, 0.03), (0.90, 0.60, 0.06), "stone")
    hut(B, 0.50, 0.40, 0.58, "wood", "stone", 0.34, z0=0.06, door=False)
    B.window((0, -0.20, 0.34), FRONT, 0.30, 0.50, mat="ink")
    for x in (-0.08, 0.08):
        B.box((x, -0.45, 0.075), (0.03, 0.40, 0.03), "ink")
    for y in (-0.60, -0.45, -0.30):
        B.box((0, y, 0.065), (0.28, 0.05, 0.02), "wood")
    cave_cart(B, (0.0, -0.46, 0.08), 0.8)
    cave_lantern(B, (0.30, -0.20, 0.62))
    with B.at((-0.50, -0.28, 0), 0.5):
        cave_s1(B)


def cave_s3(B):
    mound(B, (0, 0.15), 1.05, 0.8, "alt", "geode", sxy=(1.0, 0.75))
    B.window((0, -0.60, 0.30), FRONT, 0.50, 0.58, mat="ink")
    for x in (-0.28, 0.28):
        B.box((x, -0.64, 0.30), (0.08, 0.08, 0.60), "wood")
    B.box((0, -0.64, 0.64), (0.72, 0.10, 0.08), "wood")
    for p, s, mat, d in (((0.0, 0.0, 1.10), 0.70, "accent", (0.0, -0.2, 1.0)), ((0.40, -0.10, 0.95), 0.50, "accent2", (0.5, -0.3, 1.0)),
                         ((-0.42, 0.0, 0.95), 0.55, "accent", (-0.5, -0.2, 1.0)), ((0.15, 0.40, 1.00), 0.45, "accent2", (0.2, 0.7, 1.0)),
                         ((-0.20, -0.40, 0.90), 0.40, "accent", (-0.3, -0.7, 1.0)), ((0.55, 0.30, 0.80), 0.35, "accent2", (0.7, 0.5, 1.0))):
        crystal(B, p, s, mat, d=d, r=s * 0.28)
    for x in (-0.55, -0.20, 0.20, 0.55):
        cave_lantern(B, (x, -0.95, 0.0))
    B.box((0, -0.95, 0.02), (1.30, 0.20, 0.04), "road")
    with B.at((0.85, -0.55, 0), 0.4):
        cave_s1(B)


def grave_lantern(B, p, glow="accent"):
    lantern(B, p, glow=glow, frame="ink", size=0.11)


def graveyard_s1(B):
    B.cyl((0, 0, 0), 0.06, 0.37, segs=8, mat="alt")
    B.box((0, 0, 0.30), (0.07, 0.07, 0.48), "ink")
    B.box((0, 0, 0.55), (0.24, 0.05, 0.05), "ink")
    grave_lantern(B, (0.0, 0.0, 0.42))
    B.box((0, 0, 0.60), (0.09, 0.09, 0.02), "ink")
    headstone(B, (0.22, -0.12, 0.06), w=0.14, h=0.22)


def graveyard_s2(B):
    for sx in (-1, 1):
        B.box((sx * 0.30, 0, 0.32), (0.18, 0.18, 0.64), "stone")
        grave_lantern(B, (sx * 0.30, 0, 0.66))
    for x in (-0.14, -0.05, 0.05, 0.14):
        B.box((x, 0, 0.32), (0.025, 0.025, 0.60), "ink")
    B.box((0, 0, 0.58), (0.44, 0.03, 0.04), "ink")
    B.box((0, 0, 0.10), (0.44, 0.03, 0.04), "ink")
    B.box((0, 0, 0.66), (0.08, 0.08, 0.20), "ink")
    B.cyl((0, 0, 0.76), 0.02, 0.10, segs=6, mat="ink")
    grave_lantern(B, (0, 0, 0.78), glow="window")
    with B.at((0.48, -0.16, 0), 0.55):
        graveyard_s1(B)


def graveyard_s2b(B):
    B.box((0, 0, 0.03), (0.70, 0.60, 0.06), "stone")
    B.box((0, 0, 0.36), (0.54, 0.44, 0.60), "stone")
    B.dome((0, 0, 0.66), 0.27, "alt", scale=(1.0, 0.8, 0.6))
    B.window((0, -0.22, 0.28), FRONT, 0.18, 0.34, mat="ink")
    B.dome((0, -0.225, 0.45), 0.09, "ink", scale=(1, 0.2, 1))
    B.box((0.20, -0.22, 0.50), (0.12, 0.02, 0.14), "ink")
    grave_lantern(B, (0.20, -0.235, 0.44), glow="window")
    B.window((0.27, 0.0, 0.40), (1, 0, 0), 0.08, 0.10)
    B.box((0, 0, 0.86), (0.06, 0.06, 0.16), "ink")
    B.box((0, 0, 0.90), (0.16, 0.06, 0.04), "ink")
    with B.at((-0.55, -0.32, 0), 0.55):
        graveyard_s1(B)


def graveyard_s2c(B):
    willow(B, (-0.15, 0.10, 0.0), 1.0, leaf="alt")
    B.box((0.22, -0.02, 0.30), (0.50, 0.20, 0.04), "wood")
    B.box((0.22, 0.07, 0.42), (0.50, 0.03, 0.14), "wood")
    for x in (0.0, 0.42):
        B.box((x, -0.02, 0.15), (0.06, 0.18, 0.30), "ink")
    B.box((0.50, 0.02, 0.30), (0.07, 0.07, 0.60), "ink")
    grave_lantern(B, (0.50, 0.02, 0.60), glow="window")
    with B.at((0.42, -0.30, 0), 0.5):
        graveyard_s1(B)


def graveyard_s3(B):
    B.box((0, 0, 0.03), (1.10, 0.80, 0.06), "stone")
    B.box((0.10, 0, 0.56), (0.80, 0.60, 1.00), "stone")
    B.extrude_xz([(-0.33, 1.06), (0.53, 1.06), (0.10, 1.40)], -0.33, 0.33, "ink")
    B.cyl((-0.40, -0.10, 0), 1.30, 0.20, segs=8, mat="stone")
    B.cone((-0.40, -0.10, 1.30), UP, 0.46, 0.24, 0.0, segs=8, mat="ink")
    B.ico((-0.40, -0.10, 1.78), 0.03, "accent", subdiv=1)
    B.window((0.10, -0.30, 0.24), FRONT, 0.20, 0.42, mat="ink")
    B.dome((0.10, -0.305, 0.45), 0.10, "ink", scale=(1, 0.2, 1))
    for x in (-0.12, 0.32):
        B.window((x, -0.30, 0.80), FRONT, 0.10, 0.14)
    B.window((-0.40, -0.30, 0.90), FRONT, 0.08, 0.12)
    B.window((0.50, 0.0, 0.60), (1, 0, 0), 0.10, 0.14)
    for sx in (-1, 1):
        grave_lantern(B, (0.10 + sx * 0.40, -0.30, 1.06), glow="window")
    with B.at((0.70, -0.50, 0), 0.45):
        graveyard_s1(B)


def factory_s1(B):
    B.box((0, 0, 0.03), (0.74, 0.60, 0.06), "stone")
    B.box((0, 0, 0.20), (0.44, 0.44, 0.34), "accent")
    for sx in (-1, 1):
        B.box((sx * 0.20, 0, 0.20), (0.04, 0.46, 0.36), "ink")
    gear(B, (0, 0, 0.49), 0.11, mat="ink", axis="Y")
    B.box((0.16, -0.24, 0.10), (0.10, 0.06, 0.12), "stone")


def factory_s2(B):
    B.box((0, 0, 0.03), (0.86, 0.66, 0.06), "stone")
    hut(B, 0.64, 0.50, 0.54, "coral", "ink", 0.24, z0=0.06, door_mat="ink")
    gear(B, (0, -0.28, 0.50), 0.09, mat="accent", axis="Y")
    B.box((0.22, 0.10, 0.68), (0.12, 0.12, 0.34), "stone")
    smoke(B, (0.22, 0.10, 0.85), r=0.08)
    with B.at((0.62, -0.38, 0), 0.5):
        factory_s1(B)


def factory_s2b(B):
    B.box((0, 0, 0.03), (0.96, 0.60, 0.06), "stone")
    for sx in (-1, 1):
        for sy in (-1, 1):
            B.box((sx * 0.40, sy * 0.22, 0.42), (0.06, 0.06, 0.72), "ink")
    B.box((0, 0, 0.80), (0.94, 0.56, 0.06), "accent")
    B.box((0, 0, 0.30), (0.90, 0.24, 0.06), "ink")
    for x in (-0.36, -0.12, 0.12, 0.36):
        B.cone((x, -0.14, 0.34), (0, 1, 0), 0.28, 0.035, 0.035, segs=6, mat="stone")
    for x in (-0.40, 0.40):
        B.box((x, 0, 0.16), (0.08, 0.20, 0.22), "stone")
    gear(B, (0.48, 0.0, 0.32), 0.12, mat="accent", axis="X")
    B.window((0, 0.28, 0.60), (0, 1, 0), 0.60, 0.12, mat="ink")
    for x in (-0.30, 0.30):
        B.box((x, -0.12, 0.40), (0.14, 0.14, 0.14), "accent")
    B.box((0.28, 0.0, 0.86), (0.08, 0.08, 0.10), "window")
    with B.at((-0.66, -0.40, 0), 0.5):
        factory_s1(B)


def factory_s2c(B):
    B.box((0, 0, 0.03), (0.86, 0.70, 0.06), "stone")
    B.cyl((0, 0, 0.06), 0.60, 0.34, segs=10, mat="ink")
    B.dome((0, 0, 0.66), 0.34, "stone")
    for z in (0.20, 0.55):
        B.cyl((0, 0, z), 0.04, 0.355, segs=10, mat="accent")
    B.cone((0.30, 0.0, 0.40), (1, 0, 0), 0.20, 0.05, 0.05, segs=6, mat="stone")
    B.cone((0.50, 0.0, 0.40), UP, 0.50, 0.05, 0.05, segs=6, mat="stone")
    smoke(B, (0.50, 0.0, 0.90), r=0.08)
    gear(B, (0, -0.345, 0.55), 0.10, mat="accent", axis="Y")
    B.door((0, -0.34, 0.20), FRONT, 0.14, 0.28)
    B.window((0.34, 0.0, 0.40), (1, 0, 0), 0.08, 0.10)
    with B.at((-0.58, -0.40, 0), 0.5):
        factory_s1(B)


def factory_s3(B):
    B.box((0, 0, 0.03), (1.30, 0.90, 0.06), "stone")
    hut(B, 1.00, 0.70, 0.80, "coral", "ink", 0.34, z0=0.06, door=False, windows=False)
    B.window((0, -0.35, 0.36), FRONT, 0.30, 0.50, mat="ink")
    B.box((0, -0.62, 0.20), (0.26, 0.60, 0.05), "ink")
    for y in (-0.82, -0.66, -0.50):
        B.cone((-0.13, y, 0.23), (1, 0, 0), 0.26, 0.03, 0.03, segs=5, mat="stone")
    gear(B, (0, -0.38, 0.98), 0.16, mat="accent", axis="Y")
    for x in (-0.35, 0.0, 0.35):
        B.window((x, -0.35, 0.60), FRONT, 0.10, 0.12) if x else None
        B.cyl((x, 0.20, 0.80), 0.70 + 0.1 * (x == 0), 0.07, segs=6, mat="stone")
        smoke(B, (x, 0.20, 1.50 + 0.1 * (x == 0)), r=0.09)
    B.cyl((0.30, -0.10, 1.20), 0.22, 0.14, segs=8, mat="accent2")
    B.cone((0.30, -0.10, 1.42), UP, 0.08, 0.15, 0.0, segs=8, mat="ink")
    for sx in (-1, 1):
        B.window((sx * 0.50, 0.0, 0.50), (sx, 0, 0), 0.10, 0.12)
    with B.at((0.80, -0.55, 0), 0.45):
        factory_s1(B)


def park_flag(B, base, h=0.4, r=0.03):
    flagpole(B, base, h, cloth="accent", pole="snow", r=r, pennant=False)


def park_s1(B):
    B.cyl((0, 0, 0), 0.10, 0.42, segs=10, mat="leaf")
    B.cyl((0, 0, 0.10), 0.02, 0.06, segs=8, mat="ink")
    park_flag(B, (0, 0, 0.11), 0.45)
    B.ico((0.30, -0.15, 0.13), 0.04, "snow", subdiv=1)


def park_s2(B):
    B.cyl((0, 0, 0), 0.04, 0.46, segs=10, mat="road")
    with B.at((0, 0, 0.04), 1.3):
        B.ring(0.36, 0.45, 0.0, 0.16, 10, "accent2", top_in=0.14)
        B.cyl((0, 0, 0), 0.11, 0.37, segs=10, mat="water")
        B.cyl((0, 0, 0.11), 0.16, 0.08, segs=6, mat="accent2")
        B.cone((0, 0, 0.27), UP, 0.06, 0.06, 0.22, segs=8, mat="accent2")
        B.cyl((0, 0, 0.33), 0.03, 0.19, segs=8, mat="water")
        B.cyl((0, 0, 0.36), 0.12, 0.05, segs=6, mat="accent2")
        B.cone((0, 0, 0.48), UP, 0.05, 0.05, 0.13, segs=8, mat="accent2")
        B.cyl((0, 0, 0.53), 0.03, 0.11, segs=8, mat="water")
    B.ring_windows(0.46 * 1.3, 0.10, (230, 310), 0.10, 0.06)
    park_flag(B, (0, 0, 0.77), 0.30)
    with B.at((0.68, -0.34, 0), 0.5):
        park_s1(B)


def park_s2b(B):
    B.cyl((0, 0, 0), 0.10, 0.46, segs=8, mat="snow")
    B.cyl((0, 0, 0.10), 0.04, 0.40, segs=8, mat="road")
    for k in range(8):
        q = polar(0.36, 22.5 + 45 * k, 0.14)
        B.cyl(q, 0.48, 0.035, segs=6, mat="snow")
    B.cyl((0, 0, 0.62), 0.04, 0.42, segs=8, mat="snow")
    B.cone((0, 0, 0.66), UP, 0.26, 0.50, 0.0, segs=8, mat="accent")
    B.box((0, -0.28, 0.18), (0.36, 0.12, 0.08), "accent2")
    B.window((0, 0.25, 0.40), (0, 1, 0), 0.30, 0.20, mat="window")
    park_flag(B, (0, 0, 0.90), 0.16)
    with B.at((0.70, -0.30, 0), 0.5):
        park_s1(B)


def park_s2c(B):
    B.box((0, 0, 0.03), (0.86, 0.70, 0.06), "road")
    hut(B, 0.60, 0.44, 0.50, "snow", "accent", 0.24, z0=0.06, door_mat="accent")
    B.box((0, -0.36, 0.52), (0.62, 0.30, 0.04), "snow")
    for x in (-0.28, 0.28):
        B.cyl((x, -0.46, 0.06), 0.46, 0.03, segs=5, mat="snow")
    park_flag(B, (0, -0.24, 0.80), 0.24)
    B.box((0.55, 0.10, 0.20), (0.18, 0.50, 0.28), "leaf", bevel=0.05)
    with B.at((-0.62, -0.36, 0), 0.5):
        park_s1(B)


def park_s3(B):
    B.cyl((0, 0, 0), 0.08, 0.90, segs=12, mat="road")
    B.cyl((0, 0.15, 0.08), 0.40, 0.55, segs=8, mat="snow")
    dome = B.dome((0, 0.15, 0.48), 0.55, "glass_meadow", scale=(1.0, 1.0, 1.1))
    B.paint_above(dome, 0.95, "glass_meadow_cap")
    B.ring_windows(0.55, 0.30, (210, 250, 290, 330), 0.12, 0.14)
    B.door((0, -0.40, 0.24), FRONT, 0.18, 0.30, mat="accent")
    B.cyl((0, 0.15, 1.08), 0.30, 0.03, segs=5, mat="snow")
    park_flag(B, (0, 0.15, 1.38), 0.42)
    with B.at((0, -0.75, 0.08), 0.55):
        B.ring(0.36, 0.45, 0.0, 0.16, 10, "accent2", top_in=0.14)
        B.cyl((0, 0, 0), 0.11, 0.37, segs=10, mat="water")
        B.cyl((0, 0, 0.11), 0.30, 0.06, segs=6, mat="accent2")
        B.cone((0, 0, 0.36), UP, 0.09, 0.07, 0.20, segs=8, mat="accent2")
        B.cyl((0, 0, 0.45), 0.03, 0.17, segs=8, mat="water")
    for a in (200, 240, 300, 340):
        q = polar(0.80, a, 0.08)
        B.cyl(q, 0.50, 0.02, segs=4, mat="ink")
        B.ico((q.x, q.y, 0.60), 0.04, "window", subdiv=1)
    B.box((0, -0.10, 0.60), (1.55, 0.02, 0.02), "ink")
    with B.at((0.72, -0.30, 0.08), 0.4):
        park_s1(B)


NEW_LANDMARKS = {
    "space": {"s1": space_s1, "s2": (space_s2, space_s2b, space_s2c), "s3": space_s3},
    "lab": {"s1": lab_s1, "s2": (lab_s2, lab_s2b, lab_s2c), "s3": lab_s3},
    "medieval": {"s1": medieval_s1, "s2": (medieval_s2, medieval_s2b, medieval_s2c), "s3": medieval_s3},
    "jungle": {"s1": jungle_s1, "s2": (jungle_s2, jungle_s2b, jungle_s2c), "s3": jungle_s3},
    "wildwest": {"s1": wildwest_s1, "s2": (wildwest_s2, wildwest_s2b, wildwest_s2c), "s3": wildwest_s3},
    "cave": {"s1": cave_s1, "s2": (cave_s2, cave_s2b, cave_s2c), "s3": cave_s3},
    "graveyard": {"s1": graveyard_s1, "s2": (graveyard_s2, graveyard_s2b, graveyard_s2c), "s3": graveyard_s3},
    "factory": {"s1": factory_s1, "s2": (factory_s2, factory_s2b, factory_s2c), "s3": factory_s3},
    "park": {"s1": park_s1, "s2": (park_s2, park_s2b, park_s2c), "s3": park_s3},
}

# ----------------------------------------------------------------------------- new families: props (keyed by catalogue prop id)

def rail_segment(B, mat_rail="ink", mat_tie="wood"):
    for x in (-0.10, 0.10):
        B.box((x, 0, 0.05), (0.04, 0.90, 0.04), mat_rail)
    for y in (-0.35, 0.0, 0.35):
        B.box((0, y, 0.015), (0.36, 0.08, 0.03), mat_tie)


NEW_PROPS = {
    "space-moon-rock": lambda B: rock(B, 0.30, "alt", (1.0, 0.85, 0.7), "moon-rock"),
    "space-crater-rim": lambda B: (B.lathe([(0.55, 0.0), (0.72, 0.16), (0.90, 0.0), (0.55, 0.0)], 12, "alt", closed=True),
                                   B.cyl((0, 0, 0), 0.03, 0.58, segs=12, mat="ink")),
    "space-habitat-pod": lambda B: (B.cyl((0, 0, 0), 0.30, 0.30, segs=8, mat="snow"), B.dome((0, 0, 0.30), 0.30, "water"),
                                    B.ring_windows(0.30, 0.16, (230, 310), 0.10, 0.08), B.door((0, -0.30, 0.10), FRONT, 0.12, 0.16)),
    "space-solar-panel": lambda B: (B.box((0, 0, 0.05), (0.30, 0.30, 0.10), "alt"), B.cyl((0, 0, 0.10), 0.28, 0.06, segs=6, mat="ink"),
                                    B.box((0, 0, 0.36), (0.50, 0.32, 0.05), "accent", rot=rot_x(-30)),
                                    B.box((0, 0.03, 0.38), (0.44, 0.03, 0.03), "snow", rot=rot_x(-30))),
    "space-antenna-mast": lambda B: (B.cyl((0, 0, 0), 0.06, 0.12, segs=6, mat="ink"), B.cyl((0, 0, 0.06), 0.80, 0.02, segs=4, mat="snow"),
                                     [B.cyl((0, 0, z), 0.02, 0.06 + 0.03 * i, segs=6, mat="accent") for i, z in enumerate((0.70, 0.55, 0.40))],
                                     B.ico((0, 0, 0.88), 0.03, "accent2", subdiv=1)),
    "space-rover": lambda B: (B.box((0, 0, 0.16), (0.40, 0.52, 0.14), "snow"), B.box((0, 0.08, 0.28), (0.26, 0.24, 0.12), "accent"),
                              [wheel(B, (sx * 0.22, y, 0.08), 0.08, mat="ink", hub="snow") for sx in (-1, 1) for y in (-0.18, 0.18)],
                              B.cyl((0, 0.08, 0.34), 0.10, 0.015, segs=4, mat="ink"), B.cone((0, 0.08, 0.44), UP, 0.04, 0.02, 0.07, segs=8, mat="snow"),
                              B.window((0, -0.04, 0.30), FRONT, 0.16, 0.06)),
    "space-flag": lambda B: (B.cyl((0, 0, 0), 0.04, 0.20, segs=8, mat="alt"), flagpole(B, (0, 0, 0.04), 0.42, cloth="accent2", pole="snow", r=0.025)),
    "space-beacon-light": lambda B: (B.cyl((0, 0, 0), 0.08, 0.10, segs=6, mat="ink"), B.cyl((0, 0, 0.08), 0.30, 0.04, segs=6, mat="snow"),
                                     B.box((0, 0, 0.44), (0.12, 0.12, 0.12), "window"), B.cone((0, 0, 0.50), UP, 0.05, 0.10, 0.0, segs=4, mat="ink", phase=math.pi / 4)),
    "lab-glass-tower": lambda B: (B.cyl((0, 0, 0), 0.06, 0.24, segs=6, mat="snow"), B.cyl((0, 0, 0.06), 0.70, 0.18, segs=6, mat="water"),
                                  B.cyl((0, 0, 0.76), 0.06, 0.20, segs=6, mat="snow")),
    "lab-neon-ring": lambda B: ([B.cyl((sx * 0.30, 0, 0), 0.50, 0.03, segs=5, mat="ink") for sx in (-1, 1)],
                                B.lathe([(0.28, -0.03), (0.31, -0.03), (0.31, 0.03), (0.28, 0.03), (0.28, -0.03)], 10, "accent2", closed=True,
                                        center=(0, 0, 0.50), rot=rot_x(90))),
    "lab-tube-pipe": lambda B: (B.cone((0, 0.45, 0.12), FRONT, 0.90, 0.08, 0.08, segs=8, mat="accent"),
                                [B.cone((0, y, 0.12), FRONT, 0.06, 0.10, 0.10, segs=8, mat="ink") for y in (0.42, -0.36)],
                                [B.box((0, y, 0.04), (0.10, 0.10, 0.08), "ink") for y in (-0.30, 0.30)]),
    "lab-hologram-disc": lambda B: (B.cyl((0, 0, 0), 0.06, 0.16, segs=8, mat="snow"), B.cyl((0, 0, 0.06), 0.30, 0.03, segs=5, mat="ink"),
                                    B.cyl((0, 0, 0.36), 0.03, 0.22, segs=10, mat="accent")),
    "lab-server-rack": lambda B: (B.box((0, 0, 0.35), (0.34, 0.30, 0.70), "ink"), [B.window((0, -0.15, z), FRONT, 0.24, 0.05, mat="accent") for z in (0.2, 0.35, 0.5)],
                                  B.window((0.08, -0.15, 0.62), FRONT, 0.04, 0.04, mat="accent2")),
    "lab-plant-pod": lambda B: (B.cyl((0, 0, 0), 0.20, 0.24, segs=8, mat="snow"), B.ico((0, 0, 0.32), 0.16, "leaf", jitter=0.05, seed="podplant"),
                                B.dome((0, 0, 0.20), 0.26, "water"), B.window((0, -0.24, 0.10), FRONT, 0.08, 0.06, mat="accent")),
    "lab-drone-pad": lambda B: (B.cyl((0, 0, 0), 0.05, 0.40, segs=8, mat="snow"), B.box((0, 0, 0.06), (0.30, 0.06, 0.02), "accent"),
                                [B.box((sx * 0.14, 0, 0.06), (0.06, 0.34, 0.02), "accent") for sx in (-1, 1)]),
    "lab-robot-arm": lambda B: (B.cyl((0, 0, 0), 0.10, 0.18, segs=8, mat="ink"), B.cyl((0, 0, 0.10), 0.10, 0.10, segs=8, mat="accent2"),
                                B.cone((0, 0, 0.20), (0.3, -0.3, 1.0), 0.40, 0.05, 0.045, segs=6, mat="snow"),
                                B.ico((0.11, -0.11, 0.57), 0.07, "ink", subdiv=1),
                                B.cone((0.11, -0.11, 0.57), (0.6, -0.6, -0.3), 0.34, 0.045, 0.04, segs=6, mat="snow"),
                                [B.box((0.31 + dx, -0.31 + dx, 0.44), (0.03, 0.03, 0.12), "accent") for dx in (-0.04, 0.04)]),
    "medieval-wall-segment": lambda B: (B.box((0, 0, 0.30), (1.0, 0.24, 0.60), "stone"), [B.box((x, 0, 0.66), (0.16, 0.24, 0.12), "stone") for x in (-0.40, -0.13, 0.13, 0.40)]),
    "medieval-banner-pole": lambda B: (B.box((0, 0, 0.04), (0.16, 0.16, 0.08), "stone"), medieval_banner(B, (0, 0, 0.08), 0.70)),
    "medieval-cottage": lambda B: (hut(B, 0.50, 0.42, 0.40, "accent2", "wood", 0.26, door_mat="ink"), B.box((0.15, 0.08, 0.66), (0.08, 0.08, 0.16), "stone")),
    "medieval-market-tent": lambda B: ([B.box((sx * 0.26, sy * 0.22, 0.28), (0.04, 0.04, 0.56), "wood") for sx in (-1, 1) for sy in (-1, 1)],
                                       B.cone((0, 0, 0.54), UP, 0.22, 0.34 * math.sqrt(2), 0.0, segs=4, mat="accent", phase=math.pi / 4),
                                       B.box((0, 0, 0.55), (0.68, 0.60, 0.03), "accent2"), B.box((0, -0.10, 0.20), (0.44, 0.24, 0.16), "wood")),
    "medieval-hay-cart": lambda B: (B.box((0, 0, 0.22), (0.44, 0.60, 0.16), "wood"), [wheel(B, (sx * 0.24, 0.0, 0.12), 0.12, mat="wood", hub="ink") for sx in (-1, 1)],
                                    B.ico((0, 0, 0.36), 0.20, "straw", scale=(1.0, 1.3, 0.6), jitter=0.05, seed="hay"),
                                    B.box((0, -0.34, 0.16), (0.06, 0.10, 0.06), "wood"), B.box((0, 0.34, 0.16), (0.06, 0.10, 0.06), "wood")),
    "medieval-well": lambda B: (B.ring(0.22, 0.30, 0.0, 0.30, 8, "stone"), B.cyl((0, 0, 0), 0.14, 0.23, segs=8, mat="water"),
                                [B.box((sx * 0.28, 0.0, 0.53), (0.05, 0.05, 0.46), "wood") for sx in (-1, 1)],
                                gable(B, 0.36, 0.76, 0.16, -0.30, 0.30, "accent"), B.box((0.0, 0.0, 0.40), (0.08, 0.08, 0.08), "wood")),
    "medieval-windmill-small": lambda B: scaled(B, 0.75, medieval_s2b_core),
    "medieval-torch": lambda B: (B.box((0, 0, 0.03), (0.14, 0.14, 0.06), "stone"), torch(B, (0, 0, 0.06), 0.48, flame="peach")),
    "jungle-palm": lambda B: palm(B, (0, 0, 0), 1.0),
    "jungle-broadleaf": lambda B: ([B.cone((0, 0, 0.02), polar(1.0, a, 0.9), 0.50, 0.12, 0.0, segs=4, mat="leaf" if i % 2 else "pine", scale=(1, 0.3, 1))
                                    for i, a in enumerate(range(0, 360, 60))]),
    "jungle-fruit-tree": lambda B: (round_tree(B, 0.07, 0.40, 0.34, highlight=False), [B.ico(polar(0.30, a, 0.66 + 0.06 * (a % 2)), 0.05, "coral", subdiv=1) for a in (30, 150, 270)]),
    "jungle-ruin-block": lambda B: (B.box((0, 0, 0.16), (0.40, 0.34, 0.32), "stone", rot=rot_z(12)), B.ico((0.05, 0.02, 0.34), 0.14, "leaf", scale=(1, 1, 0.4), jitter=0.05, seed="mossblock"),
                                    B.box((0, -0.18, 0.16), (0.22, 0.02, 0.06), "ink", rot=rot_z(12))),
    "jungle-tiki-hut": lambda B: scaled(B, 0.7, jungle_s2_core),
    "jungle-torch": lambda B: (B.cyl((0, 0, 0), 0.03, 0.10, segs=6, mat="straw"), torch(B, (0, 0, 0.03), 0.52)),
    "jungle-waterfall-slab": lambda B: (B.box((0, 0.10, 0.35), (0.70, 0.40, 0.70), "stone"), B.box((0, -0.12, 0.40), (0.24, 0.05, 0.80), "water"),
                                        B.cyl((0, -0.30, 0), 0.04, 0.30, segs=8, mat="water"), B.ico((0, -0.30, 0.05), 0.09, "pale", scale=(1, 1, 0.5), seed="wf-mist")),
    "jungle-surfboard": lambda B: (B.lathe([(0.0, 0.0), (0.12, 0.30), (0.10, 0.62), (0.0, 0.70)], 6, "accent", center=(0, 0, 0.02), rot=track_z((0.0, -0.35, 1.0))),
                                   B.box((0, -0.02, 0.02), (0.30, 0.20, 0.04), "straw")),
    "wildwest-cactus-saguaro": lambda B: cactus(B, True),
    "wildwest-barrel": lambda B: barrel(B, (0, 0, 0)),
    "wildwest-storefront": lambda B: (hut(B, 0.50, 0.40, 0.40, "accent2", "ink", 0.10, door_mat="accent"), B.box((0, -0.21, 0.30), (0.56, 0.04, 0.60), "wood"),
                                      B.box((0, -0.24, 0.52), (0.40, 0.03, 0.10), "accent")),
    "wildwest-water-tower": lambda B: ([B.box((sx * 0.16, sy * 0.16, 0.30), (0.05, 0.05, 0.60), "wood") for sx in (-1, 1) for sy in (-1, 1)],
                                       B.lathe([(0.22, 0.58), (0.24, 0.62), (0.24, 0.88), (0.22, 0.92)], 8, "wood"), B.cone((0, 0, 0.92), UP, 0.10, 0.27, 0.0, segs=8, mat="ink")),
    "wildwest-rail-segment": lambda B: rail_segment(B),
    "wildwest-windpump": lambda B: scaled(B, 0.75, wildwest_s2b_core),
    "wildwest-wagon": lambda B: (B.box((0, 0, 0.26), (0.40, 0.66, 0.20), "wood"), [wheel(B, (sx * 0.22, y, 0.12), 0.12, mat="wood", hub="ink") for sx in (-1, 1) for y in (-0.22, 0.22)],
                                 B.dome((0, 0, 0.36), 0.22, "snow", scale=(1.0, 1.5, 1.0)), B.cone((0, 0.33, 0.24), (0, 1, 0), 0.30, 0.025, 0.025, segs=4, mat="wood")),
    "wildwest-tumbleweed": lambda B: B.ico((0, 0, 0.22), 0.22, "straw", jitter=0.12, seed="tumble"),
    "cave-crystal-cluster": lambda B: (mound(B, (0, 0), 0.24, 0.45, "alt", "cc-mound"), [crystal(B, p, s, m, d=d) for p, s, m, d in
                                       (((0, 0, 0.04), 0.55, "accent", (0.1, -0.1, 1)), ((0.14, -0.06, 0.05), 0.36, "accent2", (0.5, -0.3, 1)),
                                        ((-0.13, -0.04, 0.05), 0.40, "accent", (-0.5, -0.2, 1)), ((0.02, 0.13, 0.06), 0.30, "accent2", (0.1, 0.6, 1)))]),
    "cave-stalagmite": lambda B: (B.cone((0, 0, 0), UP, 0.70, 0.16, 0.0, segs=6, mat="alt"), B.cone((0.14, -0.08, 0), UP, 0.36, 0.09, 0.0, segs=5, mat="alt")),
    "cave-lantern": lambda B: (B.box((0, 0, 0.03), (0.30, 0.18, 0.06), "stone"), B.box((-0.08, 0, 0.30), (0.05, 0.05, 0.48), "ink"), B.box((0.0, 0, 0.53), (0.20, 0.04, 0.03), "ink"),
                               cave_lantern(B, (0.08, 0, 0.40))),
    "cave-mine-cart": lambda B: cave_cart(B, (0, 0, 0), 1.0),
    "cave-rail-segment": lambda B: rail_segment(B, mat_rail="stone", mat_tie="wood"),
    "cave-boulder": lambda B: rock(B, 0.32, "alt", (1.0, 0.85, 0.7), "cave-boulder"),
    "cave-bat": lambda B: (B.box((0, 0, 0.10), (0.10, 0.08, 0.10), "ink"), [B.box((sx * 0.12, 0, 0.13), (0.16, 0.03, 0.06), "ink", rot=rot_y(sx * -25)) for sx in (-1, 1)],
                           [B.box((sx * 0.02, -0.045, 0.12), (0.02, 0.01, 0.02), "window") for sx in (-1, 1)]),
    "graveyard-headstone": lambda B: (headstone(B, (0, 0, 0), h=0.36, w=0.24), B.box((0, -0.035, 0.22), (0.10, 0.01, 0.02), "ink")),
    "graveyard-fence-segment": lambda B: ([B.box((sx * 0.45, 0, 0.25), (0.06, 0.06, 0.50), "ink") for sx in (-1, 1)],
                                          [B.box((0, 0, z), (0.90, 0.03, 0.03), "ink") for z in (0.15, 0.40)],
                                          [B.box((x, 0, 0.26), (0.02, 0.02, 0.44), "ink") for x in (-0.30, -0.15, 0.0, 0.15, 0.30)]),
    "graveyard-gate": lambda B: ([B.box((sx * 0.30, 0, 0.30), (0.14, 0.14, 0.60), "stone") for sx in (-1, 1)],
                                 [B.box((x, 0, 0.30), (0.025, 0.025, 0.56), "ink") for x in (-0.14, -0.05, 0.05, 0.14)],
                                 B.box((0, 0, 0.54), (0.44, 0.03, 0.04), "ink"), B.box((0, 0, 0.10), (0.44, 0.03, 0.04), "ink"),
                                 [B.ico((sx * 0.30, 0, 0.64), 0.05, "accent", subdiv=1) for sx in (-1, 1)]),
    "graveyard-lantern": lambda B: (B.cyl((0, 0, 0), 0.05, 0.12, segs=6, mat="alt"), B.box((0, 0, 0.30), (0.05, 0.05, 0.50), "ink"), grave_lantern(B, (0, 0, 0.55))),
    "graveyard-willow": lambda B: willow(B, (0, 0, 0), 1.1, leaf="alt"),
    "graveyard-pumpkin": lambda B: (B.lathe([(0.0, 0.0), (0.20, 0.04), (0.22, 0.14), (0.16, 0.26), (0.0, 0.28)], 8, "accent2"), B.cyl((0, 0, 0.27), 0.06, 0.03, segs=5, mat="pine"),
                                    [B.window((sx * 0.07, -0.19, 0.16), FRONT, 0.05, 0.05) for sx in (-1, 1)], B.window((0, -0.21, 0.09), FRONT, 0.10, 0.03)),
    "graveyard-crypt": lambda B: (B.box((0, 0, 0.22), (0.44, 0.36, 0.44), "stone"), B.dome((0, 0, 0.44), 0.22, "alt", scale=(1.0, 0.8, 0.6)),
                                  B.window((0, -0.18, 0.18), FRONT, 0.14, 0.26, mat="ink"), B.box((0, 0, 0.62), (0.04, 0.04, 0.14), "ink"), B.box((0, 0, 0.66), (0.12, 0.04, 0.03), "ink")),
    "graveyard-ghost": lambda B: (B.ico((0, 0, 0.34), 0.20, "pale", scale=(1.0, 1.0, 1.3), jitter=0.04, seed="ghost"), B.cone((0, 0, 0.0), UP, 0.26, 0.16, 0.20, segs=6, mat="pale"),
                                  [B.ico((sx * 0.07, -0.18, 0.40), 0.03, "ink", subdiv=1) for sx in (-1, 1)]),
    "factory-crate": lambda B: (B.box((0, 0, 0.17), (0.34, 0.34, 0.34), "accent"), [B.box((sx * 0.16, 0, 0.17), (0.03, 0.36, 0.36), "ink") for sx in (-1, 1)]),
    "factory-chimney-stack": lambda B: (B.box((0, 0, 0.10), (0.36, 0.36, 0.20), "stone"), B.cone((0, 0, 0.20), UP, 0.80, 0.14, 0.11, segs=8, mat="coral"),
                                        B.cyl((0, 0, 0.98), 0.04, 0.13, segs=8, mat="ink"), smoke(B, (0, 0, 1.02), r=0.09)),
    "factory-pipe-segment": lambda B: (B.cone((0, 0.45, 0.14), FRONT, 0.90, 0.09, 0.09, segs=8, mat="stone"), [B.cone((0, y, 0.14), FRONT, 0.06, 0.11, 0.11, segs=8, mat="accent") for y in (0.40, -0.34)],
                                       [B.box((0, y, 0.05), (0.12, 0.10, 0.10), "ink") for y in (-0.28, 0.28)]),
    "factory-conveyor-segment": lambda B: (B.box((0, 0, 0.30), (0.34, 0.90, 0.06), "ink"), [B.box((sx * 0.14, 0, 0.16), (0.06, 0.20, 0.28), "stone") for sx in (-1, 1)],
                                           [B.cone((-0.16, y, 0.35), (1, 0, 0), 0.32, 0.03, 0.03, segs=6, mat="accent") for y in (-0.30, 0.0, 0.30)]),
    "factory-valve": lambda B: (B.cone((0, 0.30, 0.16), FRONT, 0.60, 0.08, 0.08, segs=8, mat="stone"), B.box((0, 0, 0.16), (0.20, 0.20, 0.20), "ink"),
                                B.cyl((0, 0, 0.26), 0.12, 0.03, segs=6, mat="ink"), gear(B, (0, 0, 0.40), 0.10, mat="accent", axis="Z", teeth=6)),
    "factory-barrel": lambda B: barrel(B, (0, 0, 0), mat="accent2", band="ink"),
    "factory-forklift": lambda B: (B.box((0, 0.05, 0.20), (0.36, 0.44, 0.18), "accent"), [wheel(B, (sx * 0.20, y, 0.09), 0.09) for sx in (-1, 1) for y in (-0.16, 0.18)],
                                   [B.box((sx * 0.14, 0.02, 0.44), (0.06, 0.06, 0.34), "ink") for sx in (-1, 1)], B.box((0, 0.02, 0.62), (0.36, 0.06, 0.06), "ink"),
                                   [B.box((x, -0.26, 0.42), (0.06, 0.06, 0.70), "stone") for x in (-0.15, 0.15)], B.box((0, -0.26, 0.76), (0.36, 0.06, 0.06), "stone"),
                                   B.box((0, -0.40, 0.04), (0.30, 0.30, 0.04), "stone")),
    "factory-warning-light": lambda B: (B.cyl((0, 0, 0), 0.06, 0.10, segs=6, mat="ink"), B.cyl((0, 0, 0.06), 0.40, 0.03, segs=6, mat="stone"),
                                        B.cyl((0, 0, 0.46), 0.12, 0.06, segs=8, mat="accent"), B.cone((0, 0, 0.58), UP, 0.04, 0.07, 0.0, segs=8, mat="ink")),
    "park-hedge-block": lambda B: (B.box((0, 0, 0.22), (0.50, 0.50, 0.44), "leaf", bevel=0.06), B.box((0, 0, 0.02), (0.54, 0.54, 0.04), "road")),
    "park-bench": lambda B: (B.box((0, 0, 0.40), (0.70, 0.28, 0.05), "accent2"), B.box((0, 0.13, 0.55), (0.70, 0.04, 0.20), "accent2"),
                             [B.box((sx * 0.28, 0.0, 0.19), (0.06, 0.26, 0.38), "ink") for sx in (-1, 1)]),
    "park-golf-flag": lambda B: (B.cyl((0, 0, 0), 0.03, 0.12, segs=8, mat="leaf"), park_flag(B, (0, 0, 0.03), 0.60)),
    "park-fountain": lambda B: (B.ring(0.36, 0.45, 0.0, 0.16, 10, "accent2", top_in=0.14), B.cyl((0, 0, 0), 0.11, 0.37, segs=10, mat="water"),
                                B.cyl((0, 0, 0.11), 0.30, 0.06, segs=6, mat="accent2"), B.cone((0, 0, 0.36), UP, 0.09, 0.07, 0.20, segs=8, mat="accent2"),
                                B.cyl((0, 0, 0.45), 0.03, 0.17, segs=8, mat="water"), B.ico((0, 0, 0.51), 0.045, "water", subdiv=1)),
    "park-bandstand": lambda B: scaled(B, 0.7, park_s2b_core),
    "park-duck": lambda B: (B.ico((0, 0, 0.12), 0.14, "snow", scale=(1.0, 1.4, 0.8), jitter=0.03, seed="duck"), B.ico((0, -0.20, 0.26), 0.08, "snow", subdiv=1),
                            B.cone((0, -0.27, 0.25), FRONT, 0.09, 0.035, 0.0, segs=4, mat="accent2"), [B.ico((sx * 0.04, -0.25, 0.28), 0.015, "ink", subdiv=1) for sx in (-1, 1)],
                            B.cone((0, -0.27, 0.25), FRONT, 0.08, 0.035, 0.0, segs=4, mat="peach")),
    "park-picnic-table": lambda B: (B.box((0, 0, 0.40), (0.56, 0.90, 0.05), "wood"), [B.box((sx * 0.42, 0, 0.24), (0.16, 0.90, 0.04), "wood") for sx in (-1, 1)],
                                    [B.box((0, y, 0.20), (0.90, 0.05, 0.05), "wood", rot=rot_y(0)) for y in (-0.30, 0.30)],
                                    [B.box((sx * 0.20, y, 0.11), (0.05, 0.05, 0.22), "wood") for sx in (-1, 1) for y in (-0.30, 0.30)]),
    "park-topiary": lambda B: (B.box((0, 0, 0.10), (0.30, 0.30, 0.20), "accent2"), B.cyl((0, 0, 0.20), 0.20, 0.03, segs=5, mat="wood"),
                               B.ico((0, 0, 0.56), 0.18, "leaf", jitter=0.03, seed="topiary"), B.cone((0, 0, 0.72), UP, 0.22, 0.10, 0.0, segs=6, mat="leaf")),
}


# motif cores reused by props (the stage-2 builders wrap these with their s1 continuity motif)
def medieval_s2b_core(B):
    B.lathe([(0.34, 0.0), (0.26, 0.5), (0.22, 0.66)], 8, "stone")
    B.dome((0, 0, 0.66), 0.23, "wood")
    B.cone((0, -0.22, 0.72), FRONT, 0.10, 0.035, 0.035, segs=6, mat="ink")
    for k in range(4):
        r = rot_y(45 + 90 * k)
        B.box(Vector((0, -0.31, 0.72)) + r @ Vector((0, 0, 0.19)), (0.12, 0.02, 0.32), "accent2", rot=r)
    B.door((0, -0.335, 0.20), FRONT, 0.12, 0.22)


def jungle_s2_core(B):
    for sx in (-1, 1):
        for sy in (-1, 1):
            B.cyl((sx * 0.26, sy * 0.22, 0), 0.36, 0.04, segs=5, mat="wood")
    B.box((0, 0, 0.40), (0.62, 0.52, 0.06), "wood")
    B.box((0, 0, 0.62), (0.50, 0.42, 0.38), "straw")
    B.cone((0, 0, 0.80), UP, 0.24, 0.48, 0.0, segs=4, mat="accent", phase=math.pi / 4)
    B.door((0, -0.21, 0.58), FRONT, 0.14, 0.24)
    B.box((0, -0.30, 0.20), (0.16, 0.02, 0.40), "wood")


def wildwest_s2b_core(B):
    for sx in (-1, 1):
        for sy in (-1, 1):
            B.cone((sx * 0.26, sy * 0.26, 0), (-sx * 0.2, -sy * 0.2, 1.0), 0.86, 0.03, 0.02, segs=4, mat="wood")
    for z in (0.30, 0.60):
        B.box((0, 0, z), (0.40 - z * 0.3, 0.40 - z * 0.3, 0.04), "wood")
    B.cyl((0, 0, 0.84), 0.08, 0.05, segs=6, mat="ink")
    with B.at((0, -0.10, 0.90), 1.0, rot=rot_x(90)):
        B.cyl((0, 0, -0.02), 0.04, 0.06, segs=8, mat="ink")
        for k in range(8):
            B.box(polar(0.16, 45 * k, 0.0), (0.16, 0.08, 0.02), "straw", rot=rot_z(45 * k))


def park_s2b_core(B):
    B.cyl((0, 0, 0), 0.10, 0.46, segs=8, mat="snow")
    for k in range(8):
        q = polar(0.36, 22.5 + 45 * k, 0.10)
        B.cyl(q, 0.52, 0.035, segs=6, mat="snow")
    B.cyl((0, 0, 0.62), 0.04, 0.42, segs=8, mat="snow")
    B.cone((0, 0, 0.66), UP, 0.26, 0.50, 0.0, segs=8, mat="accent")
    B.box((0, -0.28, 0.18), (0.36, 0.12, 0.08), "accent2")


# ----------------------------------------------------------------------------- new families: terrain

def terrain_space_big_crater(B):
    B.lathe([(1.20, 0.0), (1.50, 0.40), (1.20, 0.55), (0.95, 0.10), (1.20, 0.0)], 12, "alt", closed=True)
    B.cyl((0, 0, 0), 0.10, 1.0, segs=12, mat="ground")
    B.cone((0, 0, 0.10), UP, 1.20, 0.40, 0.0, segs=7, mat="alt")
    for p, r in (((0.7, -0.3, 0.12), 0.16), ((-0.6, 0.5, 0.12), 0.14), ((1.30, -0.50, 0.30), 0.20)):
        B.ico(p, r, "alt", scale=(1, 0.9, 0.7), jitter=0.08, seed=f"crater{r}")
    B.cyl((-1.25, -0.45, 0.30), 0.3, 0.08, segs=4, mat="snow")
    flagpole(B, (-1.25, -0.45, 0.6), 0.5, cloth="accent2", pole="snow", r=0.06)


def terrain_lab_reactor_plateau(B):
    B.cyl((0, 0, 0), 0.25, 1.50, segs=8, mat="snow")
    B.cyl((0, 0, 0.25), 0.20, 1.15, segs=8, mat="pale")
    B.cyl((0, 0.30, 0.45), 0.04, 0.55, segs=10, mat="water")
    for x in (-0.75, 0.75):
        B.cyl((x, -0.30, 0.45), 1.20, 0.22, segs=6, mat="water")
        B.cyl((x, -0.30, 1.65), 0.08, 0.26, segs=6, mat="snow")
    B.cone((-0.75, -0.30, 1.30), (1, 0, 0), 1.50, 0.06, 0.06, segs=6, mat="accent2")
    B.lathe([(0.34, -0.03), (0.38, -0.03), (0.38, 0.03), (0.34, 0.03), (0.34, -0.03)], 12, "accent2", closed=True,
            center=(0, 0.30, 1.05), rot=rot_x(90))
    B.cyl((0, 0.30, 0.45), 0.60, 0.04, segs=5, mat="ink")


def terrain_medieval_castle_mound(B):
    mound(B, (0, 0), 1.45, 0.45, "ground", "motte", jitter=0.03)
    ring_wall(B, 1.0, 0.45, 10, "stone", z0=0.55)
    B.box((0, -0.95, 0.80), (0.50, 0.30, 0.50), "stone")
    B.window((0, -1.10, 0.75), FRONT, 0.22, 0.34, mat="ink")
    B.cyl((0, 0, 0.60), 0.70, 0.36, segs=8, mat="stone")
    B.cone((0, 0, 1.30), UP, 0.34, 0.42, 0.0, segs=8, mat="accent")
    with B.at((0, 0, 1.60), 1.8):
        medieval_banner(B, (0, 0, 0), 0.34)


def terrain_jungle_waterfall_mesa(B):
    mound(B, (0, 0.2), 1.40, 0.9, "ground", "mesa", jitter=0.04, sxy=(1.0, 0.8))
    B.cyl((0, 0.2, 1.60), 0.30, 0.70, segs=8, mat="leaf")
    B.box((0, -0.90, 0.90), (0.36, 0.20, 1.60), "water")
    B.cyl((0, -1.35, 0.0), 0.06, 0.55, segs=10, mat="water")
    B.ico((0, -1.25, 0.08), 0.16, "pale", scale=(1.2, 1, 0.5), jitter=0.05, seed="mesa-mist")
    palm(B, (0.55, 0.30, 1.85), 0.75)
    palm(B, (-0.60, 0.10, 1.80), 0.7, lean=(-0.2, 0.0))


def terrain_wildwest_butte(B):
    B.lathe([(1.50, 0.0), (1.30, 0.6), (1.10, 0.62), (1.05, 1.3), (0.90, 1.32), (0.85, 2.0)], 9, "ground", phase=0.2)
    for z in (0.60, 1.30):
        B.cyl((0, 0, z), 0.10, 1.12 if z < 1 else 0.92, segs=9, mat="accent", phase=0.2)
    B.cyl((0, 0, 2.0), 0.06, 0.85, segs=9, mat="alt", phase=0.2)
    with B.at((0.1, -0.1, 2.02), 0.75):
        cactus(B, True)
    B.ico((1.15, -0.45, 0.12), 0.22, "accent", scale=(1, 0.9, 0.6), jitter=0.08, seed="butte-rock")


def terrain_cave_crystal_pillar(B):
    B.lathe([(0.75, 0.0), (0.55, 0.7), (0.62, 1.3), (0.45, 2.0), (0.38, 2.4)], 7, "alt", phase=0.3)
    for p, s, m, d in (((0.45, -0.30, 1.1), 0.55, "accent", (0.7, -0.4, 0.6)), ((-0.50, 0.10, 1.6), 0.45, "accent2", (-0.8, 0.2, 0.5)),
                       ((0.20, 0.40, 2.1), 0.50, "accent", (0.3, 0.7, 0.8)), ((0.05, -0.05, 2.36), 0.50, "accent2", (0.1, -0.1, 1.0))):
        crystal(B, p, s, m, d=d, r=s * 0.26)
    B.box((0, -0.55, 0.80), (0.50, 0.30, 0.08), "stone")
    cave_lantern(B, (0.10, -0.60, 0.84))
    B.ico((0.9, -0.5, 0.12), 0.24, "alt", scale=(1, 0.9, 0.6), jitter=0.08, seed="pillar-rock")


def terrain_graveyard_crypt_hill(B):
    mound(B, (0, 0), 1.45, 0.5, "ground", "crypt-hill", jitter=0.03)
    B.box((0, -0.95, 0.50), (0.60, 0.40, 0.60), "stone")
    B.dome((0, -0.95, 0.80), 0.30, "alt", scale=(1, 0.8, 0.6))
    B.window((0, -1.15, 0.45), FRONT, 0.22, 0.36, mat="ink")
    willow(B, (0.15, 0.30, 0.95), 1.05, leaf="alt")
    for k in range(10):
        a = 36 * k
        q = polar(1.35, a, 0.0)
        z = mound_z((q.x, q.y), 1.45, 0.5)
        B.box((q.x, q.y, z + 0.16), (0.06, 0.06, 0.40), "ink", rot=rot_z(a))
    B.lathe([(1.35, 0.30), (1.35, 0.34), (1.32, 0.34), (1.32, 0.30), (1.35, 0.30)], 10, "ink", closed=True)
    grave_lantern(B, (-0.55, -0.85, 0.60), glow="window")


def terrain_factory_slag_mesa(B):
    B.cyl((0, 0, 0), 0.30, 1.50, segs=8, mat="stone", phase=math.pi / 8)
    B.cyl((0, 0, 0.30), 0.25, 1.10, segs=8, mat="ground", phase=math.pi / 8)
    B.cyl((0.35, 0.30, 0.55), 0.04, 0.45, segs=10, mat="water")
    for x in (-0.60, -0.15):
        B.cone((x, -0.35, 0.55), UP, 1.10 + 0.2 * (x < -0.3), 0.16, 0.12, segs=8, mat="coral")
        smoke(B, (x, -0.35, 1.65 + 0.2 * (x < -0.3)), r=0.11)
    B.cone((-0.60, 0.20, 0.75), (1, 0, 0), 1.20, 0.08, 0.08, segs=8, mat="stone")
    B.cone((0.60, 0.20, 0.55), UP, 0.20, 0.08, 0.08, segs=8, mat="stone")
    B.box((0.75, -0.60, 0.72), (0.34, 0.34, 0.34), "accent")


def terrain_park_bandstand_hill(B):
    mound(B, (0, 0), 1.45, 0.42, "ground", "park-hill", jitter=0.02)
    B.lathe([(1.15, 0.30), (1.15, 0.34), (0.95, 0.34), (0.95, 0.30), (1.15, 0.30)], 12, "road", closed=True)
    with B.at((0, 0, 0.90), 0.9):
        park_s2b_core(B)
    for a in (210, 270, 330):
        q = polar(1.05, a, 0.0)
        with B.at((q.x, q.y, mound_z((q.x, q.y), 1.45, 0.42) - 0.04), 0.8):
            B.box((0, 0, 0.10), (0.30, 0.30, 0.20), "accent2")
            B.cyl((0, 0, 0.20), 0.20, 0.03, segs=5, mat="wood")
            B.ico((0, 0, 0.56), 0.18, "leaf", jitter=0.03, seed=f"top{a}")


NEW_TERRAIN = {
    "space": terrain_space_big_crater, "lab": terrain_lab_reactor_plateau, "medieval": terrain_medieval_castle_mound,
    "jungle": terrain_jungle_waterfall_mesa, "wildwest": terrain_wildwest_butte, "cave": terrain_cave_crystal_pillar,
    "graveyard": terrain_graveyard_crypt_hill, "factory": terrain_factory_slag_mesa, "park": terrain_park_bandstand_hill,
}

# ----------------------------------------------------------------------------- heroes (g0..g3, same convention as tools/growth-factory)

def hero_lab(B, g):
    H = HERO_HEIGHT[g]
    if g == 0:
        scaled(B, 0.75, lab_s1)
        return
    r = 0.18 + 0.06 * g
    Hs = H * (0.70 if g == 3 else 0.78)
    B.cyl((0, 0, 0), 0.10, r * 2.2, segs=8, mat="snow")
    B.cyl((0, 0, 0.10), Hs, r, segs=6, mat="water", phase=math.pi / 6)
    for i in range(g + 1):
        B.cyl((0, 0, 0.10 + Hs * (i + 1) / (g + 2)), 0.06, r * 1.15, segs=6, mat="accent2", phase=math.pi / 6)
    lab_flask(B, (0, 0, 0.10 + Hs), H * 0.36 / 0.41 * 0.5, glass="window", liquid="accent")
    if g >= 2:
        B.cyl((r * 1.8, 0, 0), H * 0.55, r * 0.6, segs=6, mat="water", phase=math.pi / 6)
        B.cone((r * 1.8, 0, H * 0.55), UP, 0.04, r * 0.7, r * 0.7, segs=6, mat="snow")
        B.cone((0, 0, H * 0.45), (1, 0, 0), r * 1.8, 0.06, 0.06, segs=6, mat="snow")
    if g == 3:
        B.cyl((0, 0, H * 0.86), 0.25, 0.05, segs=5, mat="ink")
        B.lathe([(0.55, -0.05), (0.62, -0.05), (0.62, 0.05), (0.55, 0.05), (0.55, -0.05)], 12, "accent2", closed=True,
                center=(0, 0, H * 0.86 + 0.25), rot=rot_x(90))
        for a in (60, 180, 300):
            q = polar(r * 1.6, a, H * 0.3)
            B.cyl(q, 0.04, 0.02, segs=4, mat="ink")


def hero_jungle(B, g):
    H = HERO_HEIGHT[g]
    if g == 0:
        scaled(B, 0.75, jungle_s1)
        return
    tiers = 1 + g
    for i in range(tiers):
        rr = (0.5 + 0.45 * g) * (1.0 - 0.2 * i)
        B.cyl((0, 0, H * i / tiers), H / tiers, rr, segs=8, mat="stone" if i % 2 else "ground", phase=0.2)
    if g >= 1:
        B.box((0, -(0.5 + 0.45 * g) * 0.75, H * 0.5), (0.10 + 0.06 * g, 0.14, H * 0.98), "water")
        B.cyl((0, -(0.5 + 0.45 * g) * 0.95, 0), 0.05, 0.40 + 0.22 * g, segs=10, mat="water")
        B.ico((0, -(0.5 + 0.45 * g) * 1.0, 0.05 + (0.10 + 0.04 * g) * 0.5), 0.10 + 0.04 * g, "pale", scale=(1.2, 1, 0.5), jitter=0.05, seed="hero-mist")
    else:
        B.box((0, -0.35, 0.22), (0.08, 0.10, 0.44), "water")
    for a in ((40, 140) if g >= 2 else (60,)):
        q = polar((0.5 + 0.45 * g) * 0.62, a, H * min(2, tiers - 1) / tiers)
        palm(B, (q.x, q.y, q.z - 0.08), 0.5 * H / tiers)
    if g == 3:
        torch(B, (0.5, -1.2, 0.0), 0.7)
        torch(B, (-0.5, -1.2, 0.0), 0.7)


def hero_wildwest(B, g):
    H = HERO_HEIGHT[g]
    if g == 0:
        barrel(B, (0, 0, 0.0), r=0.15, h=0.40)
        B.box((0, 0, 0.42), (0.32, 0.32, 0.05), "wood")
        wildwest_horseshoe(B, (0, -0.16, 0.22), 0.05)
        return
    if g == 3:
        H = H * 0.8   # the windpump core on top brings the total back to 4.5 m
    w = 0.30 + 0.12 * g
    for sx in (-1, 1):
        for sy in (-1, 1):
            B.box((sx * w, sy * w, H * 0.32), (0.08 + 0.02 * g, 0.08 + 0.02 * g, H * 0.64), "wood")
    for z in (H * 0.25, H * 0.5):
        B.box((0, 0, z), (2 * w + 0.08, 2 * w + 0.08, 0.05), "wood")
    B.lathe([(w * 1.1, H * 0.62), (w * 1.2, H * 0.66), (w * 1.2, H * 0.88), (w * 1.1, H * 0.92)], 8, "accent2")
    B.cone((0, 0, H * 0.92), UP, H * 0.08, w * 1.3, 0.0, segs=8, mat="ink")
    wildwest_horseshoe(B, (0, -w * 1.2, H * 0.77), 0.06 + 0.02 * g)
    if g >= 2:
        B.box((0, -w * 1.22, H * 0.7), (w * 0.9, 0.02, w * 0.9), "snow")
        B.cone((0, -w * 1.235, H * 0.7), FRONT, 0.02, w * 0.38, w * 0.38, segs=8, mat="accent")
    if g == 3:
        B.box((0, 0, H + 0.40), (w * 1.4, w * 1.4, 0.80), "accent2")
        B.cone((0, -w * 0.705, H + 0.45), FRONT, 0.02, w * 0.45, w * 0.45, segs=8, mat="snow")
        pyramid_roof(B, (0, 0, H + 0.80), w * 0.7, 0.32, "ink")


def hero_cave(B, g):
    H = HERO_HEIGHT[g]
    R = 0.28 + 0.45 * g
    if g == 0:
        scaled(B, 0.76, cave_s1)
        return
    mound(B, (0, 0.1 * g), R, 1.0, "alt", "hero-geode", sxy=(1.0, 0.8))
    B.window((0, -R * 0.55, H * 0.28), FRONT, R * 0.7, H * 0.5, mat="ink")
    for k, (a, s) in enumerate(((0, 0.55), (60, 0.45), (120, 0.5), (180, 0.4), (240, 0.5), (300, 0.42))):
        q = polar(R * 0.55, a, 0.0)
        zq = mound_z((q.x, q.y), R, 1.0, (1.0, 0.8)) - 0.15   # base sunk into the geode shell
        crystal(B, (q.x, q.y + 0.1 * g, zq), s * H * 0.8, "accent" if k % 2 else "accent2", d=(q.x, q.y, R * 0.8), r=s * H * 0.16)
    top = 1.5 * R   # mound apex; the central crystal brings the hero to its band height
    crystal(B, (0, 0.1 * g, top - 0.15), H - top + 0.15, "accent", d=(0.05, -0.1, 1.0), r=H * 0.09)
    if g >= 2:
        for a in (225, 250, 290, 315):
            q = polar(R * 0.70, a)
            z = mound_z((q.x, q.y), R, 1.0, (1.0, 0.8)) - 0.22
            B.box((q.x, q.y + 0.1 * g, z), (0.26, 0.26, 0.34), "road")
            cave_lantern(B, (q.x, q.y + 0.1 * g, z + 0.17))


def hero_graveyard(B, g):
    H = HERO_HEIGHT[g]
    willow(B, (0, 0, 0), H * 0.98, leaf="alt")
    B.cyl((0, 0, 0), 0.06, 0.25 + 0.2 * g, segs=8, mat="ground")
    if g >= 2:
        for a in (45, 135, 225, 315):
            q = polar(H * 0.20, a, H * 0.5)
            B.cyl((q.x, q.y, q.z), H * 0.16, 0.03, segs=4, mat="ink")
            grave_lantern(B, (q.x, q.y, q.z), glow="window")
    if g == 3:
        for a in (20, 200):
            q = polar(H * 0.22, a, H * 0.74)
            B.ico((q.x, q.y, q.z), 0.22, "pale", scale=(1, 1, 1.3), seed=f"ghost{a}")


def hero_factory(B, g):
    H = HERO_HEIGHT[g]
    if g == 0:
        scaled(B, 0.75, factory_s1)
        return
    B.box((0, 0, 0.12), (0.5 + 0.3 * g, 0.5 + 0.3 * g, 0.24), "stone")
    B.cone((0, 0, 0.24), UP, H - 0.55, 0.10 + 0.05 * g, 0.08 + 0.04 * g, segs=8, mat="coral")
    B.cyl((0, 0, H - 0.31), 0.05, 0.12 + 0.05 * g, segs=8, mat="ink")
    smoke(B, (0, 0, H - 0.27), r=0.08 + 0.04 * g)
    gear(B, (0, -(0.10 + 0.05 * g), 0.30), 0.08 + 0.02 * g, mat="accent", axis="Y")
    for i in range(g):
        a = 45 + 120 * i
        q = polar(0.25 + 0.15 * g, a, 0.24)
        B.cone(q, UP, H * (0.5 + 0.1 * i), 0.07 + 0.02 * g, 0.06 + 0.02 * g, segs=8, mat="coral")
        smoke(B, (q.x, q.y, 0.24 + H * (0.5 + 0.1 * i)), r=0.07 + 0.02 * g)
    if g == 3:
        B.lathe([(1.0, 0.24), (1.0, 0.34), (0.85, 0.34), (0.85, 0.24), (1.0, 0.24)], 12, "ink", closed=True)
        for k in range(6):
            B.box(polar(0.92, 60 * k, 0.40), (0.18, 0.18, 0.12), "accent", rot=rot_z(60 * k))


def hero_park(B, g):
    H = HERO_HEIGHT[g]
    if g == 0:
        scaled(B, 0.72, park_s1)
        return
    tiers = 1 + g
    B.cyl((0, 0, 0), 0.06, 0.45 + 0.35 * g, segs=12, mat="road")
    for i in range(tiers):
        rr = (0.40 + 0.30 * g) * (1.0 - 0.3 * i / tiers)
        z = 0.06 + (H - 0.5) * i / tiers
        B.ring(rr * 0.8, rr, z, z + 0.14, 10, "accent2", top_in=z + 0.12)
        B.cyl((0, 0, z), 0.10, rr * 0.82, segs=10, mat="water")
        if i < tiers - 1:
            B.cyl((0, 0, z + 0.10), (H - 0.5) / tiers, rr * 0.18, segs=6, mat="accent2")
    top = 0.06 + (H - 0.5) * (tiers - 1) / tiers + 0.12
    B.cone((0, 0, top), UP, 0.20, 0.04, 0.04, segs=6, mat="water")
    B.ico((0, 0, top + 0.22), 0.06 + 0.02 * g, "water", subdiv=1)
    park_flag(B, (0, 0, top + 0.20), H * 0.1 + 0.2, r=0.03 + 0.02 * g)
    if g >= 2:
        for a in (200, 270, 340):
            q = polar(0.36 + 0.32 * g, a, 0.06)
            B.box(q + Vector((0, 0, 0.25)), (0.09, 0.09, 0.50), "ink")
            B.ico((q.x, q.y, 0.60), 0.08, "window", subdiv=1)


HEROES = {"lab": hero_lab, "jungle": hero_jungle, "wildwest": hero_wildwest, "cave": hero_cave,
          "graveyard": hero_graveyard, "factory": hero_factory, "park": hero_park}

# ----------------------------------------------------------------------------- ruin / scaffold (per family, generic recipe)

def ruin(B, family, s1_motif):
    """Comic catastrophe state on the stage-2 footprint: palette rubble with charred facets, the family's
    s1 motif poking out tilted, attached smoke on stems and a small star."""
    rng = random.Random(f"ruin|{family}")
    mound(B, (0, 0), 0.62, 0.35, "ground", f"ruin-{family}", jitter=0.08, sxy=(1.0, 0.85))
    for i in range(7):
        a = rng.uniform(0, 360)
        r = rng.uniform(0.10, 0.45)
        q = polar(r, a, 0.10 + rng.uniform(0, 0.15))
        mat = "ink" if i % 3 == 0 else ("accent" if i % 3 == 1 else "stone")
        B.box(q, (0.16 + rng.uniform(0, 0.12), 0.12 + rng.uniform(0, 0.10), 0.10 + rng.uniform(0, 0.12)), mat,
              rot=rot_z(rng.uniform(0, 90)) @ rot_x(rng.uniform(-25, 25)))
    B.box((0.25, 0.10, 0.34), (0.30, 0.06, 0.40), "stone", rot=rot_y(28))   # leaning wall
    with B.at((-0.12, -0.08, 0.16), 0.7, rot=rot_x(-18) @ rot_z(20)):
        s1_motif(B)
    smoke(B, (0.28, 0.18, 0.40), r=0.12, stem=0.10, subdiv=1)
    smoke(B, (-0.34, 0.22, 0.24), r=0.08, stem=0.08, subdiv=1)
    star(B, (0.42, -0.30, 0.22), r=0.10)


def scaffold(B, family, s1_motif):
    """Recovery state: wood posts and planks around a half-rebuilt s1 motif."""
    for sx in (-1, 1):
        for sy in (-1, 1):
            B.box((sx * 0.42, sy * 0.36, 0.50), (0.06, 0.06, 1.00), "wood")
    for sy in (-1, 1):
        B.box((0, sy * 0.36, 0.75), (0.90, 0.05, 0.05), "wood")
    for sx in (-1, 1):
        B.box((sx * 0.42, 0, 0.75), (0.05, 0.78, 0.05), "wood")
    B.box((0, -0.36, 0.78), (0.70, 0.16, 0.03), "straw")   # walk plank
    B.box((0, 0.10, 0.92), (0.30, 0.20, 0.04), "wood")   # top platform
    B.box((-0.20, 0.10, 0.15), (0.34, 0.30, 0.30), "stone")   # half-rebuilt wall course
    with B.at((0.12, -0.05, 0.0), 0.7):
        s1_motif(B)


# ----------------------------------------------------------------------------- shared marker parts (assets/landmarks/shared)

def pedestal_tier(B, radius, side_h=1.9, cap_h=0.9, overhang=0.7):
    """12-facet cake tier: #f6ecd2 side, #fffaf3 cap overhanging by `overhang`; the runtime tints per family."""
    B.cyl((0, 0, 0), side_h, radius, segs=12, mat="cream2", phase=math.pi / 12)
    B.cyl((0, 0, side_h), cap_h, radius + overhang, segs=12, mat="cream", phase=math.pi / 12)


def shared_signpost(B):
    B.cyl((0, 0, 0), 0.10, 0.22, segs=8, mat="stone")
    B.box((0, 0, 0.85), (0.16, 0.16, 1.70), "wood")
    with B.at((0, -0.12, 1.20), 1.0, rot=rot_x(-8)):
        B.box((0, 0, 0), (1.30, 0.06, 0.56), "straw")
        B.box((0, -0.01, 0.28), (1.34, 0.08, 0.05), "wood")
        B.box((0, -0.01, -0.28), (1.34, 0.08, 0.05), "wood")
        for sx in (-1, 1):
            B.box((sx * 0.66, -0.01, 0), (0.05, 0.08, 0.60), "wood")
    B.cone((0, 0, 1.70), UP, 0.12, 0.13 * math.sqrt(2), 0.0, segs=4, mat="wood", phase=math.pi / 4)


SHARED = {
    "pedestal-tier-1": lambda B: pedestal_tier(B, 16.0),
    "pedestal-tier-2": lambda B: pedestal_tier(B, 11.5),
    "pedestal-tier-3": lambda B: pedestal_tier(B, 7.5),
    "signpost": shared_signpost,
    "shared-rowboat": lambda B: (B.loft([(-0.22, -0.55, 0.05), (0.22, -0.55, 0.05), (0.30, 0.0, 0.05), (0.22, 0.55, 0.05), (-0.22, 0.55, 0.05), (-0.30, 0.0, 0.05)],
                                        [(-0.28, -0.70, 0.30), (0.28, -0.70, 0.30), (0.38, 0.0, 0.30), (0.28, 0.70, 0.30), (-0.28, 0.70, 0.30), (-0.38, 0.0, 0.30)], "wood"),
                                 B.box((0, 0, 0.29), (0.72, 0.03, 0.04), "coral"),
                                 [B.box((0, y, 0.22), (0.56, 0.10, 0.03), "straw") for y in (-0.25, 0.25)]),
    "shared-dock": lambda B: ([B.cyl((sx * 0.30, sy * 0.50, 0.0), 0.34, 0.05, segs=4, mat="ink") for sx in (-1, 1) for sy in (-1, 1)],
                              [B.box((-0.24 + 0.24 * i, 0.0, 0.37), (0.22, 1.20, 0.06), "wood") for i in range(3)]),
    "shared-peak": lambda B: (B.lathe([(0.60, 0.0), (0.45, 0.6), (0.28, 1.2), (0.20, 1.5)], 7, "stone", phase=0.2),
                              B.lathe([(0.22, 1.48), (0.10, 1.75), (0.0, 1.95)], 7, "snow", phase=0.2)),
    "shared-pillar": lambda B: (B.cyl((0, 0, 0), 0.10, 0.26, segs=6, mat="stone"), B.cyl((0, 0, 0.10), 0.70, 0.16, segs=6, mat="stone"),
                                B.box((0, 0, 0.84), (0.42, 0.42, 0.08), "stone")),
    "shared-tower-block": lambda B: (B.box((0, 0, 0.45), (0.50, 0.50, 0.90), "cream2"), pyramid_roof(B, (0, 0, 0.90), 0.25, 0.28, "slate"),
                                     [B.window((sx * 0.25, 0, 0.55), (sx, 0, 0), 0.14, 0.30) for sx in (-1, 1)],
                                     [B.window((x, -0.25, 0.50), FRONT, 0.12, 0.30) for x in (-0.12, 0.12)]),
}
SHARED_BUDGET = {"pedestal-tier-1": 400, "pedestal-tier-2": 400, "pedestal-tier-3": 400, "signpost": 400,
                 "shared-rowboat": 120, "shared-dock": 100, "shared-peak": 120, "shared-pillar": 60, "shared-tower-block": 90}
SHARED_MAX_HEIGHT = {"pedestal-tier-1": 3.0, "pedestal-tier-2": 3.0, "pedestal-tier-3": 3.0, "signpost": 2.0}

TERRAIN = {
    "ice": ("mountain-cone", terrain_mountain_cone),
    "forest": ("hill-with-trees", terrain_hill_with_trees),
    "city": ("plaza-slab-with-fountain", terrain_plaza_slab),
    "sand": ("dune", terrain_dune),
    "meadow": ("grassy-knoll", terrain_grassy_knoll),
    "ocean": ("sea-stack", terrain_sea_stack),
    "volcanic": ("caldera-rim", terrain_caldera_rim),
}
for _b, _fn in NEW_TERRAIN.items():
    TERRAIN[_b] = (prop_short(FAMILIES[_b]["terrain_piece"]["id"], _b), _fn)
LANDMARKS.update(NEW_LANDMARKS)
for _b in NEW_LANDMARKS:
    PROPS[_b] = []
    for _p in FAMILIES[_b]["props"]:
        if _p["id"] not in NEW_PROPS:
            raise KeyError(f"catalogue prop {_p['id']} has no builder")
        PROPS[_b].append((prop_short(_p["id"], _b), NEW_PROPS[_p["id"]]))
# shipped families: the catalogue lists the same prop ids; any extra/missing id is reported as a diff
_PROP_DIFFS = []
for _b in SHIPPED:
    _cat = [prop_short(p["id"], _b) for p in FAMILIES[_b]["props"]]
    _mine = [n for n, _ in PROPS[_b]]
    if _cat != _mine:
        _PROP_DIFFS.append(f"{_b}: catalogue props {_cat} vs factory {_mine}")


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
            bg.inputs[1].default_value = WORLD_STRENGTH

        # cyclorama: cream ground sweeping up into a back wall (no horizon seam). Sized for a 0.8 m subject
        # like the creature stage; frame() scales it together with the lights so every cell looks alike.
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
        self.tile = None
        self.tile_mat = make_material("stage_tile", BACKDROP, roughness=0.8)

        cam_data = bpy.data.cameras.new("stage_cam")
        cam_data.lens = 50.0
        cam_data.sensor_width = 36.0
        cam_data.clip_start = 0.05
        cam_data.clip_end = 200.0
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
            ld.energy = energy * LIGHT_GAIN
            ld.size = size
            ld.color = color
            ld.shadow_soft_size = size * 0.5
            if hasattr(ld, "spread"):
                ld.spread = math.radians(spread)
            lo = bpy.data.objects.new("stage_" + name, ld)
            lo.location = pos
            scene.collection.objects.link(lo)
            self.lights.append(lo)
        self.light_base = [(Vector(lo.location), lo.data.energy, lo.data.size) for lo in self.lights]

        txt = bpy.data.curves.new("stage_label", "FONT")
        txt.body = ""
        txt.size = 0.046
        txt.align_x = "CENTER"
        txt.align_y = "CENTER"
        lm = bpy.data.materials.new("stage_label")
        lm.use_nodes = True
        nodes = lm.node_tree.nodes
        for n in list(nodes):
            if n.type != "OUTPUT_MATERIAL":
                nodes.remove(n)
        em = nodes.new("ShaderNodeEmission")
        em.inputs[0].default_value = (0.02, 0.018, 0.022, 1.0)
        em.inputs[1].default_value = 1.0
        lm.node_tree.links.new(em.outputs[0], nodes["Material Output"].inputs[0])
        txt.materials.append(lm)
        self.label = bpy.data.objects.new("stage_label", txt)
        self.label.parent = self.cam
        self.label.location = (0.0, -0.325, -1.0)
        scene.collection.objects.link(self.label)
        self.stage_objects = {self.ground, self.cam, self.label, *self.lights}

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

    def frame(self, bbox_min, bbox_max, tile=None):
        """3/4 view from front-right, 30 degrees down (isometric-ish landmark icon look).
        tile=(radius, hex) drops a flat biome-coloured disc under the subject for contrast."""
        size = bbox_max - bbox_min
        height = size.z
        target = Vector((0.0, 0.0, height * 0.5))
        radius = max(height * 0.5, math.hypot(size.x, size.y) * 0.5, 0.3)
        half_fov = math.atan(18.0 / self.cam.data.lens)
        dist = radius / math.tan(half_fov) * 1.30 + 0.2
        az, el = math.radians(35.0), math.radians(30.0)
        dirn = Vector((math.sin(az) * math.cos(el), -math.cos(az) * math.cos(el), math.sin(el)))
        pos = target + dirn * dist
        self.cam.location = pos
        self.cam.rotation_euler = (target - pos).to_track_quat("-Z", "Y").to_euler()
        # scale the cyclorama and the light distances (power ~ distance^2) with the camera distance so a
        # 0.3 m shell and a 2.5 m mountain get the creature-sheet exposure. Light *size* stays fixed:
        # EEVEE area lights get brighter with size, so scaling it would blow the exposure out.
        k = min(4.0, max(0.5, dist / 1.6))
        self.ground.scale = (k, k, k)
        for lo, (base, energy, lsize) in zip(self.lights, self.light_base):
            lo.location = base * k
            lo.data.energy = energy * k * k
            lo.data.size = lsize
            lo.rotation_euler = (target - lo.location).to_track_quat("-Z", "Y").to_euler()
        self.set_tile(tile)

    def set_tile(self, tile):
        if self.tile is not None:
            mesh = self.tile.data
            bpy.data.objects.remove(self.tile)
            bpy.data.meshes.remove(mesh)
            self.tile = None
        if tile is None:
            return
        radius, hexcolor = tile
        bm = bmesh.new()
        bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=24, radius1=radius, radius2=radius,
                              depth=0.03)
        bmesh.ops.translate(bm, vec=(0, 0, -0.003), verts=bm.verts)  # top face 12 mm above the cyclorama
        mesh = bpy.data.meshes.new("stage_tile")
        bm.to_mesh(mesh)
        bm.free()
        self.tile_mat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = hex_to_linear_rgba(hexcolor)
        mesh.materials.append(self.tile_mat)
        self.tile = bpy.data.objects.new("stage_tile", mesh)
        self.scene.collection.objects.link(self.tile)

    def render(self, label, filepath):
        self.label.data.body = label
        self.label.data.size = min(0.046, 0.046 * 24.0 / max(len(label), 1))
        self.scene.render.filepath = filepath
        try:
            bpy.ops.render.render(write_still=True)
        except Exception as exc:  # GPU-less machines: fall back to Cycles CPU
            if self.scene.render.engine != "CYCLES":
                print(f"[landmark-factory] EEVEE render failed ({exc}); falling back to CYCLES")
                self.set_engine("CYCLES", 24)
                bpy.ops.render.render(write_still=True)
            else:
                raise


def compose_sheet(cell_paths, out_path, cols, cell):
    """Tile rendered cells into one PNG using numpy + bpy.data.images (no PIL)."""
    import numpy as np
    n = len(cell_paths)
    if n == 0:
        return None
    cols = max(1, min(cols, n))
    rows = math.ceil(n / cols)
    h = BACKDROP.lstrip("#")
    sheet = np.empty((rows * cell, cols * cell, 4), dtype=np.float32)
    sheet[..., :3] = [int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4)]
    sheet[..., 3] = 1.0
    for i, path in enumerate(cell_paths):
        img = bpy.data.images.load(path, check_existing=False)
        w, hh = img.size
        buf = np.empty(w * hh * 4, dtype=np.float32)
        img.pixels.foreach_get(buf)
        buf = buf.reshape(hh, w, 4)
        r, c = divmod(i, cols)
        y0 = (rows - 1 - r) * cell
        x0 = c * cell
        ch, cw = min(hh, cell), min(w, cell)
        sheet[y0:y0 + ch, x0:x0 + cw] = buf[:ch, :cw]
        bpy.data.images.remove(img)
    out = bpy.data.images.new("contact_sheet", cols * cell, rows * cell, alpha=False)
    out.pixels.foreach_set(sheet.ravel())
    out.filepath_raw = out_path
    out.file_format = "PNG"
    out.save()
    bpy.data.images.remove(out)
    return rows, cols


# ----------------------------------------------------------------------------- pipeline

def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    p = argparse.ArgumentParser(prog="generate_landmarks.py")
    p.add_argument("--out", default="assets/landmarks", help="output dir (relative to repo root)")
    p.add_argument("--biomes", default=",".join(BIOMES))
    p.add_argument("--only", default="", help="substring filter on asset id (debugging)")
    p.add_argument("--no-render", action="store_true", help="skip cell renders + contact sheets")
    p.add_argument("--no-export", action="store_true", help="skip GLB export (render only)")
    p.add_argument("--no-props", action="store_true")
    p.add_argument("--no-landmarks", action="store_true")
    p.add_argument("--no-terrain", action="store_true")
    p.add_argument("--no-ruins", action="store_true")
    p.add_argument("--no-heroes", action="store_true")
    p.add_argument("--no-shared", action="store_true")
    p.add_argument("--cell", type=int, default=256, help="contact sheet cell size in px")
    p.add_argument("--samples", type=int, default=16, help="EEVEE render samples")
    return p.parse_args(argv)


def colours_for(biome):
    c = dict(NEUTRALS)
    c.update(EXTRAS)
    c.update(PALETTE.get(biome, {}))
    return c


def build_asset(aid, biome, fn):
    B = Builder(colours_for(biome))
    fn(B)
    height, radius, footprint = B.finalize()
    obj, mats = B.to_object(aid)
    used = {role: B.colours[role] for role in B.roles}
    return obj, mats, used, height, radius, footprint


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


def remove_asset(obj, mats):
    mesh = obj.data
    bpy.data.objects.remove(obj)
    bpy.data.meshes.remove(mesh)
    for m in mats:
        bpy.data.materials.remove(m)


def main():
    t0 = time.time()
    args = parse_args()
    out_dir = args.out if os.path.isabs(args.out) else os.path.join(REPO_ROOT, args.out)
    renders_dir = os.path.join(out_dir, "renders")
    os.makedirs(out_dir, exist_ok=True)
    os.makedirs(renders_dir, exist_ok=True)
    biomes = [b for b in args.biomes.split(",") if b]

    bpy.ops.wm.read_factory_settings(use_empty=True)
    stage = None if args.no_render else Stage(args.samples, args.cell)

    entries = []
    landmark_cells, closeup_cells, prop_cells, terrain_cells = [], [], [], []
    ruin_cells, hero_cells, shared_cells = [], [], []
    diffs = catalogue_diffs() + _PROP_DIFFS
    for d in diffs:
        print(f"[landmark-factory] CATALOGUE DIFF {d}")
    issues_total = 0

    def record(aid, biome, kind, stage_no, name, fn, rel_dir, filename, budget, target_h=None, tags=(),
               variant=None, catalog_ref=None, max_h=None):
        nonlocal issues_total
        obj, mats, used, height, radius, footprint = build_asset(aid, biome, fn)
        tris = tri_count(obj.data)
        glb_path = os.path.join(out_dir, rel_dir, filename)
        os.makedirs(os.path.dirname(glb_path), exist_ok=True)
        slots = [m.name for m in mats]
        window_slot = next((s for s in slots if s.endswith("-window")), None)
        entry = {
            "id": aid, "family": biome, "biome": biome, "kind": kind, "stage": stage_no, "variant": variant, "name": name,
            "catalog_ref": catalog_ref,
            "file": os.path.join(args.out, rel_dir, filename).replace(os.sep, "/"),
            "triangles": tris, "budget": budget, "height": round(height, 3),
            "footprint_radius": round(radius, 3), "footprint": [round(footprint[0], 3), round(footprint[1], 3)],
            "colours": used, "material_slots": slots, "tags": list(tags),
            # night variant hint: the runtime swaps this material to emissive after dark (no extra files)
            "night": {"window_material": window_slot, "window_color": NEUTRALS["window"]} if window_slot else None,
            "notes": [],
        }
        if kind == "landmark" and stage_no >= 2 and window_slot is None:
            entry["notes"].append("no window slot on a stage 2/3 landmark")
        if kind == "landmark" and stage_no == 1:
            if not (0.55 <= height <= 0.62):
                entry["notes"].append(f"s1 height {height:.2f} m outside 0.55-0.62")
            if radius < 0.35:
                entry["notes"].append(f"s1 footprint radius {radius:.2f} m < 0.35")
        if kind == "terrain" and not (TERRAIN_HEIGHT[0] <= height <= TERRAIN_HEIGHT[1]):
            entry["notes"].append(f"terrain height {height:.2f} m outside {TERRAIN_HEIGHT}")
        if max_h is not None and height > max_h:
            entry["notes"].append(f"height {height:.2f} m > max {max_h}")
        if target_h is not None:
            entry["target_height"] = target_h
            if abs(height - target_h) > 0.15 * target_h:
                entry["notes"].append(f"height {height:.2f} m deviates from target {target_h} m")
        for note in entry["notes"]:
            print(f"[landmark-factory] NOTE {aid}: {note}")
        if tris >= budget:
            entry["notes"].append(f"{tris} triangles >= budget {budget}")
            print(f"[landmark-factory] WARNING {aid}: {tris} triangles >= budget {budget}")
        if not args.no_export:
            export_glb(obj, glb_path)
            entry["bytes"] = os.path.getsize(glb_path)
            info = vg.inspect_glb(glb_path)
            issues = vg.validate(glb_path, budget, info)
            entry["glb_triangles"] = info["triangles"]
            entry["validation"] = "ok" if not issues else issues
            if issues:
                issues_total += 1
                print(f"[landmark-factory] VALIDATION {aid}: " + "; ".join(issues))
        print(f"[landmark-factory] {aid}: {tris} tris, h={height:.2f} m, r={radius:.2f} m, "
              f"colours={','.join(used)}")
        entries.append(entry)
        return obj, mats, entry

    # landmarks: build the 3 stages of a biome together so the row shares one camera distance
    if not args.no_landmarks:
        for biome in biomes:
            built = []
            fam = LANDMARKS[biome]
            cat_lm = FAMILIES[biome]["landmarks"]
            # row order: s1, s2a, s2b, s2c, s3 (variant a keeps the plain -s2 id / file name); names and
            # file names come from the catalogue
            plan_row = [("s1", 1, None, fam["s1"])]
            for v, fn in zip(VARIANTS, fam["s2"]):
                plan_row.append((f"s2{v}", 2, v, fn))
            plan_row.append(("s3", 3, None, fam["s3"]))
            for key, stage_no, variant, fn in plan_row:
                rel = landmark_file(biome, key)
                aid = os.path.splitext(os.path.basename(rel))[0]
                if args.only and args.only not in aid:
                    continue
                obj, mats, entry = record(aid, biome, "landmark", stage_no, cat_lm[key]["name"], fn,
                                          os.path.dirname(os.path.relpath(rel, "assets/landmarks")), os.path.basename(rel),
                                          BUDGET[stage_no], cat_lm[key].get("height_m", TARGET_HEIGHT[stage_no]),
                                          variant=variant, catalog_ref=f"families[{biome}].landmarks.{key}")
                entry["motif_carried"] = cat_lm[key].get("motif_carried")
                obj.hide_render = True
                built.append((obj, mats, entry))
            if stage is not None and built:
                mn = Vector((1e9, 1e9, 1e9))
                mx = Vector((-1e9, -1e9, -1e9))
                for obj, _, _ in built:
                    a, b = world_bbox(obj)
                    mn = Vector((min(mn.x, a.x), min(mn.y, a.y), min(mn.z, a.z)))
                    mx = Vector((max(mx.x, b.x), max(mx.y, b.y), max(mx.z, b.z)))
                row_tile = max(math.hypot(mn.x, mn.y), math.hypot(mx.x, mx.y)) * 1.15 + 0.25
                for obj, _, entry in built:
                    obj.hide_render = False
                    cell_path = os.path.join(renders_dir, f"{entry['id']}.png")
                    stage.frame(mn, mx, tile=(row_tile, PALETTE[biome]["ground"]))
                    stage.render(entry["id"], cell_path)
                    landmark_cells.append(cell_path)
                    entry["render"] = os.path.relpath(cell_path, out_dir).replace(os.sep, "/")
                    # individually framed close-up for silhouette review
                    a, b = world_bbox(obj)
                    close_path = os.path.join(renders_dir, f"{entry['id']}-closeup.png")
                    stage.frame(a, b, tile=(entry["footprint_radius"] * 1.15 + 0.15, PALETTE[biome]["ground"]))
                    stage.render(entry["id"], close_path)
                    closeup_cells.append(close_path)
                    entry["render_closeup"] = os.path.relpath(close_path, out_dir).replace(os.sep, "/")
                    obj.hide_render = True
            for obj, mats, _ in built:
                remove_asset(obj, mats)

    if not args.no_ruins:
        for biome in biomes:
            s1 = LANDMARKS[biome]["s1"]
            for kind, fn, budget, max_h in (("ruin", lambda B, b=biome, s=s1: ruin(B, b, s), BUDGET["ruin"], 1.2),
                                            ("scaffold", lambda B, b=biome, s=s1: scaffold(B, b, s), BUDGET["scaffold"], 1.3)):
                aid = f"{biome}-{kind}"
                if args.only and args.only not in aid:
                    continue
                ref = f"families[{biome}].catastrophe.ruin" if kind == "ruin" else f"families[{biome}].catastrophe.recovery"
                name = FAMILIES[biome]["catastrophe"]["ruin"]["id"] if kind == "ruin" else "scaffold"
                obj, mats, entry = record(aid, biome, kind, 2 if kind == "ruin" else None, name, fn, biome, f"{aid}.glb",
                                          budget, tags=(kind,), catalog_ref=ref, max_h=max_h)
                if stage is not None:
                    cell_path = os.path.join(renders_dir, f"{aid}.png")
                    mn, mx = world_bbox(obj)
                    stage.frame(mn, mx, tile=(entry["footprint_radius"] * 1.15 + 0.12, PALETTE[biome]["ground"]))
                    stage.render(aid, cell_path)
                    ruin_cells.append(cell_path)
                    entry["render"] = os.path.relpath(cell_path, out_dir).replace(os.sep, "/")
                remove_asset(obj, mats)

    if not args.no_heroes:
        for biome in biomes:
            if biome not in HEROES:
                continue
            for g in range(4):
                aid = f"{biome}-g{g}"
                if args.only and args.only not in aid:
                    continue
                obj, mats, entry = record(aid, biome, "hero", g, FAMILIES[biome]["growth_hero"]["id"],
                                          lambda B, b=biome, gg=g: HEROES[b](B, gg), os.path.join(biome, "hero"),
                                          f"{aid}.glb", BUDGET["hero"][g], HERO_HEIGHT[g], tags=("hero", f"g{g}"),
                                          catalog_ref=f"families[{biome}].growth_hero", max_h=6.5)
                if stage is not None:
                    cell_path = os.path.join(renders_dir, f"{aid}.png")
                    mn, mx = world_bbox(obj)
                    stage.frame(mn, mx, tile=(entry["footprint_radius"] * 1.15 + 0.15, PALETTE[biome]["ground"]))
                    stage.render(aid, cell_path)
                    hero_cells.append(cell_path)
                    entry["render"] = os.path.relpath(cell_path, out_dir).replace(os.sep, "/")
                remove_asset(obj, mats)

    if not args.no_shared and (not args.only or "shared" in args.only):
        for name, fn in SHARED.items():
            aid = name if name.startswith("shared-") else f"shared-{name}"
            ref = f"shared_props[{name}]" if name.startswith("shared-") else "docs/design/world/00-world-bible.md#marker"
            obj, mats, entry = record(aid, "shared", "shared", None, name, fn, "shared", f"{name}.glb",
                                      SHARED_BUDGET[name] + 1, tags=("shared", "decor") if name in SHARED_DECOR else ("shared",),
                                      catalog_ref=ref,
                                      max_h=SHARED_MAX_HEIGHT.get(name))
            if stage is not None:
                cell_path = os.path.join(renders_dir, f"{aid}.png")
                mn, mx = world_bbox(obj)
                stage.frame(mn, mx, tile=(entry["footprint_radius"] * 1.1 + 0.2, "#d9c3d6"))
                stage.render(aid, cell_path)
                shared_cells.append(cell_path)
                entry["render"] = os.path.relpath(cell_path, out_dir).replace(os.sep, "/")
            remove_asset(obj, mats)

    if not args.no_props:
        for biome in biomes:
            for idx, (name, fn) in enumerate(PROPS[biome]):
                aid = f"{biome}-{name}"
                if args.only and args.only not in aid:
                    continue
                cat_props = FAMILIES[biome]["props"]
                # BUDGET values are exclusive (< 300); the catalogue's tri_budget is inclusive
                cat_budget = cat_props[idx]["tri_budget"] if idx < len(cat_props) else None
                obj, mats, entry = record(aid, biome, "prop", None, name, fn, os.path.join(biome, "props"),
                                          f"{name}.glb", BUDGET["prop"], tags=("decor",) if name in DECOR else (),
                                          catalog_ref=f"families[{biome}].props[{idx}]")
                entry["catalog_tri_budget"] = cat_budget
                entry["over_catalog_budget"] = bool(cat_budget is not None and entry["triangles"] > cat_budget)
                if stage is not None:
                    cell_path = os.path.join(renders_dir, f"{aid}.png")
                    mn, mx = world_bbox(obj)
                    stage.frame(mn, mx, tile=(entry["footprint_radius"] * 1.15 + 0.12, PALETTE[biome]["ground"]))
                    stage.render(aid, cell_path)
                    prop_cells.append(cell_path)
                    entry["render"] = os.path.relpath(cell_path, out_dir).replace(os.sep, "/")
                remove_asset(obj, mats)

    if not args.no_terrain:
        for biome in biomes:
            name, fn = TERRAIN[biome]
            aid = f"{biome}-{name}"
            if args.only and args.only not in aid:
                continue
            obj, mats, entry = record(aid, biome, "terrain", None, name, fn, os.path.join(biome, "terrain"),
                                      f"{name}.glb", BUDGET["terrain"], tags=("terrain",),
                                      catalog_ref=f"families[{biome}].terrain_piece")
            if stage is not None:
                cell_path = os.path.join(renders_dir, f"{aid}.png")
                mn, mx = world_bbox(obj)
                stage.frame(mn, mx, tile=(entry["footprint_radius"] * 1.1 + 0.2, PALETTE[biome]["ground"]))
                stage.render(aid, cell_path)
                terrain_cells.append(cell_path)
                entry["render"] = os.path.relpath(cell_path, out_dir).replace(os.sep, "/")
            remove_asset(obj, mats)

    manifest = {
        "version": 4,
        "catalog": os.path.relpath(CATALOG_PATH, REPO_ROOT),
        "catalog_version": CATALOG.get("version"),
        "catalog_diffs": diffs,
        "generated_at": _dt.datetime.now().astimezone().isoformat(timespec="seconds"),
        "generator": "tools/landmark-factory/generate_landmarks.py",
        "blender": bpy.app.version_string,
        "deterministic": True,
        "conventions": {
            "up": "+Y (glTF)",
            "front": "+Z (doors / entrances)",
            "ground": "base on y=0, origin at the centre of the contact footprint",
            "units": "metres",
            "kinds": {"landmark": "3-stage concept landmark (stage 1..3)", "prop": "filler prop for terrain sub-regions",
                      "terrain": "sub-region scale terrain piece (hill, dune, sea stack...)",
                      "ruin": "comic catastrophe state on the stage-2 footprint (< 600 tris, <= 1.2 m)",
                      "scaffold": "recovery state, posts + planks around a half-rebuilt s1 motif (< 400 tris, <= 1.3 m)",
                      "hero": "growth hero stages g0..g3 (0.45/1.2/2.6/4.5 m; 300/600/1200/2500 tris) for families "
                              "not covered by assets/growth/",
                      "shared": "level-1 marker parts and shared props in assets/landmarks/shared/ (neutral cream, runtime tints)"},
            "variants": "stage 2 ships three silhouettes per biome, variant a|b|c (files -s2, -s2b, -s2c); "
                        "the runtime picks one by seed. Stages 1 and 3 have variant null",
            "target_heights_m": {"landmark_s1": [0.55, 0.62], "landmark_s2": TARGET_HEIGHT[2],
                                 "landmark_s3": TARGET_HEIGHT[3], "terrain": [TERRAIN_HEIGHT[0], 3.0]},
            "triangle_budgets": {"landmark_s1": BUDGET[1], "landmark_s2": BUDGET[2], "landmark_s3": BUDGET[3],
                                 "prop": BUDGET["prop"], "terrain": BUDGET["terrain"]},
            "tags": {"decor": "ground decor (discs, rocks): silhouette fill/distinctness check may be skipped",
                     "terrain": "kind=terrain piece"},
            "night": "assets with a 'window' material slot list it under night.window_material; switch that "
                     "material to emissive #ffe9a8 after dark (no separate night files)",
            "materials": "flat Principled BSDF colours exported as baseColorFactor, roughness 0.6, no textures, "
                         "no extensions; material names are <id>-<colour role>; role 'window' (#ffe9a8) marks "
                         "the warm facets to light at night",
        },
        "palette": PALETTE,
        "neutrals": NEUTRALS,
        "extras": EXTRAS,
        "brief": {b: {k: FAMILIES[b]["landmarks"][k]["name"] for k in ("s1", "s2a", "s2b", "s2c", "s3")} | {"terrain": TERRAIN[b][0]}
                  for b in BIOMES},
        "count": len(entries),
        "assets": entries,
    }
    if (args.only or args.biomes != ",".join(BIOMES) or args.no_props or args.no_landmarks or args.no_terrain
            or args.no_ruins or args.no_heroes or args.no_shared):
        manifest["partial"] = True  # keep a partial run from masquerading as the full roster
    manifest_path = os.path.join(out_dir, "manifest.json" if "partial" not in manifest else "manifest.partial.json")
    with open(manifest_path, "w") as fh:
        json.dump(manifest, fh, indent=2)

    if stage is not None:
        if landmark_cells:
            grid = compose_sheet(landmark_cells, os.path.join(out_dir, "contact-sheet.png"), 5, args.cell)
            print(f"[landmark-factory] landmark contact sheet {grid} -> {out_dir}/contact-sheet.png")
        if closeup_cells:
            grid = compose_sheet(closeup_cells, os.path.join(out_dir, "contact-sheet-closeup.png"), 5, args.cell)
            print(f"[landmark-factory] landmark close-up sheet {grid} -> {out_dir}/contact-sheet-closeup.png")
        if prop_cells:
            grid = compose_sheet(prop_cells, os.path.join(out_dir, "props-contact-sheet.png"), 6, args.cell)
            print(f"[landmark-factory] props contact sheet {grid} -> {out_dir}/props-contact-sheet.png")
        if terrain_cells:
            grid = compose_sheet(terrain_cells, os.path.join(out_dir, "terrain-contact-sheet.png"), 4, args.cell)
            print(f"[landmark-factory] terrain contact sheet {grid} -> {out_dir}/terrain-contact-sheet.png")
        if ruin_cells or hero_cells:
            cells = ruin_cells + hero_cells
            grid = compose_sheet(cells, os.path.join(out_dir, "ruins-and-heroes-contact-sheet.png"), 8, args.cell)
            print(f"[landmark-factory] ruins/heroes sheet {grid} -> {out_dir}/ruins-and-heroes-contact-sheet.png")
        if shared_cells:
            grid = compose_sheet(shared_cells, os.path.join(out_dir, "shared-contact-sheet.png"), 5, args.cell)
            print(f"[landmark-factory] shared sheet {grid} -> {out_dir}/shared-contact-sheet.png")

    def rng_of(kind):
        t = [e["triangles"] for e in entries if e["kind"] == kind]
        return f"{len(t)} {kind} (tris {min(t) if t else 0}..{max(t) if t else 0})"

    notes = sum(len(e["notes"]) for e in entries)
    print(f"[landmark-factory] done: {rng_of('landmark')}, {rng_of('prop')}, {rng_of('terrain')}, {rng_of('ruin')}, "
          f"{rng_of('scaffold')}, {rng_of('hero')}, {rng_of('shared')}, {issues_total} validation issue(s), "
          f"{notes} note(s), {len(diffs)} catalogue diff(s), manifest {manifest_path}, {time.time() - t0:.1f}s")


if __name__ == "__main__":
    main()
