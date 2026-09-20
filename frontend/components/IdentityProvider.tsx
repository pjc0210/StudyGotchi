"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect } from "react";
import { api } from "@/lib/api";
import { DEV_STUDENT_ID, USE_MOCK } from "@/lib/config";
import { bearerAdapter, clearIdentity, receiveMe, setCredentials } from "@/lib/identity";

/**
 * The one place the site learns who is signed in. Clerk's token (or the dev
 * header) becomes the credential adapter, and `/api/me` fills the identity
 * store that every panel reads.
 */
export function IdentityProvider({ children }: { children: React.ReactNode }) {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (DEV_STUDENT_ID || USE_MOCK) return;
    setCredentials(bearerAdapter(() => getToken()));
    return () => setCredentials(null);
  }, [getToken]);

  const canAsk = !USE_MOCK && (DEV_STUDENT_ID ? true : isLoaded && isSignedIn);

  useEffect(() => {
    if (USE_MOCK) return;
    if (!canAsk) {
      if (isLoaded && !isSignedIn && !DEV_STUDENT_ID) clearIdentity();
      return;
    }
    let cancelled = false;
    api
      .getMe()
      .then((me) => {
        if (!cancelled) receiveMe(me);
      })
      .catch(() => {
        // The first visit from a new origin can fail until the API allows it; panels show the empty state.
      });
    return () => {
      cancelled = true;
    };
  }, [canAsk, isLoaded, isSignedIn]);

  return children;
}
