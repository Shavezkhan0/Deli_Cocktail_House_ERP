"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function handleLogout() {
    setIsPending(true);
    try {
      await fetch("/api/logout", { method: "POST" });
      router.replace("/login");
    } catch {
      toast.error("Failed to sign out");
      setIsPending(false);
    }
  }

  return (
    <Button variant="outline" onClick={handleLogout} disabled={isPending}>
      <LogOut data-icon="inline-start" />
      {isPending ? "Signing out…" : "Sign out"}
    </Button>
  );
}
