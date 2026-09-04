"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarCheck,
  LayoutDashboard,
  Star,
  UserRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/components/common/logout-button";
import { BottomTabBar, type BottomTabItem } from "@/components/common/bottom-tab-bar";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  disabled?: boolean;
};

const PROFILE_NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Your Profile", href: "/common/profile", icon: UserRound },
  { label: "My Attendance", href: "/common/attendance", icon: CalendarCheck },
  { label: "My Salary", href: "/common/salary", icon: Wallet },
  { label: "My Score", href: "/common/score", icon: Star, disabled: true },
];

const BOTTOM_NAV: BottomTabItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "My Attendance", href: "/common/attendance", icon: CalendarCheck },
  { label: "My Salary", href: "/common/salary", icon: Wallet },
  { label: "Profile", href: "/common/profile", icon: UserRound },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === href || pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarLink({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const active = isActive(pathname, item.href);
  const Icon = item.icon;

  if (item.disabled) return null;

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-white-85 hover:bg-white/10 hover:text-white",
      )}
    >
      <Icon className="size-4 shrink-0" />
      {item.label}
    </Link>
  );
}

export function RoleSidebar() {
  return (
    <>
      <BottomTabBar items={BOTTOM_NAV} />

      <aside className="glass-card-global sticky top-20 ml-4 hidden h-[calc(100vh-6.5rem)] w-64 shrink-0 flex-col p-3 lg:flex">
        <nav className="mt-3 flex flex-col gap-1">
          {PROFILE_NAV.map((item) => (
            <SidebarLink key={item.href} item={item} />
          ))}
        </nav>

        <div className="mt-auto border-t border-white/10 pt-3">
          <div className="mt-2">
            <LogoutButton className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-white-85 transition-colors hover:bg-white/10 hover:text-white" />
          </div>
        </div>
      </aside>
    </>
  );
}
