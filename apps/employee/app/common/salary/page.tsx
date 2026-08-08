"use client";

import { useQuery } from "@tanstack/react-query";
import { Banknote, Wallet } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ErrorState, EmptyState, LoadingCards } from "@/components/common/states";
import { formatCurrency, formatDate, monthLabel } from "@/lib/format";
import { apiFetch } from "@/lib/api";

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

function MonthSalaryCard({
  label,
  record,
}: {
  label: string;
  record: SalaryRecord | null;
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader
        title={label}
        icon={
          <Banknote className="size-4.5" />
        }
      />
      {record ? (
        <>
          <p className="mt-5 text-4xl font-black tracking-tight text-white">
            {formatCurrency(record.amount)}
          </p>
          <div className="mt-4">
            <Badge tone={record.status === "PAID" ? "success" : "warning"}>
              {record.status}
            </Badge>
          </div>
          <p className="mt-3 text-xs text-white/60">
            {record.paidDate
              ? `Paid on ${formatDate(record.paidDate)}`
              : "Payment is pending"}
          </p>
        </>
      ) : (
        <p className="mt-5 text-sm text-white/60">
          No salary record for {label} yet.
        </p>
      )}
    </Card>
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

  let content: React.ReactNode;

  if (isPending) {
    content = <LoadingCards />;
  } else if (isError) {
    content = <ErrorState message="Could not load your salary" onRetry={refetch} />;
  } else if (data) {
    content = (
      <>
        <div className="grid gap-6 sm:grid-cols-2">
          <MonthSalaryCard
            label={`Current Month (${monthLabel(new Date().getMonth() + 1, new Date().getFullYear())})`}
            record={data.current}
          />
          <MonthSalaryCard
            label={`Previous Month (${monthLabel(new Date().getMonth(), new Date().getFullYear())})`}
            record={data.previous}
          />
        </div>

        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl">
          <div className="border-b border-white/10 px-6 py-4">
            <h3 className="text-base font-semibold tracking-tight text-white/90">
              Salary History
            </h3>
            <p className="mt-0.5 text-xs text-white/60">
              Your salary records from the last 6 months.
            </p>
          </div>

          {data.history.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wider text-white/60">
                    <th className="px-6 py-3.5 font-semibold">Month</th>
                    <th className="px-6 py-3.5 font-semibold">Amount</th>
                    <th className="px-6 py-3.5 font-semibold">Status</th>
                    <th className="px-6 py-3.5 font-semibold">Paid Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {data.history.map((record) => (
                    <tr
                      key={record.id}
                      className="transition-colors hover:bg-white/[0.04]"
                    >
                      <td className="px-6 py-4 font-medium text-white/90">
                        {monthLabel(record.month, record.year)}
                      </td>
                      <td className="px-6 py-4 text-white/90">
                        {formatCurrency(record.amount)}
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          tone={record.status === "PAID" ? "success" : "warning"}
                        >
                          {record.status}
                        </Badge>
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
            <div className="p-6">
              <EmptyState
                message="No salary history yet"
                sub="Salary records will appear here once they are published."
              />
            </div>
          )}
        </div>
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
