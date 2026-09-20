/**
 * Runtime layout catalogue: Ice / Chilly Town built in, every `*.layout.json` served from
 * `public/layouts` (a symlink to `docs/design/world/layouts`), plus the lab-local drafts bundled
 * under `layout/builtin/`. A static server has no directory listing, so the docs files are
 * fetched by id from `KNOWN_LAYOUT_IDS` (extend with `?layouts=a,b` in the URL).
 */
import { ICE_TOWN_LAYOUT, type BiomeLayout } from './biome-layout'
import { type AdapterReport, type LayoutFile, fromLayoutJson } from './from-layout-json'
import candyWorld from './builtin/candy-world.layout.json'

export const KNOWN_LAYOUT_IDS = ['academy-town', 'heavy-industry', 'future-utopia', 'candy-world']

export interface LoadedLayout {
  layout: BiomeLayout
  file: LayoutFile | null
  source: 'builtin' | 'docs' | 'lab-draft'
  report: AdapterReport | null
}

export const BUILTIN_DRAFTS: Record<string, LayoutFile> = {
  'candy-world': candyWorld as unknown as LayoutFile,
}

export function iceEntry(): LoadedLayout {
  return { layout: ICE_TOWN_LAYOUT, file: null, source: 'builtin', report: null }
}

export function adapt(file: LayoutFile, source: LoadedLayout['source']): LoadedLayout {
  const report: AdapterReport = { creatureScale: { given: null, used: 1 }, unrendered: [] }
  return { layout: fromLayoutJson(file, report), file, source, report }
}

async function fetchLayout(id: string): Promise<LayoutFile | null> {
  try {
    const res = await fetch(`/layouts/${id}.layout.json`, { cache: 'no-cache' })
    if (!res.ok) return null
    const type = res.headers.get('content-type') ?? ''
    if (!type.includes('json')) return null
    return (await res.json()) as LayoutFile
  } catch {
    return null
  }
}

/** Ice first, then every layout that could be fetched (docs win over lab drafts of the same id). */
export async function loadLayouts(extraIds: string[] = []): Promise<LoadedLayout[]> {
  const ids = Array.from(new Set([...KNOWN_LAYOUT_IDS, ...extraIds]))
  const fetched = await Promise.all(ids.map(async (id) => [id, await fetchLayout(id)] as const))
  const out: LoadedLayout[] = [iceEntry()]
  for (const [id, file] of fetched) {
    if (file) out.push(adapt(file, 'docs'))
    else if (BUILTIN_DRAFTS[id]) out.push(adapt(BUILTIN_DRAFTS[id], 'lab-draft'))
  }
  return out
}
