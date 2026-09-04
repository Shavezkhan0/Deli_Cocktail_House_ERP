import { Users } from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function EmployeesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Employees
        </h1>
        <p className="text-white-85 text-sm">
          Manage your catering staff and roles.
        </p>
      </div>

      <Card className="glass-card-global">
        <CardHeader className="flex flex-row items-center gap-3">
          <span className="gold-icon-bg flex size-10 items-center justify-center rounded-lg">
            <Users className="size-5" />
          </span>
          <div>
            <CardTitle className="text-white font-bold">Coming soon</CardTitle>
            <CardDescription className="text-white-85">
              Employee management will be available here.
            </CardDescription>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}
