import { Target, TrendingUp, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const progressRows = [
  { label: "Event Conversion", value: 72, icon: TrendingUp },
  { label: "New Clients Acquired", value: 48, icon: Users },
  { label: "Monthly Target", value: 86, icon: Target },
];

export function CrmProgress() {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="flex flex-col gap-6 p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-base font-medium tracking-tight text-foreground">
              CRM Progress
            </h2>
            <p className="text-sm text-muted-foreground">
              Visual placeholder for CRM performance tracking.
            </p>
          </div>
          <Badge variant="outline" className="shrink-0 border-dashed text-muted-foreground">
            Coming soon
          </Badge>
        </div>

        <div className="flex flex-col gap-4">
          {progressRows.map((row) => {
            const Icon = row.icon;
            return (
              <div key={row.label} className="space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Icon className="size-4 text-muted-foreground" />
                    {row.label}
                  </span>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {row.value}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60"
                    style={{ width: `${row.value}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
