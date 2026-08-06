import { Router } from "express";
import { prisma, Prisma, EventStatus } from "@repo/database";
import { requireAuth } from "../middleware/requireAuth";
import { nextEventCode, createWithSequentialCode } from "../lib/codes";
import { calculateStatus } from "../lib/status";

const router: Router = Router();

const eventInclude = {
  inventory: { include: { item: true } },
  returns: { include: { item: true } },
} satisfies Prisma.EventInclude;

const VALID_EVENT_STATUSES = new Set<string>(Object.values(EventStatus));

class OperationError extends Error {}

class ValidationError extends Error {}

type AllocationInput = {
  itemId: string;
  requiredQuantity: number;
  reserveQuantity: number;
  issueQuantity: number;
  remarks: string;
};

type ReturnSummaryInput = {
  itemId: string;
  issuedQuantity: number;
  returnedQuantity: number;
  damagedQuantity: number;
  lostQuantity: number;
  consumedQuantity: number;
  remarks: string;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function toNonNegativeInt(value: unknown, fallback: number): number | null {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    return null;
  }
  return value;
}

function toNonNegativeFloat(value: unknown, fallback: number): number | null {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return null;
  }
  return value;
}

function parseAllocations(
  value: unknown,
): { ok: true; data: AllocationInput[] } | { ok: false; message: string } {
  if (!Array.isArray(value) || value.length === 0) {
    return { ok: false, message: "Expected a non-empty array of allocation items" };
  }

  const data: AllocationInput[] = [];
  for (const entry of value) {
    const item = entry as Record<string, unknown> | null;
    if (!item || !isNonEmptyString(item.itemId)) {
      return { ok: false, message: "Each allocation requires an itemId" };
    }

    const requiredQuantity = toNonNegativeInt(item.requiredQuantity, 0);
    const reserveQuantity = toNonNegativeInt(item.reserveQuantity, 0);
    const issueQuantity = toNonNegativeInt(item.issueQuantity, 0);

    if (
      requiredQuantity === null ||
      reserveQuantity === null ||
      issueQuantity === null
    ) {
      return { ok: false, message: "Quantities must be non-negative integers" };
    }
    if (item.remarks !== undefined && typeof item.remarks !== "string") {
      return { ok: false, message: "remarks must be a string" };
    }

    data.push({
      itemId: item.itemId.trim(),
      requiredQuantity,
      reserveQuantity,
      issueQuantity,
      remarks: typeof item.remarks === "string" ? item.remarks : "",
    });
  }

  return { ok: true, data };
}

function parseReturnSummaries(
  value: unknown,
): { ok: true; data: ReturnSummaryInput[] } | { ok: false; message: string } {
  if (!Array.isArray(value) || value.length === 0) {
    return { ok: false, message: "Expected a non-empty array of return summary items" };
  }

  const data: ReturnSummaryInput[] = [];
  for (const entry of value) {
    const item = entry as Record<string, unknown> | null;
    if (!item || !isNonEmptyString(item.itemId)) {
      return { ok: false, message: "Each return summary requires an itemId" };
    }

    const issuedQuantity = toNonNegativeInt(item.issuedQuantity, -1);
    const returnedQuantity = toNonNegativeInt(item.returnedQuantity, -1);
    const damagedQuantity = toNonNegativeInt(item.damagedQuantity, -1);
    const lostQuantity = toNonNegativeInt(item.lostQuantity, -1);
    const consumedQuantity = toNonNegativeInt(item.consumedQuantity, -1);

    if (
      issuedQuantity === null ||
      returnedQuantity === null ||
      damagedQuantity === null ||
      lostQuantity === null ||
      consumedQuantity === null ||
      issuedQuantity < 0 ||
      returnedQuantity < 0 ||
      damagedQuantity < 0 ||
      lostQuantity < 0 ||
      consumedQuantity < 0
    ) {
      return { ok: false, message: "Quantities must be non-negative integers" };
    }
    if (item.remarks !== undefined && typeof item.remarks !== "string") {
      return { ok: false, message: "remarks must be a string" };
    }

    data.push({
      itemId: item.itemId.trim(),
      issuedQuantity,
      returnedQuantity,
      damagedQuantity,
      lostQuantity,
      consumedQuantity,
      remarks: typeof item.remarks === "string" ? item.remarks : "",
    });
  }

  return { ok: true, data };
}

function parseEventBody(
  body: Record<string, unknown>,
): Omit<Prisma.EventCreateInput, "eventCode"> {
  const {
    eventName,
    eventDate,
    startTime,
    endTime,
    venue,
    pax,
    eventType,
    company,
    crm,
    siteManager,
    siteSupervisor,
    butlerVendor,
    bartenders,
    maleButler,
    femaleButler,
    clientName,
    clientPhone,
    clientEmail,
    status,
    inventoryCost,
    staffCost,
    totalCost,
  } = body;

  if (!isNonEmptyString(eventName)) {
    throw new ValidationError("Event name is required");
  }
  if (typeof eventDate !== "string" || Number.isNaN(Date.parse(eventDate))) {
    throw new ValidationError("A valid event date is required");
  }
  if (!isNonEmptyString(startTime)) {
    throw new ValidationError("Start time is required");
  }
  if (endTime !== undefined && !isNonEmptyString(endTime)) {
    throw new ValidationError("End time must be a non-empty string");
  }
  if (!isNonEmptyString(venue)) {
    throw new ValidationError("Venue is required");
  }
  if (typeof pax !== "number" || !Number.isInteger(pax) || pax < 0) {
    throw new ValidationError("A valid pax count is required");
  }
  if (!isNonEmptyString(eventType)) {
    throw new ValidationError("Event type is required");
  }
  if (!isNonEmptyString(company)) {
    throw new ValidationError("Company is required");
  }
  if (!isNonEmptyString(crm)) {
    throw new ValidationError("CRM is required");
  }
  if (!isNonEmptyString(siteManager)) {
    throw new ValidationError("Site manager is required");
  }
  if (!isNonEmptyString(siteSupervisor)) {
    throw new ValidationError("Site supervisor is required");
  }
  if (butlerVendor !== undefined && !isNonEmptyString(butlerVendor)) {
    throw new ValidationError("Butler vendor must be a non-empty string");
  }
  if (typeof bartenders !== "number" || !Number.isInteger(bartenders) || bartenders < 0) {
    throw new ValidationError("A valid bartender count is required");
  }
  if (typeof maleButler !== "number" || !Number.isInteger(maleButler) || maleButler < 0) {
    throw new ValidationError("A valid male butler count is required");
  }
  if (typeof femaleButler !== "number" || !Number.isInteger(femaleButler) || femaleButler < 0) {
    throw new ValidationError("A valid female butler count is required");
  }
  if (!isNonEmptyString(clientName)) {
    throw new ValidationError("Client name is required");
  }
  if (!isNonEmptyString(clientPhone)) {
    throw new ValidationError("Client phone is required");
  }
  if (!isNonEmptyString(clientEmail)) {
    throw new ValidationError("Client email is required");
  }
  if (
    status !== undefined &&
    (typeof status !== "string" || !VALID_EVENT_STATUSES.has(status))
  ) {
    throw new ValidationError("Invalid event status");
  }

  const inventoryCostValue = toNonNegativeFloat(inventoryCost, 0);
  const staffCostValue = toNonNegativeFloat(staffCost, 0);
  const totalCostValue = toNonNegativeFloat(totalCost, 0);

  if (
    inventoryCostValue === null ||
    staffCostValue === null ||
    totalCostValue === null
  ) {
    throw new ValidationError("Cost fields must be non-negative numbers");
  }

  return {
    eventName: eventName.trim(),
    eventDate: new Date(eventDate),
    startTime: startTime.trim(),
    venue: venue.trim(),
    pax,
    eventType: eventType.trim(),
    company: company.trim(),
    crm: crm.trim(),
    siteManager: siteManager.trim(),
    siteSupervisor: siteSupervisor.trim(),
    bartenders,
    maleButler,
    femaleButler,
    clientName: clientName.trim(),
    clientPhone: clientPhone.trim(),
    clientEmail: clientEmail.trim(),
    inventoryCost: inventoryCostValue,
    staffCost: staffCostValue,
    totalCost: totalCostValue,
    ...(endTime !== undefined ? { endTime: endTime.trim() } : {}),
    ...(butlerVendor !== undefined ? { butlerVendor: butlerVendor.trim() } : {}),
    ...(status !== undefined ? { status: status as EventStatus } : {}),
  };
}

router.get("/", requireAuth, async (req, res) => {
  const { filter } = req.query;

  if (
    filter !== undefined &&
    (typeof filter !== "string" ||
      !["open", "all"].includes(filter))
  ) {
    return res.status(400).json({ message: "Invalid filter" });
  }

  try {
    const events = await prisma.event.findMany({
      ...(filter === "open"
        ? {
            where: {
              status: { in: [EventStatus.UPCOMING, EventStatus.ONGOING] },
            },
          }
        : {}),
      orderBy: { eventDate: "desc" },
      include: eventInclude,
    });

    return res.json(events);
  } catch (error) {
    console.error("[Events] Failed to fetch events:", error);
    return res.status(500).json({ message: "Failed to fetch events" });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
      include: eventInclude,
    });

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    return res.json(event);
  } catch (error) {
    console.error("[Events] Failed to fetch event:", error);
    return res.status(500).json({ message: "Failed to fetch event" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  let data: Omit<Prisma.EventCreateInput, "eventCode">;
  try {
    data = parseEventBody(req.body ?? {});
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ message: error.message });
    }
    throw error;
  }

  try {
    const event = await createWithSequentialCode(
      nextEventCode,
      (eventCode) =>
        prisma.event.create({
          data: { ...data, eventCode },
          include: eventInclude,
        }),
    );

    return res.status(201).json(event);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return res.status(409).json({ message: "Failed to generate a unique event code" });
    }
    console.error("[Events] Failed to create event:", error);
    return res.status(500).json({ message: "Failed to create event" });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  let data: Omit<Prisma.EventCreateInput, "eventCode">;
  try {
    data = parseEventBody(req.body ?? {});
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ message: error.message });
    }
    throw error;
  }

  try {
    const event = await prisma.event.update({
      where: { id: req.params.id },
      data,
      include: eventInclude,
    });

    return res.json(event);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return res.status(404).json({ message: "Event not found" });
      }
      if (error.code === "P2002") {
        return res.status(409).json({ message: "Failed to update the event code" });
      }
    }
    console.error("[Events] Failed to update event:", error);
    return res.status(500).json({ message: "Failed to update event" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    await prisma.event.delete({
      where: { id: req.params.id },
    });

    return res.status(204).send();
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return res.status(404).json({ message: "Event not found" });
    }
    console.error("[Events] Failed to delete event:", error);
    return res.status(500).json({ message: "Failed to delete event" });
  }
});

router.post("/:id/allocate", requireAuth, async (req, res) => {
  const id = req.params.id;

  if (typeof id !== "string" || id.trim().length === 0) {
    return res.status(400).json({ message: "A valid event id is required" });
  }

  const parsed = parseAllocations(req.body);
  if (!parsed.ok) {
    return res.status(400).json({ message: parsed.message });
  }

  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) {
    return res.status(404).json({ message: "Event not found" });
  }

  try {
    const inventory = await prisma.$transaction(async (tx) => {
      const records = [];

      for (const allocation of parsed.data) {
        const item = await tx.item.findUnique({
          where: { id: allocation.itemId },
        });
        if (!item) {
          throw new OperationError(
            `Item with id ${allocation.itemId} not found`,
          );
        }

        const decremented = await tx.item.updateMany({
          where: {
            id: allocation.itemId,
            availableStock: { gte: allocation.reserveQuantity },
          },
          data: {
            availableStock: { decrement: allocation.reserveQuantity },
          },
        });
        if (decremented.count === 0) {
          throw new OperationError(
            `Insufficient available stock for item ${item.itemName} (SKU ${item.sku})`,
          );
        }

        const updatedItem = await tx.item.findUniqueOrThrow({
          where: { id: allocation.itemId },
        });

        const existing = await tx.eventInventory.findFirst({
          where: { eventId: id, itemId: allocation.itemId },
        });

        const record = existing
          ? await tx.eventInventory.update({
              where: { id: existing.id },
              data: {
                requiredQuantity: allocation.requiredQuantity,
                reserveQuantity: allocation.reserveQuantity,
                issueQuantity: allocation.issueQuantity,
                availableQuantity: updatedItem.availableStock,
                remarks: allocation.remarks,
              },
            })
          : await tx.eventInventory.create({
              data: {
                eventId: id,
                itemId: allocation.itemId,
                requiredQuantity: allocation.requiredQuantity,
                reserveQuantity: allocation.reserveQuantity,
                issueQuantity: allocation.issueQuantity,
                availableQuantity: updatedItem.availableStock,
                remarks: allocation.remarks,
              },
            });

        records.push(record);
      }

      return records;
    });

    return res.json({ message: "Allocation completed", inventory });
  } catch (error) {
    if (error instanceof OperationError) {
      return res.status(400).json({ message: error.message });
    }
    console.error("[Events] Failed to allocate inventory:", error);
    return res.status(500).json({ message: "Failed to allocate inventory" });
  }
});

router.post("/:id/complete", requireAuth, async (req, res) => {
  const id = req.params.id;

  if (typeof id !== "string" || id.trim().length === 0) {
    return res.status(400).json({ message: "A valid event id is required" });
  }

  const parsed = parseReturnSummaries(req.body);
  if (!parsed.ok) {
    return res.status(400).json({ message: parsed.message });
  }

  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) {
    return res.status(404).json({ message: "Event not found" });
  }
  if (event.status === EventStatus.COMPLETED) {
    return res.status(409).json({ message: "Event is already completed" });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const summaries = [];

      for (const summary of parsed.data) {
        const item = await tx.item.findUnique({
          where: { id: summary.itemId },
        });
        if (!item) {
          throw new OperationError(
            `Item with id ${summary.itemId} not found`,
          );
        }

        const deduction =
          summary.lostQuantity + summary.damagedQuantity + summary.consumedQuantity;
        const nextCurrentStock = item.currentStock - deduction;

        await tx.item.update({
          where: { id: summary.itemId },
          data: {
            currentStock: { decrement: deduction },
            availableStock: { increment: summary.returnedQuantity },
            status: calculateStatus(nextCurrentStock, item.openingStock),
          },
        });

        const record = await tx.eventReturnSummary.create({
          data: {
            eventId: id,
            itemId: summary.itemId,
            issuedQuantity: summary.issuedQuantity,
            returnedQuantity: summary.returnedQuantity,
            damagedQuantity: summary.damagedQuantity,
            lostQuantity: summary.lostQuantity,
            consumedQuantity: summary.consumedQuantity,
            remarks: summary.remarks,
          },
        });

        summaries.push(record);
      }

      const updatedEvent = await tx.event.update({
        where: { id },
        data: { status: EventStatus.COMPLETED },
      });

      return { summaries, event: updatedEvent };
    });

    return res.json({ message: "Event completed", ...result });
  } catch (error) {
    if (error instanceof OperationError) {
      return res.status(400).json({ message: error.message });
    }
    console.error("[Events] Failed to complete event:", error);
    return res.status(500).json({ message: "Failed to complete event" });
  }
});

export default router;
