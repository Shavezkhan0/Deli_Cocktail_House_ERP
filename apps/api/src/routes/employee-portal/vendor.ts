import { Router } from "express";
import { prisma } from "@repo/database";

const router: Router = Router();

router.get("/vendors", async (req, res) => {
  try {
    const employeeId = req.employee?.id;
    if (!employeeId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const vendors = await prisma.vendorContact.findMany({
      where: { addedBy: employeeId },
      orderBy: { createdAt: "desc" },
    });

    return res.json(vendors);
  } catch (error) {
    console.error("[Employee] Failed to fetch vendors:", error);
    return res.status(500).json({ message: "Failed to fetch vendors" });
  }
});

router.post("/vendors", async (req, res) => {
  try {
    const employeeId = req.employee?.id;
    if (!employeeId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { name, phone, category, eventId, notes } = req.body ?? {};

    if (typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ message: "Name is required" });
    }
    if (typeof phone !== "string" || phone.trim().length === 0) {
      return res.status(400).json({ message: "Phone is required" });
    }
    if (typeof category !== "string" || category.trim().length === 0) {
      return res.status(400).json({ message: "Category is required" });
    }

    const vendor = await prisma.vendorContact.create({
      data: {
        addedBy: employeeId,
        name: name.trim(),
        phone: phone.trim(),
        category: category.trim(),
        eventId:
          typeof eventId === "string" && eventId.trim() !== ""
            ? eventId.trim()
            : null,
        notes:
          typeof notes === "string" && notes.trim() !== ""
            ? notes.trim()
            : null,
      },
    });

    return res.status(201).json(vendor);
  } catch (error) {
    console.error("[Employee] Failed to create vendor:", error);
    return res.status(500).json({ message: "Failed to create vendor" });
  }
});

export default router;
