import { describe, expect, it } from "vitest";
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
