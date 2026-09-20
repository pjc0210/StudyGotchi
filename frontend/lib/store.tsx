"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { api, ApiError, isStudentScoped, USE_MOCK } from "./api";
import type {
  ArtifactType,
  CourseResource,
  KnowledgeGraphResponse,
  SourceOrigin,
  StudyTarget,
  UploadItem,
} from "./types";

export const ACCEPTED_EXTENSIONS = [".pdf", ".zip"] as const;

export function isAcceptedFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

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
  ingestVersion: number;
  addUploads: (
    files: File[],
    origin: SourceOrigin,
    artifactType: ArtifactType,
  ) => void;
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
  // Bumped after every successful real ingestion so dependent views refetch.
  const [ingestVersion, setIngestVersion] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const reloadGraph = useCallback(() => {
    setGraph((g) => ({ ...g, loading: true, error: null }));
    api
      .getKnowledgeGraph()
      .then((data) => setGraph({ data, loading: false, error: null }))
      .catch((err: unknown) =>
        setGraph({
          data: null,
          loading: false,
          error:
            err instanceof ApiError
              ? err.message
              : "Could not load your knowledge graph.",
        }),
      );
  }, []);

  useEffect(() => {
    reloadGraph();
  }, [reloadGraph]);

  const reloadResources = useCallback(() => {
    setResourcesLoading(true);
    api
      .listResources()
      .then(setResources)
      // A missing resource list must not take the graph down with it; the
      // graph simply renders concepts alone.
      .catch(() => setResources([]))
      .finally(() => setResourcesLoading(false));
  }, []);

  useEffect(() => {
    reloadResources();
  }, [reloadResources, ingestVersion]);

  useEffect(() => {
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
  }, []);

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
          artifact_type: file.name.toLowerCase().endsWith(".zip")
            ? "course_bundle"
            : artifactType,
          status: "queued",
        })),
        ...rejected.map<UploadItem>((file) => ({
          id: `up_${++uploadSeq}`,
          filename: file.name,
          size: file.size,
          origin,
          artifact_type: artifactType,
          status: "failed",
          error: "Unsupported file type. Upload a PDF or ZIP.",
        })),
      ];

      setUploads((prev) => [...items, ...prev]);

      accepted.forEach((file, i) => {
        const item = items[i];
        const studentScoped = isStudentScoped(origin);

        later(() => {
          patchUpload(item.id, { status: "uploading" });

          // Real ingestion is synchronous and can take a while, so the row sits
          // in "processing" for as long as the request is actually in flight.
          // No fabricated percentage - the label is the real state.
          if (!USE_MOCK) patchUpload(item.id, { status: "processing" });

          api
            .ingest({ file, origin, artifactType: item.artifact_type, studentScoped })
            .then((res) => {
              patchUpload(item.id, {
                status: res.status ?? "processing",
                child_count: res.child_count,
              });

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
              } else {
                // The engine has already rebuilt this student's state, so pull
                // the new graph rather than making the user reload the page.
                setIngestVersion((v) => v + 1);
                reloadGraph();
              }
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
    [later, patchUpload, reloadGraph],
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
