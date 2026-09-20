import { test } from "node:test";
import assert from "node:assert/strict";
import { dominantBiome, duckTarget, pickMusic } from "./director.ts";
import { BGM, usedBgmTracks } from "./catalog.ts";

test("the globe plays the title bed and nothing underneath", () => {
  assert.deepEqual(pickMusic({ view: "globe", biome: null, night: false }), { bgm: "cutie-pie", ambience: null });
  assert.deepEqual(pickMusic({ view: "globe", biome: "ice", night: true }), { bgm: "cutie-pie", ambience: null });
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
