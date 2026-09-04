"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Banknote, Download, Loader2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  ErrorState,
  EmptyState,
  LoadingCards,
} from "@/components/common/states";
import {
  SalaryCalculation,
  type SalaryCalcData,
} from "@/components/common/salary-calculation";
import { formatCurrency, formatDate, monthLabel } from "@/lib/format";
import { apiFetch, downloadFile } from "@/lib/api";
import { cn } from "@/lib/utils";

type SalaryRecord = {
  id: string;
  month: number;
  year: number;
  amount: number;
  status: "PAID" | "UNPAID";
  paidDate: string | null;
  isEstimate?: boolean;
};

type SalaryData = {
  current: SalaryRecord | null;
  previous: SalaryRecord | null;
  history: SalaryRecord[];
};

type SalaryBreakdownData = SalaryCalcData & {
  employeeId: string;
  employeeNumber: string;
  employeeName: string;
  monthsSinceJoining: number;
  joiningDate: string;
  designation: string;
  extraEarnings: number;
  extraExpenseEntries: {
    id: string;
    amount: number;
    description: string;
    date: string | null;
  }[];
  compensatoryLeaves: number;
  compensatoryEntries: {
    date: string;
    label: string;
    status: "PRESENT" | "HALF_DAY" | "SHORT_LEAVE";
    credit: number;
  }[];
  usedLeaves: number;
  availableLeaveBalance: number;
  totalLeavesTaken: number;
  unpaidLeaves: number;
};

function SalaryStatusBadge({ status }: { status: SalaryRecord["status"] }) {
  const paid = status === "PAID";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide backdrop-blur-sm",
        paid
          ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-300"
          : "border-amber-400/30 bg-amber-500/15 text-amber-300",
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          paid ? "bg-emerald-400" : "bg-amber-400",
        )}
      />
      {status}
    </span>
  );
}

function CurrentMonthCard({ record }: { record: SalaryRecord | null }) {
  return (
    <section className="glass-card-global p-6 shadow-lg sm:p-8">
      <div className="flex items-start gap-3">
        <span className="gold-icon-bg flex size-9 shrink-0 items-center justify-center rounded-xl">
          <Banknote className="size-4.5" />
        </span>
        <div>
          <h3 className="text-base font-bold tracking-tight text-white">
            This Month&apos;s Salary
          </h3>
          <p className="mt-0.5 text-xs text-white/60">
            {monthLabel(new Date().getMonth() + 1, new Date().getFullYear())}
          </p>
        </div>
      </div>
      {record ? (
        record.isEstimate ? (
          <>
            <p className="mt-6 text-5xl font-black tracking-tight text-white">
              {formatCurrency(record.amount)}
            </p>
            <div className="mt-4 flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-500/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-300">
                <span className="size-1.5 rounded-full bg-amber-400" />
                Estimate
              </span>
              <p className="text-xs text-white/50">
                Calculated from attendance, leaves and expenses. Your final
                salary will appear here once it is published.
              </p>
            </div>
          </>
        ) : (
          <>
            <p className="mt-6 text-5xl font-black tracking-tight text-white">
              {formatCurrency(record.amount)}
            </p>
            <div className="mt-4 flex items-center gap-3">
              <SalaryStatusBadge status={record.status} />
              <p className="text-xs text-white/50">
                {record.paidDate
                  ? `Paid on ${formatDate(record.paidDate)}`
                  : "Payment is pending"}
              </p>
            </div>
          </>
        )
      ) : (
        <p className="mt-6 text-sm text-white/50">
          No salary record for this month yet. Your salary will appear here once
          it is published.
        </p>
      )}
    </section>
  );
}

function formatLeaveDays(value: number): string {
  return value === Math.round(value) ? String(value) : value.toFixed(2);
}

function LeaveRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: number;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-sm text-white/60">{label}</dt>
      <dd
        className={cn(
          "tabular-nums text-sm text-white",
          bold && "font-bold",
        )}
      >
        {formatLeaveDays(value)}
      </dd>
    </div>
  );
}

function LeaveBalanceCard({
  month,
  year,
  data,
  isPending,
  isError,
  onRetry,
}: {
  month: number;
  year: number;
  data?: SalaryBreakdownData | null;
  isPending: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  const label = monthLabel(month, year);

  if (isPending) {
    return (
      <section className="glass-card-global p-6 shadow-lg">
        <div className="h-4 w-40 animate-pulse rounded bg-white/10" />
        <div className="mt-4 h-8 w-2/3 animate-pulse rounded bg-white/10" />
      </section>
    );
  }

  if (isError || !data) {
    return (
      <section className="glass-card-global p-6 shadow-lg">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold tracking-tight text-white">
              Leave balance — {label}
            </h3>
            <p className="mt-0.5 text-xs text-white/50">
              Leave balance is not available for this month yet.
            </p>
          </div>
          {isError ? (
            <button
              type="button"
              onClick={onRetry}
              className="rounded-xl border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-white/15"
            >
              Retry
            </button>
          ) : null}
        </div>
      </section>
    );
  }

  const { paidLeave, shortLeave, eligibleForLeaves, eligibleFrom } = data;

  return (
    <section className="glass-card-global p-4 shadow-lg sm:p-6">
      <h3 className="text-base font-bold tracking-tight text-white">
        Leave balance — {label}
      </h3>
      <p className="mt-0.5 text-xs text-white/50">
        Your paid and short leave for this month.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm font-bold text-white">
            Paid leave ({label})
          </p>
          <dl className="mt-2 space-y-1 text-sm">
            <LeaveRow
              label="Carried from last month"
              value={paidLeave.opening}
            />
            <LeaveRow
              label="Earned this month"
              value={paidLeave.grantedThisMonth}
            />
            {!eligibleForLeaves ? (
              <p className="text-xs text-white/40">
                Paid-leave accrual starts {eligibleFrom} — 3 months after
                joining.
              </p>
            ) : null}
            <LeaveRow label="Used this month" value={paidLeave.usedThisMonth} />
            <LeaveRow
              label="Carried to next month"
              value={paidLeave.closing}
              bold
            />
          </dl>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm font-bold text-white">
            Short leave ({label})
          </p>
          <dl className="mt-2 space-y-1 text-sm">
            <LeaveRow label="Free allowance" value={shortLeave.allowance} />
            <LeaveRow
              label="Used this month"
              value={shortLeave.usedThisMonth}
            />
            <LeaveRow label="Remaining" value={shortLeave.remaining} bold />
            {!eligibleForLeaves || shortLeave.allowance === 0 ? (
              <p className="text-xs text-white/40">
                Short-leave allowance starts {eligibleFrom} — 3 months after
                joining.
              </p>
            ) : (
              <p className="text-xs text-white/40">
                Short leave does not carry forward — resets to 3 each month.
              </p>
            )}
          </dl>
        </div>
      </div>
    </section>
  );
}

export default function SalaryPage() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(currentYear);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["salary"],
    queryFn: async (): Promise<SalaryData> => {
      const [current, previous, history] = await Promise.all([
        apiFetch<SalaryRecord | null>("/api/employee/salary/current"),
        apiFetch<SalaryRecord | null>("/api/employee/salary/previous"),
        apiFetch<SalaryRecord[]>("/api/employee/salary/history"),
      ]);
      return { current, previous, history };
    },
  });

  const breakdownQuery = useQuery({
    queryKey: ["salary", "breakdown", month, year],
    queryFn: () =>
      apiFetch<SalaryBreakdownData>(
        `/api/employee/salary/breakdown?month=${month}&year=${year}`,
      ),
  });

  const downloadMutation = useMutation({
    mutationFn: () =>
      downloadFile(
        `/api/employee/salary/slip?month=${month}&year=${year}`,
        `salary-slip-${year}-${month}.pdf`,
      ),
    onSuccess: () => toast.success("Salary slip downloaded"),
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : "Could not download salary slip";
      toast.error(message);
    },
  });

  const historyRecords = useMemo(() => {
    if (!data) {
      return [];
    }
    const records = [...data.history];
    if (
      data.previous &&
      !records.some((record) => record.id === data.previous?.id)
    ) {
      records.unshift(data.previous);
    }
    return records;
  }, [data]);

  let content: React.ReactNode;

  if (isPending) {
    content = <LoadingCards />;
  } else if (isError) {
    content = (
      <ErrorState message="Could not load your salary" onRetry={refetch} />
    );
  } else if (data) {
    content = (
      <>
        {/* ─── Month Selector + Download ─── */}
        <div className="glass-card-global flex flex-col gap-3 p-4 shadow-lg sm:flex-row sm:items-end sm:justify-between sm:p-5">
          <div>
            <h3 className="text-sm font-bold tracking-tight text-white">
              Select month to view / download
            </h3>
            <p className="mt-0.5 text-xs text-white/50">
              Choose a month to preview the salary slip and leave balance.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex gap-2">
              <div className="flex-1 sm:w-40">
                <Select
                  value={String(month)}
                  onValueChange={(value) => setMonth(Number(value))}
                >
                  <SelectTrigger className="w-full border-white/15 bg-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, index) => {
                      const m = index + 1;
                      return (
                        <SelectItem key={m} value={String(m)}>
                          {monthLabel(m, year)}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-24 shrink-0">
                <Select
                  value={String(year)}
                  onValueChange={(value) => setYear(Number(value))}
                >
                  <SelectTrigger className="w-full border-white/15 bg-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 5 }, (_, index) => {
                      const y = currentYear - 2 + index;
                      return (
                        <SelectItem key={y} value={String(y)}>
                          {y}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <button
              type="button"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-md shadow-primary/40 transition-all hover:-translate-y-0.5 hover:shadow-primary/60 active:scale-[0.98] sm:w-auto"
              onClick={() => downloadMutation.mutate()}
              disabled={downloadMutation.isPending}
            >
              {downloadMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              Slip (PDF)
            </button>
          </div>
        </div>

        <LeaveBalanceCard
          month={month}
          year={year}
          data={breakdownQuery.data}
          isPending={breakdownQuery.isPending}
          isError={breakdownQuery.isError}
          onRetry={() => breakdownQuery.refetch()}
        />

        <CurrentMonthCard record={data.current} />

        {/* ─── Salary Calculation ─── */}
        <section className="glass-card-global overflow-hidden shadow-lg">
          <div className="border-b border-white/10 px-6 py-4">
            <h3 className="text-lg font-bold text-white">
              Salary Calculation — {monthLabel(month, year)}
            </h3>
            <p className="mt-0.5 text-xs text-white/50">
              {breakdownQuery.isPending
                ? "Loading your salary breakdown..."
                : breakdownQuery.data
                  ? `How ${formatCurrency(breakdownQuery.data.baseSalary)} becomes ${formatCurrency(breakdownQuery.data.finalAmount)}`
                  : "Your salary breakdown for the selected month."}
            </p>
          </div>
          <div className="p-4 sm:p-6">
            {breakdownQuery.isPending ? (
              <LoadingCards count={2} />
            ) : breakdownQuery.isError ? (
              <ErrorState
                message="Could not load salary calculation"
                onRetry={() => breakdownQuery.refetch()}
              />
            ) : breakdownQuery.data ? (
              <SalaryCalculation data={breakdownQuery.data} />
            ) : null}
          </div>
        </section>

        {/* ─── Salary History Table ─── */}
        <section className="glass-card-global overflow-hidden shadow-lg">
          <div className="border-b border-white/10 px-6 py-4">
            <h3 className="text-lg font-bold text-white">
              Salary History
            </h3>
            <p className="mt-0.5 text-xs text-white/50">
              Your past monthly salary records.
            </p>
          </div>

          {historyRecords.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/15 text-left text-[11px] uppercase tracking-wider text-white/80">
                    <th className="px-6 py-3.5 font-semibold">
                      Month / Year
                    </th>
                    <th className="px-6 py-3.5 font-semibold">Amount</th>
                    <th className="px-6 py-3.5 font-semibold">Status</th>
                    <th className="px-6 py-3.5 font-semibold">Paid Date</th>
                  </tr>
                </thead>
                <tbody>
                  {historyRecords.map((record) => (
                    <tr
                      key={record.id}
                      className="border-b border-white/10 transition-colors hover:bg-white/5"
                    >
                      <td className="px-6 py-4 font-medium text-white">
                        {monthLabel(record.month, record.year)}
                      </td>
                      <td className="px-6 py-4 text-white">
                        {formatCurrency(record.amount)}
                      </td>
                      <td className="px-6 py-4">
                        <SalaryStatusBadge status={record.status} />
                      </td>
                      <td className="px-6 py-4 text-white/60">
                        {record.paidDate ? formatDate(record.paidDate) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-white/5">
                <Wallet className="size-6 text-white/30" />
              </div>
              <p className="text-sm font-semibold text-white/80">
                No salary history yet
              </p>
              <p className="text-xs text-white/40">
                Salary records will appear here once they are published.
              </p>
            </div>
          )}
        </section>
      </>
    );
  }

  return (
    <AppShell
      title="My Salary"
      subtitle="Track your monthly salary and payment status."
      icon={<Wallet className="size-5" />}
    >
      {content}
    </AppShell>
  );
}
