import { Header } from "@/components/header";
import { RequireAuth } from "@/components/require-auth";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth>
      <div className="flex min-h-screen flex-col bg-muted/20">
        <Header />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </RequireAuth>
  );
}
