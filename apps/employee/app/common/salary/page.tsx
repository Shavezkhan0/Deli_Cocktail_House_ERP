"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Banknote, Download, Loader2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ErrorState, EmptyState, LoadingCards } from "@/components/common/states";
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
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
        paid ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700",
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          paid ? "bg-emerald-500" : "bg-amber-500",
        )}
      />
      {status}
    </span>
  );
}

function CurrentMonthCard({ record }: { record: SalaryRecord | null }) {
  return (
    <section className="rounded-xl bg-card p-6 ring-1 ring-foreground/10 sm:p-8">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">
          <Banknote className="size-4.5" />
        </span>
        <div>
          <h3 className="text-base font-semibold tracking-tight text-foreground">
            This Month&apos;s Salary
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {monthLabel(new Date().getMonth() + 1, new Date().getFullYear())}
          </p>
        </div>
      </div>
      {record ? (
        record.isEstimate ? (
          <>
            <p className="mt-6 text-5xl font-black tracking-tight text-foreground">
              {formatCurrency(record.amount)}
            </p>
            <div className="mt-4 flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                <span className="size-1.5 rounded-full bg-amber-500" />
                Estimate
              </span>
              <p className="text-xs text-muted-foreground">
                Calculated from attendance, leaves and expenses. Your final
                salary will appear here once it is published.
              </p>
            </div>
          </>
        ) : (
          <>
            <p className="mt-6 text-5xl font-black tracking-tight text-foreground">
              {formatCurrency(record.amount)}
            </p>
            <div className="mt-4 flex items-center gap-3">
              <SalaryStatusBadge status={record.status} />
              <p className="text-xs text-muted-foreground">
                {record.paidDate
                  ? `Paid on ${formatDate(record.paidDate)}`
                  : "Payment is pending"}
              </p>
            </div>
          </>
        )
      ) : (
        <p className="mt-6 text-sm text-muted-foreground">
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
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "tabular-nums text-foreground",
          bold && "font-semibold",
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
      <section className="rounded-xl bg-card p-6 ring-1 ring-foreground/10">
        <div className="h-4 w-40 animate-pulse rounded bg-muted" />
        <div className="mt-4 h-8 w-2/3 animate-pulse rounded bg-muted" />
      </section>
    );
  }

  if (isError || !data) {
    return (
      <section className="rounded-xl bg-card p-6 ring-1 ring-foreground/10">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-foreground">
              Leave balance — {label}
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Leave balance is not available for this month yet.
            </p>
          </div>
          {isError ? (
            <Button variant="outline" size="sm" onClick={onRetry}>
              Retry
            </Button>
          ) : null}
        </div>
      </section>
    );
  }

  const { paidLeave, shortLeave, eligibleForLeaves, eligibleFrom } = data;

  return (
    <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-6">
      <h3 className="text-base font-semibold tracking-tight text-foreground">
        Leave balance — {label}
      </h3>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Your paid and short leave for this month.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <p className="text-sm font-semibold text-foreground">
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
              <p className="text-xs text-muted-foreground">
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
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <p className="text-sm font-semibold text-foreground">
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
              <p className="text-xs text-muted-foreground">
                Short-leave allowance starts {eligibleFrom} — 3 months after
                joining.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
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
        error instanceof Error ? error.message : "Could not download salary slip";
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
    content = <ErrorState message="Could not load your salary" onRetry={refetch} />;
  } else if (data) {
    content = (
      <>
        <div className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:flex-row sm:items-end sm:justify-between sm:p-5">
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-foreground">
              Select month to view / download
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
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
                  <SelectTrigger className="w-full">
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
                  <SelectTrigger className="w-full">
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
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => downloadMutation.mutate()}
              disabled={downloadMutation.isPending}
            >
              {downloadMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              Slip (PDF)
            </Button>
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

        <section className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
          <div className="border-b border-border px-6 py-4">
            <h3 className="text-base font-semibold tracking-tight text-foreground">
              Salary Calculation — {monthLabel(month, year)}
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {breakdownQuery.isPending
                ? "Loading your salary breakdown…"
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

        <section className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
          <div className="border-b border-border px-6 py-4">
            <h3 className="text-base font-semibold tracking-tight text-foreground">
              Salary History
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Your past monthly salary records.
            </p>
          </div>

          {historyRecords.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-6 py-3.5 font-semibold">Month / Year</th>
                    <th className="px-6 py-3.5 font-semibold">Amount</th>
                    <th className="px-6 py-3.5 font-semibold">Status</th>
                    <th className="px-6 py-3.5 font-semibold">Paid Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {historyRecords.map((record) => (
                    <tr
                      key={record.id}
                      className="transition-colors hover:bg-muted/40"
                    >
                      <td className="px-6 py-4 font-medium text-foreground">
                        {monthLabel(record.month, record.year)}
                      </td>
                      <td className="px-6 py-4 text-foreground">
                        {formatCurrency(record.amount)}
                      </td>
                      <td className="px-6 py-4">
                        <SalaryStatusBadge status={record.status} />
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {record.paidDate ? formatDate(record.paidDate) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6">
              <EmptyState
                message="No salary history yet"
                sub="Salary records will appear here once they are published."
              />
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
