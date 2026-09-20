"use client";

import { FileArchive, FileText, FolderOpen } from "lucide-react";
import { useStore } from "@/lib/kg/store";
import { EmptyState } from "@/components/common/EmptyState";
import { SkeletonRows } from "@/components/common/LoadingState";
import { OriginChip, artifactLabel } from "@/components/common/StatusBadge";
import { UploadRow } from "@/components/upload/UploadItem";

export function FileList({ onUploadClick }: { onUploadClick: () => void }) {
  const { uploads, resources, resourcesLoading } = useStore();
  // Anything not yet settled into the resource list - still processing, or
  // rejected - shows above it, rendered by the same row as the upload queue so
  // the two views can never disagree about what a status looks like.
  const inFlight = uploads.filter((u) => u.status !== "complete");

  if (resourcesLoading) return <SkeletonRows rows={5} />;

  if (resources.length === 0 && inFlight.length === 0) {
    return (
      <EmptyState
        icon={<FolderOpen size={24} strokeWidth={1.5} />}
        title="No materials yet"
        body="Upload lectures, problem sets, or your own notes to start building the graph."
        action={
          <button
            type="button"
            onClick={onUploadClick}
            className="rounded-md bg-ink px-3 py-1.5 text-[13px] font-medium text-canvas"
          >
            Upload files
          </button>
        }
      />
    );
  }

  return (
    <div className="p-4">
      {inFlight.length > 0 ? (
        <ul className="mb-4 space-y-1.5">
          {inFlight.map((u) => (
            <UploadRow key={u.id} item={u} />
          ))}
        </ul>
      ) : null}

      <ul className="space-y-1.5">
        {resources.map((r) => {
          const Icon = r.artifact_type === "course_bundle" ? FileArchive : FileText;
          return (
            <li
              key={r.id}
              className="flex items-center gap-3 rounded-lg border border-line bg-raised/40 px-3 py-2.5"
            >
              <Icon
                size={14}
                strokeWidth={1.75}
                className="shrink-0 text-ink-faint"
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] text-ink">{r.title}</p>
                <p className="flex items-center gap-1.5 text-[11px] text-ink-faint">
                  <OriginChip origin={r.origin} />
                  <span>{artifactLabel(r.artifact_type)}</span>
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-mono text-[13px] tabular-nums text-ink">
                  {r.concept_count}
                </p>
                <p className="text-[10px] text-ink-faint">
                  {r.status === "complete" ? "concepts" : r.status}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
