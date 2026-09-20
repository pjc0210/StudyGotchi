import type { CSSProperties } from "react";
import { SPIRAL_SPIN_PERIOD_MS } from "@/lib/space-field";
import {
  SPIRAL_GALAXY_DEFAULTS,
  spiralGalaxyPaths,
  type SpiralGalaxyOptions,
  type SpiralGalaxyPath,
} from "@/lib/spiral-galaxy";
import "./generated-pixel-spiral.css";

export interface GeneratedPixelSpiralProps extends SpiralGalaxyOptions {
  /** Rendered width/height in CSS pixels. */
  size?: number;
  /** Final opacity. Below ~0.5 the arms vanish against either sky. */
  opacity?: number;
  /**
   * Slow CSS rotation. `true` uses one revolution per `SPIRAL_SPIN_PERIOD_MS`
   * (48 s); a number sets the period in milliseconds; `false` renders static.
   * Honours `prefers-reduced-motion: reduce` automatically.
   */
  spin?: boolean | number;
  /**
   * Accessible name. Omit for purely decorative use (default): the SVG is then
   * hidden from assistive tech with `aria-hidden`.
   */
  label?: string;
  className?: string;
  style?: CSSProperties;
}

const DEFAULT_PERIOD_MS = SPIRAL_SPIN_PERIOD_MS;

/* Paths are pure functions of their options; memoise per option set so
   repeated renders (and SSR + hydration) do not repaint the grid. */
const cache = new Map<string, SpiralGalaxyPath[]>();
function pathsFor(options: Required<SpiralGalaxyOptions>): SpiralGalaxyPath[] {
  const key = JSON.stringify(options);
  let paths = cache.get(key);
  if (!paths) {
    paths = spiralGalaxyPaths(options);
    cache.set(key, paths);
  }
  return paths;
}

/**
 * Original procedurally generated pixel-art spiral galaxy, rendered as an
 * inline SVG with a transparent background. Safe in server and client trees;
 * output is deterministic so there is no hydration mismatch.
 */
export function GeneratedPixelSpiral({
  size = 112,
  opacity = 0.68,
  spin = true,
  label,
  className,
  style,
  grid,
  seed,
  arms,
  tilt,
  squash,
  twist,
  starCount,
}: GeneratedPixelSpiralProps) {
  const options: Required<SpiralGalaxyOptions> = {
    ...SPIRAL_GALAXY_DEFAULTS,
    ...(grid !== undefined && { grid }),
    ...(seed !== undefined && { seed }),
    ...(arms !== undefined && { arms }),
    ...(tilt !== undefined && { tilt }),
    ...(squash !== undefined && { squash }),
    ...(twist !== undefined && { twist }),
    ...(starCount !== undefined && { starCount }),
  };
  const paths = pathsFor(options);
  const period = typeof spin === "number" ? spin : DEFAULT_PERIOD_MS;
  const spinning = spin !== false && period > 0;

  const vars = {
    "--sg-spiral-size": `${size}px`,
    "--sg-spiral-opacity": String(opacity),
    "--sg-spiral-period": `${period}ms`,
    ...style,
  } as CSSProperties;

  const classes = ["sg-pixel-spiral", spinning && "sg-pixel-spiral--spin", className]
    .filter(Boolean)
    .join(" ");

  return (
    <svg
      className={classes}
      style={vars}
      viewBox={`0 0 ${options.grid} ${options.grid}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      {label ? <title>{label}</title> : null}
      {paths.map((p) => (
        <path key={p.color} fill={p.color} d={p.d} />
      ))}
    </svg>
  );
}

export default GeneratedPixelSpiral;
