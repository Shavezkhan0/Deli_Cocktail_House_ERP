"use client";

import { Banknote, CalendarDays } from "lucide-react";
import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { Users } from "@/components/animate-ui/icons/users";
import { ModuleSidebar } from "@/components/module-sidebar";

function EmployeesIcon({ className }: { className?: string }) {
  return <Users animateOnHover className={className} />;
}

function AttendanceIcon({ className }: { className?: string }) {
  return (
    <AnimateIcon animateOnHover>
      <CalendarDays className={className} />
    </AnimateIcon>
  );
}

function SalariesIcon({ className }: { className?: string }) {
  return (
    <AnimateIcon animateOnHover>
      <Banknote className={className} />
    </AnimateIcon>
  );
}

const tabs = [
  { href: "/dashboard/office/employees", label: "Employees", icon: EmployeesIcon },
  { href: "/dashboard/office/attendance", label: "Attendance", icon: AttendanceIcon },
  { href: "/dashboard/office/salaries", label: "Salaries", icon: SalariesIcon },
];

export default function OfficeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="-m-6 flex min-h-[calc(100vh-4rem)] flex-col gap-4 p-4 lg:p-2 lg:flex-row">
      <ModuleSidebar basePath="/dashboard/office" tabs={tabs} />
      <div className="min-w-0 flex-1 pb-24 lg:pb-0">{children}</div>
    </div>
  );
}
