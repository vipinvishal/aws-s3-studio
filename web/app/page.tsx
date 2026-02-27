import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  return (
    <div className="animated-bg min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 text-slate-50">
      <main className="relative mx-auto flex max-w-6xl flex-col gap-16 px-4 pb-28 pt-10 sm:px-6 sm:pt-12 lg:px-8 lg:pt-14">
        <Hero />
      </main>
    </div>
  );
}

function Hero() {
  return (
    <section
      id="hero"
      className="grid gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.1fr)] lg:items-center lg:gap-16"
    >
      <div className="space-y-8">
        {/* Logo + primary call-to-action at very top */}
        <div className="flex items-center gap-4">
          <svg
            viewBox="0 0 64 64"
            aria-hidden="true"
            className="h-9 w-9 sm:h-10 sm:w-10"
          >
            <defs>
              <linearGradient id="heroCubeGradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#22d3ee" />
              </linearGradient>
            </defs>
            <g
              fill="none"
              stroke="url(#heroCubeGradient)"
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
          <span className="text-xl font-semibold tracking-tight text-slate-50 sm:text-2xl lg:text-3xl">
            AWS S3 Studio
          </span>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-xs text-indigo-200 shadow-[0_0_40px_rgba(79,70,229,0.5)] transition-colors duration-200">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]" />
          Live on your AWS — no file migration.
        </div>

        <div className="space-y-5">
          <h1 className="text-balance text-4xl font-semibold leading-[1.1] tracking-tight text-slate-50 sm:text-5xl lg:text-6xl lg:leading-[1.08]">
            Turn raw S3 storage
            <br />
            into an{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-violet-300 to-cyan-300 bg-clip-text text-transparent">
              intelligent workspace.
            </span>
          </h1>
          <p className="max-w-xl text-balance text-sm leading-relaxed text-slate-300 sm:text-base sm:leading-relaxed">
            Connect your AWS S3 bucket and get a modern file explorer with AI
            summaries, natural language search, and cost insights — without
            changing how you store files today.
          </p>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
          <Link
            href="/login"
            className={cn(
              buttonVariants({ size: "lg" }),
              "w-fit bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-400 text-slate-950 shadow-[0_0_50px_rgba(129,140,248,0.9)] transition-all duration-200 hover:shadow-[0_0_56px_rgba(129,140,248,0.95)] hover:from-indigo-400 hover:via-violet-400 hover:to-cyan-300"
            )}
          >
            Start free
          </Link>
          <p className="text-xs leading-relaxed text-slate-400">
            No card required · Works with your existing S3
          </p>
        </div>

      </div>

      <div className="relative">
        <div
          className="pointer-events-none absolute -inset-12 -z-10 rounded-[40px] bg-[radial-gradient(circle_at_top,_rgba(129,140,248,0.55),_transparent_60%),_radial-gradient(circle_at_bottom,_rgba(45,212,191,0.35),_transparent_55%)] blur-3xl"
          style={{ animation: "soft-glow 4s ease-in-out infinite" }}
        />
        <div className="relative overflow-hidden rounded-3xl border border-slate-700/60 bg-slate-900/90 shadow-[0_24px_80px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.05)] backdrop-blur-2xl transition-shadow duration-300 hover:shadow-[0_32px_100px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.06)]">
          <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-900/90 px-4 py-2 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
            </div>
            <span className="font-mono text-[11px] text-slate-400">
              workspace-bucket / invoices/2024/
            </span>
            <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-medium text-emerald-300 ring-1 ring-emerald-500/20">
              Connected to AWS
            </span>
          </div>

          <div className="grid h-[360px] grid-cols-[0.95fr_1.1fr_1.1fr] text-[11px] text-slate-200">
            {/* Sidebar */}
            <div className="border-r border-slate-800/80 bg-slate-950/60 p-3">
              <p className="mb-2 text-[10px] uppercase tracking-wide text-slate-500">
                Buckets
              </p>
              <div className="space-y-1">
                <FakeTreeItem active label="workspace-bucket" />
                <FakeTreeItem label="logs-prod" />
                <FakeTreeItem label="backups" />
              </div>
              <p className="mt-4 mb-2 text-[10px] uppercase tracking-wide text-slate-500">
                Folders
              </p>
              <div className="space-y-1">
                <FakeTreeItem label="invoices" />
                <FakeTreeItem label="contracts" />
                <FakeTreeItem label="exports" />
                <FakeTreeItem label="screenshots" />
              </div>
            </div>

            {/* File list */}
            <div className="border-r border-slate-800/80 bg-slate-950/30 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                  <span>invoices / 2024</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] text-slate-300">
                    List
                  </span>
                  <span className="rounded-full bg-slate-900/40 px-2 py-0.5 text-[10px] text-slate-500">
                    Grid
                  </span>
                </div>
              </div>
              <div className="mb-2 flex items-center justify-between text-[10px] text-slate-500">
                <span>File name</span>
                <span>AI summary</span>
              </div>
              <div className="space-y-1.5">
                <FakeFileRow
                  name="acme-q1-invoice.pdf"
                  summary="AI: Q1 invoice for Acme Corp, USD 18.4K, due Apr 30."
                  highlight
                />
                <FakeFileRow
                  name="stripe-q1-export.csv"
                  summary="AI: Raw Stripe export – 1,204 rows."
                />
                <FakeFileRow
                  name="acme-q2-invoice-draft.pdf"
                  summary="AI: Draft invoice, missing PO number."
                />
              </div>
            </div>

            {/* AI panel */}
            <div className="bg-slate-950/40 p-3">
              <p className="mb-2 text-[10px] uppercase tracking-wide text-slate-500">
                AI workspace
              </p>
              <div className="mb-3 rounded-2xl border border-violet-500/40 bg-gradient-to-br from-slate-950 via-slate-950 to-violet-950/60 p-3 shadow-[0_0_40px_rgba(139,92,246,0.4)]">
                <p className="mb-1 text-[11px] font-medium text-slate-100">
                  Summary
                </p>
                <p className="text-[11px] text-slate-300">
                  This bucket contains{" "}
                  <span className="font-semibold text-indigo-200">
                    824 processed documents
                  </span>{" "}
                  across invoices, contracts, and exports. AI can answer
                  questions like{" "}
                  <span className="italic">
                    &quot;Show invoices from Acme over $10k this year.&quot;
                  </span>
                </p>
              </div>

              <div className="mb-2 text-[10px] font-medium text-slate-300">
                Ask anything about this bucket
              </div>
              <div className="mb-3 rounded-xl border border-slate-800 bg-slate-950/80 px-2.5 py-1.5 text-[11px] text-slate-400">
                <span className="mr-1 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-200">
                  ⌘K
                </span>
                Find &quot;Acme&quot; invoices from last 90 days over $5k…
              </div>

              <div className="space-y-1.5 text-[11px] text-slate-300">
                <p className="text-[10px] font-medium text-slate-400">
                  Recent AI queries
                </p>
                <FakeChip>Which folders cost the most this month?</FakeChip>
                <FakeChip>
                  Show outdated backups older than 180 days.
                </FakeChip>
                <FakeChip>Summarize all contracts expiring this quarter.</FakeChip>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FakeTreeItem({
  label,
  active,
}: {
  label: string;
  active?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex cursor-default items-center gap-1.5 rounded-lg px-2 py-1 text-[11px]",
        active
          ? "bg-slate-800 text-slate-50"
          : "text-slate-300 hover:bg-slate-900/80"
      )}
    >
      <span className="h-3 w-3 rounded-sm bg-slate-700/80" />
      <span className="truncate">{label}</span>
    </div>
  );
}

function FakeFileRow({
  name,
  summary,
  highlight,
}: {
  name: string;
  summary: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 rounded-xl border border-transparent px-2 py-1.5",
        highlight && "border-violet-500/40 bg-violet-500/5"
      )}
    >
      <div className="flex items-center gap-2">
        <span className="h-4 w-4 rounded-md bg-slate-700/80" />
        <span className="truncate font-mono text-[11px] text-slate-100">
          {name}
        </span>
      </div>
      <p className="line-clamp-2 flex-1 text-right text-[11px] text-slate-400">
        {summary}
      </p>
    </div>
  );
}

function FakeChip({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex max-w-full items-center rounded-full border border-slate-800 bg-slate-950/70 px-2.5 py-1 text-[10px] text-slate-300">
      {children}
    </div>
  );
}
