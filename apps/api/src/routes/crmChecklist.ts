import { Router } from "express";
import { prisma } from "@repo/database";
import { requireAuth } from "../middleware/requireAuth";
import { isNonEmptyString } from "../lib/validation";
import { isPrismaError } from "../lib/errors";
import { normalizeCrmSection } from "../lib/crmChecklist";

const router: Router = Router({ mergeParams: true });

router.post("/", requireAuth, async (req, res) => {
  const { label, section } = req.body ?? {};
  if (!isNonEmptyString(label)) {
    return res
      .status(400)
      .json({ message: "CRM checklist item label is required" });
  }

  try {
    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
    });
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
        section: normalizeCrmSection(section),
        sortOrder: count,
      },
    });

    return res.status(201).json(item);
  } catch (error) {
    console.error(
      "[CRM Checklist] Failed to create CRM checklist item:",
      error,
    );
    return res
      .status(500)
      .json({ message: "Failed to create CRM checklist item" });
  }
});

router.patch("/:itemId", requireAuth, async (req, res) => {
  const { label, completed } = req.body ?? {};

  if (label !== undefined && !isNonEmptyString(label)) {
    return res.status(400).json({
      message: "CRM checklist item label must be a non-empty string",
    });
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
    if (isPrismaError(error, "P2025")) {
      return res.status(404).json({ message: "CRM checklist item not found" });
    }
    console.error(
      "[CRM Checklist] Failed to update CRM checklist item:",
      error,
    );
    return res
      .status(500)
      .json({ message: "Failed to update CRM checklist item" });
  }
});

router.delete("/:itemId", requireAuth, async (req, res) => {
  try {
    await prisma.eventCrmChecklistItem.delete({
      where: { id: req.params.itemId },
    });

    return res.status(204).send();
  } catch (error) {
    if (isPrismaError(error, "P2025")) {
      return res.status(404).json({ message: "CRM checklist item not found" });
    }
    console.error(
      "[CRM Checklist] Failed to delete CRM checklist item:",
      error,
    );
    return res
      .status(500)
      .json({ message: "Failed to delete CRM checklist item" });
  }
});

export default router;
