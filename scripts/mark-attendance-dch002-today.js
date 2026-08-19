/**
 * Script: mark-attendance-dch002-today.js
 * Purpose: Manually mark TODAY's attendance for employee DCH-002 with a fixed
 *          check-in time and location (used when the employee couldn't check
 *          in through the app themselves).
 *
 *          Check-in time: 10:00 AM IST today  → status PRESENT (Full), matching
 *          the live check-in rules (10:00–10:30 AM = Full).
 *          Location: lat 28.695758, long 77.171941
 *
 *          Safe by default: if a record already exists for today with a
 *          check-in time set, the script does NOT overwrite it — it just
 *          reports what's already there. Flip FORCE_OVERWRITE below if you
 *          want to replace it.
 *
 * Usage:
 *   node mark-attendance-dch002-today.js
 *
 * Requirements:
 *   - Run from: Deli_Cocktail_House_ERP\scripts\
 *   - DATABASE_URL is read from packages/database/.env automatically
 */

const { PrismaClient } = require("../packages/database/dist/index.js");
const prisma = new PrismaClient();

// ─────────────────────────────────────────────
//  ✏️  CONFIGURE THESE BEFORE RUNNING
// ─────────────────────────────────────────────

const EMPLOYEE_ID_VALUE = "DCH-002"; // Employee's `employeeId` field, not internal cuid
const LATITUDE = 28.695758;
const LONGITUDE = 77.171941;
const CHECK_IN_HOUR_IST = 10;
const CHECK_IN_MINUTE_IST = 0;

// Set to true to overwrite an existing check-in for today if one already exists
const FORCE_OVERWRITE = false;

// ─────────────────────────────────────────────

function istTodayDateParts() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  return {
    year: Number(parts.find((p) => p.type === "year").value),
    month: Number(parts.find((p) => p.type === "month").value),
    day: Number(parts.find((p) => p.type === "day").value),
  };
}

// IST is UTC+5:30 with no DST — subtracting 5:30 from the wall-clock IST
// components gives the correct UTC instant regardless of the machine's own timezone.
function istInstant(year, month, day, hour, minute) {
  return new Date(Date.UTC(year, month - 1, day, hour - 5, minute - 30, 0, 0));
}

async function main() {
  const { year, month, day } = istTodayDateParts();
  const dayStart = istInstant(year, month, day, 0, 0);
  const dayEnd = new Date(istInstant(year, month, day + 1, 0, 0).getTime() - 1);
  const checkInTime = istInstant(year, month, day, CHECK_IN_HOUR_IST, CHECK_IN_MINUTE_IST);

  const employee = await prisma.employee.findUnique({
    where: { employeeId: EMPLOYEE_ID_VALUE },
    select: { id: true, name: true },
  });

  if (!employee) {
    console.error(`No employee found with employeeId = "${EMPLOYEE_ID_VALUE}"`);
    process.exit(1);
  }

  console.log(`Employee      : ${employee.name} (${EMPLOYEE_ID_VALUE})`);
  console.log(`Today (IST)   : ${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
  console.log(`Check-in time : ${checkInTime.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST`);
  console.log(`Location      : ${LATITUDE}, ${LONGITUDE}`);
  console.log(`Status        : PRESENT\n`);

  const existing = await prisma.attendance.findFirst({
    where: { employeeId: employee.id, date: { gte: dayStart, lte: dayEnd } },
  });

  if (existing && existing.checkInTime && !FORCE_OVERWRITE) {
    console.log("An attendance record already exists for today with a check-in time:");
    console.log(`   Status: ${existing.status}, Check-in: ${existing.checkInTime}, Check-out: ${existing.checkOutTime ?? "—"}`);
    console.log("\nSet FORCE_OVERWRITE = true in this script if you want to overwrite it. No changes made.");
    return;
  }

  if (existing) {
    await prisma.attendance.update({
      where: { id: existing.id },
      data: {
        date: checkInTime,
        status: "PRESENT",
        checkInTime,
        latitude: LATITUDE,
        longitude: LONGITUDE,
      },
    });
    console.log("Existing record updated with the check-in details above.");
  } else {
    await prisma.attendance.create({
      data: {
        employeeId: employee.id,
        date: checkInTime,
        status: "PRESENT",
        checkInTime,
        latitude: LATITUDE,
        longitude: LONGITUDE,
      },
    });
    console.log("New attendance record created with the details above.");
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
