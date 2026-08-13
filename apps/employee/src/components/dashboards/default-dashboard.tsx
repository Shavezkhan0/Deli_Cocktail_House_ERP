import { DashboardShell } from "./dashboard-shell";

export function DefaultDashboard() {
  return (
    <DashboardShell
      title="My Workspace"
      description="Welcome to your personal hub. Use the sidebar to navigate to your attendance, salary, and assigned modules."
      features={[]} // Remove unnecessary feature cards
    />
  );
}
