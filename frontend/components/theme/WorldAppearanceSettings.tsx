"use client";

import { useSpaceTheme, type SpaceThemePreference } from "@/lib/space-theme";

const SPACE_THEME_OPTIONS = ["system", "light", "dark"] as const;

function preferenceLabel(preference: SpaceThemePreference) {
  return preference[0].toUpperCase() + preference.slice(1);
}

export function WorldAppearanceSettings() {
  const { preference, setPreference } = useSpaceTheme();

  return (
    <fieldset className="space-theme-settings">
      <legend>World background</legend>
      <div className="space-theme-options">
        {SPACE_THEME_OPTIONS.map((value) => (
          <label key={value}>
            <input
              type="radio"
              name="world-background"
              value={value}
              checked={preference === value}
              onChange={() => setPreference(value)}
            />
            {preferenceLabel(value)}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
