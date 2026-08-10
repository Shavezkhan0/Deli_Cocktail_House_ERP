import { existsSync } from "node:fs";
import puppeteer from "puppeteer-core";
import { SESSION_COOKIE } from "@/lib/session";

export type BrowserPdfCompany = {
  companyName?: string | null;
  logoUrl?: string | null;
  headerLogoUrl?: string | null;
  address?: string | null;
  phone1?: string | null;
  phone2?: string | null;
  email?: string | null;
};

export type RenderProposalPdfInput = {
  eventId: string;
  baseUrl: string;
  sessionToken: string;
  company?: BrowserPdfCompany;
};

const CHROME_CANDIDATES = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
];

function resolveChromeExecutable(): string {
  if (process.env.PDF_CHROME_PATH) {
    if (existsSync(process.env.PDF_CHROME_PATH)) {
      return process.env.PDF_CHROME_PATH;
    }
    throw new Error(
      `PDF_CHROME_PATH is set but the file does not exist: ${process.env.PDF_CHROME_PATH}`,
    );
  }
  const found = CHROME_CANDIDATES.find((candidate) => existsSync(candidate));
  if (!found) {
    throw new Error(
      "No Chrome or Edge executable found. Install Chrome or set PDF_CHROME_PATH.",
    );
  }
  return found;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function guessMimeType(url: string): string {
  if (/\.(png|jpe?g|webp|gif|avif)(\?|#|$)/i.test(url)) {
    if (/\.jpe?g/i.test(url)) {
      return "image/jpeg";
    }
    if (/\.webp/i.test(url)) {
      return "image/webp";
    }
    if (/\.gif/i.test(url)) {
      return "image/gif";
    }
    if (/\.avif/i.test(url)) {
      return "image/avif";
    }
    return "image/png";
  }
  if (/\.svg(\?|#|$)/i.test(url)) {
    return "image/svg+xml";
  }
  return "image/png";
}

async function toDataUri(
  url: string | null | undefined,
): Promise<string | null> {
  if (!url) {
    return null;
  }
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType =
      response.headers.get("content-type") ?? guessMimeType(url);
    return `data:${contentType};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}

function buildHeaderTemplate(
  logoDataUri: string | null,
  companyName: string,
): string {
  const brand = logoDataUri
    ? `<img src="${logoDataUri}" alt="" style="height:10mm; width:auto; display:block;" />`
    : `<span style="font-size:9px; font-weight:700; color:#0f172a; white-space:nowrap;">${escapeHtml(
        companyName,
      )}</span>`;

  return `<div style="width:100%; padding:0 12mm; box-sizing:border-box; font-family:Helvetica,Arial,sans-serif; display:flex; align-items:center; justify-content:space-between; -webkit-print-color-adjust:exact;">
  ${brand}
  <span style="font-size:8px; color:#71717a; white-space:nowrap;">Event Proposal</span>
</div>`;
}

function buildFooterTemplate(company: BrowserPdfCompany): string {
  const phones = [company.phone1, company.phone2]
    .filter(Boolean)
    .join("  |  ");
  const contact = [company.address, phones, company.email]
    .filter(Boolean)
    .join("   ·   ");

  return `<div style="width:100%; padding:0 12mm; box-sizing:border-box; font-family:Helvetica,Arial,sans-serif; font-size:8px; color:#71717a; display:flex; align-items:center; justify-content:space-between;">
  <span style="overflow:hidden; white-space:nowrap; text-overflow:ellipsis;">${escapeHtml(
    contact,
  )}</span>
  <span style="white-space:nowrap; margin-left:12px;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
</div>`;
}

export async function renderProposalPdf({
  eventId,
  baseUrl,
  sessionToken,
  company,
}: RenderProposalPdfInput): Promise<Uint8Array> {
  const executablePath = resolveChromeExecutable();

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setCookie({
      name: SESSION_COOKIE,
      value: sessionToken,
      domain: new URL(baseUrl).hostname,
      path: "/",
    });

    const target = `${baseUrl}/events/${eventId}/pdf?forPrint=1`;
    await page.goto(target, {
      waitUntil: "networkidle0",
      timeout: 60_000,
    });

    if (page.url().includes("/login")) {
      throw new Error("Failed to authenticate the PDF preview page.");
    }

    await page.emulateMediaType("print");

    const logoDataUri = await toDataUri(
      company?.headerLogoUrl ?? company?.logoUrl,
    );
    const headerTemplate = buildHeaderTemplate(
      logoDataUri,
      company?.companyName ?? "Deli Cocktail House",
    );
    const footerTemplate = buildFooterTemplate(company ?? {});

    return await page.pdf({
      format: "A4",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate,
      footerTemplate,
      margin: {
        top: "16mm",
        bottom: "18mm",
        left: "13mm",
        right: "13mm",
      },
      preferCSSPageSize: false,
    });
  } finally {
    await browser.close();
  }
}
