const { PrismaClient } = require("../packages/database/dist/index.js");
const prisma = new PrismaClient();

// ── NEW ADMINS TO ADD ────────────────────────────
const ADMINS = [
  { email: "Namitdembla@gmail.com",    name: "Namit Dembla" },
  { email: "mohitchandani0007@gmail.com", name: "Mohit Chandani" },
];
// ────────────────────────────────────────────────

async function main() {
  console.log("Adding admins...\n");

  for (const admin of ADMINS) {
    const existing = await prisma.admin.findUnique({
      where: { email: admin.email },
    });

    if (existing) {
      console.log(`⚠️  SKIPPED  : ${admin.email} (already exists)`);
      continue;
    }

    const created = await prisma.admin.create({
      data: {
        email: admin.email,
        name:  admin.name,
        // role defaults to ADMIN via schema
      },
    });

    console.log(`✅ CREATED  : ${created.email}  |  ID: ${created.id}`);
  }

  console.log("\nDone.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
