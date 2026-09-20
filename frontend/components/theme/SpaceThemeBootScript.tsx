const SPACE_THEME_BOOT_SCRIPT = `
  (function () {
    var systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    var preference = "system";

    try {
      preference = window.localStorage.getItem("studygotchi:space-theme") || "system";
    } catch (_) {}

    var theme =
      preference === "light" || preference === "dark"
        ? preference
        : systemDark
          ? "dark"
          : "light";

    document.documentElement.dataset.spaceTheme = theme;
    document.documentElement.style.colorScheme = theme;
  })();
`;

export function SpaceThemeBootScript() {
  return <script dangerouslySetInnerHTML={{ __html: SPACE_THEME_BOOT_SCRIPT }} />;
}
