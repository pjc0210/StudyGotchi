import { GAME_MODELS } from '../data/game-models'

export function SketchfabCycle({ index }: { index: number }) {
  const item = GAME_MODELS[index]
  if (!item) return null
  return (
    <iframe
      title={item.name}
      src={item.embed}
      allow="autoplay; fullscreen; xr-spatial-tracking"
      allowFullScreen
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0, background: '#111' }}
    />
  )
}

export const GAME_MODEL_COUNT = GAME_MODELS.length
