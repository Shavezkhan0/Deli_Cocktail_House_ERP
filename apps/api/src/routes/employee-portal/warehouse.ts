import { Router } from "express";
import { prisma, Prisma, EventStatus } from "@repo/database";
import { calculateStatus } from "../../lib/status";
import { isNonEmptyString, toNonNegativeInt } from "../../lib/validation";
import { OperationError } from "../../lib/errors";

const router: Router = Router();

const eventInclude = {
  inventory: { include: { item: true } },
} satisfies Prisma.EventInclude;

router.get("/events", async (_req, res) => {
  try {
    const events = await prisma.event.findMany({
      where: { status: { not: EventStatus.CANCELLED } },
      orderBy: { eventDate: "desc" },
      include: eventInclude,
    });

    return res.json(events);
  } catch (error) {
    console.error("[Warehouse] Failed to fetch events:", error);
    return res.status(500).json({ message: "Failed to fetch events" });
  }
});

router.get("/events/:eventId", async (req, res) => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: req.params.eventId },
      include: eventInclude,
    });

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const movements = await prisma.stockMovement.findMany({
      where: {
        eventId: event.id,
        type: { in: ["EVENT_OUT", "EVENT_IN", "EVENT_DAMAGE"] },
      },
      select: { itemId: true, type: true, quantity: true },
    });

    const aggregateMap: Record<
      string,
      { loadedQty: number; returnedQty: number; damageReportedQty: number }
    > = {};

    for (const m of movements) {
      if (!aggregateMap[m.itemId]) {
        aggregateMap[m.itemId] = {
          loadedQty: 0,
          returnedQty: 0,
          damageReportedQty: 0,
        };
      }
      const agg = aggregateMap[m.itemId]!;
      if (m.type === "EVENT_OUT") agg.loadedQty += m.quantity;
      else if (m.type === "EVENT_IN") agg.returnedQty += m.quantity;
      else if (m.type === "EVENT_DAMAGE") agg.damageReportedQty += m.quantity;
    }

    const inventory = event.inventory.map((row) => ({
      id: row.id,
      itemId: row.itemId,
      itemName: row.item.itemName,
      sku: row.item.sku,
      category: row.item.category,
      unit: row.item.unit,
      requiredQuantity: row.requiredQuantity,
      issueQuantity: row.issueQuantity,
      loadedQty: aggregateMap[row.itemId]?.loadedQty ?? 0,
      returnedQty: aggregateMap[row.itemId]?.returnedQty ?? 0,
      damageReportedQty: aggregateMap[row.itemId]?.damageReportedQty ?? 0,
    }));

    return res.json({ ...event, inventory });
  } catch (error) {
    console.error("[Warehouse] Failed to fetch event:", error);
    return res.status(500).json({ message: "Failed to fetch event" });
  }
});

function parseItems(
  body: unknown,
  remarkRequired: false,
): { ok: true; data: { itemId: string; quantity: number; remark: string }[] } | { ok: false; message: string };
function parseItems(
  body: unknown,
  remarkRequired: true,
): { ok: true; data: { itemId: string; quantity: number; remark: string }[] } | { ok: false; message: string };
function parseItems(
  body: unknown,
  remarkRequired: boolean,
): { ok: true; data: { itemId: string; quantity: number; remark: string }[] } | { ok: false; message: string } {
  const items = (body as Record<string, unknown> | null)?.items;

  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, message: "items must be a non-empty array" };
  }

  const data: { itemId: string; quantity: number; remark: string }[] = [];

  for (const entry of items) {
    const item = entry as Record<string, unknown> | null;
    if (!item || !isNonEmptyString(item.itemId)) {
      return { ok: false, message: "Each item requires an itemId" };
    }

    const quantity = toNonNegativeInt(item.quantity, 0);
    if (quantity === null || quantity < 1) {
      return { ok: false, message: "quantity must be a positive integer" };
    }

    if (remarkRequired) {
      if (!isNonEmptyString(item.remark)) {
        return { ok: false, message: "remark is required for damage reports" };
      }
      data.push({
        itemId: item.itemId.trim(),
        quantity,
        remark: String(item.remark).trim(),
      });
    } else {
      data.push({
        itemId: item.itemId.trim(),
        quantity,
        remark:
          typeof item.remark === "string" ? item.remark.trim() : "",
      });
    }
  }

  return { ok: true, data };
}

router.post("/events/:eventId/out", async (req, res) => {
  const { eventId } = req.params;

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    return res.status(404).json({ message: "Event not found" });
  }

  const parsed = parseItems(req.body, false);
  if (!parsed.ok) {
    return res.status(400).json({ message: parsed.message });
  }

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const movements = [];

        for (const entry of parsed.data) {
          const eventInventory = await tx.eventInventory.findFirst({
            where: { eventId, itemId: entry.itemId },
          });
          if (!eventInventory) {
            throw new OperationError(
              `Item ${entry.itemId} is not allocated to this event`,
            );
          }

          const item = await tx.item.findUnique({
            where: { id: entry.itemId },
          });
          if (!item) {
            throw new OperationError(`Item ${entry.itemId} not found`);
          }

          const decremented = await tx.item.updateMany({
            where: {
              id: entry.itemId,
              currentStock: { gte: entry.quantity },
            },
            data: {
              currentStock: { decrement: entry.quantity },
            },
          });
          if (decremented.count === 0) {
            throw new OperationError(
              `Insufficient stock for item ${item.itemName} (SKU ${item.sku}): requested ${entry.quantity}, available ${item.currentStock}`,
            );
          }

          const updatedItem = await tx.item.findUniqueOrThrow({
            where: { id: entry.itemId },
          });

          await tx.item.update({
            where: { id: entry.itemId },
            data: {
              status: calculateStatus(
                updatedItem.currentStock,
                updatedItem.maxLevel,
              ),
            },
          });

          const movement = await tx.stockMovement.create({
            data: {
              itemId: entry.itemId,
              eventId,
              type: "EVENT_OUT",
              quantity: entry.quantity,
              remark: entry.remark || null,
              createdByEmployeeId: req.employee!.id,
            },
          });

          movements.push(movement);
        }

        return movements;
      },
      { timeout: 30000 },
    );

    return res.json({ message: "Items dispatched", movements: result });
  } catch (error) {
    if (error instanceof OperationError) {
      return res.status(400).json({ message: error.message });
    }
    console.error("[Warehouse] Failed to dispatch items:", error);
    return res.status(500).json({ message: "Failed to dispatch items" });
  }
});

router.post("/events/:eventId/in", async (req, res) => {
  const { eventId } = req.params;

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    return res.status(404).json({ message: "Event not found" });
  }

  const parsed = parseItems(req.body, false);
  if (!parsed.ok) {
    return res.status(400).json({ message: parsed.message });
  }

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const movements = [];

        for (const entry of parsed.data) {
          const eventInventory = await tx.eventInventory.findFirst({
            where: { eventId, itemId: entry.itemId },
          });
          if (!eventInventory) {
            throw new OperationError(
              `Item ${entry.itemId} is not allocated to this event`,
            );
          }

          const item = await tx.item.findUnique({
            where: { id: entry.itemId },
          });
          if (!item) {
            throw new OperationError(`Item ${entry.itemId} not found`);
          }

          await tx.item.update({
            where: { id: entry.itemId },
            data: {
              currentStock: { increment: entry.quantity },
              availableStock: { increment: entry.quantity },
            },
          });

          const updatedItem = await tx.item.findUniqueOrThrow({
            where: { id: entry.itemId },
          });

          await tx.item.update({
            where: { id: entry.itemId },
            data: {
              status: calculateStatus(
                updatedItem.currentStock,
                updatedItem.maxLevel,
              ),
            },
          });

          const movement = await tx.stockMovement.create({
            data: {
              itemId: entry.itemId,
              eventId,
              type: "EVENT_IN",
              quantity: entry.quantity,
              remark: entry.remark || null,
              createdByEmployeeId: req.employee!.id,
            },
          });

          movements.push(movement);
        }

        return movements;
      },
      { timeout: 30000 },
    );

    return res.json({ message: "Items returned", movements: result });
  } catch (error) {
    if (error instanceof OperationError) {
      return res.status(400).json({ message: error.message });
    }
    console.error("[Warehouse] Failed to return items:", error);
    return res.status(500).json({ message: "Failed to return items" });
  }
});

router.post("/events/:eventId/damage", async (req, res) => {
  const { eventId } = req.params;

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    return res.status(404).json({ message: "Event not found" });
  }

  const parsed = parseItems(req.body, true);
  if (!parsed.ok) {
    return res.status(400).json({ message: parsed.message });
  }

  try {
    const movements = await prisma.$transaction(
      async (tx) => {
        const results = [];

        for (const entry of parsed.data) {
          const eventInventory = await tx.eventInventory.findFirst({
            where: { eventId, itemId: entry.itemId },
          });
          if (!eventInventory) {
            throw new OperationError(
              `Item ${entry.itemId} is not allocated to this event`,
            );
          }

          const item = await tx.item.findUnique({
            where: { id: entry.itemId },
          });
          if (!item) {
            throw new OperationError(`Item ${entry.itemId} not found`);
          }

          const movement = await tx.stockMovement.create({
            data: {
              itemId: entry.itemId,
              eventId,
              type: "EVENT_DAMAGE",
              quantity: entry.quantity,
              remark: entry.remark,
              createdByEmployeeId: req.employee!.id,
            },
          });

          results.push(movement);
        }

        return results;
      },
      { timeout: 30000 },
    );

    return res.json({ message: "Damage reported", movements });
  } catch (error) {
    if (error instanceof OperationError) {
      return res.status(400).json({ message: error.message });
    }
    console.error("[Warehouse] Failed to report damage:", error);
    return res.status(500).json({ message: "Failed to report damage" });
  }
});

export default router;
