"use client";

import { FolderOpen } from "lucide-react";
import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { EmptyState } from "@/components/common/EmptyState";
import { SkeletonRows } from "@/components/common/LoadingState";
import { OriginChip, artifactLabel } from "@/components/common/StatusBadge";
import { UploadRow } from "@/components/upload/UploadItem";
import { fileGroup } from "@/lib/world/file-mark";
import { FileMark } from "./FileMark";

const SHELF_ORDER = ["Lectures", "Problem sets", "Exams", "Readings", "Your work", "Files"];

export function FileList({ onUploadClick }: { onUploadClick: () => void }) {
  const { uploads, resources, resourcesLoading, focusConcept } = useStore();
  const inFlight = uploads.filter((u) => u.status !== "complete");

  const shelves = useMemo(() => {
    const groups = new Map<string, typeof resources>();
    for (const resource of resources) {
      const shelf = fileGroup(resource.title, resource.artifact_type);
      const list = groups.get(shelf) ?? [];
      list.push(resource);
      groups.set(shelf, list);
    }
    return SHELF_ORDER.filter((name) => groups.has(name)).map((name) => ({
      name,
      files: groups.get(name)!,
    }));
  }, [resources]);

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
    <div className="sg-file-dock">
      {inFlight.length > 0 ? (
        <ul className="sg-file-queue">
          {inFlight.map((u) => (
            <UploadRow key={u.id} item={u} />
          ))}
        </ul>
      ) : null}

      {shelves.map((shelf) => (
        <section key={shelf.name} className="sg-file-shelf">
          <header>
            <h3>{shelf.name}</h3>
            <span>{shelf.files.length}</span>
          </header>
          <ul>
            {shelf.files.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  className="sg-file-row"
                  onClick={() => {
                    if (r.concept_ids[0]) focusConcept(r.concept_ids[0]);
                  }}
                >
                  <FileMark title={r.title} />
                  <div className="sg-file-copy">
                    <p className="sg-file-title">{r.title}</p>
                    <p className="sg-file-meta">
                      <OriginChip origin={r.origin} />
                      <span>{artifactLabel(r.artifact_type)}</span>
                    </p>
                  </div>
                  <div className="sg-file-count">
                    <p>{r.concept_count}</p>
                    <span>{r.status === "complete" ? "ideas" : r.status}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
