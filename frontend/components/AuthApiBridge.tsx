"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect } from "react";
import { resolveLiveIdentity, setApiTokenGetter, USE_MOCK } from "@/lib/api";

export function AuthApiBridge({ children }: { children: React.ReactNode }) {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    setApiTokenGetter(() => getToken());
    return () => setApiTokenGetter(null);
  }, [getToken]);

  useEffect(() => {
    if (USE_MOCK || !isLoaded || !isSignedIn) return;
    void resolveLiveIdentity().catch(() => {
      // First Clerk visit can fail until Railway accepts this origin.
    });
  }, [isLoaded, isSignedIn]);

  return children;
}
