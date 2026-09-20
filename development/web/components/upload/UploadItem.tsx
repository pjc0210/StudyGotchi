import { AlertCircle, Check, FileArchive, FileText, Loader2 } from "lucide-react";
import type { UploadItem as Item, UploadStatus } from "@/lib/kg/types";
import { artifactLabel, originLabel } from "@/components/common/StatusBadge";

const STATUS_LABEL: Record<UploadStatus, string> = {
  queued: "Queued",
  uploading: "Uploading…",
  processing: "Processing…",
  complete: "Complete",
  failed: "Failed",
};

function StatusIcon({ status }: { status: UploadStatus }) {
  if (status === "complete")
    return <Check size={13} className="text-state-mastered" aria-hidden />;
  if (status === "failed")
    return <AlertCircle size={13} className="text-state-fragile" aria-hidden />;
  if (status === "queued")
    return <span className="h-1.5 w-1.5 rounded-full bg-ink-faint" aria-hidden />;
  return <Loader2 size={13} className="animate-spin text-ink-dim" aria-hidden />;
}

export function UploadRow({ item }: { item: Item }) {
  const isZip = item.filename.toLowerCase().endsWith(".zip");
  const Icon = isZip ? FileArchive : FileText;

  const failed = item.status === "failed";

  // Always fall back to the status word: a failure must never be signalled by
  // the red icon alone.
  const detail =
    item.status === "processing" && item.child_count
      ? `Processing ${item.child_count} files…`
      : item.status === "complete" && item.concepts_extracted
        ? `${item.concepts_extracted} concepts extracted`
        : STATUS_LABEL[item.status];

  return (
    <li className="flex items-start gap-2.5 rounded-md border border-line bg-raised/50 px-2.5 py-2">
      <Icon size={14} strokeWidth={1.75} className="mt-0.5 shrink-0 text-ink-faint" aria-hidden />

      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] text-ink">{item.filename}</p>
        <p className="truncate text-[11px] text-ink-faint">
          {originLabel(item.origin)} · {artifactLabel(item.artifact_type)}
        </p>
        {/* A long rejection reason gets its own line so it cannot squeeze the
            filename or overflow a narrow panel. */}
        {failed && item.error ? (
          <p className="mt-1 text-[11px] leading-snug text-state-fragile">{item.error}</p>
        ) : null}
      </div>

      <div
        className="flex shrink-0 items-center gap-1.5 pt-0.5"
        role="status"
        aria-live="polite"
      >
        <StatusIcon status={item.status} />
        <span className={`text-[11px] ${failed ? "text-state-fragile" : "text-ink-dim"}`}>
          {detail}
        </span>
      </div>
    </li>
  );
}
