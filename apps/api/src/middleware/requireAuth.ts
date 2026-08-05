import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export type AuthUser = {
  userId: string;
  email: string;
  role: string;
};

export function requireAuth(req: Request, res: Response, next: NextFunction) {
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

    req.user = {
      userId: String(payload.userId),
      email: String(payload.email ?? ""),
      role: String(payload.role ?? ""),
    };

    return next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}
