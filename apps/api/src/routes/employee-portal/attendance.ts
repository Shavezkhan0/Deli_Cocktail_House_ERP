import { Router } from "express";
import { prisma, AttendanceStatus } from "@repo/database";

const router: Router = Router();

const MAX_DISTANCE_METERS = 1000;

const OFFICE_LOCATION_KEYS = ["OFFICE_LAT", "OFFICE_LNG", "ATTENDANCE_RADIUS_M"] as const;

async function getOfficeSettings(): Promise<{
  latitude: number | null;
  longitude: number | null;
  radiusMeters: number;
}> {
  const settings = await prisma.appSettings.findMany({
    where: { key: { in: [...OFFICE_LOCATION_KEYS] } },
  });
  const settingsMap = new Map(settings.map((setting) => [setting.key, setting.value]));

  const latRaw = settingsMap.get("OFFICE_LAT") ?? process.env.OFFICE_LAT;
  const lngRaw = settingsMap.get("OFFICE_LNG") ?? process.env.OFFICE_LNG;

  const latitude = Number(latRaw);
  const longitude = Number(lngRaw);

  const radiusRaw = settingsMap.get("ATTENDANCE_RADIUS_M") ?? process.env.ATTENDANCE_RADIUS_M;
  const radius = Number(radiusRaw);

  return {
    latitude: latRaw ? latitude : NaN,
    longitude: lngRaw ? longitude : NaN,
    radiusMeters: Number.isFinite(radius) && radius > 0 ? radius : MAX_DISTANCE_METERS,
  };
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

router.get("/attendance/office", async (_req, res) => {
  try {
    const office = await getOfficeSettings();
    if (!Number.isFinite(office.latitude) || !Number.isFinite(office.longitude)) {
      return res.json(null);
    }
    return res.json({
      latitude: office.latitude as number,
      longitude: office.longitude as number,
      radiusMeters: office.radiusMeters,
    });
  } catch (error) {
    console.error("[Employee] Failed to fetch office location:", error);
    return res.status(500).json({ message: "Failed to fetch office location" });
  }
});

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
    return res
      .status(500)
      .json({ message: "Failed to fetch today's attendance" });
  }
});

router.post("/attendance/mark", async (req, res) => {
  try {
    const employeeId = req.employee?.id;
    if (!employeeId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { latitude, longitude } = req.body ?? {};

    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return res
        .status(400)
        .json({ message: "Latitude and longitude are required" });
    }

    const office = await getOfficeSettings();

    if (
      Number.isFinite(office.latitude) &&
      Number.isFinite(office.longitude)
    ) {
      const distance = distanceMeters(
        latitude,
        longitude,
        office.latitude as number,
        office.longitude as number,
      );
      if (distance > office.radiusMeters) {
        return res.status(400).json({
          message: `You must be within ${Math.round(office.radiusMeters / 1000)} km of the office to mark attendance`,
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
      return res
        .status(409)
        .json({ message: "Attendance already marked for today" });
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

router.get("/attendance/history", async (req, res) => {
  try {
    const employeeId = req.employee?.id;
    if (!employeeId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const since = new Date();
    since.setDate(since.getDate() - 29);
    since.setHours(0, 0, 0, 0);

    const attendances = await prisma.attendance.findMany({
      where: {
        employeeId,
        date: { gte: since },
      },
      orderBy: { date: "desc" },
      take: 30,
    });

    return res.json(attendances);
  } catch (error) {
    console.error("[Employee] Failed to fetch attendance history:", error);
    return res
      .status(500)
      .json({ message: "Failed to fetch attendance history" });
  }
});

export default router;
