import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function formatSalary(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

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

export function SalaryCalculation({
  data,
  variant = "glass",
  className,
}: {
  data: SalaryCalcData;
  variant?: "glass" | "default";
  className?: string;
}) {
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

  const isGlass = variant === "glass";

  return (
    <div
      className={cn(
        "rounded-xl overflow-hidden",
        isGlass
          ? "border border-white/15 bg-white/10 text-white shadow-sm salary-calc-glass"
          : "border border-border bg-card text-card-foreground shadow-sm",
        className,
      )}
    >
      <div
        className={cn(
          "px-5 py-3.5",
          isGlass
            ? "border-b border-white/15 bg-white/5"
            : "border-b border-border bg-muted/20",
        )}
      >
        <h4
          className={cn(
            "text-sm font-semibold",
            isGlass ? "text-white" : "text-foreground",
          )}
        >
          Salary Calculation
        </h4>
        <p
          className={cn(
            "text-xs mt-0.5",
            isGlass ? "text-white-85" : "text-muted-foreground",
          )}
        >
          How {formatSalary(baseSalary)} becomes {formatSalary(finalAmount)} for{" "}
          {MONTH_NAMES[month - 1]} {year}
        </p>
      </div>

      <div className="p-4 sm:p-5">
        <Table className="w-full table-fixed text-xs sm:text-sm">
          <colgroup>
            <col className="w-auto" />
            <col className="w-16" />
            <col className="w-20" />
            <col className="w-24" />
          </colgroup>
          <TableHeader>
            <TableRow
              className={cn(
                isGlass
                  ? "border-b border-white/15 hover:bg-transparent"
                  : "border-b border-border",
              )}
            >
              <TableHead
                className={cn(isGlass ? "text-white-85 font-semibold" : "")}
              >
                Item
              </TableHead>
              <TableHead
                className={cn(
                  "whitespace-normal text-right font-semibold",
                  isGlass ? "text-white-85" : "",
                )}
              >
                Days charged
              </TableHead>
              <TableHead
                className={cn(
                  "text-right font-semibold",
                  isGlass ? "text-white-85" : "",
                )}
              >
                Rate
              </TableHead>
              <TableHead
                className={cn(
                  "text-right font-semibold",
                  isGlass ? "text-white-85" : "",
                )}
              >
                Amount
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow
              className={cn(
                isGlass
                  ? "border-b border-white/10 hover:bg-white/5"
                  : "border-b border-border/50",
              )}
            >
              <TableCell
                className={cn(
                  "whitespace-normal break-words",
                  isGlass ? "text-white" : "",
                )}
              >
                Base salary ({daysInMonth}-day month)
              </TableCell>
              <TableCell
                className={cn(
                  "text-right tabular-nums whitespace-nowrap",
                  isGlass ? "text-white/60" : "text-muted-foreground",
                )}
              >
                —
              </TableCell>
              <TableCell
                className={cn(
                  "text-right tabular-nums whitespace-nowrap",
                  isGlass ? "text-white/60" : "text-muted-foreground",
                )}
              >
                —
              </TableCell>
              <TableCell
                className={cn(
                  "text-right tabular-nums whitespace-nowrap font-medium",
                  isGlass ? "text-white" : "text-foreground",
                )}
              >
                {formatSalary(baseSalary)}
              </TableCell>
            </TableRow>

            <TableRow
              className={cn(
                isGlass
                  ? "border-b border-white/10 hover:bg-white/5"
                  : "border-b border-border/50",
              )}
            >
              <TableCell
                className={cn(
                  "whitespace-normal break-words",
                  isGlass ? "text-white" : "",
                )}
              >
                Daily wage = base ÷ {daysInMonth}
              </TableCell>
              <TableCell
                className={cn(
                  "text-right tabular-nums whitespace-nowrap",
                  isGlass ? "text-white/60" : "text-muted-foreground",
                )}
              >
                —
              </TableCell>
              <TableCell
                className={cn(
                  "text-right tabular-nums whitespace-nowrap font-medium",
                  isGlass ? "text-white" : "text-foreground",
                )}
              >
                {formatSalary(dailyWage)}
              </TableCell>
              <TableCell
                className={cn(
                  "text-right tabular-nums whitespace-nowrap",
                  isGlass ? "text-white/60" : "text-muted-foreground",
                )}
              >
                —
              </TableCell>
            </TableRow>

            {showEarnings ? (
              <TableRow
                className={cn(isGlass ? "border-b border-white/10" : "")}
              >
                <TableCell
                  colSpan={4}
                  className={cn(
                    "text-xs font-semibold uppercase tracking-wide py-2 px-3",
                    isGlass
                      ? "bg-white/10 text-white/90"
                      : "bg-muted/40 text-muted-foreground",
                  )}
                >
                  Earnings
                </TableCell>
              </TableRow>
            ) : null}

            {data.holidayWork.extraDays > 0 ? (
              <TableRow
                className={cn(
                  isGlass
                    ? "border-b border-white/10 hover:bg-white/5"
                    : "border-b border-border/50",
                )}
              >
                <TableCell className="whitespace-normal break-words">
                  <div className={cn(isGlass ? "text-white font-medium" : "")}>
                    Holiday / Sunday work
                  </div>
                  <div
                    className={cn(
                      "text-[11px] break-words mt-0.5",
                      isGlass ? "text-white-85" : "text-muted-foreground",
                    )}
                  >
                    {data.holidayWork.extraDays} day(s) worked on
                    holidays/Sundays, paid at the daily wage
                  </div>
                  {data.holidayWork.entries &&
                  data.holidayWork.entries.length > 0 ? (
                    <ul className="mt-1 space-y-0.5">
                      {data.holidayWork.entries.map((entry) => (
                        <li
                          key={entry.date}
                          className={cn(
                            "text-[11px] break-words",
                            isGlass ? "text-white-85" : "text-muted-foreground",
                          )}
                        >
                          {formatEntryDate(entry.date)} — {entry.label} — +
                          {dayCount(entry.credit)} day
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right tabular-nums whitespace-nowrap",
                    isGlass ? "text-white" : "",
                  )}
                >
                  {dayCount(data.holidayWork.extraDays)}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right tabular-nums whitespace-nowrap",
                    isGlass ? "text-white" : "",
                  )}
                >
                  {formatSalary(dailyWage)}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right tabular-nums whitespace-nowrap font-semibold",
                    isGlass ? "text-emerald-300" : "text-emerald-600",
                  )}
                >
                  + {formatSalary(data.holidayWork.extraDays * dailyWage)}
                </TableCell>
              </TableRow>
            ) : null}

            {extraExpenses > 0 ? (
              <TableRow
                className={cn(
                  isGlass
                    ? "border-b border-white/10 hover:bg-white/5"
                    : "border-b border-border/50",
                )}
              >
                <TableCell
                  className={cn(
                    "whitespace-normal break-words font-medium",
                    isGlass ? "text-white" : "",
                  )}
                >
                  Approved expenses
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right tabular-nums whitespace-nowrap",
                    isGlass ? "text-white/60" : "text-muted-foreground",
                  )}
                >
                  —
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right tabular-nums whitespace-nowrap",
                    isGlass ? "text-white/60" : "text-muted-foreground",
                  )}
                >
                  —
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right tabular-nums whitespace-nowrap font-semibold",
                    isGlass ? "text-emerald-300" : "text-emerald-600",
                  )}
                >
                  + {formatSalary(extraExpenses)}
                </TableCell>
              </TableRow>
            ) : null}

            {showDeductions ? (
              <TableRow
                className={cn(isGlass ? "border-b border-white/10" : "")}
              >
                <TableCell
                  colSpan={4}
                  className={cn(
                    "text-xs font-semibold uppercase tracking-wide py-2 px-3",
                    isGlass
                      ? "bg-white/10 text-white/90"
                      : "bg-muted/40 text-muted-foreground",
                  )}
                >
                  Deductions
                </TableCell>
              </TableRow>
            ) : null}

            {paidLeave.overageDays > 0 ? (
              <TableRow
                className={cn(
                  isGlass
                    ? "border-b border-white/10 hover:bg-white/5"
                    : "border-b border-border/50",
                )}
              >
                <TableCell>
                  <div className={cn(isGlass ? "text-white font-medium" : "")}>
                    Unpaid leave
                  </div>
                  <div
                    className={cn(
                      "text-xs mt-0.5",
                      isGlass ? "text-white-85" : "text-muted-foreground",
                    )}
                  >
                    {paidLeave.usedThisMonth} leave day(s) used −{" "}
                    {paidLeave.available} paid-leave available
                  </div>
                  <div
                    className={cn(
                      "text-xs mt-0.5",
                      isGlass ? "text-white-85" : "text-muted-foreground",
                    )}
                  >
                    {attendance.ON_LEAVE} on leave + {attendance.ABSENT} absent +{" "}
                    {attendance.HALF_DAY} half-day(s) × ½
                  </div>
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right tabular-nums",
                    isGlass ? "text-white" : "",
                  )}
                >
                  {dayCount(paidLeave.overageDays)}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right tabular-nums",
                    isGlass ? "text-white" : "",
                  )}
                >
                  {formatSalary(dailyWage)}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right tabular-nums font-semibold",
                    isGlass ? "text-rose-300" : "text-rose-600",
                  )}
                >
                  − {formatSalary(paidLeave.overageDays * dailyWage)}
                </TableCell>
              </TableRow>
            ) : null}

            {shortLeave.overageDays > 0 ? (
              <TableRow
                className={cn(
                  isGlass
                    ? "border-b border-white/10 hover:bg-white/5"
                    : "border-b border-border/50",
                )}
              >
                <TableCell>
                  <div className={cn(isGlass ? "text-white font-medium" : "")}>
                    Short-leave overage
                  </div>
                  <div
                    className={cn(
                      "text-xs mt-0.5",
                      isGlass ? "text-white-85" : "text-muted-foreground",
                    )}
                  >
                    {shortLeave.usedThisMonth} short leave(s) −{" "}
                    {shortLeave.allowance} free, charged ¼ day each
                  </div>
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right tabular-nums",
                    isGlass ? "text-white" : "",
                  )}
                >
                  {dayCount(shortLeave.overageDays)}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right tabular-nums",
                    isGlass ? "text-white" : "",
                  )}
                >
                  {formatSalary(dailyWage)}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right tabular-nums font-semibold",
                    isGlass ? "text-rose-300" : "text-rose-600",
                  )}
                >
                  − {formatSalary(shortLeave.overageDays * dailyWage)}
                </TableCell>
              </TableRow>
            ) : null}

            <TableRow
              className={cn(
                isGlass
                  ? "border-t-2 border-white/20 hover:bg-white/5"
                  : "border-t-2 border-border",
              )}
            >
              <TableCell
                className={cn(
                  "font-bold text-sm",
                  isGlass ? "text-white" : "text-foreground",
                )}
              >
                Net payable
              </TableCell>
              <TableCell
                className={cn(
                  "text-right",
                  isGlass ? "text-white/60" : "text-muted-foreground",
                )}
              >
                —
              </TableCell>
              <TableCell
                className={cn(
                  "text-right",
                  isGlass ? "text-white/60" : "text-muted-foreground",
                )}
              >
                —
              </TableCell>
              <TableCell
                className={cn(
                  "text-right text-base font-bold tabular-nums",
                  isGlass ? "text-white" : "text-foreground",
                )}
              >
                {formatSalary(finalAmount)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <div
        className={cn(
          "space-y-1.5 px-5 py-3.5 text-xs",
          isGlass
            ? "border-t border-white/15 bg-white/5 text-white-85"
            : "border-t border-border bg-muted/20 text-muted-foreground",
        )}
      >
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
