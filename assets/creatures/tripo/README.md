# Tripo intake: `pokemon-like 3d model.glb`

Intake worker, 2026-09-19. Provenance: `LEDGER.md` (Tripo ToS §5.2.2 paid-user output).
Regenerate everything with `tripo_intake.py` (commands in its docstring; Blender 5.2 headless).

## What the model actually is

Not one creature. Tripo was fed an image of a sprite/figure grid and returned a **flat panel of
48 tiny figures (6 columns x 8 rows) fused into one mesh** of 1.9 M triangles, 0.71 m wide,
0.98 m tall and only 0.27 m deep. The figures are recognisable existing Pokémon (Bulbasaur,
Pikachu, Raichu, Eevee/Jolteon/Flareon/Espeon/Umbreon/Sylveon, Gengar, Snorlax, Magikarp,
Poliwag, Wailmer, Chansey, Celebi, Cubone, Mr. Mime, Psyduck, Slowpoke, Ditto, ...).

**Do not ship any of this.** Tripo's licence covers the generated output, not Nintendo /
Creatures / GAME FREAK's character designs, so every file in this folder is a reference and
pipeline test only. Nothing here goes into the roster, the prototype, or `frontend/`.

## Inspection (gltf-transform, full output in `inspect-original.txt`)

| Fact | Value |
|---|---|
| Generator / version | Tripo, glTF 2.0 binary, 63,287,940 bytes, sha256 `2cdd698a…d1e6bb` |
| Geometry | 1 mesh, 1 primitive, TRIANGLES, **1,906,760 triangles**, 1,013,158 vertices, u32 indices, 55.3 MB GPU |
| Attributes | POSITION, NORMAL, TEXCOORD_0 (no COLOR_0, no JOINTS/WEIGHTS) |
| Materials | 1 (`tripo_material_…`), OPAQUE, baseColor + normal + metallicRoughness textures |
| Textures | 3 x 4096², baseColor JPEG 3.37 MB, metallicRoughness JPEG 1.29 MB, normal PNG 3.32 MB (89 MB VRAM each uncompressed) |
| Skins (rigged?) | **No** |
| Animations | **None** (so no motion strip was rendered) |
| Extensions | `KHR_materials_volume`, `FB_ngon_encoding` (both optional, none required) |
| Bounding box | min (-0.357, 0, -0.133) max (0.357, 0.980, 0.133) m: +Y up, base already at y = 0, centred in X/Z |
| Front | glTF **+Z** (probe renders: faces visible from +Z, backs from -Z), so no rotation was needed |
| Topology | 974 loose shells; figures are not watertight (eyes, ears, limbs are separate shells) |

## Pipeline (`tripo_intake.py`)

1. `--stage probe`: import, render the panel from glTF +Z/-Z/+X/-X to find the face side.
2. `--stage build`: import (6 s), frame (front to +Z, height 0.8 m, feet at y = 0, origin at feet
   centre), Decimate/Collapse with triangulation, ratio = 2900 / 1,906,760 (34 s), custom normals
   cleared, then:
   - (a) `-lowpoly-textured.glb`: baseColor only, `image.scale(1024, 1024)`, JPEG; metal/rough/normal dropped; roughness 0.6, metallic 0; smooth shading.
   - (b) `-toybox.glb`: baseColor sampled with numpy at every corner UV, averaged per face in linear RGB, k-means (k = 5, k-means++, unweighted) in sRGB, one flat `baseColorFactor` material per palette entry assigned per face, flat shading, UVs removed. Flat materials rather than COLOR_0 so the file matches the generated creatures and the toon shader keys off `baseColorFactor` exactly as for them.
   - Both exported with `export_yup`, no Draco, no extensions, previews via the same `gc.Stage` EEVEE stage as `tools/creature-factory` (cream cyclorama, 50 mm, 34° / 22° three-quarter view).
3. `--stage split`: separate loose parts, cluster shells whose bboxes touch (4 mm padding), join
   each cluster: 28 clusters (about 20 are single figures, the rest are 2-14 neighbours whose
   bboxes overlap; c18 is a stray 8k-tri sliver). `components-sheet.png`, `components.json`.
4. `--stage exemplar N`: one clustered figure through the same pipeline at the charter's creature
   budget (1,400 tris) to see what a single Tripo creature becomes. Ran c10 (blue blob, 5 shells)
   and c03 (brown quadruped, 16 shells).

### Results

| File | Tris | Verts | Size | Textures | Extensions |
|---|---|---|---|---|---|
| `pokemon-like-3d-model.glb` (original) | 1,906,760 | 1,013,158 | 63.3 MB | 3 x 4096² | 2 optional |
| `pokemon-like-3d-model-lowpoly-textured.glb` | 2,900 | 4,025 | 340 KB | 1 x 1024² JPEG (193 KB) | none |
| `pokemon-like-3d-model-toybox.glb` | 2,900 | 8,700 (flat) | 231 KB | none, 5 flat materials | none |
| `exemplar-c10-lowpoly-textured.glb` | 1,400 | 981 | 234 KB | 1 x 1024² JPEG | none |
| `exemplar-c10-toybox.glb` | 1,400 | 4,190 (flat) | 113 KB | none, 5 flat materials | none |
| `exemplar-c03-lowpoly-textured.glb` | 1,399 | 1,110 | 238 KB | 1 x 1024² JPEG | none |
| `exemplar-c03-toybox.glb` | 1,399 | 4,195 (flat) | 113 KB | none, 5 flat materials | none |

Toybox palettes (k-means, sRGB): whole panel `#717892 #bfb2b5 #83603d #363c56 #b7a155`;
c10 `#7983a2 #596174 #3e415c #a8b3c1 #c05979`; c03 `#925725 #522e12 #6f411b #b68a47 #d1c597`.
The exemplar textures are the whole 4K atlas shrunk to 1024, so most of each 193 KB image is
unused; cropping to the figure's UV island would cut it to ~20 KB.

Previews: `preview-original.png`, `preview-lowpoly.png`, `preview-toybox.png`, `comparison.png`
(row 1 the three above, row 2 `blob-ice-1`, `bird-ice-1`, `biped-ice-2` from
`assets/creatures/generated/renders/`), `preview-exemplar-c10-*.png`, `preview-exemplar-c03-*.png`,
`comparison-exemplar-c10.png`, `comparison-exemplar-c03.png`, `components-sheet.png`.
Reports: `pipeline-report.json`, `pipeline-report-exemplar-c*.json`, `components.json`.

## Fit assessment against the generated contact sheet

- **Proportions.** The Tripo figures are faithful to the source designs, so they are 1:1 to
  1.5:1 head:body with real limbs and tails; ours are 1.5:1 to 2:1 blobs with stubby nubs.
  c10 (a round blob with a face) sits closest to our blob archetype; most others are more
  "figurine" than "toy".
- **Palette.** Tripo's baseColor bakes shading and ambient occlusion into the texture, so the
  sampled colours land 10-20 L below our flat pastels (c10 body `#7983a2` vs our ice accent
  `#a9cfe8`; whole-panel mean is a muddy `#717892`). Saturated reds/oranges (c03, c09, c17) are
  outside the charter palette entirely. A toybox conversion would need a +12-15 L lift and a
  snap to the nearest charter colour, not the raw k-means centres.
- **Facet look.** After decimation the silhouettes are genuinely chunky and faceted and read
  well at 256 px, so the *shape* pipeline works: 1,400 tris keeps ears, tails, crests. But the
  eyes, mouths and markings live only in the texture; flat-colour conversion loses them
  (compare the c10 lowpoly-textured vs toybox cells). Our generated creatures carry eyes as
  geometry. Any Tripo creature would need dot eyes and one accent feature re-added as meshes.
- **Verdict.** Tripo output is a usable *silhouette and proportion source* for the artisan, but
  as delivered it is neither on-palette nor toybox-shaded, and this specific file is IP-blocked.
  Untextured flat-material creatures from our own generator remain closer to the contract than
  a decimated Tripo mesh.

## If we used Tripo for more creatures (cost/time per creature)

- Tripo side: one image- or text-to-3D generation per creature, several minutes of queue plus
  credits per model on a paid plan (credit price not verified this session; check
  https://www.tripo3d.ai/pricing). Prompt must describe an *original* design; never a named IP.
- Our side, measured: import 6 s, decimate and both exports under 2 s per figure, previews 3 s;
  the whole `exemplar` stage is about 12 s per creature. Cluster/split is only needed because
  this file was a grid; a single-creature generation skips it.
- Manual side, estimated: 10-20 min per creature in Blender to add geometry eyes/accent, snap the
  palette to charter colours, and check the 48 px read, plus the QA pass. That is comparable to
  tuning a seed family in `generate_creatures.py`, which already ships on-palette with eyes.
- Recommendation: use Tripo (with original prompts) only when an archetype needs a silhouette
  the generator cannot make; otherwise it does not save time.
