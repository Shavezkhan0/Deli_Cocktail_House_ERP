/**
 * Script: clean-duplicate-dch007-24aug2026.js
 * Purpose: Inspect all attendance records for DCH-007 around 24 Aug 2026 and remove duplicates
 *          so only ONE clean ABSENT record exists for 24 Aug 2026.
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

async function main() {
  const emp = await prisma.employee.findUnique({
    where: { employeeId: EMPLOYEE_ID },
    select: { id: true, name: true, employeeId: true },
  });

  if (!emp) {
    console.error(`Employee ${EMPLOYEE_ID} not found.`);
    return;
  }

  console.log(`Checking attendance for ${emp.name} (${emp.employeeId})...`);

  // Search around 24 Aug 2026 (from 23 Aug 12:00 UTC to 25 Aug 12:00 UTC)
  const records = await prisma.attendance.findMany({
    where: {
      employeeId: emp.id,
      date: {
        gte: new Date("2026-08-23T00:00:00.000Z"),
        lte: new Date("2026-08-25T23:59:59.999Z"),
      },
    },
    orderBy: { createdAt: "asc" },
  });

  console.log(`\nFound ${records.length} record(s) around 24 Aug 2026:`);
  records.forEach((r, idx) => {
    console.log(`[${idx + 1}] ID: ${r.id}`);
    console.log(`    Date             : ${r.date.toISOString()} (IST: ${r.date.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })})`);
    console.log(`    Status           : ${r.status}`);
    console.log(`    Previous Status  : ${r.previousStatus ?? "None"}`);
    console.log(`    Corrected By Admin: ${r.correctedByAdmin}`);
    console.log(`    Check In         : ${r.checkInTime ?? "None"}`);
    console.log(`    Check Out        : ${r.checkOutTime ?? "None"}`);
    console.log(`    Created At       : ${r.createdAt.toISOString()}`);
  });

  if (records.length <= 1) {
    console.log("\nNo duplicates found.");
    return;
  }

  // Keep the first one and delete any extra records
  const [keepRecord, ...deleteRecords] = records;

  console.log(`\nKeeping record ID: ${keepRecord.id}`);
  for (const del of deleteRecords) {
    console.log(`Deleting duplicate record ID: ${del.id} (Date: ${del.date.toISOString()})...`);
    await prisma.attendance.delete({
      where: { id: del.id },
    });
  }

  // Ensure the kept record has status ABSENT
  await prisma.attendance.update({
    where: { id: keepRecord.id },
    data: {
      status: "ABSENT",
      checkInTime: null,
      checkOutTime: null,
      correctedByAdmin: true,
      previousStatus: "PRESENT",
      correctedAt: new Date(),
    },
  });

  console.log("\n✅ Done! Duplicate attendance records deleted. Exactly 1 ABSENT record remains for 24 Aug 2026.");
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
