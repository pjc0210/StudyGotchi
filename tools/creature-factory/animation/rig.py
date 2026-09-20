"""
Rig builder for the Animator: import one generated creature GLB and turn it into the node hierarchy

    Root (empty, origin, feet level)  ->  Body (mesh, origin = ground contact centre)  ->  Eyes (mesh, origin = eye centre)

No skeleton. Blender is Z-up here; the glTF exporter (+Y up) maps Blender Z -> glTF Y and Blender -Y -> glTF +Z (the face).
"""

import bmesh
import bpy
from mathutils import Matrix, Vector

EYE_MATERIALS = ("dark", "white")  # generator suffixes: dark = eyes/pupils/legs/mouth, white = eye whites


class Rig:
    def __init__(self, cid, root, body, eyes, height, size, eye_center, tris, archetype=None, eye_source="none"):
        self.cid = cid
        self.archetype = archetype or cid.split("-")[0]
        self.eye_source = eye_source  # "manifest" | "heuristic" | "none"
        self.root = root
        self.body = body
        self.eyes = eyes  # may be None when the eyes could not be isolated
        self.height = height
        self.size = size  # Blender-space bbox size (x, y, z)
        self.eye_center = eye_center
        self.tris = tris

    @property
    def objects(self):
        return [o for o in (self.root, self.body, self.eyes) if o is not None]

    @property
    def animated(self):
        return [o for o in (self.body, self.eyes) if o is not None]


def _import_single_mesh(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    new = [o for o in bpy.data.objects if o not in before]
    meshes = [o for o in new if o.type == "MESH"]
    if len(meshes) != 1:
        raise RuntimeError(f"{path}: expected exactly one mesh object, got {len(meshes)}")
    obj = meshes[0]
    for o in new:
        if o is not obj:
            bpy.data.objects.remove(o, do_unlink=True)
    obj.parent = None
    obj.matrix_world = Matrix.Identity(4)
    obj.rotation_mode = "XYZ"  # the importer leaves QUATERNION, which would silently ignore Euler keys
    return obj


def _island_stats(faces):
    pts = [v.co for f in faces for v in f.verts]
    mn = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    mx = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    centroid = sum((f.calc_center_median() for f in faces), Vector()) / len(faces)
    return centroid, mx - mn


def _eye_islands(bm, eye_mat_indices):
    """Connected components (after welding) of faces carrying an eye material."""
    seen = set()
    islands = []
    for f in bm.faces:
        if f.material_index not in eye_mat_indices or f.index in seen:
            continue
        stack, comp = [f], []
        seen.add(f.index)
        while stack:
            g = stack.pop()
            comp.append(g)
            for v in g.verts:
                for h in v.link_faces:
                    if h.material_index in eye_mat_indices and h.index not in seen:
                        seen.add(h.index)
                        stack.append(h)
        islands.append(comp)
    return islands


HINT_RADIUS = 0.07  # metres around a manifest eye position
HINT_DZ = 0.035     # pupils and sclera sit at the hint height; eyebrows (~6.5 cm above) must not blink


def _roundish(comp, width):
    c, ext = _island_stats(comp)
    size = max(ext)
    ratio = size / max(min(ext), 1e-6)
    return c, size <= 0.30 * width and ratio <= 4.0  # rejects patches, whiskers, leg cylinders, mouth lines


def _select_eyes_hinted(islands, width, hints):
    """Islands (pupils, eye whites) sitting within HINT_RADIUS of a manifest eye position (Blender space)."""
    picked = []
    for comp in islands:
        c, ok = _roundish(comp, width)
        if ok and any((c - h).length <= HINT_RADIUS and abs(c.z - h.z) <= HINT_DZ for h in hints):
            picked.append(comp)
    return picked if len(picked) >= 2 else []


def _select_eyes(islands, height, width):
    """Fallback without hints: small roundish off-centre islands on the front (-Y) upper part, in a left/right pair."""
    cands = []
    for comp in islands:
        c, ok = _roundish(comp, width)
        if not ok or c.z < 0.22 * height or c.y > -0.02 or abs(c.x) < 0.015:
            continue  # legs / feet, back-side parts, mouth line / antenna stem / tail stem
        cands.append((c, comp))
    if not cands or not any(c.x < 0 for c, _ in cands) or not any(c.x > 0 for c, _ in cands):
        return []
    zs = sorted(c.z for c, _ in cands)
    median_z = zs[len(zs) // 2]
    return [comp for c, comp in cands if abs(c.z - median_z) < 0.15 * height]


def gltf_to_blender(p):
    """glTF (x, y up, z front) -> Blender (x, -z, y)."""
    return Vector((p[0], -p[2], p[1]))


def build_rig(cid, glb_path, eye_hints=None, archetype=None):
    """`eye_hints`: optional list of glTF-space eye positions from the generator manifest (v2 `eyes` field)."""
    body = _import_single_mesh(glb_path)
    body.name = "Body"
    mesh = body.data
    mesh.name = cid

    mat_suffix = {i: (m.name.rsplit("-", 1)[-1] if m else "") for i, m in enumerate(mesh.materials)}
    eye_mats = {i for i, s in mat_suffix.items() if s in EYE_MATERIALS}

    bm = bmesh.new()
    bm.from_mesh(mesh)
    # the importer splits vertices per flat face; weld by position so primitives become connected islands again
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    for f in bm.faces:
        f.smooth = False
    bm.faces.ensure_lookup_table()
    bm.faces.index_update()

    xs = [v.co.x for v in bm.verts]
    ys = [v.co.y for v in bm.verts]
    zs = [v.co.z for v in bm.verts]
    size = Vector((max(xs) - min(xs), max(ys) - min(ys), max(zs) - min(zs)))
    height = max(zs)
    if min(zs) > 1e-4 or min(zs) < -1e-4:
        for v in bm.verts:  # defensive: the generator already grounds the feet
            v.co.z -= min(zs)

    islands = _eye_islands(bm, eye_mats)
    picked = []
    eye_source = "none"
    if eye_hints:
        picked = _select_eyes_hinted(islands, size.x, [gltf_to_blender(h) for h in eye_hints])
        eye_source = "manifest" if picked else "none"
    if not picked:
        picked = _select_eyes(islands, height, size.x)
        eye_source = "heuristic" if picked else "none"
    eye_faces = [f for comp in picked for f in comp]
    eyes = None
    eye_center = None
    if eye_faces:
        eye_center, _ = _island_stats(eye_faces)
        ebm = bmesh.new()
        vmap = {}
        for f in eye_faces:
            vs = []
            for v in f.verts:
                if v not in vmap:
                    vmap[v] = ebm.verts.new(v.co - eye_center)
                vs.append(vmap[v])
            nf = ebm.faces.new(vs)
            nf.material_index = f.material_index
            nf.smooth = False
        emesh = bpy.data.meshes.new(f"{cid}-eyes")
        ebm.to_mesh(emesh)
        ebm.free()
        for m in mesh.materials:
            emesh.materials.append(m)
        bmesh.ops.delete(bm, geom=eye_faces, context="FACES")
        eyes = bpy.data.objects.new("Eyes", emesh)
        bpy.context.scene.collection.objects.link(eyes)
        _flat(emesh)

    bm.to_mesh(mesh)
    bm.free()
    _flat(mesh)

    root = bpy.data.objects.new("Root", None)
    root.empty_display_size = 0.1
    bpy.context.scene.collection.objects.link(root)
    body.parent = root
    body.matrix_parent_inverse = Matrix.Identity(4)
    if eyes is not None:
        eyes.parent = body
        eyes.matrix_parent_inverse = Matrix.Identity(4)
        eyes.location = eye_center

    tris = sum(len(p.vertices) - 2 for o in (body, eyes) if o is not None for p in o.data.polygons)
    return Rig(cid, root, body, eyes, height, size, eye_center, tris, archetype=archetype, eye_source=eye_source)


def _flat(mesh):
    """Flat shading, no custom split normals: identical look to the generator output, exporter re-splits per face."""
    attr = mesh.attributes.get("custom_normal")
    if attr is not None:
        mesh.attributes.remove(attr)
    if hasattr(mesh, "shade_flat"):
        mesh.shade_flat()
    else:
        for p in mesh.polygons:
            p.use_smooth = False


def rest_pose(rig):
    rig.body.location = (0.0, 0.0, 0.0)
    rig.body.rotation_euler = (0.0, 0.0, 0.0)
    rig.body.scale = (1.0, 1.0, 1.0)
    if rig.eyes is not None:
        rig.eyes.location = rig.eye_center
        rig.eyes.rotation_euler = (0.0, 0.0, 0.0)
        rig.eyes.scale = (1.0, 1.0, 1.0)


def remove_rig(rig):
    for o in rig.objects:
        data = o.data
        bpy.data.objects.remove(o, do_unlink=True)
        if data is not None and data.users == 0:
            bpy.data.meshes.remove(data)
    for m in [m for m in bpy.data.materials if m.name.startswith(rig.cid)]:
        if m.users == 0:
            bpy.data.materials.remove(m)
    for a in [a for a in bpy.data.actions if a.users == 0]:
        bpy.data.actions.remove(a)
