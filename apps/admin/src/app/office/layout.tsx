import { Header } from "@/components/header";
import { RequireAuth } from "@/components/require-auth";
import { OfficeSidebar } from "@/components/office-sidebar";

export default function OfficeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth>
      <div className="flex min-h-screen flex-col bg-muted/20">
        <Header />
        <div className="flex flex-1 flex-col gap-4 p-4 lg:p-2 lg:flex-row">
          <OfficeSidebar />
          <main className="min-w-0 flex-1 pb-24 lg:pb-0">{children}</main>
        </div>
      </div>
    </RequireAuth>
  );
}
