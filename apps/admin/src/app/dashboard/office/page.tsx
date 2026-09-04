import { Building2 } from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function OfficePage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Office Module
        </h1>
        <p className="text-white-85 text-sm">
          HR, attendance and administrative operations.
        </p>
      </div>

      <Card className="glass-card-global">
        <CardHeader className="flex flex-row items-center gap-3">
          <span className="gold-icon-bg flex size-10 items-center justify-center rounded-lg">
            <Building2 className="size-5" />
          </span>
          <div>
            <CardTitle className="text-white font-bold">Coming soon</CardTitle>
            <CardDescription className="text-white-85">
              Select a section from the sidebar to get started.
            </CardDescription>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}
