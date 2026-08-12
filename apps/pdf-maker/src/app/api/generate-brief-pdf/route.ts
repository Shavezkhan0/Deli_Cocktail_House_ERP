import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma, Prisma } from "@repo/database";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const briefFunctionSchema = z.object({
  functionType: z.string().min(1),
  templateId: z.string().min(1),
  blocks: z.array(z.any()),
  pax: z.string(),
  bartenders: z.string(),
  butlers: z.string(),
});

const teamFlowRowSchema = z.object({
  id: z.string(),
  date: z.string(),
  functionType: z.string(),
  venue: z.string().optional(),
  pax: z.string(),
  bartenders: z.number(),
  butlers: z.number(),
});

const payloadSchema = z.object({
  eventName: z.string().min(1),
  clientName: z.string().min(1),
  venue: z.string().min(1),
  eventType: z.enum(["SINGLE", "DESTINATION"]),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  functions: z.array(briefFunctionSchema).min(1),
  teamFlow: z.array(teamFlowRowSchema).optional(),
});

function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (Array.isArray(value) && value.length === 0) {
    return undefined;
  }
  return value as Prisma.InputJsonValue;
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!verifySessionToken(token) || !token) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  let parsed;
  try {
    parsed = payloadSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ message: "Invalid payload." }, { status: 400 });
  }

  const startDate = new Date(parsed.startDate);
  const endDate = new Date(parsed.endDate);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return NextResponse.json({ message: "Invalid dates." }, { status: 400 });
  }
  if (endDate < startDate) {
    return NextResponse.json(
      { message: "End date must be on or after the start date." },
      { status: 400 },
    );
  }

  const guestCount = parsed.functions.reduce((max, fn) => {
    const pax = Number.parseInt(fn.pax, 10);
    return Number.isFinite(pax) ? Math.max(max, pax) : max;
  }, 0);

  try {
    const proposal = await prisma.eventProposal.create({
      data: {
        eventName: parsed.eventName.trim(),
        clientName: parsed.clientName.trim(),
        venue: parsed.venue.trim(),
        eventDate: startDate,
        guestCount,
        teamFlowJson: toJson(parsed.teamFlow),
        functions: {
          create: parsed.functions.map((fn, index) => ({
            functionId: fn.templateId,
            sortOrder: index,
            overrideJson: toJson(fn.blocks),
          })),
        },
      },
    });

    return NextResponse.json({ url: `/events/${proposal.id}/pdf` });
  } catch (error) {
    console.error("generate-brief-pdf failed:", error);
    return NextResponse.json(
      { message: "Failed to save the event brief." },
      { status: 500 },
    );
  }
}
