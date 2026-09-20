import { CREATURES, CREATURE_BY_ID, CREATURE_FAMILIES, type Archetype, type CreatureBiome, type CreatureMeta } from './creatures'
import { GUEST_BY_ID, guestsFor, isGuestId } from './guest-pack'
import { TRIPO_BY_ID, TRIPO_HERO, isTripoId, tripoCreatureUrl } from './tripo-assets'
import type { BiomeId } from '../lib/world'
import { hashString, makeRng } from '../lib/seed'

/** The world's `coast` biome has no creature family of its own; ocean creatures live there. Unknown families fall back to meadow. */
export function creatureBiome(biome: BiomeId | string): CreatureBiome {
  if (biome === 'coast') return 'ocean'
  return (CREATURE_FAMILIES as string[]).includes(biome) ? (biome as CreatureBiome) : 'meadow'
}

/**
 * Roster for a family straight from the manifest, with the same archetype-alternation rule as the
 * hand-picked lists: walk blob / biped / bird / sprite / bean round-robin, flats go to the water roster.
 */
const ALTERNATION: Archetype[] = ['blob', 'biped', 'bird', 'sprite', 'bean']
function autoRoster(family: CreatureBiome): { land: string[]; water: string[] } {
  const byArch = new Map<Archetype, string[]>()
  for (const c of CREATURES) {
    if (c.biome !== family) continue
    let l = byArch.get(c.archetype)
    if (!l) byArch.set(c.archetype, (l = []))
    l.push(c.id)
  }
  const land: string[] = []
  let added = true
  for (let round = 0; added; round++) {
    added = false
    for (const a of ALTERNATION) {
      const id = byArch.get(a)?.[round]
      if (id) {
        land.push(id)
        added = true
      }
    }
  }
  return { land, water: byArch.get('flat') ?? [] }
}
const AUTO = Object.fromEntries(CREATURE_FAMILIES.map((f) => [f, autoRoster(f)])) as Record<CreatureBiome, { land: string[]; water: string[] }>

/**
 * Ordered per-biome roster, hand-picked from the animated manifest for variety: archetypes
 * alternate (blob / bean / bird / biped / sprite), every land biome carries at least one sprite,
 * and `flat` (seal / fish bodies) only appear in the water roster below.
 */
const HAND_PICKED: Partial<Record<CreatureBiome, string[]>> = {
  forest: ['blob-forest-1', 'biped-forest-2', 'bird-forest-1', 'sprite-forest-1', 'bean-forest-1', 'blob-forest-2', 'biped-forest-8132', 'bird-forest-2', 'sprite-forest-2', 'bean-forest-2', 'biped-forest-1'],
  city: ['bean-city-1', 'bird-city-1', 'blob-city-2', 'sprite-city-2', 'biped-city-1', 'blob-city-1', 'bird-city-2', 'sprite-city-1', 'bean-city-2', 'biped-city-2'],
  ice: ['blob-ice-2', 'biped-ice-1', 'bird-ice-2', 'sprite-ice-1', 'bean-ice-1', 'blob-ice-1706', 'biped-ice-5796', 'bird-ice-1', 'sprite-ice-2', 'blob-ice-8333', 'bean-ice-2', 'blob-ice-1', 'biped-ice-2'],
  sand: ['bird-sand-2', 'blob-sand-2', 'sprite-sand-4031', 'biped-sand-1', 'bean-sand-1', 'blob-sand-1', 'sprite-sand-1', 'bird-sand-1', 'biped-sand-2', 'bean-sand-2', 'sprite-sand-2'],
  meadow: ['bean-meadow-9218', 'bird-meadow-1', 'blob-meadow-1', 'sprite-meadow-1', 'biped-meadow-1', 'blob-meadow-1422', 'bean-meadow-1', 'bird-meadow-2', 'sprite-meadow-2', 'biped-meadow-2', 'blob-meadow-2', 'bean-meadow-2'],
  ocean: ['bird-ocean-1', 'blob-ocean-1', 'sprite-ocean-2', 'bean-ocean-2', 'biped-ocean-1', 'sprite-ocean-1', 'bird-ocean-2', 'blob-ocean-2', 'bean-ocean-1', 'sprite-ocean-1781', 'biped-ocean-2'],
  volcanic: ['biped-volcanic-2', 'bird-volcanic-1', 'blob-volcanic-2', 'sprite-volcanic-8142', 'bean-volcanic-2', 'blob-volcanic-1', 'bird-volcanic-6266', 'biped-volcanic-9480', 'sprite-volcanic-2', 'bean-volcanic-1', 'bird-volcanic-2', 'sprite-volcanic-1'],
}

function unique(ids: string[]) {
  const seen = new Set<string>()
  const out: string[] = []
  for (const id of ids) {
    if (seen.has(id)) continue
    seen.add(id)
    out.push(id)
  }
  return out
}

function interleave(guests: string[], locals: string[]) {
  const out: string[] = []
  const n = Math.max(guests.length, locals.length)
  for (let i = 0; i < n; i++) {
    if (i < guests.length) out.push(guests[i])
    if (i < locals.length) out.push(locals[i])
  }
  return unique(out)
}

/** every family: guests (Tripo + CC0) interleaved with the in-house animated roster */
export const ROSTER: Record<CreatureBiome, string[]> = Object.fromEntries(
  CREATURE_FAMILIES.map((f) => [f, interleave(guestsFor(f), HAND_PICKED[f] ?? AUTO[f].land)]),
) as Record<CreatureBiome, string[]>

export function rosterSize(biome: BiomeId | string) {
  return ROSTER[creatureBiome(biome)]?.length ?? 0
}

/** grown (progress × psets × crowd) or enough bodies to show the biome's pack, capped for fps */
export function spawnCount(biome: BiomeId | string, grown: number, cap = 12) {
  return Math.max(grown, Math.min(rosterSize(biome), cap))
}

/** `flat` archetypes for topics that are water (ocean / coast bays / frozen lakes); only ocean and ice on land biomes */
const HAND_PICKED_WATER: Partial<Record<CreatureBiome, string[]>> = {
  ocean: ['flat-ocean-1', 'flat-ocean-2'],
  ice: ['flat-ice-1', 'flat-ice-2', 'flat-ice-3544'],
  forest: [],
  city: [],
  sand: [],
  meadow: [],
  volcanic: [],
}
export const WATER_ROSTER: Record<CreatureBiome, string[]> = Object.fromEntries(
  CREATURE_FAMILIES.map((f) => [f, HAND_PICKED_WATER[f] ?? AUTO[f].water]),
) as Record<CreatureBiome, string[]>

/** warm the in-house bodies; guest GLBs load on first spawn so the first paint stays light */
export const ROSTER_IDS: string[] = Array.from(
  new Set([...Object.values(HAND_PICKED).flat(), ...Object.values(HAND_PICKED_WATER).flat()]),
)

export function creatureUrl(id: string) {
  const guest = GUEST_BY_ID[id]
  if (guest) return guest.url
  if (isTripoId(id)) return tripoCreatureUrl(id)
  return `/assets/creatures/animated/${id}.glb`
}

export function creatureMeta(id: string): CreatureMeta | undefined {
  if (isGuestId(id)) return GUEST_BY_ID[id]
  if (isTripoId(id)) return TRIPO_BY_ID[id] as CreatureMeta
  return CREATURE_BY_ID[id]
}

/**
 * Deterministic pick: the roster order is walked from a seed-dependent offset so two worlds with
 * different seeds do not all start with the same creature, while `index` (pset number) still
 * gives every creature in a biome a distinct look until the roster wraps.
 * `water` swaps in a flat creature for water topics, every other creature, when the biome has any.
 */
export function pickCreature(seed: string, biome: BiomeId | string, index: number, water = false): string {
  const fam = creatureBiome(biome)
  if (water) {
    const flats = WATER_ROSTER[fam]
    if (flats.length && index % 2 === 1) return flats[Math.floor(index / 2) % flats.length]
  }
  const heroes = ROSTER[fam].filter((id) => id === TRIPO_HERO || id === 'gobkit-rat')
  if (index < heroes.length) return heroes[index]
  const list = (ROSTER[fam].length ? ROSTER[fam] : CREATURES.filter((c) => c.biome === fam).map((c) => c.id)).filter((id) => id !== TRIPO_HERO && id !== 'gobkit-rat')
  const rng = makeRng(hashString(seed + ':roster:' + fam))
  const offset = Math.floor(rng() * list.length)
  return list[(offset + index - heroes.length) % list.length]
}
