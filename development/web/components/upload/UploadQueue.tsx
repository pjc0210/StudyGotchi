"use client";

import { useStore } from "@/lib/kg/store";
import { UploadRow } from "./UploadItem";

export function UploadQueue() {
  const { uploads, clearFinishedUploads } = useStore();
  if (uploads.length === 0) return null;

  const finished = uploads.filter(
    (u) => u.status === "complete" || u.status === "failed",
  ).length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
          Queue
        </h3>
        {finished > 0 ? (
          <button
            type="button"
            onClick={clearFinishedUploads}
            className="text-[11px] text-ink-faint transition-colors hover:text-ink"
          >
            Clear finished
          </button>
        ) : null}
      </div>
      <ul className="max-h-[220px] space-y-1.5 overflow-y-auto">
        {uploads.map((u) => (
          <UploadRow key={u.id} item={u} />
        ))}
      </ul>
    </div>
  );
}
