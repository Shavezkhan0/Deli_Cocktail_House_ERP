"use client";

import { useEffect, type ComponentType } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { RoleSidebar } from "@/components/layout/role-sidebar";
import { GreetingBanner } from "@/components/common/greeting-banner";
import { QuickStatsRow } from "@/components/common/quick-stats-row";
import { CrmDashboardPage } from "@/modules/crm/components/CrmDashboardPage";
import { GraphicDesignerDashboardPage } from "@/modules/graphic-designer/components/GraphicDesignerDashboardPage";
import { OperationCoordinatorDashboardPage } from "@/modules/operation-coordinator/components/OperationCoordinatorDashboardPage";
import { DataEntryDashboardPage } from "@/modules/data-entry/components/DataEntryDashboardPage";
import { ProcessCoordinatorDashboardPage } from "@/modules/process-coordinator/components/ProcessCoordinatorDashboardPage";
import { ItDashboardPage } from "@/modules/it/components/ItDashboardPage";
import { OfficeBoyDashboardPage } from "@/modules/office-boy/components/OfficeBoyDashboardPage";
import { WarehouseDashboardPage } from "@/modules/warehouse/components/WarehouseDashboardPage";
import { VideoEditorDashboardPage } from "@/modules/video-editor/components/VideoEditorDashboardPage";
import { MarketingDashboardPage } from "@/modules/marketing/components/MarketingDashboardPage";
import { SalesDashboardPage } from "@/modules/sales/components/SalesDashboardPage";
import { DriverDashboardPage } from "@/modules/driver/components/DriverDashboardPage";
import { DefaultDashboard } from "@/components/dashboards/default-dashboard";

const DESIGNATION_DASHBOARDS: Record<string, ComponentType> = {
  CRM: CrmDashboardPage,
  GRAPHIC_DESIGNER: GraphicDesignerDashboardPage,
  OPERATION_COORDINATOR: OperationCoordinatorDashboardPage,
  DATA_ENTRY_OPERATOR: DataEntryDashboardPage,
  PROCESS_COORDINATOR: ProcessCoordinatorDashboardPage,
  IT_SOFTWARE_DEVELOPER: ItDashboardPage,
  OFFICE_BOY: OfficeBoyDashboardPage,
  WAREHOUSE_MANAGER: WarehouseDashboardPage,
  VIDEO_EDITOR: VideoEditorDashboardPage,
  MARKETING_EXECUTIVE: MarketingDashboardPage,
  SALES_EXECUTIVE: SalesDashboardPage,
  DRIVER: DriverDashboardPage,
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
