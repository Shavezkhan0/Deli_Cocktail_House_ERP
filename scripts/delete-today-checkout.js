/**
 * Script: delete-today-checkout.js
 * Purpose: Delete today's checkout attendance record for a specific employee.
 *          If the employee has already checked in but not out, this script
 *          clears the checkOutTime (and related fields) so they can check out again.
 *          If you want to delete the ENTIRE attendance record for today, set
 *          DELETE_ENTIRE_RECORD = true below.
 *
 * Usage:
 *   node delete-today-checkout.js
 *
 * Requirements:
 *   - Run from: Deli_Cocktail_House_ERP\scripts\
 *   - DATABASE_URL is read from packages/database/.env automatically
 */

const { PrismaClient } = require("../packages/database/dist/index.js");
// DATABASE_URL is loaded via: node --env-file=packages/database/.env

// ─────────────────────────────────────────────
//  ✏️  CONFIGURE THESE BEFORE RUNNING
// ─────────────────────────────────────────────

// The Employee's `employeeId` field (e.g. "EMP001"), NOT the internal cuid `id`.
const EMPLOYEE_ID_VALUE = "DCH-006"; // e.g. "EMP001"

// Set to true  → delete the ENTIRE attendance record for today (check-in + check-out)
// Set to false → only clear the checkout fields (checkOutTime, checkOutLatitude, checkOutLongitude)
const DELETE_ENTIRE_RECORD = false;

// ─────────────────────────────────────────────

const prisma = new PrismaClient();

async function main() {
  // Build today's date range (midnight-to-midnight, local time)
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfDay   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  console.log(`\n📅 Today's range: ${startOfDay.toISOString()} → ${endOfDay.toISOString()}`);
  console.log(`👤 Employee ID  : ${EMPLOYEE_ID_VALUE}\n`);

  // 1. Find the employee by their employeeId string
  const employee = await prisma.employee.findUnique({
    where: { employeeId: EMPLOYEE_ID_VALUE },
    select: { id: true, name: true, employeeId: true },
  });

  if (!employee) {
    console.error(`❌ No employee found with employeeId = "${EMPLOYEE_ID_VALUE}"`);
    process.exit(1);
  }

  console.log(`✅ Found employee: ${employee.name} (internal id: ${employee.id})`);

  // 2. Find today's attendance record
  const record = await prisma.attendance.findFirst({
    where: {
      employeeId: employee.id,
      date: { gte: startOfDay, lte: endOfDay },
    },
  });

  if (!record) {
    console.log(`ℹ️  No attendance record found for today. Nothing to delete.`);
    process.exit(0);
  }

  console.log(`\n📋 Found attendance record:`);
  console.log(`   ID           : ${record.id}`);
  console.log(`   Date         : ${record.date}`);
  console.log(`   Status       : ${record.status}`);
  console.log(`   Check-in     : ${record.checkInTime ?? "—"}`);
  console.log(`   Check-out    : ${record.checkOutTime ?? "—"}`);

  if (DELETE_ENTIRE_RECORD) {
    // Delete the whole attendance row
    await prisma.attendance.delete({ where: { id: record.id } });
    console.log(`\n🗑️  Entire attendance record deleted successfully.`);
  } else {
    // Only clear the checkout fields
    if (!record.checkOutTime) {
      console.log(`\nℹ️  checkOutTime is already empty — nothing to clear.`);
      process.exit(0);
    }

    await prisma.attendance.update({
      where: { id: record.id },
      data: {
        checkOutTime:      null,
        checkOutLatitude:  null,
        checkOutLongitude: null,
      },
    });
    console.log(`\n✅ Checkout fields cleared successfully. Employee can now check out again.`);
  }
}

main()
  .catch((e) => {
    console.error("❌ Script failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

