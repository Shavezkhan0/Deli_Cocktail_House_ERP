import { Router } from "express";
import { prisma, Prisma, ItemCategory, EventStatus } from "@repo/database";
import { requireAuth } from "../middleware/requireAuth";

const router: Router = Router();

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const EVENT_MOVEMENT_TYPES = ["EVENT_OUT", "EVENT_IN", "EVENT_DAMAGE", "EVENT_LOST"] as const;

router.get("/movements/events", requireAuth, async (req, res) => {
  try {
    const { status } = req.query;

    const validStatuses = ["UPCOMING", "ONGOING", "COMPLETED", "CANCELLED"];
    if (
      status !== undefined &&
      (typeof status !== "string" || !validStatuses.includes(status))
    ) {
      return res.status(400).json({ message: "Invalid status filter" });
    }

    const movements = await prisma.stockMovement.findMany({
      where: { type: { in: [...EVENT_MOVEMENT_TYPES] } },
      select: {
        eventId: true,
      },
      distinct: ["eventId"],
    });

    const eventIds = movements
      .map((m) => m.eventId)
      .filter((id): id is string => Boolean(id));

    if (eventIds.length === 0) {
      return res.json([]);
    }

    const where: Prisma.EventWhereInput = { id: { in: eventIds } };
    if (typeof status === "string") {
      where.status = status as any;
    }

    const eventRows = await prisma.event.findMany({
      where,
      select: {
        id: true,
        eventName: true,
        eventCode: true,
        eventDate: true,
        venue: true,
        status: true,
      },
      orderBy: { eventDate: "desc" },
    });

    return res.json(eventRows);
  } catch (error) {
    console.error("[Warehouse] Failed to fetch event movements:", error);
    return res.status(500).json({ message: "Failed to fetch event movements" });
  }
});

router.get("/movements/events/:eventId", requireAuth, async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, eventName: true, eventCode: true, eventDate: true, venue: true },
    });
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const movements = await prisma.stockMovement.findMany({
      where: { eventId, type: { in: [...EVENT_MOVEMENT_TYPES] } },
      orderBy: { createdAt: "desc" },
      include: {
        item: { select: { sku: true, itemName: true, category: true, unit: true } },
      },
    });

    const adminIds = Array.from(
      new Set(
        movements
          .map((m) => m.createdByAdminId)
          .filter((id): id is string => Boolean(id)),
      ),
    );
    const employeeIds = Array.from(
      new Set(
        movements
          .map((m) => m.createdByEmployeeId)
          .filter((id): id is string => Boolean(id)),
      ),
    );

    const [admins, employees] = await Promise.all([
      adminIds.length > 0
        ? prisma.admin.findMany({
            where: { id: { in: adminIds } },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
      employeeIds.length > 0
        ? prisma.employee.findMany({
            where: { id: { in: employeeIds } },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
    ]);

    const adminMap = new Map(admins.map((a) => [a.id, a.name]));
    const employeeMap = new Map(employees.map((e) => [e.id, e.name]));

    const result = movements.map((m) => ({
      id: m.id,
      itemId: m.itemId,
      type: m.type,
      quantity: m.quantity,
      remark: m.remark,
      createdAt: m.createdAt,
      item: m.item,
      user:
        m.createdByEmployeeId && employeeMap.has(m.createdByEmployeeId)
          ? { id: m.createdByEmployeeId, name: employeeMap.get(m.createdByEmployeeId) }
          : m.createdByAdminId && adminMap.has(m.createdByAdminId)
            ? { id: m.createdByAdminId, name: adminMap.get(m.createdByAdminId) }
            : null,
    }));

    return res.json({ event, movements: result });
  } catch (error) {
    console.error("[Warehouse] Failed to fetch event movement details:", error);
    return res.status(500).json({ message: "Failed to fetch event movement details" });
  }
});

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
          status: { in: [EventStatus.ONGOING] },
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
