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
        <div className="flex flex-1 flex-col gap-4 p-0 sm:p-2 lg:flex-row">
          <WarehouseSidebar />
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </RequireAuth>
  );
}
