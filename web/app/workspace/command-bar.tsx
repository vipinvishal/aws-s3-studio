"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/app/theme-provider";
import { useWorkspace } from "./workspace-context";

type CommandIntent =
  | { action: "find"; query: string }
  | { action: "summarize"; scope?: string }
  | { action: "create_folder"; name: string }
  | { action: "upload"; hint?: string }
  | { action: "report"; type?: "one-pager" | "digest" }
  | { action: "navigate"; path?: string }
  | { action: "none"; message: string };

type Props = {
  open: boolean;
  onClose: () => void;
  onReportClick: () => void;
  onNewFolder: (name: string) => void;
};

export function CommandBar({ open, onClose, onReportClick, onNewFolder }: Props) {
  const { theme } = useTheme();
  const { setSearchQuery, setPrefix, pathSegments, folders, setAiSearchResult } = useWorkspace();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setInput("");
      setMessage(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const runIntent = useCallback(
    (intent: CommandIntent) => {
      switch (intent.action) {
        case "find":
          setSearchQuery(intent.query || "");
          setAiSearchResult("", []); // will be filled by AI search if they trigger it
          onClose();
          break;
        case "summarize":
          setMessage("Use « Ask my bucket » in the right panel and ask to summarize.");
          onClose();
          break;
        case "create_folder":
          if (intent.name?.trim()) onNewFolder(intent.name.trim());
          onClose();
          break;
        case "upload":
          setMessage("Use the Upload button to add files.");
          onClose();
          break;
        case "report":
          onReportClick();
          onClose();
          break;
        case "navigate":
          if (intent.path) {
            const f = folders.find((x) => x.name === intent.path || x.prefix === intent.path);
            if (f) setPrefix(f.prefix);
          }
          onClose();
          break;
        case "none":
          setMessage(intent.message || "Try: find …, summarize, new folder …, or report");
          break;
        default:
          onClose();
      }
    },
    [setSearchQuery, setPrefix, folders, setAiSearchResult, onClose, onNewFolder, onReportClick]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const t = input.trim();
      if (!t) return;
      setLoading(true);
      setMessage(null);
      try {
        const res = await fetch("/api/ai/command", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: t }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed");
        runIntent(data.intent as CommandIntent);
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "Command failed");
      } finally {
        setLoading(false);
      }
    },
    [input, runIntent]
  );

  if (!open) return null;

  const isLight = theme === "light";

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/50"
      onClick={onClose}
    >
      <div
        className={cn(
          "w-full max-w-xl rounded-xl border shadow-xl",
          isLight ? "border-slate-200 bg-white" : "border-slate-700 bg-slate-900"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className="flex items-center gap-2 p-3">
          <span className="text-slate-400">⌘K</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Find files…, summarize, new folder …, report…"
            className={cn(
              "flex-1 bg-transparent text-sm outline-none",
              isLight ? "text-slate-900 placeholder:text-slate-500" : "text-slate-100 placeholder:text-slate-400"
            )}
          />
          {loading && <span className="text-xs text-slate-400">Thinking…</span>}
        </form>
        {message && (
          <p className={cn("border-t px-3 py-2 text-xs", isLight ? "border-slate-200 text-slate-600" : "border-slate-700 text-slate-400")}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
