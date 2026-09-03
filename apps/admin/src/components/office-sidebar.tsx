"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  CalendarClock,
  CalendarX2,
  LayoutDashboard,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import { ArrowLeft as ArrowLeftIcon } from "@/components/animate-ui/icons/arrow-left";
import { Badge } from "@/components/ui/badge";
import { BottomTabBar } from "@/components/bottom-tab-bar";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
  future?: boolean;
};

const navItems: NavItem[] = [
  { href: "/office/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/office/employees", label: "Employees", icon: Users },
  { href: "/office/attendance", label: "Attendance & Salary", shortLabel: "Attendance", icon: CalendarClock },
  { href: "/office/holidays", label: "Holidays", icon: CalendarX2 },
  { href: "/office/designation-locations", label: "Designation Locations", shortLabel: "Locations", icon: Building2 },
  { href: "#", label: "Employee Score", icon: Trophy, future: true },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/office/dashboard") {
    return pathname === href || pathname === "/office";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function OfficeSidebar() {
  const pathname = usePathname();

  function renderLink(item: NavItem, mobile = false) {
    const active = isActive(pathname, item.href);
    const Icon = item.icon;

    if (item.future) {
      return (
        <div
          key={item.label}
          className={cn(
            "flex items-center rounded-lg px-3 py-2 text-sm font-medium text-white-85",
            mobile ? "shrink-0 gap-2" : "gap-3",
            "opacity-70",
          )}
        >
          <Icon className="size-4" />
          {item.label}
          <Badge variant="outline" className="ml-auto border-dashed text-white-85">
            Future
          </Badge>
        </div>
      );
    }

    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          "flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          mobile ? "shrink-0 gap-2" : "gap-3",
          active
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-white-85 hover:bg-white/10 hover:text-white",
        )}
      >
        <Icon className="size-4" />
        {item.label}
      </Link>
    );
  }

  return (
    <>
      <BottomTabBar items={navItems.filter((item) => !item.future)} />

      <aside className="glass-card-global sticky top-16 hidden h-[calc(100vh-5.5rem)] w-64 shrink-0 flex-col p-3 lg:flex">
        <nav className="mt-3 flex flex-col gap-1">
          {navItems.map((item) => renderLink(item))}
        </nav>

        <div className="mt-auto flex flex-col gap-1 border-t border-border pt-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-white-85 transition-colors hover:bg-white/10 hover:text-white"
          >
            <ArrowLeftIcon animateOnHover className="size-4" />
            Back to Modules
          </Link>
        </div>
      </aside>
    </>
  );
}
