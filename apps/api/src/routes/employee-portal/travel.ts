import { Router } from "express";
import { prisma } from "@repo/database";

const router: Router = Router();

router.get("/travel", async (req, res) => {
  try {
    const employeeId = req.employee?.id;
    if (!employeeId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const travelRecords = await prisma.travelDetail.findMany({
      where: { employeeId },
      orderBy: { travelDate: "desc" },
    });

    return res.json(travelRecords);
  } catch (error) {
    console.error("[Employee] Failed to fetch travel records:", error);
    return res.status(500).json({ message: "Failed to fetch travel records" });
  }
});

router.post("/travel", async (req, res) => {
  try {
    const employeeId = req.employee?.id;
    if (!employeeId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { eventId, from, to, travelDate, mode, amount } = req.body ?? {};

    if (typeof from !== "string" || from.trim().length === 0) {
      return res.status(400).json({ message: "From is required" });
    }
    if (typeof to !== "string" || to.trim().length === 0) {
      return res.status(400).json({ message: "To is required" });
    }
    if (typeof mode !== "string" || mode.trim().length === 0) {
      return res.status(400).json({ message: "Mode is required" });
    }
    if (typeof travelDate !== "string" || Number.isNaN(Date.parse(travelDate))) {
      return res.status(400).json({ message: "A valid travel date is required" });
    }
    if (amount !== undefined && (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0)) {
      return res
        .status(400)
        .json({ message: "Amount must be a non-negative number" });
    }

    const travel = await prisma.travelDetail.create({
      data: {
        employeeId,
        eventId:
          typeof eventId === "string" && eventId.trim() !== ""
            ? eventId.trim()
            : null,
        from: from.trim(),
        to: to.trim(),
        travelDate: new Date(travelDate),
        mode: mode.trim(),
        amount:
          typeof amount === "number" && Number.isFinite(amount) ? amount : null,
      },
    });

    return res.status(201).json(travel);
  } catch (error) {
    console.error("[Employee] Failed to create travel record:", error);
    return res.status(500).json({ message: "Failed to create travel record" });
  }
});

export default router;
