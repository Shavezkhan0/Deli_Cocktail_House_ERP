import type { ReactNode } from "react";
import { formatCurrency, monthLabel } from "@/lib/format";

export type SalaryCalcData = {
  month: number;
  year: number;
  baseSalary: number;
  daysInMonth: number;
  dailyWage: number;
  attendance: {
    PRESENT: number;
    HALF_DAY: number;
    SHORT_LEAVE: number;
    ON_LEAVE: number;
    ABSENT: number;
  };
  paidLeave: {
    opening: number;
    grantedThisMonth: number;
    available: number;
    usedThisMonth: number;
    overageDays: number;
    closing: number;
  };
  shortLeave: {
    allowance: number;
    usedThisMonth: number;
    remaining: number;
    overageDays: number;
  };
  holidayWork: {
    extraDays: number;
    entries?: {
      date: string;
      label: string;
      status: "PRESENT" | "HALF_DAY" | "SHORT_LEAVE";
      credit: number;
    }[];
  };
  extraExpenses: number;
  deductionAmount: number;
  extraEarnings: number;
  finalAmount: number;
  eligibleForLeaves: boolean;
  eligibleFrom: string;
};

function dayCount(value: number): string {
  return value === Math.round(value) ? String(value) : value.toFixed(2);
}

function formatEntryDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  const [, y, m, d] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function SectionRow({ children }: { children: ReactNode }) {
  return (
    <div className="pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </div>
  );
}

function CalcRow({
  label,
  hint,
  extra,
  value,
  tone = "default",
}: {
  label: string;
  hint?: string;
  extra?: ReactNode;
  value: string;
  tone?: "default" | "muted" | "pos" | "neg";
}) {
  const valueColor =
    tone === "pos"
      ? "text-emerald-600"
      : tone === "neg"
        ? "text-rose-600"
        : tone === "muted"
          ? "text-muted-foreground"
          : "text-foreground";
  return (
    <div className="flex items-start justify-between gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-sm text-foreground">{label}</p>
        {hint ? (
          <p className="text-[11px] text-muted-foreground break-words">{hint}</p>
        ) : null}
        {extra ? (
          <div className="mt-0.5 space-y-0.5 text-[11px] text-muted-foreground break-words">
            {extra}
          </div>
        ) : null}
      </div>
      <span
        className={`shrink-0 whitespace-nowrap text-right text-sm font-medium tabular-nums ${valueColor}`}
      >
        {value}
      </span>
    </div>
  );
}

export function SalaryCalculation({ data }: { data: SalaryCalcData }) {
  const {
    month,
    year,
    baseSalary,
    daysInMonth,
    dailyWage,
    attendance,
    paidLeave,
    shortLeave,
    extraExpenses,
    finalAmount,
    eligibleForLeaves,
    eligibleFrom,
  } = data;

  const showEarnings = data.holidayWork.extraDays > 0 || extraExpenses > 0;
  const showDeductions =
    paidLeave.overageDays > 0 || shortLeave.overageDays > 0;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h4 className="text-sm font-semibold text-foreground">
          Salary Calculation
        </h4>
        <p className="mt-0.5 text-xs text-muted-foreground">
          How {formatCurrency(baseSalary)} becomes {formatCurrency(finalAmount)}{" "}
          for {monthLabel(month, year)}
        </p>
      </div>

      <div className="divide-y divide-border px-4">
        <CalcRow
          label={`Base salary`}
          hint={`${daysInMonth}-day month`}
          value={formatCurrency(baseSalary)}
        />
        <CalcRow
          label="Daily wage"
          hint={`base ÷ ${daysInMonth} days`}
          value={formatCurrency(dailyWage)}
          tone="muted"
        />

        {showEarnings ? <SectionRow>Earnings</SectionRow> : null}
        {data.holidayWork.extraDays > 0 ? (
          <CalcRow
            label="Holiday / Sunday work"
            hint={`${dayCount(data.holidayWork.extraDays)} day(s) × ${formatCurrency(dailyWage)}`}
            extra={
              data.holidayWork.entries && data.holidayWork.entries.length > 0 ? (
                <ul className="mt-1 space-y-0.5">
                  {data.holidayWork.entries.map((entry) => (
                    <li key={entry.date} className="break-words">
                      {formatEntryDate(entry.date)} · {entry.label} · +
                      {dayCount(entry.credit)} day
                    </li>
                  ))}
                </ul>
              ) : null
            }
            value={`+ ${formatCurrency(data.holidayWork.extraDays * dailyWage)}`}
            tone="pos"
          />
        ) : null}
        {extraExpenses > 0 ? (
          <CalcRow
            label="Approved expenses"
            value={`+ ${formatCurrency(extraExpenses)}`}
            tone="pos"
          />
        ) : null}

        {showDeductions ? <SectionRow>Deductions</SectionRow> : null}
        {paidLeave.overageDays > 0 ? (
          <CalcRow
            label="Unpaid leave"
            hint={`${dayCount(paidLeave.overageDays)} day(s) × ${formatCurrency(dailyWage)}`}
            extra={
              <>
                <div>
                  {paidLeave.usedThisMonth} leave day(s) used −{" "}
                  {paidLeave.available} available
                </div>
                <div>
                  {attendance.ON_LEAVE} on leave + {attendance.ABSENT} absent +{" "}
                  {attendance.HALF_DAY} half-day(s) × ½
                </div>
              </>
            }
            value={`− ${formatCurrency(paidLeave.overageDays * dailyWage)}`}
            tone="neg"
          />
        ) : null}
        {shortLeave.overageDays > 0 ? (
          <CalcRow
            label="Short-leave overage"
            hint={`${dayCount(shortLeave.overageDays)} day(s) × ${formatCurrency(dailyWage)}`}
            extra={
              <div>
                {shortLeave.usedThisMonth} short leave(s) −{" "}
                {shortLeave.allowance} free, ¼ day each
              </div>
            }
            value={`− ${formatCurrency(shortLeave.overageDays * dailyWage)}`}
            tone="neg"
          />
        ) : null}

        <div className="flex items-center justify-between gap-3 py-3">
          <span className="text-sm font-semibold text-foreground">
            Net payable
          </span>
          <span className="text-base font-bold tabular-nums text-foreground">
            {formatCurrency(finalAmount)}
          </span>
        </div>
      </div>

      <div className="space-y-1 border-t border-border px-4 py-3 text-[11px] leading-relaxed text-muted-foreground">
        <p>
          Attendance: {attendance.PRESENT} present · {attendance.HALF_DAY} half{" "}
          · {attendance.SHORT_LEAVE} short · {attendance.ON_LEAVE} on leave ·{" "}
          {attendance.ABSENT} absent
        </p>
        <p>
          Paid leave: {paidLeave.available} available ({paidLeave.opening}{" "}
          carried + {paidLeave.grantedThisMonth} earned) ·{" "}
          {paidLeave.usedThisMonth} used · {paidLeave.closing} carried forward
          {!eligibleForLeaves ? ` · accrual starts ${eligibleFrom}` : ""}
        </p>
        <p>
          Short leave: allowance {shortLeave.allowance} · used{" "}
          {shortLeave.usedThisMonth} · remaining {shortLeave.remaining}
          {shortLeave.allowance === 0 ? ` · starts ${eligibleFrom}` : ""}
        </p>
      </div>
    </div>
  );
}