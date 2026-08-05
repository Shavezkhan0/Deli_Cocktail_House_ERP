import { Router } from "express";
import { prisma, EventStatus, ItemStatus } from "@repo/database";
import { requireAuth } from "../middleware/requireAuth";

const router: Router = Router();

const managerSelect = { id: true, name: true, email: true, role: true };

const eventInclude = {
  items: true,
  warehouseManager: { select: managerSelect },
  siteManager: { select: managerSelect },
} as const;

const VALID_EVENT_STATUSES = new Set<string>(Object.values(EventStatus));
const VALID_ITEM_STATUSES = new Set<string>(Object.values(ItemStatus));

router.post("/", requireAuth, async (req, res) => {
  const { name, clientName, date, status, warehouseManagerId, siteManagerId, items } =
    req.body ?? {};

  if (typeof name !== "string" || name.trim().length === 0) {
    return res.status(400).json({ message: "Name is required" });
  }
  if (typeof clientName !== "string" || clientName.trim().length === 0) {
    return res.status(400).json({ message: "Client name is required" });
  }
  if (typeof date !== "string" || Number.isNaN(Date.parse(date))) {
    return res.status(400).json({ message: "A valid date is required" });
  }
  if (status !== undefined && (typeof status !== "string" || !VALID_EVENT_STATUSES.has(status))) {
    return res.status(400).json({ message: "Invalid event status" });
  }
  if (warehouseManagerId !== undefined && typeof warehouseManagerId !== "string") {
    return res.status(400).json({ message: "warehouseManagerId must be a string" });
  }
  if (siteManagerId !== undefined && typeof siteManagerId !== "string") {
    return res.status(400).json({ message: "siteManagerId must be a string" });
  }

  if (items !== undefined && !Array.isArray(items)) {
    return res.status(400).json({ message: "items must be an array" });
  }

  const itemsPayload = (items ?? []) as Array<{
    itemName?: unknown;
    requestedQty?: unknown;
    approvedQty?: unknown;
    status?: unknown;
  }>;

  for (const item of itemsPayload) {
    if (typeof item?.itemName !== "string" || item.itemName.trim().length === 0) {
      return res.status(400).json({ message: "Each item requires an itemName" });
    }
    if (
      typeof item.requestedQty !== "number" ||
      !Number.isInteger(item.requestedQty) ||
      item.requestedQty < 0
    ) {
      return res.status(400).json({ message: "Each item requires a valid requestedQty" });
    }
    if (
      item.approvedQty !== undefined &&
      (typeof item.approvedQty !== "number" ||
        !Number.isInteger(item.approvedQty) ||
        item.approvedQty < 0)
    ) {
      return res.status(400).json({ message: "Each item requires a valid approvedQty" });
    }
    if (item.status !== undefined && (typeof item.status !== "string" || !VALID_ITEM_STATUSES.has(item.status))) {
      return res.status(400).json({ message: "Invalid item status" });
    }
  }

  const itemCreateData = itemsPayload.map((item) => ({
    itemName: (item.itemName as string).trim(),
    requestedQty: item.requestedQty as number,
    ...(item.approvedQty !== undefined ? { approvedQty: item.approvedQty as number } : {}),
    ...(item.status !== undefined ? { status: item.status as ItemStatus } : {}),
  }));

  try {
    const event = await prisma.event.create({
      data: {
        name: name.trim(),
        clientName: clientName.trim(),
        date: new Date(date),
        ...(status !== undefined ? { status: status as EventStatus } : {}),
        ...(typeof warehouseManagerId === "string" ? { warehouseManagerId } : {}),
        ...(typeof siteManagerId === "string" ? { siteManagerId } : {}),
        ...(itemCreateData.length > 0 ? { items: { create: itemCreateData } } : {}),
      },
      include: eventInclude,
    });

    return res.status(201).json(event);
  } catch (error) {
    console.error("[Events] Failed to create event:", error);
    return res.status(500).json({ message: "Failed to create event" });
  }
});

router.get("/", requireAuth, async (_req, res) => {
  try {
    const events = await prisma.event.findMany({
      orderBy: { date: "asc" },
      include: eventInclude,
    });

    return res.json(events);
  } catch (error) {
    console.error("[Events] Failed to fetch events:", error);
    return res.status(500).json({ message: "Failed to fetch events" });
  }
});

export default router;
