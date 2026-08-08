import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type BadgeTone = "success" | "warning" | "danger" | "info" | "violet" | "neutral";

const TONE_STYLES: Record<BadgeTone, string> = {
  success: "border-emerald-500/30 bg-emerald-500/15 text-emerald-300",
  warning: "border-amber-500/30 bg-amber-500/15 text-amber-300",
  danger: "border-rose-500/30 bg-rose-500/15 text-rose-300",
  info: "border-sky-500/30 bg-sky-500/15 text-sky-300",
  violet: "border-violet-500/30 bg-violet-500/15 text-violet-300",
  neutral: "border-white/10 bg-white/5 text-slate-300",
};

const DOT_STYLES: Record<BadgeTone, string> = {
  success: "bg-emerald-400",
  warning: "bg-amber-400",
  danger: "bg-rose-400",
  info: "bg-sky-400",
  violet: "bg-violet-400",
  neutral: "bg-slate-400",
};

export function Badge({
  tone = "neutral",
  dot = true,
  children,
  className,
}: {
  tone?: BadgeTone;
  dot?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
        TONE_STYLES[tone],
        className,
      )}
    >
      {dot ? (
        <span className={cn("size-1.5 rounded-full", DOT_STYLES[tone])} />
      ) : null}
      {children}
    </span>
  );
}
