"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CalendarClock, Info } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import {
  ErrorState,
  EmptyState,
} from "@/components/common/states";
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
  holidayWork?: {
    extraDays: number;
    entries: ExtraDaysEntry[];
  };
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
    content = (
      <div className="flex flex-col gap-6">
        <div className="glass-card-global h-16 animate-pulse shadow-lg" />
        <div className="glass-card-global h-64 animate-pulse shadow-lg" />
      </div>
    );
  } else if (isError) {
    content = (
      <ErrorState
        message="Could not load your extra days"
        onRetry={refetch}
      />
    );
  } else if (data && data.entries.length > 0) {
    content = (
      <section className="glass-card-global overflow-hidden shadow-lg">
        <div className="border-b border-white/10 px-6 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/30 bg-violet-500/15 px-3 py-1 text-xs font-semibold text-violet-300">
              <span className="size-1.5 rounded-full bg-violet-400" />
              Extra pay days:{" "}
              {data.holidayWork?.extraDays ?? data.compensatoryLeaves}
            </span>
            <p className="w-full text-xs text-white/50">
              Working on a Sunday, holiday or assigned workday earns you extra
              pay on top of your base salary.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/15 text-left text-[11px] uppercase tracking-wider text-white/80">
                <th className="px-6 py-3.5 font-semibold">Date</th>
                <th className="px-6 py-3.5 font-semibold">Reason</th>
                <th className="px-6 py-3.5 font-semibold">Attendance</th>
                <th className="px-6 py-3.5 font-semibold">Credit</th>
                <th className="px-6 py-3.5 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.entries.map((entry) => (
                <tr
                  key={entry.date}
                  className="border-b border-white/10 transition-colors hover:bg-white/5"
                >
                  <td className="px-6 py-4 font-medium text-white">
                    {formatDate(entry.date)}
                  </td>
                  <td className="px-6 py-4 text-white">
                    {SOURCE_LABELS[entry.source]}
                  </td>
                  <td className="px-6 py-4 text-white/60">
                    {STATUS_LABELS[entry.status]}
                  </td>
                  <td className="px-6 py-4 text-white">
                    {formatCredit(entry)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide backdrop-blur-sm",
                        entry.banked
                          ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-300"
                          : "border-amber-400/30 bg-amber-500/15 text-amber-300",
                      )}
                    >
                      <span
                        className={cn(
                          "size-1.5 rounded-full",
                          entry.banked ? "bg-emerald-400" : "bg-amber-400",
                        )}
                      />
                      {entry.banked ? "Banked" : "Pending"}
                    </span>
                    {!entry.banked && (
                      <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-white/40">
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
      <div className="glass-card-global flex flex-col items-center gap-3 py-16 text-center shadow-lg">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-white/5">
          <CalendarClock className="size-7 text-white/30" />
        </div>
        <p className="text-base font-semibold text-white/80">
          No extra days yet
        </p>
        <p className="max-w-xs text-sm text-white/40">
          Extra pay is earned when you work on Sundays, holidays, or assigned
          workdays.
        </p>
      </div>
    );
  }

  return (
    <AppShell
      title="Extra Days"
      subtitle="Extra pay for days you worked on Sundays, holidays, or assigned workdays."
      icon={<CalendarClock className="size-5" />}
      actions={
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-white/15"
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
