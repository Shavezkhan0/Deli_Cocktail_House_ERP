import { CalendarDays, ListTodo, Package } from "lucide-react";
import { DashboardShell } from "./dashboard-shell";

export function WarehouseDashboard() {
  return (
    <DashboardShell
      title="Warehouse Overview"
      description="Monitor inventory and event dispatch activity."
      features={[
        {
          title: "Inventory",
          description: "Track stock levels and availability.",
          icon: Package,
          accent: "bg-orange-500/15 text-orange-300",
        },
        {
          title: "Events",
          description: "Review event schedules and dispatch requirements.",
          icon: CalendarDays,
          accent: "bg-indigo-500/15 text-indigo-300",
        },
        {
          title: "My Tasks",
          description: "Stay on top of assigned warehouse duties.",
          icon: ListTodo,
          accent: "bg-violet-500/15 text-violet-300",
        },
      ]}
    />
  );
}
