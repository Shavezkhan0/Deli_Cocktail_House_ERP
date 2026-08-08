import { Building2, CalendarDays, ListTodo } from "lucide-react";
import { DashboardShell } from "./dashboard-shell";

export function SiteManagerDashboard() {
  return (
    <DashboardShell
      title="Site Overview"
      description="Manage your site operations, events and on-ground team."
      features={[
        {
          title: "Site Events",
          description: "Review events you manage at the site.",
          icon: Building2,
          accent: "bg-violet-500/15 text-violet-300",
        },
        {
          title: "Event Schedule",
          description: "Track upcoming event dates and requirements.",
          icon: CalendarDays,
          accent: "bg-indigo-500/15 text-indigo-300",
        },
        {
          title: "My Tasks",
          description: "Manage tasks assigned for site operations.",
          icon: ListTodo,
          accent: "bg-emerald-500/15 text-emerald-300",
        },
      ]}
    />
  );
}
