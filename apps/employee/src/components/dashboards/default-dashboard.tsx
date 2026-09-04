import {
  CalendarCheck,
  Wallet,
  UserRound,
  Briefcase,
  Warehouse,
  Star,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { DashboardShell, type DashboardFeature } from "./dashboard-shell";

const BASE_FEATURES: DashboardFeature[] = [
  {
    title: "My Attendance",
    description: "Check in, view your history and track punctuality.",
    icon: CalendarCheck,
    accent: "bg-emerald-100 text-emerald-700",
    href: "/common/attendance",
  },
  {
    title: "My Salary",
    description: "View payslips, leave balance and extra days.",
    icon: Wallet,
    accent: "bg-indigo-100 text-indigo-700",
    href: "/common/salary",
  },
  {
    title: "My Profile",
    description: "View and update your personal details.",
    icon: UserRound,
    accent: "bg-sky-100 text-sky-700",
    href: "/common/profile",
  },
];

const DESIGNATION_FEATURES: Record<string, DashboardFeature[]> = {
  CRM: [
    {
      title: "CRM Events",
      description: "Browse events where you are the assigned CRM.",
      icon: Briefcase,
      accent: "bg-sky-100 text-sky-700",
      href: "/modules/crm/dashboard",
    },
  ],
  WAREHOUSE_MANAGER: [
    {
      title: "Warehouse Dashboard",
      description: "Overview of inventory, events and complaints.",
      icon: Warehouse,
      accent: "bg-violet-100 text-violet-700",
      href: "/modules/warehouse/dashboard",
    },
  ],
};

export function DefaultDashboard() {
  const { user } = useAuth();
  const designation = user?.designation ?? "";
  const designationFeatures = DESIGNATION_FEATURES[designation] ?? [];
  const allFeatures = [...designationFeatures, ...BASE_FEATURES];

  return (
    <DashboardShell
      title="My Workspace"
      description="Welcome to your personal hub. Use the sidebar to navigate to your attendance, salary, and assigned modules."
      features={allFeatures}
    />
  );
}
