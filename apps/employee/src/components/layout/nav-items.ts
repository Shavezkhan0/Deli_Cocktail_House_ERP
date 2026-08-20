import {
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
  Wallet,
  Warehouse,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  disabled?: boolean;
  onlyFor?: string[];
};

export const WORK_NAV: NavItem[] = [
  { label: "CRM Dashboard", href: "/modules/crm/dashboard", icon: Briefcase, onlyFor: [] },
  { label: "My Tasks", href: "/modules/designer/tasks", icon: ListTodo, onlyFor: ["GRAPHIC_DESIGNER"] },
  { label: "Menu Design", href: "/modules/crm/menu-design", icon: PenTool, onlyFor: ["GRAPHIC_DESIGNER"] },
  { label: "Glass Tag Designer", href: "/modules/crm/glass-tag", icon: Tag, onlyFor: ["GRAPHIC_DESIGNER"] },
  { label: "Stirrer Design", href: "/modules/crm/stirrer", icon: SlidersHorizontal, onlyFor: ["GRAPHIC_DESIGNER"] },
  { label: "Logo Manager", href: "/modules/crm/logo", icon: Palette, onlyFor: ["GRAPHIC_DESIGNER"] },
];

export const PROFILE_NAV: NavItem[] = [
  { label: "Your Profile", href: "/common/profile", icon: LayoutDashboard },
  { label: "My Attendance", href: "/common/attendance", icon: CalendarCheck },
  { label: "My Salary", href: "/common/salary", icon: Wallet },
  { label: "My Score", href: "/common/score", icon: Star, disabled: true },
];

export const DESIGNATION_NAV: Record<string, NavItem[]> = {
  CRM: [],
  WAREHOUSE_MANAGER: [
    { label: "Dashboard", href: "/dashboard", icon: Warehouse, onlyFor: ["WAREHOUSE_MANAGER"] },
  ],
};

export const BOTTOM_NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "My Attendance", href: "/common/attendance", icon: CalendarCheck },
  { label: "My Salary", href: "/common/salary", icon: Wallet },
];
