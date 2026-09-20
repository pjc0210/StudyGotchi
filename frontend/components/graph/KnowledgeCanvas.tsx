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
  syncLayout,
  type Layout,
  type PositionedNode,
} from "@/lib/forceLayout";
import { useSpaceAttribute } from "@/components/shell/useSpaceAttribute";
import { emit } from "@/lib/audio/events";
import {
  buildSpaceClusters,
  clipSpaceLabel,
  clusterLabelBudget,
  FIT_CLUSTER_ZOOM,
  hexRgb,
  nodeLabelBudget,
  spaceLabelLayer,
  type SpaceLabelNode,
} from "@/lib/constellationLabels";
import type { GraphModel } from "@/lib/graphModel";
import { spacePalette, type SpacePalette } from "@/lib/graphTheme";
import { edgeBackboneScore, edgeDrawBudget, keepBackboneEdge } from "@/lib/space-field";

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
  arrivingIds?: string[];
  weakFlash?: boolean;
  /** Specific weak-area sequences — only mounted while the Weak Areas lens is on. */
  weakTraceIds?: string[];
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
  arrivingIds = [],
  weakFlash = false,
  weakTraceIds = [],
  onSelect,
  onHover,
  handleRef,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const theme = useSpaceAttribute();
  const paletteRef = useRef(spacePalette(theme));
  paletteRef.current = spacePalette(theme);

  const camRef = useRef<Camera>({ x: 0, y: 0, k: 1 });
  const hoveredRef = useRef<string | null>(null);
  const dirtyRef = useRef(true);
  const rafRef = useRef<number | null>(null);
  const arrivingAtRef = useRef(new Map<string, number>());
  const weakPulseAtRef = useRef(0);
  const weakTraceSetRef = useRef(new Set<string>());
  weakTraceSetRef.current = new Set(weakTraceIds);
  const clusterHitsRef = useRef<{ x0: number; y0: number; x1: number; y1: number; memberIds: string[] }[]>([]);
  const sizeRef = useRef({ w: 0, h: 0 });
  const onResizeRef = useRef<(() => void) | null>(null);

  // Drag state lives in refs so pointer moves never trigger React renders.
  const dragRef = useRef<{
    mode: "none" | "pan" | "node";
    nodeId: string | null;
    clusterIds: string[] | null;
    startX: number;
    startY: number;
    moved: boolean;
  }>({ mode: "none", nodeId: null, clusterIds: null, startX: 0, startY: 0, moved: false });

  // Keep the last settled sky so a dropped file can reheat in place instead of
  // reseeding every star. Bulk hydrates still start from a fresh layout.
  const layoutRef = useRef<Layout | null>(null);
  const firstFitRef = useRef(true);
  const layout = useMemo(() => {
    const prev = layoutRef.current;
    const nextIds = new Set(model.nodes.map((node) => node.id));
    const prevIds = new Set(prev?.nodes.map((node) => node.id) ?? []);
    let shared = 0;
    let added = 0;
    for (const id of nextIds) {
      if (prevIds.has(id)) shared += 1;
      else added += 1;
    }

    let next: Layout;
    if (!prev || shared === 0 || added > 8) {
      if (prev) prev.simulation.stop();
      next = createLayout(model);
      settle(next);
    } else if (added === 0) {
      for (const node of prev.nodes) {
        const fresh = model.byId.get(node.id);
        if (fresh) node.node = fresh;
      }
      const prevLinkIds = new Set(prev.links.map((link) => link.id));
      const linksSame =
        prevLinkIds.size === model.links.length && model.links.every((link) => prevLinkIds.has(link.id));
      next = linksSame ? prev : syncLayout(prev, model);
    } else {
      next = syncLayout(prev, model);
    }
    layoutRef.current = next;
    return next;
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
  // Do not stop the sim here: a file insert reuses the same simulation, and
  // rebinding the tick handler must not freeze the structural shift.
  useEffect(() => {
    layout.simulation.on("tick.canvas", markDirty);
    return () => {
      layout.simulation.on("tick.canvas", null);
    };
  }, [layout, markDirty]);

  useEffect(
    () => () => {
      layoutRef.current?.simulation.stop();
    },
    [],
  );

  // --- camera helpers -----------------------------------------------------

  const fitNodes = useCallback(
    (subset: typeof layout.nodes, duration: number, zoomCap = MAX_ZOOM) => {
      const b = boundsOf(subset, 60);
      const { w, h } = sizeRef.current;
      if (!b || w === 0 || h === 0) return;
      const targetK = Math.max(
        MIN_ZOOM,
        Math.min(zoomCap, Math.min(w / (b.maxX - b.minX), h / (b.maxY - b.minY)) * 0.92),
      );
      animateTo({ x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2, k: targetK }, duration);
    },
    // animateTo is stable; layout drives the identity of the node objects.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const fit = useCallback(
    (duration = 380) => fitNodes(layout.nodes, duration, FIT_CLUSTER_ZOOM),
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

  const animateTo = useCallback((target: Camera, duration: number) => {
    if (animRef.current.raf !== null) cancelAnimationFrame(animRef.current.raf);
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
  }, [markDirty]);

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
        const k = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, camRef.current.k * factor));
        animateTo({ ...camRef.current, k }, 180);
      },
    }),
    [fit, fitTo, nodeIndex, animateTo],
  );

  // First layout snaps to the whole sky. A later insert eases to the new
  // bounds so the structural shift is visible without zooming into the file.
  useEffect(() => {
    if (firstFitRef.current) {
      firstFitRef.current = false;
      const id = setTimeout(() => fit(0), 30);
      return () => clearTimeout(id);
    }
    const id = setTimeout(() => fit(900), 240);
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
    const now = performance.now();
    for (const id of arrivingIds) {
      if (!arrivingAtRef.current.has(id)) arrivingAtRef.current.set(id, now);
    }
    markDirty();
  }, [arrivingIds, markDirty]);

  useEffect(() => {
    weakPulseAtRef.current = weakFlash ? performance.now() : 0;
    markDirty();
  }, [weakFlash, markDirty]);

  useEffect(() => {
    markDirty();
  }, [emphasis, routeIds, selectedId, theme, weakTraceIds, markDirty]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      const now = performance.now();
      const showingWeak = weakTraceSetRef.current.size > 0;
      const weakPulse = weakPulseAtRef.current
        ? Math.max(0, 1 - (now - weakPulseAtRef.current) / 1600)
        : 0;
      let popping = false;
      for (const started of arrivingAtRef.current.values()) {
        if (now - started < 640) popping = true;
      }
      if (!dirtyRef.current && !showingWeak && !popping) return;
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
      const palette = paletteRef.current;
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

      const labelables: SpaceLabelNode[] = layout.nodes.map((pn) => ({
        id: pn.id,
        x: pn.x,
        y: pn.y,
        kind: pn.node.kind,
        label: pn.node.label,
        weight: pn.node.weight,
        cluster: pn.node.kind === "concept" ? pn.node.concept.cluster : undefined,
        clusterId: pn.node.kind === "concept" ? pn.node.concept.cluster_id : undefined,
        constellation: pn.node.kind === "concept" ? pn.node.concept.constellation : undefined,
        mastery: pn.node.kind === "concept" ? pn.node.concept.mastery : undefined,
      }));
      const clusters = buildSpaceClusters(labelables, model.adjacency);

      // ---- nebula dust behind topic clusters: light blue mastered, red not ----
      for (const cluster of clusters) {
        const tint = (cluster.mastery ?? 0.45) >= 0.6 ? palette.nebula[0] : palette.nebula[1];
        const { r, g, b } = hexRgb(tint);
        const x = sx(cluster.x);
        const y = sy(cluster.y);
        const radius = 58 + Math.sqrt(cluster.count) * 30 * Math.min(1.15, Math.max(0.55, cam.k));
        const dust = ctx.createRadialGradient(x, y, 0, x, y, radius);
        const core = palette.halo === "#080716" ? 0.34 : 0.22;
        dust.addColorStop(0, `rgba(${r},${g},${b},${core})`);
        dust.addColorStop(0.55, `rgba(${r},${g},${b},${core * 0.45})`);
        dust.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.globalAlpha = 1;
        ctx.fillStyle = dust;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // ---- edges ----
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      const lod = edgeDrawBudget(cam.k);
      const weakDraw: { ax: number; ay: number; cx: number; cy: number; bx: number; by: number }[] = [];
      for (const link of model.links) {
        const a = nodeIndex.get(link.source);
        const b = nodeIndex.get(link.target);
        if (!a || !b) continue;

        const onRoute = routeEdgeSet.has(`${link.source}|${link.target}`);
        const markedWeak = weakTraceSetRef.current.has(link.id);
        const lit =
          onRoute ||
          (!focusSet ? false : focusSet.has(link.source) && focusSet.has(link.target));
        const score = edgeBackboneScore({
          kind: link.kind,
          directed: link.directed,
          type: link.type,
          sourceWeight: a.node.weight,
          targetWeight: b.node.weight,
        });
        const keep = onRoute || lit || keepBackboneEdge(score, cam.k);
        if (!keep && !(markedWeak && showingWeak)) continue;

        const angle = Math.atan2(b.y - a.y, b.x - a.x);
        const aProfile = starProfile(a.node.id, a.node.radius, a.node.kind, cam.k);
        const bProfile = starProfile(b.node.id, b.node.radius, b.node.kind, cam.k);
        const ax = sx(a.x) + Math.cos(angle) * (aProfile.core + 1);
        const ay = sy(a.y) + Math.sin(angle) * (aProfile.core + 1);
        const bx = sx(b.x) - Math.cos(angle) * (bProfile.core + 1);
        const by = sy(b.y) - Math.sin(angle) * (bProfile.core + 1);
        const mx = (ax + bx) / 2;
        const my = (ay + by) / 2;
        const curve = ((((hash(link.id, 7) % 1000) / 1000) - 0.5) * 32) * Math.min(1, cam.k);
        const cx = mx - Math.sin(angle) * curve;
        const cy = my + Math.cos(angle) * curve;
        if (markedWeak && showingWeak) weakDraw.push({ ax, ay, cx, cy, bx, by });
        if (!keep) continue;

        const dim = !onRoute && !lit;
        ctx.globalAlpha = focusSet ? (lit ? 1 : 0.08) : dim ? lod.alpha : 1;
        ctx.strokeStyle =
          lit || onRoute ? palette.edgeStrong : link.kind === "resource" ? palette.edgeResource : palette.edge;
        ctx.lineWidth = onRoute ? 1.4 : lit ? 1.1 : lod.width;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.quadraticCurveTo(cx, cy, bx, by);
        ctx.stroke();
      }

      if (showingWeak && weakDraw.length > 0) {
        ctx.save();
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.setLineDash([5, 9]);
        ctx.lineDashOffset = -(now / 86);
        ctx.strokeStyle = palette.live;
        ctx.globalAlpha = Math.max(0.78, 0.62 + weakPulse * 0.38);
        ctx.lineWidth = 2.4;
        for (const trace of weakDraw) {
          ctx.beginPath();
          ctx.moveTo(trace.ax, trace.ay);
          ctx.quadraticCurveTo(trace.cx, trace.cy, trace.bx, trace.by);
          ctx.stroke();
        }
        ctx.restore();
      }

      // ---- nodes ----
      for (const pn of layout.nodes) {
        const node = pn.node;
        const x = sx(pn.x);
        const y = sy(pn.y);
        const profile = starProfile(node.id, node.radius, node.kind, cam.k);
        if (x < -60 || y < -60 || x > w + 60 || y > h + 60) continue;

        const isSelected = selectedId === node.id;
        const onRoute = routeSet.has(node.id);
        if (spaceLabelLayer(cam.k) === "clusters" && node.kind === "resource" && !isSelected && !onRoute) {
          continue;
        }
        const born = arrivingAtRef.current.get(node.id);
        const pop = born ? Math.min(1, (now - born) / 520) : 1;
        const popScale = born ? 0.25 + (1 - Math.pow(1 - pop, 3)) * 1.05 : 1;
        ctx.save();
        if (popScale !== 1) {
          ctx.translate(x, y);
          ctx.scale(popScale, popScale);
          ctx.translate(-x, -y);
        }
        drawStar(ctx, x, y, profile, alphaFor(node.id), isSelected || onRoute || Boolean(born && pop < 1), node.id, palette);
        ctx.restore();
      }

      // ---- labels (drawn last, with collision avoidance) ----
      // Zoomed out: constellation names. Zoomed in: short node names.
      // Full titles stay in the tooltip and inspector.
      ctx.textBaseline = "middle";
      const layer = spaceLabelLayer(cam.k);
      const displayFace = spaceTypeface("display");
      const uiFace = spaceTypeface("ui");
      const placed: { x0: number; y0: number; x1: number; y1: number }[] = [];
      clusterHitsRef.current = [];

      const paintLabel = (
        text: string,
        labelX: number,
        labelY: number,
        size: number,
        font: string,
        fill: string,
        align: CanvasTextAlign,
        alpha: number,
        forced: boolean,
      ) => {
        ctx.textAlign = align;
        ctx.font = font;
        const tw = ctx.measureText(text).width;
        const left = align === "center" ? labelX - tw / 2 : labelX;
        const box = {
          x0: left - 3,
          y0: labelY - size / 2 - 2,
          x1: left + tw + 3,
          y1: labelY + size / 2 + 2,
        };
        const collides = placed.some(
          (p) => box.x0 < p.x1 && box.x1 > p.x0 && box.y0 < p.y1 && box.y1 > p.y0,
        );
        if (collides && !forced) return false;
        placed.push(box);
        ctx.globalAlpha = alpha;
        ctx.lineWidth = 3;
        ctx.strokeStyle = palette.halo;
        ctx.lineJoin = "round";
        ctx.strokeText(text, labelX, labelY);
        ctx.fillStyle = fill;
        ctx.fillText(text, labelX, labelY);
        return box;
      };

      if (layer === "clusters") {
        for (const cluster of clusters) {
          const x = sx(cluster.x);
          const y = sy(cluster.y);
          if (x < -80 || y < -40 || x > w + 80 || y > h + 40) continue;
          const size = cam.k > 0.55 ? 13 : 12;
          const box = paintLabel(
            clipSpaceLabel(cluster.label, clusterLabelBudget(cam.k)),
            x,
            y - 18,
            size,
            `700 ${size}px ${displayFace}`,
            palette.labelStrong,
            "center",
            1,
            false,
          );
          if (box) {
            clusterHitsRef.current.push({
              x0: box.x0 - 10,
              y0: box.y0 - 8,
              x1: box.x1 + 10,
              y1: box.y1 + 8,
              memberIds: cluster.memberIds,
            });
          }
        }
      }

      interface Candidate {
        pn: (typeof layout.nodes)[number];
        forced: boolean;
        text: string;
        size: number;
      }

      const candidates: Candidate[] = [];
      const labelThreshold =
        cam.k > 1.6 ? -1 : cam.k > 1.15 ? 0.35 : 0.62;

      for (const pn of layout.nodes) {
        const node = pn.node;
        const forced =
          selectedId === node.id ||
          hovered === node.id ||
          routeSet.has(node.id);
        if (layer === "clusters" && !forced) continue;
        if (!forced && node.kind === "resource" && cam.k < 1.25) continue;
        if (!forced && node.weight < labelThreshold) continue;
        if (!forced && focusSet && !focusSet.has(node.id)) continue;

        const x = sx(pn.x);
        const y = sy(pn.y);
        if (x < -80 || y < -80 || x > w + 80 || y > h + 80) continue;

        candidates.push({
          pn,
          forced,
          text: clipSpaceLabel(node.label, nodeLabelBudget(cam.k, forced)),
          size: node.kind === "concept" ? 11.5 : 10.5,
        });
      }

      candidates.sort((a, b) => {
        if (a.forced !== b.forced) return a.forced ? -1 : 1;
        return b.pn.node.weight - a.pn.node.weight;
      });

      for (const c of candidates) {
        const node = c.pn.node;
        const x = sx(c.pn.x);
        const y = sy(c.pn.y);
        const profile = starProfile(node.id, node.radius, node.kind, cam.k);
        paintLabel(
          c.text,
          x + profile.glow * 0.56 + 5,
          y + 1,
          c.size,
          `${c.forced ? 600 : 500} ${c.size}px ${uiFace}`,
          c.forced
            ? palette.labelStrong
            : node.kind === "concept"
              ? palette.label
              : palette.labelDim,
          "left",
          alphaFor(node.id),
          c.forced,
        );
      }

      ctx.globalAlpha = 1;
      ctx.restore();
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [layout, model, nodeIndex, emphasis, selectedId, routeSet, routeEdgeSet, markDirty]);

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
        const r = starProfile(pn.node.id, pn.node.radius, pn.node.kind, cam.k).glow * 0.55 + 8;
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

  const pickCluster = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    for (let i = clusterHitsRef.current.length - 1; i >= 0; i -= 1) {
      const box = clusterHitsRef.current[i];
      if (px >= box.x0 && px <= box.x1 && py >= box.y0 && py <= box.y1) {
        return box;
      }
    }
    return null;
  }, []);

  // --- pointer interaction ------------------------------------------------

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
      const cluster = pickCluster(e.clientX, e.clientY);
      const hit = cluster ? null : pick(e.clientX, e.clientY);
      dragRef.current = {
        mode: hit ? "node" : "pan",
        nodeId: hit?.id ?? null,
        clusterIds: cluster?.memberIds ?? null,
        startX: e.clientX,
        startY: e.clientY,
        moved: false,
      };
      if (hit) {
        hit.fx = hit.x;
        hit.fy = hit.y;
        layout.simulation.alphaTarget(0.12).alpha(0.22).restart();
      }
      e.currentTarget.style.cursor = "grabbing";
    },
    [pick, pickCluster, layout],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const drag = dragRef.current;
      const cam = camRef.current;

      if (drag.mode === "none") {
        const cluster = pickCluster(e.clientX, e.clientY);
        const hit = cluster ? null : pick(e.clientX, e.clientY);
        const id = hit?.id ?? null;
        e.currentTarget.style.cursor = cluster || id ? "pointer" : "grab";
        if (id !== hoveredRef.current) {
          hoveredRef.current = id;
          markDirty();
          // Only on arriving at a new star; the event table throttles sweeps.
          if (id) emit({ type: "star", kind: "hover" });
          onHover(id ? { id, screenX: e.clientX, screenY: e.clientY } : null);
        } else if (id) {
          onHover({ id, screenX: e.clientX, screenY: e.clientY });
        } else if (!id && hoveredRef.current) {
          hoveredRef.current = null;
          markDirty();
          onHover(null);
        }
        return;
      }

      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) drag.moved = true;

      if (drag.mode === "pan") {
        camRef.current = { ...cam, x: cam.x - dx / cam.k, y: cam.y - dy / cam.k };
        drag.startX = e.clientX;
        drag.startY = e.clientY;
        markDirty();
      } else if (drag.nodeId) {
        const pn = nodeIndex.get(drag.nodeId);
        if (pn) {
          // Pin the handled star, then let its neighbours make room around it.
          pn.fx = pn.x + dx / cam.k;
          pn.fy = pn.y + dy / cam.k;
          drag.startX = e.clientX;
          drag.startY = e.clientY;
          layout.simulation.alphaTarget(0.12).restart();
          markDirty();
        }
      }
    },
    [pick, pickCluster, nodeIndex, layout, markDirty, onHover],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const drag = dragRef.current;
      if (!drag.moved) {
        if (drag.clusterIds?.length) {
          emit({ type: "cluster-focus" });
          fitTo(drag.clusterIds);
        } else {
          if (drag.nodeId) emit({ type: "star", kind: "select" });
          onSelect(drag.nodeId);
        }
      }
      if (drag.nodeId) {
        const pn = nodeIndex.get(drag.nodeId);
        if (pn) {
          // Retain the deliberate position for this session while the rest of
          // the graph quickly finds a calm arrangement around it.
          pn.fx = pn.x;
          pn.fy = pn.y;
        }
        layout.simulation.alphaTarget(0).alpha(0.16).restart();
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
      dragRef.current = { mode: "none", nodeId: null, clusterIds: null, startX: 0, startY: 0, moved: false };
      try {
        (e.target as HTMLCanvasElement).releasePointerCapture(e.pointerId);
      } catch {
        /* pointer already released */
      }
      e.currentTarget.style.cursor = stillUnder ? "pointer" : "grab";
    },
    [onSelect, fitTo, pick, pickCluster, nodeIndex, layout, markDirty, onHover],
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

  const onPointerLeave = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (hoveredRef.current) {
      hoveredRef.current = null;
      markDirty();
    }
    e.currentTarget.style.cursor = "grab";
    onHover(null);
  }, [markDirty, onHover]);

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

interface StarProfile { core: number; glow: number; opacity: number; rays: boolean }

function starProfile(id: string, radius: number, kind: "concept" | "resource", zoom: number): StarProfile {
  const variation = 0.76 + (hash(id, 19) % 250) / 1000;
  const familiarityCore = 1.55 + ((radius - 18) / 25) * 3.1;
  const core = Math.max(1.15, (kind === "concept" ? familiarityCore : 1.45) * variation * Math.sqrt(Math.max(zoom, 0.32)));
  return { core, glow: core * (kind === "concept" ? 6.2 : 4.4), opacity: kind === "concept" ? 0.78 + variation * 0.22 : 0.56 + variation * 0.18, rays: kind === "concept" && core > 3.8 };
}

function spaceTypeface(face: "display" | "ui"): string {
  const fallback =
    face === "display"
      ? '"Zen Maru Gothic", "M PLUS Rounded 1c", sans-serif'
      : '"Instrument Sans", system-ui, sans-serif';
  if (typeof document === "undefined") return fallback;
  const token = face === "display" ? "--font-display" : "--font-ui";
  const loaded = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  return loaded ? `${loaded}, ${fallback}` : fallback;
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  star: StarProfile,
  alpha: number,
  active: boolean,
  id: string,
  palette: SpacePalette,
) {
  const { r, g, b } = hexRgb(palette.star);
  const glow = ctx.createRadialGradient(x, y, 0, x, y, star.glow * (active ? 1.22 : 1));
  glow.addColorStop(0, `rgba(${r},${g},${b},${Math.min(1, star.opacity * alpha)})`);
  glow.addColorStop(0.12, `rgba(${r},${g},${b},${star.opacity * alpha * 0.72})`);
  glow.addColorStop(0.42, `rgba(${r},${g},${b},${star.opacity * alpha * 0.15})`);
  glow.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.globalAlpha = 1;
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, star.glow * (active ? 1.22 : 1), 0, Math.PI * 2);
  ctx.fill();
  if (star.rays) {
    const rayAngle = ((hash(id, 41) % 1000) / 1000) * Math.PI;
    ctx.globalAlpha = alpha * 0.22;
    ctx.strokeStyle = palette.star;
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
  ctx.fillStyle = palette.star;
  ctx.beginPath();
  ctx.arc(x, y, star.core, 0, Math.PI * 2);
  ctx.fill();
}
