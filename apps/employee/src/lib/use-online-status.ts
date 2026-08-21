"use client";
import { useEffect, useState } from "react";

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    function syncStatus() {
      setIsOnline(navigator.onLine);
    }

    window.addEventListener("online", syncStatus);
    window.addEventListener("offline", syncStatus);
    window.addEventListener("focus", syncStatus);
    document.addEventListener("visibilitychange", syncStatus);
    syncStatus();

    return () => {
      window.removeEventListener("online", syncStatus);
      window.removeEventListener("offline", syncStatus);
      window.removeEventListener("focus", syncStatus);
      document.removeEventListener("visibilitychange", syncStatus);
    };
  }, []);

  return isOnline;
}
