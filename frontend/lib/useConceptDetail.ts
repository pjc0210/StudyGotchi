"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "./api";
import type { ConceptDetail, WhyExplanation } from "./types";

export interface ConceptDetailState {
  detail: ConceptDetail | null;
  why: WhyExplanation | null;
  loading: boolean;
  error: string | null;
}

const IDLE: ConceptDetailState = { detail: null, why: null, loading: false, error: null };

/**
 * The evidence and provenance behind one concept, for whichever inspector is
 * showing it. Cancels a stale load when the id changes so a slow answer never
 * lands on the wrong card.
 */
export function useConceptDetail(conceptId: string | null): ConceptDetailState {
  const [state, setState] = useState<ConceptDetailState>(IDLE);

  useEffect(() => {
    if (!conceptId) {
      setState(IDLE);
      return;
    }
    let cancelled = false;
    setState({ detail: null, why: null, loading: true, error: null });

    Promise.all([api.getConceptDetail(conceptId), api.getWhy(conceptId).catch(() => null)])
      .then(([detail, why]) => {
        if (!cancelled) setState({ detail, why, loading: false, error: null });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({
          detail: null,
          why: null,
          loading: false,
          error: err instanceof ApiError ? err.message : "Could not load this concept.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [conceptId]);

  return state;
}
