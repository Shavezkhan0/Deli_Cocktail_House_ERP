import { Clapperboard, Film, ListTodo } from "lucide-react";
import { DashboardShell } from "@/components/dashboards/dashboard-shell";

export function VideoEditorDashboardPage() {
  return (
    <DashboardShell
      title="Welcome to the Video Editor workspace"
      description="Manage video production requests and editing work."
      features={[
        {
          title: "Editing Projects",
          description: "Track video projects and their due dates.",
          icon: Clapperboard,
          accent: "bg-fuchsia-500/15 text-fuchsia-300",
        },
        {
          title: "My Tasks",
          description: "Update progress on assigned editing work.",
          icon: ListTodo,
          accent: "bg-indigo-500/15 text-indigo-300",
        },
        {
          title: "Deliverables",
          description: "Review final exports and client deliveries.",
          icon: Film,
          accent: "bg-cyan-500/15 text-cyan-300",
        },
      ]}
    />
  );
}
