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
          accent: "bg-amber-500/15 text-amber-300",
        },
        {
          title: "Events",
          description: "Review event schedules you are involved with.",
          icon: CalendarDays,
          accent: "bg-indigo-500/15 text-indigo-300",
        },
        {
          title: "Expenses",
          description: "Submit and track your sales-related expenses.",
          icon: Wallet,
          accent: "bg-emerald-500/15 text-emerald-300",
        },
      ]}
    />
  );
}
