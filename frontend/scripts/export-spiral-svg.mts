/**
 * Write the generated pixel spiral to a static SVG so it can be used as an
 * `<img>`/CSS background without React.
 *
 *   node --no-warnings scripts/export-spiral-svg.mts [out-path]
 *
 * Default output: public/assets/space/studygotchi-spiral.svg
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spiralGalaxySvg } from "../lib/spiral-galaxy.ts";

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(process.argv[2] ?? resolve(here, "../public/assets/space/studygotchi-spiral.svg"));
const svg = spiralGalaxySvg();

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${svg}\n`);
console.log(`wrote ${out} (${svg.length} bytes)`);
