import { FileText } from "lucide-react";
import type { Resource } from "@/lib/types";
import { OriginChip, artifactLabel } from "@/components/common/StatusBadge";

export function ResourceList({ resources }: { resources: Resource[] }) {
  if (resources.length === 0) {
    return <p className="text-[13px] text-ink-faint">No resources linked yet.</p>;
  }

  return (
    <ul className="space-y-1.5">
      {resources.map((r) => (
        <li
          key={`${r.id}-${r.role ?? ""}`}
          className="flex items-start gap-2.5 rounded-md px-1 py-1.5"
        >
          <FileText
            size={13}
            strokeWidth={1.75}
            className="mt-[3px] shrink-0 text-ink-faint"
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] text-ink">{r.title}</p>
            <p className="text-[11px] text-ink-faint">
              {r.role ?? artifactLabel(r.artifact_type)}
            </p>
          </div>
          <OriginChip origin={r.origin} />
        </li>
      ))}
    </ul>
  );
}
