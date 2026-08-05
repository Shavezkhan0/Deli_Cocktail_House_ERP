import { Router } from "express";
import { prisma } from "@repo/database";
import { requireAuth } from "../middleware/requireAuth";

const router: Router = Router();

router.get("/", requireAuth, async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, role: true },
    });

    return res.json(users);
  } catch (error) {
    console.error("[Users] Failed to fetch users:", error);
    return res.status(500).json({ message: "Failed to fetch users" });
  }
});

export default router;
