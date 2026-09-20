"use client";

import type { ReactNode } from "react";
import { ProductHeader } from "./ProductHeader";
import { ShellNavProvider, useShellNav } from "./shell-nav";
import { SpaceField } from "./SpaceField";

function ShellPage({ children }: { children: ReactNode }) {
  const { leavingTo } = useShellNav();
  return (
    <div className="sg-page" data-leaving={leavingTo ? "" : undefined}>
      {children}
    </div>
  );
}

/**
 * The room both product pages sit in: one sky, one header, one page at a time,
 * locked to the viewport. World and Space swap inside it; the sky and the
 * header never remount.
 */
export function ProductShell({ children }: { children: ReactNode }) {
  return (
    <ShellNavProvider>
      <div className="sg-shell">
        <SpaceField />
        <ShellPage>{children}</ShellPage>
        <ProductHeader />
      </div>
    </ShellNavProvider>
  );
}
