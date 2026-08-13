import { Briefcase, CalendarDays, ListTodo } from "lucide-react";
import { DashboardShell } from "@/components/dashboards/dashboard-shell";

export function CrmDashboardPage() {
  return (
    <DashboardShell
      title="CRM Overview"
      description="Manage the client events assigned to you and stay on top of your follow-ups."
      features={[
        {
          title: "CRM Events",
          description: "Browse the events where you are the assigned CRM.",
          icon: Briefcase,
          accent: "bg-sky-100 text-sky-700",
        },
        {
          title: "Upcoming Events",
          description: "Track upcoming event dates, venues and client details.",
          icon: CalendarDays,
          accent: "bg-indigo-100 text-indigo-700",
        },
        {
          title: "My Tasks",
          description: "Review tasks and update their progress.",
          icon: ListTodo,
          accent: "bg-violet-100 text-violet-700",
        },
      ]}
    />
  );
}
