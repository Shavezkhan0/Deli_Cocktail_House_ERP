import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@repo/database";
import { buildProposalPdf } from "@/lib/pdf";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!verifySessionToken(token)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { id } = await params;

  const event = await prisma.pdfEvent.findUnique({
    where: { id },
    include: { functions: { orderBy: { date: "asc" } } },
  });

  if (!event) {
    return NextResponse.json({ message: "Event not found" }, { status: 404 });
  }

  const company =
    (await prisma.pdfCompanySettings.findFirst({
      orderBy: { createdAt: "asc" },
    })) ?? {};

  const pdf = await buildProposalPdf(company, event, event.functions);
  const filename = `${event.eventId.replace(/[^a-zA-Z0-9_-]+/g, "_")}-proposal.pdf`;

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
