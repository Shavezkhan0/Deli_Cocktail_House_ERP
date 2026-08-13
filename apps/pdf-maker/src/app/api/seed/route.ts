import { LIBRARY } from "@/lib/functions";
import { prisma } from "@repo/database";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await prisma.proposalBlockTemplate.deleteMany();
    for (let index = 0; index < LIBRARY.length; index++) {
      const template = LIBRARY[index];
      
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

    return NextResponse.json({ success: true, count: LIBRARY.length });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
