import { Router } from "express";
import {
  prisma,
  AttendanceStatus,
  EmployeeDesignation,
  EmployeeStatus,
  EventStatus,
} from "@repo/database";
import { requireAuth } from "../middleware/requireAuth";

const router: Router = Router();

router.get("/dashboard", requireAuth, async (_req, res) => {
  try {
    const today = new Date();
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
          status: AttendanceStatus.PRESENT,
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
    const { attendanceStatus, employeeStatus } = req.query;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let where: Record<string, unknown> = {};

    if (typeof attendanceStatus === "string" && attendanceStatus.trim() !== "") {
      where = {
        attendances: {
          some: {
            date: { gte: today, lt: tomorrow },
            status: attendanceStatus.trim() as AttendanceStatus,
          },
        },
      };
    }

    if (typeof employeeStatus === "string" && employeeStatus.trim() !== "") {
      where = {
        ...where,
        status: employeeStatus.trim() as EmployeeStatus,
      };
    }

    const employees = await prisma.employee.findMany({ where });
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
      contact,
      emergencyContact,
      designation,
      baseSalary,
      joiningDate,
    } = req.body;

    const lastEmployee = await prisma.employee.findFirst({
      orderBy: { createdAt: "desc" },
    });

    let nextNum = 1;
    if (lastEmployee && lastEmployee.employeeId.startsWith("EMP-")) {
      const numStr = lastEmployee.employeeId.replace("EMP-", "");
      const num = parseInt(numStr, 10);
      if (!isNaN(num)) {
        nextNum = num + 1;
      }
    }
    const employeeId = `EMP-${nextNum.toString().padStart(3, "0")}`;

    const data: Record<string, unknown> = {
      employeeId,
      name,
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

export default router;
