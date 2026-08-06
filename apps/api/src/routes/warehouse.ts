import { Router } from "express";
import { prisma, ItemCategory, EventStatus } from "@repo/database";
import { requireAuth } from "../middleware/requireAuth";

const router: Router = Router();

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

router.get("/lost-items", requireAuth, async (_req, res) => {
  try {
    const lostItems = await prisma.eventReturnSummary.findMany({
      where: { lostQuantity: { gt: 0 } },
      include: { item: true, event: true },
    });

    return res.json(lostItems);
  } catch (error) {
    console.error("[Warehouse] Failed to fetch lost items:", error);
    return res.status(500).json({ message: "Failed to fetch lost items" });
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
      prisma.complain.count(),
    ]);

    return res.json({
      totalItems,
      totalEvents,
      expiringItems,
      lowStockItems,
      actionNeededItems,
      openEvents,
      totalLostItems: lostItemsAggregate._sum.lostQuantity ?? 0,
      totalComplains,
    });
  } catch (error) {
    console.error("[Warehouse] Failed to fetch dashboard:", error);
    return res.status(500).json({ message: "Failed to fetch dashboard" });
  }
});

export default router;
