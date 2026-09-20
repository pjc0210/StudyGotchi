/* Art and systems lab. Deep link: ?mode=art&section=sprites|buttons|colour|themes&theme=day|stone|night */

export const SECTIONS = [
  { id: 'sprites', letter: 'A', title: 'Spot art from the world' },
  { id: 'buttons', letter: 'B', title: 'Buttons' },
  { id: 'colour', letter: 'C', title: 'Interlacing colour' },
  { id: 'themes', letter: 'D', title: 'Grey and night' },
] as const
export type SectionId = (typeof SECTIONS)[number]['id']

export const THEMES = ['day', 'stone', 'night'] as const
export type ArtTheme = (typeof THEMES)[number]

/** Sprite cells: `fixed` keeps the world's pixel size 4 at every display size; `scaled` keeps
 *  the 192 px sprite's 48-cell grid and shrinks the cells with the sprite. */
export const PIXEL_MODES = ['fixed', 'scaled'] as const
export type PixelMode = (typeof PIXEL_MODES)[number]

export interface ArtParams {
  section: SectionId
  theme: ArtTheme
  pixel: PixelMode
}

const pick = <T extends string>(list: readonly T[], value: string | null, fallback: T): T =>
  value !== null && (list as readonly string[]).includes(value) ? (value as T) : fallback

export const SECTION_IDS = SECTIONS.map((s) => s.id) as readonly SectionId[]

export function readArtParams(search: string): ArtParams {
  const p = new URLSearchParams(search)
  return {
    section: pick(SECTION_IDS, p.get('section'), 'sprites'),
    theme: pick(THEMES, p.get('theme'), 'day'),
    pixel: pick(PIXEL_MODES, p.get('pixel'), 'fixed'),
  }
}

export function writeArtParams(params: ArtParams, search: string): string {
  const p = new URLSearchParams(search)
  p.set('mode', 'art')
  p.set('section', params.section)
  p.set('theme', params.theme)
  p.set('pixel', params.pixel)
  return `?${p.toString()}`
}

/* ---------- sprites ---------- */

export const SPRITE_IDS = ['pip', 'mochi', 'glyph', 'observatory', 'hut', 'pine', 'crystal', 'lamp'] as const
export type SpriteId = (typeof SPRITE_IDS)[number]

export interface SpriteDef {
  id: SpriteId
  name: string
  kind: string
  /** centre of the object's bounding sphere in its own space */
  centre: [number, number, number]
  /** radius of that sphere; the camera backs off so it fills the frame */
  radius: number
  /** the five on the sheet; the rest are props for the divider and the margins */
  sheet: boolean
}

export const SPRITES: Record<SpriteId, SpriteDef> = {
  pip: { id: 'pip', name: 'Pip', kind: 'ice bird', centre: [0, 0.6, 0.08], radius: 0.64, sheet: true },
  mochi: { id: 'mochi', name: 'Mochi', kind: 'snow blob', centre: [0, 0.66, 0], radius: 0.68, sheet: true },
  glyph: { id: 'glyph', name: 'Glyph', kind: 'book beetle', centre: [0, 0.5, -0.05], radius: 0.58, sheet: true },
  observatory: { id: 'observatory', name: 'Observatory', kind: 'landmark', centre: [0, 1.15, 0], radius: 1.68, sheet: true },
  hut: { id: 'hut', name: 'Hut', kind: 'landmark', centre: [0, 0.66, 0], radius: 0.86, sheet: true },
  pine: { id: 'pine', name: 'Pine', kind: 'prop', centre: [0, 0.9, 0], radius: 0.82, sheet: false },
  crystal: { id: 'crystal', name: 'Crystal', kind: 'prop', centre: [0, 0, 0], radius: 0.36, sheet: false },
  lamp: { id: 'lamp', name: 'Lamp post', kind: 'prop', centre: [0, 0.52, 0], radius: 0.52, sheet: false },
}

export const SHEET_SPRITES = SPRITE_IDS.filter((id) => SPRITES[id].sheet)
export const SHEET_SIZES = [192, 96, 48] as const
export type SheetSize = (typeof SHEET_SIZES)[number]

/** The bakery renders every sprite at 192 px; cells is how many pixel-pass pixels span it. */
export const BAKE_PX = 192
export const WORLD_PIXEL = 4
export const MASTER_CELLS = BAKE_PX / WORLD_PIXEL

/** Cells across a sprite shown at `size` px under a pixel mode. */
export function cellsFor(size: number, mode: PixelMode): number {
  return mode === 'fixed' ? Math.round(size / WORLD_PIXEL) : MASTER_CELLS
}

/** Overview camera direction, unit length: the world's three-quarter view. */
export const SPRITE_VIEW: [number, number, number] = [0.556, 0.426, 0.714]
export const SPRITE_FOV = 14

/* ---------- buttons ---------- */

export const BUTTON_TREATMENTS = [
  { id: 'paper', name: 'Paper', lineage: 'Linear', use: 'Secondary actions on the paper. Flat ink text, a hairline, nothing raised.' },
  { id: 'ink', name: 'Ink', lineage: 'Direction A', use: 'The primary. Solid ink, paper text. One per view.' },
  { id: 'clay', name: 'Clay', lineage: 'Duolingo', use: 'A pressable primary for the one moment that wants weight: Start your world.' },
  { id: 'keycap', name: 'Keycap', lineage: 'Raycast', use: 'Keyboard shortcuts and the camera segmented control. Travels one pixel.' },
  { id: 'pixel', name: 'Pixel', lineage: 'The world', use: 'Controls that sit on the window edge. Stepped corners, a one-pixel shadow.' },
  { id: 'sticker', name: 'Sticker', lineage: 'State badge', use: 'Evidence chips and filters. The dot carries the state.' },
  { id: 'lamp', name: 'Lamp', lineage: 'The observatory', use: 'The mastered moment only. Lit label; glows when data-lit is set.' },
] as const
export type ButtonTreatment = (typeof BUTTON_TREATMENTS)[number]['id']

export const BUTTON_STATES = ['idle', 'hover', 'focus', 'active', 'disabled', 'loading'] as const
export type ButtonState = (typeof BUTTON_STATES)[number]
export const BUTTON_SIZES = [28, 32, 36, 44] as const

/* ---------- colour ---------- */

export const BIOMES = [
  { id: 'ice', name: 'Ice' },
  { id: 'meadow', name: 'Meadow' },
  { id: 'sand', name: 'Sand' },
] as const
export type BiomeId = (typeof BIOMES)[number]['id']
export const TINT_STEPS = [8, 12, 18] as const

export const THREAD_PLACES = [
  'The eyebrow dot',
  'A link underline',
  'The active tab',
  'A live badge',
  'The tail of a bubble',
] as const

/* ---------- copy ---------- */

export const COPY = {
  empty: { title: 'No files yet, so no ground yet.', body: 'Drop a lecture, a problem set, or exam feedback. The first sprout comes from the first file.', action: 'Drop a file' },
  loading: { title: 'Reading page 3 of 14.', body: 'Pip is pacing. This usually takes a moment.' },
  error: { title: 'That page did not open. Try again.', body: 'pset3.pdf stopped part way. Nothing was added to the world.', action: 'Try again' },
} as const
