"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarCheck,
  CalendarClock,
  CalendarRange,
  Check,
  ChevronRight,
  Clock,
  Star,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

type AttendanceTodayResponse = {
  marked: boolean;
  attendance: {
    id: string;
    date: string;
    status: string;
    checkInTime?: string | null;
    checkOutTime?: string | null;
  } | null;
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
  children: React.ReactNode;
  sub?: React.ReactNode;
  loading?: boolean;
  onClick?: () => void;
  active?: boolean;
  accent?: string;
  barClass?: string;
  contentClassName?: string;
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
  contentClassName,
}: StatCardProps) {
  const classes = cn(
    "glass-card-global group relative overflow-hidden flex flex-col justify-between h-full w-full min-h-[140px]",
    active && "ring-2 ring-primary/40",
    onClick &&
      "cursor-pointer text-left transition-all duration-200 hover:-translate-y-0.5",
  );

  const body = (
    <>
      <div className="flex flex-1 items-start justify-between gap-4 p-5 pb-4">
        {loading ? (
          <div className="w-full space-y-2.5">
            <div className="h-3 w-28 animate-pulse rounded bg-white/15" />
            <div className="h-8 w-16 animate-pulse rounded bg-white/15" />
            <div className="h-3 w-36 animate-pulse rounded bg-white/15" />
          </div>
        ) : (
          <div className={cn("min-w-0 flex-1", contentClassName)}>
            <p className="text-sm font-medium text-white-85">{label}</p>
            <div className="mt-1">{children}</div>
            {sub ? <div className="mt-2">{sub}</div> : null}
          </div>
        )}
        <span className="gold-icon-bg flex size-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110">
          <Icon className="size-5" />
        </span>
      </div>
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r opacity-80",
          barClass,
        )}
      />
    </>
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

function formatTime(value: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "";
  }
}

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

  const isMarked = attendance.data?.marked ?? false;
  const checkInTime = attendance.data?.attendance?.checkInTime;

  const pendingCount =
    extraDays.data?.entries.filter((e) => !e.banked).length ?? 0;
  const bankedCount =
    extraDays.data?.entries.filter((e) => e.banked).length ?? 0;
  const totalExtraDays = extraDays.data?.entries.length ?? 0;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {/* ── Today's Attendance ── */}
      <StatCard
        label="Today's Attendance"
        icon={CalendarCheck}
        loading={attendance.isPending}
        barClass="from-emerald-400 to-emerald-600"
        contentClassName="flex flex-col gap-2.5"
      >
        {attendance.isError ? (
          <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-white/60 ring-1 ring-white/15">
            Unavailable
          </span>
        ) : isMarked ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-sm font-semibold text-emerald-300 ring-1 ring-emerald-500/40">
            <Check className="size-3.5" />
            {checkInTime ? `Checked in · ${formatTime(checkInTime)}` : "Present"}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-white/80 ring-1 ring-white/20">
            <Clock className="size-3.5" />
            Pending Check-in
          </span>
        )}
      </StatCard>

      {/* ── Leave Balance ── */}
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
        <p className="text-3xl font-bold tracking-tight tabular-nums text-white">
          {leaveBalance.isError
            ? "Unavailable"
            : leaveBalance.data
              ? `${leaveBalance.data.availableLeaveBalance} day${
                  leaveBalance.data.availableLeaveBalance === 1 ? "" : "s"
                }`
              : "No record"}
        </p>
      </StatCard>

      {/* ── Extra Days ── */}
      <StatCard
        label="Extra Days"
        icon={CalendarClock}
        loading={extraDays.isPending}
        onClick={() => router.push("/common/extra-days")}
        barClass="from-violet-400 to-violet-600"
        contentClassName="flex flex-col gap-2"
      >
        <div className="flex items-center gap-2">
          <p className="text-3xl font-bold tracking-tight tabular-nums text-white">
            {extraDays.isError
              ? "Unavailable"
              : `${totalExtraDays} Day${totalExtraDays === 1 ? "" : "s"}`}
          </p>
          <ChevronRight className="size-4 text-white/40 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-white/70" />
        </div>
        {extraDays.data && !extraDays.isError ? (
          totalExtraDays > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {pendingCount > 0 && (
                <span className="inline-flex items-center rounded-full bg-amber-400/15 px-2 py-0.5 text-[11px] font-semibold text-amber-300 ring-1 ring-amber-400/30">
                  {pendingCount} Pending
                </span>
              )}
              {bankedCount > 0 && (
                <span className="inline-flex items-center rounded-full bg-emerald-400/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-300 ring-1 ring-emerald-400/30">
                  {bankedCount} Banked
                </span>
              )}
            </div>
          ) : (
            <p className="text-xs text-white/50">No extra duty recorded</p>
          )
        ) : null}
      </StatCard>

      {/* ── Current Month Salary ── */}
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
        <p className="text-3xl font-bold tracking-tight tabular-nums text-white">
          {salary.isError
            ? "Unavailable"
            : salary.data
              ? currency.format(salary.data.amount)
              : "No record"}
        </p>
      </StatCard>

      {/* ── Weekly Score ── */}
      <StatCard
        label="Weekly Score"
        icon={Star}
        loading={score.isPending}
        barClass="from-amber-400 to-amber-600"
      >
        <p className="text-3xl font-bold tracking-tight tabular-nums text-white">
          {score.isError
            ? "Unavailable"
            : score.data
              ? `${score.data.score}/10`
              : "No record"}
        </p>
      </StatCard>
    </div>
  );
}
