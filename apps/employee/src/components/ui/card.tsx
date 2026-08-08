import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  icon,
  action,
  className,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-3", className)}>
      <div className="flex items-start gap-3">
        {icon ? (
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">
            {icon}
          </span>
        ) : null}
        <div>
          <h3 className="text-base font-semibold tracking-tight text-white/90">
            {title}
          </h3>
          {subtitle ? (
            <p className="mt-0.5 text-xs text-white/60">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {action}
    </div>
  );
}
