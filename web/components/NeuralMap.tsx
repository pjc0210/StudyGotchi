'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'
import {
  GRAPH_EDGES,
  GRAPH_NODES,
  layoutGraph,
} from '@/lib/knowledge'
import { useTheme } from '@/lib/theme'

const MIN_ZOOM = 0.22
const MAX_ZOOM = 2.8
const FILL = 0.8
const NIGHT_BOX = '#4f4a43'

function spanX(w: number, k: number) {
  return k * w * FILL
}

function spanY(h: number, k: number) {
  return k * h * FILL
}

function toScreen(wx: number, wy: number, cam: Camera, w: number, h: number) {
  return {
    x: w / 2 + (wx - cam.x) * spanX(w, cam.k),
    y: h / 2 + (wy - cam.y) * spanY(h, cam.k),
  }
}

function toWorld(px: number, py: number, cam: Camera, w: number, h: number) {
  return {
    x: cam.x + (px - w / 2) / spanX(w, cam.k),
    y: cam.y + (py - h / 2) / spanY(h, cam.k),
  }
}

type Camera = { x: number; y: number; k: number }

function hash(id: string, salt = 0): number {
  let value = 2166136261 ^ salt
  for (let i = 0; i < id.length; i += 1) {
    value ^= id.charCodeAt(i)
    value = Math.imul(value, 16777619)
  }
  return value >>> 0
}

interface StarProfile {
  core: number
  glow: number
  opacity: number
  rays: boolean
}

/** Ported from frontend/components/graph/KnowledgeCanvas.tsx, with mastery as size. */
function starProfile(id: string, mastery: number | null, zoom: number): StarProfile {
  const variation = 0.76 + (hash(id, 19) % 250) / 1000
  const scale = 1 + (mastery ?? 0) * 1.5
  const familiarityCore = 1.55 + ((mastery ?? 0) * 25) / 25 * 3.1
  const core = Math.max(
    1.15,
    familiarityCore * variation * Math.sqrt(Math.max(zoom, 0.32)) * scale,
  )
  return {
    core,
    glow: core * 6.2,
    opacity: 0.78 + variation * 0.22,
    rays: core > 3.8,
  }
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  star: StarProfile,
  alpha: number,
  active: boolean,
  id: string,
  rgb: string,
) {
  const radius = star.glow * (active ? 1.22 : 1)
  const glow = ctx.createRadialGradient(x, y, 0, x, y, radius)
  glow.addColorStop(0, `rgba(${rgb},${Math.min(1, star.opacity * alpha)})`)
  glow.addColorStop(0.12, `rgba(${rgb},${star.opacity * alpha * 0.72})`)
  glow.addColorStop(0.42, `rgba(${rgb},${star.opacity * alpha * 0.15})`)
  glow.addColorStop(1, `rgba(${rgb},0)`)
  ctx.globalAlpha = 1
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fill()
  if (star.rays) {
    const rayAngle = ((hash(id, 41) % 1000) / 1000) * Math.PI
    ctx.globalAlpha = alpha * 0.22
    ctx.strokeStyle = `rgb(${rgb})`
    ctx.lineWidth = 0.5
    for (const angle of [rayAngle, rayAngle + Math.PI / 2]) {
      const length = star.glow * 0.85
      ctx.beginPath()
      ctx.moveTo(x - Math.cos(angle) * length, y - Math.sin(angle) * length)
      ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length)
      ctx.stroke()
    }
  }
  ctx.globalAlpha = alpha
  ctx.fillStyle = `rgb(${rgb})`
  ctx.beginPath()
  ctx.arc(x, y, star.core, 0, Math.PI * 2)
  ctx.fill()
}

export function NeuralMap({
  selectedId,
  onSelect,
}: {
  selectedId: string | null
  onSelect: (id: string | null) => void
}) {
  const { theme } = useTheme()
  const night = theme === 'night'
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const camRef = useRef<Camera>({ x: 0.5, y: 0.5, k: 1 })
  const sizeRef = useRef({ w: 0, h: 0 })
  const dirtyRef = useRef(true)
  const hoverRef = useRef<string | null>(null)
  const dragRef = useRef({
    panning: false,
    moved: false,
    startX: 0,
    startY: 0,
    hit: null as string | null,
  })
  const nightRef = useRef(night)
  const selectedRef = useRef(selectedId)
  nightRef.current = night
  selectedRef.current = selectedId

  const { positions } = useMemo(() => layoutGraph(), [])
  const nodeById = useMemo(() => {
    const next = new Map(GRAPH_NODES.map((node) => [node.id, node]))
    return next
  }, [])

  const markDirty = useCallback(() => {
    dirtyRef.current = true
  }, [])

  const pick = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current
      if (!canvas) return null
      const rect = canvas.getBoundingClientRect()
      const cam = camRef.current
      const { w, h } = sizeRef.current
      const px = clientX - rect.left
      const py = clientY - rect.top
      let best: string | null = null
      let bestDist = Infinity
      for (const node of GRAPH_NODES) {
        const pos = positions.get(node.id)
        if (!pos) continue
        const { x, y } = toScreen(pos.x, pos.y, cam, w, h)
        const profile = starProfile(node.id, node.mastery, cam.k)
        const r = profile.glow * 0.55 + 8
        const d = (px - x) ** 2 + (py - y) ** 2
        if (d <= r * r && d < bestDist) {
          best = node.id
          bestDist = d
        }
      }
      return best
    },
    [positions],
  )

  useEffect(() => {
    markDirty()
  }, [night, selectedId, markDirty])

  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return
    const resize = () => {
      const rect = wrap.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      sizeRef.current = { w: rect.width, h: rect.height }
      canvas.width = Math.round(rect.width * dpr)
      canvas.height = Math.round(rect.height * dpr)
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      markDirty()
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [markDirty])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let raf = 0

    const draw = () => {
      raf = requestAnimationFrame(draw)
      if (!dirtyRef.current) return
      dirtyRef.current = false

      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const { w, h } = sizeRef.current
      const cam = camRef.current
      const isNight = nightRef.current
      const selected = selectedRef.current
      const rgb = isNight ? '255,255,255' : '58,116,171'

      ctx.save()
      ctx.scale(dpr, dpr)
      ctx.clearRect(0, 0, w, h)

      ctx.lineCap = 'round'
      for (const edge of GRAPH_EDGES) {
        const from = positions.get(edge.source)
        const to = positions.get(edge.target)
        if (!from || !to) continue
        const lit = selected === edge.source || selected === edge.target
        const a = starProfile(edge.source, nodeById.get(edge.source)?.mastery ?? 0, cam.k)
        const b = starProfile(edge.target, nodeById.get(edge.target)?.mastery ?? 0, cam.k)
        const start = toScreen(from.x, from.y, cam, w, h)
        const end = toScreen(to.x, to.y, cam, w, h)
        const angle = Math.atan2(end.y - start.y, end.x - start.x)
        const ax = start.x + Math.cos(angle) * (a.core + 1)
        const ay = start.y + Math.sin(angle) * (a.core + 1)
        const bx = end.x - Math.cos(angle) * (b.core + 1)
        const by = end.y - Math.sin(angle) * (b.core + 1)
        const curve =
          ((hash(`${edge.source}|${edge.target}`, 7) % 1000) / 1000 - 0.5) * 32 * Math.min(1, cam.k)
        ctx.globalAlpha = lit ? 0.72 : 0.45
        ctx.strokeStyle = isNight
          ? lit
            ? '#e9f1ff8c'
            : '#cbd5e14d'
          : lit
            ? '#3a74ab'
            : '#4f8ec89e'
        ctx.lineWidth = lit ? 0.9 : 0.55
        ctx.beginPath()
        ctx.moveTo(ax, ay)
        ctx.quadraticCurveTo(
          (ax + bx) / 2 - Math.sin(angle) * curve,
          (ay + by) / 2 + Math.cos(angle) * curve,
          bx,
          by,
        )
        ctx.stroke()
      }

      const hover = hoverRef.current
      for (const node of GRAPH_NODES) {
        const pos = positions.get(node.id)
        if (!pos) continue
        const { x, y } = toScreen(pos.x, pos.y, cam, w, h)
        const profile = starProfile(node.id, node.mastery, cam.k)
        const active = selected === node.id || hover === node.id
        drawStar(ctx, x, y, profile, 1, active, node.id, rgb)
      }

      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.font = '400 11.5px Georgia, "Times New Roman", serif'
      for (const node of GRAPH_NODES) {
        const pos = positions.get(node.id)
        if (!pos) continue
        const { x, y } = toScreen(pos.x, pos.y, cam, w, h)
        const profile = starProfile(node.id, node.mastery, cam.k)
        const labelX = x + profile.glow * 0.56 + 5
        const labelY = y + 1
        const forced = selected === node.id || hover === node.id
        ctx.globalAlpha = 1
        if (isNight) {
          ctx.lineWidth = 3
          ctx.strokeStyle = NIGHT_BOX
          ctx.lineJoin = 'round'
          ctx.strokeText(node.name, labelX, labelY)
          ctx.fillStyle = forced ? '#ffffff' : '#eef1f5'
        } else {
          ctx.fillStyle = forced ? '#2f6496' : '#3a74ab'
        }
        ctx.fillText(node.name, labelX, labelY)
      }

      ctx.globalAlpha = 1
      ctx.restore()
    }

    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [positions, nodeById])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = canvas.getBoundingClientRect()
      const cam = camRef.current
      const { w, h } = sizeRef.current
      const px = e.clientX - rect.left
      const py = e.clientY - rect.top
      const world = toWorld(px, py, cam, w, h)
      const factor = Math.exp(-e.deltaY * 0.0016)
      const k = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, cam.k * factor))
      camRef.current = {
        k,
        x: world.x - (px - w / 2) / spanX(w, k),
        y: world.y - (py - h / 2) / spanY(h, k),
      }
      markDirty()
    }
    canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', onWheel)
  }, [markDirty])

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    const hit = pick(e.clientX, e.clientY)
    dragRef.current = {
      panning: true,
      moved: false,
      startX: e.clientX,
      startY: e.clientY,
      hit,
    }
    e.currentTarget.style.cursor = 'grabbing'
  }

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current
    if (!drag.panning) {
      const hit = pick(e.clientX, e.clientY)
      if (hit !== hoverRef.current) {
        hoverRef.current = hit
        e.currentTarget.style.cursor = hit ? 'pointer' : 'grab'
        markDirty()
      }
      return
    }
    const dx = e.clientX - drag.startX
    const dy = e.clientY - drag.startY
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) drag.moved = true
    const cam = camRef.current
    const { w, h } = sizeRef.current
    camRef.current = {
      ...cam,
      x: cam.x - dx / spanX(w, cam.k),
      y: cam.y - dy / spanY(h, cam.k),
    }
    drag.startX = e.clientX
    drag.startY = e.clientY
    markDirty()
  }

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current
    if (!drag.moved) onSelect(drag.hit)
    dragRef.current = { panning: false, moved: false, startX: 0, startY: 0, hit: null }
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* already released */
    }
    const hit = pick(e.clientX, e.clientY)
    e.currentTarget.style.cursor = hit ? 'pointer' : 'grab'
  }

  return (
    <div
      ref={wrapRef}
      className={`neural-map${night ? ' is-night' : ''}`}
      aria-label="Knowledge map"
    >
      <canvas
        ref={canvasRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => {
          hoverRef.current = null
          markDirty()
        }}
      />
    </div>
  )
}
