/**
 * Script: update-attendance-dch003-27aug2026.js
 * Purpose: Update attendance record for DCH-003 on 27 Aug 2026:
 *          - checkOutTime: 6:15 PM IST (18:15 IST)
 *          - status: PRESENT
 *          - clear Admin Corrected flags (correctedByAdmin = false, previousStatus = null, correctedAt = null)
 *
 * Usage:
 *   node scripts/update-attendance-dch003-27aug2026.js
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

const EMPLOYEE_ID_VALUE = "DCH-003";
const TARGET_YEAR = 2026;
const TARGET_MONTH = 8; // August
const TARGET_DAY = 27;

// IST is UTC+5:30
function istInstant(year, month, day, hour, minute, second = 0) {
  return new Date(Date.UTC(year, month - 1, day, hour - 5, minute - 30, second, 0));
}

async function main() {
  const dayStart = istInstant(TARGET_YEAR, TARGET_MONTH, TARGET_DAY, 0, 0, 0);
  const dayEnd = new Date(istInstant(TARGET_YEAR, TARGET_MONTH, TARGET_DAY + 1, 0, 0, 0).getTime() - 1);

  // Check-out time: 6:15 PM IST (18:15 IST)
  const newCheckOutTime = istInstant(TARGET_YEAR, TARGET_MONTH, TARGET_DAY, 18, 15, 0);

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
  console.log(`Target Date     : 27 Aug 2026`);
  console.log(`Check-Out       : ${newCheckOutTime.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST`);
  console.log(`Status          : PRESENT`);
  console.log(`Admin Corrected : Clearing (No admin correction mark)`);
  console.log("==================================================\n");

  const existing = await prisma.attendance.findFirst({
    where: {
      employeeId: employee.id,
      date: { gte: dayStart, lte: dayEnd },
    },
  });

  if (!existing) {
    console.error(`❌ No attendance record found for ${employee.name} (${EMPLOYEE_ID_VALUE}) on 27 Aug 2026.`);
    return;
  }

  console.log("Found existing record:");
  console.log(`  ID                    : ${existing.id}`);
  console.log(`  Date                  : ${existing.date.toISOString()}`);
  console.log(`  Status                : ${existing.status}`);
  console.log(`  Check-In              : ${existing.checkInTime ? existing.checkInTime.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST" : "None"}`);
  console.log(`  Check-Out             : ${existing.checkOutTime ? existing.checkOutTime.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST" : "None"}`);
  console.log(`  CorrectedByAdmin (was): ${existing.correctedByAdmin}`);
  console.log(`  PreviousStatus (was)  : ${existing.previousStatus}`);

  const updated = await prisma.attendance.update({
    where: { id: existing.id },
    data: {
      checkOutTime: newCheckOutTime,
      status: "PRESENT",
      correctedByAdmin: false,
      previousStatus: null,
      correctedAt: null,
    },
  });

  console.log("\n✅ Record successfully updated and Admin Corrected flag removed!");
  console.log(`  Status (After)    : ${updated.status}`);
  console.log(`  Check-In         : ${updated.checkInTime ? updated.checkInTime.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST" : "None"}`);
  console.log(`  Check-Out (After): ${updated.checkOutTime ? updated.checkOutTime.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST" : "None"}`);
  console.log(`  CorrectedByAdmin : ${updated.correctedByAdmin}`);
  console.log(`  PreviousStatus   : ${updated.previousStatus}`);
}

main()
  .catch((err) => {
    console.error("Error executing script:", err);
  })
  .finally(() => prisma.$disconnect());
