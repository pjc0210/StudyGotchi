/**
 * Original, procedurally generated pixel-art spiral galaxy.
 *
 * Every cell is painted from a seeded field (log-spiral arms over a tilted
 * disc inside a navy sky circle). Nothing is sampled from a bitmap, so the
 * output is deterministic, transparent outside the circle, and tiny when
 * serialised: one SVG `<path>` per palette colour, runs merged per row.
 */

export interface SpiralGalaxyOptions {
  /** Cells across the square canvas. 64 keeps the SVG under ~20 KB. */
  grid?: number;
  /** Seed for the deterministic star and speckle placement. */
  seed?: number;
  /** Number of spiral arms. */
  arms?: number;
  /** Disc tilt in radians (rotation of the ellipse inside the circle). */
  tilt?: number;
  /** Minor/major axis ratio of the disc ellipse. */
  squash?: number;
  /** How tightly the arms wind (log-spiral pitch). */
  twist?: number;
  /** Sparse stars placed in the navy sky around the disc. */
  starCount?: number;
}

export interface PixelRun {
  x: number;
  y: number;
  w: number;
  color: string;
}

export interface SpiralGalaxyPath {
  color: string;
  d: string;
}

export const SPIRAL_GALAXY_DEFAULTS: Required<SpiralGalaxyOptions> = {
  grid: 64,
  seed: 0x5a1a,
  arms: 2,
  tilt: -0.42,
  squash: 0.6,
  twist: 3.7,
  starCount: 30,
};

/** Static export path (see scripts/export-spiral-svg.mts). */
export const SPIRAL_GALAXY_SVG_SRC = "/assets/space/studygotchi-spiral.svg";

export const SPIRAL_PALETTE = {
  navyDeep: "#131a3a",
  navy: "#1a2350",
  navyLight: "#243066",
  dustDark: "#3c3a6a",
  dust: "#5b5884",
  gray: "#8b899d",
  grayLight: "#aaa8ba",
  lilac: "#a99bd6",
  lilacLight: "#c6baec",
  cyan: "#8ad7ea",
  pink: "#e9a6c9",
  amberEdge: "#e58a2c",
  amber: "#f6ac3d",
  gold: "#ffd36a",
  cream: "#fff0c2",
  coreWhite: "#fffaf0",
  star: "#ffffff",
  starBlue: "#b8dcff",
  starWarm: "#ffe6a8",
} as const;

const P = SPIRAL_PALETTE;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable per-cell noise so a cell's speckle never depends on paint order. */
function cellNoise(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2246822519) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  return h / 4294967296;
}

function resolve(options: SpiralGalaxyOptions = {}): Required<SpiralGalaxyOptions> {
  return { ...SPIRAL_GALAXY_DEFAULTS, ...options };
}

/**
 * Paint the galaxy as a grid of colours. `null` cells are transparent
 * (everything outside the sky circle).
 */
export function paintSpiralGalaxy(options: SpiralGalaxyOptions = {}): (string | null)[][] {
  const o = resolve(options);
  const g = o.grid;
  const half = g / 2;
  const cos = Math.cos(o.tilt);
  const sin = Math.sin(o.tilt);
  const discScale = 0.94;
  const cells: (string | null)[][] = [];

  for (let y = 0; y < g; y++) {
    const row: (string | null)[] = [];
    for (let x = 0; x < g; x++) {
      const nx = (x + 0.5 - half) / half;
      const ny = (y + 0.5 - half) / half;
      const r = Math.hypot(nx, ny);
      if (r > 1) {
        row.push(null);
        continue;
      }

      const n = cellNoise(x, y, o.seed);

      // Disc space: rotate by tilt, stretch the minor axis back to a circle.
      const u = (nx * cos - ny * sin) / discScale;
      const v = (nx * sin + ny * cos) / (discScale * o.squash);
      const rho = Math.hypot(u, v);

      // Sky: deep navy that lifts slightly toward the rim, dithered at the seam.
      let sky: string = P.navyDeep;
      if (r > 0.86 || (r > 0.8 && n < 0.35)) sky = P.navy;
      if (r > 0.95 && n < 0.3) sky = P.navyLight;

      if (rho > 1.02) {
        row.push(sky);
        continue;
      }

      const phi = Math.atan2(v, u);
      let phase = ((phi - o.twist * Math.log(rho + 0.04)) * o.arms) % (Math.PI * 2);
      if (phase > Math.PI) phase -= Math.PI * 2;
      if (phase < -Math.PI) phase += Math.PI * 2;
      const armWidth = 1.05 + 0.4 * rho;
      const arm = Math.exp(-((phase / armWidth) ** 2));

      const bulge = Math.exp(-((rho / 0.18) ** 2));
      const disc = Math.exp(-((rho / 0.78) ** 2));
      const edge = rho > 0.88 ? Math.max(0, (1.02 - rho) / 0.14) : 1;
      let b =
        bulge * 1.7 +
        disc * (0.3 + 0.95 * arm) * edge +
        (n - 0.5) * 0.16 * disc;

      let color: string;
      if (b >= 1.5) color = P.coreWhite;
      else if (b >= 1.2) color = P.cream;
      else if (b >= 0.95) color = P.gold;
      else if (b >= 0.76) color = rho < 0.34 ? P.amber : P.lilacLight;
      else if (b >= 0.62) color = rho < 0.36 ? P.amberEdge : n < 0.5 ? P.lilacLight : P.grayLight;
      else if (b >= 0.5) color = n < 0.55 ? P.lilac : P.grayLight;
      else if (b >= 0.4) color = n < 0.5 ? P.gray : P.lilac;
      else if (b >= 0.3) color = P.dust;
      else if (b >= 0.2) color = P.dustDark;
      else if (b >= 0.12) color = P.navyLight;
      else color = sky;

      // Sparse accents riding the arms: cyan knots, a few white speckles, rare pink.
      if (arm > 0.55 && rho > 0.28 && rho < 0.9) {
        if (n > 0.985) color = P.star;
        else if (n > 0.955) color = P.cyan;
        else if (n > 0.945) color = P.pink;
      }

      row.push(color);
    }
    cells.push(row);
  }

  scatterStars(cells, o);
  return cells;
}

function scatterStars(cells: (string | null)[][], o: Required<SpiralGalaxyOptions>) {
  const g = o.grid;
  const half = g / 2;
  const cos = Math.cos(o.tilt);
  const sin = Math.sin(o.tilt);
  const rng = mulberry32(o.seed);
  const colors = [P.star, P.star, P.starBlue, P.starWarm, P.navyLight];
  let placed = 0;
  let plus = 0;
  let guard = 0;

  const isSky = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= g || y >= g) return false;
    const c = cells[y][x];
    return c === P.navyDeep || c === P.navy || c === P.navyLight;
  };

  while (placed < o.starCount && guard++ < o.starCount * 60) {
    const x = Math.floor(rng() * g);
    const y = Math.floor(rng() * g);
    const nx = (x + 0.5 - half) / half;
    const ny = (y + 0.5 - half) / half;
    if (Math.hypot(nx, ny) > 0.93) continue;
    const u = (nx * cos - ny * sin) / 0.94;
    const v = (nx * sin + ny * cos) / (0.94 * o.squash);
    if (Math.hypot(u, v) < 1.12) continue;
    if (!isSky(x, y)) continue;

    const color = colors[Math.floor(rng() * colors.length)];
    cells[y][x] = color;
    placed++;

    // Two or three "plus" stars, kept inside the circle and away from the disc.
    if (plus < 3 && rng() < 0.14 && color !== P.navyLight) {
      const arms: [number, number][] = [
        [x - 1, y],
        [x + 1, y],
        [x, y - 1],
        [x, y + 1],
      ];
      if (arms.every(([ax, ay]) => isSky(ax, ay))) {
        for (const [ax, ay] of arms) cells[ay][ax] = color === P.star ? P.starBlue : color;
        plus++;
      }
    }
  }
}

/** Merge horizontally adjacent same-colour cells into runs. */
export function spiralGalaxyRuns(cells: (string | null)[][]): PixelRun[] {
  const runs: PixelRun[] = [];
  for (let y = 0; y < cells.length; y++) {
    const row = cells[y];
    let x = 0;
    while (x < row.length) {
      const color = row[x];
      if (color === null) {
        x++;
        continue;
      }
      let w = 1;
      while (x + w < row.length && row[x + w] === color) w++;
      runs.push({ x, y, w, color });
      x += w;
    }
  }
  return runs;
}

/** One compact path per colour, ready for `<path d fill>`. */
export function spiralGalaxyPaths(options: SpiralGalaxyOptions = {}): SpiralGalaxyPath[] {
  const byColor = new Map<string, string[]>();
  for (const run of spiralGalaxyRuns(paintSpiralGalaxy(options))) {
    const parts = byColor.get(run.color) ?? [];
    parts.push(`M${run.x} ${run.y}h${run.w}v1h-${run.w}z`);
    byColor.set(run.color, parts);
  }
  return [...byColor.entries()].map(([color, parts]) => ({ color, d: parts.join("") }));
}

/** Full standalone SVG document with a transparent background. */
export function spiralGalaxySvg(options: SpiralGalaxyOptions = {}, title?: string): string {
  const o = resolve(options);
  const paths = spiralGalaxyPaths(o)
    .map((p) => `<path fill="${p.color}" d="${p.d}"/>`)
    .join("");
  const head = title
    ? `<title>${title.replace(/[<&>]/g, "")}</title>`
    : "";
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${o.grid} ${o.grid}" ` +
    `width="${o.grid}" height="${o.grid}" shape-rendering="crispEdges"` +
    `${title ? ' role="img"' : ' aria-hidden="true"'}>${head}${paths}</svg>`
  );
}
