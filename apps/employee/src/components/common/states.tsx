import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LoadingCards({
  className,
  count = 4,
}: {
  className?: string;
  count?: number;
}) {
  return (
    <div className={cn("grid gap-6 sm:grid-cols-2", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="glass-card-global h-44 animate-pulse rounded-2xl border border-white/10 p-6 flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="h-4 w-32 rounded-lg bg-white/15" />
            <div className="h-8 w-48 rounded-lg bg-white/15" />
          </div>
          <div className="h-3 w-40 rounded-lg bg-white/10" />
        </div>
      ))}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message?: string;
  onRetry: () => void;
}) {
  return (
    <div className="glass-card-global flex flex-col items-center gap-3 rounded-2xl border border-white/10 py-10 text-center">
      <AlertCircle className="size-8 text-rose-400" />
      <p className="text-sm font-medium text-white">
        {message ?? "Something went wrong"}
      </p>
      <Button
        variant="outline"
        size="sm"
        onClick={onRetry}
        className="border-white/15 bg-white/10 text-white hover:bg-white/20"
      >
        <RefreshCw className="size-3.5" />
        Try again
      </Button>
    </div>
  );
}

export function EmptyState({
  message,
  sub,
}: {
  message: string;
  sub?: string;
}) {
  return (
    <div className="glass-card-global flex flex-col items-center gap-2 rounded-2xl border border-dashed border-white/15 bg-white/5 px-6 py-10 text-center">
      <p className="text-sm font-medium text-white">{message}</p>
      {sub ? <p className="text-xs text-white/60">{sub}</p> : null}
    </div>
  );
}

