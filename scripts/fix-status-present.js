const { PrismaClient } = require("../packages/database/dist/index.js");
const prisma = new PrismaClient();

async function main() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const end   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const emp = await prisma.employee.findUnique({
    where: { employeeId: "DCH-006" },
    select: { id: true, name: true },
  });

  if (!emp) { console.log("Employee not found"); return; }

  const updated = await prisma.attendance.updateMany({
    where: { employeeId: emp.id, date: { gte: start, lte: end } },
    data: { status: "PRESENT" },
  });

  console.log("Employee      :", emp.name);
  console.log("Records updated:", updated.count);
  console.log("Status set to  : PRESENT");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
