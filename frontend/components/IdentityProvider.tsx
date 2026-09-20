"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect } from "react";
import { api } from "@/lib/api";
import { DEV_STUDENT_ID, USE_MOCK } from "@/lib/config";
import { DEMO_COURSES, DEMO_STUDENT_ID } from "@/lib/world/demo-courses";
import { bearerAdapter, receiveMe, setCredentials } from "@/lib/identity";

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
    receiveMe(
      { student_id: DEV_STUDENT_ID || DEMO_STUDENT_ID, courses: DEMO_COURSES },
      DEMO_COURSES,
    );
    if (USE_MOCK || !canAsk) return;
    let cancelled = false;
    const load = async () => {
      const catalog = await api.listCourses().catch(() => []);
      try {
        const me = await api.getMe();
        if (!cancelled) receiveMe(me, catalog);
      } catch {
        if (!cancelled) {
          receiveMe(
            { student_id: DEV_STUDENT_ID || DEMO_STUDENT_ID, courses: DEMO_COURSES },
            catalog,
          );
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [canAsk, isLoaded, isSignedIn]);

  return children;
}
