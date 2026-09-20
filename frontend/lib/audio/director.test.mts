import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dominantBiome, duckTarget, makeThrottle, pickMusic } from "./director.ts";
import { AUDIO_BASE, BGM, SFX_NAMES, SPACE_BGM, sfxFile, usedBgmTracks } from "./catalog.ts";

// frontend/public/assets is a symlink to the repo's assets/; resolve the real folder.
const ASSETS = resolve(dirname(fileURLToPath(import.meta.url)), "../../../assets");
const onDisk = (url: string) => resolve(ASSETS, url.replace(`${AUDIO_BASE}/`, "audio/"));

test("the globe plays the title bed and nothing underneath", () => {
  assert.deepEqual(pickMusic({ view: "globe", biome: null, night: false }), { bgm: "cutie-pie", ambience: null });
  assert.deepEqual(pickMusic({ view: "globe", biome: "ice", night: true }), { bgm: "cutie-pie", ambience: null });
});

test("the Information sky plays the astral bossa, day or night, whatever biome was last seen", () => {
  assert.equal(SPACE_BGM, "information-astral-bossa");
  assert.deepEqual(pickMusic({ view: "space", biome: null, night: false }), { bgm: SPACE_BGM, ambience: null });
  assert.deepEqual(pickMusic({ view: "space", biome: "forest", night: true }), { bgm: SPACE_BGM, ambience: null });
  // and it is a different bed from the globe, so /earth <-> /knowledge is a real crossfade
  assert.notEqual(pickMusic({ view: "space", biome: null, night: false }).bgm, pickMusic({ view: "globe", biome: null, night: false }).bgm);
});

test("the astral bed is the remix the licence asks us to credit, and it is on disk", () => {
  const t = BGM[SPACE_BGM];
  assert.equal(t.license, "CC-BY 4.0");
  assert.ok(t.credit.includes("glitchart"));
  for (const upstream of ["Trevor Lentz", "CleytonKauffman", "migfus20", "FrancisLeeMusic"]) {
    assert.ok(t.credit.includes(upstream), `credit names ${upstream}`);
  }
  assert.ok(existsSync(onDisk(t.file)), `${t.file} exists`);
});

test("the sky's sounds exist in the kit and were rendered", () => {
  const manifest = JSON.parse(readFileSync(resolve(ASSETS, "audio/sfx/manifest.json"), "utf8")) as {
    sounds: { name: string; group: string; duration: number }[];
  };
  const byName = new Map(manifest.sounds.map((s) => [s.name, s]));
  for (const name of ["space-enter", "star-select", "lens-weak", "cluster-glide"] as const) {
    assert.ok(SFX_NAMES.includes(name), `${name} is a typed SfxName`);
    const entry = byName.get(name);
    assert.ok(entry, `${name} is in the sfx manifest`);
    assert.equal(entry.group, "space");
    assert.ok(entry.duration <= 1.3, `${name} is a one-shot, not a bed`);
    assert.ok(existsSync(onDisk(sfxFile(name))), `${name}.wav exists`);
  }
});

test("every typed sfx name has a rendered file", () => {
  for (const name of SFX_NAMES) assert.ok(existsSync(onDisk(sfxFile(name))), `${name}.wav exists`);
});

test("star hover is throttled to one twinkle per gap", () => {
  const allow = makeThrottle(110);
  assert.equal(allow(1000), true);
  assert.equal(allow(1050), false);
  assert.equal(allow(1109), false);
  assert.equal(allow(1110), true);
  assert.equal(allow(1300), true);
});

test("an island plays its biome bed, forest with ambience under it", () => {
  assert.deepEqual(pickMusic({ view: "island", biome: "forest", night: false }), {
    bgm: "ukulele-forest-loop",
    ambience: "forest-ambience",
  });
  assert.deepEqual(pickMusic({ view: "island", biome: "ice", night: false }), { bgm: "snow-globe", ambience: null });
});

test("night swaps to a quieter bed", () => {
  assert.equal(pickMusic({ view: "island", biome: "city", night: true }).bgm, "sleepy");
  assert.equal(pickMusic({ view: "island", biome: "ice", night: true }).bgm, "wallpaper");
});

test("no view or no biome means silence", () => {
  assert.deepEqual(pickMusic({ view: "none", biome: "forest", night: false }), { bgm: null, ambience: null });
  assert.deepEqual(pickMusic({ view: "island", biome: null, night: false }), { bgm: null, ambience: null });
});

test("every chosen track exists in the catalog with a credit line", () => {
  for (const t of Object.values(BGM)) {
    assert.ok(t.credit.includes(t.artist), `${t.id} credit names its artist`);
    assert.ok(t.file.endsWith(".mp3"), `${t.id} ships as mp3 so Safari can decode it`);
  }
});

test("the chrome credits list is the beds the director can actually pick", () => {
  const ids = usedBgmTracks().map((t) => t.id);
  assert.ok(ids.includes("cutie-pie"));
  assert.ok(ids.includes("information-astral-bossa"));
  assert.ok(ids.includes("ukulele-forest-loop"));
  assert.ok(ids.includes("sleepy"));
  assert.ok(ids.includes("forest-ambience"));
  assert.equal(new Set(ids).size, ids.length);
});

test("ducking drops the music to 35% of the listener's level", () => {
  assert.ok(Math.abs(duckTarget(0.8) - 0.28) < 1e-12);
  assert.equal(duckTarget(0), 0);
});

test("the dominant biome is the place with the most concepts, first on ties", () => {
  assert.equal(
    dominantBiome([
      { biome: "forest", concept_ids: ["a"] },
      { biome: "city", concept_ids: ["b", "c"] },
      { biome: "ice", concept_ids: ["d", "e"] },
    ]),
    "city",
  );
  assert.equal(dominantBiome([]), null);
});
