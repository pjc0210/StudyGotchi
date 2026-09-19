"use client";

import { useCallback, useEffect, useState } from "react";
import { Flag, Route } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { MOCK_TARGETS } from "@/lib/mock";
import { useStore } from "@/lib/store";
import type { StudyPlan as Plan } from "@/lib/types";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState, LoadingState } from "@/components/common/LoadingState";
import { StudyStepCard } from "./StudyStep";

export function StudyPlanPanel({
  onPlanLoaded,
}: {
  onPlanLoaded?: (conceptIds: string[]) => void;
}) {
  const { target, setTarget, selectedId, focusConcept } = useStore();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(
    (nextTarget: string) => {
      setLoading(true);
      setError(null);
      api
        .createStudyPlan(nextTarget)
        .then((res) => {
          setPlan(res);
          onPlanLoaded?.(res.steps.map((s) => s.concept_id));
        })
        .catch((err: unknown) =>
          setError(
            err instanceof ApiError ? err.message : "Could not generate a study plan.",
          ),
        )
        .finally(() => setLoading(false));
    },
    // onPlanLoaded is stable from the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    generate(target);
  }, [target, generate]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-line p-4">
        <label
          htmlFor="study-target"
          className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-faint"
        >
          <Flag size={11} aria-hidden />
          Target
        </label>
        <select
          id="study-target"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="h-8 w-full rounded-md border border-line-strong bg-raised px-2 text-[13px] text-ink"
        >
          {MOCK_TARGETS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <LoadingState label="Planning your route" />
        ) : error ? (
          <ErrorState message={error} onRetry={() => generate(target)} />
        ) : !plan || plan.steps.length === 0 ? (
          <EmptyState
            icon={<Route size={22} strokeWidth={1.5} />}
            title="No study path needed"
            body="The engine found no prerequisite chain to walk for this target."
          />
        ) : (
          <ol className="space-y-0 p-4">
            {plan.steps.map((step, i) => (
              <StudyStepCard
                key={step.concept_id}
                step={step}
                isLast={i === plan.steps.length - 1}
                selected={selectedId === step.concept_id}
                onSelect={() => focusConcept(step.concept_id)}
              />
            ))}
            <li className="pt-1">
              <div className="rounded-lg border border-dashed border-line-strong px-3 py-2.5 text-center">
                <span className="text-[12px] font-medium text-brand">{plan.target}</span>
              </div>
            </li>
          </ol>
        )}
      </div>
    </div>
  );
}
