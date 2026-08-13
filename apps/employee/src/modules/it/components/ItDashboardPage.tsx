import { HardDrive, ShieldCheck, Wrench } from "lucide-react";
import { DashboardShell } from "@/components/dashboards/dashboard-shell";

export function ItDashboardPage() {
  return (
    <DashboardShell
      title="Welcome to the IT workspace"
      description="Manage systems, support requests and keep everything running securely."
      features={[
        {
          title: "Support Requests",
          description: "Resolve technical issues reported by the team.",
          icon: Wrench,
          accent: "bg-violet-500/15 text-violet-300",
        },
        {
          title: "Systems & Access",
          description: "Manage user access and system accounts.",
          icon: ShieldCheck,
          accent: "bg-emerald-500/15 text-emerald-300",
        },
        {
          title: "Infrastructure",
          description: "Monitor servers, devices and network health.",
          icon: HardDrive,
          accent: "bg-sky-500/15 text-sky-300",
        },
      ]}
    />
  );
}
