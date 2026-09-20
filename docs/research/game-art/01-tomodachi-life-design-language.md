# Tomodachi Life: Design Language Study

Research scout notes for StudyGotchi. Scope: Tomodachi Collection (DS, 2009 JP), Tomodachi Life (3DS, 2013/2014), Tomodachi Life: Living the Dream (Switch, 16 Apr 2026). Purpose is to learn the design philosophy, not to copy assets or IP. Tags: **[S]** = sourced fact, **[I]** = inference from screenshots/reviews/fan wikis.

## 1. Visual language

- **Camera / presentation (DS/3DS).** The island is a single fixed diorama with building icons; you tap a location icon then "Enter" to visit it. Miis live in one apartment block whose facade grows as population grows; each window is a room. Tapping a window shows the Mii's status; tapping Enter cuts to a fixed, front-on interior view of that room **[S]** (Nintendo manual, MiiWiki "Mii Apartments"). Rooms are shoebox stages: back wall + floor, no camera movement; an interior is a swappable wallpaper/floor/furniture set (102 in the US 3DS game) **[S]**. A reviewer summarised the 3DS island as "little more than a touchscreen menu" **[S]** (Wccftech). Orthographic-vs-perspective is not documented; the look reads as low-FOV perspective with a locked angle **[I]**.
- **Windows as UI.** Window icons encode state with no text: unlit = out, shuttered = asleep, thought bubble = problem. Bubble colour is a semantic channel: black = general/hungry/wants clothes, orange = friendship, pink = love, blue = sad (raincloud), green = playful, purple ZZZ = dreaming **[S]** (MiiWiki "Problem", fandom "Mii"). A tiny house-in-bubble means "at their home". This is the whole ambient-state HUD.
- **Camera (Switch 2026).** Free-roaming island where the camera follows Miis and zooms through doors/windows without loading screens **[S]** (tomodachilife.wiki tech guide; interview confirms move from apartment block to walkable island). Pick-up-and-drop of Miis started as a debug tool **[S]** (Ask the Developer Pt 1).
- **Palette.** 3DS: relatively muted/desaturated; 2026: much brighter, saturated "sunny island" palette **[S]** (fan reactions in r/tomodachilife thread; multiple say "very saturated"). Personality group now drives a Mii's colour scheme (starting clothes, house interior/exterior, profile card): e.g. Reserved = cool greens/teals **[S]** (MiiWiki "Personality").
- **Shading.** 3DS Miis: smooth Lambert-ish shading, plastic-doll look **[I]**. 2026: art director Kageyama describes "a simple, anime-inspired toon-style" **[S]**; community analysis notes flat cel shading plus a thin rim-light band on hair/features "à la Breath of the Wild" **[S]** (YouTube Mii tips video). No black ink outlines; silhouettes are separated by flat colour blocks and rim light **[I]**.
- **Proportions.** The Mii originates from Miyamoto's "kokeshi plan": a wooden-doll body with a big head where identity lives entirely in face-part placement ("why are portraits so similar to their subjects?") **[S]** (NWR Iwata Asks seminar Pt 1). Height/build are two 0-127 bytes **[S]** (3dbrew). Limbs are stick-like; Kageyama explicitly refused to change "existing facial features and the shape of their limbs" because they are the Mii's identity **[S]**.
- **UI reads.** Speech is shown as text bubbles voiced by TTS; icons for give-food/clothes/interior appear in a bottom row **[S]** (manual). Relationship diagrams, a happiness meter (blue sadness meter when depressed), Mii News broadcasts, and Rankings Boards are the other recurring UI surfaces **[S]**.

## 2. The Mii as a parametric character model

Documented field list (3DS `CFLStoreData`, 0x60 bytes; Switch `CharInfo`, 0x58 bytes) **[S]** (3dbrew, libctru `mii.h`, kinnay wiki, yuzu/Ryujinx source):

| Region | Parameters (type index + colour + transforms) |
|---|---|
| Identity | UUID/CreateID, name (10 UTF-16 chars), gender, birthday, favourite colour (4 bits), height, build |
| Face | faceline type (4 bits, ~12), skin colour (3 bits; Switch 0-9 + free colour in 2026 game), wrinkles (4 bits), makeup (4 bits) |
| Hair | type (8 bits, ~132 on Switch), colour (3 bits legacy / 7 bits Switch), flip |
| Eyes | type (6 bits, 60), colour (3), scale (4), aspect/yscale (3), rotate (5), X spacing (4), Y (5) |
| Eyebrows | type (5, 24), colour (3), scale (4), aspect (3), rotate (4), X (4), Y (5) |
| Nose | type (5, 18), scale (4), Y (5) |
| Mouth | type (6, 36), colour (3), scale (4), aspect (3), Y (5) |
| Facial hair | beard type (3), mustache type (3), colour, scale, Y |
| Glasses | type (4), colour, scale, Y |
| Mole | on/off, scale, X, Y |

Why it works: a face is ~40 small integers. Each part is one of a few dozen hand-drawn textures/meshes; the *transform* channels (scale, aspect, rotate, X, Y) multiply the finite part library into a practically infinite space while keeping every result on-model. Recognition comes from *placement* (the kokeshi insight), so the artist budget is tiny (roughly 60 eyes + 36 mouths + 18 noses + 24 brows + ~130 hairs) yet the output is "surprisingly versatile... nearly anyone" **[S]** (Wccftech). Nintendo's FFL library renders the whole face into a single texture then projects it onto a head mesh **[I]**, which is why 2026's face paint is described as "a flat-ish plane" that only reads from the front **[S]**.

Open-source ecosystem (all reverse-engineered; the Nintendo resource file `FFLResHigh.dat` is copyrighted and NOT redistributable, so none of this is directly usable in a product):

- **ariankordi/FFL.js** – Three.js bindings for the FFL decompilation (WASM), AGPL-3.0 **[S]**.
- **ariankordi/FFL-Testing** – native renderer + render server; author's changes public domain, upstream FFL decomp by AboodXD separate **[S]**.
- **PretendoNetwork/mii-js** – TypeScript parser/encoder for 3DS/Wii U Mii data, AGPL-3.0-only, npm `@pretendonetwork/mii-js` **[S]**.
- Format docs: 3dbrew "Mii", kinnay "Mii Data (Switch)", libctru `mii.h` **[S]**.

Takeaway for StudyGotchi: copy the *architecture* (integer part indices + 5 transform channels per feature, serialisable to <100 bytes), not the parts.

## 3. Personality system

- Creation asks five 8-step sliders: Movement (slow-quick), Speech (polite-direct), Expressiveness/Energy (flat-intense), Attitude (serious-relaxed), Overall (normal-quirky; cosmetic, no effect) **[S]** (MiiWiki, IslandKit).
- Resolution: horizontal = Movement + Speech, vertical = Energy + Attitude, each 0-15, integer-divided by 4 into a 4x4 grid = 16 personalities in 4 groups (Easygoing/Considerate, Outgoing/Energetic, Independent/Reserved, Confident/Ambitious). Speech and Attitude skip the value 4 so their right half weighs slightly more **[S]** (IslandKit, VG247, tomodachichart).
- What personality drives (3DS): group-level, not type-level. Neutral stance and walk cycle; happy/mad/sad/worried poses; starting interior; wedding-house style; baby clothing colour; Tomodachi Quest class; camping item **[S]**. Examples: Easygoing idle = hands on hips, head swaying; Independent = thinking pose, small steps; Confident = forward slouch, arms crossed + foot tap when angry; Outgoing = prance around room while waiting for a friend **[S]** (MiiWiki). Movement slider scales animation speed only, not speech rate **[S]**.
- 2026: group-specific idle quirks were "dialed down" in favour of player-assigned **Little Quirks** (loud voice, light eater, sleeps restlessly, floats in midair, breaks wind) so a Mii can match a real person without forcing everything through 16 buckets **[S]** (Ask the Developer Pt 3; MiiWiki). Personality now mostly selects a colour palette and intro script.
- Voice sliders: Speed, Pitch, Quality/Depth, Tone (start pitch / discrete melody profile), Accent (end-of-sentence pitch), Intonation/Delivery ("rise and fall" variance) **[S]** (tomodachilife.wiki, livingthegrid, Reddit). Regional accent is tied to console region, not per Mii **[S]**. Users can enter phonetic spellings of names **[S]**.

## 4. Animation vocabulary

- Core verbs observed: idle (per group), walk, sit, sleep (pajamas that match personality), eat (with like/dislike/love reactions), sing (8 genre songs at Concert Hall), argue/fight, apologise, confess, propose, happy bounce, sad slump with raincloud, sick (pulsing head / spiky viruses in belly), blush when stared at, hiccup/fall/paralysed "discomfort" states, dream **[S]** (MiiWiki "Mii Houses", "Problem", fandom "Mii").
- Cheapness strategy: static camera, one shoebox stage, poses held rather than motion-captured. Kageyama: "deliberately omitting the wind-up motions that usually serve to make movements appear smoother, and adding more bold, memorable movements... Whenever movements look too realistic and cool, it stops being Mii-like" **[S]**. So: fewer keyframes, snappier holds, exaggerated silhouettes.
- Dreams are the showcase: ~30 short vignettes (Lamppost Chat, Upside Down room, Anti-gravity, Item Worship ritual, Alien Abduction, Super Mario Style platformer, Counting Sheep Miis, Boss Fight vs. a food item) each reusing the existing Mii rig + a prop, ending with an item reward **[S]** (MiiWiki "Dream", Game8). Comedy comes from recontextualising the same doll, not from new animation.
- Ambient life loop (no input): Miis visit each other's rooms, hang out at fountain/beach/park/café, fall asleep on benches, gather twice daily at the fountain to donate coins, run a Morning Market stall, form/lose friendships, get hungry/sick, dream. Problems queue up as window bubbles for the player to resolve later **[S]** (MiiWiki "Tomodachi Life", "Mii Apartments").

## 5. Sound

- Music: DS main theme is "complex, jazzy" under a "folk dance-esque rhythm" giving a "warm, laid-back feel"; 2026 sound director Toru Minegishi (Zelda, Splatoon) rebuilt the theme on that principle: playful surface, rich harmony underneath **[S]** (Ask the Developer Pt 3). Each personality group has a signature jingle **[S]** (MiiWiki audio table).
- Voice: real-time TTS, never pre-recorded. 3DS files (`libNTTS`, `lid.dat`, `synth_med_fxd_bet2f16.dat`, `clc_enu_samantha_cfg1.dat`) indicate a compact Nuance automotive engine with Samantha/Serena voices, plus a Nintendo pronunciation override dictionary (e.g. "Luweegi") **[S]** (GBAtemp thread, Small Mario Findings). Nintendo has never officially named the vendor **[I]**. 2026 uses a new, more realistic engine that Minegishi "intentionally processed... to sound robotic" because realism "doesn't sound like a Mii" **[S]**. Bill Trinen: hearing them speak "is a really key point of their personality" **[S]** (Nintendo Life). Fan generators approximate it with eSpeak NG + a DSP chain **[S]** (miichart).

## 6. Design philosophy (developer quotes)

- Concept: Tomodachi Life is "the ultimate inside joke game" for people who are close or share things in common **[S]** (Takahashi).
- Miis are "living beings that inhabit that world, with a will and personality"; the team's touchstone was "an innocent being, akin to an adorable child" **[S]**.
- Deadpan by design: "Mii characters already serve a silly role, so if we also have them point out the absurdity... the joke begins and ends inside the game. That's why we want players to take on that role. They've got to be the ones to say, 'What are you on about?!'" **[S]** (Takahashi). "If they make smart-aleck or witty remarks... they don't feel like Mii characters" **[S]** (Kageyama).
- Agency over control: a four-option advice prototype was cut because "that led to Mii characters just doing whatever the player told them to, and losing all sense of agency... If the player forces a relationship, the game loses the element of genuine surprise, which is the series' true charm" **[S]**.
- Emergent bugs kept as features: "we set rules for each of those unintended behaviors, keeping the ones we thought were odd but amusing" **[S]** (Ueno).
- Player-authored meaning: things you tell a Mii resurface later ("passionately talking about frozen shoulders being cured") **[S]**. Localisation extends to region-appropriate food and real currency because "Tomodachi Coins... would have instantly made the world seem unfamiliar" **[S]**.
- Casual by default: "you can have just as much fun even if you don't create anything at all" **[S]**.

## 7. What the 2026 Switch game changed

Official/press-verified **[S]**: rebuilt "from the ground up" (dev since ~2017); walkable, freely editable island replaces the apartment block (Island Builder: movable homes/shops, terrain expansion, trees/benches); pick-up-and-drop Miis; up to 8 roommates per shared house; Palette House UGC for food, clothing, pets, house exteriors, ground tiles, TV shows, books/games; Mii Maker adds ears, mixed bangs/back hair, secondary hair colour, eyelash/eyelid/mouth angle, face paint drawing, full skin-colour slider, non-binary gender and dating preferences; "Get Help" questionnaire-based Mii generation; Little Quirks; Mii News; local wireless sharing; toon-shaded HD art; new TTS engine; 1080p docked / 720p handheld. Standalone Concert Hall and Judgment Bay are absent at launch **[S]** (fandom "Events"). Reviewers praise the Mii Maker and observation loop, criticise repetitive events and limited online sharing **[S]** (IGN, Wccftech).

## 8. Asset inventory (approximate counts)

- **Locations (3DS, ~25):** Mii Apartments, Town Hall, Food Mart, Fountain, Beach, Clothing Shop, Hat Shop, Interiors Shop, Pawn Shop, Concert Hall, Import Wear, Observation Tower (JP: Roof), Port, Mii Homes, Mii News, Compatibility Tester, Rankings Board, Campground, Park, Amusement Park, Café, Photo Studio, 3DS Image Share plane **[S]** (MiiWiki "Island", fandom "Island"). Almost all gated behind population/problems-solved counters, which doubles as the progression curve.
- **Interiors:** 102 room sets (3DS US); 272 interior sets (2026) **[S]**.
- **Food (3DS US):** 231 = 43 mains, 83 sides, 81 desserts, 24 drinks, plus trash food; 465 in 2026 with mains/sides merged **[S]**.
- **Clothing (3DS):** 428 types x colour variants = 3,341 items across Masculine 75, Feminine 109, Unisex 69, Formal 69, Costumes 87, plus hats; 8,356 items in 2026 across Outfits/Tops/Dresses/Bottoms/Hats/Accessories/Socks/Shoes/Suits **[S]**.
- **Songs:** 8 genres (Metal, Pop, Rock & Roll, Rap, Ballad, Opera, Techno, Musical), one BGM per genre with editable lyrics **[S]**.
- **Events (3DS, ~12):** Donation, Morning Market, Judgment Bay, Quirky Questions, Chat Session / Pity Party, Flying Disc, BBQ, Photo Shoot, Rap Battle, Word Chain, Magic Show, Tomodachi Quest, plus Night Market **[S]**.
- **Dreams:** ~30 (3DS) and ~30 (2026), many with variants **[S]**.
- **Problem/pondering types:** general, friendship, love, sadness, anger, sickness, discomfort **[S]**.
- **Personality assets:** 4 idle sets, 4 walk cycles, 4 jingles, 16 intro scripts; 2026 adds N Little Quirks (dozens) **[S]**.

## Sources

- Nintendo, Ask the Developer Vol. 21 Pt 1-3 (2026): https://www.nintendo.com/en-ca/whatsnew/ask-the-developer-vol-21-tomodachi-life-living-the-dream-part-1/ , https://www.nintendo.com/en-ca/whatsnew/ask-the-developer-vol-21-tomodachi-life-living-the-dream-part-2/ , full mirror https://simscommunity.info/2026/04/14/ask-the-developer-tomodachi-life-ltd/
- Nintendo Direct recap (features, 16 Apr 2026): https://www.nintendo.com/us/whatsnew/tomodachi-life-living-the-dream-direct-spotlights-quirky-fun-with-player-made-mii-characters-game-launches-on-nintendo-switch-april-16/
- Nintendo store page (2026): https://www.nintendo.com/us/store/products/tomodachi-life-living-the-dream-switch/ ; ZA page (roommates, Studio Workshop): https://www.nintendo.com/en-za/Games/Nintendo-Switch-download-software/Tomodachi-Life-Living-the-Dream-2786386.html
- Nintendo creative trailer post: https://www.nintendo.com/us/whatsnew/its-time-to-get-creative-in-the-latest-trailer-for-tomodachi-life-living-the-dream/
- Tomodachi Life 3DS manual (windows, thought bubbles, icons): https://csassets.nintendo.com/noaext/image/private/t_KA_PDF/manual-3DS-tomodachi-life-en?_a=BATCtdAA0
- Iwata Asks / Game Seminar 2009 Tomodachi Collection Pt 1 (kokeshi plan) and Pt 3: http://www.nintendoworldreport.com/feature/43029/ , http://www.nintendoworldreport.com/feature/43033/
- Iwata Asks 3DS pre-installed software (Takahashi, friend list): https://www.nintendo.com/en-gb/Iwata-Asks/Iwata-Asks-Nintendo-3DS/Vol-6-Nintendo-3DS-Pre-installed-Software/1-A-Real-Tomodachi-Collection/1-A-Real-Tomodachi-Collection-223722.html
- Bill Trinen on voices (Nintendo Life 2014): https://www.nintendolife.com/news/2014/04/nintendos_bill_trinen_discusses_localising_tomodachi_life
- MiiWiki: Personality https://miiwiki.org/wiki/Personality_(Tomodachi_Life_series) ; Mii Apartments https://miiwiki.org/wiki/Mii_Apartments ; Mii Houses https://miiwiki.org/wiki/Mii_Houses ; Problem https://miiwiki.org/wiki/Problem ; Dream https://miiwiki.org/wiki/Dream ; Island https://miiwiki.org/wiki/Island_(Tomodachi_Life) ; Tomodachi Life https://miiwiki.org/wiki/Tomodachi_Life ; Concert Hall https://miiwiki.org/wiki/Concert_Hall ; Amusement Park https://miiwiki.org/wiki/Amusement_Park
- Tomodachi Life Fandom: Personality https://tomodachi.fandom.com/wiki/Personality ; Mii (window icons) https://tomodachi.fandom.com/wiki/Mii ; Island https://tomodachi.fandom.com/wiki/Island ; Food https://tomodachi.fandom.com/wiki/Food ; Clothing https://tomodachi.fandom.com/wiki/Clothing ; Interior https://tomodachi.fandom.com/wiki/Interior ; Events https://tomodachi.fandom.com/wiki/Events ; Sleep (dreams) https://tomodachi.fandom.com/wiki/Sleep
- Personality maths: https://islandkit.org/guides/mii-personality ; https://www.vg247.com/tomodachi-life-living-the-dream-personality-guide ; https://tomodachichart.com/
- Voice sliders: https://www.tomodachilife.wiki/guide/tomodachi-life-voice-guide ; https://www.tomodachilife.wiki/mii/tomodachi-life-mii-maker ; https://livingthegrid.com/guides/tomodachi-life-mii-voice-guide ; https://www.reddit.com/r/TomodachilifeLivingTD/comments/1sabwqg/how_to_use_the_voice_sliders/
- TTS internals: GBAtemp https://gbatemp.net/threads/tomodachi-text-to-speech-analysis-mod.397923/ ; Small Mario Findings https://smallmariofindings.tumblr.com/post/666519009028669440/ ; miichart generator https://miichart.com/tomodachi-life-voice-generator
- Mii data format: 3dbrew https://www.3dbrew.org/wiki/Mii ; libctru mii.h https://github.com/smealum/ctrulib/blob/master/libctru/include/3ds/mii.h ; Switch CharInfo https://github.com/kinnay/NintendoClients/wiki/Mii-Data-(Switch) ; ImHex patterns https://gist.github.com/ariankordi/82d0e7ec1451918f6ec8f4e5f028af1d
- Open-source renderers: FFL.js https://github.com/ariankordi/FFL.js/ ; FFL-Testing https://github.com/ariankordi/FFL-Testing ; mii-js https://github.com/PretendoNetwork/mii-js , https://www.npmjs.com/package/@pretendonetwork/mii-js
- 2026 art/tech: tomodachilife.wiki performance guide https://www.tomodachilife.wiki/release/tomodachi-life-switch-1-performance ; Mii tips video (cel shading, rim light, face paint plane) https://www.youtube.com/watch?v=O08HhOvM0mg ; r/tomodachilife art style thread https://www.reddit.com/r/tomodachilife/comments/1jll78c/how_do_you_feel_about_the_new_tomodachi_life_art/
- Reviews: IGN https://www.ign.com/articles/tomodachi-life-living-the-dream-review ; Wccftech https://wccftech.com/review/tomodachi-life-living-the-dream/ ; GoNintendo preview https://gonintendo.com/contents/59133-preview-tomodachi-life-living-the-dream-looks-like-a-customizable-utopia ; TechRadar https://www.techradar.com/gaming/tomodachi-life-living-the-dream-director-says-development-started-in-2017-after-discussing-a-special-attachment-to-the-series-with-the-producer-but-had-already-squeezed-all-we-could-out-of-the-3ds-title
- 2026 item counts: Game8 catalog https://game8.co/games/Tomodachi-Life-Living-the-Dream/archives/596451 ; dreams https://game8.co/games/Tomodachi-Life-Living-the-Dream/archives/591908 ; food catalog https://tomodachilife.moonmistvalley.com/en/food-catalog/
