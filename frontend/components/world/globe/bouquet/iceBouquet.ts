export const ICE_BOUQUET = {
  name: 'Chilly Village Burst',
  description: 'A dense, playful bouquet of oversized winter-town structures growing from one connected snow terrain.',
  base: {
    radius: 16,
    height: 2.4,
    terrainRadius: 13,
    visibleRim: 3,
  },
  heights: {
    mountain: 32,
    pines: 28,
    lighthouse: 28,
    houses: 24,
  },
  mountain: {
    peaks: 3,
    snowCaps: 3,
    rockFaces: 3,
    capHeightRatio: 0.48,
    spread: 13.2,
  },
  houses: {
    count: 2,
    gablePanels: 2,
    windows: 2,
    chimney: true,
  },
  silhouette: 'A broad snow peak fans left, a red-cap lighthouse punches through the middle, and tall pines and crooked houses burst right.',
} as const
