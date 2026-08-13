import { CalendarDays, ClipboardList, ListChecks } from "lucide-react";
import { DashboardShell } from "@/components/dashboards/dashboard-shell";

export function ProcessCoordinatorDashboardPage() {
  return (
    <DashboardShell
      title="Welcome to the Process Coordinator workspace"
      description="Streamline workflows and ensure every process stays on track."
      features={[
        {
          title: "Process Workflows",
          description: "Monitor process stages from start to completion.",
          icon: ListChecks,
          accent: "bg-teal-500/15 text-teal-300",
        },
        {
          title: "Event Schedules",
          description: "Review schedules and align teams on timelines.",
          icon: CalendarDays,
          accent: "bg-indigo-500/15 text-indigo-300",
        },
        {
          title: "Progress Tracking",
          description: "Track milestones and flag pending items.",
          icon: ClipboardList,
          accent: "bg-amber-500/15 text-amber-300",
        },
      ]}
    />
  );
}
