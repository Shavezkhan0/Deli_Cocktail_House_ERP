import { Image, ListTodo, Users } from "lucide-react";
import { DashboardShell } from "./dashboard-shell";

export function GraphicDesignerDashboard() {
  return (
    <DashboardShell
      title="Creative Overview"
      description="Manage your design tasks and client artwork requests."
      features={[
        {
          title: "Creative Tasks",
          description: "Track design briefs and their due dates.",
          icon: Image,
          accent: "bg-fuchsia-500/15 text-fuchsia-300",
        },
        {
          title: "My Tasks",
          description: "Update progress on assigned design work.",
          icon: ListTodo,
          accent: "bg-indigo-500/15 text-indigo-300",
        },
        {
          title: "Vendors",
          description: "Manage contacts for printing and creative vendors.",
          icon: Users,
          accent: "bg-sky-500/15 text-sky-300",
        },
      ]}
    />
  );
}
