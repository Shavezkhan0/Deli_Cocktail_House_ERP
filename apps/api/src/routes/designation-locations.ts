import { Router } from "express";
import { prisma } from "@repo/database";
import { requireAuth } from "../middleware/requireAuth";

const router: Router = Router();

// GET all designation-location mappings
router.get("/", requireAuth, async (_req, res) => {
  try {
    const locations = await prisma.designationLocation.findMany({
      orderBy: { designation: "asc" },
    });
    return res.json(locations);
  } catch (error) {
    console.error("[DesignationLocations] Failed to fetch:", error);
    return res.status(500).json({ message: "Failed to fetch designation locations" });
  }
});

// GET single designation-location by designation name
router.get("/:designation", requireAuth, async (req, res) => {
  try {
    const loc = await prisma.designationLocation.findUnique({
      where: { designation: req.params.designation },
    });
    if (!loc) {
      return res.status(404).json({ message: "No location set for this designation" });
    }
    return res.json(loc);
  } catch (error) {
    console.error("[DesignationLocations] Failed to fetch by designation:", error);
    return res.status(500).json({ message: "Failed to fetch location" });
  }
});

// POST create or update (upsert) a designation-location mapping
router.post("/", requireAuth, async (req, res) => {
  const { designation, locationName, latitude, longitude, radiusM } = req.body ?? {};
  if (
    typeof designation !== "string" || designation.trim().length === 0 ||
    typeof locationName !== "string" || locationName.trim().length === 0 ||
    typeof latitude !== "number" ||
    typeof longitude !== "number"
  ) {
    return res.status(400).json({
      message: "designation, locationName, latitude, and longitude are required",
    });
  }
  try {
    const loc = await prisma.designationLocation.upsert({
      where: { designation: designation.trim().toUpperCase() },
      update: {
        locationName: locationName.trim(),
        latitude,
        longitude,
        radiusM: radiusM ? Number(radiusM) : 100,
        isActive: true,
      },
      create: {
        designation: designation.trim().toUpperCase(),
        locationName: locationName.trim(),
        latitude,
        longitude,
        radiusM: radiusM ? Number(radiusM) : 100,
      },
    });
    return res.status(201).json(loc);
  } catch (error) {
    console.error("[DesignationLocations] Failed to upsert:", error);
    return res.status(500).json({ message: "Failed to save designation location" });
  }
});

// DELETE a designation-location mapping
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    await prisma.designationLocation.delete({ where: { id: req.params.id } });
    return res.status(204).send();
  } catch (error) {
    console.error("[DesignationLocations] Failed to delete:", error);
    return res.status(500).json({ message: "Failed to delete designation location" });
  }
});

export default router;
