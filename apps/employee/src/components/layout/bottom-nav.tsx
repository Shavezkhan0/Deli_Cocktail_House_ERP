"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronUp, LogOut, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { BOTTOM_NAV } from "@/components/layout/nav-items";

function humanizeDesignation(designation: string): string {
  return designation
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const designation = user?.designation ?? "";
  const initials = (user?.name ?? "")
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();

  function handleLogout() {
    setMenuOpen(false);
    logout();
    toast.success("Logged out successfully");
    router.push("/login");
  }

  return (
    <>
      <div className="no-print fixed right-4 top-4 z-40 lg:hidden">
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-label="Open profile menu"
            className="flex items-center gap-1.5 rounded-full border border-border bg-popover py-1.5 pl-1.5 pr-2 shadow-xl shadow-foreground/5 transition-colors hover:bg-muted"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
              {initials || <UserRound className="size-4" />}
            </span>
            <span className="hidden max-w-20 flex-col items-start leading-tight min-[420px]:flex">
              <span className="truncate text-xs font-semibold text-foreground">
                {user?.name ?? "Profile"}
              </span>
              <span className="truncate text-[10px] text-muted-foreground">
                {designation ? humanizeDesignation(designation) : "—"}
              </span>
            </span>
            <ChevronUp
              className={cn(
                "size-3.5 shrink-0 text-muted-foreground transition-transform",
                menuOpen ? "" : "rotate-180",
              )}
            />
          </button>

          {menuOpen ? (
            <>
              <div
                className="fixed inset-0 z-[-1] bg-black/5"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 top-full mt-3 w-56 overflow-hidden rounded-2xl border border-border bg-popover p-1.5 shadow-xl shadow-foreground/10">
                <div className="border-b border-border px-3 pb-2.5 pt-2">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {user?.name ?? "Employee"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {designation ? humanizeDesignation(designation) : "Employee Portal"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
                >
                  <LogOut className="size-4" />
                  Logout
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>

      <nav className="no-print fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
        <div className="relative mx-auto flex max-w-lg items-center gap-1 rounded-full border border-border bg-popover p-1.5 shadow-xl shadow-foreground/5">
          {BOTTOM_NAV.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-1 flex-col items-center gap-0.5 rounded-full px-2 py-2 transition-colors",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-5 shrink-0" />
                <span className="max-w-full truncate text-[10px] font-semibold leading-none">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
