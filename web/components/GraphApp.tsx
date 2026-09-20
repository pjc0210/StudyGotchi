"use client";

import { StudyGotchiProvider } from "@/lib/kg/store";
import { AppShell } from "@/components/layout/AppShell";

/**
 * The full ported knowledge-graph app, scoped to just this route - not
 * wrapped at the dashboard's root layout, since Earth/World/auth pages have
 * no use for its provider and its env-driven course/student identity.
 */
export function GraphApp() {
  return (
    <StudyGotchiProvider>
      <AppShell />
    </StudyGotchiProvider>
  );
}
