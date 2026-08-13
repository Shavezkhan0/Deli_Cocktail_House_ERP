import { Router } from "express";
import { prisma } from "@repo/database";
import { requireAuth } from "../middleware/requireAuth";

const router: Router = Router();

router.get("/", requireAuth, async (_req, res) => {
  const locations = await prisma.attendanceLocation.findMany({
    orderBy: { name: "asc" },
  });
  return res.json(locations);
});

router.post("/", requireAuth, async (req, res) => {
  const { name, latitude, longitude, radiusM } = req.body ?? {};
  if (!name || typeof latitude !== "number" || typeof longitude !== "number") {
    return res
      .status(400)
      .json({ message: "name, latitude and longitude are required" });
  }
  const loc = await prisma.attendanceLocation.create({
    data: {
      name: String(name).trim(),
      latitude,
      longitude,
      radiusM: radiusM ?? 100,
    },
  });
  return res.status(201).json(loc);
});

router.put("/:id", requireAuth, async (req, res) => {
  const loc = await prisma.attendanceLocation.update({
    where: { id: req.params.id },
    data: req.body,
  });
  return res.json(loc);
});

router.delete("/:id", requireAuth, async (req, res) => {
  await prisma.attendanceLocation.delete({ where: { id: req.params.id } });
  return res.status(204).send();
});

export default router;
