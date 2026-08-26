/**
 * Script: mark-attendance-dch002-today.js
 * Purpose: Mark attendance for 25 Aug 2026 with Check-In (10:07 AM IST) and Check-Out (6:15 PM IST).
 *
 * Usage:
 *   node scripts/mark-attendance-dch002-today.js
 */

const fs = require("fs");
const path = require("path");

// Load DATABASE_URL from packages/database/.env natively
const envPath = path.join(__dirname, "../packages/database/.env");
if (fs.existsSync(envPath)) {
  if (typeof process.loadEnvFile === "function") {
    process.loadEnvFile(envPath);
  } else {
    const lines = fs.readFileSync(envPath, "utf8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
        const [key, ...rest] = trimmed.split("=");
        process.env[key.trim()] = rest.join("=").trim().replace(/^["']|["']$/g, "");
      }
    }
  }
}

const { PrismaClient } = require("../packages/database/dist/index.js");
const prisma = new PrismaClient();

// ─────────────────────────────────────────────
//  ✏️  CONFIGURATION
// ─────────────────────────────────────────────

const EMPLOYEE_ID_VALUE = "DCH-007"; // Employee ID
const TARGET_YEAR = 2026;
const TARGET_MONTH = 8; // August
const TARGET_DAY = 25;  // 25th

// Check-in: 10:07 AM IST
const CHECK_IN_HOUR_IST = 10;
const CHECK_IN_MINUTE_IST = 7;

// Check-out: 6:15 PM IST (18:15)
const CHECK_OUT_HOUR_IST = 18;
const CHECK_OUT_MINUTE_IST = 15;

const LATITUDE = 28.695758;
const LONGITUDE = 77.171941;

const FORCE_OVERWRITE = true;

// ─────────────────────────────────────────────

// IST is UTC+5:30 (no DST) -> converts IST clock components to accurate UTC Date
function istInstant(year, month, day, hour, minute) {
  return new Date(Date.UTC(year, month - 1, day, hour - 5, minute - 30, 0, 0));
}

async function main() {
  const dayStart = istInstant(TARGET_YEAR, TARGET_MONTH, TARGET_DAY, 0, 0);
  const dayEnd = new Date(istInstant(TARGET_YEAR, TARGET_MONTH, TARGET_DAY + 1, 0, 0).getTime() - 1);
  const checkInTime = istInstant(TARGET_YEAR, TARGET_MONTH, TARGET_DAY, CHECK_IN_HOUR_IST, CHECK_IN_MINUTE_IST);
  const checkOutTime = istInstant(TARGET_YEAR, TARGET_MONTH, TARGET_DAY, CHECK_OUT_HOUR_IST, CHECK_OUT_MINUTE_IST);

  const employee = await prisma.employee.findUnique({
    where: { employeeId: EMPLOYEE_ID_VALUE },
    select: { id: true, name: true, employeeId: true },
  });

  if (!employee) {
    console.error(`❌ No employee found with employeeId = "${EMPLOYEE_ID_VALUE}"`);
    process.exit(1);
  }

  console.log("==================================================");
  console.log(`Employee        : ${employee.name} (${employee.employeeId})`);
  console.log(`Target Date     : ${TARGET_YEAR}-${String(TARGET_MONTH).padStart(2, "0")}-${String(TARGET_DAY).padStart(2, "0")}`);
  console.log(`Check-In Time   : ${checkInTime.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST`);
  console.log(`Check-Out Time  : ${checkOutTime.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST`);
  console.log(`Location        : ${LATITUDE}, ${LONGITUDE}`);
  console.log(`Status          : PRESENT`);
  console.log("==================================================\n");

  const existing = await prisma.attendance.findFirst({
    where: { employeeId: employee.id, date: { gte: dayStart, lte: dayEnd } },
  });

  if (existing && !FORCE_OVERWRITE) {
    console.log("An attendance record already exists for this date:");
    console.log(`   Status: ${existing.status}, In: ${existing.checkInTime}, Out: ${existing.checkOutTime ?? "—"}`);
    console.log("\nSet FORCE_OVERWRITE = true to replace it.");
    return;
  }

  if (existing) {
    const updated = await prisma.attendance.update({
      where: { id: existing.id },
      data: {
        date: checkInTime,
        status: "PRESENT",
        checkInTime,
        checkOutTime,
        latitude: LATITUDE,
        longitude: LONGITUDE,
        checkOutLatitude: LATITUDE,
        checkOutLongitude: LONGITUDE,
        correctedByAdmin: true,
        previousStatus: existing.status !== "PRESENT" ? existing.status : existing.previousStatus,
        correctedAt: new Date(),
      },
    });
    console.log("✅ Existing attendance record updated successfully:");
    console.log(`   Record ID: ${updated.id}`);
    console.log(`   Status   : ${updated.status}`);
  } else {
    const created = await prisma.attendance.create({
      data: {
        employeeId: employee.id,
        date: checkInTime,
        status: "PRESENT",
        checkInTime,
        checkOutTime,
        latitude: LATITUDE,
        longitude: LONGITUDE,
        checkOutLatitude: LATITUDE,
        checkOutLongitude: LONGITUDE,
        correctedByAdmin: true,
        correctedAt: new Date(),
      },
    });
    console.log("✅ New attendance record created successfully:");
    console.log(`   Record ID: ${created.id}`);
    console.log(`   Status   : ${created.status}`);
  }
}

main()
  .catch((e) => {
    console.error("Script failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
