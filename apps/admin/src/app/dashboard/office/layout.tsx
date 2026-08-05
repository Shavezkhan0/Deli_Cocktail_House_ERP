"use client";

import { Banknote, Building2, CalendarDays, Users } from "lucide-react";
import { ModuleSidebar } from "@/components/module-sidebar";

const tabs = [
  { href: "/dashboard/office/employees", label: "Employees", icon: Users },
  { href: "/dashboard/office/attendance", label: "Attendance", icon: CalendarDays },
  { href: "/dashboard/office/salaries", label: "Salaries", icon: Banknote },
];

export default function OfficeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6 md:flex-row">
      <ModuleSidebar
        basePath="/dashboard/office"
        title="Office Module"
        subtitle="HR & Administration"
        icon={Building2}
        tabs={tabs}
      />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
