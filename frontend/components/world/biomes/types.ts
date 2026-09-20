import type { GlobeBiome } from "@/components/world/globe/globe-types";

export type LocalBiomeId =
  | "ice-golden"
  | "frontier-town"
  | "coastal-ruins"
  | "jungle-forest-village"
  | "medieval-meadow-kingdom"
  | "nordic-volcanic-highlands"
  | "island";

export function visualForGlobeBiome(biome: GlobeBiome): LocalBiomeId {
  switch (biome) {
    case "ice":
      return "ice-golden";
    case "sand":
      return "frontier-town";
    case "coast":
      return "coastal-ruins";
    case "forest":
      return "jungle-forest-village";
    case "meadow":
      return "medieval-meadow-kingdom";
    case "volcanic":
      return "nordic-volcanic-highlands";
    case "city":
      return "medieval-meadow-kingdom";
    default:
      return "island";
  }
}
