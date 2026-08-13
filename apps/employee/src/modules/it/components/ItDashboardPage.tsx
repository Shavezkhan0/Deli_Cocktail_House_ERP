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
          accent: "bg-violet-100 text-violet-700",
        },
        {
          title: "Systems & Access",
          description: "Manage user access and system accounts.",
          icon: ShieldCheck,
          accent: "bg-emerald-100 text-emerald-700",
        },
        {
          title: "Infrastructure",
          description: "Monitor servers, devices and network health.",
          icon: HardDrive,
          accent: "bg-sky-100 text-sky-700",
        },
      ]}
    />
  );
}
