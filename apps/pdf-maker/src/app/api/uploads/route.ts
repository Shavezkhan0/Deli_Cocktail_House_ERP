import { NextRequest, NextResponse } from "next/server";
import { uploadAsset } from "@/lib/supabase";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!verifySessionToken(token)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { message: "Invalid request body." },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  const folder = typeof formData.get("folder") === "string" ? (formData.get("folder") as string) : "logos";

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ message: "No file uploaded" }, { status: 400 });
  }

  try {
    const url = await uploadAsset(file, folder);
    return NextResponse.json({ url });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to upload file";
    return NextResponse.json({ message }, { status: 500 });
  }
}
