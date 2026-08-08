import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "@repo/database";

export type AuthEmployee = {
  id: string;
  name: string;
  email: string;
  designation: string;
  role: string;
};

export async function employeeAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ message: "Missing or malformed Authorization header" });
  }

  const token = authHeader.slice("Bearer ".length).trim();

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    return res.status(500).json({ message: "JWT_SECRET is not configured" });
  }

  try {
    const payload = jwt.verify(token, jwtSecret);
    if (typeof payload === "string") {
      return res.status(401).json({ message: "Invalid token" });
    }

    const employeeId = String(payload.employeeId ?? "");
    if (!employeeId) {
      return res.status(401).json({ message: "Invalid token" });
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });
    if (!employee) {
      return res.status(401).json({ message: "Employee not found" });
    }

    req.employee = {
      id: employee.id,
      name: employee.name,
      email: employee.email ?? "",
      designation: String(employee.designation),
      role: String(employee.role),
    };

    return next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}
