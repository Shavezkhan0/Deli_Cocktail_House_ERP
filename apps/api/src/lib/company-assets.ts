import fs from "fs";
import path from "path";

// Drop your files here (see apps/api/assets/README.md):
//   apps/api/assets/company-logo.png    (or .jpg/.jpeg)
//   apps/api/assets/company-stamp.png   (or .jpg/.jpeg)
const ASSETS_DIR = path.join(process.cwd(), "assets");

function readFirst(names: string[]): Buffer | undefined {
  for (const name of names) {
    try {
      const p = path.join(ASSETS_DIR, name);
      if (fs.existsSync(p)) return fs.readFileSync(p);
    } catch {
      // ignore and try the next candidate
    }
  }
  return undefined;
}

async function fetchImage(url?: string | null): Promise<Buffer | undefined> {
  if (!url) return undefined;
  try {
    const res = await fetch(url);
    if (!res.ok) return undefined;
    const type = res.headers.get("content-type") ?? "";
    if (!type.startsWith("image/png") && !type.startsWith("image/jpeg")) {
      return undefined;
    }
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return undefined;
  }
}

/** Company logo bytes: local file first, then a stored URL (PdfCompanySettings.logoUrl / headerLogoUrl). */
export async function loadCompanyLogo(
  url?: string | null,
): Promise<Buffer | undefined> {
  return (
    readFirst(["company-logo.png", "company-logo.jpg", "company-logo.jpeg"]) ??
    (await fetchImage(url))
  );
}

/** Company stamp/seal bytes: local file only. */
export function loadCompanyStamp(): Buffer | undefined {
  return readFirst([
    "company-stamp.png",
    "company-stamp.jpg",
    "company-stamp.jpeg",
  ]);
}