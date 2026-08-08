"use client";

import { useEffect, type ComponentType } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { RoleSidebar } from "@/components/layout/role-sidebar";
import { GreetingBanner } from "@/components/common/greeting-banner";
import { QuickStatsRow } from "@/components/common/quick-stats-row";
import { CrmDashboard } from "@/components/dashboards/crm-dashboard";
import { DataEntryDashboard } from "@/components/dashboards/data-entry-dashboard";
import { GraphicDesignerDashboard } from "@/components/dashboards/graphic-designer-dashboard";
import { SalesDashboard } from "@/components/dashboards/sales-dashboard";
import { WarehouseDashboard } from "@/components/dashboards/warehouse-dashboard";
import { SiteManagerDashboard } from "@/components/dashboards/site-manager-dashboard";
import { DefaultDashboard } from "@/components/dashboards/default-dashboard";

const DESIGNATION_DASHBOARDS: Record<string, ComponentType> = {
  CRM: CrmDashboard,
  DATA_ENTRY_OPERATOR: DataEntryDashboard,
  GRAPHIC_DESIGNER: GraphicDesignerDashboard,
  DESIGNER: GraphicDesignerDashboard,
  SALES_EXECUTIVE: SalesDashboard,
  WAREHOUSE_MANAGER: WarehouseDashboard,
  INVENTORY_MANAGER: WarehouseDashboard,
  SITE_MANAGER: SiteManagerDashboard,
  SUPERVISOR: SiteManagerDashboard,
};

function DashboardLoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading your dashboard…</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return <DashboardLoadingScreen />;
  }

  if (!user) {
    return null;
  }

  const Dashboard = DESIGNATION_DASHBOARDS[user.designation] ?? DefaultDashboard;

  return (
    <div className="flex min-h-screen bg-muted/20">
      <RoleSidebar />

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-6">
          <GreetingBanner />
          <QuickStatsRow />
          <Dashboard />
        </div>
      </main>
    </div>
  );
}
