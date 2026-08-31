import { Router } from "express";
import { prisma } from "@repo/database";
import { calculateEmployeeSalary } from "../../services/salary-calculator";
import {
  buildSalarySlipPdf,
  CompanyDetails,
} from "../../services/salary-pdf";
import { loadCompanyLogo } from "../../lib/company-assets";

const router: Router = Router();

function currentMonthYear(): { month: number; year: number } {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

function previousMonthYear(): { month: number; year: number } {
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return { month: prev.getMonth() + 1, year: prev.getFullYear() };
}

router.get("/salary/current", async (req, res) => {
  try {
    const employeeId = req.employee?.id;
    if (!employeeId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { month, year } = currentMonthYear();

    const salary = await prisma.salary.findUnique({
      where: {
        employeeId_month_year: { employeeId, month, year },
      },
    });

    if (salary) {
      return res.json(salary);
    }

    const breakdown = await calculateEmployeeSalary(employeeId, month, year);

    return res.json({
      id: `estimate-${employeeId}-${month}-${year}`,
      month,
      year,
      amount: breakdown.finalAmount,
      status: "UNPAID",
      paidDate: null,
      isEstimate: true,
    });
  } catch (error) {
    console.error("[Employee] Failed to fetch current salary:", error);
    return res
      .status(500)
      .json({ message: "Failed to fetch current salary" });
  }
});

router.get("/salary/leave-balance", async (req, res) => {
  try {
    const employeeId = req.employee?.id;
    if (!employeeId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { month, year } = currentMonthYear();

    const breakdown = await calculateEmployeeSalary(employeeId, month, year);

    return res.json({
      month,
      year,
      paidLeave: breakdown.paidLeave,
      shortLeave: breakdown.shortLeave,
      holidayWork: breakdown.holidayWork,
      earnedLeaves: breakdown.earnedLeaves,
      compensatoryLeaves: breakdown.compensatoryLeaves,
      usedLeaves: breakdown.usedLeaves,
      availableLeaveBalance: breakdown.availableLeaveBalance,
    });
  } catch (error) {
    console.error("[Employee] Failed to fetch leave balance:", error);
    return res
      .status(500)
      .json({ message: "Failed to fetch leave balance" });
  }
});

// GET /salary/slip?month=&year= — the employee's own PDF salary slip as a download
router.get("/salary/slip", async (req, res) => {
  try {
    const employeeId = req.employee?.id;
    if (!employeeId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const now = new Date();
    const month =
      Number(req.query.month) || (now.getMonth() + 1);
    const year = Number(req.query.year) || now.getFullYear();

    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return res.status(400).json({ message: "Month must be an integer between 1 and 12" });
    }
    if (!Number.isInteger(year) || year < 2000) {
      return res.status(400).json({ message: "Year must be a valid year" });
    }

    const [breakdown, employee, company] = await Promise.all([
      calculateEmployeeSalary(employeeId, month, year),
      prisma.employee.findUnique({ where: { id: employeeId } }),
      prisma.pdfCompanySettings.findFirst({ orderBy: { createdAt: "asc" } }),
    ]);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const companyDetails: CompanyDetails = {
      companyName: company?.companyName ?? "Deli Cocktail House",
      address: company?.address ?? "",
      phone1: company?.phone1 ?? "",
      phone2: company?.phone2 ?? "",
      email: company?.email ?? "",
      footerText: company?.footerText ?? "",
    };

    const logo = await loadCompanyLogo(
      company?.logoUrl ?? company?.headerLogoUrl,
    );

    const pdf = await buildSalarySlipPdf(
      { ...breakdown, employee },
      companyDetails,
      { logo },
    );

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="salary-slip-${year}-${month}.pdf"`,
    );
    res.send(pdf);
  } catch (error) {
    console.error("[Employee] Failed to generate salary slip:", error);
    return res
      .status(500)
      .json({ message: "Failed to generate salary slip" });
  }
});

router.get("/salary/breakdown", async (req, res) => {
  try {
    const employeeId = req.employee?.id;
    if (!employeeId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { month: currentMonth, year: currentYear } = currentMonthYear();
    const month = Number(req.query.month) || currentMonth;
    const year = Number(req.query.year) || currentYear;

    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return res
        .status(400)
        .json({ message: "Month must be an integer between 1 and 12" });
    }
    if (!Number.isInteger(year) || year < 2000) {
      return res.status(400).json({ message: "Year must be a valid year" });
    }

    const b = await calculateEmployeeSalary(employeeId, month, year);

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { designation: true, joiningDate: true },
    });
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    return res.json({
      ...b,
      designation: employee.designation,
      joiningDate: employee.joiningDate,
    });
  } catch (error) {
    console.error("[Employee] Failed to fetch salary breakdown:", error);
    return res
      .status(500)
      .json({ message: "Failed to fetch salary breakdown" });
  }
});

router.get("/salary/extra-days", async (req, res) => {
  try {
    const employeeId = req.employee?.id;
    if (!employeeId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { month, year } = currentMonthYear();

    const breakdown = await calculateEmployeeSalary(employeeId, month, year);

    return res.json({
      month,
      year,
      holidayWork: breakdown.holidayWork,
      compensatoryLeaves: breakdown.compensatoryLeaves,
      availableLeaveBalance: breakdown.availableLeaveBalance,
      entries: breakdown.compensatoryEntries,
    });
  } catch (error) {
    console.error("[Employee] Failed to fetch extra days:", error);
    return res
      .status(500)
      .json({ message: "Failed to fetch extra days" });
  }
});

router.get("/salary/previous", async (req, res) => {
  try {
    const employeeId = req.employee?.id;
    if (!employeeId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { month, year } = previousMonthYear();

    const salary = await prisma.salary.findUnique({
      where: {
        employeeId_month_year: { employeeId, month, year },
      },
    });

    return res.json(salary ?? null);
  } catch (error) {
    console.error("[Employee] Failed to fetch previous salary:", error);
    return res
      .status(500)
      .json({ message: "Failed to fetch previous salary" });
  }
});

router.get("/salary/history", async (req, res) => {
  try {
    const employeeId = req.employee?.id;
    if (!employeeId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const now = new Date();
    const cutoff = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const salaries = await prisma.salary.findMany({
      where: { employeeId },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });

    const history = salaries.filter((salary) => {
      const monthStart = new Date(salary.year, salary.month - 1, 1);
      return monthStart >= cutoff;
    });

    return res.json(history);
  } catch (error) {
    console.error("[Employee] Failed to fetch salary history:", error);
    return res
      .status(500)
      .json({ message: "Failed to fetch salary history" });
  }
});

export default router;
