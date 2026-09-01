import PDFDocument from "pdfkit";

export type ChecklistRow = {
  itemName: string;
  category: string;
  issued: number;
  returned: number;
  unit: string;
};

export type EventChecklistHeader = {
  title: string;
  companyName: string;
  eventName: string;
  eventCode: string;
  eventDate: string;
};

const PAGE_WIDTH = 595.28; // A4 portrait (pts)
const PAGE_HEIGHT = 841.89;
const MARGIN = 48;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const ACCENT = "#a94e1c"; // D.C.H gold/brand accent
const TEXT_DARK = "#1f2937";
const MUTED = "#6b7280";
const ROW_LIGHT = "#f9f6f1";
const BORDER = "#d8d2c9";

function drawHeader(
  doc: PDFKit.PDFDocument,
  header: EventChecklistHeader,
  logo: Buffer | undefined,
): void {
  // Company logo replaces the old title at the top
  let nextY = 30;
  if (logo) {
    try {
      const logoSize = 42;
      const cx = PAGE_WIDTH / 2;
      doc.image(logo, cx - logoSize / 2, nextY, {
        fit: [logoSize, logoSize],
        align: "center",
      });
      nextY += logoSize + 6;
    } catch {
      // fall through to just the company name
    }
  }
  if (header.companyName) {
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor(MUTED)
      .text(header.companyName, MARGIN, nextY, {
        width: CONTENT_WIDTH,
        align: "center",
      });
    nextY += 16;
  }

  // Meta block (Event Name / Code / Date)
  const metaY = nextY + 8;
  doc
    .moveTo(MARGIN, metaY)
    .lineTo(PAGE_WIDTH - MARGIN, metaY)
    .strokeColor(BORDER)
    .lineWidth(1)
    .stroke();

  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor(TEXT_DARK)
    .text(`Event: ${header.eventName}`, MARGIN, metaY + 12, {
      width: CONTENT_WIDTH,
    });

  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(MUTED)
    .text(
      `Code: ${header.eventCode}      Date: ${header.eventDate}`,
      MARGIN,
      metaY + 28,
      { width: CONTENT_WIDTH },
    );
}

function drawTableHeader(
  doc: PDFKit.PDFDocument,
  xPositions: number[],
  colWidths: number[],
  headers: string[],
  tableLeft: number,
  width: number,
  y: number,
): number {
  doc.rect(tableLeft, y, width, 22).fill("#efe7dc");
  doc.font("Helvetica-Bold").fontSize(9.5).fillColor(TEXT_DARK);
  headers.forEach((h, i) => {
    doc.text(h, xPositions[i]! + 6, y + 7, {
      width: colWidths[i]! - 8,
      align: "left",
    });
  });
  doc
    .moveTo(tableLeft, y + 22)
    .lineTo(tableLeft + width, y + 22)
    .strokeColor(BORDER)
    .lineWidth(1)
    .stroke();
  return y + 22;
}

function drawChecklistTable(
  doc: PDFKit.PDFDocument,
  rows: ChecklistRow[],
): void {
  // Column geometry: checkbox columns sit after Issued and after Returned.
  const colWidths = [155, 95, 58, 55, 34, 55, 34] as const;
  const colName = colWidths[0];
  const colCategory = colWidths[1];
  const colUnit = colWidths[2];
  const colIssuedQty = colWidths[3];
  const colBoxIssued = colWidths[4];
  const colReturnedQty = colWidths[5];
  const colBoxReturned = colWidths[6];
  const CONTENT_WIDTH_LOCAL = colWidths.reduce((sum, w) => sum + w, 0);

  const headers = [
    "Item Name",
    "Category",
    "Unit",
    "Issued",
    "[ ]",
    "Returned",
    "[ ]",
  ];
  const boxCols = [4, 6];

  const xPositions: number[] = [];
  let cursorX = MARGIN;
  for (const w of colWidths) {
    xPositions.push(cursorX);
    cursorX += w;
  }

  const headerY = 164;
  const rowHeight = 26;
  const tableLeft = MARGIN;
  const bottomLimit = PAGE_HEIGHT - MARGIN - rowHeight;

  let y = drawTableHeader(
    doc,
    xPositions,
    colWidths as unknown as number[],
    headers,
    tableLeft,
    CONTENT_WIDTH_LOCAL,
    headerY,
  );

  // Body rows
  doc.font("Helvetica").fontSize(9.5);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;

    // New page when we run out of room
    if (y > bottomLimit) {
      doc.addPage();
      y = drawTableHeader(
        doc,
        xPositions,
        colWidths as unknown as number[],
        headers,
        tableLeft,
        CONTENT_WIDTH_LOCAL,
        MARGIN,
      );
    }

    // Alternating background
    if (i % 2 === 1) {
      doc.rect(tableLeft, y, CONTENT_WIDTH_LOCAL, rowHeight).fill(ROW_LIGHT);
    }

    const textY = y + (rowHeight - 11) / 2;

    doc.fillColor(TEXT_DARK);
    doc.text(row.itemName, xPositions[0]! + 6, textY, {
      width: colName - 10,
    });
    doc.fillColor(MUTED);
    doc.text(row.category || "—", xPositions[1]! + 6, textY, {
      width: colCategory - 10,
    });
    doc.text(row.unit || "—", xPositions[2]! + 6, textY, {
      width: colUnit - 10,
    });
    doc.fillColor(TEXT_DARK);
    doc.text(String(row.issued), xPositions[3]! + 4, textY, {
      width: colIssuedQty - 8,
      align: "right",
    });
    doc.text(String(row.returned), xPositions[5]! + 4, textY, {
      width: colReturnedQty - 8,
      align: "right",
    });

    // Blank checkboxes after Issued and after Returned
    const boxSize = 11;
    const boxY = y + (rowHeight - boxSize) / 2;
    for (const colIndex of boxCols) {
      const colW = colWidths[colIndex]!;
      const boxX = xPositions[colIndex]! + (colW - boxSize) / 2;
      doc
        .rect(boxX, boxY, boxSize, boxSize)
        .lineWidth(1.2)
        .strokeColor(TEXT_DARK)
        .stroke();
    }

    doc
      .moveTo(tableLeft, y + rowHeight)
      .lineTo(tableLeft + CONTENT_WIDTH_LOCAL, y + rowHeight)
      .strokeColor(BORDER)
      .lineWidth(0.5)
      .stroke();

    y += rowHeight;
  }
}

export function buildEventChecklistPdf(
  header: EventChecklistHeader,
  rows: ChecklistRow[],
  logo?: Buffer,
): Promise<Buffer> {
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

    drawHeader(doc, header, logo);

    if (rows.length === 0) {
      doc
        .font("Helvetica")
        .fontSize(11)
        .fillColor(MUTED)
        .text("No items to list for this checklist.", MARGIN, 170, {
          width: CONTENT_WIDTH,
        });
    } else {
      drawChecklistTable(doc, rows);
    }

    doc.end();
  });
}