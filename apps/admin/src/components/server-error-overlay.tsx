"use client";
import { ServerCrash } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ServerErrorOverlay({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-4 bg-background/95 p-6 text-center backdrop-blur-sm">
      <ServerCrash className="size-10 text-destructive" />
      <div>
        <p className="text-lg font-semibold text-foreground">Server is not responding</p>
        <p className="mt-1 text-sm text-muted-foreground">
          We couldn&apos;t reach the server. Check your connection and try again.
        </p>
      </div>
      <Button onClick={onRetry}>Retry</Button>
    </div>
  );
}
