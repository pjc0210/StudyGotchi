import { it } from 'vitest'
import { ICE_TOWN_LAYOUT as L, districtField } from './biome-layout'
import { distToPolyline, districtSlots, forestFixtures, pointAlong, polylineLength, sampleTerrain } from './terrain'

it('probe', () => {
  const forest = L.districts.find((d) => d.id === 'forest')!
  if (forest.shape.kind !== 'strip') return
  const line = forest.shape.centreline
  const total = polylineLength(line)
  const fixtures = forestFixtures(L)
  const lines: string[] = []
  const spacing = 6.6
  const count = Math.floor((total - 8) / spacing)
  lines.push(`total=${total.toFixed(1)} count=${count} fixtures=${fixtures.map((f) => `${f.kind}@${f.position[0].toFixed(0)},${f.position[2].toFixed(0)}`).join(' ')}`)
  for (let i = 0; i <= count; i++) {
    const s = 4 + i * spacing
    const p = pointAlong(line, s)
    for (const side of [1, -1]) {
      const q = pointAlong(line, Math.min(total - 4, s + (side === -1 ? spacing / 2 : 0)))
      const x = q.x + -p.dz * 24 * 0.225 * side
      const z = q.z + p.dx * 24 * 0.225 * side
      const smp = sampleTerrain(L, x, z)
      const river = distToPolyline(L.river, x, z).dist
      const fx = Math.min(...fixtures.map((f) => Math.hypot(f.position[0] - x, f.position[2] - z)))
      lines.push(`i=${i} side=${side} (${x.toFixed(1)},${z.toFixed(1)}) mat=${smp.material} river=${river.toFixed(1)} fix=${fx.toFixed(1)} field=${districtField(forest, x, z).toFixed(1)}`)
    }
  }
  for (let i = 0; i <= count; i++) {
    const s = 4 + i * spacing
    const p = pointAlong(line, s)
    const q = pointAlong(line, Math.min(total - 4, s + spacing * 0.25))
    const x = q.x + -p.dz * 24 * 0.4
    const z = q.z + p.dx * 24 * 0.4
    const smp = sampleTerrain(L, x, z)
    const river = distToPolyline(L.river, x, z).dist
    const fx = Math.min(...fixtures.map((f) => Math.hypot(f.position[0] - x, f.position[2] - z)))
    lines.push(`outer i=${i} (${x.toFixed(1)},${z.toFixed(1)}) mat=${smp.material} river=${river.toFixed(1)} fix=${fx.toFixed(1)} field=${districtField(forest, x, z).toFixed(1)}`)
  }
  const slots = districtSlots(L, forest)
  lines.push(`slots=${slots.length} ${slots.map((s) => `(${s.position[0].toFixed(0)},${s.position[2].toFixed(0)})`).join(' ')}`)
  console.log(lines.join('\n'))
})
