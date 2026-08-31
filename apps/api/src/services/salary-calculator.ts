import { prisma, AttendanceStatus, OverrideType } from "@repo/database";
import { istDateKey } from "../lib/attendance-time";

const DEFAULT_LEAVE_SYSTEM_START = new Date(2026, 7, 1);
const PAID_LEAVE_PER_MONTH = 1;
const SHORT_LEAVE_ALLOWANCE = 3;
const ELIGIBILITY_DELAY_MONTHS = 3;
const SHORT_LEAVE_WEIGHT = 0.25;
const HALF_DAY_WEIGHT = 0.5;

export type HolidayWorkEntry = {
  date: string;
  label: string;
  status: "PRESENT" | "HALF_DAY" | "SHORT_LEAVE";
  credit: number;
};

export type SalaryBreakdown = {
  employeeId: string;
  employeeNumber: string;
  employeeName: string;
  month: number;
  year: number;
  baseSalary: number;
  daysInMonth: number;
  dailyWage: number;
  joiningDate: Date;
  monthsSinceJoining: number;
  eligibleForLeaves: boolean;
  eligibleFrom: string;
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
    entries: HolidayWorkEntry[];
  };
  attendance: {
    PRESENT: number;
    ABSENT: number;
    ON_LEAVE: number;
    HALF_DAY: number;
    SHORT_LEAVE: number;
    sundayAbsences: number;
    holidayAbsences: number;
  };
  deductionAmount: number;
  extraEarnings: number;
  extraExpenses: number;
  extraExpenseEntries: {
    id: string;
    amount: number;
    description: string;
    date: Date | null;
  }[];
  finalAmount: number;
  earnedLeaves: number;
  compensatoryLeaves: number;
  compensatoryEntries: HolidayWorkEntry[];
  usedLeaves: number;
  availableLeaveBalance: number;
  totalLeavesTaken: number;
  unpaidLeaves: number;
};

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function monthStart(year: number, month: number): Date {
  return new Date(year, month - 1, 1);
}

function firstOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function wholeMonthsBetween(from: Date, to: Date): number {
  return (
    (to.getFullYear() - from.getFullYear()) * 12 +
    (to.getMonth() - from.getMonth())
  );
}

type CollapsibleAttendance = {
  date: Date;
  status: AttendanceStatus;
  checkInTime: Date | null;
  correctedByAdmin: boolean;
  createdAt: Date;
};

const ATTENDANCE_STATUS_RANK: Record<AttendanceStatus, number> = {
  [AttendanceStatus.PRESENT]: 4,
  [AttendanceStatus.SHORT_LEAVE]: 3,
  [AttendanceStatus.HALF_DAY]: 2,
  [AttendanceStatus.ON_LEAVE]: 1,
  [AttendanceStatus.ABSENT]: 0,
};

function keeperIsBetter(
  candidate: CollapsibleAttendance,
  current: CollapsibleAttendance,
): boolean {
  const cCheckin = candidate.checkInTime ? 1 : 0;
  const kCheckin = current.checkInTime ? 1 : 0;
  if (cCheckin !== kCheckin) return cCheckin > kCheckin;
  const cAdmin = candidate.correctedByAdmin ? 1 : 0;
  const kAdmin = current.correctedByAdmin ? 1 : 0;
  if (cAdmin !== kAdmin) return cAdmin > kAdmin;
  const cRank = ATTENDANCE_STATUS_RANK[candidate.status] ?? -1;
  const kRank = ATTENDANCE_STATUS_RANK[current.status] ?? -1;
  if (cRank !== kRank) return cRank > kRank;
  return candidate.createdAt.getTime() > current.createdAt.getTime();
}

// Defensive de-dupe: a stray duplicate `date` value for the same IST day must
// never double-count attendance. Collapse to one record per istDateKey, keeping
// the best one (has check-in time > admin-corrected > best status > newest).
function collapseAttendance<T extends CollapsibleAttendance>(rows: T[]): T[] {
  const byDay = new Map<string, T[]>();
  for (const row of rows) {
    const key = istDateKey(row.date);
    const arr = byDay.get(key);
    if (arr) arr.push(row);
    else byDay.set(key, [row]);
  }
  const collapsed: T[] = [];
  for (const group of byDay.values()) {
    let keeper = group[0]!;
    for (const row of group) {
      if (keeperIsBetter(row, keeper)) keeper = row;
    }
    collapsed.push(keeper);
  }
  return collapsed;
}

async function getLeaveSystemStart(): Promise<Date> {
  const setting = await prisma.appSettings.findUnique({
    where: { key: "LEAVE_SYSTEM_START" },
  });
  if (setting && !isNaN(Date.parse(setting.value))) {
    const parsed = new Date(setting.value);
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }
  return DEFAULT_LEAVE_SYSTEM_START;
}

export async function calculateEmployeeSalary(
  employeeId: string,
  month: number,
  year: number,
): Promise<SalaryBreakdown> {
  const targetMonthStart = monthStart(year, month);
  const nextMonthStart = monthStart(year, month + 1);
  const daysInMonth = new Date(year, month, 0).getDate();

  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) {
    throw new Error("Employee not found");
  }

  const leaveSystemStart = await getLeaveSystemStart();

  // --- Eligibility ---
  const joinMonth = firstOfMonth(new Date(employee.joiningDate));
  const eligibleFrom = new Date(
    Math.max(
      addMonths(joinMonth, ELIGIBILITY_DELAY_MONTHS).getTime(),
      leaveSystemStart.getTime(),
    ),
  );
  const eligibleForLeaves = targetMonthStart >= eligibleFrom;

  const [leaveRecords, holidaysSinceStart, forceWorkSinceStart, monthAttendance, monthHolidays, monthOverrides, approvedExpenses] =
    await Promise.all([
      prisma.attendance.findMany({
        where: { employeeId, date: { gte: leaveSystemStart } },
      }),
      prisma.holiday.findMany({ where: { date: { gte: leaveSystemStart } } }),
      prisma.attendanceOverride.findMany({
        where: { employeeId, type: OverrideType.FORCE_WORK, date: { gte: leaveSystemStart } },
      }),
      prisma.attendance.findMany({
        where: { employeeId, date: { gte: targetMonthStart, lt: nextMonthStart } },
      }),
      prisma.holiday.findMany({
        where: { date: { gte: targetMonthStart, lt: nextMonthStart } },
      }),
      prisma.attendanceOverride.findMany({
        where: { employeeId, date: { gte: targetMonthStart, lt: nextMonthStart } },
      }),
      prisma.expenseEntry.findMany({
        where: {
          submittedBy: employeeId,
          status: "APPROVED",
          OR: [
            { date: { gte: targetMonthStart, lt: nextMonthStart } },
            { date: null, createdAt: { gte: targetMonthStart, lt: nextMonthStart } },
          ],
        },
      }),
    ]);

  const collapsedLeaves = collapseAttendance(leaveRecords);
  const collapsedMonth = collapseAttendance(monthAttendance);

  const holidaySet = new Set(
    holidaysSinceStart.map((holiday) => dateKey(startOfDay(new Date(holiday.date)))),
  );
  const forceWorkSet = new Set(
    forceWorkSinceStart.map((override) => dateKey(startOfDay(new Date(override.date)))),
  );

  function paidLeaveWeight(status: AttendanceStatus, date: Date): number {
    const day = startOfDay(date);
    const key = dateKey(day);
    const isSunday = day.getDay() === 0;
    const isHoliday = holidaySet.has(key);
    const isForceWork = forceWorkSet.has(key);
    switch (status) {
      case AttendanceStatus.ON_LEAVE:
        return 1;
      case AttendanceStatus.HALF_DAY:
        return HALF_DAY_WEIGHT;
      case AttendanceStatus.ABSENT:
        if (!isSunday && !isHoliday) return 1;
        return isForceWork ? 1 : 0;
      default:
        return 0;
    }
  }

  let usedThroughPrevMonth = 0;
  let usedThisMonth = 0;
  for (const record of collapsedLeaves) {
    const recordDay = new Date(record.date);
    if (recordDay >= targetMonthStart) {
      if (recordDay < nextMonthStart) usedThisMonth += paidLeaveWeight(record.status, recordDay);
    } else {
      usedThroughPrevMonth += paidLeaveWeight(record.status, recordDay);
    }
  }

  // --- Paid leave (cumulative, carries forward) ---
  const monthsAccruedThroughPrevMonth = Math.max(
    0,
    wholeMonthsBetween(eligibleFrom, targetMonthStart),
  );
  const openingBalance = Math.max(0, monthsAccruedThroughPrevMonth - usedThroughPrevMonth);
  const grantThisMonth = eligibleForLeaves ? PAID_LEAVE_PER_MONTH : 0;
  const availableThisMonth = openingBalance + grantThisMonth;
  const paidLeaveOverageDays = Math.max(0, usedThisMonth - availableThisMonth);
  const closingBalance = Math.max(0, availableThisMonth - usedThisMonth);

  // --- Short leave (monthly, no carry) ---
  const shortLeaveAllowance = eligibleForLeaves ? SHORT_LEAVE_ALLOWANCE : 0;
  const shortLeavesUsed = collapsedMonth.filter(
    (record) =>
      record.status === AttendanceStatus.SHORT_LEAVE &&
      new Date(record.date) >= leaveSystemStart,
  ).length;
  const shortLeaveRemaining = Math.max(0, shortLeaveAllowance - shortLeavesUsed);
  const shortLeaveOverageDays =
    Math.max(0, shortLeavesUsed - shortLeaveAllowance) * SHORT_LEAVE_WEIGHT;

  // --- Holiday / Sunday / FORCE_WORK extra pay ---
  const monthHolidaySet = new Set(
    monthHolidays.map((holiday) => dateKey(startOfDay(new Date(holiday.date)))),
  );
  const monthHolidayName = new Map<string, string>(
    monthHolidays.map((holiday) => [
      dateKey(startOfDay(new Date(holiday.date))),
      holiday.name,
    ]),
  );
  const monthOverrideSet = new Set(
    monthOverrides.map((override) => dateKey(startOfDay(new Date(override.date)))),
  );
  const monthForceWorkSet = new Set(
    monthOverrides
      .filter((override) => override.type === OverrideType.FORCE_WORK)
      .map((override) => dateKey(startOfDay(new Date(override.date)))),
  );

  const entries: HolidayWorkEntry[] = [];
  let holidayWorkExtraDays = 0;
  for (const record of collapsedMonth) {
    const day = startOfDay(new Date(record.date));
    const key = dateKey(day);
    const isSunday = day.getDay() === 0;
    const isHoliday = monthHolidaySet.has(key);
    const isForceWork = monthForceWorkSet.has(key);
    if (!(isSunday || isHoliday || isForceWork)) continue;

    let credit = 0;
    let status: HolidayWorkEntry["status"];
    if (record.status === AttendanceStatus.PRESENT) {
      credit = 1;
      status = "PRESENT";
    } else if (record.status === AttendanceStatus.HALF_DAY) {
      credit = HALF_DAY_WEIGHT;
      status = "HALF_DAY";
    } else if (record.status === AttendanceStatus.SHORT_LEAVE) {
      credit = SHORT_LEAVE_WEIGHT;
      status = "SHORT_LEAVE";
    } else {
      continue;
    }
    const labelParts: string[] = [];
    if (isSunday) labelParts.push("Sunday");
    if (isHoliday) labelParts.push(`Holiday: ${monthHolidayName.get(key)}`);
    if (isForceWork) labelParts.push("Force Work");
    holidayWorkExtraDays += credit;
    entries.push({
      date: key,
      label: labelParts.length > 1 ? labelParts.join(" · ") : (labelParts[0] ?? "Extra"),
      status,
      credit,
    });
  }

  // --- Attendance counts ---
  const attendance = {
    PRESENT: 0,
    ABSENT: 0,
    ON_LEAVE: 0,
    HALF_DAY: 0,
    SHORT_LEAVE: 0,
    sundayAbsences: 0,
    holidayAbsences: 0,
  };
  for (const record of collapsedMonth) {
    attendance[record.status] += 1;
    if (record.status === AttendanceStatus.ABSENT) {
      const day = startOfDay(new Date(record.date));
      const key = dateKey(day);
      const isSunday = day.getDay() === 0;
      const isHoliday = monthHolidaySet.has(key);
      const isOverride = monthOverrideSet.has(key);
      if (isHoliday && !isOverride) {
        attendance.holidayAbsences += 1;
      } else if (isSunday && !isOverride) {
        attendance.sundayAbsences += 1;
      }
    }
  }

  // --- Money ---
  const dailyWage = round(employee.baseSalary / daysInMonth);
  const deductionAmount = round(
    (paidLeaveOverageDays + shortLeaveOverageDays) * dailyWage,
  );
  const extraEarnings = round(holidayWorkExtraDays * dailyWage);
  const extraExpenses = approvedExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const extraExpenseEntries = approvedExpenses.map((expense) => ({
    id: expense.id,
    amount: expense.amount,
    description: expense.description,
    date: expense.date,
  }));
  const finalAmount = round(
    employee.baseSalary - deductionAmount + extraEarnings + extraExpenses,
  );

  const sortedEntries = entries.sort((a, b) => b.date.localeCompare(a.date));
  const monthsSinceJoining = wholeMonthsBetween(joinMonth, targetMonthStart);

  return {
    employeeId: employee.id,
    employeeNumber: employee.employeeId,
    employeeName: employee.name,
    month,
    year,
    baseSalary: employee.baseSalary,
    daysInMonth,
    dailyWage,
    joiningDate: employee.joiningDate,
    monthsSinceJoining,
    eligibleForLeaves,
    eligibleFrom: dateKey(eligibleFrom),
    paidLeave: {
      opening: round(openingBalance),
      grantedThisMonth: grantThisMonth,
      available: round(availableThisMonth),
      usedThisMonth: round(usedThisMonth),
      overageDays: round(paidLeaveOverageDays),
      closing: round(closingBalance),
    },
    shortLeave: {
      allowance: shortLeaveAllowance,
      usedThisMonth: shortLeavesUsed,
      remaining: round(shortLeaveRemaining),
      overageDays: round(shortLeaveOverageDays),
    },
    holidayWork: {
      extraDays: round(holidayWorkExtraDays),
      entries: sortedEntries,
    },
    attendance,
    deductionAmount,
    extraEarnings,
    extraExpenses,
    extraExpenseEntries,
    finalAmount,
    earnedLeaves: round(availableThisMonth),
    compensatoryLeaves: round(holidayWorkExtraDays),
    compensatoryEntries: sortedEntries,
    usedLeaves: round(usedThisMonth),
    availableLeaveBalance: round(closingBalance),
    totalLeavesTaken: round(usedThisMonth),
    unpaidLeaves: round(paidLeaveOverageDays),
  };
}
