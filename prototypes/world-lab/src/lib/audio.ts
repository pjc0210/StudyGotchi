/**
 * Lightweight music + SFX for world-lab. Beds come from the CC0/CC-BY library
 * in assets/audio/music (same catalog the product frontend uses).
 */

export type LabBiome = 'forest' | 'city' | 'ice' | 'sand' | 'meadow' | 'ocean' | 'volcanic'

export interface LabTrack {
  id: string
  title: string
  artist: string
  credit: string
  file: string
  gain: number
}

const T = (t: LabTrack): LabTrack => t

export const LAB_BGM = {
  '8bit-bossa': T({
    id: '8bit-bossa',
    title: '8bit Bossa',
    artist: 'Joth',
    credit: '8bit Bossa by Joth (opengameart.org), CC0',
    file: '/assets/audio/music/tracks/8bit-bossa.mp3',
    gain: 0.72,
  }),
  'cutie-pie': T({
    id: 'cutie-pie',
    title: 'Cutie Pie',
    artist: 'FrancisLeeMusic',
    credit: 'Cutie Pie by FrancisLeeMusic (opengameart.org), CC-BY 3.0',
    file: '/assets/audio/music/tracks/cutie-pie.mp3',
    gain: 0.7,
  }),
  'ukulele-forest-loop': T({
    id: 'ukulele-forest-loop',
    title: 'Ukulele Forest',
    artist: 'StarNinjas',
    credit: 'Ukulele Forest by StarNinjas (opengameart.org), CC0',
    file: '/assets/audio/music/tracks/ukulele-forest-loop.mp3',
    gain: 0.8,
  }),
  'forest-ambience': T({
    id: 'forest-ambience',
    title: 'Forest Ambience',
    artist: 'TinyWorlds',
    credit: 'Forest Ambience by TinyWorlds (opengameart.org), CC0',
    file: '/assets/audio/music/tracks/forest-ambience.mp3',
    gain: 0.32,
  }),
  'cozy-puzzle-1': T({
    id: 'cozy-puzzle-1',
    title: 'Cozy Puzzle In-Game 1',
    artist: 'MintoDog',
    credit: 'Cozy Puzzle In-Game 1 by MintoDog (opengameart.org), CC0',
    file: '/assets/audio/music/tracks/cozy-puzzle-1.mp3',
    gain: 0.7,
  }),
  'wintery-loop': T({
    id: 'wintery-loop',
    title: 'Wintery loop',
    artist: 'Emma_MA',
    credit: 'Wintery loop by Emma_MA (opengameart.org), CC0',
    file: '/assets/audio/music/tracks/wintery-loop.mp3',
    gain: 0.7,
  }),
  'lobby-time': T({
    id: 'lobby-time',
    title: 'Lobby Time',
    artist: 'Kevin MacLeod',
    credit: 'Lobby Time by Kevin MacLeod (incompetech.com), CC-BY 3.0',
    file: '/assets/audio/music/tracks/lobby-time.mp3',
    gain: 0.62,
  }),
  'bassa-island': T({
    id: 'bassa-island',
    title: 'Bassa Island Game Loop',
    artist: 'Kevin MacLeod',
    credit: 'Bassa Island Game Loop by Kevin MacLeod (incompetech.com), CC-BY 3.0',
    file: '/assets/audio/music/tracks/bassa-island.mp3',
    gain: 0.65,
  }),
  'seaside-village': T({
    id: 'seaside-village',
    title: 'Seaside Village',
    artist: 'KarateStudios',
    credit: 'Seaside Village by KarateStudios (opengameart.org), CC0',
    file: '/assets/audio/music/tracks/seaside-village.mp3',
    gain: 0.7,
  }),
  'samba-isobel': T({
    id: 'samba-isobel',
    title: 'Samba Isobel',
    artist: 'Kevin MacLeod',
    credit: 'Samba Isobel by Kevin MacLeod (incompetech.com), CC-BY 3.0',
    file: '/assets/audio/music/tracks/samba-isobel.mp3',
    gain: 0.62,
  }),
  sleepy: T({
    id: 'sleepy',
    title: 'Sleepy',
    artist: 'congusbongus',
    credit: 'Sleepy by congusbongus (opengameart.org), CC-BY 4.0',
    file: '/assets/audio/music/tracks/sleepy.mp3',
    gain: 0.58,
  }),
  wallpaper: T({
    id: 'wallpaper',
    title: 'Wallpaper',
    artist: 'Kevin MacLeod',
    credit: 'Wallpaper by Kevin MacLeod (incompetech.com), CC-BY 3.0',
    file: '/assets/audio/music/tracks/wallpaper.mp3',
    gain: 0.52,
  }),
} as const

export type LabBgmId = keyof typeof LAB_BGM

const PLANET_BGM: LabBgmId = 'cutie-pie'

const DAY_BGM: Record<LabBiome, LabBgmId> = {
  forest: 'ukulele-forest-loop',
  meadow: 'cozy-puzzle-1',
  ice: 'wintery-loop',
  city: 'lobby-time',
  sand: 'bassa-island',
  ocean: 'seaside-village',
  volcanic: 'samba-isobel',
}

const NIGHT_BGM: Record<LabBiome, LabBgmId> = {
  forest: 'wallpaper',
  meadow: 'wallpaper',
  ice: 'wallpaper',
  city: 'sleepy',
  sand: 'wallpaper',
  ocean: 'sleepy',
  volcanic: 'wallpaper',
}

const AMBIENCE: Partial<Record<LabBiome, LabBgmId>> = {
  forest: 'forest-ambience',
}

export function isLabBiome(id: string): id is LabBiome {
  return id in DAY_BGM
}

let unlocked = false
let muted = false
let bgm: HTMLAudioElement | null = null
let amb: HTMLAudioElement | null = null
let currentBgm: LabBgmId | null = null
let currentAmb: LabBgmId | null = null
const listeners = new Set<() => void>()

function notify() {
  listeners.forEach((l) => l())
}

export function subscribeAudio(fn: () => void) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function nowPlaying(): LabTrack | null {
  return currentBgm ? LAB_BGM[currentBgm] : null
}

export function isMuted() {
  return muted
}

export function setMuted(next: boolean) {
  muted = next
  if (bgm) bgm.muted = next
  if (amb) amb.muted = next
  notify()
}

export function unlockAudio() {
  if (unlocked) return
  unlocked = true
  if (currentBgm) startLayer('bgm', currentBgm)
  if (currentAmb) startLayer('amb', currentAmb)
}

function startLayer(kind: 'bgm' | 'amb', id: LabBgmId) {
  const track = LAB_BGM[id]
  const el = new Audio(track.file)
  el.loop = true
  el.volume = muted ? 0 : track.gain
  el.muted = muted
  el.play().catch(() => {})
  if (kind === 'bgm') {
    bgm?.pause()
    bgm = el
    currentBgm = id
  } else {
    amb?.pause()
    amb = el
    currentAmb = id
  }
  notify()
}

function stopLayer(kind: 'bgm' | 'amb') {
  if (kind === 'bgm') {
    bgm?.pause()
    bgm = null
    currentBgm = null
  } else {
    amb?.pause()
    amb = null
    currentAmb = null
  }
  notify()
}

function want(kind: 'bgm' | 'amb', id: LabBgmId | null) {
  const cur = kind === 'bgm' ? currentBgm : currentAmb
  if (cur === id) return
  if (!id) {
    stopLayer(kind)
    return
  }
  if (!unlocked) {
    if (kind === 'bgm') currentBgm = id
    else currentAmb = id
    notify()
    return
  }
  startLayer(kind, id)
}

export function setLabScene(view: 'planet' | 'biome' | 'none', biome: string | null, night: boolean) {
  if (view === 'none') {
    want('bgm', null)
    want('amb', null)
    return
  }
  if (view === 'planet' || !biome || !isLabBiome(biome)) {
    want('bgm', PLANET_BGM)
    want('amb', null)
    return
  }
  want('bgm', night ? NIGHT_BGM[biome] : DAY_BGM[biome])
  want('amb', AMBIENCE[biome] ?? null)
}

export function playSfx(name: string, gain = 0.75) {
  if (!unlocked || muted) return
  const a = new Audio(`/assets/audio/sfx/${name}.wav`)
  a.volume = gain
  a.play().catch(() => {})
}

if (typeof window !== 'undefined') {
  const unlock = () => unlockAudio()
  window.addEventListener('pointerdown', unlock, { once: true, capture: true })
  window.addEventListener('keydown', unlock, { once: true, capture: true })
}
