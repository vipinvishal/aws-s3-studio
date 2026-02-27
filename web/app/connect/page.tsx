"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type ConnectionMethod = "keys" | "role";

const AWS_REGION_GROUPS: { label: string; regions: { name: string; code: string }[] }[] = [
  {
    label: "United States",
    regions: [
      { name: "N. Virginia", code: "us-east-1" },
      { name: "Ohio", code: "us-east-2" },
      { name: "N. California", code: "us-west-1" },
      { name: "Oregon", code: "us-west-2" },
    ],
  },
  {
    label: "Asia Pacific",
    regions: [
      { name: "Mumbai", code: "ap-south-1" },
      { name: "Osaka", code: "ap-northeast-3" },
      { name: "Seoul", code: "ap-northeast-2" },
      { name: "Singapore", code: "ap-southeast-1" },
      { name: "Sydney", code: "ap-southeast-2" },
      { name: "Tokyo", code: "ap-northeast-1" },
    ],
  },
  {
    label: "Canada",
    regions: [{ name: "Central", code: "ca-central-1" }],
  },
  {
    label: "Europe",
    regions: [
      { name: "Frankfurt", code: "eu-central-1" },
      { name: "Ireland", code: "eu-west-1" },
      { name: "London", code: "eu-west-2" },
      { name: "Paris", code: "eu-west-3" },
      { name: "Stockholm", code: "eu-north-1" },
    ],
  },
  {
    label: "South America",
    regions: [{ name: "São Paulo", code: "sa-east-1" }],
  },
];

const ALL_REGION_CODES = AWS_REGION_GROUPS.flatMap((g) => g.regions.map((r) => r.code));

export default function ConnectPage() {
  const [bucketName, setBucketName] = useState("");
  const [region, setRegion] = useState("ap-south-1");
  const [method, setMethod] = useState<ConnectionMethod>("keys");
  const [accessKeyId, setAccessKeyId] = useState("");
  const [secretAccessKey, setSecretAccessKey] = useState("");
  const [roleArn, setRoleArn] = useState("");
  const [status, setStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem("s3-studio-region");
      if (saved && ALL_REGION_CODES.includes(saved)) setRegion(saved);
    }
  }, []);

  const handleOpenWorkspace = async () => {
    if (!bucketName.trim()) {
      setStatus("error");
      setStatusMessage("Please enter a bucket name.");
      return;
    }
    if (method === "role") {
      setStatus("error");
      setStatusMessage("Role ARN is not supported yet. Please use Access keys.");
      return;
    }
    if (!accessKeyId.trim() || !secretAccessKey.trim()) {
      setStatus("error");
      setStatusMessage("Please enter Access key ID and Secret access key.");
      return;
    }

    setStatus("testing");
    setStatusMessage("Connecting…");

    try {
      const res = await fetch("/api/s3/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bucket: bucketName.trim(),
          accessKeyId: accessKeyId.trim(),
          secretAccessKey: secretAccessKey.trim(),
          region: region || undefined,
          prefix: "",
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setStatusMessage(data?.error ?? "Connection failed. Check your credentials.");
        return;
      }

      if (typeof window !== "undefined") {
        window.localStorage.setItem("s3-studio-bucket", bucketName.trim());
        window.localStorage.setItem("s3-studio-region", region);
        window.localStorage.setItem(
          "s3-studio-credentials",
          JSON.stringify({
            accessKeyId: accessKeyId.trim(),
            secretAccessKey: secretAccessKey.trim(),
          })
        );
      }
      setStatusMessage("Opening workspace…");
      window.location.href = "/workspace";
    } catch {
      setStatus("error");
      setStatusMessage("Connection failed. Check your credentials.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <header className="border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <svg
              viewBox="0 0 64 64"
              aria-hidden="true"
              className="h-7 w-7"
            >
              <defs>
                <linearGradient id="connectCubeGradient" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#22d3ee" />
                </linearGradient>
              </defs>
              <g
                fill="none"
                stroke="url(#connectCubeGradient)"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="14" y="20" width="24" height="24" rx="2" />
                <rect x="26" y="12" width="24" height="24" rx="2" />
                <line x1="14" y1="20" x2="26" y2="12" />
                <line x1="38" y1="20" x2="50" y2="12" />
                <line x1="14" y1="44" x2="26" y2="36" />
                <line x1="38" y1="44" x2="50" y2="36" />
                <line x1="26" y1="24" x2="50" y2="36" />
                <line x1="38" y1="20" x2="26" y2="36" />
              </g>
            </svg>
            <span className="text-base font-semibold tracking-tight sm:text-lg">
              AWS S3 Studio
            </span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
            Sign in to your bucket
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            Enter your bucket name and AWS credentials below. We’ll verify access and open your workspace—credentials stay in your browser and are never sent to our servers.
          </p>
        </div>

        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            handleOpenWorkspace();
          }}
        >
          <div>
            <label htmlFor="bucket" className="mb-1.5 block text-sm font-medium text-slate-300">
              Bucket name
            </label>
            <input
              id="bucket"
              type="text"
              value={bucketName}
              onChange={(e) => setBucketName(e.target.value)}
              placeholder="my-bucket-name"
              className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label htmlFor="region" className="mb-1.5 block text-sm font-medium text-slate-300">
              AWS Region
            </label>
            <select
              id="region"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {AWS_REGION_GROUPS.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.regions.map((r) => (
                    <option key={r.code} value={r.code}>
                      {r.name} ({r.code})
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">
              The region where your bucket is located (e.g. Mumbai for ap-south-1).
            </p>
          </div>

          <div>
            <p className="mb-3 text-sm font-medium text-slate-300">Connection method</p>
            <div className="flex gap-4">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="method"
                  checked={method === "keys"}
                  onChange={() => setMethod("keys")}
                  className="h-4 w-4 border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500"
                />
                <span className="text-sm text-slate-300">Access keys</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="method"
                  checked={method === "role"}
                  onChange={() => setMethod("role")}
                  className="h-4 w-4 border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500"
                />
                <span className="text-sm text-slate-300">Role ARN</span>
              </label>
            </div>
          </div>

          {method === "keys" ? (
            <>
              <div>
                <label htmlFor="accessKey" className="mb-1.5 block text-sm font-medium text-slate-300">
                  Access key ID
                </label>
                <input
                  id="accessKey"
                  type="text"
                  value={accessKeyId}
                  onChange={(e) => setAccessKeyId(e.target.value)}
                  placeholder="AKIA..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2.5 font-mono text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label htmlFor="secretKey" className="mb-1.5 block text-sm font-medium text-slate-300">
                  Secret access key
                </label>
                <input
                  id="secretKey"
                  type="password"
                  value={secretAccessKey}
                  onChange={(e) => setSecretAccessKey(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2.5 font-mono text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </>
          ) : (
            <div>
              <label htmlFor="roleArn" className="mb-1.5 block text-sm font-medium text-slate-300">
                Role ARN
              </label>
              <input
                id="roleArn"
                type="text"
                value={roleArn}
                onChange={(e) => setRoleArn(e.target.value)}
                placeholder="arn:aws:iam::123456789012:role/MyRole"
                className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2.5 font-mono text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          )}

          {/* Status: only show when connecting or when there's an error */}
          {(status === "testing" || status === "error") && (
            <div
              className={cn(
                "flex items-center gap-2 rounded-xl border px-4 py-3 text-sm",
                status === "error" && "border-rose-500/30 bg-rose-500/10 text-rose-200",
                status === "testing" && "border-slate-600 bg-slate-800/50 text-slate-300"
              )}
            >
              {status === "testing" && (
                <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-slate-500 border-t-slate-200" />
              )}
              <span>{statusMessage}</span>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={status === "testing"}
              className={cn(
                "inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:from-indigo-400 hover:to-violet-400 disabled:opacity-70",
                status === "testing" && "cursor-wait"
              )}
            >
              {status === "testing" ? "Opening workspace…" : "Open workspace"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
