"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GlassWater } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/components/common/logout-button";
import {
  DESIGNATION_NAV,
  PROFILE_NAV,
  WORK_NAV,
  type NavItem,
} from "@/components/layout/nav-items";

function NavLink({ item, designation }: { item: NavItem; designation: string }) {
  const pathname = usePathname();
  const active = pathname === item.href;
  const Icon = item.icon;
  const locked =
    item.disabled === true ||
    (item.onlyFor !== undefined && !item.onlyFor.includes(designation));

  if (locked) {
    return null;
  }

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon className="size-4 shrink-0" />
      {item.label}
    </Link>
  );
}

function humanizeDesignation(designation: string): string {
  return designation
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function RoleSidebar() {
  const { user } = useAuth();

  const designation = user?.designation ?? "";
  const designationNav = DESIGNATION_NAV[designation] ?? [];
  const initials = (user?.name ?? "")
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <aside className="no-print sticky top-6 hidden h-[calc(100vh-3rem)] w-64 shrink-0 flex-col rounded-2xl border border-border bg-card p-3 shadow-sm lg:ml-6 lg:flex">
      <div className="-mx-3 -mt-3 flex items-center gap-3 border-b border-border px-6 py-5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <GlassWater className="size-5" />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-tight text-foreground">
            Deli Cocktail House
          </p>
          <p className="text-xs text-muted-foreground">Employee Portal</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {WORK_NAV.map((item) => (
          <NavLink key={item.href} item={item} designation={designation} />
        ))}

        {designationNav.length > 0 ? (
          <>
            <p className="px-3 pb-2 pt-5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Your Role
            </p>
            {designationNav.map((item) => (
              <NavLink key={item.href} item={item} designation={designation} />
            ))}
          </>
        ) : null}

        <p className="px-3 pb-2 pt-5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Your Profile
        </p>
        {PROFILE_NAV.map((item) => (
          <NavLink key={item.href} item={item} designation={designation} />
        ))}
      </nav>

      <div className="-mx-3 -mb-3 border-t border-border p-4">
        <div className="mb-3 flex items-center gap-3 px-1">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
            {initials || "U"}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {user?.name}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {designation ? humanizeDesignation(designation) : "—"}
            </p>
          </div>
        </div>

        <LogoutButton className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10" />
      </div>
    </aside>
  );
}
