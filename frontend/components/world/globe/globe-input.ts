export const TRACKPAD_SETTLE_MS = 520;

const TRACKPAD_SPIN_SCALE = 0.0024;
const INTERACTIVE_TARGET_SELECTOR = [
  "a[href]",
  "area[href]",
  "button",
  "input",
  "textarea",
  "select",
  "summary",
  "audio[controls]",
  "video[controls]",
  "[contenteditable]:not([contenteditable='false'])",
  "[tabindex]:not([tabindex='-1']):not(canvas)",
  '[role="button"]',
  '[role="link"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[role="switch"]',
  '[role="slider"]',
  '[role="spinbutton"]',
  '[role="textbox"]',
  '[role="combobox"]',
  '[role="listbox"]',
  '[role="menuitem"]',
  '[role="menuitemcheckbox"]',
  '[role="menuitemradio"]',
  '[role="option"]',
  '[role="tab"]',
  '[role="treeitem"]',
].join(", ");

export interface KeyboardNavigationInput {
  key: string;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  interactiveTarget: boolean;
}

interface ClosestTarget {
  closest(selector: string): unknown;
}

export function normalizeWheelSpin(
  deltaX: number,
  deltaY: number,
): [horizontal: number, vertical: number] {
  return [-deltaX * TRACKPAD_SPIN_SCALE, -deltaY * TRACKPAD_SPIN_SCALE];
}

export function isInteractiveKeyboardTarget(
  target: EventTarget | ClosestTarget | null,
): boolean {
  if (!target || typeof (target as ClosestTarget).closest !== "function") {
    return false;
  }
  return Boolean((target as ClosestTarget).closest(INTERACTIVE_TARGET_SELECTOR));
}

export function keyboardNavigationStep(
  input: KeyboardNavigationInput,
): -1 | 1 | null {
  if (
    input.altKey ||
    input.ctrlKey ||
    input.metaKey ||
    input.shiftKey ||
    input.interactiveTarget
  ) {
    return null;
  }

  const key = input.key.toLowerCase();
  if (
    key === "arrowright" ||
    key === "arrowdown" ||
    key === "d" ||
    key === "s"
  ) {
    return 1;
  }
  if (
    key === "arrowleft" ||
    key === "arrowup" ||
    key === "a" ||
    key === "w"
  ) {
    return -1;
  }
  return null;
}

export function adjacentCourseId(
  courseIds: readonly string[],
  activeCourseId: string | null,
  step: -1 | 1,
): string | null {
  if (courseIds.length === 0) return null;
  const activeIndex = activeCourseId
    ? courseIds.indexOf(activeCourseId)
    : -1;
  if (activeIndex < 0) return step > 0 ? courseIds[0] : courseIds.at(-1)!;
  return courseIds[
    (activeIndex + step + courseIds.length) % courseIds.length
  ];
}

export function createSettleScheduler(
  settle: () => void,
  canSettle: () => boolean = () => true,
) {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const cancel = () => {
    if (timer === null) return;
    clearTimeout(timer);
    timer = null;
  };

  return {
    schedule() {
      cancel();
      timer = setTimeout(() => {
        timer = null;
        if (canSettle()) settle();
      }, TRACKPAD_SETTLE_MS);
    },
    cancel,
  };
}
