import type { Archetype, CreatureBiome, CreatureMeta, Personality } from './creatures'
import { TRIPO_CREATURES, tripoCreatureUrl, type TripoId } from './tripo-assets'

/**
 * Extra bodies that walk the planet besides the in-house animated roster.
 *
 *  - tripo: cleaned Pokémon-inspired pack + the rat (hackathon demo)
 *  - kenney / gobkit / polypizza: CC0 silly animals (Gobkit minions stand in for
 *    the Mario-like goofy ones — we do not ship Nintendo meshes)
 */
export type GuestPack = 'tripo' | 'kenney' | 'gobkit' | 'polypizza'

export interface GuestCreature extends CreatureMeta {
  pack: GuestPack
  url: string
  /** extra scale on top of the scene creature scale */
  scale: number
}

const LAND: CreatureBiome[] = ['forest', 'city', 'ice', 'sand', 'meadow', 'ocean', 'volcanic']

const TRIPO_BIOME: Record<string, CreatureBiome> = {
  'tripo-mouse': 'city',
  'tripo-creature-01': 'forest',
  'tripo-creature-02': 'forest',
  'tripo-creature-03': 'forest',
  'tripo-creature-04': 'forest',
  'tripo-creature-05': 'forest',
  'tripo-creature-06': 'forest',
  'tripo-creature-07': 'forest',
  'tripo-creature-08': 'city',
  'tripo-creature-09': 'city',
  'tripo-creature-10': 'city',
  'tripo-creature-11': 'city',
  'tripo-creature-12': 'city',
  'tripo-creature-13': 'city',
  'tripo-creature-14': 'city',
  'tripo-creature-15': 'ice',
  'tripo-creature-16': 'ice',
  'tripo-creature-17': 'ice',
  'tripo-creature-18': 'ice',
  'tripo-creature-19': 'ice',
  'tripo-creature-20': 'ice',
  'tripo-creature-21': 'ice',
  'tripo-creature-22': 'sand',
  'tripo-creature-23': 'sand',
  'tripo-creature-24': 'sand',
  'tripo-creature-25': 'sand',
  'tripo-creature-26': 'sand',
  'tripo-creature-27': 'sand',
  'tripo-creature-28': 'sand',
  'tripo-creature-29': 'meadow',
  'tripo-creature-30': 'meadow',
  'tripo-creature-31': 'meadow',
  'tripo-creature-32': 'meadow',
  'tripo-creature-33': 'meadow',
  'tripo-creature-34': 'meadow',
  'tripo-creature-35': 'meadow',
  'tripo-creature-36': 'ocean',
  'tripo-creature-37': 'ocean',
  'tripo-creature-38': 'ocean',
  'tripo-creature-39': 'ocean',
  'tripo-creature-40': 'ocean',
  'tripo-creature-41': 'ocean',
  'tripo-creature-42': 'volcanic',
  'tripo-creature-43': 'volcanic',
  'tripo-creature-44': 'volcanic',
  'tripo-creature-45': 'volcanic',
  'tripo-creature-46': 'volcanic',
  'tripo-creature-47': 'volcanic',
}

function guest(
  pack: GuestPack,
  id: string,
  url: string,
  biome: CreatureBiome,
  opts: { archetype?: Archetype; personality?: Personality; height?: number; scale?: number } = {},
): GuestCreature {
  return {
    id,
    pack,
    url,
    archetype: opts.archetype ?? 'bean',
    biome,
    personality: opts.personality ?? 'curious',
    height: opts.height ?? 0.8,
    scale: opts.scale ?? 1,
  }
}

const TRIPO_GUESTS: GuestCreature[] = TRIPO_CREATURES.map((c) =>
  guest('tripo', c.id, tripoCreatureUrl(c.id as TripoId), TRIPO_BIOME[c.id] ?? 'meadow', {
    archetype: 'bean',
    personality: c.id === 'tripo-mouse' ? 'bold' : 'curious',
    scale: 0.48,
  }),
)

function kenney(name: string, biome: CreatureBiome, personality: Personality = 'curious'): GuestCreature {
  return guest('kenney', `kenney-${name}`, `/assets/creatures/cc0/kenney-cube-pets/animal-${name}.glb`, biome, {
    archetype: 'blob',
    personality,
    scale: 0.5,
  })
}

function gobkit(file: string, biome: CreatureBiome, personality: Personality = 'curious', archetype: Archetype = 'biped'): GuestCreature {
  const slug = file.replace(/\.glb$/i, '').toLowerCase()
  return guest('gobkit', `gobkit-${slug}`, `/assets/creatures/cc0/gobkit/${file}`, biome, {
    archetype,
    personality,
    scale: 0.38,
  })
}

function pizza(file: string, biome: CreatureBiome, personality: Personality = 'curious'): GuestCreature {
  const slug = file.replace(/\.glb$/i, '').toLowerCase()
  return guest('polypizza', `pizza-${slug}`, `/assets/creatures/cc0/polypizza/${file}`, biome, {
    archetype: 'blob',
    personality,
    scale: 0.45,
  })
}

const CC0_GUESTS: GuestCreature[] = [
  kenney('deer', 'forest', 'shy'),
  kenney('fox', 'forest', 'curious'),
  kenney('bunny', 'forest', 'shy'),
  kenney('monkey', 'forest', 'bold'),
  kenney('koala', 'forest', 'sleepy'),
  kenney('parrot', 'forest', 'bold'),
  kenney('beaver', 'forest', 'grumpy'),
  kenney('cat', 'city', 'curious'),
  kenney('dog', 'city', 'bold'),
  kenney('hog', 'city', 'grumpy'),
  kenney('panda', 'city', 'sleepy'),
  kenney('polar', 'ice', 'shy'),
  kenney('penguin', 'ice', 'curious'),
  kenney('tiger', 'sand', 'bold'),
  kenney('lion', 'sand', 'bold'),
  kenney('giraffe', 'sand', 'shy'),
  kenney('elephant', 'sand', 'sleepy'),
  kenney('crab', 'sand', 'grumpy'),
  kenney('chick', 'meadow', 'curious'),
  kenney('cow', 'meadow', 'sleepy'),
  kenney('pig', 'meadow', 'bold'),
  kenney('bee', 'meadow', 'curious'),
  kenney('caterpillar', 'meadow', 'shy'),
  kenney('fish', 'ocean', 'curious'),
  kenney('crab', 'ocean', 'grumpy'),
  kenney('penguin', 'ocean', 'shy'),
  kenney('tiger', 'volcanic', 'bold'),
  kenney('lion', 'volcanic', 'grumpy'),

  gobkit('Owl.glb', 'forest', 'sleepy', 'bird'),
  gobkit('Marmot.glb', 'forest', 'grumpy'),
  gobkit('Goat.glb', 'forest', 'bold'),
  gobkit('Duck.glb', 'forest', 'curious', 'bird'),
  gobkit('Bee.glb', 'forest', 'curious', 'sprite'),
  gobkit('Rat.glb', 'city', 'bold'),
  gobkit('Corgi.glb', 'city', 'curious'),
  gobkit('minion-a01.glb', 'city', 'bold', 'blob'),
  gobkit('minion-a02.glb', 'city', 'curious', 'blob'),
  gobkit('Red.glb', 'city', 'grumpy', 'sprite'),
  gobkit('Blue.glb', 'city', 'shy', 'sprite'),
  gobkit('Seal.glb', 'ice', 'sleepy', 'flat'),
  gobkit('Owl.glb', 'ice', 'shy', 'bird'),
  gobkit('Hippo.glb', 'sand', 'sleepy'),
  gobkit('Goat.glb', 'sand', 'grumpy'),
  gobkit('Platypus.glb', 'sand', 'curious'),
  gobkit('Duck.glb', 'meadow', 'curious', 'bird'),
  gobkit('Corgi.glb', 'meadow', 'bold'),
  gobkit('Bee.glb', 'meadow', 'curious', 'sprite'),
  gobkit('Platypus.glb', 'meadow', 'shy'),
  gobkit('Seal.glb', 'ocean', 'sleepy', 'flat'),
  gobkit('Jellyfish.glb', 'ocean', 'shy', 'sprite'),
  gobkit('Fugu.glb', 'ocean', 'grumpy', 'blob'),
  gobkit('Bat.glb', 'volcanic', 'grumpy', 'bird'),
  gobkit('Red.glb', 'volcanic', 'bold', 'sprite'),
  gobkit('minion-c01.glb', 'volcanic', 'bold', 'blob'),
  gobkit('minion-c02.glb', 'volcanic', 'curious', 'blob'),
  gobkit('minion-d01.glb', 'volcanic', 'grumpy', 'blob'),

  pizza('Hedgehog.glb', 'forest', 'shy'),
  pizza('Frog.glb', 'forest', 'curious'),
  pizza('Frog.glb', 'meadow', 'curious'),
  pizza('Chick.glb', 'meadow', 'bold'),
  pizza('Bunny.glb', 'meadow', 'shy'),
  pizza('ShibaInu.glb', 'meadow', 'curious'),
  pizza('Chick.glb', 'ice', 'shy'),
  pizza('ShibaInu.glb', 'city', 'bold'),
]

/** Kenney crab/penguin/tiger/lion and gobkit Owl/Rat/etc. can live in two biomes; ids must stay unique. */
function uniqueId(g: GuestCreature, seen: Set<string>): GuestCreature {
  if (!seen.has(g.id)) {
    seen.add(g.id)
    return g
  }
  const id = `${g.id}-${g.biome}`
  seen.add(id)
  return { ...g, id }
}

const seen = new Set<string>()
export const GUESTS: GuestCreature[] = [...TRIPO_GUESTS, ...CC0_GUESTS].map((g) => uniqueId(g, seen))

export const GUEST_BY_ID: Record<string, GuestCreature> = Object.fromEntries(GUESTS.map((g) => [g.id, g]))

export function isGuestId(id: string): boolean {
  return Object.prototype.hasOwnProperty.call(GUEST_BY_ID, id)
}

export const GUESTS_BY_BIOME: Record<CreatureBiome, string[]> = Object.fromEntries(
  LAND.map((fam) => [fam, GUESTS.filter((g) => g.biome === fam).map((g) => g.id)]),
) as Record<CreatureBiome, string[]>

for (const extra of ['cave', 'factory', 'graveyard', 'jungle', 'lab', 'medieval', 'park', 'space', 'wildwest'] as CreatureBiome[]) {
  if (!GUESTS_BY_BIOME[extra]) GUESTS_BY_BIOME[extra] = []
}

/** The rat leads city and meadow so it is the first body you meet there. */
const HEROES: Partial<Record<CreatureBiome, string[]>> = {
  city: ['tripo-mouse', 'gobkit-rat'],
  meadow: ['tripo-mouse'],
}

export function guestsFor(family: CreatureBiome): string[] {
  const heroes = HEROES[family] ?? []
  const rest = (GUESTS_BY_BIOME[family] ?? []).filter((id) => !heroes.includes(id))
  return [...heroes.filter((id) => GUEST_BY_ID[id]), ...rest]
}
