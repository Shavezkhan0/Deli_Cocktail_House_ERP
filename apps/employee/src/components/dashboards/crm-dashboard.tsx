import { Briefcase, CalendarDays, ListTodo } from "lucide-react";
import { DashboardShell } from "./dashboard-shell";

export function CrmDashboard() {
  return (
    <DashboardShell
      title="CRM Overview"
      description="Manage the client events assigned to you and stay on top of your follow-ups."
      features={[
        {
          title: "CRM Events",
          description: "Browse the events where you are the assigned CRM.",
          icon: Briefcase,
          accent: "bg-sky-500/15 text-sky-300",
        },
        {
          title: "Upcoming Events",
          description: "Track upcoming event dates, venues and client details.",
          icon: CalendarDays,
          accent: "bg-indigo-500/15 text-indigo-300",
        },
        {
          title: "My Tasks",
          description: "Review tasks and update their progress.",
          icon: ListTodo,
          accent: "bg-violet-500/15 text-violet-300",
        },
      ]}
    />
  );
}
