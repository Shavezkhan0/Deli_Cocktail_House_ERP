"use client";

import { useQuery } from "@tanstack/react-query";
import {
  CalendarCheck,
  CalendarRange,
  Star,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

type AttendanceTodayResponse = {
  marked: boolean;
  attendance: unknown | null;
};

type SalaryRecord = {
  month: number;
  year: number;
  amount: number;
  status: "PAID" | "UNPAID";
};

type WeeklyScoreRecord = {
  score: number;
  notes: string | null;
};

type LeaveBalanceRecord = {
  month: number;
  year: number;
  earnedLeaves: number;
  compensatoryLeaves: number;
  usedLeaves: number;
  availableLeaveBalance: number;
};

export type StatCardProps = {
  label: string;
  icon: LucideIcon;
  accent: string;
  children: React.ReactNode;
  sub?: React.ReactNode;
  loading?: boolean;
  onClick?: () => void;
  active?: boolean;
};

export function StatCard({ label, icon: Icon, accent, children, sub, loading, onClick, active }: StatCardProps) {
  const classes = cn(
    "rounded-xl bg-card p-5 ring-1 ring-foreground/10",
    active && "ring-2 ring-primary/40",
    onClick &&
      "w-full cursor-pointer text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:ring-2 hover:ring-primary/20",
  );

  const body = (
    <div className="flex items-center gap-4">
      <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", accent)}>
        <Icon className="size-5" />
      </span>

      {loading ? (
        <div className="w-full space-y-2">
          <div className="h-3 w-24 animate-pulse rounded-md bg-muted" />
          <div className="h-4 w-16 animate-pulse rounded-md bg-muted" />
        </div>
      ) : (
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <div className="mt-1 text-lg font-semibold text-foreground">{children}</div>
          {sub ? <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div> : null}
        </div>
      )}
    </div>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={classes}>
        {body}
      </button>
    );
  }

  return <div className={classes}>{body}</div>;
}

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function QuickStatsRow() {
  const attendance = useQuery({
    queryKey: ["attendance", "today"],
    queryFn: () =>
      apiFetch<AttendanceTodayResponse>("/api/employee/attendance/today"),
  });

  const salary = useQuery({
    queryKey: ["salary", "current"],
    queryFn: () =>
      apiFetch<SalaryRecord | null>("/api/employee/salary/current"),
  });

  const score = useQuery({
    queryKey: ["score", "current"],
    queryFn: () =>
      apiFetch<WeeklyScoreRecord | null>("/api/employee/score/current"),
  });

  const leaveBalance = useQuery({
    queryKey: ["salary", "leave-balance"],
    queryFn: () =>
      apiFetch<LeaveBalanceRecord | null>("/api/employee/salary/leave-balance"),
  });

  const todayLabel = new Date().toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Today's Attendance"
        icon={CalendarCheck}
        accent={
          attendance.data?.marked
            ? "bg-emerald-100 text-emerald-700"
            : "bg-amber-100 text-amber-700"
        }
        loading={attendance.isPending}
      >
        {attendance.isError
          ? "Unavailable"
          : attendance.data?.marked
            ? "Present"
            : "Not marked"}
        {attendance.data?.marked ? (
          <span className="text-xs font-medium text-emerald-700">{todayLabel}</span>
        ) : null}
      </StatCard>

      <StatCard
        label="Leave Balance"
        icon={CalendarRange}
        accent="bg-emerald-100 text-emerald-700"
        loading={leaveBalance.isPending}
        sub={
          leaveBalance.data ? (
            <span className="text-xs font-medium text-muted-foreground">
              Earned {leaveBalance.data.earnedLeaves} · Used{" "}
              {leaveBalance.data.usedLeaves}
            </span>
          ) : null
        }
      >
        {leaveBalance.isError
          ? "Unavailable"
          : leaveBalance.data
            ? `${leaveBalance.data.availableLeaveBalance} day${
                leaveBalance.data.availableLeaveBalance === 1 ? "" : "s"
              }`
            : "No record"}
      </StatCard>

      <StatCard
        label="Current Month Salary"
        icon={Wallet}
        accent="bg-indigo-100 text-indigo-700"
        loading={salary.isPending}
        sub={
          salary.data ? (
            <span
              className={cn(
                "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                salary.data.status === "PAID"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700",
              )}
            >
              {salary.data.status}
            </span>
          ) : null
        }
      >
        {salary.isError
          ? "Unavailable"
          : salary.data
            ? currency.format(salary.data.amount)
            : "No record"}
      </StatCard>

      <StatCard
        label="Weekly Score"
        icon={Star}
        accent="bg-amber-100 text-amber-700"
        loading={score.isPending}
      >
        {score.isError
          ? "Unavailable"
          : score.data
            ? `${score.data.score}/10`
            : "No record"}
      </StatCard>
    </div>
  );
}
