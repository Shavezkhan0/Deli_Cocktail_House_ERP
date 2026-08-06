"use client";

import { Banknote, CalendarDays, Users } from "lucide-react";
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
    <div className="-m-6 flex min-h-[calc(100vh-4rem)] flex-col gap-4 p-0 sm:p-2 lg:flex-row">
      <ModuleSidebar basePath="/dashboard/office" tabs={tabs} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
