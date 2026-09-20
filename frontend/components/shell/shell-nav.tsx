"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

/** How long a page gets to play its exit before the route changes under it. */
const LEAVE_MS = 720;
const LEAVE_REDUCED_MS = 100;

interface ShellNav {
  /** True inside the product shell, where World and Space share a header and a sky. */
  available: boolean;
  /** The route being left for, while the exit animation plays. */
  leavingTo: string | null;
  /** Navigate with an exit beat: pages read `leavingTo` and animate out first. */
  go(href: string): void;
}

const ShellNavContext = createContext<ShellNav>({ available: false, leavingTo: null, go: () => {} });

export function ShellNavProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [leavingTo, setLeavingTo] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Arrival clears the exit state in the same commit that mounts the new page.
  useEffect(() => {
    setLeavingTo(null);
  }, [pathname]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const go = useCallback(
    (href: string) => {
      if (href === pathname || leavingTo) return;
      router.prefetch(href);
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      setLeavingTo(href);
      timer.current = setTimeout(() => router.push(href), reduced ? LEAVE_REDUCED_MS : LEAVE_MS);
    },
    [pathname, leavingTo, router],
  );

  const value = useMemo<ShellNav>(() => ({ available: true, leavingTo, go }), [leavingTo, go]);

  return <ShellNavContext.Provider value={value}>{children}</ShellNavContext.Provider>;
}

export function useShellNav(): ShellNav {
  return useContext(ShellNavContext);
}
