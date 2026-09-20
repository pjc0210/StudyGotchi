# Creature Design Principles for StudyGotchi

Research scout notes, 2026-09-19. Scope: how Tamagotchi and adjacent games design small, cute, evolvable creatures, and what StudyGotchi should borrow. Items marked **[sourced]** trace to a URL in the Sources section; items marked **[inference]** are our synthesis for this project.

## 1. Tamagotchi lineage

- **Origin.** Akihiro Yokoi (WiZ) pitched the portable pet to Bandai in 1995; Aki Maita developed concept and marketing. Yokoi's thesis: effort spent on care "turns into love," so death was a deliberate "must have." **[sourced: S1, S2, S3]**
- **How the 1996 characters were drawn.** Per an NHK feature, Bandai mined 1990s youth magazines for the "rough and simple" kawaii style; a young part-time worker drew the final seven characters; shells were tested with ~250 Shibuya schoolgirls. Cut prototypes included a speech-bubble creature and a bird with a floating head. **[sourced: S4, S5]**
- **Growth stages (P1).** Egg (5 min) → Baby (65 min) → Child → Teen at age 3 (2 options) → Adult at age 6 (6 options) → hidden adult at 8–12. **[sourced: S5, S6]**
- **Branching by care quality.** Decided by *care mistakes* (need unmet 15 min) and *discipline* per stage. Mametchi = 0–2 mistakes + 100% discipline; Kuchipatchi = 3+ mistakes but full discipline; Maskutchi/Tarakotchi = low discipline. Lesson: the sloppy-care adult (Kuchipatchi, the glutton) became a co-mascot; no branch is a punishment. **[sourced: S6, S7, S8]**
- **Name-the-feature.** Adults are a blob silhouette plus one exaggerated feature that names them (*mame* = bean, *kuchi* = lips, *meme* = eyes). **[sourced: S8; inference on the rule]**
- **Recent releases.** Pix (2021, camera), Uni (2023, Wi-Fi, one customizable "Uni Tama" with outfits, 21 adults), Paradise (2025; new versions July 2026) are all color-screen. Paradise adds breeding with mixable body colors and eye types, 68 characters across four biomes, and is the first color release with a *new* art style distinct from the prior "modern" and "anime" styles. Uni is effectively a dress-up axis on a fixed adult. **[sourced: S9, S10, S11]**
- **Digimon's fork.** Kenji Watanabe says Digimon copied Tamagotchi's care split (Greymon vs. Numemon) but "portray[ed] the extremes even further." **[sourced: S12]**

## 2. Kawaii / cute design principles

**Baby schema (Kindchenschema).** Lorenz (1943): large head, high forehead, large low-set eyes, chubby cheeks, small nose and mouth, short thick limbs, plump body. Glocker et al. (2009) manipulated face width, forehead height, eye size, nose/mouth size in infant photos; high-schema faces were rated cuter and raised caretaking motivation (n=122), with nucleus accumbens activation in fMRI. A 2024 Royal Society review notes the term is used inconsistently but confirms those manipulable features as the standard. **[sourced: S13, S14, S15]**

Concrete rules:

- **Head-to-body 1:1 to 2:1.** Kirby and P1 Tamagotchis are all head; Chiikawa and Sanrio characters are ~2 heads tall. **[inference; exemplars S16, S17]**
- **Eyes large, low, wide-set; nose/mouth tiny or absent.** Hello Kitty has no mouth so viewers "project their feelings onto her"; creator Yuko Shimizu: "I couldn't express the mouth in a cute way, so I decided not to use it." Sakurai wants Kirby to "stay neutral, no matter who's looking at him." **[sourced: S17, S18, S19]**
- **Silhouette first.** Nintendo on Animal Crossing: "It all starts with the silhouette"; species must read at a distance, and initial information is deliberately limited to provoke curiosity. Pikmin's leaf exists because a tiny character "needed something to help it visually stand out," and type had to read from the head top-down. **[sourced: S20, S21]**
- **Drawable in five seconds.** Iwata: Kirby is "a simple circular design, so anyone could draw him." A manga pro on Chiikawa: round forms, few lines, white+pink, hand-drawn wobble with "no straight lines." Molcar spread because it is "a blank slate to personalize." **[sourced: S16, S19, S22, S23]**
- **Add one "wrong" detail.** Sugimori: "take away from designs that are too cool"; Oshawott's freckles make it less cute but more memorable, and he refused to cut them. **[sourced: S24]**
- **Palette: 2–3 flat colors + one accent, uniform line weight.** Hello Kitty's brand guide mandates constant outline weight and a fixed five-color set; Kirby is pink because the expected color "would have been yellow." Pikmin colors *are* types. **[sourced: S25, S16, S21]**
- **One expression system for every species.** Nintendo: emotional expression "is the same no matter the species." ACNL files show 8 eye textures and 6 mouth textures per villager; PMD portraits use a 16-emotion grid at 40×40 px, ≤15 colors. **[sourced: S20, S26, S27]**
- **Tactile material and a hybrid hook.** Molcar is wool felt; Cult of the Lamb is hand-drawn with bold outlines; Bugsnax crossed "iconic foods" with "iconic bugs." **[sourced: S23, S28, S29]**

## 3. Modular creature systems

| System | Axes | Output | Source |
|---|---|---|---|
| Animal Crossing NH | 35 species bodies × per-villager texture × shared 8-eye/6-mouth set × clothing × 8 personalities; a few unique add-ons (tusks, hairpins) | 417 villagers | S20, S26, S30 |
| Neopets | 56 species × ~60 paint colors (17 universal); color is a full re-skin incl. material (Plushie, Robot) | 3,762 combos | S31, S32 |
| Slime Rancher | Largo = any two of ~13 bases, inheriting each base's signature feature (tabby ears, saber fangs) | 45+ from 10 bases | S33 |
| Chao (SA2) | 3 alignments × 5 stat types at first evolution, then continuous drift | 15 + gradient | S34, S35 |
| Wobbledogs | 126-allele genome (size, legs, heads, tails, wings, horns, eyes, ears, mouths, pattern); food → gut flora → mutation, so dogs "become shaped like the thing they eat" | unbounded | S36, S37 |
| Cult of the Lamb | Species skin × color variant on one rig; traits separate | dozens × ~4 | S28 |
| Spore | Metaball spine + Rigblock parts with slider deformations; animation retargets via semantic queries ("upper-leftmost grasper") and procedural gait from leg count/length/symmetry; creature "recipe" kept tiny | unbounded | S38, S39, S40 |
| Tamagotchi Paradise | Body color × eye type via breeding × biome | 68 | S10 |

**Axes ranked by perceived variety per unit of art [inference]:**

1. **Palette/recolor** — near-zero cost, huge yield (Neopets 56 → 3,762). Hue-shift 2–3 masked regions, not the whole sprite.
2. **Shared face set** — 8 eyes + 6 mouths give every species full emotional range and make them read as one family.
3. **Species/base body** — most expensive (own idle/walk) but carries identity via silhouette. Aim for 6–10 bases.
4. **Accessory/prop slot** — one anchored attachment reads at small size; natural home for "what subject this creature learned."
5. **Pattern/markings overlay** — mask layer; Wobbledogs treats it as its own gene.
6. **Size/scale** — free; use for growth stage.
7. **Part swap (ears/tails/horns)** — good yield but multiplies animation/clipping work; needs a shared rig or strict anchors.

## 4. Evolution and growth visuals

- **Discrete stages with branching (Tamagotchi, Digimon).** Transitions are full sprite swaps; the *branch* encodes care. Digimon runs Baby I → Baby II → Child → Adult → Perfect → Ultimate and allows a form to "have no relationship at all" to its predecessor; Pokémon instead matures a core motif (Oshawott's otter → samurai sea-lion). **[sourced: S6, S41, S42]**
- **Stat-driven morphing (Chao, SA2).** Hidden sliders Swim↔Fly and Run↔Power (−1..1, ±0.1 per animal) plus alignment Dark↔Hero are sampled at cocoon time. Alignment changes *material and motif* (Hero: white, halo, inverted eye colors; Dark: dark palette, spiked ball); type changes *parts* (Swim: flat fin-ears; Fly: wing-like head caps; Run: single antenna; Power: multiple spikes). Adults keep drifting toward what they're fed. **[sourced: S34, S35, S43]**
- **Diet-shaped bodies (Wobbledogs).** Pupation applies gut-flora mutations, so the loop is legible: what you eat is what you become. **[sourced: S36]**

**Mapping to StudyGotchi [inference]:** treat learning evidence as Chao animals. Each subject is a slider; the dominant slider at each stage picks a part-set (math → geometric horn, writing → quill tail, biology → leaf sprout, CS → antenna/LED). Streak consistency plays the alignment role and drives *palette/material* (saturated and glossy vs. muted and sleepy), never ugliness. Stage drives scale and head ratio (baby 1:1, adult ~1.5:1) and unlocks the accessory slot. Keep Tamagotchi's rule: low-care branches are lovable oddballs, not punishments.

## 5. Visual reference URLs

Soft 3D / toy / clay / plush:

1. Ken Barthelmey, "Stuffed Companion" (ArtStation) — matte plush sculpt, big low-set eyes; the material read we want. https://www.artstation.com/artwork/5BlEdg
2. Airborn Studios, Palia Ormuu plushies — a game creature simplified into a toy without losing identity. https://airbornstudios.artstation.com/projects/EvX814
3. "Chonko" clay creature (CGTrader) — plasticine imperfections, tiny features, chunky proportions at low poly. https://www.cgtrader.com/3d-models/character/fantasy-character/chonko-cute-chubby-clay-style-creature
4. "Blubbo" clay creature (CGTrader) — sibling piece for judging clay shading at thumbnail size. https://www.cgtrader.com/3d-models/character/fantasy-character/blubbo-cute-clay-style-creature
5. Studio Nuts, Paragon Bank "Spring" mascot (Behance 2025) — soft-3D pipeline from design to animation; "cute but trustworthy." https://www.behance.net/gallery/235110405/Paragon-Bank-Spring-3D-Character-Design
6. "Bobo" (Behance 2025) — woven-fabric material, minimal motion, expressive face. https://www.behance.net/gallery/220965747/Bobo
7. Kenney Cube Pets (CC0, 2026) — 16 animated glTF pets; placeholder rig for web prototypes. https://opengameart.org/content/cube-pets
8. Quaternius Ultimate Animated Animal Pack (free glTF) — 12 animals with idle/walk/jump. https://quaternius.com/packs/ultimateanimatedanimals.html
9. Tamagotchi Paradise gallery — Bandai's newest style plus breeding-based color/eye mixing. https://tamagotchi.fandom.com/wiki/Tamagotchi_Paradise

Clean 2D vector / sticker:

10. RGS_Dev Modular Animated Vector Characters (CC0) — colorizable separated parts (3 heads, 7 eyes, 8 mouths, 5 horns) with idle/walk; direct template for a part system. https://rgsdev.itch.io/free-cc0-modular-animated-vector-characters-2d
11. RhosGFX Vector RPG Character Template (free SVG, 4 directions) — Gen-3-Pokémon proportions for 64 px tests. https://rhosgfx.itch.io/character-template
12. Kenney Animal Pack Redux (CC0 vector) — 30 animals × 8 styles (round/square, outline/none) for A/B-ing outline weight. https://opengameart.org/content/animal-pack-redux
13. labitos Tiny Pets (free) — 12 pets, 4 animations, "one family" consistency at 32/64 px. https://labitos.itch.io/tiny-pets
14. Blueberry Cozy Creature Sprites — 5 bodies × 13 palettes sharing a silhouette so animations line up. https://blueberry-assets.itch.io/cozy-creature-sprites
15. PMD Sprite Repository — 16-emotion 40×40 portrait grids for 1,000+ Pokémon (CC BY-NC; reference only). http://portraits.pmdcollab.org/
16. Nookipedia villager index — 417 villagers by species; see the recolor/face/accessory axes at work. https://nookipedia.com/wiki/Villager
17. Pinterest "Cute Character design" (bearmukung, 1,400 pins, no login) — kawaii mascot sheets. https://www.pinterest.com/bearmukung/cute-character-design/
18. Pinterest "Style - Toony" (fushark) — toony monsters, strong shape language. https://www.pinterest.com/fushark/style-toony/

## 6. Candidate original art directions

**A. Soft-toy 3D, matte plush/felt/clay materials, Three.js.**
Pros: growth and stat-morphing are cheap (scale bones, swap attachment meshes, tween material params); one rig serves every species if bodies share topology; recolor is a uniform; palette/material can drift continuously, which is what a streak slider wants. Cons: heaviest hackathon build (model, rig, glTF); needs `MeshToonMaterial` with a NearestFilter gradient map or a custom ramp to escape the "Blender default" look; AI mesh generation is immature and AI clay *concepts* hold material but drift in shape, so AI is a concept tool only. **[shader sourced: S44; rest inference]**

**B. Flat vector stickers (2–3 colors, uniform thick outline, sticker border) via SVG/Rive or a PixiJS atlas.**
Pros: best readability at 32–64 px; palette swaps are fill changes; shared eye/mouth sets compose trivially; AI is *most* consistent here because there is no lighting or perspective to drift, and a fixed prompt block plus a 15–30 image LoRA reaches ~85–95% identity consistency. Rive gives state-machine idle/walk/react in tiny files; PixiJS atlases scale to dozens of creatures at 60 fps. Cons: growth needs discrete redraws per stage, so stats must live in accessories and palette rather than continuous body shape; risk of generic app-mascot look without a distinctive outline and shape language. **[sourced: S45, S46, S47, S48; rest inference]**

**C. Clay 2.5D: 3D turntables baked to sprite sheets.**
Pros: Molcar/Chonko tactility at sprite runtime cost. Cons: every recolor or accessory is a re-render, collapsing the combinatorial axes; multi-direction walks multiply sheet size. Use only for hero moments (hatch, evolution reveal) over A or B. **[inference]**

**Recommendation [inference]:** B for the hackathon, built on A's data model (species × palette × face × accessory × stage as data, not art) so a 3D swap stays possible. Prototype at 48 px on a busy background before locking outline weight.

## Sources

- S1 Asiaweek, Maita Aki profile (1997). https://www.cnn.com/ASIANOW/asiaweek/97/0725/feat2a.html
- S2 NYT, "Hatchling of Pet Lover Is the Rage of Toylands" (1997). https://www.nytimes.com/1997/09/07/world/hatchling-of-pet-lover-is-the-rage-of-toylands.html
- S3 Santa Cruz Weekly, Akihiro Yokoi interview. https://www.santacruz.com/news/tamagotchi_mans_best_trend.html
- S4 Tama-Palace summary of NHK Tamagotchi feature. https://tamapalace.tumblr.com/post/656619382917709824/
- S5 Tamagotchi Wiki, Tamagotchi (1996 Pet). https://tamagotchi.fandom.com/wiki/Tamagotchi_(1996_Pet)
- S6 Thaao's Tamas, P1 care and character guides. https://thaao.net/tama/p1/ and https://www.thaao.net/tama/p1/?p=chara
- S7 Tamagotchi Wiki, Kuchipatchi. https://tamagotchi.fandom.com/wiki/Kuchipatchi
- S8 Tamagotchi Wiki, Mametchi. https://tamagotchi.fandom.com/wiki/Mametchi
- S9 Tamavault device comparison (2026). https://tamavault.com/devices/compare/
- S10 Tamagotchi Wiki, Tamagotchi Paradise. https://tamagotchi.fandom.com/wiki/Tamagotchi_Paradise
- S11 Bandai, Tamagotchi Uni announcement. https://tamagotchi-official.com/us/series/uni/news/01_4/
- S12 Kenji Watanabe interview (Digimon 20th anniversary art book, translated). https://withthewill.net/threads/translated-interview-with-kenji-watanabe-from-20th-anniversary-art-book.19653/
- S13 Glocker et al. 2009, Ethology (PMC). https://pmc.ncbi.nlm.nih.gov/articles/PMC3260535/
- S14 Glocker et al. 2009 PDF (UPenn). https://www.med.upenn.edu/csa/assets/user-content/documents/BabySchemainInfantFacesInducesCutenessPerceptionandMotivationforCaretakinginAdults.pdf
- S15 Royal Society Proc B 2024, "Lorenz's classic 'baby schema'". https://royalsocietypublishing.org/doi/10.1098/rspb.2024.0570
- S16 Kirby's Adventure 1993 developer interview (shmuplations). https://shmuplations.com/kirbysadventure/
- S17 Wikipedia, Hello Kitty. https://en.wikipedia.org/wiki/Hello_Kitty
- S18 Tofugu, "The Secret Behind Hello Kitty's Blank Face". https://www.tofugu.com/japan/hello-kitty-face/
- S19 Sakurai Famitsu column vol. 17 (Source Gaming). https://sourcegaming.info/2018/03/18/the-character-named-kirby-sakurais-famitsu-column-vol-17-2/
- S20 Siliconera, Nintendo on how ACNH villagers were created (archived). https://web.archive.org/web/20231216231000/https:/www.siliconera.com/nintendo-on-how-animal-crossing-new-horizons-lovable-villagers-were-created/
- S21 Nintendo, Ask the Developer Vol. 10, Pikmin 4 Part 1. https://www.nintendo.com/en-ca/whatsnew/ask-the-developer-vol-10-pikmin-4-part-1/
- S22 PicoN!, manga pro on why Chiikawa is popular (JP). https://picon.fun/illustration/20240201/
- S23 Wikipedia, Pui Pui Molcar; Japan Media Arts Festival entry. https://en.wikipedia.org/wiki/Pui_Pui_Molcar and https://www.j-mediaarts.jp/en/award/single/pui-pui-molcar/index-2.html
- S24 Siliconera, Sugimori on balancing cool/cute (Oshawott freckles). https://www.siliconera.com/pokmon-designer-on-balancing-cool-or-cute-pokmon-by-adding-uncool-or-uncute-features/
- S25 Brand Genome, Hello Kitty style-guide summary. https://brand-genome.github.io/brands/hello-kitty/
- S26 ACNL custom villager guide (8 eye / 6 mouth textures). https://mayorfuu.tumblr.com/post/138920380926/guide-to-creating-custom-villagers-on-acnl
- S27 PMD Sprite Repository. http://portraits.pmdcollab.org/
- S28 Cult of the Lamb Wiki, Follower forms; Game Developer interview. https://cult-of-the-lamb.fandom.com/wiki/Follower_forms and https://www.gamedeveloper.com/design/interview-corralling-the-inherent-cuteness-of-cult-of-the-lamb
- S29 Kotaku, Bugsnax devs on creature design. https://kotaku.com/bugsnax-devs-say-the-ending-could-have-been-a-lot-darke-1846103274
- S30 Nookipedia, Villager (417 count, 8 personalities). https://nookipedia.com/wiki/Villager
- S31 Jellyneo Book of Ages, species list. https://bookofages.jellyneo.net/species/menu/
- S32 Jellyneo, Rainbow Pool colour statistics. https://www.jellyneo.net/?go=comments&post=14525
- S33 Slime Rancher Wiki, Largo Slimes. https://slimerancher.fandom.com/wiki/Largo_Slimes
- S34 Chao Island Wiki, Evolution. https://chao-island.com/wiki/Evolution
- S35 Chao World Master Guide (alignment visuals). https://www.vizzed.com/boards/thread.php?id=88548
- S36 Game Developer, Wobbledogs AI and physics (Tom Astle). https://www.gamedeveloper.com/design/behind-the-ai-and-physics-of-i-wobbledogs-i-procedurally-goofy-wobbledogs
- S37 Steam guide, Understanding Wobbledog Genetics. https://steamcommunity.com/sharedfiles/filedetails/?id=3221747228
- S38 Hecker et al., SIGGRAPH 2008, Real-time Motion Retargeting (Spore). http://www.chrishecker.com/images/archive/c/cb/20080513034828!Sporeanim-siggraph08.pdf
- S39 Hecker, "My Liner Notes for Spore". https://www.chrishecker.com/My_Liner_Notes_for_Spore
- S40 Willmott, Rigblocks (SIGGRAPH 2007 sketch). https://www.cs.cmu.edu/~ajw/s2007/0248-Rigblocks.pdf
- S41 Wikimon, Evolution. https://wikimon.net/evolution
- S42 DigimonWiki, Digivolution. https://digimon.fandom.com/wiki/Digivolution
- S43 GameFAQs SA2 Chao FAQ (type-specific body changes). https://gamefaqs.gamespot.com/dreamcast/291597-sonic-adventure-2/faqs/13295
- S44 Three.js MeshToonMaterial docs. https://threejs.org/docs/#api/en/materials/MeshToonMaterial
- S45 Rive docs, canvas vs WebGL2 runtimes. https://rive.app/docs/runtimes/web/canvas-vs-webgl
- S46 Unicorn Icons, Lottie vs Rive performance (2026). https://unicornicons.com/blog/lottie-vs-rive-performance
- S47 Apatero, consistent AI character guide (LoRA 15–30 images, ~85–95%). https://apatero.com/blog/ai-consistent-character-generator-multiple-images-2026
- S48 Neolemon, consistent characters / style DNA. https://www.neolemon.com/blog/ultimate-guide-to-creating-consistent-characters/
