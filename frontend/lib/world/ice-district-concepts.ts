/** 8.223 general clusters living on Chilly Town districts. */

export const ICE_DISTRICT_ORDER = [
  "harbour",
  "town",
  "lake",
  "forest",
  "glacier",
  "station",
] as const;

export type IceDistrictId = (typeof ICE_DISTRICT_ORDER)[number];

export type IceDistrictConceptMap = Record<IceDistrictId, readonly string[]>;

/** Fallback when the live world has not arrived: the 8.223 graph's general clusters. */
export const ICE_DISTRICT_CONCEPTS: IceDistrictConceptMap = {
  harbour: ["Canonical Momentum", "Lorentz Force Law"],
  town: ["Lagrangian Formalism", "Lagrange Multipliers"],
  lake: ["Euler-Lagrange", "Energy Conservation"],
  forest: ["Constrained Rolling", "Lagrangian for Rolling Cylinder"],
  glacier: ["Noether's Theorem", "Angular Momentum Conservation"],
  station: ["Poisson Brackets", "Central Force Problem"],
};

const PREFERRED_DISTRICT: Record<string, IceDistrictId> = {
  "Canonical Momentum": "harbour",
  "Lorentz Force Law": "harbour",
  "Lagrangian Formalism": "town",
  "Lagrange Multipliers": "town",
  "Euler-Lagrange": "lake",
  "Energy Conservation": "lake",
  "Constrained Rolling": "forest",
  "Lagrangian for Rolling Cylinder": "forest",
  "Noether's Theorem": "glacier",
  "Angular Momentum Conservation": "glacier",
  "Poisson Brackets": "station",
  "Central Force Problem": "station",
  "Coupled Pendulums": "station",
};

const MAX_PER_DISTRICT = 3;

/** Collapse long 8.223 cluster titles to the general concept on the hover card. */
export function generalConceptLabel(cluster: string): string {
  const text = cluster.trim();
  if (/euler-lagrange/i.test(text)) return "Euler-Lagrange";
  if (/lagrangian formalism/i.test(text)) return "Lagrangian Formalism";
  if (/canonical momentum/i.test(text)) return "Canonical Momentum";
  if (/noether/i.test(text)) return "Noether's Theorem";
  if (/lagrange multiplier/i.test(text)) return "Lagrange Multipliers";
  if (/lorentz/i.test(text)) return "Lorentz Force Law";
  if (/energy conservation/i.test(text)) return "Energy Conservation";
  if (/rolling cylinder/i.test(text)) return "Lagrangian for Rolling Cylinder";
  if (/constrained rolling/i.test(text)) return "Constrained Rolling";
  if (/angular momentum/i.test(text)) return "Angular Momentum Conservation";
  if (/poisson/i.test(text)) return "Poisson Brackets";
  if (/central force/i.test(text)) return "Central Force Problem";
  if (/coupled pendulum/i.test(text)) return "Coupled Pendulums";
  return text.length > 42 ? text.replace(/\s+\S+$/, "…") : text;
}

function emptyMap(): Record<IceDistrictId, string[]> {
  return {
    harbour: [],
    town: [],
    lake: [],
    forest: [],
    glacier: [],
    station: [],
  };
}

export function isIceDistrictId(id: string): id is IceDistrictId {
  return (ICE_DISTRICT_ORDER as readonly string[]).includes(id);
}

export function conceptsForIceDistrict(
  districtId: string,
  map: IceDistrictConceptMap = ICE_DISTRICT_CONCEPTS,
): readonly string[] {
  if (!isIceDistrictId(districtId)) return [];
  return map[districtId];
}

export function conceptIdForLabel(
  regions: readonly { concept_id: string; name: string; cluster?: string | null }[] | null | undefined,
  label: string,
): string | null {
  const needle = generalConceptLabel(label).toLowerCase();
  if (!regions?.length || !needle) return null;
  const byName = regions.find((region) => region.name.toLowerCase() === needle);
  if (byName) return byName.concept_id;
  const byCluster = regions.find((region) => generalConceptLabel(region.cluster ?? "").toLowerCase() === needle);
  return byCluster?.concept_id ?? null;
}

export function mapConceptsToDistricts(labels: readonly string[]): IceDistrictConceptMap {
  const out = emptyMap();
  const leftover: string[] = [];
  const seen = new Set<string>();
  for (const raw of labels) {
    const label = generalConceptLabel(raw);
    if (!label || seen.has(label)) continue;
    seen.add(label);
    const dest = PREFERRED_DISTRICT[label];
    if (dest && out[dest].length < MAX_PER_DISTRICT) out[dest].push(label);
    else leftover.push(label);
  }
  for (const label of leftover) {
    const dest = ICE_DISTRICT_ORDER.reduce((best, id) => (out[id].length < out[best].length ? id : best));
    if (out[dest].length < MAX_PER_DISTRICT) out[dest].push(label);
  }
  for (const id of ICE_DISTRICT_ORDER) {
    if (out[id].length === 0) out[id].push(...ICE_DISTRICT_CONCEPTS[id]);
  }
  return out;
}

export function conceptsFromWorldRegions(
  regions: readonly { cluster?: string | null }[] | null | undefined,
): IceDistrictConceptMap {
  if (!regions?.length) return ICE_DISTRICT_CONCEPTS;
  const counts = new Map<string, number>();
  for (const region of regions) {
    const key = region.cluster?.trim();
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const shared = [...counts.entries()]
    .filter(([, count]) => count >= 2)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "en"))
    .map(([name]) => name);
  if (shared.length < 4) return ICE_DISTRICT_CONCEPTS;
  return mapConceptsToDistricts(shared);
}
