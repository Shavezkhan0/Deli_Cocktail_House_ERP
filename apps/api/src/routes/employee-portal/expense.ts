import { Router } from "express";
import { prisma } from "@repo/database";

const router: Router = Router();

router.get("/expenses", async (req, res) => {
  try {
    const employeeId = req.employee?.id;
    if (!employeeId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const expenses = await prisma.expenseEntry.findMany({
      where: { submittedBy: employeeId },
      orderBy: { createdAt: "desc" },
    });

    return res.json(expenses);
  } catch (error) {
    console.error("[Employee] Failed to fetch expenses:", error);
    return res.status(500).json({ message: "Failed to fetch expenses" });
  }
});

router.post("/expenses", async (req, res) => {
  try {
    const employeeId = req.employee?.id;
    if (!employeeId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { eventId, amount, description, receiptUrl } = req.body ?? {};

    if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0) {
      return res
        .status(400)
        .json({ message: "Amount must be a non-negative number" });
    }
    if (
      typeof description !== "string" ||
      description.trim().length === 0
    ) {
      return res.status(400).json({ message: "Description is required" });
    }

    const expense = await prisma.expenseEntry.create({
      data: {
        submittedBy: employeeId,
        eventId: typeof eventId === "string" && eventId.trim() !== "" ? eventId.trim() : null,
        amount,
        description: description.trim(),
        receiptUrl:
          typeof receiptUrl === "string" && receiptUrl.trim() !== ""
            ? receiptUrl.trim()
            : null,
        status: "PENDING",
      },
    });

    return res.status(201).json(expense);
  } catch (error) {
    console.error("[Employee] Failed to create expense:", error);
    return res.status(500).json({ message: "Failed to create expense" });
  }
});

export default router;
