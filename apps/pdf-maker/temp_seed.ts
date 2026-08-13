import { LIBRARY } from "./src/lib/functions";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding from LIBRARY...");
  for (let index = 0; index < LIBRARY.length; index++) {
    const template = LIBRARY[index];
    console.log("Seeding template:", template.name);

    await prisma.proposalFunctionTemplate.upsert({
      where: { id: template.id },
      update: {
        name: template.name,
        category: template.category,
        sortOrder: index,
      },
      create: {
        id: template.id,
        name: template.name,
        category: template.category,
        sortOrder: index,
      },
    });

    await prisma.proposalBlockTemplate.deleteMany({
      where: { functionId: template.id },
    });

    await prisma.proposalBlockTemplate.createMany({
      data: template.blocks.map((block, blockIndex) => ({
        id: block.id,
        functionId: template.id,
        type: block.type.toUpperCase(),
        sortOrder: blockIndex,
        title: block.title,
        value: block.value ?? null,
        description: block.description ?? null,
        items: block.items ?? null,
      })),
    });
  }
  console.log(`Successfully seeded ${LIBRARY.length} templates.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
