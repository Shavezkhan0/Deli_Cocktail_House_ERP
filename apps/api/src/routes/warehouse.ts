import { Router } from "express";
import { prisma, ItemCategory, EventStatus } from "@repo/database";
import { requireAuth } from "../middleware/requireAuth";

const router: Router = Router();

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

router.get("/lost-items", requireAuth, async (_req, res) => {
  try {
    const [returnSummaryLost, stockMovementLost] = await Promise.all([
      prisma.eventReturnSummary.findMany({
        where: { lostQuantity: { gt: 0 } },
        include: { item: true, event: true },
      }),
      prisma.stockMovement.findMany({
        where: { type: "EVENT_LOST" },
        include: { item: true, event: true },
      }),
    ]);

    const fromReturnSummary = returnSummaryLost.map((r) => ({
      id: r.id,
      lostQuantity: r.lostQuantity,
      item: { itemName: r.item.itemName },
      event: { eventName: r.event.eventName },
    }));

    const fromStockMovement = stockMovementLost.map((m) => ({
      id: m.id,
      lostQuantity: m.quantity,
      item: { itemName: m.item.itemName },
      event: { eventName: m.event?.eventName ?? "—" },
    }));

    return res.json([...fromReturnSummary, ...fromStockMovement]);
  } catch (error) {
    console.error("[Warehouse] Failed to fetch lost items:", error);
    return res.status(500).json({ message: "Failed to fetch lost items" });
  }
});

router.get("/damaged-items", requireAuth, async (_req, res) => {
  try {
    const damagedItems = await prisma.stockMovement.findMany({
      where: { type: "EVENT_DAMAGE" },
      include: { item: true, event: true },
    });

    const result = damagedItems.map((m) => ({
      id: m.id,
      quantity: m.quantity,
      remark: m.remark,
      item: { itemName: m.item.itemName },
      event: { eventName: m.event?.eventName ?? "—" },
    }));

    return res.json(result);
  } catch (error) {
    console.error("[Warehouse] Failed to fetch damaged items:", error);
    return res.status(500).json({ message: "Failed to fetch damaged items" });
  }
});

router.get("/dashboard", requireAuth, async (_req, res) => {
  try {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + THIRTY_DAYS_MS);

    const [
      totalItems,
      totalEvents,
      expiringItems,
      lowStockItems,
      actionNeededItems,
      openEvents,
      lostItemsAggregate,
      lostMovementsAggregate,
      damagedItemsAggregate,
      totalComplains,
    ] = await Promise.all([
      prisma.item.count(),
      prisma.event.count(),
      prisma.item.count({
        where: {
          category: ItemCategory.CONSUMABLE,
          expiryDate: { gte: now, lte: thirtyDaysFromNow },
        },
      }),
      prisma.item.count({
        where: {
          status: "Low",
        },
      }),
      prisma.item.count({
        where: {
          status: "Action Required",
        },
      }),
      prisma.event.count({
        where: {
          status: { in: [EventStatus.UPCOMING, EventStatus.ONGOING] },
        },
      }),
      prisma.eventReturnSummary.aggregate({
        _sum: { lostQuantity: true },
      }),
      prisma.stockMovement.aggregate({
        where: { type: "EVENT_LOST" },
        _sum: { quantity: true },
      }),
      prisma.stockMovement.aggregate({
        where: { type: "EVENT_DAMAGE" },
        _sum: { quantity: true },
      }),
      prisma.complain.count(),
    ]);

    return res.json({
      totalItems,
      totalEvents,
      expiringItems,
      lowStockItems,
      actionNeededItems,
      openEvents,
      totalLostItems:
        (lostItemsAggregate._sum.lostQuantity ?? 0) +
        (lostMovementsAggregate._sum.quantity ?? 0),
      totalDamagedItems: damagedItemsAggregate._sum.quantity ?? 0,
      totalComplains,
    });
  } catch (error) {
    console.error("[Warehouse] Failed to fetch dashboard:", error);
    return res.status(500).json({ message: "Failed to fetch dashboard" });
  }
});

export default router;
