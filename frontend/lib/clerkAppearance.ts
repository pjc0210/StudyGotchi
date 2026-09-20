/** Clerk's prebuilt screens in the paper palette, so sign-in reads as part of the site. */
export const clerkAppearance = {
  variables: {
    colorPrimary: "#4a433c",
    colorBackground: "#fbf6ee",
    colorText: "#4a433c",
    colorTextSecondary: "#7a7168",
    colorInputBackground: "#fffdf8",
    colorInputText: "#4a433c",
    colorNeutral: "#4a433c",
    borderRadius: "12px",
    fontFamily: "var(--font-outfit), system-ui, sans-serif",
  },
  elements: {
    card: { boxShadow: "none", border: "1px solid #e4d8c8" },
    headerTitle: { fontFamily: "var(--font-fraunces), Georgia, serif", fontWeight: 500 },
    formButtonPrimary: { borderRadius: "999px", textTransform: "none", fontSize: "15px" },
    footer: { background: "transparent" },
  },
} as const;
