import { CalendarDays, ClipboardList, Users } from "lucide-react";
import { DashboardShell } from "./dashboard-shell";

export function DefaultDashboard() {
  return (
    <DashboardShell
      title="My Workspace"
      description="Your personal hub for attendance, salary, scores, tasks and more."
      features={[
        {
          title: "Attendance",
          description: "Mark your daily attendance and review history.",
          icon: CalendarDays,
          accent: "bg-emerald-500/15 text-emerald-300",
        },
        {
          title: "My Tasks",
          description: "Track tasks assigned to you and update progress.",
          icon: ClipboardList,
          accent: "bg-indigo-500/15 text-indigo-300",
        },
        {
          title: "Team Contacts",
          description: "Manage vendor and team contacts you have added.",
          icon: Users,
          accent: "bg-sky-500/15 text-sky-300",
        },
      ]}
    />
  );
}
