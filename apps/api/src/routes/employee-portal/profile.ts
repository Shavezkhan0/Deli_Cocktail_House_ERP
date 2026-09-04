import { Router } from "express";
import { prisma } from "@repo/database";

const router: Router = Router();

router.get("/profile", async (req, res) => {
  try {
    const employeeId = req.employee?.id;
    if (!employeeId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    return res.json({
      id: employee.id,
      employeeId: employee.employeeId,
      name: employee.name,
      designation: employee.designation,
      email: employee.email,
      joiningDate: employee.joiningDate,
      baseSalary: employee.baseSalary,
      contact: employee.contact,
    });
  } catch (error) {
    console.error("[Employee] Failed to fetch profile:", error);
    return res.status(500).json({ message: "Failed to fetch profile" });
  }
});

export default router;
