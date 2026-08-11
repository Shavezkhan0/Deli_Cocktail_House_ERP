import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@repo/database";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";
import { renderProposalPdf } from "@/lib/browser-pdf";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!verifySessionToken(token) || !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { message: "Missing event id" },
      { status: 400 },
    );
  }

  const event = await prisma.pdfEvent.findUnique({
    where: { id },
    include: { functions: { orderBy: { date: "asc" } } },
  });
  if (!event) {
    return NextResponse.json({ message: "Event not found" }, { status: 404 });
  }

  const settings = await prisma.pdfCompanySettings.findFirst({
    orderBy: { createdAt: "asc" },
  });

  let pdf: Uint8Array;
  try {
    pdf = await renderProposalPdf({
      eventId: event.id,
      baseUrl: request.nextUrl.origin,
      sessionToken: token,
      company: settings ?? undefined,
    });
  } catch (error) {
    console.error("generate-pdf failed:", error);
    return NextResponse.json(
      { message: "Failed to generate PDF." },
      { status: 500 },
    );
  }

  const filename = `${event.eventId.replace(/[^a-zA-Z0-9_-]+/g, "_")}-proposal.pdf`;

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
