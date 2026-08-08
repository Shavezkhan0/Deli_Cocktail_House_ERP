import { Router } from "express";
import { prisma, TaskStatus } from "@repo/database";

const router: Router = Router();

const VALID_TASK_STATUSES = new Set<string>(Object.values(TaskStatus));

router.get("/tasks", async (req, res) => {
  try {
    const employeeId = req.employee?.id;
    if (!employeeId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const tasks = await prisma.task.findMany({
      where: { assignedTo: employeeId },
      orderBy: { dueDate: "asc" },
    });

    return res.json(tasks);
  } catch (error) {
    console.error("[Employee] Failed to fetch tasks:", error);
    return res.status(500).json({ message: "Failed to fetch tasks" });
  }
});

router.patch("/tasks/:id/status", async (req, res) => {
  try {
    const employeeId = req.employee?.id;
    if (!employeeId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    const { status } = req.body ?? {};

    if (typeof status !== "string" || !VALID_TASK_STATUSES.has(status)) {
      return res.status(400).json({ message: "Invalid task status" });
    }

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (task.assignedTo !== employeeId) {
      return res
        .status(403)
        .json({ message: "You can only update your own tasks" });
    }

    const updated = await prisma.task.update({
      where: { id },
      data: { status: status as TaskStatus },
    });

    return res.json(updated);
  } catch (error) {
    console.error("[Employee] Failed to update task status:", error);
    return res.status(500).json({ message: "Failed to update task status" });
  }
});

export default router;
