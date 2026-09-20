import { afterEach, describe, expect, it, vi } from "vitest";
import {
  adjacentCourseId,
  createSettleScheduler,
  isInteractiveKeyboardTarget,
  keyboardNavigationStep,
  normalizeWheelSpin,
} from "./globe-input";

describe("production globe host input", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("normalizes trackpad deltas into the accepted globe rotation", () => {
    const [horizontal, vertical] = normalizeWheelSpin(25, -10);

    expect(horizontal).toBeCloseTo(-0.06);
    expect(vertical).toBeCloseTo(0.024);
  });

  it.each([
    ["ArrowRight", 1],
    ["ArrowDown", 1],
    ["d", 1],
    ["s", 1],
    ["ArrowLeft", -1],
    ["ArrowUp", -1],
    ["a", -1],
    ["w", -1],
  ] as const)("maps %s to course navigation step %i", (key, step) => {
    expect(
      keyboardNavigationStep({
        key,
        altKey: false,
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
        interactiveTarget: false,
      }),
    ).toBe(step);
  });

  it("ignores interactive targets, modifier shortcuts, and unrelated keys", () => {
    const base = {
      key: "ArrowRight",
      altKey: false,
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
      interactiveTarget: false,
    };

    expect(keyboardNavigationStep({ ...base, interactiveTarget: true })).toBeNull();
    expect(keyboardNavigationStep({ ...base, metaKey: true })).toBeNull();
    expect(keyboardNavigationStep({ ...base, ctrlKey: true })).toBeNull();
    expect(keyboardNavigationStep({ ...base, altKey: true })).toBeNull();
    expect(keyboardNavigationStep({ ...base, shiftKey: true })).toBeNull();
    expect(keyboardNavigationStep({ ...base, key: "Enter" })).toBeNull();
  });

  it.each([
    ["links", "a[href]"],
    ["summary controls", "summary"],
    ["contenteditable ancestors", "[contenteditable]"],
    ["ARIA buttons", '[role="button"]'],
  ])("recognizes %s as interactive keyboard targets", (_, targetSelector) => {
    const target = {
      closest: (selector: string) =>
        selector.includes(targetSelector) ? { nodeName: "MATCH" } : null,
    };
    const plainTarget = { closest: () => null };

    expect(isInteractiveKeyboardTarget(target)).toBe(true);
    expect(
      keyboardNavigationStep({
        key: "ArrowRight",
        altKey: false,
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
        interactiveTarget: isInteractiveKeyboardTarget(target),
      }),
    ).toBeNull();
    expect(isInteractiveKeyboardTarget(plainTarget)).toBe(false);
    expect(isInteractiveKeyboardTarget(null)).toBe(false);
  });

  it("keeps body and canvas keyboard navigation active", () => {
    const canvasTarget = {
      closest: (selector: string) =>
        selector.includes("[tabindex]") && !selector.includes(":not(canvas)")
          ? { nodeName: "CANVAS" }
          : null,
    };

    expect(isInteractiveKeyboardTarget(canvasTarget)).toBe(false);
    expect(isInteractiveKeyboardTarget({ closest: () => null })).toBe(false);
  });

  it("wraps previous and next course navigation by stable id", () => {
    const ids = ["course-a", "course-b", "course-c"];

    expect(adjacentCourseId(ids, "course-c", 1)).toBe("course-a");
    expect(adjacentCourseId(ids, "course-a", -1)).toBe("course-c");
    expect(adjacentCourseId(ids, "missing", 1)).toBe("course-a");
    expect(adjacentCourseId([], null, 1)).toBeNull();
  });

  it("settles 520 ms after the final wheel input", () => {
    vi.useFakeTimers();
    const settle = vi.fn();
    const scheduler = createSettleScheduler(settle);

    scheduler.schedule();
    vi.advanceTimersByTime(400);
    scheduler.schedule();
    vi.advanceTimersByTime(519);
    expect(settle).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(settle).toHaveBeenCalledOnce();
  });

  it("cancels a pending settle during host cleanup", () => {
    vi.useFakeTimers();
    const settle = vi.fn();
    const scheduler = createSettleScheduler(settle);

    scheduler.schedule();
    scheduler.cancel();
    vi.advanceTimersByTime(520);

    expect(settle).not.toHaveBeenCalled();
  });

  it("cancels a pending wheel settle when a later input starts", () => {
    vi.useFakeTimers();
    const settle = vi.fn();
    const scheduler = createSettleScheduler(settle);

    scheduler.schedule();
    scheduler.cancel();
    vi.advanceTimersByTime(520);

    expect(settle).not.toHaveBeenCalled();
  });

  it("does not settle while scene pointer interaction is active", () => {
    vi.useFakeTimers();
    let pointerInteracting = false;
    const settle = vi.fn();
    const scheduler = createSettleScheduler(
      settle,
      () => !pointerInteracting,
    );

    scheduler.schedule();
    pointerInteracting = true;
    vi.advanceTimersByTime(520);

    expect(settle).not.toHaveBeenCalled();
  });
});
