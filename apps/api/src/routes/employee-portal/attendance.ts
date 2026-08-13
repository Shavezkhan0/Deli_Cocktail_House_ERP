import { Router } from "express";
import { prisma, AttendanceStatus, Prisma } from "@repo/database";

const router: Router = Router();

const MAX_DISTANCE_METERS = 1000;

const OFFICE_LOCATION_KEYS = ["OFFICE_LAT", "OFFICE_LNG", "ATTENDANCE_RADIUS_M"] as const;

async function getGlobalOfficeSettings(): Promise<{
  latitude: number | null;
  longitude: number | null;
  radiusMeters: number;
  locationName: string;
}> {
  const settings = await prisma.appSettings.findMany({
    where: { key: { in: [...OFFICE_LOCATION_KEYS] } },
  });
  const settingsMap = new Map(settings.map((s) => [s.key, s.value]));
  const latRaw = settingsMap.get("OFFICE_LAT") ?? process.env.OFFICE_LAT;
  const lngRaw = settingsMap.get("OFFICE_LNG") ?? process.env.OFFICE_LNG;
  const radiusRaw = settingsMap.get("ATTENDANCE_RADIUS_M") ?? process.env.ATTENDANCE_RADIUS_M;

  const latitude = Number(latRaw);
  const longitude = Number(lngRaw);
  const radius = Number(radiusRaw);

  return {
    latitude: latRaw ? latitude : NaN,
    longitude: lngRaw ? longitude : NaN,
    radiusMeters: Number.isFinite(radius) && radius > 0 ? radius : MAX_DISTANCE_METERS,
    locationName: "Office",
  };
}

async function getLocationForDesignation(designation: string): Promise<{
  latitude: number | null;
  longitude: number | null;
  radiusMeters: number;
  locationName: string;
} | null> {
  const loc = await prisma.designationLocation.findUnique({
    where: { designation: designation.toUpperCase() },
  });
  if (!loc || !loc.isActive) {
    return null;
  }
  return {
    latitude: loc.latitude,
    longitude: loc.longitude,
    radiusMeters: loc.radiusM,
    locationName: loc.locationName,
  };
}

async function getEffectiveLocation(designation: string) {
  const designationLoc = await getLocationForDesignation(designation);
  if (designationLoc) {
    return designationLoc;
  }
  return getGlobalOfficeSettings();
}

function startOfToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function distanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earthRadius = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
}

// GET /attendance/office
// Returns the check-in location for a designation (or global office if no designation-specific location)
// Query: ?designation=CRM (optional)
router.get("/attendance/office", async (req, res) => {
  try {
    const designation = typeof req.query.designation === "string"
      ? req.query.designation
      : (req.employee?.designation ?? "");
    const location = await getEffectiveLocation(designation);
    if (!location.latitude || !Number.isFinite(location.latitude) ||
        !location.longitude || !Number.isFinite(location.longitude)) {
      return res.json(null);
    }
    return res.json({
      latitude: location.latitude,
      longitude: location.longitude,
      radiusMeters: location.radiusMeters,
      locationName: location.locationName,
    });
  } catch (error) {
    console.error("[Employee] Failed to fetch location:", error);
    return res.status(500).json({ message: "Failed to fetch location" });
  }
});

// GET /attendance/today
router.get("/attendance/today", async (req, res) => {
  try {
    const employeeId = req.employee?.id;
    if (!employeeId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const today = startOfToday();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const attendance = await prisma.attendance.findFirst({
      where: {
        employeeId,
        date: { gte: today, lt: tomorrow },
      },
    });

    return res.json({ marked: !!attendance, attendance });
  } catch (error) {
    console.error("[Employee] Failed to fetch today's attendance:", error);
    return res.status(500).json({ message: "Failed to fetch today's attendance" });
  }
});

// POST /attendance/mark
router.post("/attendance/mark", async (req, res) => {
  try {
    const employeeId = req.employee?.id;
    const designation = req.employee?.designation ?? "";
    if (!employeeId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { latitude, longitude } = req.body ?? {};

    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return res.status(400).json({ message: "Latitude and longitude are required" });
    }

    // Get the effective check-in location for this employee's designation
    const location = await getEffectiveLocation(designation);
    if (
      location.latitude &&
      Number.isFinite(location.latitude) &&
      location.longitude &&
      Number.isFinite(location.longitude)
    ) {
      const distance = distanceMeters(
        latitude,
        longitude,
        location.latitude,
        location.longitude,
      );
      if (distance > location.radiusMeters) {
        return res.status(400).json({
          message: `You must be within ${Math.round(location.radiusMeters)} m of ${location.locationName} to mark attendance. You are ${Math.round(distance)} m away.`,
          distanceMeters: Math.round(distance),
          requiredRadiusMeters: location.radiusMeters,
          locationName: location.locationName,
        });
      }
    }

    const today = startOfToday();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existing = await prisma.attendance.findFirst({
      where: {
        employeeId,
        date: { gte: today, lt: tomorrow },
      },
    });

    if (existing) {
      return res.status(409).json({ message: "Attendance already marked for today" });
    }

    const attendance = await prisma.attendance.create({
      data: {
        employeeId,
        date: new Date(),
        status: AttendanceStatus.PRESENT,
        latitude,
        longitude,
      },
    });

    return res.status(201).json(attendance);
  } catch (error) {
    console.error("[Employee] Failed to mark attendance:", error);
    return res.status(500).json({ message: "Failed to mark attendance" });
  }
});

// GET /attendance/history
// Optional query: ?month=8&year=2026 to scope to a specific month
router.get("/attendance/history", async (req, res) => {
  try {
    const employeeId = req.employee?.id;
    if (!employeeId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { month, year } = req.query;
    const monthNum = Number(month);
    const yearNum = Number(year);
    const hasMonth =
      Number.isInteger(monthNum) && monthNum >= 1 && monthNum <= 12;
    const hasYear = Number.isInteger(yearNum) && yearNum >= 2000;

    let where: Prisma.AttendanceWhereInput = { employeeId };

    if (hasMonth && hasYear) {
      const start = new Date(yearNum, monthNum - 1, 1);
      const end = new Date(yearNum, monthNum, 1);
      where = {
        employeeId,
        date: { gte: start, lt: end },
      };
    } else {
      const since = new Date();
      since.setDate(since.getDate() - 29);
      since.setHours(0, 0, 0, 0);
      where = {
        employeeId,
        date: { gte: since },
      };
    }

    const records = await prisma.attendance.findMany({
      where,
      orderBy: { date: "desc" },
      take: 100,
    });

    const summary = {
      PRESENT: 0,
      ABSENT: 0,
      HALF_DAY: 0,
      SHORT_LEAVE: 0,
      ON_LEAVE: 0,
    };
    for (const record of records) {
      summary[record.status] = (summary[record.status] ?? 0) + 1;
    }

    return res.json({ records, summary });
  } catch (error) {
    console.error("[Employee] Failed to fetch attendance history:", error);
    return res.status(500).json({ message: "Failed to fetch attendance history" });
  }
});

export default router;
