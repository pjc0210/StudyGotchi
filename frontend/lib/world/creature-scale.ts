/** Every resident, guest, and globe walker draws at this height in metres. */
export const CREATURE_DISPLAY_HEIGHT = 0.82;

export function creatureMeshScale(nativeHeight: number, popScale = 1): number {
  const height =
    Number.isFinite(nativeHeight) && nativeHeight > 1e-3
      ? nativeHeight
      : CREATURE_DISPLAY_HEIGHT;
  const scale = (CREATURE_DISPLAY_HEIGHT / height) * popScale;
  return Math.min(4, Math.max(0.0002, scale));
}
