import { requireAuth } from "@/lib/session";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAuth();

  return <AppShell>{children}</AppShell>;
}
