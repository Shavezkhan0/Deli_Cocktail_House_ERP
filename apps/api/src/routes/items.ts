import { Router } from "express";
import { prisma, Prisma, ItemCategory, ItemUnit } from "@repo/database";
import { requireAuth } from "../middleware/requireAuth";
import { calculateStatus } from "../lib/status";
import { nextItemSku, createWithSequentialCode } from "../lib/codes";
import { toNonNegativeInt } from "../lib/validation";

const router: Router = Router();

const VALID_CATEGORIES = new Set<string>(Object.values(ItemCategory));
const VALID_UNITS = new Set<string>(Object.values(ItemUnit));

const EXPIRY_CATEGORIES: readonly ItemCategory[] = [
  ItemCategory.CONSUMABLE,
  ItemCategory.SYRUP,
  ItemCategory.BEVERAGE,
];

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

router.get("/", requireAuth, async (req, res) => {
  const { category, filter } = req.query;

  if (
    category !== undefined &&
    (typeof category !== "string" || !VALID_CATEGORIES.has(category))
  ) {
    return res.status(400).json({ message: "Invalid category filter" });
  }

  if (
    filter !== undefined &&
    (typeof filter !== "string" ||
      !["expiring", "low-stock", "actions-needed"].includes(filter))
  ) {
    return res.status(400).json({ message: "Invalid filter" });
  }

  try {
    const now = new Date();
    const inThirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const where: Prisma.ItemWhereInput = {};

    if (typeof category === "string") {
      where.category = category as ItemCategory;
    }

    if (typeof filter === "string") {
      const expiringCondition = {
        category: ItemCategory.CONSUMABLE,
        expiryDate: { gte: now, lte: inThirtyDays },
      };

      if (filter === "expiring") {
        Object.assign(where, expiringCondition);
      } else if (filter === "low-stock") {
        where.status = "Low";
      } else if (filter === "actions-needed") {
        where.status = "Action Required";
      }
    }

    const items = await prisma.item.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return res.json(items);
  } catch (error) {
    console.error("[Items] Failed to fetch items:", error);
    return res.status(500).json({ message: "Failed to fetch items" });
  }
});

router.get("/stock-movements", requireAuth, async (req, res) => {
  const { type } = req.query;

  const validTypes = [
    "EVENT_OUT",
    "EVENT_IN",
    "EVENT_DAMAGE",
    "ADMIN_INCREASE",
    "ADMIN_DECREASE",
  ] as const;

  if (type !== undefined) {
    if (typeof type !== "string" || !validTypes.includes(type as any)) {
      return res.status(400).json({ message: "Invalid type filter" });
    }
  }

  try {
    const where: Prisma.StockMovementWhereInput = {};
    if (typeof type === "string") {
      where.type = type as any;
    }

    const movements = await prisma.stockMovement.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        item: { select: { sku: true, itemName: true, category: true } },
        event: { select: { eventName: true } },
      },
    });

    return res.json(movements);
  } catch (error) {
    console.error("[Items] Failed to fetch stock movements:", error);
    return res.status(500).json({ message: "Failed to fetch stock movements" });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const item = await prisma.item.findUnique({
      where: { id: req.params.id },
    });

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    return res.json(item);
  } catch (error) {
    console.error("[Items] Failed to fetch item:", error);
    return res.status(500).json({ message: "Failed to fetch item" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  const {
    sku,
    itemName,
    category,
    subCategory,
    brand,
    vendor,
    unit,
    openingStock,
    maxLevel,
    expiryDate,
  } = req.body ?? {};

  if (!isNonEmptyString(itemName)) {
    return res.status(400).json({ message: "Item name is required" });
  }
  if (typeof category !== "string" || !VALID_CATEGORIES.has(category)) {
    return res.status(400).json({ message: "A valid category is required" });
  }
  if (typeof unit !== "string" || !VALID_UNITS.has(unit)) {
    return res.status(400).json({ message: "A valid unit is required" });
  }

  const openingStockValue = toNonNegativeInt(openingStock, -1);
  if (openingStockValue === null || openingStockValue < 0) {
    return res.status(400).json({
      message: "Opening stock must be a non-negative integer",
    });
  }

  const maxLevelValue = toNonNegativeInt(maxLevel, -1);
  if (maxLevelValue === null || maxLevelValue < 0) {
    return res.status(400).json({
      message: "Max level must be a non-negative integer",
    });
  }

  if (sku !== undefined && !isNonEmptyString(sku)) {
    return res
      .status(400)
      .json({ message: "SKU must be a non-empty string when provided" });
  }

  if (
    expiryDate !== undefined &&
    (typeof expiryDate !== "string" || Number.isNaN(Date.parse(expiryDate)))
  ) {
    return res.status(400).json({ message: "A valid expiry date is required" });
  }

  const hasExpiry = EXPIRY_CATEGORIES.includes(category as ItemCategory);
  const autoGenerated = !isNonEmptyString(sku);
  const resolvedSku = autoGenerated ? null : sku.trim();

  const buildData = (finalSku: string): Prisma.ItemCreateInput => ({
    sku: finalSku,
    itemName: itemName.trim(),
    category: category as ItemCategory,
    unit: unit as ItemUnit,
    openingStock: openingStockValue,
    currentStock: openingStockValue,
    ...(maxLevelValue !== null ? { maxLevel: maxLevelValue } : {}),
    status: calculateStatus(openingStockValue, maxLevelValue),
    ...(isNonEmptyString(subCategory) ? { subCategory: subCategory.trim() } : {}),
    ...(isNonEmptyString(brand) ? { brand: brand.trim() } : {}),
    ...(isNonEmptyString(vendor) ? { vendor: vendor.trim() } : {}),
    ...(hasExpiry && typeof expiryDate === "string"
      ? { expiryDate: new Date(expiryDate) }
      : {}),
  });

  try {
    const item = autoGenerated
      ? await createWithSequentialCode(nextItemSku, (finalSku) =>
          prisma.item.create({ data: buildData(finalSku) }),
        )
      : await prisma.item.create({ data: buildData(resolvedSku!) });

    return res.status(201).json(item);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return res.status(409).json({ message: "An item with this SKU already exists" });
    }
    console.error("[Items] Failed to create item:", error);
    return res.status(500).json({ message: "Failed to create item" });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const body = req.body ?? {};

  if (typeof id !== "string" || id.trim().length === 0) {
    return res.status(400).json({ message: "A valid item id is required" });
  }

  const existing = await prisma.item.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ message: "Item not found" });
  }

  const data: Prisma.ItemUpdateInput = {};

  if (body.sku !== undefined) {
    if (!isNonEmptyString(body.sku)) {
      return res.status(400).json({ message: "SKU must be a non-empty string" });
    }
    data.sku = body.sku.trim();
  }

  if (body.itemName !== undefined) {
    if (!isNonEmptyString(body.itemName)) {
      return res.status(400).json({ message: "Item name must be a non-empty string" });
    }
    data.itemName = body.itemName.trim();
  }

  if (body.category !== undefined) {
    if (typeof body.category !== "string" || !VALID_CATEGORIES.has(body.category)) {
      return res.status(400).json({ message: "Invalid category" });
    }
    data.category = body.category as ItemCategory;
  }

  if (body.unit !== undefined) {
    if (typeof body.unit !== "string" || !VALID_UNITS.has(body.unit)) {
      return res.status(400).json({ message: "Invalid unit" });
    }
    data.unit = body.unit as ItemUnit;
  }

  for (const field of ["openingStock", "currentStock", "maxLevel"] as const) {
    if (body[field] !== undefined) {
      const value = toNonNegativeInt(body[field], -1);
      if (value === null || value < 0) {
        return res
          .status(400)
          .json({ message: "Stock fields must be non-negative integers" });
      }
      data[field] = value;
    }
  }

  for (const field of ["subCategory", "brand", "vendor"] as const) {
    if (body[field] !== undefined) {
      if (typeof body[field] !== "string") {
        return res.status(400).json({ message: `${field} must be a string` });
      }
      data[field] = body[field] as string;
    }
  }

  if (body.expiryDate !== undefined) {
    if (typeof body.expiryDate !== "string" || Number.isNaN(Date.parse(body.expiryDate))) {
      return res.status(400).json({ message: "A valid expiry date is required" });
    }
    data.expiryDate = new Date(body.expiryDate);
  }

  if (Object.keys(data).length === 0) {
    return res.status(400).json({ message: "Nothing to update" });
  }

  const nextCurrentStock =
    body.currentStock !== undefined
      ? (data.currentStock as number)
      : existing.currentStock;
  const nextMaxLevel =
    body.maxLevel !== undefined
      ? (data.maxLevel as number | null)
      : existing.maxLevel;
  data.status = calculateStatus(nextCurrentStock, nextMaxLevel);

  try {
    const item = await prisma.item.update({
      where: { id },
      data,
    });

    return res.json(item);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return res.status(404).json({ message: "Item not found" });
      }
      if (error.code === "P2002") {
        return res.status(409).json({ message: "An item with this SKU already exists" });
      }
    }
    console.error("[Items] Failed to update item:", error);
    return res.status(500).json({ message: "Failed to update item" });
  }
});

router.post("/:id/stock-adjustments", requireAuth, async (req, res) => {
  const { id } = req.params;
  const { type, quantity, remark } = req.body ?? {};

  if (typeof id !== "string" || id.trim().length === 0) {
    return res.status(400).json({ message: "A valid item id is required" });
  }

  if (type !== "INCREASE" && type !== "DECREASE") {
    return res
      .status(400)
      .json({ message: "Type must be INCREASE or DECREASE" });
  }

  const quantityValue = toNonNegativeInt(quantity, -1);
  if (quantityValue === null || quantityValue < 1) {
    return res
      .status(400)
      .json({ message: "Quantity must be a positive integer" });
  }

  if (remark !== undefined && typeof remark !== "string") {
    return res.status(400).json({ message: "Remark must be a string" });
  }

  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const adminId = req.user.userId;

  const existing = await prisma.item.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ message: "Item not found" });
  }

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        if (type === "DECREASE") {
          const decremented = await tx.item.updateMany({
            where: { id, currentStock: { gte: quantityValue } },
            data: { currentStock: { decrement: quantityValue } },
          });
          if (decremented.count === 0) {
            throw new Error("INSUFFICIENT_STOCK");
          }
        }

        const updatedItem = type === "INCREASE"
          ? await tx.item.update({
              where: { id },
              data: {
                currentStock: { increment: quantityValue },
              },
            })
          : await tx.item.update({ where: { id }, data: {} });

        const newStatus = calculateStatus(
          updatedItem.currentStock,
          updatedItem.maxLevel,
        );
        const finalItem = await tx.item.update({
          where: { id },
          data: { status: newStatus },
        });

        await tx.stockMovement.create({
          data: {
            itemId: id,
            type: type === "INCREASE" ? "ADMIN_INCREASE" : "ADMIN_DECREASE",
            quantity: quantityValue,
            remark: remark?.trim() || null,
            createdByAdminId: adminId,
          },
        });

        return finalItem;
      },
      { timeout: 30000 },
    );

    return res.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "INSUFFICIENT_STOCK") {
      return res.status(400).json({ message: "Insufficient stock" });
    }
    console.error("[Items] Failed to adjust stock:", error);
    return res.status(500).json({ message: "Failed to adjust stock" });
  }
});

router.get("/:id/stock-movements", requireAuth, async (req, res) => {
  const { id } = req.params;

  if (typeof id !== "string" || id.trim().length === 0) {
    return res.status(400).json({ message: "A valid item id is required" });
  }

  try {
    const existing = await prisma.item.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: "Item not found" });
    }

    const movements = await prisma.stockMovement.findMany({
      where: { itemId: id },
      orderBy: { createdAt: "desc" },
    });

    return res.json(movements);
  } catch (error) {
    console.error("[Items] Failed to fetch stock movements:", error);
    return res.status(500).json({ message: "Failed to fetch stock movements" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    await prisma.item.delete({
      where: { id: req.params.id },
    });

    return res.status(204).send();
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return res.status(404).json({ message: "Item not found" });
    }
    console.error("[Items] Failed to delete item:", error);
    return res.status(500).json({ message: "Failed to delete item" });
  }
});

export default router;
