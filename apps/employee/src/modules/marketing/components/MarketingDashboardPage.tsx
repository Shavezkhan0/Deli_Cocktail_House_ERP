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
          accent: "bg-pink-100 text-pink-700",
        },
        {
          title: "Content",
          description: "Coordinate content and creative assets.",
          icon: PenLine,
          accent: "bg-amber-100 text-amber-700",
        },
        {
          title: "Growth",
          description: "Review reach, engagement and performance.",
          icon: TrendingUp,
          accent: "bg-emerald-100 text-emerald-700",
        },
      ]}
    />
  );
}
