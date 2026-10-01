/**
 * Script: mark-attendance-last-5-months.js
 * Purpose: Backfill attendance for a specific employee (or all) over the last 5 months.
 *
 * Usage:
 *   node scripts/mark-attendance-last-5-months.js
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

const EMPLOYEE_ID_VALUE = "DCH-002"; // Set to "ALL" to mark for all employees, or specify an ID like "DCH-002"
const MONTHS_TO_BACKFILL = 5;

// Check-in: 10:00 AM IST
const CHECK_IN_HOUR_IST = 10;
const CHECK_IN_MINUTE_IST = 0;

// Check-out: 6:30 PM IST (18:30)
const CHECK_OUT_HOUR_IST = 18;
const CHECK_OUT_MINUTE_IST = 30;

const LATITUDE = 28.695758;
const LONGITUDE = 77.171941;

// Skip Weekends?
const SKIP_WEEKENDS = true;

// ─────────────────────────────────────────────

// IST is UTC+5:30 (no DST) -> converts IST clock components to accurate UTC Date
function istInstant(year, month, day, hour, minute) {
  return new Date(Date.UTC(year, month - 1, day, hour - 5, minute - 30, 0, 0));
}

async function processEmployee(employee, startDate, endDate) {
  console.log(`\nProcessing employee: ${employee.name} (${employee.employeeId})`);
  let createdCount = 0;
  let skippedCount = 0;

  let currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const day = currentDate.getDate();
    const dayOfWeek = currentDate.getDay(); // 0 is Sunday, 6 is Saturday

    // Check if weekend
    if (SKIP_WEEKENDS && (dayOfWeek === 0 || dayOfWeek === 6)) {
      currentDate.setDate(currentDate.getDate() + 1);
      continue;
    }

    const dayStart = istInstant(year, month, day, 0, 0);
    const dayEnd = new Date(istInstant(year, month, day + 1, 0, 0).getTime() - 1);
    const checkInTime = istInstant(year, month, day, CHECK_IN_HOUR_IST, CHECK_IN_MINUTE_IST);
    const checkOutTime = istInstant(year, month, day, CHECK_OUT_HOUR_IST, CHECK_OUT_MINUTE_IST);

    const existing = await prisma.attendance.findFirst({
      where: { employeeId: employee.id, date: { gte: dayStart, lte: dayEnd } },
    });

    if (existing) {
      skippedCount++;
    } else {
      await prisma.attendance.create({
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
      createdCount++;
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }

  console.log(`✅ Finished ${employee.employeeId} - Marked ${createdCount} days present, skipped ${skippedCount} existing days.`);
}

async function main() {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - MONTHS_TO_BACKFILL);

  console.log("==================================================");
  console.log(`Backfilling Attendance for last ${MONTHS_TO_BACKFILL} months`);
  console.log(`From Date  : ${startDate.toISOString().split('T')[0]}`);
  console.log(`To Date    : ${endDate.toISOString().split('T')[0]}`);
  console.log("==================================================\n");

  let employees = [];
  if (EMPLOYEE_ID_VALUE === "ALL") {
    employees = await prisma.employee.findMany({
      select: { id: true, name: true, employeeId: true },
    });
  } else {
    const employee = await prisma.employee.findUnique({
      where: { employeeId: EMPLOYEE_ID_VALUE },
      select: { id: true, name: true, employeeId: true },
    });
    if (employee) employees.push(employee);
  }

  if (employees.length === 0) {
    console.error(`❌ No employees found to process.`);
    process.exit(1);
  }

  for (const emp of employees) {
    await processEmployee(emp, startDate, endDate);
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
