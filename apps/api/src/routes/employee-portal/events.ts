import { Router } from "express";
import { prisma, Prisma, EventStatus } from "@repo/database";

const router: Router = Router();

const eventInclude = {
  inventory: { include: { item: true } },
  returns: { include: { item: true } },
} satisfies Prisma.EventInclude;

const VALID_EVENT_STATUSES = new Set<string>(Object.values(EventStatus));

router.get("/events", async (req, res) => {
  try {
    const { status } = req.query;

    let where: Record<string, unknown> = {};

    if (
      status !== undefined &&
      (typeof status !== "string" || !VALID_EVENT_STATUSES.has(status))
    ) {
      return res.status(400).json({ message: "Invalid event status" });
    }

    if (typeof status === "string") {
      where = { status: status as EventStatus };
    }

    const events = await prisma.event.findMany({
      where,
      orderBy: { eventDate: "desc" },
      include: eventInclude,
    });

    return res.json(events);
  } catch (error) {
    console.error("[Employee] Failed to fetch events:", error);
    return res.status(500).json({ message: "Failed to fetch events" });
  }
});

router.get("/events/:id", async (req, res) => {
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
    console.error("[Employee] Failed to fetch event:", error);
    return res.status(500).json({ message: "Failed to fetch event" });
  }
});

export default router;
