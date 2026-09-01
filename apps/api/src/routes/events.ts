import { Router } from "express";
import { prisma, Prisma, EventStatus } from "@repo/database";
import { requireAuth } from "../middleware/requireAuth";
import { nextEventCode, createWithSequentialCode } from "../lib/codes";
import { calculateStatus } from "../lib/status";
import {
  isNonEmptyString,
  parseOptionalString,
  toNonNegativeFloat,
  toNonNegativeInt,
} from "../lib/validation";
import { ValidationError, OperationError, isPrismaError } from "../lib/errors";
import {
  DEFAULT_CRM_CHECKLIST,
  parseCrmChecklist,
  toCrmChecklistCreateInput,
  type CrmChecklistItemInput,
} from "../lib/crmChecklist";
import crmChecklistRouter from "./crmChecklist";
import { buildEventChecklistPdf } from "../services/event-checklist-pdf";
import { loadCompanyLogo } from "../lib/company-assets";

const router: Router = Router();

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

type CheckoutInput = {
  itemId: string;
  quantity: number;
};

type EventBodyInput = Omit<Prisma.EventUncheckedCreateInput, "eventCode"> & {
  crmChecklist?: CrmChecklistItemInput[];
};

const eventInclude = {
  inventory: { include: { item: true } },
  returns: { include: { item: true } },
  crmChecklist: { orderBy: { sortOrder: "asc" } },
  crmEmployee: true,
  siteManagerEmp: true,
  siteSupervisorEmp: true,
} satisfies Prisma.EventInclude;

const VALID_EVENT_STATUSES = new Set<string>(Object.values(EventStatus));

const OPEN_EVENT_STATUSES = [EventStatus.ONGOING];

function parseAllocations(
  value: unknown,
): { ok: true; data: AllocationInput[] } | { ok: false; message: string } {
  if (!Array.isArray(value) || value.length === 0) {
    return {
      ok: false,
      message: "Expected a non-empty array of allocation items",
    };
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
    return {
      ok: false,
      message: "Expected a non-empty array of return summary items",
    };
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

function parseCheckoutItems(
  value: unknown,
): { ok: true; data: CheckoutInput[] } | { ok: false; message: string } {
  if (!Array.isArray(value) || value.length === 0) {
    return {
      ok: false,
      message: "Expected a non-empty array of checkout items",
    };
  }

  const data: CheckoutInput[] = [];
  for (const entry of value) {
    const item = entry as Record<string, unknown> | null;
    if (!item || !isNonEmptyString(item.itemId)) {
      return { ok: false, message: "Each checkout item requires an itemId" };
    }

    const quantity = toNonNegativeInt(item.quantity, 0);
    if (quantity === null || quantity < 0) {
      return { ok: false, message: "quantity must be a non-negative integer" };
    }

    data.push({
      itemId: item.itemId.trim(),
      quantity,
    });
  }

  return { ok: true, data };
}

function parseEventBody(body: Record<string, unknown>): EventBodyInput {
  const {
    eventName,
    eventDate,
    startTime,
    endTime,
    venue,
    pax,
    crm,
    siteManager,
    siteSupervisor,
    crmEmployeeId,
    siteManagerId,
    siteSupervisorId,
    butlerVendor,
    status,
    inventoryCost,
    staffCost,
    totalCost,
    crmChecklist,
  } = body;

  if (!isNonEmptyString(eventName)) {
    throw new ValidationError("Event name is required");
  }
  if (typeof eventDate !== "string" || Number.isNaN(Date.parse(eventDate))) {
    throw new ValidationError("A valid event date is required");
  }
  if (!isNonEmptyString(venue)) {
    throw new ValidationError("Venue is required");
  }
  if (typeof pax !== "number" || !Number.isInteger(pax) || pax < 0) {
    throw new ValidationError("A valid pax count is required");
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

  const crmChecklistValue = parseCrmChecklist(crmChecklist);

  return {
    eventName: eventName.trim(),
    eventDate: new Date(eventDate),
    startTime: parseOptionalString(startTime, "Start time"),
    venue: venue.trim(),
    pax,
    crm: parseOptionalString(crm, "CRM"),
    siteManager: parseOptionalString(siteManager, "Site manager"),
    siteSupervisor: parseOptionalString(siteSupervisor, "Site supervisor"),
    crmEmployeeId: parseOptionalString(
      crmEmployeeId,
      "CRM employee",
      "must be a valid employee selection",
    ),
    siteManagerId: parseOptionalString(
      siteManagerId,
      "Site manager employee",
      "must be a valid employee selection",
    ),
    siteSupervisorId: parseOptionalString(
      siteSupervisorId,
      "Site supervisor employee",
      "must be a valid employee selection",
    ),
    inventoryCost: inventoryCostValue,
    staffCost: staffCostValue,
    totalCost: totalCostValue,
    ...(endTime !== undefined
      ? { endTime: parseOptionalString(endTime, "End time") }
      : {}),
    ...(butlerVendor !== undefined
      ? { butlerVendor: parseOptionalString(butlerVendor, "Butler vendor") }
      : {}),
    ...(status !== undefined ? { status: status as EventStatus } : {}),
    ...(crmChecklistValue !== undefined
      ? { crmChecklist: crmChecklistValue }
      : {}),
  };
}

async function validateAssignedEmployees(
  data: EventBodyInput,
): Promise<string | null> {
  const ids = [
    data.crmEmployeeId,
    data.siteManagerId,
    data.siteSupervisorId,
  ].filter((id): id is string => typeof id === "string" && id.length > 0);

  if (ids.length === 0) {
    return null;
  }

  const count = await prisma.employee.count({
    where: { id: { in: ids } },
  });

  if (count !== ids.length) {
    return "One or more assigned employees no longer exist";
  }

  return null;
}

router.use("/:id/crm-checklist", crmChecklistRouter);

router.get("/", requireAuth, async (req, res) => {
  const { filter } = req.query;

  if (
    filter !== undefined &&
    (typeof filter !== "string" || !["open", "all"].includes(filter))
  ) {
    return res.status(400).json({ message: "Invalid filter" });
  }

  try {
    const events = await prisma.event.findMany({
      ...(filter === "open"
        ? {
            where: {
              status: { in: OPEN_EVENT_STATUSES },
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

    const movements = await prisma.stockMovement.findMany({
      where: {
        eventId: event.id,
        type: { in: ["EVENT_OUT", "EVENT_IN", "EVENT_DAMAGE", "EVENT_LOST"] },
      },
      select: { itemId: true, type: true, quantity: true },
    });

    const aggregateMap: Record<
      string,
      { loadedQty: number; returnedQty: number; damageReportedQty: number; lostQty: number }
    > = {};

    for (const m of movements) {
      if (!aggregateMap[m.itemId]) {
        aggregateMap[m.itemId] = {
          loadedQty: 0,
          returnedQty: 0,
          damageReportedQty: 0,
          lostQty: 0,
        };
      }
      const agg = aggregateMap[m.itemId]!;
      if (m.type === "EVENT_OUT") agg.loadedQty += m.quantity;
      else if (m.type === "EVENT_IN") agg.returnedQty += m.quantity;
      else if (m.type === "EVENT_DAMAGE") agg.damageReportedQty += m.quantity;
      else if (m.type === "EVENT_LOST") agg.lostQty += m.quantity;
    }

    const inventory = event.inventory.map((row) => ({
      ...row,
      loadedQty: aggregateMap[row.itemId]?.loadedQty ?? 0,
      returnedQty: aggregateMap[row.itemId]?.returnedQty ?? 0,
      damageReportedQty: aggregateMap[row.itemId]?.damageReportedQty ?? 0,
      lostQty: aggregateMap[row.itemId]?.lostQty ?? 0,
    }));

    const damageReports = await prisma.stockMovement.findMany({
      where: { eventId: event.id, type: { in: ["EVENT_DAMAGE", "EVENT_LOST"] } },
      orderBy: { createdAt: "desc" },
      include: { item: { select: { id: true, sku: true, itemName: true, unit: true } } },
    });

    return res.json({ ...event, inventory, damageReports });
  } catch (error) {
    console.error("[Events] Failed to fetch event:", error);
    return res.status(500).json({ message: "Failed to fetch event" });
  }
});

// GET /:id/checklist-pdf â€” printable warehouse checklist (issue + return)
router.get("/:id/checklist-pdf", requireAuth, async (req, res) => {
  try {
    const id = req.params.id;

    const event = await prisma.event.findUnique({
      where: { id },
      include: eventInclude,
    });
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const movements = await prisma.stockMovement.findMany({
      where: {
        eventId: event.id,
        type: { in: ["EVENT_OUT", "EVENT_IN"] },
      },
      select: { itemId: true, type: true, quantity: true },
    });

    const agg: Record<string, { loaded: number; returned: number }> = {};
    for (const m of movements) {
      if (!agg[m.itemId]) agg[m.itemId] = { loaded: 0, returned: 0 };
      if (m.type === "EVENT_OUT") agg[m.itemId]!.loaded += m.quantity;
      else if (m.type === "EVENT_IN") agg[m.itemId]!.returned += m.quantity;
    }

    const eventDate = new Date(event.eventDate);
    const dateStr = Number.isNaN(eventDate.getTime())
      ? "â€”"
      : `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(
          2,
          "0",
        )}-${String(eventDate.getDate()).padStart(2, "0")}`;

    const company = await prisma.pdfCompanySettings.findFirst({
      orderBy: { createdAt: "asc" },
      select: {
        companyName: true,
        logoUrl: true,
        headerLogoUrl: true,
      },
    });
    const logo = await loadCompanyLogo(
      company?.logoUrl ?? company?.headerLogoUrl,
    );

    const header = {
      title: "Checklist",
      companyName: company?.companyName ?? "Deli Cocktail House",
      eventName: event.eventName,
      eventCode: event.eventCode,
      eventDate: dateStr,
    };

    const rows: {
      itemName: string;
      category: string;
      issued: number;
      returned: number;
      unit: string;
    }[] = [];

    for (const inv of event.inventory) {
      const counts = agg[inv.itemId] ?? { loaded: 0, returned: 0 };
      const issued = counts.loaded || inv.issueQuantity || 0;
      // The Returned column shows the quantity expected back (the issued
      // total) until actual returns are recorded, instead of a bare 0.
      const returned = counts.returned || issued;

      if (issued <= 0 && returned <= 0) continue;

      rows.push({
        itemName: inv.item.itemName,
        category: inv.item.category,
        issued,
        returned,
        unit: inv.item.unit,
      });
    }

    const pdf = await buildEventChecklistPdf(header, rows, logo);
    const baseName = `${event.eventCode}-checklist`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${baseName}.pdf"`,
    );
    res.send(pdf);
  } catch (error) {
    console.error("[Events] Failed to generate checklist PDF:", error);
    return res.status(500).json({ message: "Failed to generate checklist PDF" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  let data: EventBodyInput;
  try {
    data = parseEventBody(req.body ?? {});
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ message: error.message });
    }
    throw error;
  }

  const employeeError = await validateAssignedEmployees(data);
  if (employeeError) {
    return res.status(400).json({ message: employeeError });
  }

  try {
    const { crmChecklist, ...scalarData } = data;
    const checklistItems =
      crmChecklist !== undefined
        ? crmChecklist
        : scalarData.crmEmployeeId
          ? DEFAULT_CRM_CHECKLIST
          : [];

    const event = await createWithSequentialCode(nextEventCode, (eventCode) =>
      prisma.event.create({
        data: {
          ...scalarData,
          eventCode,
          ...(checklistItems.length > 0
            ? {
                crmChecklist: {
                  create: toCrmChecklistCreateInput(checklistItems),
                },
              }
            : {}),
        },
        include: eventInclude,
      }),
    );

    return res.status(201).json(event);
  } catch (error) {
    if (isPrismaError(error, "P2002")) {
      return res
        .status(409)
        .json({ message: "Failed to generate a unique event code" });
    }
    console.error("[Events] Failed to create event:", error);
    return res.status(500).json({ message: "Failed to create event" });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  let data: EventBodyInput;
  try {
    data = parseEventBody(req.body ?? {});
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ message: error.message });
    }
    throw error;
  }

  const employeeError = await validateAssignedEmployees(data);
  if (employeeError) {
    return res.status(400).json({ message: employeeError });
  }

  try {
    const { crmChecklist, ...scalarData } = data;
    const event = await prisma.event.update({
      where: { id: req.params.id },
      data: {
        ...scalarData,
        ...(crmChecklist !== undefined
          ? {
              crmChecklist: {
                deleteMany: {},
                create: toCrmChecklistCreateInput(crmChecklist),
              },
            }
          : {}),
      },
      include: eventInclude,
    });

    return res.json(event);
  } catch (error) {
    if (isPrismaError(error, "P2025")) {
      return res.status(404).json({ message: "Event not found" });
    }
    if (isPrismaError(error, "P2002")) {
      return res
        .status(409)
        .json({ message: "Failed to update the event code" });
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
    if (isPrismaError(error, "P2025")) {
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
    const inventory = await prisma.$transaction(
      async (tx) => {
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
                remarks: allocation.remarks,
              },
            });

        records.push(record);
      }

      return records;
      },
      { timeout: 30000 },
    );

    return res.json({ message: "Allocation completed", inventory });
  } catch (error) {
    if (error instanceof OperationError) {
      return res.status(400).json({ message: error.message });
    }
    console.error("[Events] Failed to allocate inventory:", error);
    return res.status(500).json({ message: "Failed to allocate inventory" });
  }
});

router.post("/:id/checkout", requireAuth, async (req, res) => {
  const id = req.params.id;

  if (typeof id !== "string" || id.trim().length === 0) {
    return res.status(400).json({ message: "A valid event id is required" });
  }

  const parsed = parseCheckoutItems(req.body);
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
    if (event.isIssued) {
      return res
        .status(409)
        .json({ message: "Items have already been issued for this event" });
    }

    const inventory = await prisma.$transaction(
      async (tx) => {
        const records = [];

        for (const entry of parsed.data) {
          const eventInventory = await tx.eventInventory.findFirst({
            where: { eventId: id, itemId: entry.itemId },
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

          const issueQty = entry.quantity;
          if (issueQty <= 0) {
            continue;
          }

          if (issueQty > item.currentStock) {
            throw new OperationError(
              `Insufficient stock for ${item.itemName} (SKU ${item.sku}): requested ${issueQty}, available ${item.currentStock}`,
            );
          }

          const decremented = await tx.item.updateMany({
            where: {
              id: entry.itemId,
              currentStock: { gte: issueQty },
            },
            data: {
              currentStock: { decrement: issueQty },
            },
          });
          if (decremented.count === 0) {
            throw new OperationError(
              `Insufficient stock for ${item.itemName} (SKU ${item.sku}): requested ${issueQty}, available ${item.currentStock}`,
            );
          }

          const updatedItem = await tx.item.findUniqueOrThrow({
            where: { id: entry.itemId },
            select: { currentStock: true, maxLevel: true },
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

          await tx.stockMovement.create({
            data: {
              itemId: entry.itemId,
              eventId: id,
              type: "EVENT_OUT",
              quantity: issueQty,
              remark: "Item issued to event",
              createdByAdminId: req.user?.userId,
            },
          });

          await tx.eventInventory.update({
            where: { id: eventInventory.id },
            data: {
              issueQuantity: issueQty,
            },
          });

          const existingSummary = await tx.eventReturnSummary.findFirst({
            where: { eventId: id, itemId: entry.itemId },
          });

          const summary = existingSummary
            ? await tx.eventReturnSummary.update({
                where: { id: existingSummary.id },
                data: { issuedQuantity: issueQty },
              })
            : await tx.eventReturnSummary.create({
                data: {
                  eventId: id,
                  itemId: entry.itemId,
                  issuedQuantity: issueQty,
                  returnedQuantity: 0,
                  damagedQuantity: 0,
                  lostQuantity: 0,
                  consumedQuantity: 0,
                  remarks: "",
                },
              });

          records.push(summary);
        }

        await tx.event.update({
          where: { id },
          data: { isIssued: true },
        });

        return records;
      },
      { timeout: 30000 },
    );

    return res.json({ message: "Items issued from IMS", inventory });
  } catch (error) {
    if (error instanceof OperationError) {
      return res.status(400).json({ message: error.message });
    }
    console.error("[Events] Failed to checkout items:", error);
    return res.status(500).json({ message: "Failed to checkout items" });
  }
});

router.post("/:id/checkin", requireAuth, async (req, res) => {
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
    if (event.isReturned) {
      return res.status(409).json({
        message: "Items have already been returned to IMS for this event",
      });
    }

    const result = await prisma.$transaction(
      async (tx) => {
        const records = [];

        for (const summary of parsed.data) {
          const eventInventory = await tx.eventInventory.findFirst({
            where: { eventId: id, itemId: summary.itemId },
          });
          if (!eventInventory) {
            throw new OperationError(
              `Item ${summary.itemId} is not allocated to this event`,
            );
          }

          const item = await tx.item.findUnique({
            where: { id: summary.itemId },
          });
          if (!item) {
            throw new OperationError(`Item ${summary.itemId} not found`);
          }

          const adminId = req.user?.userId;

          if (summary.returnedQuantity > 0) {
            await tx.stockMovement.create({
              data: {
                itemId: summary.itemId,
                eventId: id,
                type: "EVENT_IN",
                quantity: summary.returnedQuantity,
                remark: "Item returned to IMS",
                createdByAdminId: adminId,
              },
            });
          }

          if (summary.damagedQuantity > 0) {
            await tx.stockMovement.create({
              data: {
                itemId: summary.itemId,
                eventId: id,
                type: "EVENT_DAMAGE",
                quantity: summary.damagedQuantity,
                remark: summary.remarks || "Item damaged during event",
                createdByAdminId: adminId,
              },
            });
          }

          if (summary.lostQuantity > 0) {
            await tx.stockMovement.create({
              data: {
                itemId: summary.itemId,
                eventId: id,
                type: "EVENT_LOST",
                quantity: summary.lostQuantity,
                remark: summary.remarks || "Item lost during event",
                createdByAdminId: adminId,
              },
            });
          }

          const nextCurrentStock =
            item.currentStock + summary.returnedQuantity;

          await tx.item.update({
            where: { id: summary.itemId },
            data: {
              currentStock: { increment: summary.returnedQuantity },
              status: calculateStatus(nextCurrentStock, item.maxLevel),
            },
          });

          const existingSummary = await tx.eventReturnSummary.findFirst({
            where: { eventId: id, itemId: summary.itemId },
          });

          const record = existingSummary
            ? await tx.eventReturnSummary.update({
                where: { id: existingSummary.id },
                data: {
                  returnedQuantity: summary.returnedQuantity,
                  damagedQuantity: summary.damagedQuantity,
                  lostQuantity: summary.lostQuantity,
                  consumedQuantity: summary.consumedQuantity,
                  remarks: summary.remarks,
                },
              })
            : await tx.eventReturnSummary.create({
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

          records.push(record);
        }

        const updatedEvent = await tx.event.update({
          where: { id },
          data: { isReturned: true },
        });

        return { summaries: records, event: updatedEvent };
      },
      { timeout: 30000 },
    );

    return res.json({ message: "Items returned to IMS", ...result });
  } catch (error) {
    if (error instanceof OperationError) {
      return res.status(400).json({ message: error.message });
    }
    console.error("[Events] Failed to checkin items:", error);
    return res.status(500).json({ message: "Failed to checkin items" });
  }
});

export default router;
