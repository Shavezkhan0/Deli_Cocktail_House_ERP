import { Router } from "express";
import { prisma, Prisma } from "@repo/database";
import { requireAuth } from "../middleware/requireAuth";
import { nextComplainCode, createWithSequentialCode } from "../lib/codes";

const router: Router = Router();

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

router.get("/", requireAuth, async (_req, res) => {
  try {
    const complains = await prisma.complain.findMany({
      orderBy: { createdAt: "desc" },
    });

    return res.json(complains);
  } catch (error) {
    console.error("[Complains] Failed to fetch complains:", error);
    return res.status(500).json({ message: "Failed to fetch complains" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  const { siteManagerName, eventId, description, status } = req.body ?? {};

  if (!isNonEmptyString(siteManagerName)) {
    return res.status(400).json({ message: "Site manager name is required" });
  }
  if (!isNonEmptyString(description)) {
    return res.status(400).json({ message: "Description is required" });
  }
  if (eventId !== undefined && !isNonEmptyString(eventId)) {
    return res.status(400).json({ message: "eventId must be a non-empty string" });
  }
  if (status !== undefined && !isNonEmptyString(status)) {
    return res.status(400).json({ message: "status must be a non-empty string" });
  }

  try {
    const complain = await createWithSequentialCode(
      nextComplainCode,
      (complainId) =>
        prisma.complain.create({
          data: {
            complainId,
            siteManagerName: siteManagerName.trim(),
            eventId: isNonEmptyString(eventId) ? eventId.trim() : null,
            description: description.trim(),
            status: isNonEmptyString(status) ? status.trim() : "OPEN",
          },
        }),
    );

    return res.status(201).json(complain);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return res.status(409).json({ message: "Failed to generate a unique complain id" });
    }
    console.error("[Complains] Failed to create complain:", error);
    return res.status(500).json({ message: "Failed to create complain" });
  }
});

export default router;
