import { Router } from "express";
import { prisma, AttendanceStatus, OverrideType, Prisma } from "@repo/database";
import { ATTENDANCE_TIMEZONE, istDayOfWeek, istHourMinute, istStartOfDay, startOfToday, timeToMinutes } from "../../lib/attendance-time";

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

const SHIFT_END = { hour: 17, minute: 30 }; // 5:30 PM

const CHECK_IN_FULL_CUTOFF = { hour: 10, minute: 15 }; // at or before → PRESENT (Full)
const CHECK_IN_SHORT_CUTOFF = { hour: 11, minute: 30 }; // at or before → SHORT_LEAVE
const CHECK_IN_HALF_CUTOFF = { hour: 14, minute: 30 }; // at or before → HALF_DAY, after → blocked

const CHECKOUT_MID_AFTERNOON = { hour: 15, minute: 0 }; // 3pm

function toMinutes(date: Date): number {
  const { hour, minute } = istHourMinute(date);
  return timeToMinutes(hour, minute);
}

function statusForCheckIn(now: Date): AttendanceStatus | null {
  const minutes = toMinutes(now);
  if (minutes <= timeToMinutes(CHECK_IN_FULL_CUTOFF.hour, CHECK_IN_FULL_CUTOFF.minute)) {
    return AttendanceStatus.PRESENT;
  }
  if (minutes <= timeToMinutes(CHECK_IN_SHORT_CUTOFF.hour, CHECK_IN_SHORT_CUTOFF.minute)) {
    return AttendanceStatus.SHORT_LEAVE;
  }
  if (minutes <= timeToMinutes(CHECK_IN_HALF_CUTOFF.hour, CHECK_IN_HALF_CUTOFF.minute)) {
    return AttendanceStatus.HALF_DAY;
  }
  return null;
}

function statusForCheckOut(checkInTime: Date, now: Date): AttendanceStatus {
  const checkInMinutes = toMinutes(checkInTime);
  const checkOutMinutes = toMinutes(now);
  const midAfternoon = timeToMinutes(CHECKOUT_MID_AFTERNOON.hour, CHECKOUT_MID_AFTERNOON.minute);
  const shiftEnd = timeToMinutes(SHIFT_END.hour, SHIFT_END.minute);
  const fullCutoff = timeToMinutes(CHECK_IN_FULL_CUTOFF.hour, CHECK_IN_FULL_CUTOFF.minute);
  const shortCutoff = timeToMinutes(CHECK_IN_SHORT_CUTOFF.hour, CHECK_IN_SHORT_CUTOFF.minute);

  if (checkInMinutes <= fullCutoff) {
    // checked in on time or early
    if (checkOutMinutes < midAfternoon) return AttendanceStatus.HALF_DAY;
    if (checkOutMinutes < shiftEnd) return AttendanceStatus.SHORT_LEAVE;
    return AttendanceStatus.PRESENT;
  }

  if (checkInMinutes <= shortCutoff) {
    // checked in a bit late — capped, can never become PRESENT
    if (checkOutMinutes < shiftEnd) return AttendanceStatus.HALF_DAY;
    return AttendanceStatus.SHORT_LEAVE;
  }

  // checked in later still (up to the 2:30pm block) — always HALF_DAY, checkout time doesn't matter for this bracket
  return AttendanceStatus.HALF_DAY;
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
// First call of the day = check-in; second call = check-out.
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

    const today = startOfToday();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const wfhToday = await prisma.workFromHomeDay.findFirst({
      where: { employeeId, date: { gte: today, lt: tomorrow } },
    });

    // Get the effective check-in location for this employee's designation
    const location = await getEffectiveLocation(designation);
    if (
      !wfhToday &&
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
        return res.status(403).json({
          error: "LOCATION_NOT_ALLOWED",
          message: "Location not allowed",
          detail: `You must be within ${Math.round(location.radiusMeters)} m of ${location.locationName} to mark attendance. You are ${Math.round(distance)} m away.`,
          distanceMeters: Math.round(distance),
          requiredRadiusMeters: location.radiusMeters,
          locationName: location.locationName,
        });
      }
    }

    const existing = await prisma.attendance.findFirst({
      where: {
        employeeId,
        date: { gte: today, lt: tomorrow },
      },
    });

    const now = new Date();

    // --- Check-in ---
    if (!existing || existing.checkInTime === null) {
      const isSunday = istDayOfWeek(now) === 0;
      const holiday = await prisma.holiday.findFirst({
        where: { date: { gte: today, lt: tomorrow } },
      });
      const isHoliday = !!holiday;

      let isForceWorkDay = false;
      if (isSunday || isHoliday) {
        const workOverride = await prisma.attendanceOverride.findFirst({
          where: {
            employeeId,
            date: { gte: today, lt: tomorrow },
            type: OverrideType.FORCE_WORK,
          },
        });
        if (!workOverride) {
          return res.status(403).json({
            error: "NOT_A_WORKING_DAY",
            message:
              "Today is a holiday. You are not scheduled to work today — contact admin if this is a mistake.",
          });
        }
        isForceWorkDay = true;
      }

      let status = statusForCheckIn(now);
      if (status === null) {
        return res.status(403).json({
          error: "ATTENDANCE_WINDOW_CLOSED",
          message:
            "Attendance can no longer be marked for today. The window closed at 2:30 PM.",
        });
      }
      if (isForceWorkDay) {
        status = AttendanceStatus.PRESENT;
      }
      const attendance = existing
        ? await prisma.attendance.update({
            where: { id: existing.id },
            data: {
              date: istStartOfDay(now),
              status,
              checkInTime: now,
              latitude,
              longitude,
            },
          })
        : await prisma.attendance.create({
            data: {
              employeeId,
              date: istStartOfDay(now),
              status,
              checkInTime: now,
              latitude,
              longitude,
            },
          });

      return res.status(201).json({ event: "check-in", attendance });
    }

    // --- Check-out ---
    if (existing.checkOutTime !== null) {
      return res.status(409).json({ message: "Already checked out for today" });
    }

    // Guard: Prevent accidental immediate checkout (must wait at least 15 minutes after check-in)
    const MIN_CHECKOUT_INTERVAL_MINUTES = 15;
    if (existing.checkInTime) {
      const diffMs = now.getTime() - new Date(existing.checkInTime).getTime();
      const diffMinutes = diffMs / (1000 * 60);
      if (diffMinutes < MIN_CHECKOUT_INTERVAL_MINUTES) {
        const remainingMinutes = Math.max(1, Math.ceil(MIN_CHECKOUT_INTERVAL_MINUTES - diffMinutes));
        return res.status(400).json({
          error: "CHECKOUT_TOO_SOON",
          message: `You just checked in recently. Check-out is locked for ${MIN_CHECKOUT_INTERVAL_MINUTES} minutes after check-in to prevent accidental checkouts. Please wait ${remainingMinutes} more minute${remainingMinutes > 1 ? "s" : ""}.`,
          remainingMinutes,
        });
      }
    }

    let status: AttendanceStatus;
    const existingDayIsSunday = istDayOfWeek(existing.date) === 0;
    const existingDayIsHoliday = !!(await prisma.holiday.findFirst({
      where: { date: { gte: today, lt: tomorrow } },
    }));
    if (existingDayIsSunday || existingDayIsHoliday) {
      const forceWorkOverride = await prisma.attendanceOverride.findFirst({
        where: {
          employeeId,
          date: { gte: today, lt: tomorrow },
          type: OverrideType.FORCE_WORK,
        },
      });
      if (forceWorkOverride) {
        status = AttendanceStatus.PRESENT;
      } else {
        status = statusForCheckOut(existing.checkInTime!, now);
      }
    } else {
      status = statusForCheckOut(existing.checkInTime!, now);
    }

    const attendance = await prisma.attendance.update({
      where: { id: existing.id },
      data: {
        checkOutTime: now,
        status,
        checkOutLatitude: latitude,
        checkOutLongitude: longitude,
      },
    });

    return res.json({ event: "check-out", attendance });
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

// GET /attendance/holidays
// Optional query: ?month=8&year=2026 to scope to a specific month; otherwise returns all.
router.get("/attendance/holidays", async (req, res) => {
  try {
    const { month, year } = req.query;
    const monthNum = Number(month);
    const yearNum = Number(year);
    const hasMonth = Number.isInteger(monthNum) && monthNum >= 1 && monthNum <= 12;
    const hasYear = Number.isInteger(yearNum) && yearNum >= 2000;

    let where: Prisma.HolidayWhereInput = {};
    if (hasMonth && hasYear) {
      const start = new Date(yearNum, monthNum - 1, 1);
      const end = new Date(yearNum, monthNum, 1);
      where = { date: { gte: start, lt: end } };
    }

    const holidays = await prisma.holiday.findMany({
      where,
      orderBy: { date: "asc" },
    });

    return res.json(holidays);
  } catch (error) {
    console.error("[Employee] Failed to fetch holidays:", error);
    return res.status(500).json({ message: "Failed to fetch holidays" });
  }
});

export default router;
