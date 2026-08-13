import { Car, MapPin, Truck } from "lucide-react";
import { DashboardShell } from "@/components/dashboards/dashboard-shell";

export function DriverDashboardPage() {
  return (
    <DashboardShell
      title="Welcome to the Driver workspace"
      description="Manage trips, deliveries and vehicle duties."
      features={[
        {
          title: "My Trips",
          description: "View assigned trips and delivery schedules.",
          icon: Car,
          accent: "bg-sky-100 text-sky-700",
        },
        {
          title: "Deliveries",
          description: "Track pickup and drop-off points.",
          icon: Truck,
          accent: "bg-amber-100 text-amber-700",
        },
        {
          title: "Routes",
          description: "Review routes and event locations.",
          icon: MapPin,
          accent: "bg-emerald-100 text-emerald-700",
        },
      ]}
    />
  );
}
