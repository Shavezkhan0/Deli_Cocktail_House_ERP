import { CalendarDays, ClipboardCheck, ListTodo } from "lucide-react";
import { DashboardShell } from "@/components/dashboards/dashboard-shell";

export function OperationCoordinatorDashboardPage() {
  return (
    <DashboardShell
      title="Welcome to the Operation Coordinator workspace"
      description="Coordinate event logistics and keep operations running smoothly."
      features={[
        {
          title: "Event Operations",
          description: "Oversee event logistics and coordination.",
          icon: CalendarDays,
          accent: "bg-cyan-500/15 text-cyan-300",
        },
        {
          title: "Task Assignments",
          description: "Track and manage assigned operational tasks.",
          icon: ListTodo,
          accent: "bg-indigo-500/15 text-indigo-300",
        },
        {
          title: "Vendor Coordination",
          description: "Liaise with vendors for event requirements.",
          icon: ClipboardCheck,
          accent: "bg-emerald-500/15 text-emerald-300",
        },
      ]}
    />
  );
}
