"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLoginWithGoogle = async () => {
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const redirectPath = "/connect";

      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: origin
            ? `${origin}${redirectPath}`
            : undefined,
        },
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Google sign-in failed. Try again."
      );
      setLoading(false);
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
                <linearGradient id="loginCubeGradient" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#22d3ee" />
                </linearGradient>
              </defs>
              <g
                fill="none"
                stroke="url(#loginCubeGradient)"
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

      <main className="mx-auto flex max-w-md flex-col gap-6 px-4 py-12 sm:px-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
            Sign in
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            Use Google to create an account and save your S3 workspaces in
            Supabase.
          </p>
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={handleLoginWithGoogle}
          className={cn(
            buttonVariants({ size: "lg" }),
            "w-full justify-center bg-slate-900 text-slate-50 hover:bg-slate-800 border border-slate-700"
          )}
        >
          <span className="flex items-center gap-3">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-white">
              <span className="text-xs font-semibold text-slate-900">G</span>
            </span>
            <span>{loading ? "Redirecting…" : "Continue with Google"}</span>
          </span>
        </button>

        {error && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        )}

        <p className="mt-4 text-xs leading-relaxed text-slate-500">
          After signing in, you&apos;ll be redirected to connect your AWS S3
          bucket. Authentication is powered by Supabase.
        </p>
      </main>
    </div>
  );
}

