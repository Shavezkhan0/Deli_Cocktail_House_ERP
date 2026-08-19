import { prisma, AttendanceStatus, EmployeeStatus, OverrideType } from "@repo/database";
import { startOfToday, istDayOfWeek } from "../lib/attendance-time";

export interface MarkAbsentResult {
  marked: number;
  onLeave: number;
  skipped: number;
}

export async function markAbsentEmployeesForToday(): Promise<MarkAbsentResult> {
  const today = startOfToday();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isSunday = istDayOfWeek(today) === 0;

  const [activeEmployees, todayAttendances, todayHolidays, todayOverrides] =
    await Promise.all([
      prisma.employee.findMany({
        where: { status: EmployeeStatus.ACTIVE },
        select: { id: true },
      }),
      prisma.attendance.findMany({
        where: { date: { gte: today, lt: tomorrow } },
        select: { employeeId: true },
      }),
      prisma.holiday.findMany({
        where: { date: { gte: today, lt: tomorrow } },
        select: { id: true },
      }),
      prisma.attendanceOverride.findMany({
        where: { date: { gte: today, lt: tomorrow } },
        select: { employeeId: true, type: true },
      }),
    ]);

  const attendedIds = new Set(todayAttendances.map((a) => a.employeeId));
  const isHoliday = todayHolidays.length > 0;

  const overrideByEmployee = new Map<string, OverrideType>();
  for (const ov of todayOverrides) {
    overrideByEmployee.set(ov.employeeId, ov.type);
  }

  const toCreate: { employeeId: string; date: Date; status: AttendanceStatus }[] = [];

  for (const emp of activeEmployees) {
    if (attendedIds.has(emp.id)) continue;

    const override = overrideByEmployee.get(emp.id);

    if (override === OverrideType.FORCE_LEAVE) {
      toCreate.push({
        employeeId: emp.id,
        date: today,
        status: AttendanceStatus.ON_LEAVE,
      });
      continue;
    }

    if ((isSunday || isHoliday) && override !== OverrideType.FORCE_WORK) {
      continue;
    }

    toCreate.push({
      employeeId: emp.id,
      date: today,
      status: AttendanceStatus.ABSENT,
    });
  }

  if (toCreate.length === 0) {
    return { marked: 0, onLeave: 0, skipped: activeEmployees.length };
  }

  let marked = 0;
  let onLeave = 0;

  for (const row of toCreate) {
    try {
      await prisma.attendance.create({ data: row });
      if (row.status === AttendanceStatus.ABSENT) marked++;
      else if (row.status === AttendanceStatus.ON_LEAVE) onLeave++;
    } catch (err: unknown) {
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code: string }).code === "P2002"
      ) {
        continue;
      }
      throw err;
    }
  }

  return {
    marked,
    onLeave,
    skipped: activeEmployees.length - toCreate.length,
  };
}
