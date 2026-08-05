import { Router } from "express";
import { prisma, Prisma } from "@repo/database";
import { requireAuth } from "../middleware/requireAuth";

const router: Router = Router();

const QUANTITY_FIELDS = [
  "totalQuantity",
  "availableQuantity",
  "reservedQuantity",
  "dispatchedQuantity",
  "damagedQuantity",
  "lostQuantity",
  "minStockLevel",
] as const;

function toNonNegativeInt(value: unknown, fallback: number): number | null {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    return null;
  }
  return value;
}

router.get("/inventory", requireAuth, async (_req, res) => {
  try {
    const items = await prisma.inventoryItem.findMany({
      orderBy: { name: "asc" },
    });

    return res.json(items);
  } catch (error) {
    console.error("[Warehouse] Failed to fetch inventory:", error);
    return res.status(500).json({ message: "Failed to fetch inventory" });
  }
});

router.get("/inventory/low-stock", requireAuth, async (_req, res) => {
  try {
    const items = await prisma.inventoryItem.findMany({
      where: {
        availableQuantity: { lte: prisma.inventoryItem.fields.minStockLevel },
      },
      orderBy: { name: "asc" },
    });

    return res.json(items);
  } catch (error) {
    console.error("[Warehouse] Failed to fetch low-stock items:", error);
    return res.status(500).json({ message: "Failed to fetch low-stock items" });
  }
});

router.post("/inventory", requireAuth, async (req, res) => {
  const { name, category } = req.body ?? {};

  if (typeof name !== "string" || name.trim().length === 0) {
    return res.status(400).json({ message: "Name is required" });
  }
  if (typeof category !== "string" || category.trim().length === 0) {
    return res.status(400).json({ message: "Category is required" });
  }

  const totalQuantity = toNonNegativeInt(req.body?.totalQuantity, 0);
  const availableQuantity = toNonNegativeInt(
    req.body?.availableQuantity,
    totalQuantity ?? 0,
  );
  const reservedQuantity = toNonNegativeInt(req.body?.reservedQuantity, 0);
  const dispatchedQuantity = toNonNegativeInt(req.body?.dispatchedQuantity, 0);
  const damagedQuantity = toNonNegativeInt(req.body?.damagedQuantity, 0);
  const lostQuantity = toNonNegativeInt(req.body?.lostQuantity, 0);
  const minStockLevel = toNonNegativeInt(req.body?.minStockLevel, 0);

  if (
    totalQuantity === null ||
    availableQuantity === null ||
    reservedQuantity === null ||
    dispatchedQuantity === null ||
    damagedQuantity === null ||
    lostQuantity === null ||
    minStockLevel === null
  ) {
    return res
      .status(400)
      .json({ message: "Quantity fields must be non-negative integers" });
  }

  try {
    const item = await prisma.inventoryItem.create({
      data: {
        name: name.trim(),
        category: category.trim(),
        totalQuantity,
        availableQuantity,
        reservedQuantity,
        dispatchedQuantity,
        damagedQuantity,
        lostQuantity,
        minStockLevel,
      },
    });

    return res.status(201).json(item);
  } catch (error) {
    console.error("[Warehouse] Failed to create inventory item:", error);
    return res.status(500).json({ message: "Failed to create inventory item" });
  }
});

router.patch("/inventory/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const body = req.body ?? {};

  const data: Record<string, string | number> = {};

  if (body.name !== undefined) {
    if (typeof body.name !== "string" || body.name.trim().length === 0) {
      return res.status(400).json({ message: "Name must be a non-empty string" });
    }
    data.name = body.name.trim();
  }

  if (body.category !== undefined) {
    if (typeof body.category !== "string" || body.category.trim().length === 0) {
      return res.status(400).json({ message: "Category must be a non-empty string" });
    }
    data.category = body.category.trim();
  }

  for (const key of QUANTITY_FIELDS) {
    if (body[key] !== undefined) {
      const value = toNonNegativeInt(body[key], 0);
      if (value === null) {
        return res
          .status(400)
          .json({ message: "Quantity fields must be non-negative integers" });
      }
      data[key] = value;
    }
  }

  if (Object.keys(data).length === 0) {
    return res.status(400).json({ message: "Nothing to update" });
  }

  try {
    const item = await prisma.inventoryItem.update({
      where: { id },
      data,
    });

    return res.json(item);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return res.status(404).json({ message: "Inventory item not found" });
    }
    console.error("[Warehouse] Failed to update inventory item:", error);
    return res.status(500).json({ message: "Failed to update inventory item" });
  }
});

export default router;
