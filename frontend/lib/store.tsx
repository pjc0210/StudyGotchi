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
import { api, ApiError, isIdentityReady, onIdentityChange, USE_MOCK } from "./api";
import { DEFAULT_FILTERS, type GraphFilters } from "./graph";
import type {
  ArtifactType,
  KnowledgeGraphResponse,
  SourceOrigin,
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

  selectedId: string | null;
  select: (id: string | null) => void;

  /** Bumped whenever the graph should re-centre on `selectedId`. */
  focusNonce: number;
  focusConcept: (id: string) => void;

  filters: GraphFilters;
  setFilters: (f: GraphFilters) => void;

  target: string;
  setTarget: (t: string) => void;

  uploads: UploadItem[];
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusNonce, setFocusNonce] = useState(0);
  const [filters, setFilters] = useState<GraphFilters>(DEFAULT_FILTERS);
  const [target, setTarget] = useState("Prepare for HW3");
  const [uploads, setUploads] = useState<UploadItem[]>([]);
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
    if (USE_MOCK || isIdentityReady()) reloadGraph();
    return onIdentityChange(reloadGraph);
  }, [reloadGraph]);

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
        const studentScoped = origin === "student_self";

        later(() => {
          patchUpload(item.id, { status: "uploading" });

          api
            .ingest({ file, origin, artifactType: item.artifact_type, studentScoped })
            .then((res) => {
              patchUpload(item.id, {
                status: res.status ?? "processing",
                child_count: res.child_count,
              });

              if (USE_MOCK) {
                // Mock mode only: walk the remaining states so the demo reads
                // end-to-end without a backend. Never fabricates a percentage.
                later(() => {
                  patchUpload(item.id, {
                    status: "complete",
                    concepts_extracted: res.child_count ? res.child_count * 3 : 7,
                  });
                  reloadGraph();
                }, 2200 + i * 400);
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
      filters,
      setFilters,
      target,
      setTarget,
      uploads,
      addUploads,
      clearFinishedUploads,
    }),
    [
      graph,
      reloadGraph,
      selectedId,
      focusNonce,
      focusConcept,
      filters,
      target,
      uploads,
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
