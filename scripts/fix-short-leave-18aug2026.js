/**
 * Script: fix-short-leave-18aug2026.js
 * Purpose: One-off data fix for the timezone bug that wrongly downgraded PRESENT
 *          attendance to SHORT_LEAVE when an employee checked out on/after 5:30 PM
 *          IST (the bug compared checkout time using the server's own timezone
 *          instead of IST, so an on-time checkout could look "early").
 *
 *          This script only touches Attendance rows dated 18 Aug 2026 with
 *          status = SHORT_LEAVE. For each one, it recomputes what the status
 *          SHOULD have been using the check-in/check-out rules that were live
 *          on that date (PRESENT if check-in < 10:45 AM IST, SHORT_LEAVE if
 *          <= 11:30 AM IST, else HALF_DAY; then downgraded to SHORT_LEAVE only
 *          if checkout was before 5:30 PM IST) — computed correctly in IST this
 *          time. It only updates a record if the correct value differs from
 *          what's stored, so a genuinely-late check-in that's correctly marked
 *          SHORT_LEAVE is left untouched.
 *
 * Usage:
 *   node fix-short-leave-18aug2026.js
 *
 * Requirements:
 *   - Run from: Deli_Cocktail_House_ERP\scripts\
 *   - DATABASE_URL is read from packages/database/.env automatically
 */

const { PrismaClient } = require("../packages/database/dist/index.js");
const prisma = new PrismaClient();

// 18 Aug 2026, IST calendar day, expressed as UTC bounds (IST = UTC+5:30, no DST)
const DAY_START_UTC = new Date("2026-08-17T18:30:00.000Z"); // 18 Aug 2026 00:00 IST
const DAY_END_UTC = new Date("2026-08-18T18:29:59.999Z"); // 18 Aug 2026 23:59:59.999 IST

// Thresholds that were actually in effect on 18 Aug 2026 (before today's rule change)
const CHECK_IN_PRESENT_CUTOFF = 10 * 60 + 45; // before this → PRESENT
const CHECK_IN_SHORT_LEAVE_CUTOFF = 11 * 60 + 30; // at/before this → SHORT_LEAVE, after → HALF_DAY
const SHIFT_END = 17 * 60 + 30; // 5:30 PM

function istMinutes(date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const hour = Number(parts.find((p) => p.type === "hour").value);
  const minute = Number(parts.find((p) => p.type === "minute").value);
  return hour * 60 + minute;
}

function expectedStatus(checkInTime, checkOutTime) {
  const checkInMinutes = istMinutes(checkInTime);
  let status;
  if (checkInMinutes < CHECK_IN_PRESENT_CUTOFF) {
    status = "PRESENT";
  } else if (checkInMinutes <= CHECK_IN_SHORT_LEAVE_CUTOFF) {
    status = "SHORT_LEAVE";
  } else {
    status = "HALF_DAY";
  }

  if (checkOutTime && status === "PRESENT") {
    const checkOutMinutes = istMinutes(checkOutTime);
    if (checkOutMinutes < SHIFT_END) {
      status = "SHORT_LEAVE";
    }
  }

  return status;
}

async function main() {
  const candidates = await prisma.attendance.findMany({
    where: {
      date: { gte: DAY_START_UTC, lte: DAY_END_UTC },
      status: "SHORT_LEAVE",
      checkInTime: { not: null },
      checkOutTime: { not: null },
    },
    include: { employee: { select: { name: true, employeeId: true } } },
  });

  console.log(`Found ${candidates.length} SHORT_LEAVE record(s) on 18 Aug 2026 with both check-in and check-out.\n`);

  let fixed = 0;

  for (const record of candidates) {
    const correct = expectedStatus(record.checkInTime, record.checkOutTime);
    const checkInIST = record.checkInTime.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    const checkOutIST = record.checkOutTime.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

    if (correct === record.status) {
      console.log(`- ${record.employee.name} (${record.employee.employeeId}): in ${checkInIST}, out ${checkOutIST} — already correct (${record.status}), skipping`);
      continue;
    }

    console.log(`- ${record.employee.name} (${record.employee.employeeId}): in ${checkInIST}, out ${checkOutIST} — was ${record.status}, fixing to ${correct}`);

    await prisma.attendance.update({
      where: { id: record.id },
      data: { status: correct },
    });
    fixed += 1;
  }

  console.log(`\nDone. Fixed ${fixed} of ${candidates.length} record(s).`);
}

main()
  .catch((e) => {
    console.error("Script failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
