import { readFileSync, readdirSync } from 'fs'
import { resolve } from 'path'
import { describe, expect, it } from 'vitest'
import { ICE_TOWN_LAYOUT, districtChord, districtGap, creatureViewportFraction, maxBuildings, populationFor } from './biome-layout'
import { type LayoutFile, fromLayoutJson, toLayoutJson } from './from-layout-json'
import { BUILTIN_DRAFTS } from './load-layouts'
import { districtSlots, sampleTerrain } from './terrain'
import { worldLandField } from '../world/world-terrain'

const LAYOUT_DIR = resolve(process.cwd(), '../../docs/design/world/layouts')

function docsLayouts(): Array<[string, LayoutFile]> {
  let files: string[] = []
  try {
    files = readdirSync(LAYOUT_DIR).filter((f: string) => f.endsWith('.layout.json'))
  } catch {
    files = []
  }
  return files.map((f) => [f, JSON.parse(readFileSync(resolve(LAYOUT_DIR, f), 'utf8')) as LayoutFile])
}

const ALL: Array<[string, LayoutFile]> = [...docsLayouts(), ...Object.entries(BUILTIN_DRAFTS).map(([id, f]) => [`lab:${id}`, f] as [string, LayoutFile])]
const BANDS = [0, 0.25, 0.5, 0.75, 1]

describe('adapter round-trip for Ice / Chilly Town', () => {
  it('exports to the layout-file shape and reads back the same layout', () => {
    const file = toLayoutJson(ICE_TOWN_LAYOUT)
    expect(file.biome).toBe('ice-town')
    expect(file.districts).toHaveLength(6)
    const back = fromLayoutJson(file)
    expect(back.world).toBeUndefined()
    expect(back.districts).toEqual(ICE_TOWN_LAYOUT.districts)
    expect(back.lake).toEqual(ICE_TOWN_LAYOUT.lake)
    expect(back.river).toEqual(ICE_TOWN_LAYOUT.river)
    expect(back.creatureScale).toBe(ICE_TOWN_LAYOUT.creatureScale)
    expect(toLayoutJson(back)).toEqual(file)
  })
})

describe('layout files', () => {
  it('finds the layout files', () => {
    expect(ALL.length).toBeGreaterThanOrEqual(1)
  })

  for (const [name, file] of ALL) {
    describe(name, () => {
      const layout = fromLayoutJson(file)
      const world = layout.world!

      it('loads into a generic world with ≥ 4 districts, ≥ 20 m apart, on land', () => {
        expect(world).toBeDefined()
        expect(layout.districts.length).toBeGreaterThanOrEqual(4)
        for (let i = 0; i < layout.districts.length; i++) {
          for (let j = i + 1; j < layout.districts.length; j++) {
            expect(districtGap(layout.districts[i], layout.districts[j]), `${layout.districts[i].id}–${layout.districts[j].id}`).toBeGreaterThanOrEqual(20)
          }
        }
        // Slot filler (ship state): every slot it places is valid; it fills strips and open polygons
        // but under-fills small islands and districts with a large anchor clearance (see report).
        let placed = 0
        let wanted = 0
        for (const d of layout.districts) {
          const slots = districtSlots(layout, d)
          placed += slots.length
          wanted += maxBuildings(d)
          for (const s of slots) {
            expect(worldLandField(world, s.position[0], s.position[2]), `${d.id} slot on land`).toBeGreaterThan(0)
            expect(sampleTerrain(layout, s.position[0], s.position[2]).material).not.toBe('sea')
          }
        }
        expect(placed / wanted, 'overall slot fill').toBeGreaterThanOrEqual(0.3)
      })

      it('grows the skyline and the population monotonically', () => {
        const g = world.skyline.growth
        for (let i = 1; i < 5; i++) {
          expect(g[i].count).toBeGreaterThanOrEqual(g[i - 1].count)
          expect(g[i].height).toBeGreaterThanOrEqual(g[i - 1].height)
        }
        expect(g[4].height).toBeGreaterThan(g[0].height)
        for (const d of layout.districts) {
          const counts = BANDS.map((p) => populationFor(d, p).buildings)
          for (let i = 1; i < counts.length; i++) expect(counts[i]).toBeGreaterThanOrEqual(counts[i - 1])
          expect(counts[0]).toBe(0)
          expect(counts[4]).toBeGreaterThan(0)
        }
      })

      it('meets the creature rule (≥ 6 % of the viewport) at every district station', () => {
        for (const d of layout.districts) {
          const chord = districtChord(d, d.stationAzimuth ?? 30)
          const frac = creatureViewportFraction(layout.creatureHeight * layout.creatureScale, chord, d.stationFit ?? 0.75, 16 / 9, d.stationPitch ?? 30)
          expect(frac, d.id).toBeGreaterThanOrEqual(0.06 - 1e-9)
        }
      })
    })
  }
})
