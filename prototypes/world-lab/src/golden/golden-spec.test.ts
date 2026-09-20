import { describe, expect, it } from 'vitest'
import {
  CAMERA_POSES,
  GOLDEN_RESIDENTS,
  progressState,
  rendererProfile,
} from './golden-spec'

describe('golden visual proof of concept', () => {
  it('keeps the same authored content for both render treatments', () => {
    expect(rendererProfile('pixel').sceneId).toBe('ice-observatory-v1')
    expect(rendererProfile('toy').sceneId).toBe('ice-observatory-v1')
    expect(GOLDEN_RESIDENTS.map((resident) => resident.id)).toEqual([
      'pip',
      'mochi',
      'glyph',
    ])
  })

  it('maps learning progress to three restrained world states', () => {
    expect(progressState(0.2)).toMatchObject({
      stage: 'touched',
      litWindows: 1,
      crystalCount: 1,
      beaconStrength: 0,
    })
    expect(progressState(0.5)).toMatchObject({
      stage: 'demonstrated',
      litWindows: 3,
      crystalCount: 3,
      beaconStrength: 0.65,
    })
    expect(progressState(0.9)).toMatchObject({
      stage: 'mastered',
      litWindows: 5,
      crystalCount: 5,
      beaconStrength: 1.4,
    })
  })

  it('uses a constrained overview and resident camera instead of free framing', () => {
    expect(CAMERA_POSES.overview.fov).toBe(28)
    expect(CAMERA_POSES.overview.position).toEqual([10.5, 8.5, 13.5])
    expect(CAMERA_POSES.resident.target).toEqual([-2.2, 0.72, 2.1])
    expect(CAMERA_POSES.resident.fov).toBe(28)
  })

  it('makes the pixel treatment a presentation change, not a content change', () => {
    expect(rendererProfile('pixel')).toMatchObject({
      antialias: false,
      pixelSize: 4,
      normalEdgeStrength: 0.32,
      depthEdgeStrength: 0.24,
    })
    expect(rendererProfile('toy')).toMatchObject({
      antialias: true,
      pixelSize: 0,
      normalEdgeStrength: 0,
      depthEdgeStrength: 0,
    })
  })
})
