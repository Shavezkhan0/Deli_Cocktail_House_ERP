"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  Briefcase,
  CalendarCheck,
  CalendarDays,
  LayoutDashboard,
  ListTodo,
  Palette,
  PenTool,
  SlidersHorizontal,
  Star,
  Tag,
  UserRound,
  Wallet,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/components/common/logout-button";
import { BottomTabBar, type BottomTabItem } from "@/components/common/bottom-tab-bar";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  disabled?: boolean;
  onlyFor?: string[];
};

const WORK_NAV: NavItem[] = [
  { label: "CRM Dashboard", href: "/modules/crm/dashboard", icon: Briefcase, onlyFor: [] },
];

const DESIGNATION_NAV: Record<string, NavItem[]> = {
  CRM: [],
  WAREHOUSE_MANAGER: [
    { label: "Dashboard", href: "/dashboard", icon: Warehouse, onlyFor: ["WAREHOUSE_MANAGER"] },
  ],
};

const PROFILE_NAV: NavItem[] = [
  { label: "Your Profile", href: "/common/profile", icon: LayoutDashboard },
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

function SidebarLink({
  item,
  designation,
}: {
  item: NavItem;
  designation: string;
}) {
  const pathname = usePathname();
  const active = isActive(pathname, item.href);
  const Icon = item.icon;
  const locked =
    item.disabled === true ||
    (item.onlyFor !== undefined && !item.onlyFor.includes(designation));

  if (locked) return null;

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

  return (
    <>
      <BottomTabBar items={BOTTOM_NAV} />

      <aside className="glass-card-global sticky top-20 ml-4 hidden h-[calc(100vh-6.5rem)] w-64 shrink-0 flex-col p-3 lg:flex">
        <nav className="mt-3 flex flex-col gap-1">
          <p className="px-3 pb-2 pt-1 text-xs font-medium uppercase tracking-wider text-white/50">
            Work
          </p>
          {WORK_NAV.map((item) => (
            <SidebarLink key={item.href} item={item} designation={designation} />
          ))}

          {designationNav.length > 0 ? (
            <>
              <p className="px-3 pb-2 pt-5 text-xs font-medium uppercase tracking-wider text-white/50">
                Your Role
              </p>
              {designationNav.map((item) => (
                <SidebarLink key={item.href} item={item} designation={designation} />
              ))}
            </>
          ) : null}

          <p className="px-3 pb-2 pt-5 text-xs font-medium uppercase tracking-wider text-white/50">
            Your Profile
          </p>
          {PROFILE_NAV.map((item) => (
            <SidebarLink key={item.href} item={item} designation={designation} />
          ))}
        </nav>

        <div className="mt-auto border-t border-white/10 pt-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-white-85 transition-colors hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="size-4" />
            Back to Modules
          </Link>
          <div className="mt-2">
            <LogoutButton className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-white-85 transition-colors hover:bg-white/10 hover:text-white" />
          </div>
        </div>
      </aside>
    </>
  );
}
