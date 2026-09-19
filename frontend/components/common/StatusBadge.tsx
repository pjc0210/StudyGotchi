import {
  AlertTriangle,
  Check,
  CircleDot,
  Clock,
  HelpCircle,
  Sprout,
  TrendingUp,
} from "lucide-react";
import type { ConceptState } from "@/lib/types";
import { stateStyle } from "@/lib/graph";

const ICONS = {
  check: Check,
  trend: TrendingUp,
  alert: AlertTriangle,
  question: HelpCircle,
  clock: Clock,
  sprout: Sprout,
  dot: CircleDot,
} as const;

export function StateBadge({
  state,
  size = "md",
}: {
  state: ConceptState;
  size?: "sm" | "md";
}) {
  const style = stateStyle(state);
  const Icon = ICONS[style.icon];
  const small = size === "sm";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${
        small ? "px-1.5 py-[1px] text-[10px]" : "px-2 py-0.5 text-[11px]"
      } font-medium`}
      style={{
        color: `var(${style.token})`,
        borderColor: `color-mix(in oklab, var(${style.token}) 32%, transparent)`,
        background: `color-mix(in oklab, var(${style.token}) 10%, transparent)`,
      }}
    >
      <Icon size={small ? 10 : 11} strokeWidth={2.5} aria-hidden />
      {style.label}
    </span>
  );
}

const ORIGIN_LABELS: Record<string, string> = {
  instructor: "Instructor",
  ta: "TA",
  student_self: "My Material",
  classmate: "Classmate",
  external: "External",
};

export function originLabel(origin: string): string {
  return ORIGIN_LABELS[origin] ?? origin;
}

export function artifactLabel(type: string): string {
  return type
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function OriginChip({ origin }: { origin: string }) {
  const isSelf = origin === "student_self";
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-[1px] text-[10px] font-medium ${
        isSelf
          ? "bg-brand/12 text-brand"
          : "bg-line text-ink-dim"
      }`}
    >
      {originLabel(origin)}
    </span>
  );
}
