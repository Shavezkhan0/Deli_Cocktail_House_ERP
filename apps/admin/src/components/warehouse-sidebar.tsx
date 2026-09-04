"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  CalendarDays,
  LayoutDashboard,
  Package,
  type LucideIcon,
} from "lucide-react";
import { ArrowLeft as ArrowLeftIcon } from "@/components/animate-ui/icons/arrow-left";
import { cn } from "@/lib/utils";
import { BottomTabBar } from "@/components/bottom-tab-bar";

type NavItem = {
  href: string;
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
};

const navItems: NavItem[] = [
  { href: "/warehouse/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/warehouse/inventory", label: "Inventory", icon: Package },
  { href: "/warehouse/events", label: "Events", icon: CalendarDays },
  { href: "/warehouse/stock-movements", label: "Stock Movements", shortLabel: "Stock", icon: Activity },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/warehouse/dashboard") {
    return pathname === href || pathname === "/warehouse";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function WarehouseSidebar() {
  const pathname = usePathname();

  function renderLink(item: NavItem, mobile = false) {
    const active = isActive(pathname, item.href);
    const Icon = item.icon;
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
      <BottomTabBar items={navItems} />

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
