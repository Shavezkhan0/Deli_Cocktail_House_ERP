import { Router } from "express";
import { prisma } from "@repo/database";

const router: Router = Router();

router.get("/sales", async (req, res) => {
  try {
    const employeeId = req.employee?.id;
    if (!employeeId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const sales = await prisma.sale.findMany({
      where: { employeeId },
      orderBy: { createdAt: "desc" },
    });

    return res.json(sales);
  } catch (error) {
    console.error("[Employee] Failed to fetch sales:", error);
    return res.status(500).json({ message: "Failed to fetch sales" });
  }
});

router.post("/sales", async (req, res) => {
  try {
    const employeeId = req.employee?.id;
    if (!employeeId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const {
      eventId,
      itemName,
      quantity,
      unitPrice,
      customerName,
      customerPhone,
      notes,
    } = req.body ?? {};

    if (typeof itemName !== "string" || itemName.trim().length === 0) {
      return res.status(400).json({ message: "Item name is required" });
    }
    if (
      typeof quantity !== "number" ||
      !Number.isInteger(quantity) ||
      quantity <= 0
    ) {
      return res
        .status(400)
        .json({ message: "Quantity must be a positive integer" });
    }
    if (
      typeof unitPrice !== "number" ||
      !Number.isFinite(unitPrice) ||
      unitPrice < 0
    ) {
      return res
        .status(400)
        .json({ message: "Unit price must be a non-negative number" });
    }

    const sale = await prisma.sale.create({
      data: {
        employeeId,
        eventId:
          typeof eventId === "string" && eventId.trim() !== ""
            ? eventId.trim()
            : null,
        itemName: itemName.trim(),
        quantity,
        unitPrice,
        amount: Number((quantity * unitPrice).toFixed(2)),
        customerName:
          typeof customerName === "string" && customerName.trim() !== ""
            ? customerName.trim()
            : null,
        customerPhone:
          typeof customerPhone === "string" && customerPhone.trim() !== ""
            ? customerPhone.trim()
            : null,
        notes:
          typeof notes === "string" && notes.trim() !== ""
            ? notes.trim()
            : null,
      },
    });

    return res.status(201).json(sale);
  } catch (error) {
    console.error("[Employee] Failed to create sale:", error);
    return res.status(500).json({ message: "Failed to create sale" });
  }
});

export default router;
