import { MARKERS, type MarkerId } from './markers'

export const PLANET_RADIUS = 90
export const PLANET_MARKER_SCALE = 0.7
export const PLANET_BELT_LAT = 0.28

export interface PlanetPlacement {
  id: MarkerId
  direction: readonly [number, number, number]
  position: readonly [number, number, number]
}

export function planetPlacements(): readonly PlanetPlacement[] {
  const count = MARKERS.length
  return MARKERS.map((marker, index) => {
    const latitude = index % 2 === 0 ? PLANET_BELT_LAT : -PLANET_BELT_LAT
    const azimuth = (index / count) * Math.PI * 2
    const cosLat = Math.cos(latitude)
    const direction = [
      Math.cos(azimuth) * cosLat,
      Math.sin(latitude),
      Math.sin(azimuth) * cosLat,
    ] as const
    return {
      id: marker.id,
      direction,
      position: [
        direction[0] * PLANET_RADIUS,
        direction[1] * PLANET_RADIUS,
        direction[2] * PLANET_RADIUS,
      ],
    }
  })
}
