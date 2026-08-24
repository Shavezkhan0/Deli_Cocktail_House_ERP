import { Router } from "express";
import {
  prisma,
  AttendanceStatus,
  EmployeeDesignation,
  EmployeeStatus,
  EventStatus,
  OverrideType,
  Prisma,
} from "@repo/database";
import { requireAuth } from "../middleware/requireAuth";
import { calculateEmployeeSalary } from "../services/salary-calculator";
import { markAbsentEmployeesForToday } from "../services/mark-absent-job";

const router: Router = Router();

function parseDateString(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, y, m, d] = match;
  const year = Number(y);
  const month = Number(m);
  const day = Number(d);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  return new Date(year, month - 1, day);
}

router.get("/dashboard", requireAuth, async (_req, res) => {
  try {
    const today = parseDateString(_req.query.date) ?? new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      totalEmployees,
      activeEmployees,
      leftEmployees,
      presentToday,
      absentToday,
      onLeaveToday,
      ongoingEvents,
    ] = await Promise.all([
      prisma.employee.count(),
      prisma.employee.count({ where: { status: EmployeeStatus.ACTIVE } }),
      prisma.employee.count({ where: { status: EmployeeStatus.LEFT } }),
      prisma.attendance.count({
        where: {
          date: { gte: today, lt: tomorrow },
          checkInTime: { not: null },
        },
      }),
      prisma.attendance.count({
        where: {
          date: { gte: today, lt: tomorrow },
          status: AttendanceStatus.ABSENT,
        },
      }),
      prisma.attendance.count({
        where: {
          date: { gte: today, lt: tomorrow },
          status: AttendanceStatus.ON_LEAVE,
        },
      }),
      prisma.event.count({
        where: { status: EventStatus.ONGOING },
      }),
    ]);

    return res.json({
      totalEmployees,
      activeEmployees,
      leftEmployees,
      presentToday,
      absentToday,
      onLeaveToday,
      ongoingEvents,
    });
  } catch (error) {
    console.error("[Office] Failed to fetch dashboard:", error);
    return res.status(500).json({ message: "Failed to fetch dashboard" });
  }
});

router.get("/employees", requireAuth, async (req, res) => {
  try {
    const { attendanceStatus, employeeStatus, date: dateQuery } = req.query;

    const today = parseDateString(dateQuery) ?? new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const todayWindow = { gte: today, lt: tomorrow };

    let where: Record<string, unknown> = {};
    let include: Prisma.EmployeeInclude | undefined;

    const todayAttendanceInclude = {
      attendances: {
        where: { date: todayWindow },
        select: { checkInTime: true, status: true },
        take: 1,
      },
    } satisfies Prisma.EmployeeInclude;
    type EmployeeWithTodayAttendance = Prisma.EmployeeGetPayload<{
      include: typeof todayAttendanceInclude;
    }>;

    if (typeof attendanceStatus === "string" && attendanceStatus.trim() !== "") {
      const status = attendanceStatus.trim() as AttendanceStatus;
      if (status === AttendanceStatus.PRESENT) {
        // "Present today" = anyone who actually checked in today,
        // regardless of late status (SHORT_LEAVE / HALF_DAY).
        where = {
          attendances: {
            some: {
              date: todayWindow,
              checkInTime: { not: null },
            },
          },
        };
        include = todayAttendanceInclude;
      } else {
        where = {
          attendances: {
            some: {
              date: todayWindow,
              status,
            },
          },
        };
      }
    }

    if (typeof employeeStatus === "string" && employeeStatus.trim() !== "") {
      where = {
        ...where,
        status: employeeStatus.trim() as EmployeeStatus,
      };
    }

    const employees = await prisma.employee.findMany({
      where,
      include,
      orderBy: { createdAt: "desc" },
    });

    if (include) {
      return res.json(
        (employees as EmployeeWithTodayAttendance[]).map(
          ({ attendances, ...employee }) => ({
            ...employee,
            todayCheckInTime: attendances[0]?.checkInTime ?? null,
            todayStatus: attendances[0]?.status ?? null,
          }),
        ),
      );
    }

    return res.json(employees);
  } catch (error) {
    console.error("[Office] Failed to fetch employees:", error);
    return res.status(500).json({ message: "Failed to fetch employees" });
  }
});

router.get("/dashboard/ongoing-events", requireAuth, async (_req, res) => {
  try {
    const events = await prisma.event.findMany({
      where: { status: EventStatus.ONGOING },
      orderBy: { eventDate: "asc" },
    });
    return res.json(events);
  } catch (error) {
    console.error("[Office] Failed to fetch ongoing events:", error);
    return res.status(500).json({ message: "Failed to fetch ongoing events" });
  }
});

router.post("/employees", requireAuth, async (req, res) => {
  try {
    const {
      name,
      email,
      contact,
      emergencyContact,
      designation,
      baseSalary,
      joiningDate,
    } = req.body;

    const existingEmployees = await prisma.employee.findMany({
      select: { employeeId: true },
    });

    let maxNum = 0;
    for (const emp of existingEmployees) {
      const match = /^DCH-(\d+)$/.exec(emp.employeeId);
      if (match) {
        const num = parseInt(match[1] ?? "0", 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }
    const nextNum = maxNum + 1;
    const employeeId = `DCH-${nextNum.toString().padStart(3, "0")}`;

    const normalizedEmail =
      typeof email === "string" && email.trim() !== ""
        ? email.trim().toLowerCase()
        : null;

    if (normalizedEmail) {
      const existingEmail = await prisma.employee.findUnique({
        where: { email: normalizedEmail },
      });
      if (existingEmail) {
        return res
          .status(409)
          .json({ message: "An employee with this email already exists" });
      }
    }

    const data: Record<string, unknown> = {
      employeeId,
      name,
      email: normalizedEmail,
      contact,
      emergencyContact,
      designation: designation as EmployeeDesignation,
      baseSalary: parseFloat(baseSalary),
      joiningDate: new Date(joiningDate),
    };

    const optionalFields = [
      "aadharUrl",
      "panCardUrl",
      "offerLetterUrl",
      "bondUrl",
      "bankAccountNo",
      "bankBranch",
      "bankIfsc",
      "bankOtherDetails",
    ];

    for (const field of optionalFields) {
      const value = req.body[field];
      if (typeof value === "string" && value.trim() !== "") {
        data[field] = value.trim();
      }
    }

    const newEmployee = await prisma.employee.create({
      data: data as Parameters<typeof prisma.employee.create>[0]["data"],
    });

    return res.status(201).json(newEmployee);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return res
        .status(409)
        .json({ message: "An employee with this email already exists" });
    }
    console.error("[Office] Failed to create employee:", error);
    return res.status(500).json({ message: "Failed to create employee" });
  }
});

router.put("/employees/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.employee.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const data: Record<string, unknown> = {};

    if ("email" in req.body) {
      const rawEmail = req.body.email;
      const normalizedEmail =
        typeof rawEmail === "string" && rawEmail.trim() !== ""
          ? rawEmail.trim().toLowerCase()
          : null;
      if (normalizedEmail) {
        const existingEmail = await prisma.employee.findUnique({
          where: { email: normalizedEmail },
        });
        if (existingEmail && existingEmail.id !== id) {
          return res
            .status(409)
            .json({ message: "An employee with this email already exists" });
        }
      }
      data.email = normalizedEmail;
    }

    const updatableFields = [
      "name",
      "contact",
      "emergencyContact",
      "baseSalary",
      "joiningDate",
      "leavingDate",
      "aadharUrl",
      "panCardUrl",
      "offerLetterUrl",
      "bondUrl",
      "bankAccountNo",
      "bankBranch",
      "bankIfsc",
      "bankOtherDetails",
    ];

    for (const field of updatableFields) {
      if (field in req.body) {
        const value = req.body[field];
        if (field === "baseSalary") {
          data[field] = parseFloat(value);
        } else if (field === "joiningDate" || field === "leavingDate") {
          data[field] = value === null || value === "" ? null : new Date(value);
        } else if (typeof value === "string") {
          data[field] = value.trim();
        } else {
          data[field] = value;
        }
      }
    }

    if (typeof req.body.designation === "string") {
      data.designation = req.body.designation as EmployeeDesignation;
    }

    if (typeof req.body.status === "string") {
      data.status = req.body.status as EmployeeStatus;
      if (req.body.status === "ACTIVE") {
        data.leavingDate = null;
      }
    }

    const updatedEmployee = await prisma.employee.update({
      where: { id },
      data: data as Parameters<typeof prisma.employee.update>[0]["data"],
    });

    return res.json(updatedEmployee);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return res
        .status(409)
        .json({ message: "An employee with this email already exists" });
    }
    console.error("[Office] Failed to update employee:", error);
    return res.status(500).json({ message: "Failed to update employee" });
  }
});

router.get("/employees/:id/salaries", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: "Employee id is required" });
    }

    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const salaries = await prisma.salary.findMany({
      where: { employeeId: id },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });

    return res.json(salaries);
  } catch (error) {
    console.error("[Office] Failed to fetch salaries:", error);
    return res.status(500).json({ message: "Failed to fetch salaries" });
  }
});

router.post("/employees/:id/salaries", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: "Employee id is required" });
    }

    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const { month, year, amount, status } = req.body;

    const monthNum = Number(month);
    const yearNum = Number(year);

    if (!Number.isInteger(monthNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({ message: "Month must be an integer between 1 and 12" });
    }
    if (!Number.isInteger(yearNum) || yearNum < 2000) {
      return res.status(400).json({ message: "Year must be a valid year" });
    }
    if (amount === undefined || isNaN(Number(amount)) || Number(amount) < 0) {
      return res.status(400).json({ message: "Amount must be a non-negative number" });
    }

    const salaryStatus =
      typeof status === "string" && (status === "PAID" || status === "UNPAID")
        ? status
        : "UNPAID";

    const salary = await prisma.salary.upsert({
      where: {
        employeeId_month_year: { employeeId: id, month: monthNum, year: yearNum },
      },
      update: {
        amount: Number(amount),
        status: salaryStatus,
        paidDate: salaryStatus === "PAID" ? new Date() : null,
      },
      create: {
        employeeId: id,
        month: monthNum,
        year: yearNum,
        amount: Number(amount),
        status: salaryStatus,
        paidDate: salaryStatus === "PAID" ? new Date() : null,
      },
    });

    return res.status(200).json(salary);
  } catch (error) {
    console.error("[Office] Failed to save salary:", error);
    return res.status(500).json({ message: "Failed to save salary" });
  }
});

// GET /employees/:id/salary-breakdown?month=&year=
// Returns the full salary calculation breakdown (paid leaves + 30-day deductions + extra expenses).
router.get("/employees/:id/salary-breakdown", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: "Employee id is required" });
    }

    const month = Number(req.query.month);
    const year = Number(req.query.year);

    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return res.status(400).json({ message: "Month must be an integer between 1 and 12" });
    }
    if (!Number.isInteger(year) || year < 2000) {
      return res.status(400).json({ message: "Year must be a valid year" });
    }

    const breakdown = await calculateEmployeeSalary(id, month, year);
    return res.json(breakdown);
  } catch (error) {
    if (error instanceof Error && error.message === "Employee not found") {
      return res.status(404).json({ message: "Employee not found" });
    }
    console.error("[Office] Failed to calculate salary:", error);
    return res.status(500).json({ message: "Failed to calculate salary" });
  }
});

// GET /employees/:id/attendance — list attendance records (with check in/out times) for an employee
// Optional query: ?month=8&year=2026 to scope to a specific month
router.get("/employees/:id/attendance", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: "Employee id is required" });
    }

    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const { month, year } = req.query;
    const monthNum = Number(month);
    const yearNum = Number(year);
    const hasMonth =
      Number.isInteger(monthNum) && monthNum >= 1 && monthNum <= 12;
    const hasYear = Number.isInteger(yearNum) && yearNum >= 2000;

    let where: Prisma.AttendanceWhereInput = { employeeId: id };
    if (hasMonth && hasYear) {
      const start = new Date(yearNum, monthNum - 1, 1);
      const end = new Date(yearNum, monthNum, 1);
      where = { employeeId: id, date: { gte: start, lt: end } };
    }

    const records = await prisma.attendance.findMany({
      where,
      orderBy: { date: "desc" },
    });

    return res.json(records);
  } catch (error) {
    console.error("[Office] Failed to fetch employee attendance:", error);
    return res.status(500).json({ message: "Failed to fetch employee attendance" });
  }
});

// POST /employees/:id/attendance-status — admin sets/corrects an employee's
// attendance status for a date { date, status }. Unlike attendance-override
// (which governs whether a holiday/Sunday counts as a working day), this
// directly edits the actual attendance record — e.g. to fix a mis-marked
// ABSENT/HALF_DAY that should have been PRESENT. If a record already exists
// for that date, only its status changes (check-in/out times are preserved);
// otherwise a new record is created with no check-in/out times. When the
// status actually changes, previousStatus/correctedByAdmin/correctedAt are
// stamped so both admin and the employee can see it was manually corrected.
router.post("/employees/:id/attendance-status", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: "Employee id is required" });
    }

    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const { date, status } = req.body ?? {};
    const dayStart = parseDateString(date);
    if (!dayStart) {
      return res.status(400).json({ message: "A valid date is required" });
    }
    if (!Object.values(AttendanceStatus).includes(status)) {
      return res.status(400).json({ message: "A valid status is required" });
    }

    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const existing = await prisma.attendance.findFirst({
      where: { employeeId: id, date: { gte: dayStart, lt: dayEnd } },
    });

    const attendance =
      existing && existing.status !== status
        ? await prisma.attendance.update({
            where: { id: existing.id },
            data: {
              status,
              previousStatus: existing.status,
              correctedByAdmin: true,
              correctedAt: new Date(),
            },
          })
        : existing
          ? existing
          : await prisma.attendance.create({
              data: {
                employeeId: id,
                date: dayStart,
                status,
                correctedByAdmin: true,
                correctedAt: new Date(),
              },
            });

    return res.json(attendance);
  } catch (error) {
    console.error("[Office] Failed to update attendance status:", error);
    return res.status(500).json({ message: "Failed to update attendance status" });
  }
});

// GET /employees/:id/working-overrides — list working overrides for an employee
router.get("/employees/:id/working-overrides", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: "Employee id is required" });
    }

    const overrides = await prisma.attendanceOverride.findMany({
      where: { employeeId: id },
      orderBy: { date: "desc" },
    });

    return res.json(overrides);
  } catch (error) {
    console.error("[Office] Failed to fetch working overrides:", error);
    return res.status(500).json({ message: "Failed to fetch working overrides" });
  }
});

// POST /employees/:id/working-overrides — assign an employee to work on a date { date, reason? }
router.post("/employees/:id/working-overrides", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: "Employee id is required" });
    }

    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const { date, reason } = req.body ?? {};
    if (typeof date !== "string" || isNaN(Date.parse(date))) {
      return res.status(400).json({ message: "A valid date is required" });
    }

    const override = await prisma.attendanceOverride.upsert({
      where: {
        employeeId_date: { employeeId: id, date: new Date(date) },
      },
      update: {
        type: OverrideType.FORCE_WORK,
        reason:
          typeof reason === "string" && reason.trim() !== "" ? reason.trim() : null,
      },
      create: {
        employeeId: id,
        date: new Date(date),
        type: OverrideType.FORCE_WORK,
        reason:
          typeof reason === "string" && reason.trim() !== "" ? reason.trim() : null,
      },
    });

    return res.status(201).json(override);
  } catch (error) {
    console.error("[Office] Failed to create working override:", error);
    return res.status(500).json({ message: "Failed to create working override" });
  }
});

// DELETE /employees/:id/working-overrides/:overrideId — remove a working override
router.delete(
  "/employees/:id/working-overrides/:overrideId",
  requireAuth,
  async (req, res) => {
    try {
      const { id, overrideId } = req.params;
      if (!overrideId) {
        return res.status(400).json({ message: "Override id is required" });
      }

      const override = await prisma.attendanceOverride.findFirst({
        where: { id: overrideId, employeeId: id },
      });
      if (!override) {
        return res.status(404).json({ message: "Working override not found" });
      }

      await prisma.attendanceOverride.delete({ where: { id: overrideId } });
      return res.status(204).send();
    } catch (error) {
      console.error("[Office] Failed to delete working override:", error);
      return res.status(500).json({ message: "Failed to delete working override" });
    }
  },
);

// POST /employees/:id/attendance-override — upsert an attendance override { date, type, reason? }
// type: FORCE_WORK (assign work on a holiday) or FORCE_LEAVE (grant a leave)
router.post("/employees/:id/attendance-override", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: "Employee id is required" });
    }

    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const { date, type, reason } = req.body ?? {};
    if (typeof date !== "string" || isNaN(Date.parse(date))) {
      return res.status(400).json({ message: "A valid date is required" });
    }
    if (type !== OverrideType.FORCE_WORK && type !== OverrideType.FORCE_LEAVE) {
      return res.status(400).json({
        message: "Type must be FORCE_WORK or FORCE_LEAVE",
      });
    }

    const override = await prisma.attendanceOverride.upsert({
      where: {
        employeeId_date: { employeeId: id, date: new Date(date) },
      },
      update: {
        type,
        reason:
          typeof reason === "string" && reason.trim() !== "" ? reason.trim() : null,
      },
      create: {
        employeeId: id,
        date: new Date(date),
        type,
        reason:
          typeof reason === "string" && reason.trim() !== "" ? reason.trim() : null,
      },
    });

    return res.status(201).json(override);
  } catch (error) {
    console.error("[Office] Failed to save attendance override:", error);
    return res.status(500).json({ message: "Failed to save attendance override" });
  }
});

// GET /employees/:id/expenses — list approved extra expenses for an employee
router.get("/employees/:id/expenses", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: "Employee id is required" });
    }

    const expenses = await prisma.expenseEntry.findMany({
      where: { submittedBy: id, status: "APPROVED" },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });

    return res.json(expenses);
  } catch (error) {
    console.error("[Office] Failed to fetch expenses:", error);
    return res.status(500).json({ message: "Failed to fetch expenses" });
  }
});

// POST /employees/:id/expenses — add an approved extra expense { amount, description, date }
router.post("/employees/:id/expenses", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: "Employee id is required" });
    }

    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const { amount, description, date } = req.body ?? {};

    const amountNum = Number(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ message: "Amount must be a positive number" });
    }
    if (typeof description !== "string" || description.trim() === "") {
      return res.status(400).json({ message: "Description is required" });
    }
    const expenseDate =
      typeof date === "string" && !isNaN(Date.parse(date))
        ? new Date(date)
        : new Date();

    const expense = await prisma.expenseEntry.create({
      data: {
        submittedBy: id,
        amount: amountNum,
        description: description.trim(),
        status: "APPROVED",
        date: expenseDate,
      },
    });

    return res.status(201).json(expense);
  } catch (error) {
    console.error("[Office] Failed to create expense:", error);
    return res.status(500).json({ message: "Failed to create expense" });
  }
});

router.get("/employees/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const employee = await prisma.employee.findUnique({
      where: { id },
    });

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const joiningDate = new Date(employee.joiningDate);
    const now = new Date();
    const totalMonthsSinceJoining =
      (now.getFullYear() - joiningDate.getFullYear()) * 12 +
      now.getMonth() -
      joiningDate.getMonth();

    return res.json({
      ...employee,
      totalMonthsSinceJoining,
    });
  } catch (error) {
    console.error("[Office] Failed to fetch employee details:", error);
    return res.status(500).json({ message: "Failed to fetch employee details" });
  }
});

router.get("/employees/:id/details", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const employee = await prisma.employee.findUnique({
      where: { id },
    });

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const joiningDate = new Date(employee.joiningDate);
    const now = new Date();
    const totalMonthsSinceJoining =
      (now.getFullYear() - joiningDate.getFullYear()) * 12 +
      now.getMonth() -
      joiningDate.getMonth();

    return res.json({
      id: employee.id,
      employeeId: employee.employeeId,
      name: employee.name,
      joiningDate: employee.joiningDate,
      totalMonthsSinceJoining,
      leaveScore: null,
    });
  } catch (error) {
    console.error("[Office] Failed to fetch employee details:", error);
    return res.status(500).json({ message: "Failed to fetch employee details" });
  }
});

router.get("/attendance/summary", requireAuth, async (_req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const employees = await prisma.employee.findMany({
      include: {
        attendances: {
          where: {
            date: { gte: startOfMonth, lte: endOfMonth },
          },
        },
      },
    });

    const summary = employees.map((emp) => {
      const dailyWage = emp.baseSalary / 30;

      let totalFullDays = 0;
      let totalHalfDays = 0;
      let totalShortLeaves = 0;

      emp.attendances.forEach((att) => {
        if (att.status === AttendanceStatus.PRESENT) totalFullDays++;
        else if (att.status === AttendanceStatus.HALF_DAY) totalHalfDays++;
        else if (att.status === AttendanceStatus.SHORT_LEAVE) totalShortLeaves++;
      });

      const netSalary =
        totalFullDays * dailyWage +
        totalHalfDays * (dailyWage * 0.5) +
        totalShortLeaves * (dailyWage * 0.75);

      return {
        id: emp.id,
        employeeId: emp.employeeId,
        name: emp.name,
        baseSalary: emp.baseSalary,
        totalWorkingDays: emp.attendances.length,
        totalFullDays,
        totalHalfDays,
        totalShortLeaves,
        netSalary: Math.round(netSalary * 100) / 100,
      };
    });

    return res.json(summary);
  } catch (error) {
    console.error("[Office] Failed to fetch attendance summary:", error);
    return res.status(500).json({ message: "Failed to fetch attendance summary" });
  }
});

router.post("/attendance/mark-absent-now", requireAuth, async (_req, res) => {
  try {
    const result = await markAbsentEmployeesForToday();
    return res.json(result);
  } catch (error) {
    console.error("[Office] Failed to mark absent employees:", error);
    return res.status(500).json({ message: "Failed to mark absent employees" });
  }
});

export default router;
