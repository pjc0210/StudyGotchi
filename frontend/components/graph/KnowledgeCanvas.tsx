"use client";

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  type RefObject,
} from "react";
import {
  boundsOf,
  createLayout,
  settle,
  type PositionedNode,
} from "@/lib/forceLayout";
import type { GraphModel, GraphModelNode } from "@/lib/graphModel";
import { CANVAS } from "@/lib/graphTheme";

export interface CanvasHandle {
  fit: (duration?: number) => void;
  /** Frame a subset - a lens, a gap set, a study route. */
  fitTo: (ids: string[], duration?: number) => void;
  focus: (id: string, zoom?: number) => void;
  zoomBy: (factor: number) => void;
  /** Called after a width change so the caller can re-frame. */
  onResize: (fn: (() => void) | null) => void;
}

interface Camera {
  x: number;
  y: number;
  k: number;
}

export interface HoverInfo {
  id: string;
  screenX: number;
  screenY: number;
}

interface Props {
  model: GraphModel;
  /** Lens emphasis. null means emphasise everything. */
  emphasis: Set<string> | null;
  /** Backend study route, drawn as a prominent path. */
  routeIds: string[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onHover: (info: HoverInfo | null) => void;
  handleRef: RefObject<CanvasHandle | null>;
}

const MIN_ZOOM = 0.18;
const MAX_ZOOM = 3.2;

export function KnowledgeCanvas({
  model,
  emphasis,
  routeIds,
  selectedId,
  onSelect,
  onHover,
  handleRef,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const camRef = useRef<Camera>({ x: 0, y: 0, k: 1 });
  const hoveredRef = useRef<string | null>(null);
  const dirtyRef = useRef(true);
  const rafRef = useRef<number | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 });
  const onResizeRef = useRef<(() => void) | null>(null);

  // Drag state lives in refs so pointer moves never trigger React renders.
  const dragRef = useRef<{
    mode: "none" | "pan" | "node";
    nodeId: string | null;
    startX: number;
    startY: number;
    moved: boolean;
  }>({ mode: "none", nodeId: null, startX: 0, startY: 0, moved: false });

  // Layout is computed once per model and then frozen.
  const layout = useMemo(() => {
    const l = createLayout(model);
    settle(l);
    return l;
  }, [model]);

  const nodeIndex = useMemo(() => {
    const m = new Map<string, PositionedNode>();
    for (const n of layout.nodes) m.set(n.id, n);
    return m;
  }, [layout]);

  const routeSet = useMemo(() => new Set(routeIds), [routeIds]);
  const routeEdgeSet = useMemo(() => {
    // Consecutive pairs of the backend's ordering form the drawn route.
    const s = new Set<string>();
    for (let i = 0; i < routeIds.length - 1; i++) {
      s.add(`${routeIds[i]}|${routeIds[i + 1]}`);
      s.add(`${routeIds[i + 1]}|${routeIds[i]}`);
    }
    return s;
  }, [routeIds]);

  const markDirty = useCallback(() => {
    dirtyRef.current = true;
  }, []);

  // Let d3 move the node data directly while the canvas remains React-free.
  // The layout starts settled; it only wakes briefly while a node is handled.
  useEffect(() => {
    layout.simulation.on("tick.canvas", markDirty);
    return () => {
      layout.simulation.on("tick.canvas", null);
      layout.simulation.stop();
    };
  }, [layout, markDirty]);

  // --- camera helpers -----------------------------------------------------

  const fitNodes = useCallback(
    (subset: typeof layout.nodes, duration: number) => {
      const b = boundsOf(subset, 60);
      const { w, h } = sizeRef.current;
      if (!b || w === 0 || h === 0) return;
      const targetK = Math.max(
        MIN_ZOOM,
        Math.min(
          MAX_ZOOM,
          Math.min(w / (b.maxX - b.minX), h / (b.maxY - b.minY)) * 0.92,
        ),
      );
      animateTo(
        { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2, k: targetK },
        duration,
      );
    },
    // animateTo is stable; layout drives the identity of the node objects.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const fit = useCallback(
    (duration = 380) => fitNodes(layout.nodes, duration),
    [fitNodes, layout],
  );

  const fitTo = useCallback(
    (ids: string[], duration = 420) => {
      const set = new Set(ids);
      const subset = layout.nodes.filter((n) => set.has(n.id));
      if (subset.length === 0) return fit(duration);
      fitNodes(subset, duration);
    },
    [fitNodes, fit, layout],
  );

  const animRef = useRef<{ raf: number | null }>({ raf: null });

  const animateTo = useCallback(
    (target: Camera, duration: number) => {
      if (animRef.current.raf !== null)
        cancelAnimationFrame(animRef.current.raf);
      const from = { ...camRef.current };
      if (duration <= 0) {
        camRef.current = target;
        markDirty();
        return;
      }
      const start = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        // easeOutCubic: fast commit, gentle landing.
        const e = 1 - Math.pow(1 - t, 3);
        camRef.current = {
          x: from.x + (target.x - from.x) * e,
          y: from.y + (target.y - from.y) * e,
          k: from.k + (target.k - from.k) * e,
        };
        markDirty();
        if (t < 1) animRef.current.raf = requestAnimationFrame(step);
        else animRef.current.raf = null;
      };
      animRef.current.raf = requestAnimationFrame(step);
    },
    [markDirty],
  );

  useImperativeHandle(
    handleRef,
    () => ({
      fit,
      fitTo,
      focus: (id, zoom = 1.35) => {
        const n = nodeIndex.get(id);
        if (!n) return;
        animateTo({ x: n.x, y: n.y, k: Math.max(camRef.current.k, zoom) }, 340);
      },
      onResize: (fn) => {
        onResizeRef.current = fn;
      },
      zoomBy: (factor) => {
        const k = Math.max(
          MIN_ZOOM,
          Math.min(MAX_ZOOM, camRef.current.k * factor),
        );
        animateTo({ ...camRef.current, k }, 180);
      },
    }),
    [fit, fitTo, nodeIndex, animateTo],
  );

  // Fit whenever the underlying graph changes shape.
  useEffect(() => {
    const id = setTimeout(() => fit(0), 30);
    return () => clearTimeout(id);
  }, [fit]);

  // --- sizing -------------------------------------------------------------

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    let lastW = 0;
    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      const widthChanged = Math.abs(rect.width - lastW) > 1;
      lastW = rect.width;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      sizeRef.current = { w: rect.width, h: rect.height };
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      markDirty();
      // A panel opening changes the usable canvas; keep any framed subset framed.
      if (widthChanged) onResizeRef.current?.();
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [markDirty]);

  // --- drawing ------------------------------------------------------------

  useEffect(() => {
    markDirty();
  }, [emphasis, routeIds, selectedId, markDirty]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      if (!dirtyRef.current) return;
      dirtyRef.current = false;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const { w, h } = sizeRef.current;
      const cam = camRef.current;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);

      const sx = (wx: number) => (wx - cam.x) * cam.k + w / 2;
      const sy = (wy: number) => (wy - cam.y) * cam.k + h / 2;

      const hovered = hoveredRef.current;
      // Hover wins over the lens: pointing at something is a direct request.
      const focusSet: Set<string> | null = hovered
        ? new Set<string>([hovered, ...(model.adjacency.get(hovered) ?? [])])
        : routeSet.size > 0
          ? routeSet
          : emphasis;

      const alphaFor = (id: string) => {
        if (!focusSet) return 1;
        if (focusSet.has(id)) return 1;
        return 0.14;
      };

      // ---- edges ----
      ctx.lineCap = "round";
      for (const link of model.links) {
        const a = nodeIndex.get(link.source);
        const b = nodeIndex.get(link.target);
        if (!a || !b) continue;

        const onRoute = routeEdgeSet.has(`${link.source}|${link.target}`);
        const lit =
          onRoute ||
          (!focusSet
            ? false
            : focusSet.has(link.source) && focusSet.has(link.target));
        const alpha = focusSet
          ? lit
            ? 1
            : 0.08
          : link.kind === "resource"
            ? 0.5
            : 0.75;

        ctx.globalAlpha =
          alpha *
          (onRoute
            ? 0.82
            : lit
              ? 0.72
              : link.kind === "resource"
                ? 0.32
                : 0.45);
        ctx.strokeStyle =
          lit || onRoute
            ? CANVAS.edgeStrong
            : link.kind === "resource"
              ? CANVAS.edgeResource
              : CANVAS.edge;
        ctx.lineWidth = onRoute ? 0.9 : lit ? 0.72 : 0.45;

        const angle = Math.atan2(b.y - a.y, b.x - a.x);
        const aProfile = starProfile(a.node, cam.k);
        const bProfile = starProfile(b.node, cam.k);
        const ax = sx(a.x) + Math.cos(angle) * (aProfile.core + 1);
        const ay = sy(a.y) + Math.sin(angle) * (aProfile.core + 1);
        const bx = sx(b.x) - Math.cos(angle) * (bProfile.core + 1);
        const by = sy(b.y) - Math.sin(angle) * (bProfile.core + 1);
        const mx = (ax + bx) / 2;
        const my = (ay + by) / 2;
        const curve =
          ((hash(link.id, 7) % 1000) / 1000 - 0.5) * 32 * Math.min(1, cam.k);
        const cx = mx - Math.sin(angle) * curve;
        const cy = my + Math.cos(angle) * curve;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.quadraticCurveTo(cx, cy, bx, by);
        ctx.stroke();
      }

      // ---- nodes ----
      for (const pn of layout.nodes) {
        const node = pn.node;
        const x = sx(pn.x);
        const y = sy(pn.y);
        const profile = starProfile(node, cam.k);
        if (x < -60 || y < -60 || x > w + 60 || y > h + 60) continue;

        const isSelected = selectedId === node.id;
        const onRoute = routeSet.has(node.id);
        ctx.globalAlpha = alphaFor(node.id);

        drawStar(
          ctx,
          x,
          y,
          profile,
          alphaFor(node.id),
          isSelected || onRoute,
          node.id,
        );
      }

      // ---- labels (drawn last, with collision avoidance) ----
      // Force layout cannot prevent label overlap because its collision is a
      // circle and labels are wide horizontal boxes. So place labels in
      // priority order and drop any that would collide with one already
      // placed - the standard cartographic approach.
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      const labelThreshold =
        cam.k > 1.25 ? -1 : cam.k > 0.85 ? 0.35 : cam.k > 0.55 ? 0.6 : 0.78;

      interface Candidate {
        pn: (typeof layout.nodes)[number];
        forced: boolean;
        text: string;
        size: number;
      }

      const candidates: Candidate[] = [];
      for (const pn of layout.nodes) {
        const node = pn.node;
        const forced =
          selectedId === node.id ||
          hovered === node.id ||
          routeSet.has(node.id) ||
          (emphasis !== null && emphasis.has(node.id));
        if (!forced && node.weight < labelThreshold) continue;
        if (!forced && focusSet && !focusSet.has(node.id)) continue;

        const x = sx(pn.x);
        const y = sy(pn.y);
        if (x < -80 || y < -80 || x > w + 80 || y > h + 80) continue;

        candidates.push({
          pn,
          forced,
          text:
            node.label.length > 30
              ? `${node.label.slice(0, 29)}\u2026`
              : node.label,
          size: node.kind === "concept" ? 11.5 : 10.5,
        });
      }

      // Forced labels first, then the most important concepts.
      candidates.sort((a, b) => {
        if (a.forced !== b.forced) return a.forced ? -1 : 1;
        return b.pn.node.weight - a.pn.node.weight;
      });

      const placed: { x0: number; y0: number; x1: number; y1: number }[] = [];

      for (const c of candidates) {
        const node = c.pn.node;
        const x = sx(c.pn.x);
        const y = sy(c.pn.y);
        const profile = starProfile(node, cam.k);
        const labelX = x + profile.glow * 0.56 + 5;
        const labelY = y + 1;

        ctx.font = `${c.forced ? 500 : 400} ${c.size}px Georgia, 'Times New Roman', serif`;
        const tw = ctx.measureText(c.text).width;
        const box = {
          x0: labelX - 2,
          y0: labelY - c.size / 2 - 2,
          x1: labelX + tw + 2,
          y1: labelY + c.size / 2 + 2,
        };

        const collides = placed.some(
          (p) =>
            box.x0 < p.x1 && box.x1 > p.x0 && box.y0 < p.y1 && box.y1 > p.y0,
        );
        // A forced label always wins: it is what the user is pointing at.
        if (collides && !c.forced) continue;
        placed.push(box);

        ctx.globalAlpha = alphaFor(node.id);
        ctx.lineWidth = 3;
        ctx.strokeStyle = CANVAS.halo;
        ctx.lineJoin = "round";
        ctx.strokeText(c.text, labelX, labelY);
        ctx.fillStyle = c.forced
          ? CANVAS.labelStrong
          : node.kind === "concept"
            ? CANVAS.label
            : CANVAS.labelDim;
        ctx.fillText(c.text, labelX, labelY);
      }

      ctx.globalAlpha = 1;
      ctx.restore();
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [
    layout,
    model,
    nodeIndex,
    emphasis,
    selectedId,
    routeSet,
    routeEdgeSet,
    markDirty,
  ]);

  // --- hit testing --------------------------------------------------------

  const pick = useCallback(
    (clientX: number, clientY: number): PositionedNode | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const cam = camRef.current;
      const { w, h } = sizeRef.current;
      const px = clientX - rect.left;
      const py = clientY - rect.top;

      let best: PositionedNode | null = null;
      let bestDist = Infinity;
      for (const pn of layout.nodes) {
        const x = (pn.x - cam.x) * cam.k + w / 2;
        const y = (pn.y - cam.y) * cam.k + h / 2;
        const r = starProfile(pn.node, cam.k).glow * 0.55 + 8;
        const d = (px - x) ** 2 + (py - y) ** 2;
        if (d <= r * r && d < bestDist) {
          best = pn;
          bestDist = d;
        }
      }
      return best;
    },
    [layout],
  );

  // --- pointer interaction ------------------------------------------------

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
      const hit = pick(e.clientX, e.clientY);
      dragRef.current = {
        mode: hit ? "node" : "pan",
        nodeId: hit?.id ?? null,
        startX: e.clientX,
        startY: e.clientY,
        moved: false,
      };
      // Do not touch the simulation here. A plain click must never disturb
      // the layout - only a real drag (confirmed in onPointerMove once the
      // pointer actually moves) should pin the node and reheat the sim.
      e.currentTarget.style.cursor = "grabbing";
    },
    [pick],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const drag = dragRef.current;
      const cam = camRef.current;

      if (drag.mode === "none") {
        const hit = pick(e.clientX, e.clientY);
        const id = hit?.id ?? null;
        if (id !== hoveredRef.current) {
          hoveredRef.current = id;
          e.currentTarget.style.cursor = id ? "pointer" : "grab";
          markDirty();
          onHover(id ? { id, screenX: e.clientX, screenY: e.clientY } : null);
        } else if (id) {
          onHover({ id, screenX: e.clientX, screenY: e.clientY });
        }
        return;
      }

      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      // A generous threshold: trackpad/mouse clicks routinely produce a
      // couple of pixels of incidental movement, and misreading that as a
      // drag start is exactly what made every click reheat the simulation.
      const justStartedDragging =
        !drag.moved && (Math.abs(dx) > 6 || Math.abs(dy) > 6);
      if (justStartedDragging) drag.moved = true;

      if (drag.mode === "pan") {
        camRef.current = {
          ...cam,
          x: cam.x - dx / cam.k,
          y: cam.y - dy / cam.k,
        };
        drag.startX = e.clientX;
        drag.startY = e.clientY;
        markDirty();
      } else if (drag.nodeId) {
        const pn = nodeIndex.get(drag.nodeId);
        // The real bug lived here: this used to run on *every* pointermove
        // while the button was down on a node, including the sub-threshold
        // jitter of an ordinary click - pinning fx/fy and reheating the sim
        // even though `justStartedDragging` never fired. Since `drag.moved`
        // only ever becomes true once the threshold above is actually
        // crossed, gating on it means real jitter-only clicks never touch
        // the node's position or the simulation at all.
        if (pn && drag.moved) {
          if (justStartedDragging) {
            // Only now is this really a drag, not a click - reheat the sim,
            // gently: enough to let neighbours make room, not enough to
            // read as the whole graph shaking.
            layout.simulation.alphaTarget(0.05).alpha(0.12).restart();
          }
          // Pin the handled star, then let its neighbours make room around it.
          pn.fx = pn.x + dx / cam.k;
          pn.fy = pn.y + dy / cam.k;
          drag.startX = e.clientX;
          drag.startY = e.clientY;
          layout.simulation.alphaTarget(0.05).restart();
          markDirty();
        }
      }
    },
    [pick, nodeIndex, layout, markDirty, onHover],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const drag = dragRef.current;
      if (!drag.moved) {
        // A click, not a drag - the simulation was never touched, so there
        // is nothing to release. Just select.
        onSelect(drag.nodeId);
      } else if (drag.nodeId) {
        const pn = nodeIndex.get(drag.nodeId);
        if (pn) {
          // Retain the deliberate position for this session while the rest of
          // the graph quickly finds a calm arrangement around it.
          pn.fx = pn.x;
          pn.fy = pn.y;
        }
        layout.simulation.alphaTarget(0).alpha(0.08).restart();
      }
      // The pointer has not moved, so re-pick to keep hover in step with the
      // new selection instead of leaving the previous neighbourhood lit.
      const stillUnder = pick(e.clientX, e.clientY);
      if ((stillUnder?.id ?? null) !== hoveredRef.current) {
        hoveredRef.current = stillUnder?.id ?? null;
        markDirty();
        onHover(
          stillUnder
            ? { id: stillUnder.id, screenX: e.clientX, screenY: e.clientY }
            : null,
        );
      }
      dragRef.current = {
        mode: "none",
        nodeId: null,
        startX: 0,
        startY: 0,
        moved: false,
      };
      try {
        (e.target as HTMLCanvasElement).releasePointerCapture(e.pointerId);
      } catch {
        /* pointer already released */
      }
      e.currentTarget.style.cursor = stillUnder ? "pointer" : "grab";
    },
    [onSelect, pick, nodeIndex, layout, markDirty, onHover],
  );

  const onWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const cam = camRef.current;
      const { w, h } = sizeRef.current;

      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      // World point under the cursor stays put while zooming.
      const wx = (px - w / 2) / cam.k + cam.x;
      const wy = (py - h / 2) / cam.k + cam.y;

      const factor = Math.exp(-e.deltaY * 0.0016);
      const k = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, cam.k * factor));
      camRef.current = {
        k,
        x: wx - (px - w / 2) / k,
        y: wy - (py - h / 2) / k,
      };
      markDirty();
    },
    [markDirty],
  );

  const onPointerLeave = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (hoveredRef.current) {
        hoveredRef.current = null;
        markDirty();
      }
      // Safety net: if a drag is somehow interrupted without a matching
      // pointerup (capture lost, browser quirk), never leave the simulation
      // parked at a non-zero alphaTarget - that reads as the graph shaking
      // forever with no user action in progress.
      if (dragRef.current.mode === "node" && dragRef.current.moved) {
        const pn = dragRef.current.nodeId
          ? nodeIndex.get(dragRef.current.nodeId)
          : undefined;
        if (pn) {
          pn.fx = pn.x;
          pn.fy = pn.y;
        }
        layout.simulation.alphaTarget(0).alpha(0.08).restart();
      }
      dragRef.current = {
        mode: "none",
        nodeId: null,
        startX: 0,
        startY: 0,
        moved: false,
      };
      e.currentTarget.style.cursor = "grab";
      onHover(null);
    },
    [markDirty, onHover, nodeIndex, layout],
  );

  return (
    <div ref={wrapRef} className="absolute inset-0">
      <canvas
        ref={canvasRef}
        className="block h-full w-full touch-none"
        style={{ cursor: "grab" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerLeave}
        onWheel={onWheel}
      />
    </div>
  );
}

/** Stable string hash used for all visual variation. No per-render randomness. */
function hash(id: string, salt = 0): number {
  let value = 2166136261 ^ salt;
  for (let i = 0; i < id.length; i += 1) {
    value ^= id.charCodeAt(i);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

interface StarProfile {
  core: number;
  glow: number;
  opacity: number;
  rays: boolean;
  keyConcept: boolean;
}

function starProfile(node: GraphModelNode, zoom: number): StarProfile {
  // Radius is importance-derived in graphModel (range ~14-66). The tiny
  // stable variation only prevents mechanically identical stars; it never
  // overrides that meaning.
  const variation = 0.94 + (hash(node.id, 19) % 120) / 1000;
  const importanceCore = 1.3 + ((node.radius - 14) / 52) * 3.7;
  const core = Math.max(
    1.15,
    (node.kind === "concept" ? importanceCore : 1.45) *
      variation *
      Math.sqrt(Math.max(zoom, 0.32)),
  );
  if (node.kind !== "concept") {
    return { core, glow: core * 4.4, opacity: 0.64, rays: false, keyConcept: false };
  }

  // Which concepts are "key" is decided once in graphModel (importance,
  // ranked and capped so ties in the saturated top of the scale do not
  // flood the graph with highlights) - the renderer just reads the flag.
  const keyConcept = node.keyConcept;

  // Understanding controls only white-light intensity. Null is a distinct,
  // subdued unassessed state, not a synonym for zero understanding.
  const unassessed = node.concept.understanding === null;
  const level = node.concept.understanding ?? 0;
  const glowFactor = unassessed ? 0.55 : 0.62 + level * 0.76;
  const opacity = unassessed ? 0.45 : 0.52 + level * 0.46;
  return {
    core,
    glow: core * 6.2 * glowFactor,
    opacity,
    rays: !unassessed && level >= 0.7 && core > 3.8,
    keyConcept,
  };
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  star: StarProfile,
  alpha: number,
  active: boolean,
  id: string,
) {
  const glow = ctx.createRadialGradient(
    x,
    y,
    0,
    x,
    y,
    star.glow * (active ? 1.22 : 1),
  );
  glow.addColorStop(
    0,
    `rgba(255,255,255,${Math.min(1, star.opacity * alpha)})`,
  );
  glow.addColorStop(0.12, `rgba(255,255,255,${star.opacity * alpha * 0.72})`);
  glow.addColorStop(0.42, `rgba(255,255,255,${star.opacity * alpha * 0.15})`);
  glow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.globalAlpha = 1;
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, star.glow * (active ? 1.22 : 1), 0, Math.PI * 2);
  ctx.fill();
  if (star.rays) {
    const rayAngle = ((hash(id, 41) % 1000) / 1000) * Math.PI;
    ctx.globalAlpha = alpha * 0.22;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 0.5;
    for (const angle of [rayAngle, rayAngle + Math.PI / 2]) {
      const length = star.glow * 0.85;
      ctx.beginPath();
      ctx.moveTo(x - Math.cos(angle) * length, y - Math.sin(angle) * length);
      ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(x, y, star.core, 0, Math.PI * 2);
  ctx.fill();

  if (star.keyConcept) {
    // A distinct colour accent, not just size, so key concepts read clearly
    // even at a glance or when zoomed out past where size differences show.
    ctx.globalAlpha = alpha * (active ? 0.95 : 0.75);
    ctx.strokeStyle = CANVAS.brand;
    ctx.lineWidth = active ? 1.6 : 1.1;
    ctx.beginPath();
    ctx.arc(x, y, star.core + 3.5, 0, Math.PI * 2);
    ctx.stroke();
  }
}
