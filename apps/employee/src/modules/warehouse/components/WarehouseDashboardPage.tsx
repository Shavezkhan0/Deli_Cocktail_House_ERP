import { CalendarDays, ListTodo, Package } from "lucide-react";
import { DashboardShell } from "@/components/dashboards/dashboard-shell";

export function WarehouseDashboardPage() {
  return (
    <DashboardShell
      title="Welcome to the Warehouse workspace"
      description="Monitor inventory and event dispatch activity."
      features={[
        {
          title: "Inventory",
          description: "Track stock levels and availability.",
          icon: Package,
          accent: "bg-orange-100 text-orange-700",
        },
        {
          title: "Events",
          description: "Review event schedules and dispatch requirements.",
          icon: CalendarDays,
          accent: "bg-indigo-100 text-indigo-700",
        },
        {
          title: "My Tasks",
          description: "Stay on top of assigned warehouse duties.",
          icon: ListTodo,
          accent: "bg-violet-100 text-violet-700",
        },
      ]}
    />
  );
}
