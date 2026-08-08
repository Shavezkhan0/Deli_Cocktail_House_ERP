import { Router } from "express";
import { prisma } from "@repo/database";

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

    return res.json(salary ?? null);
  } catch (error) {
    console.error("[Employee] Failed to fetch current salary:", error);
    return res
      .status(500)
      .json({ message: "Failed to fetch current salary" });
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
