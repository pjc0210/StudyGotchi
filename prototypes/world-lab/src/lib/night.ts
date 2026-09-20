import { useEffect, useState } from 'react'
import type { BiomeId } from './world'

/** `palette.night` per shipped family, from assets/biomes/catalog.json */
export interface NightPalette {
  sky: string
  fog: string
  groundLightnessOffset: number
  lamp: string
  window: string
}

export const NIGHT: Record<BiomeId, NightPalette> = {
  forest: { sky: '#1d2a3a', fog: '#2a3f48', groundLightnessOffset: -0.22, lamp: '#ffe9a8', window: '#ffe9a8' },
  city: { sky: '#1a1a30', fog: '#2f2a44', groundLightnessOffset: -0.22, lamp: '#ffd27a', window: '#ffe9a8' },
  ice: { sky: '#0f1a33', fog: '#22304a', groundLightnessOffset: -0.12, lamp: '#ffe9a8', window: '#ffe9a8' },
  sand: { sky: '#1a1630', fog: '#3a2a3a', groundLightnessOffset: -0.2, lamp: '#ffe9a8', window: '#ffe9a8' },
  meadow: { sky: '#1c2438', fog: '#2c3a48', groundLightnessOffset: -0.22, lamp: '#ffe9a8', window: '#ffe9a8' },
  coast: { sky: '#0e1a2e', fog: '#1f3448', groundLightnessOffset: -0.22, lamp: '#ffe9a8', window: '#ffe9a8' },
  volcanic: { sky: '#1a0f14', fog: '#2e1a1e', groundLightnessOffset: -0.22, lamp: '#ffe9a8', window: '#ffe9a8' },
}

/** the planet-wide night sky when no course is focused */
export const NIGHT_SKY_DEFAULT = '#161c30'

/** `prefers-color-scheme: dark` = night unless the manual toggle says otherwise (`?night=1|0`) */
export function useSystemNight(): boolean {
  const [dark, setDark] = useState(() => typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches)
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!mq) return
    const on = (e: MediaQueryListEvent) => setDark(e.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return dark
}
