import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";
import { getProposalPdfData } from "@/lib/proposal-pdf-data";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!verifySessionToken(token) || !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { id } = await params;

  const data = await getProposalPdfData(id);
  if (!data) {
    return NextResponse.json({ message: "Event not found" }, { status: 404 });
  }

  return NextResponse.json({ data });
}
