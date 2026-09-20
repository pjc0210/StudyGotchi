import type { BiomeId } from "./types";

type Archetype = "blob" | "bean" | "bird" | "biped" | "sprite";
type Personality = "sleepy" | "bold" | "curious" | "grumpy" | "shy";

/**
 * Extra bodies on the island besides the in-house animated roster.
 * Tripo = cleaned Pokémon-inspired pack + the rat. Kenney / Gobkit / Polypizza are CC0.
 * Gobkit minions stand in for the Mario-like goofy ones — we do not ship Nintendo meshes.
 */
export type GuestPack = "tripo" | "kenney" | "gobkit" | "polypizza";

export interface GuestCreature {
  id: string;
  pack: GuestPack;
  url: string;
  archetype: Archetype;
  biome: BiomeId;
  personality: Personality;
  height: number;
  scale: number;
  happyVariant: string;
}

function guest(
  pack: GuestPack,
  id: string,
  url: string,
  biome: BiomeId,
  opts: Partial<Pick<GuestCreature, "archetype" | "personality" | "height" | "scale" | "happyVariant">> = {},
): GuestCreature {
  return {
    id,
    pack,
    url,
    archetype: opts.archetype ?? "bean",
    biome,
    personality: opts.personality ?? "curious",
    height: opts.height ?? 0.8,
    scale: opts.scale ?? 1,
    happyVariant: opts.happyVariant ?? "pounce",
  };
}

const TRIPO_BIOME: Record<string, BiomeId> = {
  "tripo-mouse": "city",
  "tripo-creature-01": "forest",
  "tripo-creature-02": "forest",
  "tripo-creature-03": "forest",
  "tripo-creature-04": "forest",
  "tripo-creature-05": "forest",
  "tripo-creature-06": "forest",
  "tripo-creature-07": "forest",
  "tripo-creature-08": "forest",
  "tripo-creature-09": "forest",
  "tripo-creature-10": "city",
  "tripo-creature-11": "city",
  "tripo-creature-12": "city",
  "tripo-creature-13": "city",
  "tripo-creature-14": "city",
  "tripo-creature-15": "city",
  "tripo-creature-16": "city",
  "tripo-creature-17": "city",
  "tripo-creature-18": "ice",
  "tripo-creature-19": "ice",
  "tripo-creature-20": "ice",
  "tripo-creature-21": "ice",
  "tripo-creature-22": "ice",
  "tripo-creature-23": "ice",
  "tripo-creature-24": "ice",
  "tripo-creature-25": "ice",
  "tripo-creature-26": "sand",
  "tripo-creature-27": "sand",
  "tripo-creature-28": "sand",
  "tripo-creature-29": "sand",
  "tripo-creature-30": "sand",
  "tripo-creature-31": "sand",
  "tripo-creature-32": "sand",
  "tripo-creature-33": "sand",
  "tripo-creature-34": "meadow",
  "tripo-creature-35": "meadow",
  "tripo-creature-36": "meadow",
  "tripo-creature-37": "meadow",
  "tripo-creature-38": "meadow",
  "tripo-creature-39": "meadow",
  "tripo-creature-40": "meadow",
  "tripo-creature-41": "meadow",
  "tripo-creature-42": "meadow",
  "tripo-creature-43": "city",
  "tripo-creature-44": "forest",
  "tripo-creature-45": "ice",
  "tripo-creature-46": "sand",
  "tripo-creature-47": "meadow",
};

const TRIPO_IDS = ["tripo-mouse", ...Array.from({ length: 47 }, (_, i) => `tripo-creature-${String(i + 1).padStart(2, "0")}`)];

const TRIPO_GUESTS: GuestCreature[] = TRIPO_IDS.map((id) =>
  guest("tripo", id, `/assets/creatures/tripo-cleaned/textured/${id}.glb`, TRIPO_BIOME[id] ?? "meadow", {
    personality: id === "tripo-mouse" ? "bold" : "curious",
    scale: 0.95,
  }),
);

function kenney(name: string, biome: BiomeId, personality: Personality = "curious"): GuestCreature {
  return guest("kenney", `kenney-${name}`, `/assets/creatures/cc0/kenney-cube-pets/animal-${name}.glb`, biome, {
    archetype: "blob",
    personality,
    scale: 1,
    happyVariant: "double_bounce",
  });
}

function gobkit(file: string, biome: BiomeId, personality: Personality = "curious", archetype: Archetype = "biped"): GuestCreature {
  const slug = file.replace(/\.glb$/i, "").toLowerCase();
  return guest("gobkit", `gobkit-${slug}`, `/assets/creatures/cc0/gobkit/${file}`, biome, {
    archetype,
    personality,
    scale: 0.88,
    happyVariant: "jump_spin",
  });
}

function pizza(file: string, biome: BiomeId, personality: Personality = "curious"): GuestCreature {
  const slug = file.replace(/\.glb$/i, "").toLowerCase();
  return guest("polypizza", `pizza-${slug}`, `/assets/creatures/cc0/polypizza/${file}`, biome, {
    archetype: "blob",
    personality,
    scale: 0.95,
    happyVariant: "double_bounce",
  });
}

const CC0_GUESTS: GuestCreature[] = [
  kenney("deer", "forest", "shy"),
  kenney("fox", "forest", "curious"),
  kenney("bunny", "forest", "shy"),
  kenney("monkey", "forest", "bold"),
  kenney("koala", "forest", "sleepy"),
  kenney("parrot", "forest", "bold"),
  kenney("beaver", "forest", "grumpy"),
  kenney("cat", "city", "curious"),
  kenney("dog", "city", "bold"),
  kenney("hog", "city", "grumpy"),
  kenney("panda", "city", "sleepy"),
  kenney("polar", "ice", "shy"),
  kenney("penguin", "ice", "curious"),
  kenney("tiger", "sand", "bold"),
  kenney("lion", "sand", "bold"),
  kenney("giraffe", "sand", "shy"),
  kenney("elephant", "sand", "sleepy"),
  kenney("crab", "sand", "grumpy"),
  kenney("chick", "meadow", "curious"),
  kenney("cow", "meadow", "sleepy"),
  kenney("pig", "meadow", "bold"),
  kenney("bee", "meadow", "curious"),
  kenney("caterpillar", "meadow", "shy"),
  kenney("fish", "sand", "curious"),

  gobkit("Owl.glb", "forest", "sleepy", "bird"),
  gobkit("Marmot.glb", "forest", "grumpy"),
  gobkit("Goat.glb", "forest", "bold"),
  gobkit("Duck.glb", "forest", "curious", "bird"),
  gobkit("Bee.glb", "forest", "curious", "sprite"),
  gobkit("Rat.glb", "city", "bold"),
  gobkit("Corgi.glb", "city", "curious"),
  gobkit("minion-a01.glb", "city", "bold", "blob"),
  gobkit("minion-a02.glb", "city", "curious", "blob"),
  gobkit("Red.glb", "city", "grumpy", "sprite"),
  gobkit("Blue.glb", "city", "shy", "sprite"),
  gobkit("Seal.glb", "ice", "sleepy"),
  gobkit("Owl.glb", "ice", "shy", "bird"),
  gobkit("Hippo.glb", "sand", "sleepy"),
  gobkit("Goat.glb", "sand", "grumpy"),
  gobkit("Platypus.glb", "sand", "curious"),
  gobkit("Duck.glb", "meadow", "curious", "bird"),
  gobkit("Corgi.glb", "meadow", "bold"),
  gobkit("Bee.glb", "meadow", "curious", "sprite"),
  gobkit("Platypus.glb", "meadow", "shy"),
  gobkit("Jellyfish.glb", "sand", "shy", "sprite"),
  gobkit("Fugu.glb", "sand", "grumpy", "blob"),
  gobkit("Bat.glb", "city", "grumpy", "bird"),
  gobkit("minion-c01.glb", "meadow", "bold", "blob"),
  gobkit("minion-c02.glb", "ice", "curious", "blob"),
  gobkit("minion-d01.glb", "forest", "grumpy", "blob"),

  pizza("Hedgehog.glb", "forest", "shy"),
  pizza("Frog.glb", "forest", "curious"),
  pizza("Frog.glb", "meadow", "curious"),
  pizza("Chick.glb", "meadow", "bold"),
  pizza("Bunny.glb", "meadow", "shy"),
  pizza("ShibaInu.glb", "meadow", "curious"),
  pizza("Chick.glb", "ice", "shy"),
  pizza("ShibaInu.glb", "city", "bold"),
];

function uniqueId(g: GuestCreature, seen: Set<string>): GuestCreature {
  if (!seen.has(g.id)) {
    seen.add(g.id);
    return g;
  }
  const id = `${g.id}-${g.biome}`;
  seen.add(id);
  return { ...g, id };
}

const seen = new Set<string>();
export const GUESTS: GuestCreature[] = [...TRIPO_GUESTS, ...CC0_GUESTS].map((g) => uniqueId(g, seen));
export const GUEST_BY_ID: Record<string, GuestCreature> = Object.fromEntries(GUESTS.map((g) => [g.id, g]));

export function isGuestId(id: string): boolean {
  return Object.prototype.hasOwnProperty.call(GUEST_BY_ID, id);
}

const HEROES: Partial<Record<BiomeId, string[]>> = {
  city: ["tripo-mouse", "gobkit-rat"],
  meadow: ["tripo-mouse"],
};

export function guestsFor(biome: BiomeId): string[] {
  const heroes = HEROES[biome] ?? [];
  const rest = GUESTS.filter((g) => g.biome === biome && !heroes.includes(g.id)).map((g) => g.id);
  return [...heroes.filter((id) => GUEST_BY_ID[id]), ...rest];
}
