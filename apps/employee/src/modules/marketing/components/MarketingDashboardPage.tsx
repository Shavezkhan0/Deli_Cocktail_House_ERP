import { Megaphone, PenLine, TrendingUp } from "lucide-react";
import { DashboardShell } from "@/components/dashboards/dashboard-shell";

export function MarketingDashboardPage() {
  return (
    <DashboardShell
      title="Welcome to the Marketing workspace"
      description="Plan campaigns and grow the brand across every channel."
      features={[
        {
          title: "Campaigns",
          description: "Plan and monitor marketing campaigns.",
          icon: Megaphone,
          accent: "bg-pink-500/15 text-pink-300",
        },
        {
          title: "Content",
          description: "Coordinate content and creative assets.",
          icon: PenLine,
          accent: "bg-amber-500/15 text-amber-300",
        },
        {
          title: "Growth",
          description: "Review reach, engagement and performance.",
          icon: TrendingUp,
          accent: "bg-emerald-500/15 text-emerald-300",
        },
      ]}
    />
  );
}
