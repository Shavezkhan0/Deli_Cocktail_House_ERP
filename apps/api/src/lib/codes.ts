import { Prisma } from "@repo/database";
import { prisma } from "@repo/database";

export async function nextSequentialCode(
  prefix: string,
  digits: number,
  readCodes: () => Promise<string[]>,
): Promise<string> {
  const codes = await readCodes();
  const max = codes.reduce((acc, code) => {
    const numeric = Number.parseInt(code.replace(`${prefix}-`, ""), 10);
    return Number.isNaN(numeric) ? acc : Math.max(acc, numeric);
  }, 0);
  return `${prefix}-${String(max + 1).padStart(digits, "0")}`;
}

export async function nextEventCode(): Promise<string> {
  return nextSequentialCode("EVT", 4, async () => {
    const events = await prisma.event.findMany({
      orderBy: { eventDate: "desc" },
      take: 100,
      select: { eventCode: true },
    });
    return events.map((event) => event.eventCode);
  });
}

export async function nextComplainCode(): Promise<string> {
  return nextSequentialCode("CMP", 4, async () => {
    const complains = await prisma.complain.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { complainId: true },
    });
    return complains.map((complain) => complain.complainId);
  });
}

export async function nextItemSku(): Promise<string> {
  return nextSequentialCode("DCH", 4, async () => {
    const items = await prisma.item.findMany({
      where: { sku: { startsWith: "DCH-" } },
      orderBy: { createdAt: "desc" },
      select: { sku: true },
    });
    return items.map((item) => item.sku);
  });
}

export async function createWithSequentialCode<T>(
  generateCode: () => Promise<string>,
  create: (code: string) => Promise<T>,
  maxAttempts = 5,
): Promise<T> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const code = await generateCode();
    try {
      return await create(code);
    } catch (error) {
      if (
        attempt < maxAttempts - 1 &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        continue;
      }
      throw error;
    }
  }
  throw new Error("Failed to generate a unique code");
}
