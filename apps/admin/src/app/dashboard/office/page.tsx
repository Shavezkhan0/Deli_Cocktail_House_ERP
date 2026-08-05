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
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Office Module
        </h1>
        <p className="text-sm text-muted-foreground">
          HR, attendance and administrative operations.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Building2 className="size-5" />
          </span>
          <div>
            <CardTitle>Coming soon</CardTitle>
            <CardDescription>
              Select a section from the sidebar to get started.
            </CardDescription>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}
