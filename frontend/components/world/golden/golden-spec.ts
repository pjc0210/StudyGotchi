export type GoldenVariant = 'pixel' | 'toy'
export type GoldenView = 'overview' | 'resident'

export const GOLDEN_PALETTE = {
  sky: '#e8e2f2',
  snow: '#edf7f7',
  ice: '#a9cfe8',
  iceDeep: '#6fa4c3',
  stone: '#71697d',
  ink: '#342d45',
  cream: '#fff6df',
  coral: '#e88a8a',
  mint: '#8fc9d8',
  light: '#ffe7a3',
} as const

export const GOLDEN_RESIDENTS = [
  {
    id: 'pip',
    name: 'Pip',
    kind: 'ice-bird',
    position: [-2.2, 0.42, 2.1] as const,
    accent: GOLDEN_PALETTE.coral,
    line: 'Has reorganized the same three notes twice.',
  },
  {
    id: 'mochi',
    name: 'Mochi',
    kind: 'snow-blob',
    position: [1.55, 0.36, 2.45] as const,
    accent: GOLDEN_PALETTE.mint,
    line: 'Understands recursion. Refuses to explain it.',
  },
  {
    id: 'glyph',
    name: 'Glyph',
    kind: 'book-beetle',
    position: [-0.35, 0.34, -1.25] as const,
    accent: GOLDEN_PALETTE.light,
    line: 'Carries the example everyone keeps forgetting.',
  },
] as const

export const CAMERA_POSES = {
  overview: {
    position: [10.5, 8.5, 13.5] as [number, number, number],
    target: [0, 0.45, 0] as [number, number, number],
    fov: 28,
  },
  resident: {
    position: [-6.2, 4, 8.1] as [number, number, number],
    target: [-2.2, 0.72, 2.1] as [number, number, number],
    fov: 28,
  },
} as const

export function rendererProfile(variant: GoldenVariant) {
  return variant === 'pixel'
    ? {
        sceneId: 'ice-observatory-v1',
        antialias: false,
        pixelSize: 4,
        normalEdgeStrength: 0.32,
        depthEdgeStrength: 0.24,
      }
    : {
        sceneId: 'ice-observatory-v1',
        antialias: true,
        pixelSize: 0,
        normalEdgeStrength: 0,
        depthEdgeStrength: 0,
      }
}

export function progressState(progress: number) {
  const value = Math.min(1, Math.max(0, progress))
  if (value < 1 / 3) {
    return {
      stage: 'touched' as const,
      litWindows: 1,
      crystalCount: 1,
      beaconStrength: 0,
    }
  }
  if (value < 2 / 3) {
    return {
      stage: 'demonstrated' as const,
      litWindows: 3,
      crystalCount: 3,
      beaconStrength: 0.65,
    }
  }
  return {
    stage: 'mastered' as const,
    litWindows: 5,
    crystalCount: 5,
    beaconStrength: 1.4,
  }
}
