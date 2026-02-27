"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const BUCKET_KEY = "s3-studio-bucket";
const CREDENTIALS_KEY = "s3-studio-credentials";
const REGION_KEY = "s3-studio-region";

export type FolderItem = { name: string; prefix: string };
export type FileItem = {
  key: string;
  name: string;
  size: number;
  lastModified: string | null;
};

type Credentials = { accessKeyId: string; secretAccessKey: string };

export type ViewMode = "list" | "grid";

export type AppliedFilters = {
  fileType?: string;
  dateFrom?: string;
  dateTo?: string;
  sizeMinBytes?: number;
  sizeMaxBytes?: number;
  nameContains?: string;
};

type WorkspaceState = {
  bucketName: string | null;
  credentials: Credentials | null;
  region: string;
  prefix: string;
  pathSegments: string[];
  folders: FolderItem[];
  files: FileItem[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  viewMode: ViewMode;
  setViewMode: (m: ViewMode) => void;
  setPrefix: (prefix: string | ((prev: string) => string)) => void;
  goToRoot: () => void;
  goToSegment: (index: number) => void;
  refresh: () => void;
  isConnected: boolean;
  aiSearchAnswer: string | null;
  aiSearchMatch: string[];
  setAiSearchResult: (answer: string, match: string[]) => void;
  clearAiSearch: () => void;
  appliedFilters: AppliedFilters | null;
  setAppliedFilters: (f: AppliedFilters | null) => void;
};

const WorkspaceContext = createContext<WorkspaceState | null>(null);

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return ctx;
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [bucketName, setBucketName] = useState<string | null>(null);
  const [region, setRegion] = useState<string>("us-east-1");
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [prefix, setPrefixState] = useState("");
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQueryState] = useState("");
  const [viewMode, setViewModeState] = useState<ViewMode>("list");
  const [aiSearchAnswer, setAiSearchAnswerState] = useState<string | null>(null);
  const [aiSearchMatch, setAiSearchMatchState] = useState<string[]>([]);
  const [appliedFilters, setAppliedFiltersState] = useState<AppliedFilters | null>(null);

  const pathSegments = prefix ? prefix.replace(/\/$/, "").split("/") : [];

  const fetchList = useCallback(async () => {
    if (!bucketName || !credentials) {
      setLoading(false);
      setFolders([]);
      setFiles([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/s3/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bucket: bucketName,
          accessKeyId: credentials.accessKeyId,
          secretAccessKey: credentials.secretAccessKey,
          region: region || undefined,
          prefix: prefix || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to list");
        setFolders([]);
        setFiles([]);
        return;
      }
      setFolders(data.folders ?? []);
      setFiles(data.files ?? []);
      if (data.resolvedRegion && typeof window !== "undefined") {
        window.localStorage.setItem(REGION_KEY, data.resolvedRegion);
        setRegion(data.resolvedRegion);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
      setFolders([]);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [bucketName, credentials, region, prefix]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const b = window.localStorage.getItem(BUCKET_KEY);
      const r = window.localStorage.getItem(REGION_KEY);
      const c = window.localStorage.getItem(CREDENTIALS_KEY);
      setBucketName(b);
      setRegion(r || "us-east-1");
      try {
        setCredentials(c ? JSON.parse(c) : null);
      } catch {
        setCredentials(null);
      }
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const setPrefix = useCallback(
    (p: string | ((prev: string) => string)) =>
      setPrefixState(typeof p === "function" ? (p as (prev: string) => string) : p),
    []
  );
  const setSearchQuery = useCallback((q: string) => setSearchQueryState(q), []);
  const setViewMode = useCallback((m: ViewMode) => setViewModeState(m), []);
  const setAiSearchResult = useCallback((answer: string, match: string[]) => {
    setAiSearchAnswerState(answer);
    setAiSearchMatchState(match);
  }, []);
  const clearAiSearch = useCallback(() => {
    setAiSearchAnswerState(null);
    setAiSearchMatchState([]);
  }, []);
  const setAppliedFilters = useCallback((f: AppliedFilters | null) => setAppliedFiltersState(f), []);
  const goToRoot = useCallback(() => setPrefixState(""), []);
  const goToSegment = useCallback((index: number) => {
    setPrefixState((prev) => {
      const segs = prev ? prev.replace(/\/$/, "").split("/") : [];
      const upTo = segs.slice(0, index + 1);
      return upTo.length ? upTo.join("/") + "/" : "";
    });
  }, []);

  const value: WorkspaceState = {
    bucketName,
    credentials,
    region,
    prefix,
    pathSegments,
    folders,
    files,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    viewMode,
    setViewMode,
    setPrefix,
    goToRoot,
    goToSegment,
    refresh: fetchList,
    isConnected: Boolean(bucketName && credentials),
    aiSearchAnswer,
    aiSearchMatch,
    setAiSearchResult,
    clearAiSearch,
    appliedFilters,
    setAppliedFilters,
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}
