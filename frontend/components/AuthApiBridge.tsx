"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect } from "react";
import { DEV_STUDENT_ID, resolveLiveIdentity, setApiTokenGetter, USE_MOCK } from "@/lib/api";

export function AuthApiBridge({ children }: { children: React.ReactNode }) {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    setApiTokenGetter(() => getToken());
    return () => setApiTokenGetter(null);
  }, [getToken]);

  // Live mode learns who is calling from /api/me: after Clerk signs in, or
  // straight away in the local sandbox where the API trusts X-Student-Id.
  const ready = USE_MOCK ? false : DEV_STUDENT_ID ? true : isLoaded && isSignedIn;

  useEffect(() => {
    if (!ready) return;
    void resolveLiveIdentity().catch(() => {
      // The first visit from a new origin can fail until the API allows it.
    });
  }, [ready]);

  return children;
}
