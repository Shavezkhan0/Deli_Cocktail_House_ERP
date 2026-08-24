import { prisma, AttendanceStatus, OverrideType } from "@repo/database";

const LEAVE_WEIGHTS: Record<string, number> = {
  ON_LEAVE: 1,
  HALF_DAY: 0.5,
  SHORT_LEAVE: 0.25,
};

export type CompensatoryEntry = {
  date: string;
  source: "SUNDAY" | "HOLIDAY" | "FORCE_WORK";
  status: "PRESENT" | "HALF_DAY" | "SHORT_LEAVE";
  credit: number;
  banked: boolean;
};

export type SalaryBreakdown = {
  employeeId: string;
  employeeNumber: string;
  employeeName: string;
  month: number;
  year: number;
  baseSalary: number;
  dailyWage: number;
  monthsSinceJoining: number;
  earnedLeaves: number;
  compensatoryLeaves: number;
  compensatoryEntries: CompensatoryEntry[];
  usedLeaves: number;
  availableLeaveBalance: number;
  attendance: {
    PRESENT: number;
    ABSENT: number;
    ON_LEAVE: number;
    HALF_DAY: number;
    SHORT_LEAVE: number;
    sundayAbsences: number;
    holidayAbsences: number;
    overriddenAbsences: number;
  };
  totalLeavesTaken: number;
  unpaidLeaves: number;
  deductionAmount: number;
  extraExpenses: number;
  extraExpenseEntries: {
    id: string;
    amount: number;
    description: string;
    date: Date | null;
  }[];
  finalAmount: number;
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

export async function calculateEmployeeSalary(
  employeeId: string,
  month: number,
  year: number,
): Promise<SalaryBreakdown> {
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 1);
  const compensatoryEntries: CompensatoryEntry[] = [];

  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) {
    throw new Error("Employee not found");
  }

  // --- Leave accrual ---
  // 1 earned paid leave per month after the first 3 months of joining.
  const joining = new Date(employee.joiningDate);
  const monthsSinceJoining =
    (year - joining.getFullYear()) * 12 + (month - 1 - joining.getMonth());
  const baseEarnedLeaves = monthsSinceJoining > 3 ? monthsSinceJoining - 3 : 0;

  const [
    usedLeaveRecords,
    compensatoryAttendance,
    monthAttendance,
    monthHolidays,
    monthOverrides,
    priorHolidays,
    priorForceWorkOverrides,
    approvedExpenses,
  ] = await Promise.all([
    prisma.attendance.findMany({
      where: {
        employeeId,
        date: { lt: monthStart },
        status: {
          in: [
            AttendanceStatus.ON_LEAVE,
            AttendanceStatus.HALF_DAY,
            AttendanceStatus.SHORT_LEAVE,
          ],
        },
      },
    }),
    prisma.attendance.findMany({
      where: {
        employeeId,
        date: { lt: monthStart },
        status: {
          in: [
            AttendanceStatus.PRESENT,
            AttendanceStatus.HALF_DAY,
            AttendanceStatus.SHORT_LEAVE,
          ],
        },
      },
    }),
    prisma.attendance.findMany({
      where: {
        employeeId,
        date: { gte: monthStart, lt: monthEnd },
      },
    }),
    prisma.holiday.findMany({
      where: { date: { gte: monthStart, lt: monthEnd } },
    }),
    prisma.attendanceOverride.findMany({
      where: { employeeId, date: { gte: monthStart, lt: monthEnd } },
    }),
    prisma.holiday.findMany({
      where: { date: { lt: monthStart } },
    }),
    prisma.attendanceOverride.findMany({
      where: {
        employeeId,
        type: OverrideType.FORCE_WORK,
        date: { lt: monthStart },
      },
    }),
    prisma.expenseEntry.findMany({
      where: {
        submittedBy: employeeId,
        status: "APPROVED",
        OR: [
          { date: { gte: monthStart, lt: monthEnd } },
          { date: null, createdAt: { gte: monthStart, lt: monthEnd } },
        ],
      },
    }),
  ]);

  const usedLeaves = usedLeaveRecords.reduce(
    (sum, record) => sum + (LEAVE_WEIGHTS[record.status] ?? 0),
    0,
  );

  // Compensatory leave: working on a Sunday, a system holiday, or a FORCE_WORK
  // override date earns a paid leave (weighted for half days / short leaves).
  const priorHolidaySet = new Set(
    priorHolidays.map((holiday) => dateKey(startOfDay(new Date(holiday.date)))),
  );
  const priorForceWorkSet = new Set(
    priorForceWorkOverrides.map((override) =>
      dateKey(startOfDay(new Date(override.date))),
    ),
  );

  let compensatoryLeaves = 0;
  for (const record of compensatoryAttendance) {
    const day = startOfDay(new Date(record.date));
    const key = dateKey(day);
    const isSunday = day.getDay() === 0;
    const isHoliday = priorHolidaySet.has(key);
    const isForceWork = priorForceWorkSet.has(key);
    const source = isForceWork ? "FORCE_WORK" : isHoliday ? "HOLIDAY" : "SUNDAY";
    if (isSunday || isHoliday || isForceWork) {
      compensatoryLeaves += LEAVE_WEIGHTS[record.status] ?? 1;
      compensatoryEntries.push({
        date: key,
        source,
        status: record.status as "PRESENT" | "HALF_DAY" | "SHORT_LEAVE",
        credit: LEAVE_WEIGHTS[record.status] ?? 1,
        banked: true,
      });
    }
  }

  const earnedLeaves = baseEarnedLeaves + compensatoryLeaves;
  const availableLeaveBalance = round(Math.max(earnedLeaves - usedLeaves, 0));

  // --- Month deductions (30-day divisor) ---
  const dailyWage = employee.baseSalary / 30;

  const holidaySet = new Set(
    monthHolidays.map((holiday) => dateKey(startOfDay(new Date(holiday.date)))),
  );
  const overrideSet = new Set(
    monthOverrides.map((override) => dateKey(startOfDay(new Date(override.date)))),
  );
  const forceWorkSet = new Set(
    monthOverrides
      .filter((override) => override.type === OverrideType.FORCE_WORK)
      .map((override) => dateKey(startOfDay(new Date(override.date)))),
  );

  const attendance = {
    PRESENT: 0,
    ABSENT: 0,
    ON_LEAVE: 0,
    HALF_DAY: 0,
    SHORT_LEAVE: 0,
    sundayAbsences: 0,
    holidayAbsences: 0,
    overriddenAbsences: 0,
  };

  let totalLeavesTaken = 0;

  for (const record of monthAttendance) {
    const day = startOfDay(new Date(record.date));
    const key = dateKey(day);
    const isHoliday = holidaySet.has(key);
    const isSunday = day.getDay() === 0;
    const isOverride = overrideSet.has(key);
    const isForceWork = forceWorkSet.has(key);

    if (record.status === AttendanceStatus.PRESENT) {
      const source = isForceWork ? "FORCE_WORK" : isHoliday ? "HOLIDAY" : isSunday ? "SUNDAY" : null;
      if (source) {
        compensatoryEntries.push({
          date: key,
          source,
          status: "PRESENT",
          credit: 1,
          banked: false,
        });
      }
      attendance.PRESENT += 1;
      continue;
    }

    if (record.status === AttendanceStatus.ABSENT) {
      attendance.ABSENT += 1;
      if (isHoliday && !isOverride) {
        attendance.holidayAbsences += 1;
        continue;
      }
      if (isSunday && !isOverride) {
        attendance.sundayAbsences += 1;
        continue;
      }
      if (isHoliday || isSunday) {
        attendance.overriddenAbsences += 1;
      }
      totalLeavesTaken += 1;
      continue;
    }

    if (record.status === AttendanceStatus.HALF_DAY || record.status === AttendanceStatus.SHORT_LEAVE) {
      const statusKey = record.status === AttendanceStatus.HALF_DAY ? "HALF_DAY" : "SHORT_LEAVE";
      const source = isForceWork ? "FORCE_WORK" : isHoliday ? "HOLIDAY" : isSunday ? "SUNDAY" : null;
      if (source) {
        compensatoryEntries.push({
          date: key,
          source,
          status: statusKey,
          credit: LEAVE_WEIGHTS[record.status] ?? 1,
          banked: false,
        });
      }
      attendance[record.status] += 1;
      totalLeavesTaken += LEAVE_WEIGHTS[record.status] ?? 0;
      continue;
    }

    attendance[record.status] += 1;
    totalLeavesTaken += LEAVE_WEIGHTS[record.status] ?? 0;
  }

  const unpaidLeaves = Math.max(totalLeavesTaken - availableLeaveBalance, 0);
  const deductionAmount = round(unpaidLeaves * dailyWage);

  // --- Additions (approved extra expenses) ---
  const extraExpenses = approvedExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const extraExpenseEntries = approvedExpenses.map((expense) => ({
    id: expense.id,
    amount: expense.amount,
    description: expense.description,
    date: expense.date,
  }));

  const finalAmount = round(employee.baseSalary - deductionAmount + extraExpenses);

  return {
    employeeId: employee.id,
    employeeNumber: employee.employeeId,
    employeeName: employee.name,
    month,
    year,
    baseSalary: employee.baseSalary,
    dailyWage: round(dailyWage),
    monthsSinceJoining,
    earnedLeaves,
    compensatoryLeaves,
    compensatoryEntries: compensatoryEntries.sort(
      (a, b) => b.date.localeCompare(a.date),
    ),
    usedLeaves,
    availableLeaveBalance,
    attendance,
    totalLeavesTaken,
    unpaidLeaves,
    deductionAmount,
    extraExpenses,
    extraExpenseEntries,
    finalAmount,
  };
}
