import type { NextFunction, Request, Response } from "express";

export function requireDesignation(...allowed: string[]) {
  const allowedSet = new Set(allowed);

  return (req: Request, res: Response, next: NextFunction) => {
    const designation = req.employee?.designation;

    if (!designation || !allowedSet.has(designation)) {
      return res.status(403).json({
        message: `Access denied. Required designation: ${allowed.join(" or ")}`,
      });
    }

    return next();
  };
}
