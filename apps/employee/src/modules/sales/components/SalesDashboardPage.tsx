import { CalendarDays, TrendingUp, Wallet } from "lucide-react";
import { DashboardShell } from "@/components/dashboards/dashboard-shell";

export function SalesDashboardPage() {
  return (
    <DashboardShell
      title="Welcome to the Sales workspace"
      description="Track your leads, events and sales-related activity."
      features={[
        {
          title: "Sales Activity",
          description: "Monitor your current sales pipeline and leads.",
          icon: TrendingUp,
          accent: "bg-amber-100 text-amber-700",
        },
        {
          title: "Events",
          description: "Review event schedules you are involved with.",
          icon: CalendarDays,
          accent: "bg-indigo-100 text-indigo-700",
        },
        {
          title: "Expenses",
          description: "Submit and track your sales-related expenses.",
          icon: Wallet,
          accent: "bg-emerald-100 text-emerald-700",
        },
      ]}
    />
  );
}
