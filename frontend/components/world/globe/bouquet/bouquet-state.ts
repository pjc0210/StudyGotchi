import type { MarkerDefinition, MarkerProp } from "./markers";

export type PropCount = 2 | 3 | 4;
export const CREATURE_HEIGHT = 4.5;

export function visibleProps(marker: MarkerDefinition, count: PropCount): readonly MarkerProp[] {
  return marker.props.slice(0, count).filter((prop): prop is MarkerProp => prop !== undefined);
}

export function propCountFromProgress(progress: number | null): PropCount {
  if (progress === null || progress < 1 / 3) return 2;
  if (progress < 2 / 3) return 3;
  return 4;
}
