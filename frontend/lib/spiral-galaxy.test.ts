import { describe, expect, it } from "vitest";
import {
  paintSpiralGalaxy,
  SPIRAL_GALAXY_DEFAULTS,
  SPIRAL_PALETTE,
  spiralGalaxyPaths,
  spiralGalaxyRuns,
  spiralGalaxySvg,
} from "./spiral-galaxy";

const P = SPIRAL_PALETTE;

function count(cells: (string | null)[][]) {
  const tally = new Map<string | null, number>();
  for (const row of cells) for (const c of row) tally.set(c, (tally.get(c) ?? 0) + 1);
  return tally;
}

describe("generated pixel spiral", () => {
  const cells = paintSpiralGalaxy();
  const g = SPIRAL_GALAXY_DEFAULTS.grid;

  it("is deterministic for the same options", () => {
    expect(paintSpiralGalaxy()).toEqual(cells);
    expect(spiralGalaxySvg()).toBe(spiralGalaxySvg());
  });

  it("changes with the seed", () => {
    expect(paintSpiralGalaxy({ seed: 7 })).not.toEqual(cells);
  });

  it("is transparent outside the sky circle and opaque inside", () => {
    const half = g / 2;
    for (let y = 0; y < g; y++) {
      for (let x = 0; x < g; x++) {
        const nx = (x + 0.5 - half) / half;
        const ny = (y + 0.5 - half) / half;
        const inside = Math.hypot(nx, ny) <= 1;
        expect(cells[y][x] === null).toBe(!inside);
      }
    }
    expect(cells[0][0]).toBeNull();
    expect(cells[0][g - 1]).toBeNull();
    expect(cells[g - 1][0]).toBeNull();
  });

  it("uses the intended palette families: navy sky, lilac/gray/cyan arms, amber core, stars", () => {
    const tally = count(cells);
    const navy = (tally.get(P.navyDeep) ?? 0) + (tally.get(P.navy) ?? 0) + (tally.get(P.navyLight) ?? 0);
    const total = g * g - (tally.get(null) ?? 0);
    expect(navy / total).toBeGreaterThan(0.45);
    expect(tally.get(P.lilac)).toBeGreaterThan(40);
    expect(tally.get(P.gray)).toBeGreaterThan(20);
    expect(tally.get(P.cyan)).toBeGreaterThan(4);
    expect(tally.get(P.gold)).toBeGreaterThan(15);
    expect(tally.get(P.amber)).toBeGreaterThan(8);
    expect(tally.get(P.coreWhite)).toBeGreaterThan(10);
    expect((tally.get(P.star) ?? 0) + (tally.get(P.starBlue) ?? 0) + (tally.get(P.starWarm) ?? 0)).toBeGreaterThan(12);
  });

  it("keeps the warm core centred and the sky stars sparse", () => {
    const mid = g / 2;
    const centre = cells[mid][mid];
    expect([P.coreWhite, P.cream, P.gold]).toContain(centre);
    const starCells = count(cells);
    const stars = (starCells.get(P.star) ?? 0) + (starCells.get(P.starBlue) ?? 0) + (starCells.get(P.starWarm) ?? 0);
    expect(stars).toBeLessThan(80);
  });

  it("merges rows into runs that tile the painted cells exactly", () => {
    const runs = spiralGalaxyRuns(cells);
    const painted = g * g - (count(cells).get(null) ?? 0);
    expect(runs.reduce((sum, r) => sum + r.w, 0)).toBe(painted);
    for (const r of runs) {
      expect(r.x + r.w).toBeLessThanOrEqual(g);
      for (let i = 0; i < r.w; i++) expect(cells[r.y][r.x + i]).toBe(r.color);
    }
  });

  it("serialises to a small transparent SVG with one path per colour", () => {
    const svg = spiralGalaxySvg();
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    expect(svg).toContain(`viewBox="0 0 ${g} ${g}"`);
    expect(svg).toContain('shape-rendering="crispEdges"');
    expect(svg).toContain('aria-hidden="true"');
    expect(svg).not.toMatch(/<rect|<image|href=|data:/);
    expect(svg).not.toMatch(/<rect/);
    expect(svg.length).toBeLessThan(24_000);
    const paths = spiralGalaxyPaths();
    const colors = new Set(paths.map((p) => p.color));
    expect(colors.size).toBe(paths.length);
    expect((svg.match(/<path /g) ?? []).length).toBe(paths.length);
  });

  it("exposes a title and img role when labelled", () => {
    const svg = spiralGalaxySvg({}, "Spiral galaxy <sky>");
    expect(svg).toContain('role="img"');
    expect(svg).toContain("<title>Spiral galaxy sky</title>");
    expect(svg).not.toContain("aria-hidden");
  });
});
