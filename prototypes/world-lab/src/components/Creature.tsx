import type { Biome } from '../lib/world'
import { useAssets } from '../lib/assets'
import { pickCreature } from '../data/roster'
import { playSfx } from '../lib/audio'
import { Blob, type BlobMotion } from './Blob'
import { GlbCreature } from './GlbCreature'

interface CreatureProps {
  biome: Biome
  /** pset index within the biome / course; picks the roster entry and the primitive variant */
  index: number
  motion: React.RefObject<BlobMotion>
  onClick?: () => void
  selected?: boolean
  /** the creature lives on a water topic: flats (seals, fish) become eligible */
  water?: boolean
  /** topic index, so a catastrophe on that topic makes the creature `sad` */
  topicIndex?: number
}

/** Chooses the GLB roster creature or the primitive Blob according to the UI toggle. */
export function Creature({ biome, index, motion, onClick, selected, water, topicIndex }: CreatureProps) {
  const { creatures, seed, sadTopics } = useAssets()
  const tap = () => {
    playSfx('creature-tap', 0.85)
    playSfx('creature-greet', 0.7)
    onClick?.()
  }
  if (creatures === 'primitive') return <Blob biome={biome} variant={index} motion={motion} onClick={tap} selected={selected} />
  const id = pickCreature(seed, biome.id, index, water)
  const sad = topicIndex !== undefined && !!sadTopics?.has(topicIndex)
  return <GlbCreature id={id} biome={biome} variant={index} motion={motion} onClick={tap} selected={selected} sad={sad} />
}
