import { CalendarDays } from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AttendancePage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Attendance
        </h1>
        <p className="text-sm text-muted-foreground">
          Track staff presence and work logs.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <CalendarDays className="size-5" />
          </span>
          <div>
            <CardTitle>Coming soon</CardTitle>
            <CardDescription>
              Attendance tracking will be available here.
            </CardDescription>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}
