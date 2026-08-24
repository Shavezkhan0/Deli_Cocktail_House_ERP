"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CalendarClock, Info } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { ErrorState, EmptyState, LoadingCards } from "@/components/common/states";
import { formatDate } from "@/lib/format";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

type ExtraDaysEntry = {
  date: string;
  source: "SUNDAY" | "HOLIDAY" | "FORCE_WORK";
  status: "PRESENT" | "HALF_DAY" | "SHORT_LEAVE";
  credit: number;
  banked: boolean;
};

type ExtraDaysRecord = {
  month: number;
  year: number;
  compensatoryLeaves: number;
  availableLeaveBalance: number;
  entries: ExtraDaysEntry[];
};

const SOURCE_LABELS: Record<ExtraDaysEntry["source"], string> = {
  SUNDAY: "Worked Sunday",
  HOLIDAY: "Worked Holiday",
  FORCE_WORK: "Assigned Workday",
};

const STATUS_LABELS: Record<ExtraDaysEntry["status"], string> = {
  PRESENT: "Present",
  HALF_DAY: "Half Day",
  SHORT_LEAVE: "Short Leave",
};

function formatCredit(entry: ExtraDaysEntry): string {
  if (entry.status === "PRESENT") {
    return `${entry.credit} day`;
  }
  return `${entry.credit} day${entry.credit === 1 ? "" : "s"}`;
}

export default function ExtraDaysPage() {
  const router = useRouter();

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["salary", "extra-days"],
    queryFn: () => apiFetch<ExtraDaysRecord>("/api/employee/salary/extra-days"),
  });

  let content: React.ReactNode;

  if (isPending) {
    content = <LoadingCards count={2} />;
  } else if (isError) {
    content = <ErrorState message="Could not load your extra days" onRetry={refetch} />;
  } else if (data && data.entries.length > 0) {
    content = (
      <section className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
        <div className="border-b border-border px-6 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="size-1.5 rounded-full bg-violet-500" />
              Total: {data.compensatoryLeaves} credit{data.compensatoryLeaves === 1 ? "" : "s"}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Available: {data.availableLeaveBalance} leave{data.availableLeaveBalance === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-6 py-3.5 font-semibold">Date</th>
                <th className="px-6 py-3.5 font-semibold">Reason</th>
                <th className="px-6 py-3.5 font-semibold">Attendance</th>
                <th className="px-6 py-3.5 font-semibold">Credit</th>
                <th className="px-6 py-3.5 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.entries.map((entry) => (
                <tr
                  key={entry.date}
                  className="transition-colors hover:bg-muted/40"
                >
                  <td className="px-6 py-4 font-medium text-foreground">
                    {formatDate(entry.date)}
                  </td>
                  <td className="px-6 py-4 text-foreground">
                    {SOURCE_LABELS[entry.source]}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {STATUS_LABELS[entry.status]}
                  </td>
                  <td className="px-6 py-4 text-foreground">
                    {formatCredit(entry)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
                        entry.banked
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700",
                      )}
                    >
                      <span
                        className={cn(
                          "size-1.5 rounded-full",
                          entry.banked ? "bg-emerald-500" : "bg-amber-500",
                        )}
                      />
                      {entry.banked ? "Banked" : "Pending"}
                    </span>
                    {!entry.banked && (
                      <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Info className="size-3" />
                        counts from next month
                      </p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    );
  } else {
    content = (
      <EmptyState
        message="No extra days yet"
        sub="Extra days are earned when you work on Sundays, holidays, or assigned workdays."
      />
    );
  }

  return (
    <AppShell
      title="Extra Days"
      subtitle="Days you worked on Sundays, holidays, or assigned workdays."
      icon={<CalendarClock className="size-5" />}
      actions={
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          <ArrowLeft className="size-4" />
          Back to Dashboard
        </button>
      }
    >
      {content}
    </AppShell>
  );
}
