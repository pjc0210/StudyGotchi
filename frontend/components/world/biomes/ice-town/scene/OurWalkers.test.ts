import { describe, expect, it } from "vitest";
import { creatureMeta, creatureUrl } from "@/lib/world/roster";
import { ICE_CAST } from "./OurWalkers";
import { WALKER_DISTRICTS } from "./parade";

describe("ice walkers", () => {
  it("places our roster and guest bodies, not stock hats", () => {
    expect(ICE_CAST).toHaveLength(9);
    expect(ICE_CAST.map((member) => member.id)).toEqual(
      expect.arrayContaining(["blob-ice-2", "tripo-creature-18", "gobkit-minion-c02", "kenney-penguin"]),
    );
    expect(ICE_CAST.map((member) => member.district)).toEqual([...WALKER_DISTRICTS]);
    for (const member of ICE_CAST) {
      expect(creatureMeta(member.id)).toBeTruthy();
      expect(creatureUrl(member.id)).toMatch(/^\/assets\/creatures\//);
    }
  });
});
