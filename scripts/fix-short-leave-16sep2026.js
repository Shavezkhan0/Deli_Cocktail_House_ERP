/**
 * Script: fix-short-leave-16sep2026.js
 * Purpose: Update attendance record for DCH-005 on 1 Oct 2026:
 *          - checkInTime: 11:29 AM IST (11:29:00 IST)
 *          - status: SHORT_LEAVE (changed from HALF_DAY)
 *          - clear Admin Corrected flags
 *
 * Usage:
 *   node scripts/fix-short-leave-16sep2026.js
 *   OR
 *   node fix-short-leave-16sep2026.js (from within scripts/ directory)
 */

const fs = require("fs");
const path = require("path");

// Load DATABASE_URL from packages/database/.env natively if not present
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

const EMPLOYEE_ID_VALUE = "DCH-005";
const TARGET_YEAR = 2026;
const TARGET_MONTH = 10; // October
const TARGET_DAY = 1;

// IST is UTC+5:30
function istInstant(year, month, day, hour, minute, second = 0) {
  return new Date(Date.UTC(year, month - 1, day, hour - 5, minute - 30, second, 0));
}

async function main() {
  const dayStart = istInstant(TARGET_YEAR, TARGET_MONTH, TARGET_DAY, 0, 0, 0);
  const dayEnd = new Date(istInstant(TARGET_YEAR, TARGET_MONTH, TARGET_DAY + 1, 0, 0, 0).getTime() - 1);

  // Target Check-In time: 11:29 AM IST
  const newCheckInTime = istInstant(TARGET_YEAR, TARGET_MONTH, TARGET_DAY, 11, 29, 0);

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
  console.log(`Target Date     : 1 Oct 2026`);
  console.log(`New Check-In    : ${newCheckInTime.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST`);
  console.log(`New Status      : SHORT_LEAVE`);
  console.log("==================================================\n");

  const existing = await prisma.attendance.findFirst({
    where: {
      employeeId: employee.id,
      date: { gte: dayStart, lte: dayEnd },
    },
  });

  if (!existing) {
    console.error(`❌ No attendance record found for ${employee.name} (${EMPLOYEE_ID_VALUE}) on 1 Oct 2026.`);
    return;
  }

  console.log("Found existing record:");
  console.log(`  ID                    : ${existing.id}`);
  console.log(`  Date                  : ${existing.date.toISOString()}`);
  console.log(`  Status (Current)      : ${existing.status}`);
  console.log(`  Check-In (Current)    : ${existing.checkInTime ? existing.checkInTime.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST" : "None"}`);
  console.log(`  Check-Out             : ${existing.checkOutTime ? existing.checkOutTime.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST" : "None"}`);
  console.log(`  CorrectedByAdmin (was): ${existing.correctedByAdmin}`);
  console.log(`  PreviousStatus (was)  : ${existing.previousStatus}`);

  const updated = await prisma.attendance.update({
    where: { id: existing.id },
    data: {
      checkInTime: newCheckInTime,
      status: "SHORT_LEAVE",
      correctedByAdmin: false,
      previousStatus: null,
      correctedAt: null,
    },
  });

  console.log("\n✅ Record successfully updated!");
  console.log(`  Status (After)   : ${updated.status}`);
  console.log(`  Check-In (After) : ${updated.checkInTime ? updated.checkInTime.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST" : "None"}`);
  console.log(`  Check-Out        : ${updated.checkOutTime ? updated.checkOutTime.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST" : "None"}`);
  console.log(`  CorrectedByAdmin : ${updated.correctedByAdmin}`);
}

main()
  .catch((err) => {
    console.error("Error executing script:", err);
  })
  .finally(() => prisma.$disconnect());
