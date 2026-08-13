import { Router } from "express";
import { prisma } from "@repo/database";
import { requireAuth } from "../../middleware/requireAuth";

const router: Router = Router();

// GET /api/office/holidays — list all holidays, newest first
router.get("/", requireAuth, async (_req, res) => {
  try {
    const holidays = await prisma.holiday.findMany({
      orderBy: { date: "desc" },
    });
    return res.json(holidays);
  } catch (error) {
    console.error("[Office] Failed to fetch holidays:", error);
    return res.status(500).json({ message: "Failed to fetch holidays" });
  }
});

// POST /api/office/holidays — create a holiday { date: "YYYY-MM-DD", name: string }
router.post("/", requireAuth, async (req, res) => {
  try {
    const { date, name } = req.body ?? {};

    if (typeof date !== "string" || isNaN(Date.parse(date))) {
      return res.status(400).json({ message: "A valid date is required" });
    }
    if (typeof name !== "string" || name.trim() === "") {
      return res.status(400).json({ message: "Holiday name is required" });
    }

    const holiday = await prisma.holiday.create({
      data: {
        date: new Date(date),
        name: name.trim(),
      },
    });

    return res.status(201).json(holiday);
  } catch (error) {
    console.error("[Office] Failed to create holiday:", error);
    return res.status(500).json({ message: "Failed to create holiday" });
  }
});

// DELETE /api/office/holidays/:id — remove a holiday
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: "Holiday id is required" });
    }

    const holiday = await prisma.holiday.findUnique({ where: { id } });
    if (!holiday) {
      return res.status(404).json({ message: "Holiday not found" });
    }

    await prisma.holiday.delete({ where: { id } });
    return res.status(204).send();
  } catch (error) {
    console.error("[Office] Failed to delete holiday:", error);
    return res.status(500).json({ message: "Failed to delete holiday" });
  }
});

export default router;
