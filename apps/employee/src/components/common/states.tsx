import { AlertCircle, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
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
          className="h-44 animate-pulse rounded-2xl border border-border bg-muted"
        />
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
    <Card className="flex flex-col items-center gap-3 py-10 text-center">
      <AlertCircle className="size-8 text-destructive" />
      <p className="text-sm font-medium text-foreground">
        {message ?? "Something went wrong"}
      </p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw className="size-3.5" />
        Try again
      </Button>
    </Card>
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
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-muted/40 px-6 py-10 text-center">
      <p className="text-sm font-medium text-foreground">{message}</p>
      {sub ? <p className="text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}
