import { test } from "node:test";
import assert from "node:assert/strict";
import { schedule } from "./schedule.ts";

const letters = (text: string, mood: "neutral" | "happy" | "sad" = "neutral", opts = {}) =>
  schedule(text, "peach", mood, opts).events.filter((e) => e.kind === "letter");

test("neutral letters land 75 ms apart, vowels add 8 ms", () => {
  assert.deepEqual(
    letters("bcd").map((e) => e.at),
    [0, 0.075, 0.15],
  );
  assert.deepEqual(
    letters("ab").map((e) => e.at),
    [0, 0.083],
  );
  assert.equal(schedule("bcd", "peach").duration, 0.225);
});

test("mood scales tempo into the 60-90 ms window and shifts pitch", () => {
  const happy = schedule("bcd", "peach", "happy");
  const sad = schedule("bcd", "peach", "sad");
  assert.equal(happy.spacingMs, 63.8);
  assert.equal(sad.spacingMs, 90);
  assert.deepEqual(
    happy.events.map((e) => e.at),
    [0, 0.0638, 0.1275],
  );
  assert.ok(happy.events[0].rate > 1.1, `happy first letter ${happy.events[0].rate}`);
  assert.ok(sad.events[0].rate < 0.95, `sad first letter ${sad.events[0].rate}`);
});

test("a question lifts the last two letters by 8%", () => {
  const flat = letters("hi.", "neutral", { jitter: 0 });
  const rising = letters("hi?", "neutral", { jitter: 0 });
  assert.ok(Math.abs(rising[0].rate - flat[0].rate * 1.08) < 1e-9);
  assert.ok(Math.abs(rising[1].rate - flat[1].rate * 1.08) < 1e-9);
});

test("word starts are stressed, word ends dip, sentence declines", () => {
  const ev = letters("ba ba", "neutral", { jitter: 0 });
  // stress 1.03 on the first letter of each word
  assert.equal(ev[0].rate, 1.03);
  // word-final dip 0.98 on the last letter of each word (declination shifts the second word lower)
  assert.ok(ev[1].rate < 1);
  assert.ok(ev[3].rate < ev[1].rate);
  assert.equal(ev[0].gain, 0.92); // consonant at word start
  assert.equal(ev[1].gain, 0.9); // vowel mid-word
});

test("punctuation pauses are silent events that take time; other symbols vanish", () => {
  const s = schedule("a, b", "peach");
  const pause = s.events.find((e) => e.kind === "pause");
  assert.ok(pause);
  assert.equal(pause?.char, ",");
  assert.equal(pause?.at, 0.083);
  assert.equal(pause?.gain, 0);
  assert.equal(s.duration, 0.333);

  const digits = schedule("a1b", "peach");
  assert.equal(digits.events.length, 2);
  assert.equal(digits.events[1].at, 0.083);
});

test("the same text, species and mood always schedule identically", () => {
  const a = schedule("Hello island", "mint", "happy");
  const b = schedule("Hello island", "mint", "happy");
  assert.deepEqual(a, b);
  const c = schedule("Hello island", "coral", "happy");
  assert.notDeepEqual(a.events.map((e) => e.rate), c.events.map((e) => e.rate));
});
