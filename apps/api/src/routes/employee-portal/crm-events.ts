import { Router } from "express";
import { prisma, Prisma } from "@repo/database";

const router: Router = Router();

const eventInclude = {
  inventory: { include: { item: true } },
  returns: { include: { item: true } },
  crmChecklist: { orderBy: { sortOrder: "asc" } },
  crmEmployee: true,
  siteManagerEmp: true,
  siteSupervisorEmp: true,
} satisfies Prisma.EventInclude;

router.get("/crm/events", async (req, res) => {
  try {
    const employee = req.employee;
    if (!employee) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const events = await prisma.event.findMany({
      orderBy: { eventDate: "desc" },
      include: eventInclude,
    });

    const filtered = events.filter((event) => event.crmEmployeeId === employee.id);

    return res.json(filtered);
  } catch (error) {
    console.error("[Employee] Failed to fetch CRM events:", error);
    return res.status(500).json({ message: "Failed to fetch CRM events" });
  }
});

router.get("/crm/events/:id", async (req, res) => {
  try {
    const employee = req.employee;
    if (!employee) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
      include: eventInclude,
    });

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (event.crmEmployeeId !== employee.id) {
      return res.status(403).json({ message: "You do not have access to this event" });
    }

    return res.json(event);
  } catch (error) {
    console.error("[Employee] Failed to fetch CRM event:", error);
    return res.status(500).json({ message: "Failed to fetch CRM event" });
  }
});

router.patch("/crm/events/:id/crm-checklist/:itemId", async (req, res) => {
  try {
    const employee = req.employee;
    if (!employee) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { completed } = req.body ?? {};
    if (typeof completed !== "boolean") {
      return res.status(400).json({ message: "completed must be a boolean" });
    }

    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
    });

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (event.crmEmployeeId !== employee.id) {
      return res.status(403).json({ message: "You do not have access to this event" });
    }

    const item = await prisma.eventCrmChecklistItem.update({
      where: { id: req.params.itemId },
      data: { completed },
    });

    return res.json(item);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return res.status(404).json({ message: "CRM checklist item not found" });
    }
    console.error("[Employee] Failed to update CRM checklist item:", error);
    return res.status(500).json({ message: "Failed to update CRM checklist item" });
  }
});

router.post("/crm/events/:id/crm-checklist", async (req, res) => {
  try {
    const employee = req.employee;
    if (!employee) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { label, section } = req.body ?? {};
    if (typeof label !== "string" || label.trim().length === 0) {
      return res.status(400).json({ message: "Label is required" });
    }

    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
    });

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (event.crmEmployeeId !== employee.id) {
      return res.status(403).json({ message: "You do not have access to this event" });
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
    console.error("[Employee] Failed to add CRM checklist item:", error);
    return res.status(500).json({ message: "Failed to add CRM checklist item" });
  }
});

export default router;
