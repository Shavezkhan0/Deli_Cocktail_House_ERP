"use client";

import { ClipboardCheck, List, Plus, GlassWater } from "lucide-react";
import { ModuleSidebar } from "@/components/module-sidebar";

const tabs = [
  { href: "/dashboard/events", label: "All Events", icon: List },
  { href: "/dashboard/events/create", label: "Create Event", icon: Plus },
  { href: "/dashboard/events/approvals", label: "Approvals", icon: ClipboardCheck },
];

export default function EventsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6 md:flex-row">
      <ModuleSidebar
        basePath="/dashboard/events"
        title="Event Module"
        subtitle="Planning & Approvals"
        icon={GlassWater}
        tabs={tabs}
      />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
