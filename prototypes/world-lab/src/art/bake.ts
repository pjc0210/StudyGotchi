import { createContext, useContext } from 'react'
import type { SpriteId } from './art-spec'

export interface BakeJob {
  id: SpriteId
  cells: number
}

export const bakeKey = (job: BakeJob) => `${job.id}:${job.cells}`

/** Baked sprite PNGs by `${id}:${cells}`, filled in by the bakery as it works through its jobs. */
export const BakeContext = createContext<Record<string, string>>({})

export function useBaked(id: SpriteId, cells: number): string | undefined {
  return useContext(BakeContext)[bakeKey({ id, cells })]
}

/** Save a PNG. Baked sprites are resampled to the shown size with nearest neighbour first. */
export function downloadPng(source: string | HTMLCanvasElement, name: string, size?: number) {
  const finish = (url: string) => {
    const a = document.createElement('a')
    a.href = url
    a.download = `${name}.png`
    a.click()
  }
  if (source instanceof HTMLCanvasElement) {
    finish(source.toDataURL('image/png'))
    return
  }
  if (!size) {
    finish(source)
    return
  }
  const img = new Image()
  img.onload = () => {
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) return finish(source)
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(img, 0, 0, size, size)
    finish(canvas.toDataURL('image/png'))
  }
  img.src = source
}
