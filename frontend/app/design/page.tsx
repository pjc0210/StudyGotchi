import { DesignShell } from './DesignShell'
import { isChromeScreen, type ChromeScreen } from './chrome-spec'

const THEMES = ['graphite', 'biome', 'night'] as const
const TYPE_TREATMENTS = ['rounded', 'humanist', 'editorial'] as const
const COPY_TREATMENTS = ['direct', 'world', 'diagnostic'] as const

export type DesignTheme = (typeof THEMES)[number]
export type TypeTreatment = (typeof TYPE_TREATMENTS)[number]
export type CopyTreatment = (typeof COPY_TREATMENTS)[number]

function pick<T extends string>(value: unknown, values: readonly T[], fallback: T): T {
  return typeof value === 'string' && (values as readonly string[]).includes(value)
    ? (value as T)
    : fallback
}

/**
 * Offside preview of Direction A, "Paper & Pixel", on the real site.
 * /design?theme=biome&type=humanist&copy=direct
 */
export default async function DesignPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const screen: ChromeScreen = isChromeScreen(params.screen) ? params.screen : 'landing'
  const theme = pick(params.theme, THEMES, 'biome')
  const type = pick(params.type, TYPE_TREATMENTS, 'humanist')
  const copy = pick(params.copy, COPY_TREATMENTS, 'direct')

  return <DesignShell key={`${screen}-${theme}-${type}-${copy}`} screen={screen} theme={theme} type={type} copy={copy} />
}
