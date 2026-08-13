import { Router } from "express";
import { prisma, Prisma, Role } from "@repo/database";
import { requireAuth } from "../middleware/requireAuth";

const router: Router = Router();

const VALID_ROLES = new Set<string>(Object.values(Role));

router.post("/", requireAuth, async (req, res) => {
  const { name, email, role } = req.body ?? {};

  if (typeof name !== "string" || name.trim().length === 0) {
    return res.status(400).json({ message: "Name is required" });
  }
  if (typeof email !== "string" || email.trim().length === 0) {
    return res.status(400).json({ message: "Email is required" });
  }
  if (
    role !== undefined &&
    (typeof role !== "string" || !VALID_ROLES.has(role))
  ) {
    return res.status(400).json({ message: "A valid role is required" });
  }

  try {
    const user = await prisma.admin.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        ...(role !== undefined ? { role: role as Role } : {}),
      },
    });

    return res.status(201).json(user);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return res.status(409).json({
        message: "A user with this email already exists",
      });
    }
    console.error("[Users] Failed to create user:", error);
    return res.status(500).json({ message: "Failed to create user" });
  }
});

router.get("/", requireAuth, async (_req, res) => {
  try {
    const users = await prisma.admin.findMany({
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
