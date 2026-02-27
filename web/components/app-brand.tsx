import { cn } from "@/lib/utils";
import { useTheme } from "@/app/theme-provider";

type AppBrandProps = {
  variant?: "full" | "compact";
};

export function AppBrand({ variant = "full" }: AppBrandProps) {
  const showSubtitle = variant === "full";
  const { theme } = useTheme();
  const isLight = theme === "light";

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <div
        className={cn(
          "flex items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500/40 via-violet-500/40 to-cyan-500/40 shadow-[0_0_18px_rgba(129,140,248,0.6)] backdrop-blur-sm",
          variant === "compact" ? "h-8 w-8" : "h-9 w-9 sm:h-10 sm:w-10"
        )}
      >
        <svg
          viewBox="0 0 64 64"
          aria-hidden="true"
          className="h-6 w-6 sm:h-7 sm:w-7"
        >
          <defs>
            <linearGradient id="cubeGradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#22d3ee" />
            </linearGradient>
          </defs>
          <g
            fill="none"
            stroke="url(#cubeGradient)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Front square */}
            <rect x="14" y="18" width="24" height="24" rx="2" />
            {/* Back square */}
            <rect x="26" y="10" width="24" height="24" rx="2" />
            {/* Connecting edges */}
            <line x1="14" y1="18" x2="26" y2="10" />
            <line x1="38" y1="18" x2="50" y2="10" />
            <line x1="14" y1="42" x2="26" y2="34" />
            <line x1="38" y1="42" x2="50" y2="34" />
            {/* Inner diagonal for "S3" feel */}
            <line x1="26" y1="22" x2="50" y2="34" />
            <line x1="38" y1="18" x2="26" y2="34" />
          </g>
        </svg>
      </div>
      <div className="flex flex-col">
        <span
          className={cn(
            "text-base font-semibold tracking-tight sm:text-lg",
            isLight ? "text-slate-900" : "text-slate-50"
          )}
        >
          AWS S3 Studio
        </span>
        {showSubtitle && (
          <span
            className={cn(
              "text-[11px]",
              isLight ? "text-slate-500" : "text-slate-400"
            )}
          >
            Your studio for S3
          </span>
        )}
      </div>
    </div>
  );
}

