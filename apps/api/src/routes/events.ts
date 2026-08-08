import { Router } from "express";
import { prisma, Prisma, EventStatus } from "@repo/database";
import { requireAuth } from "../middleware/requireAuth";
import { nextEventCode, createWithSequentialCode } from "../lib/codes";
import { calculateStatus } from "../lib/status";

const router: Router = Router();

const eventInclude = {
  inventory: { include: { item: true } },
  returns: { include: { item: true } },
  crmChecklist: { orderBy: { sortOrder: "asc" } },
  crmEmployee: true,
  siteManagerEmp: true,
  siteSupervisorEmp: true,
} satisfies Prisma.EventInclude;

const VALID_EVENT_STATUSES = new Set<string>(Object.values(EventStatus));

const DEFAULT_CRM_CHECKLIST: { section: string; label: string }[] = [
  { section: "Checklist Start", label: "Client & WhatsApp Group" },
  { section: "Checklist Start", label: "UPLOAD DETAILS ON WHATSAPP GROUP" },
  { section: "Checklist Start", label: "PC WILL ASSIGN CRM ON THE PROJECT" },
  { section: "Checklist Start", label: "CREATE THE CLIENT WHATSAPP GROUP USING THE CORRECT FORMAT" },
  { section: "Checklist Start", label: "ADD ALL RELEVANT TEAM MEMBERS TO THE GROUP (DIRECTORS, PROCESS COORDINATOR, SITE MANAGER, CRM HEAD, CRM)" },
  { section: "Checklist Start", label: "SEND THE WELCOME MESSAGE TO THE CLIENT AND INTRODUCE YOURSELF WITH SITE MANAGER" },
  { section: "Checklist Start", label: "CREATE CRM SHEET WITH EXISTING DETAILS" },
  { section: "Liquor & Alcohol Requirements", label: "HAVE YOU DISCUSSED LIQUOR LIST AND ITS BRANDS WITH CLIENT?" },
  { section: "Liquor & Alcohol Requirements", label: "IS ALCOHOL ALIGNED WITH EXPERIENTIAL STATIONS?" },
  { section: "Liquor & Alcohol Requirements", label: "IS THERE ANY JAPANESE ALCOHOL TO BE ADDED TO THE ALCOHOL LIST IF THE CLIENT HAS A JAPANESE BAR?" },
  { section: "Liquor & Alcohol Requirements", label: "SEND LIQUOR LIST TO CLIENT" },
  { section: "Liquor & Alcohol Requirements", label: "IS THERE ANY OTHER ALCOHOL SPECIFICALLY REQUIRED FOR ANY EXPERIENTIAL STATION AS PER THE CONTRACT / AS PER THE PDF?" },
  { section: "Liquor & Alcohol Requirements", label: "SEND REQUIRED DETAILS MESSAGE IN THE GROUP (LIKE - THEME, VENUE, START TIME, BAR SIZE)" },
  { section: "Liquor & Alcohol Requirements", label: "IF BEVERAGES AND GLASSWARE ARE PROVIDED BY THE HOTEL, YOU NEED TO SEND THEM THE REQUIREMENTS" },
  { section: "Liquor & Alcohol Requirements", label: "IF BEVERAGE BY DCH - CHECK THIS" },
  { section: "Liquor & Alcohol Requirements", label: "IF GLASSWARE BY DCH - CHECK THIS" },
  { section: "Bar Requirements", label: "CONFIRM WITH THE SITE MANAGER OR CLIENT ABOUT THE DRINKING CROWD SIZE, AND BASED ON THAT, SEND THE BAR REQUIREMENTS TO THE CLIENT OR PLANNER" },
  { section: "Bar Requirements", label: "CONFIRM WITH THE SITE MANAGER IF THE BAR SIZE IS OKAY AS PER HIM. TAKE A WRITTEN CONFIRMATION ON WHATSAPP FROM HIM" },
  { section: "Bar Requirements", label: "SEND TABLE REQUIREMENTS TO CLIENT (TO KEEP BAR ITEMS)" },
  { section: "Bar Requirements", label: "DID YOU CONFIRM THE BAR SET-UP TIMINGS WITH THE CLIENT?" },
  { section: "Cocktail & Mocktail Menu", label: "SEND THE DCH MASTER MENU FOR COCKTAILS SELECTION ON WHATSAPP GROUP" },
  { section: "Cocktail & Mocktail Menu", label: "GET THE COCKTAILS & MOCKTAILS CONFIRMED FROM THE CLIENT" },
  { section: "Cocktail & Mocktail Menu", label: "CLIENT APPROVED THE FINAL NUMBER OF DRINKS? (MAXIMUM 6 IN 1 MENU)" },
  { section: "Cocktail & Mocktail Menu", label: "CONFIRM COUPLE INITIALS, WEDDING HASHTAGS / COMPANY NAME TO BE INCLUDED IN THE MENU" },
  { section: "Cocktail & Mocktail Menu", label: "ASK IF THERE'S ANY THEME / LOGO THEY'D LIKE TO INCLUDE IN THE MENU" },
  { section: "Cocktail & Mocktail Menu", label: "ASK IF THE CLIENT LIKES CUSTOM-NAMED COCKTAILS OR GENERIC COCKTAIL NAMES" },
  { section: "Menu Information & Design", label: "DID YOU RECEIVE COMPLETE INFORMATION FROM THE CLIENT?" },
  { section: "Menu Information & Design", label: "SEND FINAL COMPLETE INFORMATION OF MENU TO THE DESIGNER USING FMS" },
  { section: "Menu Information & Design", label: "ARE MENUS BEING SENT ON WHATSAPP FOR PREPARATION?" },
  { section: "Menu Information & Design", label: "HAS THE FIRST DRAFT OF THE MENU BEEN SHARED TO THE CLIENT?" },
  { section: "Menu Information & Design", label: "CLIENT SHARED FEEDBACK OR EDITS, MENU EDITS BEEN MADE?" },
  { section: "Menu Information & Design", label: "CLIENT APPROVED THE FINAL MENU?" },
  { section: "Menu Information & Design", label: "HAVE YOU VERIFIED THE MENU TO CHECK IF THERE ARE ANY GRAMMATICAL MISTAKES?" },
  { section: "Menu Information & Design", label: "HAVE YOU SHARED THE FINAL MENU TO VENDOR WITH DEADLINE?" },
  { section: "Menu Information & Design", label: "HAVE YOU CONFIRMED WHERE THE MENU WILL BE DELIVERED AFTER IT IS PRINTED?" },
  { section: "Menu Information & Design", label: "ARE MENUS PRINTED AND READY FOR DISPATCH 1 DAY BEFORE THE EVENT?" },
  { section: "Menu Information & Design", label: "REQUEST BRIDE & GROOM FOR A SHORT STORY / JOKES ABOUT THEMSELVES IF THEY WANT NAMES ON THE MENU." },
  { section: "Client Follow-up", label: "SEND A GENTLE REMINDER TO THE CLIENT WITH UPDATED CRM SHEET" },
  { section: "Client Follow-up", label: "DIRECTOR TO PERSONALLY MESSAGE CLIENT TO CHECK IF ALL COORDINATION IS GOING SMOOTHLY, MENU AND DESIGNS APPROVED, AND THEY ARE HAPPY WITH PROGRESS" },
  { section: "Purchasing", label: "ONE DAY BEFORE THE EVENT YOU NEED TO SHARE POF WITH SITE MANAGER" },
  { section: "Purchasing", label: "ALL PURCHASING DONE?" },
  { section: "Purchasing", label: "IF BARAAT YES - THEN PURCHASING DONE?" },
  { section: "MOM / Minutes of Meeting", label: "CREATE CRM - MOM (MINUTES OF MEETING)" },
  { section: "MOM / Minutes of Meeting", label: "UPDATE MOM IN GROUP 1 DAY BEFORE THE EVENT" },
  { section: "MOM / Minutes of Meeting", label: "DID YOU VERIFY FROM THE GODOWN MANAGER WHETHER THE MOM GIVEN DETAILS ARE AVAILABLE AT THE GODOWN OR NOT?" },
  { section: "MOM / Minutes of Meeting", label: "DID YOU INFORM THE PURCHASE DEPARTMENT IF THE ITEM WAS NOT AVAILABLE?" },
  { section: "Final Event Preparation", label: "HAVE YOU SHARED THE PDF TO SITE MANAGER 1 DAY BEFORE THE EVENT?" },
  { section: "Final Event Preparation", label: "IF THE EVENT IS OUTSIDE DELHI THEN SHARE E-WAY BILL DETAILS IN GROUP" },
  { section: "Final Event Preparation", label: "SEND MOM + POF + MENU (ONE DAY BEFORE EVENT)" },
  { section: "Final Event Preparation", label: "CRM ENSURE MENU AND ALL REACHED TO SITE" },
];

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
): Omit<Prisma.EventUncheckedCreateInput, "eventCode"> & {
  crmChecklist?: { section: string; label: string }[];
} {
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
    crmEmployeeId,
    siteManagerId,
    siteSupervisorId,
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
    crmChecklist,
  } = body;

  if (!isNonEmptyString(eventName)) {
    throw new ValidationError("Event name is required");
  }
  if (typeof eventDate !== "string" || Number.isNaN(Date.parse(eventDate))) {
    throw new ValidationError("A valid event date is required");
  }
  if (startTime !== undefined && startTime !== null && startTime !== "" && !isNonEmptyString(startTime)) {
    throw new ValidationError("Start time must be a valid string");
  }
  if (endTime !== undefined && endTime !== null && endTime !== "" && !isNonEmptyString(endTime)) {
    throw new ValidationError("End time must be a valid string");
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
  if (crm !== undefined && crm !== null && crm !== "" && !isNonEmptyString(crm)) {
    throw new ValidationError("CRM must be a valid string");
  }
  if (siteManager !== undefined && siteManager !== null && siteManager !== "" && !isNonEmptyString(siteManager)) {
    throw new ValidationError("Site manager must be a valid string");
  }
  if (siteSupervisor !== undefined && siteSupervisor !== null && siteSupervisor !== "" && !isNonEmptyString(siteSupervisor)) {
    throw new ValidationError("Site supervisor must be a valid string");
  }
  if (butlerVendor !== undefined && butlerVendor !== null && butlerVendor !== "" && !isNonEmptyString(butlerVendor)) {
    throw new ValidationError("Butler vendor must be a valid string");
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
  if (clientEmail !== undefined && clientEmail !== null && clientEmail !== "" && !isNonEmptyString(clientEmail)) {
    throw new ValidationError("Client email must be a valid string");
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

  const parseOptionalId = (value: unknown, label: string): string | null => {
    if (value === undefined || value === null || value === "") {
      return null;
    }
    if (typeof value !== "string") {
      throw new ValidationError(`${label} must be a valid employee selection`);
    }
    return value.trim();
  };

  let crmChecklistValue: { section: string; label: string }[] | undefined;
  if (crmChecklist !== undefined) {
    if (
      !Array.isArray(crmChecklist) ||
      !crmChecklist.every(
        (entry) =>
          typeof entry === "object" &&
          entry !== null &&
          typeof (entry as { section?: unknown }).section === "string" &&
          typeof (entry as { label?: unknown }).label === "string",
      )
    ) {
      throw new ValidationError(
        "CRM checklist must be an array of items with a section and label",
      );
    }
    crmChecklistValue = (crmChecklist as { section: string; label: string }[])
      .map((entry) => ({
        section: entry.section.trim() || "General",
        label: entry.label.trim(),
      }))
      .filter((entry) => entry.label.length > 0);
  }

  return {
    eventName: eventName.trim(),
    eventDate: new Date(eventDate),
    startTime: startTime?.trim() || null,
    venue: venue.trim(),
    pax,
    eventType: eventType.trim(),
    company: company.trim(),
    crm: crm?.trim() || null,
    siteManager: siteManager?.trim() || null,
    siteSupervisor: siteSupervisor?.trim() || null,
    crmEmployeeId: parseOptionalId(crmEmployeeId, "CRM employee"),
    siteManagerId: parseOptionalId(siteManagerId, "Site manager employee"),
    siteSupervisorId: parseOptionalId(siteSupervisorId, "Site supervisor employee"),
    bartenders,
    maleButler,
    femaleButler,
    clientName: clientName.trim(),
    clientPhone: clientPhone.trim(),
    clientEmail: clientEmail?.trim() || null,
    inventoryCost: inventoryCostValue,
    staffCost: staffCostValue,
    totalCost: totalCostValue,
    ...(endTime !== undefined ? { endTime: endTime.trim() || null } : {}),
    ...(butlerVendor !== undefined ? { butlerVendor: butlerVendor.trim() || null } : {}),
    ...(status !== undefined ? { status: status as EventStatus } : {}),
    ...(crmChecklistValue !== undefined
      ? { crmChecklist: crmChecklistValue }
      : {}),
  };
}

async function validateAssignedEmployees(
  data: Omit<Prisma.EventUncheckedCreateInput, "eventCode"> & {
    crmChecklist?: { section: string; label: string }[];
  },
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
  let data: Omit<Prisma.EventUncheckedCreateInput, "eventCode"> & {
    crmChecklist?: { section: string; label: string }[];
  };
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
    const event = await createWithSequentialCode(
      nextEventCode,
      (eventCode) =>
        prisma.event.create({
          data: {
            ...scalarData,
            eventCode,
            ...(checklistItems.length > 0
              ? {
                  crmChecklist: {
                    create: checklistItems.map((item, index) => ({
                      label: item.label,
                      section: item.section,
                      sortOrder: index,
                    })),
                  },
                }
              : {}),
          },
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
  let data: Omit<Prisma.EventUncheckedCreateInput, "eventCode"> & {
    crmChecklist?: { section: string; label: string }[];
  };
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
                create: crmChecklist.map((item, index) => ({
                  label: item.label,
                  section: item.section,
                  sortOrder: index,
                })),
              },
            }
          : {}),
      },
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

router.post("/:id/crm-checklist", requireAuth, async (req, res) => {
  const { label, section } = req.body ?? {};
  if (!isNonEmptyString(label)) {
    return res.status(400).json({ message: "CRM checklist item label is required" });
  }

  try {
    const event = await prisma.event.findUnique({ where: { id: req.params.id } });
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const count = await prisma.eventCrmChecklistItem.count({
      where: { eventId: event.id },
    });

    const item = await prisma.eventCrmChecklistItem.create({
      data: {
        eventId: event.id,
        label: label.trim(),
        section:
          typeof section === "string" && section.trim().length > 0
            ? section.trim()
            : "General",
        sortOrder: count,
      },
    });

    return res.status(201).json(item);
  } catch (error) {
    console.error("[Events] Failed to create CRM checklist item:", error);
    return res.status(500).json({ message: "Failed to create CRM checklist item" });
  }
});

router.patch("/:id/crm-checklist/:itemId", requireAuth, async (req, res) => {
  const { label, completed } = req.body ?? {};

  if (label !== undefined && !isNonEmptyString(label)) {
    return res.status(400).json({ message: "CRM checklist item label must be a non-empty string" });
  }
  if (completed !== undefined && typeof completed !== "boolean") {
    return res.status(400).json({ message: "completed must be a boolean" });
  }

  try {
    const item = await prisma.eventCrmChecklistItem.update({
      where: { id: req.params.itemId },
      data: {
        ...(label !== undefined ? { label: label.trim() } : {}),
        ...(completed !== undefined ? { completed } : {}),
      },
    });

    return res.json(item);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return res.status(404).json({ message: "CRM checklist item not found" });
    }
    console.error("[Events] Failed to update CRM checklist item:", error);
    return res.status(500).json({ message: "Failed to update CRM checklist item" });
  }
});

router.delete("/:id/crm-checklist/:itemId", requireAuth, async (req, res) => {
  try {
    await prisma.eventCrmChecklistItem.delete({
      where: { id: req.params.itemId },
    });

    return res.status(204).send();
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return res.status(404).json({ message: "CRM checklist item not found" });
    }
    console.error("[Events] Failed to delete CRM checklist item:", error);
    return res.status(500).json({ message: "Failed to delete CRM checklist item" });
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
