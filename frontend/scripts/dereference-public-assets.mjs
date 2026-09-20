/**
 * Vercel fails after `next build` when `public/assets` is a symlink to
 * `../../assets` (`Cannot copy '../../assets' to a subdirectory of itself`).
 * Put a real directory of runtime files at public/assets before the build.
 */
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  realpathSync,
  rmSync,
  unlinkSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const dest = resolve(dirname(fileURLToPath(import.meta.url)), "../public/assets");
const keep = ["audio", "biomes", "growth", "landmarks", "space", "QA.md"];
const keepCreatures = ["animated", "cc0", "tripo-cleaned"];

function resolveSource() {
  try {
    if (existsSync(dest) && lstatSync(dest).isSymbolicLink()) {
      return realpathSync(dest);
    }
  } catch {
    /* broken or missing symlink */
  }
  const candidates = [
    resolve(dirname(dest), "../../assets"),
    resolve(process.cwd(), "../assets"),
    resolve(process.cwd(), "assets"),
    "/vercel/assets",
  ];
  return candidates.find((path) => existsSync(path)) ?? null;
}

function materialize(source) {
  mkdirSync(dest, { recursive: true });
  for (const name of keep) {
    const from = join(source, name);
    if (!existsSync(from)) continue;
    cpSync(from, join(dest, name), { recursive: true, dereference: true });
  }
  const creaturesFrom = join(source, "creatures");
  if (existsSync(creaturesFrom)) {
    const creaturesTo = join(dest, "creatures");
    mkdirSync(creaturesTo, { recursive: true });
    for (const name of keepCreatures) {
      const from = join(creaturesFrom, name);
      if (!existsSync(from)) continue;
      cpSync(from, join(creaturesTo, name), { recursive: true, dereference: true });
    }
  }
}

if (!process.env.VERCEL && !process.env.FORCE_DEREF_ASSETS) {
  console.log("skip public/assets dereference (not on Vercel)");
  process.exit(0);
}

const source = resolveSource();

if (existsSync(dest) && lstatSync(dest).isSymbolicLink()) {
  unlinkSync(dest);
} else if (existsSync(dest) && !lstatSync(dest).isSymbolicLink()) {
  console.log("public/assets is already a real directory");
  process.exit(0);
}

if (!source) {
  mkdirSync(dest, { recursive: true });
  console.warn("Could not resolve assets source; left an empty public/assets directory");
  process.exit(0);
}

if (existsSync(dest)) {
  rmSync(dest, { recursive: true, force: true });
}

materialize(source);
console.log(`materialized public/assets from ${source}`);
