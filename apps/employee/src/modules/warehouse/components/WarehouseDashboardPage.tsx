import { Boxes, PackageCheck, Warehouse } from "lucide-react";
import { DashboardShell } from "@/components/dashboards/dashboard-shell";

export function WarehouseDashboardPage() {
  return (
    <DashboardShell
      title="Welcome to the Warehouse workspace"
      description="Manage warehouse inventory, track dispatches, inspect event returns and monitor warehouse operations."
      features={[
        {
          title: "Warehouse Inventory",
          description: "Monitor stock quantities, equipment availability and storage assets.",
          icon: Boxes,
          accent: "bg-orange-100 text-orange-700",
        },
        {
          title: "Dispatch Operations",
          description: "Coordinate dispatches and packing checklists for upcoming events.",
          icon: Warehouse,
          accent: "bg-sky-100 text-sky-700",
        },
        {
          title: "Stock Returns",
          description: "Process returned goods, check for damages and reconcile stock.",
          icon: PackageCheck,
          accent: "bg-emerald-100 text-emerald-700",
        },
      ]}
    />
  );
}
