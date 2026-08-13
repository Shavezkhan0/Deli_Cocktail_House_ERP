"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Banknote, Wallet } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { ErrorState, EmptyState, LoadingCards } from "@/components/common/states";
import { formatCurrency, formatDate, monthLabel } from "@/lib/format";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

type SalaryRecord = {
  id: string;
  month: number;
  year: number;
  amount: number;
  status: "PAID" | "UNPAID";
  paidDate: string | null;
};

type SalaryData = {
  current: SalaryRecord | null;
  previous: SalaryRecord | null;
  history: SalaryRecord[];
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
      ) : (
        <p className="mt-6 text-sm text-muted-foreground">
          No salary record for this month yet. Your salary will appear here once
          it is published.
        </p>
      )}
    </section>
  );
}

export default function SalaryPage() {
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
        <CurrentMonthCard record={data.current} />

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
