"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { api, ApiError, isIdentityReady, isStudentScoped, onIdentityChange, USE_MOCK } from "./api";
import type { ArtifactType, CourseResource, KnowledgeGraphResponse, SourceOrigin, StudyTarget, UploadItem } from "./types";

export const ACCEPTED_EXTENSIONS = [".pdf", ".zip", ".png", ".jpg", ".jpeg", ".webp", ".md", ".txt", ".docx"] as const;

export function isAcceptedFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

// How often the queue asks the engine about a file it is still reading.
const STATUS_POLL_MS = 1500;
const STATUS_POLL_LIMIT = 120;

interface Async<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface StoreValue {
  graph: Async<KnowledgeGraphResponse>;
  reloadGraph: () => void;

  /** Ingested files. Shared by the graph and the Files view. */
  resources: CourseResource[];
  resourcesLoading: boolean;

  selectedId: string | null;
  select: (id: string | null) => void;

  /** Bumped whenever the graph should re-centre on `selectedId`. */
  focusNonce: number;
  focusConcept: (id: string) => void;

  target: StudyTarget | null;
  setTarget: (t: StudyTarget) => void;
  targets: StudyTarget[];

  uploads: UploadItem[];
  /** Bumped after every ingest that changed the student's state, so views refetch. */
  ingestVersion: number;
  /** Concepts the latest uploads touched, most recent first. The island highlights them. */
  recentlyTouched: string[];
  addUploads: (files: File[], origin: SourceOrigin, artifactType: ArtifactType) => void;
  clearFinishedUploads: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

let uploadSeq = 0;

export function StudyGotchiProvider({ children }: { children: ReactNode }) {
  const [graph, setGraph] = useState<Async<KnowledgeGraphResponse>>({
    data: null,
    loading: true,
    error: null,
  });
  const [resources, setResources] = useState<CourseResource[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusNonce, setFocusNonce] = useState(0);
  const [target, setTarget] = useState<StudyTarget | null>(null);
  const [targets, setTargets] = useState<StudyTarget[]>([]);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [ingestVersion, setIngestVersion] = useState(0);
  const [recentlyTouched, setRecentlyTouched] = useState<string[]>([]);
  const [identityTick, setIdentityTick] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => onIdentityChange(() => setIdentityTick((n) => n + 1)), []);

  const ready = USE_MOCK || isIdentityReady();

  const reloadGraph = useCallback(() => {
    if (!ready) return;
    setGraph((g) => ({ ...g, loading: true, error: null }));
    api
      .getKnowledgeGraph()
      .then((data) => setGraph({ data, loading: false, error: null }))
      .catch((err: unknown) =>
        setGraph({
          data: null,
          loading: false,
          error: err instanceof ApiError ? err.message : "Could not load your knowledge graph.",
        }),
      );
  }, [ready]);

  useEffect(() => {
    reloadGraph();
  }, [reloadGraph, identityTick]);

  const reloadResources = useCallback(() => {
    if (!ready) return;
    setResourcesLoading(true);
    api
      .listResources()
      .then(setResources)
      // A missing resource list must not take the graph down with it; the
      // graph simply renders concepts alone.
      .catch(() => setResources([]))
      .finally(() => setResourcesLoading(false));
  }, [ready]);

  useEffect(() => {
    reloadResources();
  }, [reloadResources, ingestVersion, identityTick]);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    api
      .listStudyTargets()
      .then((list) => {
        if (cancelled) return;
        setTargets(list);
        setTarget((current) => current ?? list[0] ?? null);
      })
      .catch(() => {
        // A missing target list must not blank the graph; the Study Plan and
        // Gaps panels render their own unavailable state.
        if (!cancelled) setTargets([]);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, identityTick]);

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
    },
    [],
  );

  const patchUpload = useCallback((id: string, patch: Partial<UploadItem>) => {
    setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  }, []);

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);

  const noteTouched = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    setRecentlyTouched((prev) => [...ids, ...prev.filter((id) => !ids.includes(id))].slice(0, 40));
  }, []);

  const stateChanged = useCallback(() => {
    setIngestVersion((v) => v + 1);
    reloadGraph();
  }, [reloadGraph]);

  /** Follow a student file through the engine's background analysis. */
  const pollUntilDone = useCallback(
    (uploadId: string, resourceId: string, attempt = 0) => {
      if (attempt > STATUS_POLL_LIMIT) {
        patchUpload(uploadId, { status: "failed", error: "The engine is taking too long. Try again later." });
        return;
      }
      later(() => {
        api
          .getResourceStatus(resourceId)
          .then((status) => {
            if (status.status === "processed" || status.status === "empty" || status.status === "unchanged") {
              patchUpload(uploadId, { status: "complete" });
              stateChanged();
            } else if (status.status === "failed") {
              patchUpload(uploadId, { status: "failed", error: status.error ?? "The engine could not read this file." });
            } else {
              pollUntilDone(uploadId, resourceId, attempt + 1);
            }
          })
          .catch(() => pollUntilDone(uploadId, resourceId, attempt + 1));
      }, STATUS_POLL_MS);
    },
    [later, patchUpload, stateChanged],
  );

  const addUploads = useCallback<StoreValue["addUploads"]>(
    (files, origin, artifactType) => {
      const accepted = files.filter(isAcceptedFile);
      const rejected = files.filter((f) => !isAcceptedFile(f));

      const items: UploadItem[] = [
        ...accepted.map<UploadItem>((file) => ({
          id: `up_${++uploadSeq}`,
          filename: file.name,
          size: file.size,
          origin,
          artifact_type: file.name.toLowerCase().endsWith(".zip") ? "course_bundle" : artifactType,
          status: "queued",
        })),
        ...rejected.map<UploadItem>((file) => ({
          id: `up_${++uploadSeq}`,
          filename: file.name,
          size: file.size,
          origin,
          artifact_type: artifactType,
          status: "failed",
          error: "Unsupported file type. Upload a PDF, image, or ZIP.",
        })),
      ];

      setUploads((prev) => [...items, ...prev]);

      accepted.forEach((file, i) => {
        const item = items[i];
        const studentScoped = isStudentScoped(origin);

        later(() => {
          patchUpload(item.id, { status: "uploading" });

          api
            .ingest({ file, origin, artifactType: item.artifact_type, studentScoped })
            .then((res) => {
              patchUpload(item.id, { status: res.status ?? "processing", child_count: res.child_count });
              noteTouched(res.concepts_touched ?? []);

              if (USE_MOCK) {
                // Mock mode only: walk the remaining states so the demo reads
                // end-to-end without a backend.
                later(() => {
                  patchUpload(item.id, {
                    status: "complete",
                    concepts_extracted: res.child_count ? res.child_count * 3 : 7,
                  });
                  reloadGraph();
                }, 2200 + i * 400);
                return;
              }

              // The fast phase already moved this student's state; show it now.
              stateChanged();
              if (res.analysis_pending) pollUntilDone(item.id, res.resource_id);
            })
            .catch((err: unknown) =>
              patchUpload(item.id, {
                status: "failed",
                error: err instanceof ApiError ? err.message : "Upload failed.",
              }),
            );
        }, 250 * i);
      });
    },
    [later, patchUpload, reloadGraph, stateChanged, noteTouched, pollUntilDone],
  );

  const clearFinishedUploads = useCallback(() => {
    setUploads((prev) => prev.filter((u) => u.status !== "complete" && u.status !== "failed"));
  }, []);

  const focusConcept = useCallback((id: string) => {
    setSelectedId(id);
    setFocusNonce((n) => n + 1);
  }, []);

  const value = useMemo<StoreValue>(
    () => ({
      graph,
      reloadGraph,
      selectedId,
      select: setSelectedId,
      focusNonce,
      focusConcept,
      target,
      setTarget,
      targets,
      resources,
      resourcesLoading,
      uploads,
      ingestVersion,
      recentlyTouched,
      addUploads,
      clearFinishedUploads,
    }),
    [
      graph,
      reloadGraph,
      selectedId,
      focusNonce,
      focusConcept,
      target,
      targets,
      resources,
      resourcesLoading,
      uploads,
      ingestVersion,
      recentlyTouched,
      addUploads,
      clearFinishedUploads,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StudyGotchiProvider");
  return ctx;
}
