import { Router } from "express";
import { prisma } from "@repo/database";

const router: Router = Router();

function startOfWeek(): Date {
  const now = new Date();
  const day = now.getDay();
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - daysSinceMonday);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

router.get("/score/current", async (req, res) => {
  try {
    const employeeId = req.employee?.id;
    if (!employeeId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const weekStart = startOfWeek();

    const score = await prisma.weeklyScore.findUnique({
      where: {
        employeeId_weekStart: { employeeId, weekStart },
      },
    });

    return res.json(score ?? null);
  } catch (error) {
    console.error("[Employee] Failed to fetch current score:", error);
    return res
      .status(500)
      .json({ message: "Failed to fetch current score" });
  }
});

router.get("/score/history", async (req, res) => {
  try {
    const employeeId = req.employee?.id;
    if (!employeeId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const weekStart = startOfWeek();
    const fourWeeksAgo = new Date(weekStart);
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 21);

    const scores = await prisma.weeklyScore.findMany({
      where: {
        employeeId,
        weekStart: { gte: fourWeeksAgo },
      },
      orderBy: { weekStart: "desc" },
      take: 4,
    });

    return res.json(scores);
  } catch (error) {
    console.error("[Employee] Failed to fetch score history:", error);
    return res
      .status(500)
      .json({ message: "Failed to fetch score history" });
  }
});

export default router;
