import { useCallback, useEffect, useRef, useState } from "react";
import type { SpaceTheme } from "@/components/world/globe/globe-types";

export type SpaceThemePreference = "system" | SpaceTheme;
export type ResolvedSpaceTheme = SpaceTheme;

export const SPACE_THEME_STORAGE_KEY = "studygotchi:space-theme";

const DARK_SCHEME_QUERY = "(prefers-color-scheme: dark)";

export function resolveSpaceTheme(
  preference: SpaceThemePreference,
  systemDark: boolean,
): ResolvedSpaceTheme {
  return preference === "system" ? (systemDark ? "dark" : "light") : preference;
}

export function parseSpaceThemePreference(value: unknown): SpaceThemePreference {
  return value === "light" || value === "dark" || value === "system" ? value : "system";
}

function applySpaceTheme(theme: ResolvedSpaceTheme) {
  document.documentElement.dataset.spaceTheme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function useSpaceTheme(): {
  preference: SpaceThemePreference;
  resolved: ResolvedSpaceTheme;
  setPreference(next: SpaceThemePreference): void;
} {
  const [preference, setPreferenceState] = useState<SpaceThemePreference>("system");
  const [systemDark, setSystemDark] = useState(false);
  const preferenceRef = useRef<SpaceThemePreference>("system");
  const systemDarkRef = useRef(false);

  useEffect(() => {
    const media = window.matchMedia(DARK_SCHEME_QUERY);
    let storedPreference: SpaceThemePreference = "system";

    try {
      storedPreference = parseSpaceThemePreference(
        window.localStorage.getItem(SPACE_THEME_STORAGE_KEY),
      );
    } catch {
      // Storage can be unavailable in privacy-restricted browsing contexts.
    }

    preferenceRef.current = storedPreference;
    systemDarkRef.current = media.matches;
    setPreferenceState(storedPreference);
    setSystemDark(media.matches);
    applySpaceTheme(resolveSpaceTheme(storedPreference, media.matches));

    const handleSystemThemeChange = (event: MediaQueryListEvent) => {
      systemDarkRef.current = event.matches;
      setSystemDark(event.matches);

      if (preferenceRef.current === "system") {
        applySpaceTheme(resolveSpaceTheme("system", event.matches));
      }
    };

    media.addEventListener("change", handleSystemThemeChange);
    return () => media.removeEventListener("change", handleSystemThemeChange);
  }, []);

  const setPreference = useCallback((next: SpaceThemePreference) => {
    preferenceRef.current = next;
    setPreferenceState(next);
    applySpaceTheme(resolveSpaceTheme(next, systemDarkRef.current));

    try {
      window.localStorage.setItem(SPACE_THEME_STORAGE_KEY, next);
    } catch {
      // Keep the in-memory choice active when persistence is unavailable.
    }
  }, []);

  return {
    preference,
    resolved: resolveSpaceTheme(preference, systemDark),
    setPreference,
  };
}
