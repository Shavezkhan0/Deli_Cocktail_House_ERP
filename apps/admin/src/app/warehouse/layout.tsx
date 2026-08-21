import { Header } from "@/components/header";
import { RequireAuth } from "@/components/require-auth";
import { WarehouseSidebar } from "@/components/warehouse-sidebar";

export default function WarehouseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth>
      <div className="flex min-h-screen flex-col bg-muted/20">
        <Header />
        <div className="flex flex-1 flex-col gap-4 p-4 lg:p-2 lg:flex-row">
          <WarehouseSidebar />
          <main className="min-w-0 flex-1 pb-24 lg:pb-0">{children}</main>
        </div>
      </div>
    </RequireAuth>
  );
}
