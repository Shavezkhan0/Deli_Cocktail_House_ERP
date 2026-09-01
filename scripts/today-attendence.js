 /**
  * Script: today-attendence.js
  *
  * Purpose:
  *   Show all PRESENT employees for TODAY (IST) with:
  *   - Employee ID
  *   - Employee Name
  *   - Designation
  *   - Status
  *   - Check-In Time
  *   - Check-In Latitude / Longitude
  *   - Check-Out Time
  *   - Check-Out Latitude / Longitude
  *   - Attendance Record ID
  *
  * Usage:
  *   pnpm exec node scripts/today-attendence.js
  */

const fs = require("fs");
const path = require("path");

// ─────────────────────────────────────────────
// Load DATABASE_URL from packages/database/.env
// ─────────────────────────────────────────────

const envPath = path.join(__dirname, "../packages/database/.env");

if (fs.existsSync(envPath)) {
  if (typeof process.loadEnvFile === "function") {
    process.loadEnvFile(envPath);
  } else {
    const lines = fs.readFileSync(envPath, "utf8").split("\n");

    for (const line of lines) {
      const trimmed = line.trim();

      if (
        trimmed &&
        !trimmed.startsWith("#") &&
        trimmed.includes("=")
      ) {
        const [key, ...rest] = trimmed.split("=");

        process.env[key.trim()] = rest
          .join("=")
          .trim()
          .replace(/^["']|["']$/g, "");
      }
    }
  }
}

// ─────────────────────────────────────────────
// Prisma
// ─────────────────────────────────────────────

const { PrismaClient } = require("../packages/database/dist/index.js");

const prisma = new PrismaClient();

// ─────────────────────────────────────────────
// GET TODAY'S DATE IN IST
// ─────────────────────────────────────────────

function getTodayIST() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(new Date());

  const year = Number(
    parts.find((p) => p.type === "year").value
  );

  const month = Number(
    parts.find((p) => p.type === "month").value
  );

  const day = Number(
    parts.find((p) => p.type === "day").value
  );

  return {
    year,
    month,
    day,
  };
}

// ─────────────────────────────────────────────
// IST → UTC
// ─────────────────────────────────────────────

function istInstant(year, month, day, hour, minute, second = 0) {
  return new Date(
    Date.UTC(
      year,
      month - 1,
      day,
      hour - 5,
      minute - 30,
      second,
      0
    )
  );
}

// ─────────────────────────────────────────────
// Format date/time in IST
// ─────────────────────────────────────────────

function formatIST(date) {
  if (!date) return "—";

  return new Date(date).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

// ─────────────────────────────────────────────
// Format coordinate
// ─────────────────────────────────────────────

function formatCoordinate(value) {
  if (value === null || value === undefined) {
    return "—";
  }

  return Number(value).toFixed(6);
}

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────

async function main() {
  const {
    year: TARGET_YEAR,
    month: TARGET_MONTH,
    day: TARGET_DAY,
  } = getTodayIST();

  // Start of today in IST
  const dayStart = istInstant(
    TARGET_YEAR,
    TARGET_MONTH,
    TARGET_DAY,
    0,
    0,
    0
  );

  // Start of tomorrow in IST
  const nextDayStart = istInstant(
    TARGET_YEAR,
    TARGET_MONTH,
    TARGET_DAY + 1,
    0,
    0,
    0
  );

  const dateString = `${TARGET_YEAR}-${String(
    TARGET_MONTH
  ).padStart(2, "0")}-${String(TARGET_DAY).padStart(2, "0")}`;

  console.log("");
  console.log("============================================================");
  console.log("                  TODAY'S ATTENDANCE");
  console.log("============================================================");
  console.log(`Date              : ${dateString}`);
  console.log(`Time Zone         : Asia/Kolkata (IST)`);
  console.log("============================================================");
  console.log("");

  // ─────────────────────────────────────────────
  // Find PRESENT attendance records
  // ─────────────────────────────────────────────

  const attendanceRecords = await prisma.attendance.findMany({
    where: {
      date: {
        gte: dayStart,
        lt: nextDayStart,
      },
    },

    include: {
      employee: {
        select: {
          id: true,
          employeeId: true,
          name: true,
          designation: true,
        },
      },
    },

    orderBy: {
      checkInTime: "asc",
    },
  });

  // ─────────────────────────────────────────────
  // No records
  // ─────────────────────────────────────────────

  if (attendanceRecords.length === 0) {
    console.log("❌ No attendance records found for today.");
    console.log("");
    return;
  }

  console.log(
    `✅ ${attendanceRecords.length} attendance record${
      attendanceRecords.length === 1 ? "" : "s"
    } found.`
  );

  console.log("");

  // ─────────────────────────────────────────────
  // TABLE HEADER
  // ─────────────────────────────────────────────

  console.log(
    "--------------------------------------------------------------------------------------------------------------"
  );

  console.log(
    " Employee ID | Employee Name | Designation | Status | Check-In | Check-Out | Check-In Location | Check-Out Location"
  );

  console.log(
    "--------------------------------------------------------------------------------------------------------------"
  );

  // ─────────────────────────────────────────────
  // TABLE DATA
  // ─────────────────────────────────────────────

  attendanceRecords.forEach((record) => {
    const employeeId =
      record.employee?.employeeId ?? "—";

    const employeeName =
      record.employee?.name ?? "—";

    const designation =
      record.employee?.designation ?? "—";

    const checkIn = record.checkInTime
      ? new Date(record.checkInTime).toLocaleTimeString(
          "en-IN",
          {
            timeZone: "Asia/Kolkata",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          }
        )
      : "—";

    const checkOut = record.checkOutTime
      ? new Date(record.checkOutTime).toLocaleTimeString(
          "en-IN",
          {
            timeZone: "Asia/Kolkata",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          }
        )
      : "—";

    const checkInLocation =
      record.latitude !== null &&
      record.longitude !== null
        ? `${formatCoordinate(record.latitude)}, ${formatCoordinate(
            record.longitude
          )}`
        : "—";

    const checkOutLocation =
      record.checkOutLatitude !== null &&
      record.checkOutLongitude !== null
        ? `${formatCoordinate(
            record.checkOutLatitude
          )}, ${formatCoordinate(
            record.checkOutLongitude
          )}`
        : "—";

    console.log(
      `${employeeId} | ${employeeName} | ${designation} | ${record.status} | ${checkIn} | ${checkOut} | ${checkInLocation} | ${checkOutLocation}`
    );
  });

  console.log(
    "--------------------------------------------------------------------------------------------------------------"
  );

  console.log("");

  // ─────────────────────────────────────────────
  // DETAILED INFORMATION
  // ─────────────────────────────────────────────

  console.log("============================================================");
  console.log("                    DETAILED LOCATION DATA");
  console.log("============================================================");

  attendanceRecords.forEach((record, index) => {
    console.log("");
    console.log(`#${index + 1}`);
    console.log("--------------------------------------------");

    console.log(
      `Record ID           : ${record.id}`
    );

    console.log(
      `Employee ID         : ${
        record.employee?.employeeId ?? "—"
      }`
    );

    console.log(
      `Employee Name       : ${
        record.employee?.name ?? "—"
      }`
    );

    console.log(
      `Designation         : ${
        record.employee?.designation ?? "—"
      }`
    );

    console.log(
      `Status              : ${record.status}`
    );

    console.log(
      `Check-In Time       : ${formatIST(
        record.checkInTime
      )} IST`
    );

    console.log(
      `Check-In Latitude   : ${formatCoordinate(
        record.latitude
      )}`
    );

    console.log(
      `Check-In Longitude  : ${formatCoordinate(
        record.longitude
      )}`
    );

    console.log(
      `Check-Out Time      : ${formatIST(
        record.checkOutTime
      )} IST`
    );

    console.log(
      `Check-Out Latitude  : ${formatCoordinate(
        record.checkOutLatitude
      )}`
    );

    console.log(
      `Check-Out Longitude : ${formatCoordinate(
        record.checkOutLongitude
      )}`
    );

    console.log(
      `Corrected By Admin  : ${
        record.correctedByAdmin ? "YES" : "NO"
      }`
    );

    console.log(
      `Corrected At        : ${formatIST(
        record.correctedAt
      )}`
    );
  });

  // ─────────────────────────────────────────────
  // SUMMARY
  // ─────────────────────────────────────────────

  console.log("");
  console.log("============================================================");
  console.log("                       SUMMARY");
  console.log("============================================================");

  const checkedIn = attendanceRecords.filter(
    (record) => record.checkInTime
  ).length;

  const checkedOut = attendanceRecords.filter(
    (record) => record.checkOutTime
  ).length;

  const locationAvailable = attendanceRecords.filter(
    (record) =>
      record.latitude !== null &&
      record.longitude !== null
  ).length;

  console.log(
    `Total Records       : ${attendanceRecords.length}`
  );

  console.log(
    `Checked In          : ${checkedIn}`
  );

  console.log(
    `Checked Out         : ${checkedOut}`
  );

  console.log(
    `GPS Location Found  : ${locationAvailable}`
  );

  console.log("============================================================");
  console.log("");
}

// ─────────────────────────────────────────────
// RUN
// ─────────────────────────────────────────────

main()
  .catch((error) => {
    console.error("");
    console.error("❌ Script failed:");
    console.error(error);
    console.error("");
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });