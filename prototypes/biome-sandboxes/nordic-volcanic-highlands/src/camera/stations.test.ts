import { describe, expect, it } from 'vitest'
import {
  CAMERA_LIMITS,
  STATIONS,
  clampCameraOverride,
  defaultOverride,
  poseFor,
} from './stations'

describe('front-facing Nordic camera contract', () => {
  it('clamps every user override to the approved pitch, yaw, and dolly envelope', () => {
    expect(clampCameraOverride({ pitchDeg: 12, azimuthDeg: -80, dolly: 0.2, fov: 26 })).toEqual({
      pitchDeg: 34,
      azimuthDeg: -35,
      dolly: 0.6,
      fov: 26,
    })
    expect(clampCameraOverride({ pitchDeg: 70, azimuthDeg: 90, dolly: 4, fov: 26 })).toEqual({
      pitchDeg: 40,
      azimuthDeg: 35,
      dolly: 1.6,
      fov: 26,
    })
  })

  it('keeps all stations south of their targets and looking north', () => {
    const subject = { center: [0, 3, 0] as [number, number, number], chord: 224 }
    for (const station of Object.values(STATIONS)) {
      const pose = poseFor(station, defaultOverride(station), subject, 16 / 9)
      expect(pose.position[2]).toBeGreaterThan(pose.target[2])
      expect(station.pitchDeg).toBeGreaterThanOrEqual(CAMERA_LIMITS.pitchMin)
      expect(station.pitchDeg).toBeLessThanOrEqual(CAMERA_LIMITS.pitchMax)
      expect(Math.abs(station.azimuthDeg)).toBeLessThanOrEqual(CAMERA_LIMITS.yaw)
    }
  })

  it('keeps both horizon audit wings on the south/front side', () => {
    const subject = { center: [0, 3, 0] as [number, number, number], chord: 224 }
    for (const azimuthDeg of [-35, 0, 35]) {
      const pose = poseFor(
        STATIONS.overview,
        clampCameraOverride({ ...defaultOverride(STATIONS.overview), azimuthDeg, dolly: 1.55 }),
        subject,
        16 / 9,
      )
      expect(pose.position[2]).toBeGreaterThan(0)
    }
  })
})
