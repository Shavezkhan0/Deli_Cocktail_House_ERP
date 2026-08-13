import { Building2, CalendarDays, ListTodo } from "lucide-react";
import { DashboardShell } from "@/components/dashboards/dashboard-shell";

export function SiteManagerDashboardPage() {
  return (
    <DashboardShell
      title="Site Overview"
      description="Manage your site operations, events and on-ground team."
      features={[
        {
          title: "Site Events",
          description: "Review events you manage at the site.",
          icon: Building2,
          accent: "bg-violet-100 text-violet-700",
        },
        {
          title: "Event Schedule",
          description: "Track upcoming event dates and requirements.",
          icon: CalendarDays,
          accent: "bg-indigo-100 text-indigo-700",
        },
        {
          title: "My Tasks",
          description: "Manage tasks assigned for site operations.",
          icon: ListTodo,
          accent: "bg-emerald-100 text-emerald-700",
        },
      ]}
    />
  );
}
