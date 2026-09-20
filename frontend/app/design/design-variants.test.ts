import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const route = readFileSync(join(__dirname, 'page.tsx'), 'utf8')
const shell = readFileSync(join(__dirname, 'DesignShell.tsx'), 'utf8')
const css = readFileSync(join(__dirname, 'design.css'), 'utf8')

describe('design comparison gallery', () => {
  it('offers graphite, biome editorial, and night themes as route variants', () => {
    expect(route).toContain("'graphite'")
    expect(route).toContain("'biome'")
    expect(route).toContain("'night'")
    expect(shell).toContain('data-theme')
    expect(css).toContain("[data-theme='graphite']")
    expect(css).toContain("[data-theme='biome']")
    expect(css).toContain("[data-theme='night']")
  })

  it('offers rounded, humanist, and editorial typography treatments', () => {
    expect(route).toContain("'rounded'")
    expect(route).toContain("'humanist'")
    expect(route).toContain("'editorial'")
    expect(shell).toContain('data-type')
    expect(css).toContain("[data-type='rounded']")
    expect(css).toContain("[data-type='humanist']")
    expect(css).toContain("[data-type='editorial']")
  })

  it('offers direct, world, and diagnostic copy treatments', () => {
    expect(route).toContain("'direct'")
    expect(route).toContain("'world'")
    expect(route).toContain("'diagnostic'")
    expect(shell).toContain('copy=')
  })

  it('interlaces biome colors by evidence meaning instead of coloring every card beige', () => {
    expect(css).toContain('--a-touched')
    expect(css).toContain('--a-demonstrated')
    expect(css).toContain('--a-mastered')
    expect(css).toContain("[data-stage='touched']")
    expect(css).toContain("[data-stage='demonstrated']")
    expect(css).toContain("[data-stage='mastered']")
  })
})
