"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarCheck,
  CalendarClock,
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

export type StatCardProps = {
  label: string;
  icon: LucideIcon;
  accent?: string;
  children: React.ReactNode;
  sub?: React.ReactNode;
  loading?: boolean;
  onClick?: () => void;
  active?: boolean;
  barClass?: string;
};

export function StatCard({
  label,
  icon: Icon,
  children,
  sub,
  loading,
  onClick,
  active,
  barClass = "from-sky-400 to-sky-600",
}: StatCardProps) {
  const classes = cn(
    "glass-card-global group relative overflow-hidden",
    active && "ring-2 ring-primary/40",
    onClick &&
      "w-full cursor-pointer text-left transition-all duration-200 hover:-translate-y-0.5",
  );

  const body = (
    <div className="relative flex items-start justify-between gap-4 p-5">
      {loading ? (
        <div className="w-full space-y-2.5">
          <div className="h-3 w-28 animate-pulse rounded bg-white/15" />
          <div className="h-8 w-16 animate-pulse rounded bg-white/15" />
          <div className="h-3 w-36 animate-pulse rounded bg-white/15" />
        </div>
      ) : (
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-white-85">{label}</p>
          <p className="text-3xl font-bold tracking-tight tabular-nums text-white">
            {children}
          </p>
          {sub ? (
            <div className="text-xs text-white-85">{sub}</div>
          ) : null}
        </div>
      )}
      <span className="gold-icon-bg flex size-11 shrink-0 items-center justify-center rounded-xl">
        <Icon className="size-5" />
      </span>
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r opacity-70",
          barClass,
        )}
      />
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
  const router = useRouter();

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

  const extraDays = useQuery({
    queryKey: ["salary", "extra-days"],
    queryFn: () =>
      apiFetch<ExtraDaysRecord | null>("/api/employee/salary/extra-days"),
  });

  const todayLabel = new Date().toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Today's Attendance"
        icon={CalendarCheck}
        loading={attendance.isPending}
        barClass="from-emerald-400 to-emerald-600"
      >
        {attendance.isError
          ? "Unavailable"
          : attendance.data?.marked
            ? "Present"
            : "Not marked"}
      </StatCard>

      <StatCard
        label="Leave Balance"
        icon={CalendarRange}
        loading={leaveBalance.isPending}
        barClass="from-sky-400 to-sky-600"
        sub={
          leaveBalance.data ? (
            <span className="text-xs text-white-85">
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
        label="Extra Days"
        icon={CalendarClock}
        loading={extraDays.isPending}
        onClick={() => router.push("/common/extra-days")}
        barClass="from-violet-400 to-violet-600"
        sub={
          extraDays.data && extraDays.data.entries.length > 0 ? (
            <span className="text-xs text-white-85">
              {extraDays.data.entries.filter((e) => !e.banked).length} pending ·{" "}
              {extraDays.data.entries.filter((e) => e.banked).length} banked
            </span>
          ) : null
        }
      >
        {extraDays.isError
          ? "Unavailable"
          : extraDays.data
            ? `${extraDays.data.entries.length} day${
                extraDays.data.entries.length === 1 ? "" : "s"
              }`
            : "No extra days"}
      </StatCard>

      <StatCard
        label="Current Month Salary"
        icon={Wallet}
        loading={salary.isPending}
        barClass="from-indigo-400 to-indigo-600"
        sub={
          salary.data ? (
            <span className="inline-flex rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
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
        loading={score.isPending}
        barClass="from-amber-400 to-amber-600"
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
