"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { useAuth } from "@/lib/auth";

export function useLogout() {
  const router = useRouter();
  const { logout } = useAuth();

  return useCallback(() => {
    logout();
    toast.success("Logged out successfully");
    router.push("/login");
  }, [logout, router]);
}

export function LogoutButton({
  label = "Logout",
  className,
}: {
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const logout = useLogout();

  function confirmLogout() {
    setOpen(false);
    logout();
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        <LogOut className="size-4" />
        {label}
      </button>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Log out?"
        description="Are you sure you want to log out? You will need to sign in again to continue."
        confirmLabel="Log out"
        confirmIcon={<LogOut className="size-4" />}
        confirmVariant="danger"
        onConfirm={confirmLogout}
      />
    </>
  );
}
