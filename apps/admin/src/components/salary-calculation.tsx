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
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border px-5 py-3">
        <h4 className="text-sm font-semibold text-foreground">
          Salary Calculation
        </h4>
        <p className="text-xs text-muted-foreground">
          How {formatSalary(baseSalary)} becomes {formatSalary(finalAmount)} for{" "}
          {MONTH_NAMES[month - 1]} {year}
        </p>
      </div>
      <div className="p-5">
        <Table className="w-full table-fixed text-xs sm:text-sm">
          <colgroup>
            <col className="w-auto" />
            <col className="w-16" />
            <col className="w-20" />
            <col className="w-24" />
          </colgroup>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead className="whitespace-normal text-right">
                Days charged
              </TableHead>
              <TableHead className="text-right">Rate</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="whitespace-normal break-words">
                Base salary ({daysInMonth}-day month)
              </TableCell>
              <TableCell className="text-right tabular-nums whitespace-nowrap">
                —
              </TableCell>
              <TableCell className="text-right tabular-nums whitespace-nowrap">
                —
              </TableCell>
              <TableCell className="text-right tabular-nums whitespace-nowrap">
                {formatSalary(baseSalary)}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="whitespace-normal break-words">
                Daily wage = base ÷ {daysInMonth}
              </TableCell>
              <TableCell className="text-right tabular-nums whitespace-nowrap">
                —
              </TableCell>
              <TableCell className="text-right tabular-nums whitespace-nowrap">
                {formatSalary(dailyWage)}
              </TableCell>
              <TableCell className="text-right tabular-nums whitespace-nowrap">
                —
              </TableCell>
            </TableRow>

            {showEarnings ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="bg-muted/40 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  Earnings
                </TableCell>
              </TableRow>
            ) : null}
            {data.holidayWork.extraDays > 0 ? (
              <TableRow>
                <TableCell className="whitespace-normal break-words">
                  <div>Holiday / Sunday work</div>
                  <div className="text-[11px] text-muted-foreground break-words">
                    {data.holidayWork.extraDays} day(s) worked on
                    holidays/Sundays, paid at the daily wage
                  </div>
                  {data.holidayWork.entries && data.holidayWork.entries.length > 0 ? (
                    <ul className="mt-1 space-y-0.5">
                      {data.holidayWork.entries.map((entry) => (
                        <li
                          key={entry.date}
                          className="text-[11px] text-muted-foreground break-words"
                        >
                          {formatEntryDate(entry.date)} — {entry.label} — +
                          {dayCount(entry.credit)} day
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </TableCell>
                <TableCell className="text-right tabular-nums whitespace-nowrap">
                  {dayCount(data.holidayWork.extraDays)}
                </TableCell>
                <TableCell className="text-right tabular-nums whitespace-nowrap">
                  {formatSalary(dailyWage)}
                </TableCell>
                <TableCell className="text-right tabular-nums whitespace-nowrap text-emerald-600">
                  + {formatSalary(data.holidayWork.extraDays * dailyWage)}
                </TableCell>
              </TableRow>
            ) : null}
            {extraExpenses > 0 ? (
              <TableRow>
                <TableCell className="whitespace-normal break-words">
                  Approved expenses
                </TableCell>
                <TableCell className="text-right tabular-nums whitespace-nowrap">
                  —
                </TableCell>
                <TableCell className="text-right tabular-nums whitespace-nowrap">
                  —
                </TableCell>
                <TableCell className="text-right tabular-nums whitespace-nowrap text-emerald-600">
                  + {formatSalary(extraExpenses)}
                </TableCell>
              </TableRow>
            ) : null}

            {showDeductions ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="bg-muted/40 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  Deductions
                </TableCell>
              </TableRow>
            ) : null}
            {paidLeave.overageDays > 0 ? (
              <TableRow>
                <TableCell>
                  <div>Unpaid leave</div>
                  <div className="text-xs text-muted-foreground">
                    {paidLeave.usedThisMonth} leave day(s) used −{" "}
                    {paidLeave.available} paid-leave available
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {attendance.ON_LEAVE} on leave + {attendance.ABSENT} absent +{" "}
                    {attendance.HALF_DAY} half-day(s) × ½
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {dayCount(paidLeave.overageDays)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatSalary(dailyWage)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-rose-600">
                  − {formatSalary(paidLeave.overageDays * dailyWage)}
                </TableCell>
              </TableRow>
            ) : null}
            {shortLeave.overageDays > 0 ? (
              <TableRow>
                <TableCell>
                  <div>Short-leave overage</div>
                  <div className="text-xs text-muted-foreground">
                    {shortLeave.usedThisMonth} short leave(s) −{" "}
                    {shortLeave.allowance} free, charged ¼ day each
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {dayCount(shortLeave.overageDays)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatSalary(dailyWage)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-rose-600">
                  − {formatSalary(shortLeave.overageDays * dailyWage)}
                </TableCell>
              </TableRow>
            ) : null}

            <TableRow>
              <TableCell className="font-semibold text-foreground">
                Net payable
              </TableCell>
              <TableCell className="text-right">—</TableCell>
              <TableCell className="text-right">—</TableCell>
              <TableCell className="text-right text-base font-bold tabular-nums text-foreground">
                {formatSalary(finalAmount)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
      <div className="space-y-1 border-t border-border px-5 py-3 text-xs text-muted-foreground">
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
