"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTheme } from "@/app/theme-provider";
import { useWorkspace } from "./workspace-context";
import { CommandBar } from "./command-bar";
import { AppBrand } from "@/components/app-brand";

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const {
    bucketName,
    region,
    credentials,
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
    refresh,
    isConnected,
    setAiSearchResult,
    clearAiSearch,
    appliedFilters,
    setAppliedFilters,
  } = useWorkspace();
  const { theme, toggleTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [folderError, setFolderError] = useState<string | null>(null);
  const [commandBarOpen, setCommandBarOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [aiSearchLoading, setAiSearchLoading] = useState(false);
  const [pendingUploadFiles, setPendingUploadFiles] = useState<File[] | null>(null);
  const [uploadFolderPath, setUploadFolderPath] = useState("");
  const [uploadRenameName, setUploadRenameName] = useState("");

  const handleNewFolder = async () => {
    if (!isConnected || !bucketName || !credentials) return;
    const name = window.prompt("New folder name:");
    if (!name?.trim()) return;
    const sanitized = name.trim().replace(/[/\\]/g, "");
    if (!sanitized) {
      setFolderError("Invalid folder name.");
      return;
    }
    setFolderError(null);
    setCreatingFolder(true);
    try {
      const folderKey = prefix ? `${prefix}${sanitized}/` : `${sanitized}/`;
      const res = await fetch("/api/s3/create-folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bucket: bucketName,
          region: region || undefined,
          accessKeyId: credentials.accessKeyId,
          secretAccessKey: credentials.secretAccessKey,
          key: folderKey,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create folder");
      refresh();
    } catch (err) {
      setFolderError(err instanceof Error ? err.message : "Failed to create folder");
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleNewFolderWithName = useCallback(
    async (name: string) => {
      if (!isConnected || !bucketName || !credentials) return;
      const sanitized = name.trim().replace(/[/\\]/g, "") || "New folder";
      setFolderError(null);
      setCreatingFolder(true);
      try {
        const folderKey = prefix ? `${prefix}${sanitized}/` : `${sanitized}/`;
        const res = await fetch("/api/s3/create-folder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bucket: bucketName,
            region: region || undefined,
            accessKeyId: credentials.accessKeyId,
            secretAccessKey: credentials.secretAccessKey,
            key: folderKey,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create folder");
        refresh();
      } catch (err) {
        setFolderError(err instanceof Error ? err.message : "Failed to create folder");
      } finally {
        setCreatingFolder(false);
      }
    },
    [isConnected, bucketName, credentials, prefix, region, refresh]
  );

  const handleRenameFolder = useCallback(
    async (folderPrefix: string) => {
      if (!isConnected || !bucketName || !credentials) return;

      const currentName =
        folderPrefix.replace(/\/$/, "").split("/").pop() ?? folderPrefix;
      const newName = window.prompt("Rename folder:", currentName);

      if (newName == null) return;
      const trimmed = newName.trim();
      if (!trimmed || trimmed === currentName) return;

      const sanitized = trimmed.replace(/[/\\]/g, "");
      if (!sanitized) {
        setFolderError("Invalid folder name.");
        return;
      }

      const parent = folderPrefix.includes("/")
        ? folderPrefix.replace(/[^/]+\/?$/, "")
        : "";
      const newPrefix = `${parent}${sanitized}/`;

      setFolderError(null);
      try {
        const res = await fetch("/api/s3/rename", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bucket: bucketName,
            region: region || undefined,
            accessKeyId: credentials.accessKeyId,
            secretAccessKey: credentials.secretAccessKey,
            oldKey: folderPrefix,
            newKey: newPrefix,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to rename folder");

        // If the user is currently inside this folder, keep them inside after rename
        setPrefix((prev) =>
          prev && prev.startsWith(folderPrefix)
            ? prev.replace(folderPrefix, newPrefix)
            : prev
        );
        refresh();
      } catch (err) {
        setFolderError(
          err instanceof Error ? err.message : "Failed to rename folder"
        );
      }
    },
    [isConnected, bucketName, credentials, region, setPrefix, refresh]
  );

  const handleDeleteFolder = useCallback(
    async (folderPrefix: string) => {
      if (!isConnected || !bucketName || !credentials) return;
      const confirmed = window.confirm(
        "Delete this folder and all files inside it? This cannot be undone."
      );
      if (!confirmed) return;
      setFolderError(null);
      setCreatingFolder(true);
      try {
        const res = await fetch("/api/s3/delete-folder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bucket: bucketName,
            region: region || undefined,
            accessKeyId: credentials.accessKeyId,
            secretAccessKey: credentials.secretAccessKey,
            prefix: folderPrefix,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to delete folder");

        // If user was inside this folder, bump them up to parent/root
        setPrefix((prev) =>
          prev && prev.startsWith(folderPrefix)
            ? folderPrefix.includes("/")
              ? folderPrefix.replace(/[^/]+\/?$/, "")
              : ""
            : prev
        );
        refresh();
      } catch (err) {
        setFolderError(
          err instanceof Error ? err.message : "Failed to delete folder"
        );
      } finally {
        setCreatingFolder(false);
      }
    },
    [isConnected, bucketName, credentials, region, setPrefix, refresh]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandBarOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleAiSearch = useCallback(async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setAiSearchLoading(true);
    clearAiSearch();
    try {
      const res = await fetch("/api/ai/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, files }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");
      setAiSearchResult(data.answer ?? "", data.match ?? []);
    } catch {
      setAiSearchResult("Search failed. Try again.", []);
    } finally {
      setAiSearchLoading(false);
    }
  }, [searchQuery, files, setAiSearchResult, clearAiSearch]);

  const chatEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleSendChat = useCallback(async () => {
    const text = chatInput.trim();
    if (!text || chatLoading) return;
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: text }]);
    setChatLoading(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          folderPath: prefix || undefined,
          files,
          folders,
          bucketName: bucketName ?? undefined,
          region: region || undefined,
          credentials: credentials
            ? {
                accessKeyId: credentials.accessKeyId,
                secretAccessKey: credentials.secretAccessKey,
              }
            : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      const reply = data.message ?? "No response.";
      setChatMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      if (data.filters != null) setAppliedFilters(data.filters);
      if (data.filters === null) setAppliedFilters(null);
      if (Array.isArray(data.match)) setAiSearchResult(reply, data.match);
    } catch {
      setChatMessages((prev) => [...prev, { role: "assistant", content: "Something went wrong. Try again." }]);
    } finally {
      setChatLoading(false);
    }
  }, [chatInput, chatLoading, prefix, files, folders, bucketName, region, credentials, setAppliedFilters, setAiSearchResult]);

  const handleUploadClick = () => {
    if (!isConnected) return;
    setPendingUploadFiles(null);
    setUploadFolderPath("");
    setUploadRenameName("");
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList?.length || !bucketName || !credentials) return;
    const arr = Array.from(fileList);
    setUploadError(null);
    const currentPath = prefix ? prefix.replace(/\/$/, "") : "";
    setUploadFolderPath(currentPath);
    setPendingUploadFiles(arr);
    setUploadRenameName(arr.length === 1 ? arr[0].name : "");
    e.target.value = "";
  };

  const handleConfirmUpload = useCallback(async () => {
    if (!pendingUploadFiles?.length || !bucketName || !credentials) return;
    const uploadPrefix = uploadFolderPath ? `${uploadFolderPath.replace(/\/$/, "")}/` : prefix || "";
    setUploadError(null);
    setUploading(true);
    try {
      for (let i = 0; i < pendingUploadFiles.length; i++) {
        const file = pendingUploadFiles[i];
        const fileName = pendingUploadFiles.length === 1 && uploadRenameName.trim() ? uploadRenameName.trim().replace(/[/\\]/g, "") : file.name;
        const key = uploadPrefix ? `${uploadPrefix}${fileName}` : fileName;
        const formData = new FormData();
        formData.append("file", file);
        formData.append("bucket", bucketName);
        formData.append("region", region || "");
        formData.append("accessKeyId", credentials.accessKeyId);
        formData.append("secretAccessKey", credentials.secretAccessKey);
        formData.append("key", key);
        const res = await fetch("/api/s3/upload", {
          method: "POST",
          body: formData,
        });
        let data: { error?: string } = {};
        try {
          data = await res.json();
        } catch {
          data = { error: res.status === 413 ? "File too large (max 10MB). Try a smaller file or increase limit in next.config." : `Upload failed (${res.status})` };
        }
        if (!res.ok) throw new Error(data.error || `Upload failed (${res.status})`);
      }
      setPendingUploadFiles(null);
      setUploadFolderPath("");
      setUploadRenameName("");
      refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setUploadError(msg);
      console.error("Upload error:", err);
    } finally {
      setUploading(false);
    }
  }, [pendingUploadFiles, uploadFolderPath, uploadRenameName, bucketName, credentials, region, prefix, refresh]);

  const displayBucket = bucketName || "No bucket connected";

  return (
    <div
      className={cn(
        "flex h-screen flex-col",
        theme === "light"
          ? "bg-slate-100 text-slate-900"
          : "bg-slate-950 text-slate-100"
      )}
    >
      {/* Top header */}
      <header
        className={cn(
          "flex shrink-0 items-center justify-between gap-4 border-b px-4 py-2 backdrop-blur-sm",
          theme === "light"
            ? "border-slate-200 bg-white/90"
            : "border-slate-800/60 bg-slate-950/90"
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <Link href="/" className="shrink-0">
            <AppBrand variant="compact" />
          </Link>
          <nav
            className={cn(
              "flex min-w-0 items-center gap-1 truncate text-sm",
              theme === "light" ? "text-slate-600" : "text-slate-400"
            )}
          >
            <span
              className={cn(
                "font-mono",
                theme === "light"
                  ? isConnected
                    ? "text-slate-800"
                    : "text-slate-500"
                  : isConnected
                    ? "text-slate-200"
                    : "text-slate-500"
              )}
            >
              {displayBucket}
            </span>
            {isConnected && (
              <>
                <span className={theme === "light" ? "text-slate-400" : "text-slate-600"}>/</span>
                <button
                  type="button"
                  onClick={goToRoot}
                  className={cn(
                    "font-mono",
                    theme === "light" ? "hover:text-slate-900" : "hover:text-slate-200"
                  )}
                >
                  root
                </button>
                {pathSegments.map((seg, i) => (
                  <span key={i} className="flex items-center gap-1">
                    <span className={theme === "light" ? "text-slate-400" : "text-slate-600"}>/</span>
                    <button
                      type="button"
                      onClick={() => goToSegment(i)}
                      className={cn(
                        "font-mono",
                        theme === "light" ? "text-slate-700 hover:text-slate-900" : "text-slate-300 hover:text-slate-100"
                      )}
                    >
                      {seg}
                    </button>
                  </span>
                ))}
              </>
            )}
          </nav>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <div className="flex flex-col">
            <input
              type="search"
              placeholder="Search files or ask a question…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleAiSearch();
                }
              }}
              className={cn(
                "w-56 rounded-lg border px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:w-72",
                theme === "light"
                  ? "border-slate-300 bg-white text-slate-800 placeholder:text-slate-500"
                  : "border-slate-700 bg-slate-900/80 text-slate-200 placeholder:text-slate-500"
              )}
            />
            <span
              className={cn(
                "mt-0.5 text-[10px]",
                theme === "light" ? "text-slate-500" : "text-slate-500"
              )}
            >
              Press Enter to run AI-powered search on the current folder.
            </span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip,.json"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={handleUploadClick}
            disabled={!isConnected || uploading}
            className={cn(
              buttonVariants({ size: "sm" }),
              "bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50",
              theme === "light" && "text-white"
            )}
          >
            {uploading ? "Uploading…" : "Upload"}
          </button>
          {uploadError && (
            <span className="max-w-[200px] truncate text-xs text-rose-400" title={uploadError}>
              {uploadError}
            </span>
          )}
          <button
            type="button"
            onClick={toggleTheme}
            title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            className={cn(
              "ml-1 flex h-8 min-w-[4rem] items-center justify-center gap-1.5 rounded-lg border px-2.5 text-xs",
              theme === "light"
                ? "border-slate-300 bg-slate-200/80 text-slate-700 hover:bg-slate-300/80"
                : "border-slate-600 bg-slate-800/60 text-slate-300 hover:bg-slate-700 hover:text-slate-100"
            )}
          >
            {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
          </button>
        </div>
      </header>

      {uploadError && (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-rose-900/50 bg-rose-950/30 px-4 py-2 text-xs">
          <span className="text-rose-300">{uploadError}</span>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-500">
              Fix: S3 bucket → Permissions → CORS. Allow origin <code className="rounded bg-slate-800 px-1">http://localhost:3000</code>, methods PUT, GET, headers <code className="rounded bg-slate-800 px-1">*</code>.
            </span>
            <button
              type="button"
              onClick={() => setUploadError(null)}
              className="text-slate-400 hover:text-slate-200"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        {/* Left sidebar */}
        <aside
          className={cn(
            "flex w-52 shrink-0 flex-col border-r",
            theme === "light"
              ? "border-slate-200 bg-slate-50/80"
              : "border-slate-800/60 bg-slate-950/50"
          )}
        >
          <div className="p-3">
            <p
              className={cn(
                "mb-2 text-[10px] font-medium uppercase tracking-wider",
                theme === "light" ? "text-slate-600" : "text-slate-500"
              )}
            >
              Buckets
            </p>
            {isConnected ? (
              <p
                className={cn(
                  "truncate rounded-lg px-2 py-2 text-sm font-medium",
                  theme === "light" ? "bg-indigo-50 text-indigo-900" : "bg-slate-800/80 text-slate-100"
                )}
                title={bucketName ?? undefined}
              >
                {bucketName}
              </p>
            ) : (
              <p className={cn("px-2 py-1.5 text-xs", theme === "light" ? "text-slate-600" : "text-slate-500")}>
                <Link
                  href="/connect"
                  className={cn("underline", theme === "light" ? "hover:text-slate-900" : "hover:text-slate-400")}
                >
                  Connect a bucket
                </Link>
              </p>
            )}
            <p
              className={cn(
                "mt-4 mb-2 text-[10px] font-medium uppercase tracking-wider",
                theme === "light" ? "text-slate-600" : "text-slate-500"
              )}
            >
              Folders
            </p>
            {loading ? (
              <p className={cn("px-2 py-1.5 text-xs", theme === "light" ? "text-slate-600" : "text-slate-500")}>Loading…</p>
            ) : error ? (
              <p className="px-2 py-1.5 text-xs text-rose-500">{error}</p>
            ) : (
              <div className="space-y-0.5">
                {folders.map((f) => (
                  <div
                    key={f.prefix}
                    className={cn(
                      "flex w-full items-center gap-1 rounded-lg px-2 py-1.5 text-xs",
                      theme === "light"
                        ? "text-slate-700 hover:bg-slate-200 hover:text-slate-900"
                        : "text-slate-300 hover:bg-slate-800 hover:text-slate-100"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setPrefix(f.prefix)}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm"
                    >
                      <span
                        className={cn(
                          "h-4 w-4 shrink-0 rounded border",
                          theme === "light"
                            ? "border-slate-400 bg-slate-200"
                            : "border-slate-600 bg-slate-800"
                        )}
                      />
                      <span className="truncate">{f.name}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRenameFolder(f.prefix)}
                      className={cn(
                        "ml-1 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium",
                        theme === "light"
                          ? "text-slate-500 hover:bg-slate-300 hover:text-slate-800"
                          : "text-slate-400 hover:bg-slate-700 hover:text-slate-100"
                      )}
                      title="Rename folder"
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteFolder(f.prefix)}
                      className={cn(
                        "ml-1 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium",
                        theme === "light"
                          ? "text-rose-500 hover:bg-rose-100 hover:text-rose-700"
                          : "text-rose-400 hover:bg-rose-900/40 hover:text-rose-300"
                      )}
                      title="Delete folder"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
                {folders.length === 0 && (
                  <p
                    className={cn(
                      "px-2 py-1.5 text-xs",
                      theme === "light" ? "text-slate-600" : "text-slate-500"
                    )}
                  >
                    No folders
                  </p>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={handleNewFolder}
              disabled={!isConnected || creatingFolder}
              className={cn(
                "mt-4 w-full rounded-lg border border-dashed py-2.5 text-xs font-medium disabled:opacity-50",
                theme === "light"
                  ? "border-slate-400 text-slate-700 hover:border-slate-500 hover:text-slate-900"
                  : "border-slate-600 text-slate-400 hover:border-slate-500 hover:text-slate-300"
              )}
            >
              {creatingFolder ? "Creating…" : "+ New folder"}
            </button>
            {folderError && (
              <p className="mt-2 text-xs text-rose-400" title={folderError}>
                {folderError}
              </p>
            )}
          </div>
          <div
            className={cn(
              "mt-auto border-t p-3",
              theme === "light" ? "border-slate-200" : "border-slate-800/60"
            )}
          >
            <p
              className={cn(
                "text-[10px] font-medium uppercase tracking-wider",
                theme === "light" ? "text-slate-600" : "text-slate-500"
              )}
            >
              Storage
            </p>
            <p className={cn("mt-1 text-sm font-medium", theme === "light" ? "text-slate-800" : "text-slate-200")}>
              12.4 GB used
            </p>
            <p className={cn("text-xs", theme === "light" ? "text-slate-600" : "text-slate-500")}>of 50 GB</p>
          </div>
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1 overflow-auto">{children}</main>

        {/* Right panel */}
        <aside
          className={cn(
            "hidden w-80 shrink-0 border-l lg:block",
            theme === "light"
              ? "border-slate-200 bg-slate-50/50"
              : "border-slate-800/60 bg-slate-950/30"
          )}
        >
          <div className="flex h-full flex-col p-4">
            <p
              className={cn(
                "mb-2 shrink-0 text-[10px] font-medium uppercase tracking-wider",
                theme === "light" ? "text-slate-600" : "text-slate-500"
              )}
            >
              Chat
            </p>
            <p className={cn("mb-2 shrink-0 text-xs", theme === "light" ? "text-slate-500" : "text-slate-500")}>
              Ask anything: list files, filter, summarize, or get a report.
            </p>
            <div className="min-h-0 flex-1 overflow-auto space-y-3">
              {chatMessages.length === 0 && (
                <p className={cn("py-4 text-center text-xs", theme === "light" ? "text-slate-500" : "text-slate-500")}>
                  e.g. &quot;What&apos;s in this folder?&quot;, &quot;Show only PDFs&quot;, &quot;Give me the 2 files&quot;, &quot;Summarize&quot;
                </p>
              )}
              {chatMessages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    "rounded-lg border p-2.5 text-sm",
                    m.role === "user"
                      ? theme === "light"
                        ? "ml-6 border-indigo-200 bg-indigo-50 text-slate-800"
                        : "ml-6 border-indigo-800/50 bg-indigo-950/40 text-slate-200"
                      : theme === "light"
                        ? "mr-4 border-slate-200 bg-slate-100 text-slate-700"
                        : "mr-4 border-slate-700/60 bg-slate-900/50 text-slate-300"
                  )}
                >
                  {m.content}
                </div>
              ))}
              {chatLoading && (
                <p className={cn("rounded-lg border p-2.5 text-sm", theme === "light" ? "border-slate-200 bg-slate-100 text-slate-500" : "border-slate-700 bg-slate-900/50 text-slate-500")}>
                  …
                </p>
              )}
              <div ref={chatEndRef} />
            </div>
            {appliedFilters && (
              <div className="mt-2 flex shrink-0 items-center gap-2">
                <span className={cn("text-xs", theme === "light" ? "text-slate-600" : "text-slate-400")}>Filters on</span>
                <button
                  type="button"
                  onClick={() => setAppliedFilters(null)}
                  className={cn("text-xs underline", theme === "light" ? "text-indigo-600" : "text-indigo-400")}
                >
                  Clear
                </button>
              </div>
            )}
            <div className="mt-3 flex shrink-0 gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendChat()}
                placeholder="Ask anything…"
                className={cn(
                  "min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm",
                  theme === "light"
                    ? "border-slate-300 bg-white text-slate-800 placeholder:text-slate-500"
                    : "border-slate-700 bg-slate-900 text-slate-200 placeholder:text-slate-500"
                )}
              />
              <button
                type="button"
                onClick={handleSendChat}
                disabled={!chatInput.trim() || chatLoading}
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "shrink-0 bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50"
                )}
              >
                {chatLoading ? "…" : "Send"}
              </button>
            </div>
          </div>
        </aside>
      </div>

      <CommandBar
        open={commandBarOpen}
        onClose={() => setCommandBarOpen(false)}
        onReportClick={() => setChatInput("Generate a one-pager report of this folder")}
        onNewFolder={handleNewFolderWithName}
      />

      {pendingUploadFiles != null && pendingUploadFiles.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !uploading && setPendingUploadFiles(null)}
        >
          <div
            className={cn(
              "w-full max-w-md rounded-xl border p-4 shadow-xl",
              theme === "light" ? "border-slate-200 bg-white" : "border-slate-700 bg-slate-900"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className={cn("mb-3 text-sm font-semibold", theme === "light" ? "text-slate-900" : "text-slate-100")}>
              Upload
            </h3>
            <p className={cn("mb-1 text-xs", theme === "light" ? "text-slate-600" : "text-slate-500")}>
              Upload to folder (edit if needed):
            </p>
            <input
              type="text"
              value={uploadFolderPath}
              onChange={(e) => setUploadFolderPath(e.target.value)}
              placeholder="root or path/folder"
              className={cn(
                "mb-3 w-full rounded-lg border px-3 py-2 text-sm",
                theme === "light"
                  ? "border-slate-300 bg-white text-slate-800"
                  : "border-slate-700 bg-slate-900 text-slate-200"
              )}
            />
            {pendingUploadFiles && pendingUploadFiles.length === 1 && (
              <>
                <p className={cn("mb-1 text-xs", theme === "light" ? "text-slate-600" : "text-slate-500")}>
                  Rename file (optional):
                </p>
                <input
                  type="text"
                  value={uploadRenameName}
                  onChange={(e) => setUploadRenameName(e.target.value)}
                  placeholder={pendingUploadFiles[0]?.name ?? "filename"}
                  className={cn(
                    "mb-3 w-full rounded-lg border px-3 py-2 text-sm",
                    theme === "light"
                      ? "border-slate-300 bg-white text-slate-800"
                      : "border-slate-700 bg-slate-900 text-slate-200"
                  )}
                />
              </>
            )}
            <p className={cn("mb-3 text-xs", theme === "light" ? "text-slate-500" : "text-slate-500")}>
              {pendingUploadFiles?.length} file(s) → {uploadFolderPath || "root"}
            </p>
            {uploadError && (
              <p className={cn("mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700", theme === "dark" && "border-rose-900/50 bg-rose-950/30 text-rose-300")}>
                {uploadError}
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleConfirmUpload}
                disabled={uploading}
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "flex-1 bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50"
                )}
              >
                {uploading ? "Uploading…" : "Upload here"}
              </button>
              <button
                type="button"
                onClick={() => setPendingUploadFiles(null)}
                disabled={uploading}
                className={cn(
                  buttonVariants({ size: "sm" }),
                  theme === "light" ? "border-slate-300 text-slate-700" : "border-slate-600 text-slate-300"
                )}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

