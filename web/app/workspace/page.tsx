"use client";

import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/app/theme-provider";
import { useWorkspace } from "./workspace-context";
import { buttonVariants } from "@/components/ui/button";

function formatSize(bytes: number) {
  if (bytes === 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function applyFilters<T extends { key: string; name: string; size?: number; lastModified?: string | null }>(
  items: T[],
  filters: {
    fileType?: string;
    dateFrom?: string;
    dateTo?: string;
    sizeMinBytes?: number;
    sizeMaxBytes?: number;
    nameContains?: string;
  } | null
): T[] {
  if (!filters) return items;
  return items.filter((f) => {
    if (filters.fileType) {
      const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
      if (ext !== filters.fileType?.toLowerCase()) return false;
    }
    if (filters.nameContains && !f.name.toLowerCase().includes(filters.nameContains.toLowerCase())) return false;
    if (filters.sizeMinBytes != null && (f.size ?? 0) < filters.sizeMinBytes) return false;
    if (filters.sizeMaxBytes != null && (f.size ?? 0) > filters.sizeMaxBytes) return false;
    if (filters.dateFrom || filters.dateTo) {
      const t = f.lastModified ? new Date(f.lastModified).getTime() : 0;
      if (filters.dateFrom && t < new Date(filters.dateFrom).getTime()) return false;
      if (filters.dateTo && t > new Date(filters.dateTo).getTime()) return false;
    }
    return true;
  });
}

export default function WorkspacePage() {
  const { theme } = useTheme();
  const {
    bucketName,
    credentials,
    region,
    prefix,
    folders,
    files,
    loading,
    error,
    searchQuery,
    viewMode,
    setPrefix,
    refresh,
    isConnected,
    aiSearchAnswer,
    aiSearchMatch,
    clearAiSearch,
    appliedFilters,
  } = useWorkspace();
  const isLight = theme === "light";
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const toggleSelection = useCallback((key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedKeys(new Set()), []);

  const handleDelete = useCallback(async () => {
    if (!bucketName || !credentials || selectedKeys.size === 0) return;
    if (!window.confirm(`Delete ${selectedKeys.size} item(s)? This cannot be undone.`)) return;
    setActionError(null);
    setActionLoading(true);
    try {
      const res = await fetch("/api/s3/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bucket: bucketName,
          region: region || undefined,
          accessKeyId: credentials.accessKeyId,
          secretAccessKey: credentials.secretAccessKey,
          keys: Array.from(selectedKeys),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      setSelectedKeys(new Set());
      refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setActionLoading(false);
    }
  }, [bucketName, credentials, region, selectedKeys, refresh]);

  const handleRename = useCallback(async () => {
    if (!bucketName || !credentials || selectedKeys.size !== 1) return;
    const key = Array.from(selectedKeys)[0];
    const isFolder = key.endsWith("/");
    const currentName = isFolder ? key.replace(/\/$/, "").split("/").pop() ?? key : key.split("/").pop() ?? key;
    const newName = window.prompt("New name:", currentName);
    if (newName == null || newName.trim() === "" || newName.trim() === currentName) return;
    const sanitized = newName.trim().replace(/[/\\]/g, "");
    if (!sanitized) return;
    setActionError(null);
    setActionLoading(true);
    try {
      const parent = key.includes("/") ? key.replace(/[^/]+\/?$/, "") : "";
      const newKey = isFolder ? `${parent}${sanitized}/` : `${parent}${sanitized}`;
      const res = await fetch("/api/s3/rename", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bucket: bucketName,
          region: region || undefined,
          accessKeyId: credentials.accessKeyId,
          secretAccessKey: credentials.secretAccessKey,
          oldKey: key,
          newKey,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Rename failed");
      setSelectedKeys(new Set());
      refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Rename failed");
    } finally {
      setActionLoading(false);
    }
  }, [bucketName, credentials, region, selectedKeys, refresh]);

  const q = searchQuery.trim().toLowerCase();
  let filteredFolders = q
    ? folders.filter((f) => f.name.toLowerCase().includes(q))
    : folders;
  let filteredFiles = q
    ? files.filter((f) => f.name.toLowerCase().includes(q))
    : files;

  filteredFiles = applyFilters(filteredFiles, appliedFilters);
  if (aiSearchMatch.length > 0) {
    const keySet = new Set(aiSearchMatch);
    filteredFiles = filteredFiles.filter((f) => keySet.has(f.key));
  }

  const selectAll = useCallback(() => {
    const all = new Set<string>();
    filteredFiles.forEach((f) => all.add(f.key));
    setSelectedKeys(all);
  }, [filteredFiles]);

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-12 text-center">
        <p className={cn("text-sm", isLight ? "text-slate-600" : "text-slate-400")}>Connect a bucket to view files.</p>
        <a
          href="/connect"
          className="text-sm text-indigo-600 hover:text-indigo-700 underline"
        >
          Go to Connect
        </a>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-slate-200" />
        <p className={cn("text-sm", isLight ? "text-slate-600" : "text-slate-400")}>Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-12 text-center">
        <p className="text-sm text-rose-500">{error}</p>
        <p className={cn("text-xs", isLight ? "text-slate-600" : "text-slate-500")}>
          Check your credentials and bucket name in Connect.
        </p>
      </div>
    );
  }

  const hasContent = filteredFiles.length > 0;
  const pathLabel = prefix ? prefix.replace(/\/$/, "").split("/").filter(Boolean).join(" / ") : "Root";
  const showAiBanner = aiSearchAnswer != null && aiSearchAnswer !== "";

  if (!hasContent && !showAiBanner) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-12 text-center">
        <div
          className={cn(
            "rounded-2xl border border-dashed px-12 py-16",
            isLight ? "border-slate-300 bg-slate-200/50" : "border-slate-700 bg-slate-900/30"
          )}
        >
          {q ? (
            <>
              <p className={cn("text-sm font-medium", isLight ? "text-slate-700" : "text-slate-300")}>
                No matches for &quot;{searchQuery.trim()}&quot;
              </p>
              <p className={cn("mt-1 text-xs", isLight ? "text-slate-600" : "text-slate-500")}>
                Try a different search or clear the search box.
              </p>
            </>
          ) : (
            <>
              <p className={cn("text-sm font-medium", isLight ? "text-slate-700" : "text-slate-300")}>
                No files in this folder
              </p>
              <p className={cn("mt-1 text-xs", isLight ? "text-slate-600" : "text-slate-500")}>
                Select a folder from the left or upload files.
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  const aiBanner = showAiBanner && (
    <div
      className={cn(
        "mx-4 mt-4 flex items-start justify-between gap-3 rounded-lg border p-3",
        isLight ? "border-indigo-200 bg-indigo-50/80" : "border-indigo-900/50 bg-indigo-950/30"
      )}
    >
      <p className={cn("min-w-0 flex-1 text-sm", isLight ? "text-slate-800" : "text-slate-200")}>
        {aiSearchAnswer}
      </p>
      <button
        type="button"
        onClick={clearAiSearch}
        className={cn(
          "shrink-0 rounded px-2 py-1 text-xs",
          isLight ? "text-slate-600 hover:bg-indigo-100" : "text-slate-400 hover:bg-indigo-900/50"
        )}
      >
        Clear
      </button>
    </div>
  );

  if (viewMode === "grid") {
    return (
      <div className="p-4">
        {aiBanner}
        <h2 className={cn("mb-3 text-sm font-semibold", isLight ? "text-slate-700" : "text-slate-200")}>
          {pathLabel}
        </h2>
        {selectedKeys.size > 0 && (
          <div
            className={cn(
              "mb-4 flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3 shadow-sm",
              isLight ? "border border-slate-200/80 bg-white" : "border border-slate-700/50 bg-slate-900/60"
            )}
          >
            <span className={cn("text-sm font-semibold", isLight ? "text-slate-800" : "text-slate-100")}>
              {selectedKeys.size} selected
            </span>
            <span className={cn("h-4 w-px", isLight ? "bg-slate-200" : "bg-slate-600")} />
            <button type="button" onClick={clearSelection} className={cn("rounded-full px-3 py-1.5 text-xs font-medium", isLight ? "text-slate-600 hover:bg-slate-100" : "text-slate-400 hover:bg-slate-800")}>
              Clear
            </button>
            <button type="button" onClick={selectAll} className={cn("rounded-full px-3 py-1.5 text-xs font-medium", isLight ? "text-slate-600 hover:bg-slate-100" : "text-slate-400 hover:bg-slate-800")}>
              Select all
            </button>
            {actionError && <span className={cn("text-xs", isLight ? "text-rose-600" : "text-rose-400")}>{actionError}</span>}
            <div className="flex items-center gap-2 ml-auto">
              {selectedKeys.size === 1 && (
                <button type="button" onClick={handleRename} disabled={actionLoading} className={cn("inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium shadow-sm", isLight ? "bg-slate-100 text-slate-800 hover:bg-slate-200" : "bg-slate-700 text-slate-100 hover:bg-slate-600")}>
                  ✏️ Rename
                </button>
              )}
              <button type="button" onClick={handleDelete} disabled={actionLoading} className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium shadow-sm bg-rose-500/90 text-white hover:bg-rose-500">
                🗑️ {actionLoading ? "…" : "Delete"}
              </button>
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filteredFiles.map((file) => (
            <div
              key={file.key}
              className={cn(
                "relative flex flex-col items-center gap-2 rounded-xl border p-4",
                selectedKeys.has(file.key) ? (isLight ? "border-indigo-400 bg-indigo-50" : "border-indigo-600 bg-indigo-950/40") : isLight ? "border-slate-200 bg-white" : "border-slate-800 bg-slate-900/50"
              )}
            >
              <input
                type="checkbox"
                checked={selectedKeys.has(file.key)}
                onChange={() => toggleSelection(file.key)}
                onClick={(e) => e.stopPropagation()}
                className="absolute left-2 top-2 rounded border-slate-400"
              />
              <span className={cn("flex h-12 w-12 items-center justify-center rounded-lg", isLight ? "bg-slate-300" : "bg-slate-700/80")}>
                <span className="text-lg">📄</span>
              </span>
              <span className={cn("w-full truncate text-center text-sm font-mono", isLight ? "text-slate-800" : "text-slate-200")}>
                {file.name}
              </span>
              <span className={cn("text-xs", isLight ? "text-slate-600" : "text-slate-500")}>{formatSize(file.size)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      {aiBanner}
      <h2 className={cn("mb-3 text-sm font-semibold", isLight ? "text-slate-700" : "text-slate-200")}>
        {pathLabel}
      </h2>
      {selectedKeys.size > 0 && (
        <div
          className={cn(
            "mb-4 flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3 shadow-sm",
            isLight
              ? "border border-slate-200/80 bg-white"
              : "border border-slate-700/50 bg-slate-900/60"
          )}
        >
          <span className={cn("text-sm font-semibold", isLight ? "text-slate-800" : "text-slate-100")}>
            {selectedKeys.size} selected
          </span>
          <span className={cn("h-4 w-px", isLight ? "bg-slate-200" : "bg-slate-600")} />
          <button
            type="button"
            onClick={clearSelection}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              isLight ? "text-slate-600 hover:bg-slate-100" : "text-slate-400 hover:bg-slate-800"
            )}
          >
            Clear
          </button>
          <button
            type="button"
            onClick={selectAll}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              isLight ? "text-slate-600 hover:bg-slate-100" : "text-slate-400 hover:bg-slate-800"
            )}
          >
            Select all
          </button>
          {actionError && (
            <span className={cn("flex-1 min-w-0 text-xs", isLight ? "text-rose-600" : "text-rose-400")}>
              {actionError}
            </span>
          )}
          <div className="flex items-center gap-2">
            {selectedKeys.size === 1 && (
              <button
                type="button"
                onClick={handleRename}
                disabled={actionLoading}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium shadow-sm transition-all hover:shadow",
                  isLight
                    ? "bg-slate-100 text-slate-800 hover:bg-slate-200"
                    : "bg-slate-700 text-slate-100 hover:bg-slate-600"
                )}
              >
                <span className="opacity-80">✏️</span>
                Rename
              </button>
            )}
            <button
              type="button"
              onClick={handleDelete}
              disabled={actionLoading}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium shadow-sm transition-all hover:shadow",
                "bg-rose-500/90 text-white hover:bg-rose-500"
              )}
            >
              <span className="opacity-90">🗑️</span>
              {actionLoading ? "…" : "Delete"}
            </button>
          </div>
        </div>
      )}
      <div
        className={cn(
          "rounded-lg border overflow-hidden",
          isLight ? "border-slate-200 bg-white" : "border-slate-800 bg-slate-900/40"
        )}
      >
        <table className="w-full text-left text-sm">
          <thead>
            <tr
              className={cn(
                "border-b",
                isLight ? "border-slate-200 text-slate-600" : "border-slate-800 text-slate-500"
              )}
            >
              <th className="w-10 px-2 py-3">
                <input
                  type="checkbox"
                  checked={filteredFiles.length > 0 && selectedKeys.size === filteredFiles.length}
                  onChange={(e) => (e.target.checked ? selectAll() : clearSelection())}
                  className="rounded border-slate-400"
                />
              </th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Size</th>
              <th className="px-4 py-3 font-medium">Modified</th>
            </tr>
          </thead>
          <tbody>
            {filteredFiles.map((file) => (
              <tr
                key={file.key}
                className={cn(
                  "border-b",
                  selectedKeys.has(file.key)
                    ? isLight
                      ? "bg-indigo-50"
                      : "bg-indigo-950/40"
                    : isLight
                      ? "text-slate-700 hover:bg-slate-50"
                      : "text-slate-300 hover:bg-slate-800/30"
                )}
              >
                <td className="w-10 px-2 py-2.5" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedKeys.has(file.key)}
                    onChange={() => toggleSelection(file.key)}
                    className="rounded border-slate-400"
                  />
                </td>
                <td className="px-4 py-2.5">
                  <span className="flex items-center gap-2">
                    <span className="text-base opacity-80" aria-hidden>📄</span>
                    <span className={cn("font-mono", isLight ? "text-slate-800" : "text-slate-200")}>{file.name}</span>
                  </span>
                </td>
                <td className={cn("px-4 py-2.5", isLight ? "text-slate-600" : "text-slate-500")}>{formatSize(file.size)}</td>
                <td className={cn("px-4 py-2.5", isLight ? "text-slate-600" : "text-slate-500")}>
                  {file.lastModified ? new Date(file.lastModified).toLocaleString() : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
