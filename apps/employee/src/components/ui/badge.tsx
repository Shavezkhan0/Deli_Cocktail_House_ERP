import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type BadgeTone = "success" | "warning" | "danger" | "info" | "violet" | "neutral";

const TONE_STYLES: Record<BadgeTone, string> = {
  success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-700",
  danger: "border-rose-500/30 bg-rose-500/10 text-rose-700",
  info: "border-sky-500/30 bg-sky-500/10 text-sky-700",
  violet: "border-violet-500/30 bg-violet-500/10 text-violet-700",
  neutral: "border-border bg-muted text-muted-foreground",
};

const DOT_STYLES: Record<BadgeTone, string> = {
  success: "bg-emerald-600",
  warning: "bg-amber-600",
  danger: "bg-rose-600",
  info: "bg-sky-600",
  violet: "bg-violet-600",
  neutral: "bg-muted-foreground",
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
