import { CalendarDays, ClipboardList, Plane } from "lucide-react";
import { DashboardShell } from "./dashboard-shell";

export function DataEntryDashboard() {
  return (
    <DashboardShell
      title="Data Entry Overview"
      description="Keep event records and operational data accurate and up to date."
      features={[
        {
          title: "Event Records",
          description: "Review and maintain event information entered in the system.",
          icon: CalendarDays,
          accent: "bg-teal-500/15 text-teal-300",
        },
        {
          title: "Data Entry Tasks",
          description: "Complete pending entries assigned to you.",
          icon: ClipboardList,
          accent: "bg-indigo-500/15 text-indigo-300",
        },
        {
          title: "Travel Logs",
          description: "Log and verify travel details for your records.",
          icon: Plane,
          accent: "bg-sky-500/15 text-sky-300",
        },
      ]}
    />
  );
}
