import { ClipboardList, ListTodo, Sparkles } from "lucide-react";
import { DashboardShell } from "@/components/dashboards/dashboard-shell";

export function OfficeBoyDashboardPage() {
  return (
    <DashboardShell
      title="Welcome to the Office Boy workspace"
      description="Manage daily errands and office support tasks."
      features={[
        {
          title: "Daily Errands",
          description: "Track and complete assigned errands.",
          icon: Sparkles,
          accent: "bg-rose-100 text-rose-700",
        },
        {
          title: "My Tasks",
          description: "Stay on top of assigned office duties.",
          icon: ListTodo,
          accent: "bg-indigo-100 text-indigo-700",
        },
        {
          title: "Requests",
          description: "Review support requests from the team.",
          icon: ClipboardList,
          accent: "bg-amber-100 text-amber-700",
        },
      ]}
    />
  );
}
