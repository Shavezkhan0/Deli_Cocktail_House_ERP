"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Briefcase,
  CalendarCheck,
  ClipboardList,
  GlassWater,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Package,
  Palette,
  PenTool,
  SlidersHorizontal,
  Star,
  Tag,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

const WORK_NAV: NavItem[] = [
  { label: "CRM Dashboard", href: "/crm/dashboard", icon: Briefcase },
  { label: "My Tasks", href: "/designer/tasks", icon: ListTodo },
  { label: "Menu Design", href: "/crm/menu-design", icon: PenTool },
  { label: "Glass Tag Designer", href: "/crm/glass-tag", icon: Tag },
  { label: "Stirrer Design", href: "/crm/stirrer", icon: SlidersHorizontal },
  { label: "Logo Manager", href: "/crm/logo", icon: Palette },
];

const PROFILE_NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "My Attendance", href: "/common/attendance", icon: CalendarCheck },
  { label: "My Salary", href: "/common/salary", icon: Wallet },
  { label: "My Score", href: "/common/score", icon: Star },
];

const DESIGNATION_NAV: Record<string, NavItem[]> = {
  DATA_ENTRY_OPERATOR: [
    { label: "Data Entry", href: "/dashboard/data-entry", icon: ClipboardList },
  ],
  GRAPHIC_DESIGNER: [
    { label: "Task Board", href: "/designer/tasks", icon: Palette },
  ],
  DESIGNER: [
    { label: "Task Board", href: "/designer/tasks", icon: Palette },
  ],
  SALES_EXECUTIVE: [
    { label: "Sale Sheet", href: "/sales/sale-sheet", icon: TrendingUp },
  ],
  WAREHOUSE_MANAGER: [
    { label: "Kitting Report", href: "/warehouse/kitting-report", icon: Package },
  ],
  INVENTORY_MANAGER: [
    { label: "Kitting Report", href: "/warehouse/kitting-report", icon: Package },
  ],
  SITE_MANAGER: [
    { label: "Site Events", href: "/dashboard/events", icon: Briefcase },
  ],
  SUPERVISOR: [
    { label: "Site Events", href: "/dashboard/events", icon: Briefcase },
  ],
};

function NavLink({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const active = pathname === item.href;
  const Icon = item.icon;

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
  const router = useRouter();
  const { user, logout } = useAuth();

  const designation = user?.designation ?? "";
  const designationNav = DESIGNATION_NAV[designation] ?? [];
  const initials = (user?.name ?? "")
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();

  function handleLogout() {
    logout();
    toast.success("Logged out successfully");
    router.push("/login");
  }

  return (
    <aside className="no-print sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-border bg-background">
      <div className="flex items-center gap-3 border-b border-border px-6 py-5">
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
          <NavLink key={item.href} item={item} />
        ))}

        <p className="px-3 pb-2 pt-5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Your Profile
        </p>
        {PROFILE_NAV.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}

        {designationNav.length > 0 ? (
          <>
            <p className="px-3 pb-2 pt-5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Your Role
            </p>
            {designationNav.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </>
        ) : null}
      </nav>

      <div className="border-t border-border p-4">
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

        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
        >
          <LogOut className="size-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}
