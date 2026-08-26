/**
 * Script: mark-absent-dch007-24aug2026.js
 * Purpose: Finds employee DCH-007 attendance for 24 Aug 2026 and sets status to ABSENT
 *          (or deletes check-in/check-out timestamps and sets status = ABSENT with admin correction flags).
 * Location: C:\Users\Shavez_Khan\Desktop\Deli_Cocktail_House\Deli_Cocktail_House_ERP\scripts\mark-absent-dch007-24aug2026.js
 */

const fs = require("fs");
const path = require("path");

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

const EMPLOYEE_ID = "DCH-007";
// 24 Aug 2026 UTC bounds for IST (IST = UTC+5:30)
const DAY_START_UTC = new Date("2026-08-23T18:30:00.000Z"); // 24 Aug 00:00 IST
const DAY_END_UTC   = new Date("2026-08-24T18:29:59.999Z"); // 24 Aug 23:59:59.999 IST

async function main() {
  console.log(`Searching employee: ${EMPLOYEE_ID}...`);
  const emp = await prisma.employee.findUnique({
    where: { employeeId: EMPLOYEE_ID },
    select: { id: true, name: true, employeeId: true },
  });

  if (!emp) {
    console.error(`Employee with ID ${EMPLOYEE_ID} not found.`);
    return;
  }

  console.log(`Found employee: ${emp.name} (${emp.employeeId}) [${emp.id}]`);

  // Check for any attendance record on 24 Aug 2026
  const existingRecord = await prisma.attendance.findFirst({
    where: {
      employeeId: emp.id,
      date: { gte: DAY_START_UTC, lte: DAY_END_UTC },
    },
  });

  if (!existingRecord) {
    console.log("No attendance record found for 24 Aug 2026. Creating an ABSENT record...");
    // 24 Aug 2026 at 00:00 UTC
    const dateObj = new Date("2026-08-24T00:00:00.000Z");
    const created = await prisma.attendance.create({
      data: {
        employeeId: emp.id,
        date: dateObj,
        status: "ABSENT",
        correctedByAdmin: true,
        correctedAt: new Date(),
        previousStatus: null,
      },
    });
    console.log("Created ABSENT record successfully:", created.id);
    return;
  }

  console.log("Current Record on 24 Aug 2026:");
  console.log("  Record ID       :", existingRecord.id);
  console.log("  Date            :", existingRecord.date);
  console.log("  Status          :", existingRecord.status);
  console.log("  Check-In Time   :", existingRecord.checkInTime ?? "None");
  console.log("  Check-Out Time  :", existingRecord.checkOutTime ?? "None");
  console.log("  Corrected By Admin:", existingRecord.correctedByAdmin);

  // Update status to ABSENT, clear punch times, record correction
  const updated = await prisma.attendance.update({
    where: { id: existingRecord.id },
    data: {
      status: "ABSENT",
      checkInTime: null,
      checkOutTime: null,
      checkOutLatitude: null,
      checkOutLongitude: null,
      latitude: null,
      longitude: null,
      correctedByAdmin: true,
      previousStatus: existingRecord.status,
      correctedAt: new Date(),
    },
  });

  console.log("\n✅ Successfully updated attendance to ABSENT:");
  console.log("  Employee        :", emp.name, `(${emp.employeeId})`);
  console.log("  New Status      :", updated.status);
  console.log("  Previous Status :", updated.previousStatus);
  console.log("  Corrected At    :", updated.correctedAt);
}

main()
  .catch((err) => {
    console.error("Error executing script:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
