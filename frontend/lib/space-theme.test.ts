import { describe, expect, it } from "vitest";
import { spacePalette } from "./graphTheme";
import { parseSpaceThemePreference, resolveSpaceTheme } from "./space-theme";

describe("space theme", () => {
  it("resolves system from media preference", () => {
    expect(resolveSpaceTheme("system", false)).toBe("light");
    expect(resolveSpaceTheme("system", true)).toBe("dark");
  });

  it("honors explicit overrides", () => {
    expect(resolveSpaceTheme("light", true)).toBe("light");
    expect(resolveSpaceTheme("dark", false)).toBe("dark");
  });

  it("rejects unknown persisted values", () => {
    expect(parseSpaceThemePreference("sepia")).toBe("system");
  });
});

describe("space palette", () => {
  it("keeps night type and constellation edges on cream, not ink", () => {
    const night = spacePalette("dark");
    const day = spacePalette("light");

    expect(night.label.startsWith("#")).toBe(true);
    expect(luminance(night.label)).toBeGreaterThan(luminance(day.label));
    expect(night.labelStrong).toBe("#fff6df");
    expect(night.edge).toContain("255, 246, 223");
    expect(night.edgeStrong).toContain("255, 246, 223");
    expect(day.edge).toContain("23, 21, 29");
  });
});

function luminance(hex: string): number {
  const n = hex.replace("#", "");
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
