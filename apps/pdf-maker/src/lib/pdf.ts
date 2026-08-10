import PDFDocument from "pdfkit";
import { parseDescription, parseTemplateData } from "./function-templates";

export type ProposalCompany = {
  companyName?: string | null;
  logoUrl?: string | null;
  headerLogoUrl?: string | null;
  address?: string | null;
  phone1?: string | null;
  phone2?: string | null;
  email?: string | null;
  footerText?: string | null;
  defaultFont?: string | null;
  defaultTheme?: string | null;
  defaultTerms?: string | null;
  defaultDeliverables?: unknown;
  defaultMixers?: unknown;
};

export type ProposalFunction = {
  functionName: string;
  date: Date;
  startTime?: string | null;
  endTime?: string | null;
  pax?: number | null;
  bartenders?: number | null;
  butlers?: number | null;
  siteManager?: string | null;
  theme?: string | null;
  description?: string | null;
  notes?: string | null;
  templateData?: unknown;
};

export type ProposalEvent = {
  eventName: string;
  startDate: Date;
  endDate: Date;
  venue?: string | null;
  city?: string | null;
  state?: string | null;
  eventType?: string | null;
  packageType?: string | null;
  packagePax?: number | null;
  clientName?: string | null;
  clientContact?: string | null;
  specialInstructions?: string | null;
  pdfTitle?: string | null;
  status?: string | null;
  deliverables?: unknown;
  mixers?: unknown;
};

const THEME_ACCENTS: Record<string, { primary: string; accent: string }> = {
  modern: { primary: "#0f172a", accent: "#0ea5e9" },
  classic: { primary: "#1e3a5f", accent: "#c9a227" },
  elegant: { primary: "#3b0764", accent: "#c026d3" },
  minimal: { primary: "#18181b", accent: "#52525b" },
};

const PAGE_WIDTH = 595.28; // A4
const PAGE_HEIGHT = 841.89;
const MARGIN = 48;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}

function formatDate(value: Date): string {
  return value.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }
  return value;
}

function italicFont(font: string): string {
  if (font === "Helvetica") {
    return "Helvetica-Oblique";
  }
  if (font === "Courier") {
    return "Courier-Oblique";
  }
  return `${font}-Italic`;
}

async function fetchImageBuffer(
  url: string | null | undefined,
): Promise<Buffer | null> {
  if (!url) {
    return null;
  }
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }
    return Buffer.from(await response.arrayBuffer());
  } catch {
    return null;
  }
}

function ensureSpace(
  doc: PDFKit.PDFDocument,
  needed: number,
  footerText: string | null | undefined,
): void {
  if (doc.y + needed > PAGE_HEIGHT - MARGIN) {
    doc.addPage();
    drawFooter(doc, footerText);
  }
}

function drawFooter(
  doc: PDFKit.PDFDocument,
  footerText: string | null | undefined,
): void {
  const page = doc.page;
  if (page) {
    page.margins = { left: MARGIN, right: MARGIN, top: MARGIN, bottom: 36 };
  }
  doc.fontSize(8).fillColor("#71717a");
  if (footerText) {
    doc.text(footerText, MARGIN, PAGE_HEIGHT - 28, {
      width: CONTENT_WIDTH,
      align: "center",
    });
  }
  const range = doc.bufferedPageRange();
  doc.text(
    `Page ${range.start + range.count}`,
    MARGIN,
    PAGE_HEIGHT - 28,
    { width: CONTENT_WIDTH, align: "right" },
  );
}

function drawEventDetails(
  doc: PDFKit.PDFDocument,
  event: ProposalEvent,
): void {
  const rows: [string, string][] = [
    ["Event Date", `${formatDate(event.startDate)} — ${formatDate(event.endDate)}`],
    ["Venue", event.venue ?? "—"],
    ["City / State", `${event.city ?? "—"}${event.state ? `, ${event.state}` : ""}`],
    ["Client", event.clientName ?? "—"],
    ["Contact", event.clientContact ?? "—"],
    ["Event Type", event.eventType ?? "—"],
    ["Package", event.packageType ?? "—"],
    ["Pax", event.packagePax != null ? String(event.packagePax) : "—"],
  ];

  const rowHeight = 18;
  ensureSpace(doc, rows.length * rowHeight + 8, null);

  const boxX = MARGIN;
  const boxY = doc.y;
  const boxHeight = rows.length * rowHeight + 16;

  doc
    .save()
    .roundedRect(boxX, boxY, CONTENT_WIDTH, boxHeight, 6)
    .fill("#f4f4f5");

  rows.forEach(([label, value], index) => {
    const y = boxY + 10 + index * rowHeight;
    doc
      .font("Helvetica-Bold")
      .fontSize(8.5)
      .fillColor("#71717a")
      .text(label.toUpperCase(), boxX + 12, y, { width: 90 });
    doc
      .font("Helvetica")
      .fontSize(9.5)
      .fillColor("#18181b")
      .text(value, boxX + 108, y, { width: CONTENT_WIDTH - 120 });
  });

  doc.y = boxY + boxHeight + 16;
}

function drawFunctionsTable(
  doc: PDFKit.PDFDocument,
  functions: ProposalFunction[],
  theme: string,
  footerText: string | null | undefined,
): void {
  if (functions.length === 0) {
    return;
  }

  const { primary, accent } = THEME_ACCENTS[theme] ?? THEME_ACCENTS.modern;
  const columns: { label: string; width: number; get: (f: ProposalFunction) => string }[] = [
    { label: "FUNCTION", width: 115, get: (f) => f.functionName },
    { label: "DATE", width: 72, get: (f) => formatDate(f.date) },
    { label: "TIME", width: 60, get: (f) => `${formatTime(f.startTime)}–${formatTime(f.endTime)}` },
    { label: "PAX", width: 42, get: (f) => (f.pax != null ? String(f.pax) : "—") },
    { label: "BAR / BUTL", width: 72, get: (f) => `${f.bartenders ?? 0}/${f.butlers ?? 0}` },
    { label: "SITE MANAGER", width: 72, get: (f) => f.siteManager ?? "—" },
    { label: "THEME", width: 62, get: (f) => f.theme ?? "—" },
  ];
  const rowHeight = 22;
  const headerHeight = 26;
  const totalWidth = columns.reduce((sum, col) => sum + col.width, 0);
  const startX = MARGIN + (CONTENT_WIDTH - totalWidth) / 2;

  ensureSpace(doc, headerHeight + rowHeight * functions.length + 16, footerText);

  doc
    .save()
    .rect(startX, doc.y, totalWidth, headerHeight)
    .fill(primary);

  let x = startX;
  columns.forEach((col) => {
    doc
      .font("Helvetica-Bold")
      .fontSize(7.5)
      .fillColor("#ffffff")
      .text(col.label, x + 6, doc.y + 8, { width: col.width - 8 });
    x += col.width;
  });
  doc.y += headerHeight;

  functions.forEach((fn, index) => {
    const y = doc.y;
    doc
      .save()
      .rect(startX, y, totalWidth, rowHeight)
      .fill(index % 2 === 0 ? "#ffffff" : "#f4f4f5");
    x = startX;
    columns.forEach((col) => {
      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor("#18181b")
        .text(col.get(fn), x + 6, y + 7, { width: col.width - 8 });
      x += col.width;
    });
    doc
      .save()
      .moveTo(startX, y + rowHeight)
      .lineTo(startX + totalWidth, y + rowHeight)
      .lineWidth(0.5)
      .strokeColor("#e4e4e7")
      .stroke()
      .restore();
    doc.y = y + rowHeight;
  });

  doc
    .strokeColor(accent)
    .lineWidth(2)
    .moveTo(startX, doc.y)
    .lineTo(startX + totalWidth, doc.y)
    .stroke();

  doc.y += 18;
}

function drawBulletList(
  doc: PDFKit.PDFDocument,
  title: string,
  items: string[],
  footerText: string | null | undefined,
): void {
  if (items.length === 0) {
    return;
  }
  ensureSpace(doc, 24 + items.length * 14, footerText);

  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("#18181b")
    .text(title, MARGIN, doc.y, { width: CONTENT_WIDTH });

  items.forEach((item) => {
    doc
      .font("Helvetica")
      .fontSize(9.5)
      .fillColor("#3f3f46")
      .text(`•  ${item}`, MARGIN + 4, doc.y + 2, {
        width: CONTENT_WIDTH - 12,
        lineGap: 4,
      });
    doc.y += 14;
  });

  doc.y += 6;
}

function drawFunctionDetails(
  doc: PDFKit.PDFDocument,
  functions: ProposalFunction[],
  theme: string,
  footerText: string | null | undefined,
): void {
  const { primary } = THEME_ACCENTS[theme] ?? THEME_ACCENTS.modern;

  functions.forEach((fn) => {
    const blocks = parseDescription(fn.description ?? "");
    const cocktailItems =
      parseTemplateData(fn.templateData).selectedCocktails ?? [];
    if (blocks.length === 0 && cocktailItems.length === 0) {
      return;
    }

    ensureSpace(doc, 46, footerText);

    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor(primary)
      .text(fn.functionName, MARGIN, doc.y, { width: CONTENT_WIDTH });
    doc.y += 6;

    blocks.forEach((block) => {
      if (block.type === "subheading") {
        doc
          .font("Helvetica-Bold")
          .fontSize(10)
          .fillColor("#18181b")
          .text(`♦ ${block.text}`, MARGIN + 4, doc.y, {
            width: CONTENT_WIDTH - 8,
          });
        doc.y += 5;
      } else if (block.type === "item") {
        doc
          .font("Helvetica")
          .fontSize(9.5)
          .fillColor("#3f3f46")
          .text(`•  ${block.text}`, MARGIN + 12, doc.y + 2, {
            width: CONTENT_WIDTH - 20,
            lineGap: 2,
          });
        doc.y += 14;
      } else {
        doc
          .font("Helvetica")
          .fontSize(9.5)
          .fillColor("#3f3f46")
          .text(block.text, MARGIN + 4, doc.y + 2, {
            width: CONTENT_WIDTH - 8,
            lineGap: 2,
          });
        doc.y += 12;
      }
    });

    cocktailItems.forEach((item) => {
      doc
        .font("Helvetica")
        .fontSize(9.5)
        .fillColor("#3f3f46")
        .text(`•  ${item}`, MARGIN + 12, doc.y + 2, {
          width: CONTENT_WIDTH - 20,
          lineGap: 2,
        });
      doc.y += 14;
    });

    doc.y += 10;
  });
}

export async function buildProposalPdf(
  company: ProposalCompany,
  event: ProposalEvent,
  functions: ProposalFunction[],
): Promise<Buffer> {
  const theme = company.defaultTheme ?? "modern";
  const { primary, accent } = THEME_ACCENTS[theme] ?? THEME_ACCENTS.modern;
  const font = company.defaultFont ?? "Helvetica";

  const logo = await fetchImageBuffer(company.headerLogoUrl ?? company.logoUrl);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: MARGIN,
      bufferPages: true,
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.page.margins = { left: MARGIN, right: MARGIN, top: MARGIN, bottom: 36 };

    // Header band
    const bandHeight = 96;
    doc
      .save()
      .rect(0, 0, PAGE_WIDTH, bandHeight)
      .fill(primary)
      .restore();

    const companyName = company.companyName ?? "Deli Cocktail House";
    doc
      .font(`${font}-Bold`)
      .fontSize(22)
      .fillColor("#ffffff")
      .text(companyName, MARGIN, 26, { width: CONTENT_WIDTH - 140 });

    doc
      .font(font)
      .fontSize(10)
      .fillColor(accent)
      .text("Event Proposal", MARGIN, 56, { width: CONTENT_WIDTH - 140 });

    if (logo) {
      doc.image(logo, PAGE_WIDTH - MARGIN - 120, 18, { fit: [120, 62] });
    }

    doc.y = bandHeight + 18;

    // Contact line
    const contact = [
      company.address,
      [company.phone1, company.phone2].filter(Boolean).join("  |  "),
      company.email,
    ]
      .filter(Boolean)
      .join("   ·   ");

    if (contact) {
      doc
        .font(font)
        .fontSize(8.5)
        .fillColor("#71717a")
        .text(contact, MARGIN, doc.y, { width: CONTENT_WIDTH });
      doc.y += 6;
    }

    doc.y += 10;

    // Title
    doc
      .font(`${font}-Bold`)
      .fontSize(20)
      .fillColor(primary)
      .text(event.pdfTitle || event.eventName, MARGIN, doc.y, {
        width: CONTENT_WIDTH,
      });

    const subtitle = [event.eventType, event.packageType]
      .filter(Boolean)
      .join(" · ");
    if (subtitle) {
      doc.y += 4;
      doc
        .font(font)
        .fontSize(10.5)
        .fillColor("#52525b")
        .text(subtitle, MARGIN, doc.y, { width: CONTENT_WIDTH });
    }

    doc.y += 12;

    drawEventDetails(doc, event);
    doc.y += 8;
    drawFunctionsTable(doc, functions, theme, company.footerText);
    drawFunctionDetails(doc, functions, theme, company.footerText);

    const deliverables = stringList(event.deliverables);
    if (deliverables.length > 0) {
      drawBulletList(doc, "Deliverables", deliverables, company.footerText);
    }

    const mixers = stringList(event.mixers);
    if (mixers.length > 0) {
      drawBulletList(doc, "Mixers", mixers, company.footerText);
    }

    if (event.specialInstructions) {
      ensureSpace(doc, 40, company.footerText);
      doc
        .font(`${font}-Bold`)
        .fontSize(10)
        .fillColor("#18181b")
        .text("Special Instructions", MARGIN, doc.y, { width: CONTENT_WIDTH });
      doc.y += 4;
      doc
        .font(font)
        .fontSize(9.5)
        .fillColor("#3f3f46")
        .text(event.specialInstructions, MARGIN, doc.y, {
          width: CONTENT_WIDTH,
          lineGap: 3,
        });
      doc.y += 10;
    }

    const terms = company.defaultTerms;
    if (terms) {
      ensureSpace(doc, 40, company.footerText);
      doc
        .font(`${font}-Bold`)
        .fontSize(10)
        .fillColor("#18181b")
        .text("Terms & Conditions", MARGIN, doc.y, { width: CONTENT_WIDTH });
      doc.y += 4;
      doc
        .font(italicFont(font))
        .fontSize(8.5)
        .fillColor("#52525b")
        .text(terms, MARGIN, doc.y, { width: CONTENT_WIDTH, lineGap: 2 });
      doc.y += 8;
    }

    // Footer on every page
    doc.on("pageAdded", () => {
      drawFooter(doc, company.footerText);
    });
    drawFooter(doc, company.footerText);

    doc.end();
  });
}
