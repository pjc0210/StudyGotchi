# Frontier Town: step 3 art directions

Status: draft for Philote, 2026-09-20. Roster id: `wildwest`. All three directions use the same plan-v4 footprint, which preserves the approved districts, spacing, progression counts, Ochre Railhead baseline and landmark stages. The choice below is art direction only; it does not reopen district locations.

Plan: `../maps/frontier-town-plan-v4.svg` (render: `frontier-town-plan-v4.png`). Reference ledger: `../refs/frontier-town/LEDGER.md`.

## Hard visual and art-direction audit

### Reference-by-reference findings

| frontier reference | visual read | plan-v3 source match | hard audit result |
|---|---|---|---|
| `lowpoly-plank-stable-porch-saddles.jpg` | One broad porch volume, six square posts, knee braces, sun-fan gable, saddles, deep plank deck; strong single-building silhouette | Station and ranch footprints both have enough depth for covered porches without shrinking animal or rail clearances | Pass spatially. Reserve this porch grammar for the depot and ranch house; do not repeat it down Main Street. |
| `iso-saloon-sheriff-telegraph-saguaro.png` | Tall two-storey saloon, small sheriff annex, telegraph diagonal, one branching saguaro, trough and hitch rail; compact vertical hierarchy | Main town has a long civic/commercial spine and the reserve has a basin-crossing telegraph line | Pass spatially. The plan must keep one saloon vertical and one sheriff badge accent rather than reproducing the square diorama or its lettering. |
| `lowpoly-false-front-town-water-towers.jpg` | Dense false-front street with mixed teal, sage, brown and oxblood roofs; one water tower reads above the roof field | The 113 x 72 m town envelope can hold the requested large town while leaving a 26-40 m gap to neighbours | Pass capacity. Population must grow inward along the boardwalk rather than filling every metre at 0 percent. Exactly one town water tower. |
| `toy-saloon-cream-sand-crates.jpg` | Minimal toy saloon on broad cream negative space; external stair, balcony, crates, barrels, fences and faceted rocks | V3 preserves broad gaps and local roads; no ring road or circular kit pad | Pass composition. Use the soft four-colour object treatment, not the near-white biome ground or isolated single-building layout. |
| `iso-mesa-settlement-windmill-cornfield.jpg` | Settlement backed by red-rock walls, hard shadows, wind pump and tanks; geology dominates the rear horizon | V3 made geology too omnidirectional for Philote's fixed south camera | V4 keeps the reference's strong rear wall but removes all south/front canyon and tapers the east/west wings into fog. |

### Latest-requirement audit

| requirement | verdict before v4 | evidence | v4 action |
|---|---|---|---|
| North/back canyon skyline only | Fail | V3 wrapped mesa geometry behind the south/front camera and implied rearward views Philote does not allow | Delete the ring. Central mesa rows occupy north only; east/west wings taper into fog and stop before the foreground. |
| Fixed south camera | Fail | V3 used a moving camera/target model | Fix default `C = [0,135]`, max dolly `C = [0,155]`, pitch 34-40 deg and yaw clamp -35...+35 deg. |
| Foreground never exposes an edge | Fail | A ring solved the wrong problem by adding front geology | Extend sand and railway south beneath both camera stations; hide the map crop with foreground fog, with no cliff, canyon or coastline. |
| Camera acceptance | Replace | Previous multi-direction checks do not apply to the fixed camera | Test yaw -35/0/+35 at default and max dolly, each at pitch 34/40. Central rays cross y 47-56 m; wing rays y 20-29 m. |
| Large separated non-circular districts | Pass | Main town 113 x 72 m; reserve 88 x 253 m; ranch 87 x 69 m; mine 86 x 67 m; measured gaps 26-40 m | Preserved exactly. |
| Grand railway and hard boundary | Pass | Fixed x = 52...66 m main line, west-side depot/platform/freight district, reserve east of tracks | Preserved exactly; 24 x 22 m operations pad remains clear and no roundhouse is forced. |
| Broad ranch animal space | Pass | Two protected animal runs are each at least 24 x 18 m plus pasture, three corrals and waterhole | Preserved exactly. |
| Separate frontier archaeology | Pass | Dedicated 72 x 58 m polygon with foundations, trenches, scaffold and tent pads, 35-40 m from ranch/town | Preserved exactly; Egyptian forms remain prohibited. |
| Two blank future areas | Pass | Future A 58 x 41 m and Future B 44 x 70 m have no topic or prop assignment | Preserved exactly. |
| Course landmark progression | Fail by omission | V2 had no mapped fixed footprint for the required s1/s2/s3 landmark | V4 preserves the 20 x 16 m lookout rise added at [118,65], without creating a seventh district. |
| Legibility at 1850 px | Pass after cleanup | District titles, measured gaps, fixed/seed legend and scale bar remain readable | V4 keeps the clean map field and moves fixed-camera proof into the specification panel. |

### Audit decision

Plan v4 replaces only the discarded horizon/camera model. It does not move or resize the approved town, station, reserve, ranch, mine, archaeology district, rail corridor, arroyo, waterhole, lookout rise, broad gaps, or future envelopes.

## Locked footprint shared by all directions

| area | nominal center [x,z] m | envelope m | center jitter [x,z] m | yaw |
|---|---:|---:|---:|---:|
| Main town | [-40,4] | 113 x 72 | +/-8, +/-6 | +/-12 deg |
| Grand railway station | [18,-65] | 66 x 66 | +/-4, +/-5 | +/-5 deg |
| Outskirts / desert-nature reserve | [114,1] | 88 x 253 | +/-7, +/-10 | +/-18 deg |
| Broad ranch | [-108,94] | 87 x 69 | +/-8, +/-6 | +/-15 deg |
| Mine works | [-109,-91] | 86 x 67 | +/-6, +/-5 | +/-12 deg |
| Frontier archaeology dig | [0,98] | 72 x 58 | +/-6, +/-5 | +/-14 deg |
| Landmark lookout rise | [118,65] | 20 x 16 | fixed | 0 |
| Future A | [-27,-108] | 58 x 41 | fixed blank | 0 |
| Future B | [-131,-10] | 44 x 70 | fixed blank | 0 |

Fixed across all directions: visible map crop 400 x 320 m; playable basin 320 x 260 m; continuous foreground beyond the south crop; rail corridor x = 52...66 m; 9 m arroyo; 22 x 16 m waterhole; north/back mesa rows and fog wings; default/max camera stations; landmark rise; both future envelopes. Local roads stop at districts.

Camera acceptance shared by A, B and C: default `C = [0,135]`, look span 220 m; max dolly `C = [0,155]`, look span 240 m; yaw 0 target `[0,-85]`; pitch 34-40 deg; yaw -35...+35 deg. Test yaw -35, 0 and +35 at both stations and both pitch limits.

## Locked population and skyline progression

These counts and stage meanings are identical in A, B and C. Topics map several-to-one into districts; a district slider drives all of its subareas together.

| district | 0 percent | 25 percent | 50 percent | 75 percent | 100 percent |
|---|---|---|---|---|---|
| Main town | 12 m water tower, 36 m road/boardwalk spine, sheriff shell | saloon + 2 storefronts, first accent roof | hotel + 3 more storefronts, alleys and 2 wagons | 10 total street buildings, troughs, hitch rails, barrels, lamps | 12 total buildings, second saloon storey, stagecoach, tumbleweeds and bunting |
| Railway station | fixed double track, 38 x 7 m platform, water crane | 20 x 12 m depot + canopy and first signal lamp | 16 x 10 m freight shed, handcart, 8 crate groups | signal tower, 2 freight wagons, full platform clutter | caboose, maintenance shed and populated 24 x 22 m operations pad; no roundhouse |
| Outskirts reserve | telegraph line, abandoned water tank, 4 saguaros, 2 burrow buffers | 4 prickly-pear groups, 8 scrub groups, first accent bloom | 8 saguaros, 14 scrub groups, 6 rock groups | 3 habitat cells, 4 burrow buffers, cattle skull and dry wash props | 12 saguaros, 24 scrub groups, 10 rock groups and one rare animal event; density remains sparse |
| Broad ranch | waterhole, 9 m wind pump, one 24 x 18 m animal run | ranch house + first corral and hay accent | barn, second corral, troughs and 4 fence runs | third corral, full pasture fencing, 2 animal groups and hay stacks | both protected animal runs active, 3 animal groups, chuck wagon and tack clutter |
| Mine works | adit, 10 m headframe, 22 m ore spur | boiler + first shed and copper ore cart | second shed, 3 ore carts, tailings field and lanterns | worker camp with 4 tents/shacks, crates and full spur clutter | assay shack, hoist detail, expanded tailings and one controlled steam event |
| Archaeology dig | one exposed foundation, one trench, survey stakes | 2 canvas tents and first cream canvas accent | second foundation field, 3 trenches, tables and crates | scaffold, full camp of 4 tents, brushes, screens and tagged spoil piles | half-buried structure reveal, extended scaffold and staffed interpretation table; no text signs |

Skyline growth preserves north/back coverage while keeping the foreground open:

| course fraction | central near row | central far row | wing near/far minimum | additions |
|---|---:|---:|---:|---|
| 0 percent | 60 m | 80 m | 30 / 42 m | low flat caps; open foreground |
| 25 percent | 63 m | 85 m | 32 / 44 m | 3 broader buttes |
| 50 percent | 66 m | 90 m | 34 / 47 m | joined cap rhythm and stronger strata |
| 75 percent | 70 m | 95 m | 36 / 49 m | 5 high buttes and deeper notches |
| 100 percent | 74 m | 100 m | 38 / 52 m | one 118 m back spire; wings still end in fog |

## Shared landmark geometry

The fixed 20 x 16 m rise at [118,65] carries one course landmark. Palette and trim vary by direction, but geometry and growth do not.

| stage | persists | grows | lights |
|---|---|---|---|
| s1 Survey cairn | 3 m red-rock rise; stone cairn; survey stake and tripod | none beyond a 3.5 m timber signal frame | one hooded lantern at the tripod, only when the first topic is demonstrated |
| s2 Lookout tower | rise, cairn and tripod remain visible at the base | 9 m four-leg timber lookout, ladder, shade roof, field glass rail | one enclosed amber lamp at the platform and one stair lamp |
| s3 Frontier watch fort | rise, cairn and full s2 tower persist | tower reaches 14 m; 12 m crescent stockade, telegraph mast and small supply lean-to | tower lamp, mast lamp and 4 stockade lanterns; no searchlight |

## Direction A: Ochre Railhead

**Mood.** A welcoming working rail town at late-afternoon high sun: ochre flats, red-rock canyon layers, cool teal and sage storefronts, one oxblood saloon roof, and long readable shadows. This is the designer's pick because it combines all five references without copying any one image and keeps the railway, town and wilderness equally legible.

### Exact palette roles

| role | hex | use |
|---|---|---|
| ground | `#d9b07a` | basin flats and district ground |
| ground shadow / alternate | `#c2925a` | hard-shadow tint, canyon strata and compacted yard variation |
| side / near cliff | `#a0522d` | continuous near canyon face and lookout rise |
| far canyon | `#6f3d2d` | second silhouette row |
| canyon cap | `#d9b07a` | flat mesa caps |
| road core | `#cfae78` | wagon-rut centre |
| road edge | `#b58f5a` | compacted rut edge |
| wet | `#8e765a` | damp waterhole rim only |
| water | `#76abc2` | ranch waterhole |
| timber dark | `#4a3c36` | posts, rail ties, headframe and porch structure |
| timber mid | `#8b6a4a` | decks, fences and crates |
| siding teal / sage / brown | `#5f8f8a` / `#8fa07a` / `#6b4a3a` | town, depot and ranch building families |
| family accent | `#7a3a30` | saloon roof and no other large surface |
| rail accent | `#d9a441` | signal lamp and caboose trim |
| reserve green | `#4f8a4a` | saguaros and marker accent |
| night window | `#ffe9a8` | all demonstrated windows and lamps |

### Landmass and north/back canyon skyline

The fixed sand basin remains broad and nearly level, with the pale arroyo and one blue waterhole interrupting it. Ground continues south beneath the camera and disappears into foreground fog rather than a cliff. Red-rock mesas with ochre caps occupy the north/back only; darker far silhouettes sit behind them, while east/west wings taper into `#f3e4ee` day fog before reaching the foreground. Progress changes height and cap rhythm only according to the locked skyline table. Rail alignment, north skyline, fog fields and camera stations never vary by seed.

### District anchors and population

| district | where | anchor readable at 48 px with buildings hidden | population axis | accent |
|---|---|---|---|---|
| Main town | west of rail, centre-left | 12 m four-stilt water tower plus 36 m boardwalk line | locked 0-100 town row: 0 anchor -> 12 buildings and street clutter | saloon roof `#7a3a30` |
| Railway station | north-centre, west face of fixed rail | double track, 38 m platform and hooked water crane | platform -> depot/freight -> signal/caboose/operations pad | signal/caboose `#d9a441` |
| Outskirts reserve | entire east side beyond rail | telegraph diagonal, abandoned tank and four tall saguaros | sparse habitat cells; never becomes a settlement | one cactus bloom `#d9765c`; cactus green `#4f8a4a` stays a base colour |
| Broad ranch | southwest at the waterhole | 9 m wind pump, waterhole and first corral | house/barn -> three corrals -> active animal runs | hay `#e8c96a` |
| Mine works | northwest at canyon foot | adit, 10 m timber headframe and ore spur | boiler/sheds -> carts/tailings -> worker camp/assay shack | ore cart copper `#b8703f` |
| Archaeology dig | south-centre, separate from ranch and town | pale foundation rectangle, trench cut and survey tripod | foundations/trenches -> tents/scaffold -> half-buried reveal | canvas `#efe0bd` |

### Landmark treatment

| stage | persists | grows | lights |
|---|---|---|---|
| s1 | red-rock rise `#a0522d`, cairn and timber tripod `#8b6a4a` | 3.5 m signal frame with oxblood pennant `#7a3a30` | one `#ffe9a8` hooded lantern |
| s2 | all s1 geometry at base | 9 m dark-timber lookout with sage shade roof `#8fa07a` | platform and stair lamps `#ffe9a8` |
| s3 | s2 tower and survey base | 14 m tower, brown stockade, telegraph mast, teal lean-to | 6 warm lamps total; no beam or blinking light |

### Globe marker row

| working id | pedestal side / top / lip | rim treatment | P1 8 m | P2 6 m | P3 4.8 m | P4 4 m | accent object | 48 px silhouette |
|---|---|---|---|---|---|---|---|---|
| `wildwest-a` | red rock `#a0522d` / flats `#d9b07a` / strata `#c2925a` | 3 sandstone strata bands, undercut 0.3 m | flat-top mesa butte, face `#a0522d`, cap `#d9b07a` | wind pump, timber `#8b6a4a`, 8-blade vane | blank-band false-front saloon, sage `#8fa07a`, roof `#7a3a30` | two-arm saguaro pair `#4f8a4a` | saguaro `#4f8a4a` | flat horizontal mesa over ochre strata, one spoked vertical and one green fork |

### Night deviations

- Sky and fog remain bible night `#2b2640`; the far canyon shifts to `#3a2f45`, near canyon to `#6f3f38`, and caps to `#8f684e`.
- Demonstrated windows and lamps use `#ffe9a8` at bible intensity. The water-tower tank, canyon, cactus and archaeology canvas do not emit.
- Telegraph insulators catch a non-emissive `#8fa3d8` rim; mine steam is moonlit but never glows.

### Seed-randomization constraints

- Use the locked centres, envelopes, gap rejection and yaw ranges; building yaw is district yaw +/-6 deg and scale is 0.82-1.18.
- Keep town colours art-directed: one oxblood roof, 2-3 teal buildings, 2-3 sage buildings and the remainder brown; never form a colour checkerboard.
- The water tower, platform, headframe, wind pump, dig foundation and telegraph diagonal are stable anchors. Props may move; anchors may not swap subareas.
- At least 55 percent of the reserve envelope remains prop-free in every seed. Both future envelopes stay completely empty.

### 48 px tests

- **Props hidden:** ochre top plus red-rock side and three strata bands reads as a dry layered basin, not pale Egyptian sand or dark basalt.
- **P1 only:** the wide flat-top mesa is horizontal and capped; it does not read as a pyramid or crater cone.
- **Props shown:** flat mesa + spoked wind pump + false-front block + green fork remains separable at 48 px; the saguaro is the only saturated marker accent.
- **Overview:** with buildings hidden, water tower, rail/platform, wind pump, headframe, dig rectangle and telegraph/saguaros identify all six districts.

### Nearest-biome distinctness

- Against `egyptian-desert`: darker red-rock side `#a0522d` instead of sand strata `#d2a95e`, ochre top instead of pale `#efd9a2`, flat mesa instead of stepped pyramid, and mechanical wind pump instead of obelisk.
- Against `volcanic`: ochre top and horizontal mesa replace dark basalt and crater cone; green saguaro and teal town replace ember orange; no lava, crater glow or emissive ground.

### Protected-silhouette note

The closest protected reference is the warm-rock volcano silhouette in the Kirby pedestal sheet. This marker uses a broad flat cap with visible horizontal strata, no crater, no lava, and a wind pump plus saguaro. No Nintendo, Pokemon, Tamagotchi or Sanrio character silhouette is used.

### Risks (exactly three)

1. The town can drift toward the dense reference and erase negative space; enforce the 12-building ceiling and measured gaps.
2. Teal, sage and brown can become a random patchwork; enforce the one-roof accent and ordered colour counts.
3. The large reserve may look unfinished at 0 percent; keep the telegraph diagonal, tank and four saguaros visible from the initial band.

## Direction B: Bleached Toy Frontier

**Mood.** A quieter high-noon toy set with pale sand, weathered cream timber, oxidized teal metal and rust-red accents. The stable and single-saloon references lead the material treatment, while the expansive map prevents the world from becoming a display plinth.

### Exact palette roles

| role | hex | use |
|---|---|---|
| ground | `#d7b98a` | sun-bleached basin |
| ground shadow / alternate | `#bfa075` | hard shadows and yards |
| side / near cliff | `#8f5b42` | muted red-brown canyon |
| far canyon | `#694638` | distant row |
| canyon cap | `#e4c99b` | pale caps |
| strata | `#c78b62` | three rim bands |
| road core | `#d9c39a` | pale wagon ruts |
| road edge | `#9b795e` | compacted rut edge |
| wet | `#8b765e` | waterhole mud |
| water | `#6f9fa8` | desaturated blue water |
| timber dark / mid | `#59483b` / `#8a7058` | frames, porches and fences |
| siding cream / teal | `#c9b28c` / `#6f8f86` | town and rail buildings |
| family accent | `#a94f3d` | rust-red roof and marker saloon |
| rail accent | `#c9943e` | signal lamp and caboose trim |
| reserve green | `#697d4a` | cactus and scrub |
| night window | `#ffe9a8` | demonstrated windows and lamps |

### Landmass and north/back canyon skyline

The same basin, rail, arroyo, waterhole and north/back mesa rows use lower saturation and brighter caps. Three strata bands remain strong enough to identify the family at 48 px. Warm cream fog `#ead9c1` reaches full opacity behind the far row, through both side wings and over the south map crop. There is no front canyon. Skyline heights, fixed-camera tests and all district geometry are unchanged.

### District anchors and population

| district | where | anchor readable at 48 px with buildings hidden | population axis | accent |
|---|---|---|---|---|
| Main town | centre-left | pale four-stilt water tower and dark boardwalk | locked town counts, but broad porch/deck silhouettes dominate | rust roof `#a94f3d` |
| Railway station | north-centre at rail | platform, cream depot canopy and water crane | platform -> freight group -> signal/caboose | signal mustard `#c9943e`; oxidized teal stays a base colour |
| Outskirts reserve | east beyond rail | telegraph diagonal, tank and olive saguaros | sparse scrub/rock habitat cells only | one cactus bloom `#d9765c`; olive stays a base colour |
| Broad ranch | southwest | wind pump, blue-grey waterhole and corral | ranch house/barn -> full corrals and animals | straw `#d7b85c` |
| Mine works | northwest | dark headframe and adit against pale cap | sheds/carts -> tailings/camp -> assay shack | iron red `#8a4a3f` |
| Archaeology dig | south-centre | pale canvas triangle and dark trench grid | foundations -> tents/scaffold -> buried reveal | canvas `#f0d6a4` |

### Landmark treatment

| stage | persists | grows | lights |
|---|---|---|---|
| s1 | muted rise `#8f5b42`, pale cairn and dark tripod | 3.5 m frame with rust pennant `#a94f3d` | one warm lantern |
| s2 | survey base remains | 9 m weathered lookout with cream shade roof | two warm lamps, no coloured emission |
| s3 | full s2 tower persists | 14 m lookout, pale timber stockade and oxidized-teal lean-to | 6 warm lamps with restrained bloom |

### Globe marker row

| working id | pedestal side / top / lip | rim treatment | P1 8 m | P2 6 m | P3 4.8 m | P4 4 m | accent object | 48 px silhouette |
|---|---|---|---|---|---|---|---|---|
| `wildwest-b` | canyon `#8f5b42` / sand `#d7b98a` / strata `#c78b62` | 3 pale strata bands with chipped 12-facet corners | broad flat-top butte `#8f5b42`, cap `#e4c99b` | weathered wind pump `#59483b` | cream false-front saloon `#c9b28c`, roof `#a94f3d` | olive saguaro pair `#697d4a` | saloon roof `#a94f3d` | pale flat cap, dark spoked tower and one small rust rectangle |

### Night deviations

- Bible night sky/fog remains `#2b2640`; canyon faces cool to `#51434a` and caps to `#756a66`, preserving a pale silhouette without turning blue.
- Only `#ffe9a8` windows and lamps emit. Rust roofs, canvas, water and cactus stay matte.
- A faint non-emissive cool edge `#8fa3d8` separates cream porches from the night ground.

### Seed-randomization constraints

- Use the same envelopes, gap checks, yaws and 0.82-1.18 scale band as Direction A.
- At least 40 percent of each town block facade stays cream; rust appears on exactly one town roof and no more than two small props per district.
- Porch posts remain six on the depot and ranch house. Main-town buildings use shallow awnings instead, preventing porch-kit repetition.
- Reserve emptiness, future blanks, camera stations, north skyline, fog fields, rail and landmark are fixed exactly as in plan v4.

### 48 px tests

- **Props hidden:** muted red-brown side plus three orange strata bands prevents the pale top from merging with `egyptian-desert`.
- **P1 only:** the cap is one broad slab with an undercut, never stepped and never pointed.
- **Props shown:** dark wind-pump spokes and the rust saloon rectangle remain distinct against the pale pedestal; cactus stays secondary.
- **Overview:** anchors remain darker than the ground, so every district reads despite the bleached palette.

### Nearest-biome distinctness

- Against `egyptian-desert`: the top values are closer than Direction A, so the darker `#8f5b42` side, chipped strata lip, flat butte and wind pump are mandatory; no pyramid, obelisk, pylon or palm.
- Against `volcanic`: this direction is pale and matte rather than dark and emissive; the P1 slab has no crater and the accent is rust, not lava orange.

### Protected-silhouette note

The closest protected silhouette remains the warm-rock volcano pedestal. The chipped flat slab, spoked wind pump and rectangular saloon create a horizontal-mechanical read with no crater, lava seam or character likeness.

### Risks (exactly three)

1. Pale ground can collide with `egyptian-desert`; the darker side, three strata bands and wind-pump P2 are non-optional.
2. Cream timber may lose depth at high noon; dark posts and hard shadow tint must remain at least one toon step apart.
3. The toy treatment can make districts feel like separate display models; roads, telegraph and shared ground must visually cross district envelopes.

## Direction C: Copper Canyon Nightline

**Mood.** A more dramatic frontier shaped by copper rock, dark timber and a strong rail line, designed to remain handsome in dark mode without becoming a volcanic biome. Day stays dusty and readable; at night, amber rail lamps and cool teal metal lead the eye across the basin.

### Exact palette roles

| role | hex | use |
|---|---|---|
| ground | `#c2925a` | deeper copper-ochre flats |
| ground shadow / alternate | `#9e724b` | long hard shadows |
| side / near cliff | `#7c3f2a` | copper canyon face |
| far canyon | `#3f3340` | distant dusk-purple geology |
| canyon cap | `#d0a06c` | warm cap plane |
| strata | `#b8703f` | copper strata band |
| road core | `#b89463` | wagon ruts |
| road edge | `#6b5140` | dark compacted edge |
| wet | `#705c4f` | waterhole rim |
| water | `#5f8fa8` | steel-blue water |
| timber dark / mid | `#4a3c36` / `#6b5140` | rail, mine, porches and fences |
| siding teal / clay | `#4f7074` / `#8a4a3f` | town and depot |
| secondary metal | `#48a9a6` | restrained turquoise awnings and oxidized metal |
| family / rail accent | `#e8a13a` | signals, marker hub and night focal points |
| town accent | `#a94f3d` | one clay-red saloon roof |
| reserve green | `#6f9a64` | cactus and scrub |
| night window | `#ffe9a8` | demonstrated windows and lamps |

### Landmass and north/back canyon skyline

The footprint is unchanged, but north/back strata contrast is stronger and the far row is dusk-purple instead of brown. The near row remains copper, preventing the horizon from reading as basalt. Dusty rose fog `#d8b1a2` closes the east/west wing backgrounds and the south crop by day; bible night purple replaces it after dark. The foreground remains open ground under the camera, and skyline heights follow the locked progression.

### District anchors and population

| district | where | anchor readable at 48 px with buildings hidden | population axis | accent |
|---|---|---|---|---|
| Main town | centre-left | dark water-tower legs and long boardwalk | locked town population with teal awnings increasing at 50-100 percent | one clay-red roof `#a94f3d`; turquoise stays a secondary material |
| Railway station | north-centre | black-brown rails, long platform and crane hook | depot/freight -> signal tower -> caboose and operations pad | signal amber `#e8a13a` |
| Outskirts reserve | east beyond rail | telegraph diagonal, steel tank and cactus forks | sparse habitat cells with no settlement growth | one coral bloom `#d9765c`; cactus green stays a base colour |
| Broad ranch | southwest | wind-pump cross, steel-blue water and corral | buildings/corrals -> animals/tack -> chuck wagon | hay gold `#d0a24c`; wind-pump blue stays a base colour |
| Mine works | northwest | darkest headframe against copper cliff | boiler/sheds -> tailings/camp -> steam and assay shack | bright copper `#c26a3d` |
| Archaeology dig | south-centre | pale trench/foundation grid | tents/trenches -> scaffold -> buried reveal | canvas `#e9d7b7` |

### Landmark treatment

| stage | persists | grows | lights |
|---|---|---|---|
| s1 | copper rise `#7c3f2a`, dark cairn and tripod | 3.5 m signal frame with turquoise vane `#48a9a6` | one amber lamp `#e8a13a` |
| s2 | s1 base remains | 9 m dark lookout with oxidized-teal roof | amber platform lamp and stair lamp |
| s3 | s2 tower persists | 14 m tower, dark stockade, telegraph mast and teal lean-to | 6 warm lamps; mast lamp steady, never flashing |

### Globe marker row

| working id | pedestal side / top / lip | rim treatment | P1 8 m | P2 6 m | P3 4.8 m | P4 4 m | accent object | 48 px silhouette |
|---|---|---|---|---|---|---|---|---|
| `wildwest-c` | copper rock `#7c3f2a` / ochre `#c2925a` / strata `#b8703f` | 3 copper strata bands with dark undercut `#4a3c36` | flat-top copper mesa, cap `#d0a06c` | dark wind pump with amber hub `#e8a13a` | teal-clay false-front saloon `#4f7074` / `#8a4a3f` | sage saguaro pair `#6f9a64` | wind-pump hub `#e8a13a` | copper horizontal cap, black spoked vertical and one amber point |

### Night deviations

- Sky/fog stays bible `#2b2640`; far canyon becomes `#332b3c`, near canyon `#4f3030`, and caps `#6f5148`.
- Rail signals, station lamps, landmark lamps and demonstrated windows emit warm `#ffe9a8`; the wind-pump hub uses non-emissive `#e8a13a` on the marker by day and a small emissive point at night.
- Turquoise `#48a9a6` remains non-emissive. Mine steam catches moonlight; canyon strata and ground never glow.

### Seed-randomization constraints

- Preserve all plan-v4 transforms, protected gaps and fixed systems; use the same building scale and yaw ranges.
- Turquoise appears on 15-25 percent of town/rail facade area, never on canyon, ranch ground, archaeology or reserve rocks.
- Keep one amber rail signal visible from every station seed; no other district may use more than two amber lamps before night.
- The darkest timber silhouettes cannot cluster into one black mass: maintain at least 3 m of ground between headframe, sheds and camp groups.

### 48 px tests

- **Props hidden:** copper top and purple-brown far side must still show three horizontal strata bands; if they collapse to a dark disc, raise cap value one toon step.
- **P1 only:** the mesa stays flat and wide; no crater notch, lava seam or pointed cone.
- **Props shown:** the black wind-pump spokes and one amber hub distinguish the marker from both nearby sand and warm-rock families.
- **Overview:** the rail line and six anchors read as dark linear/vertical marks over copper ground; the reserve remains visibly sparse.

### Nearest-biome distinctness

- Against `egyptian-desert`: deeper copper ground, dark undercut, purple far row, rail hardware and flat mesa are unlike pale stepped masonry and aqua oasis.
- Against `volcanic`: this direction has the highest collision risk, so horizontal strata, ochre cap, teal metal and a spoked wind pump are mandatory; there is no crater, basalt column, lava or ember crack.

### Protected-silhouette note

The closest protected silhouette is again the warm-rock volcano. Direction C is accepted only if the 48 px render preserves the broad flat cap and separate wind-pump spokes; any cone or glowing rim read is a rejection.

### Risks (exactly three)

1. Copper rock plus purple shadow can drift toward `volcanic`; enforce the ochre cap, horizontal strata and non-emissive geology.
2. Night emphasis can make daytime population feel secondary; all district anchors must pass the day 48 px test before lighting review.
3. Dark timber can merge at the mine and station; enforce spacing and the lighter copper ground between silhouettes.

## Review sheet (10 lines)

1. **DESIGNER'S PICK: A - Ochre Railhead.** Keep, cut, or change?
2. Confirm fixed camera `C = [0,135]` / max `[0,155]`, pitch 34-40 deg, yaw +/-35 deg and north-only mesa bands.
3. Confirm the fixed lookout line: survey cairn -> lookout tower -> frontier watch fort.
4. Choose palette direction A, B, or C; footprint and progression do not change.
5. Keep one oxblood/rust town roof, or move the family accent to rail amber?
6. Keep the roundhouse omitted and the 24 x 22 m operations pad clear?
7. Keep archaeology canvas neutral and explicitly non-Egyptian?
8. Keep the reserve at least 55 percent prop-free at every seed?
9. Keep marker priority mesa -> wind pump -> saloon -> saguaro?
10. On approval, advance to the single selected direction; do not generate layout JSON or GLBs yet.
