"use client";

import {
  LayoutDashboard,
  Package,
  Truck,
  Warehouse,
} from "lucide-react";
import { ModuleSidebar } from "@/components/module-sidebar";

const tabs = [
  { href: "/dashboard/warehouse", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/warehouse/inventory", label: "Inventory", icon: Package },
  { href: "/dashboard/warehouse/dispatch", label: "Dispatch", icon: Truck },
];

export default function WarehouseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6 md:flex-row">
      <ModuleSidebar
        basePath="/dashboard/warehouse"
        title="Warehouse Module"
        subtitle="Inventory & Dispatch"
        icon={Warehouse}
        tabs={tabs}
      />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
