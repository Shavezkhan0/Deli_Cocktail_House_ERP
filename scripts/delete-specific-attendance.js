const { PrismaClient } = require("../packages/database/dist/index.js");
const prisma = new PrismaClient();

// ── CONFIG ──────────────────────────────────────
const EMPLOYEE_ID   = "DCH-001";
const TARGET_DATE   = new Date(2026, 7, 14); // Month is 0-indexed: 7 = August
// ────────────────────────────────────────────────

async function main() {
  const start = new Date(TARGET_DATE.getFullYear(), TARGET_DATE.getMonth(), TARGET_DATE.getDate(), 0, 0, 0, 0);
  const end   = new Date(TARGET_DATE.getFullYear(), TARGET_DATE.getMonth(), TARGET_DATE.getDate(), 23, 59, 59, 999);

  const emp = await prisma.employee.findUnique({
    where: { employeeId: EMPLOYEE_ID },
    select: { id: true, name: true },
  });

  if (!emp) { console.log("Employee not found"); return; }
  console.log("Employee:", emp.name, "(", EMPLOYEE_ID, ")");

  const record = await prisma.attendance.findFirst({
    where: { employeeId: emp.id, date: { gte: start, lte: end } },
  });

  if (!record) {
    console.log("No attendance record found for 17 Aug 2026. Nothing to delete.");
    return;
  }

  console.log("Found record:");
  console.log("  ID        :", record.id);
  console.log("  Date      :", record.date);
  console.log("  Status    :", record.status);
  console.log("  Check-in  :", record.checkInTime ?? "-");
  console.log("  Check-out :", record.checkOutTime ?? "-");

  await prisma.attendance.delete({ where: { id: record.id } });

  console.log("\nAttendance record DELETED completely.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
