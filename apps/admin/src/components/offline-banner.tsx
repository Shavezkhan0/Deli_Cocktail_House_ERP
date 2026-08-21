"use client";
import { WifiOff } from "lucide-react";

export function OfflineBanner({ isOffline }: { isOffline: boolean }) {
  if (!isOffline) return null;
  return (
    <div className="fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-2 bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground">
      <WifiOff className="size-4" />
      You&apos;re offline. Check your internet connection.
    </div>
  );
}