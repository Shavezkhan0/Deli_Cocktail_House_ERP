import PDFDocument from "pdfkit";
import { SalaryBreakdown } from "./salary-calculator";

export type CompanyDetails = {
  companyName: string;
  address: string;
  phone1: string;
  phone2: string;
  email: string;
  footerText: string;
};

export type PdfBrandOptions = {
  /** PNG/JPEG bytes of the company logo. Falls back to a built-in vector mark. */
  logo?: Buffer;
  /** PNG/JPEG bytes of a company stamp/seal. Falls back to a built-in vector seal. */
  stamp?: Buffer;
  /** When true, draws the stamp near the signature block (salary slip only). */
  withStamp?: boolean;
};

function initialsOf(name: string): string {
  const letters = name
    .replace(/[^a-zA-Z ]/g, "")
    .trim()
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (letters || "DCH").slice(0, 3);
}

// Vector fallback logo: a simple martini-glass mark centred on cx, top at topY.
function drawVectorLogo(
  doc: PDFKit.PDFDocument,
  cx: number,
  topY: number,
  size: number,
  color = "#a94e1c",
): void {
  const halfTop = size * 0.46;
  const bowlBottomY = topY + size * 0.5;
  const stemBottomY = topY + size * 0.86;
  doc.save();
  doc.lineJoin("round").lineWidth(Math.max(1.4, size * 0.045)).strokeColor(color);
  // bowl
  doc
    .moveTo(cx - halfTop, topY)
    .lineTo(cx + halfTop, topY)
    .lineTo(cx, bowlBottomY)
    .closePath()
    .stroke();
  // stem
  doc.moveTo(cx, bowlBottomY).lineTo(cx, stemBottomY).stroke();
  // base
  doc
    .moveTo(cx - size * 0.3, stemBottomY)
    .lineTo(cx + size * 0.3, stemBottomY)
    .stroke();
  // olive
  doc
    .circle(cx + halfTop * 0.35, topY + size * 0.16, size * 0.07)
    .fillColor(color)
    .fill();
  doc.restore();
  doc.strokeColor("black").fillColor("black");
}

// Vector fallback stamp/seal, slightly rotated, semi-transparent.
function drawVectorStamp(
  doc: PDFKit.PDFDocument,
  cx: number,
  cy: number,
  r: number,
  initials: string,
  ink = "#274690",
): void {
  doc.save();
  doc.opacity(0.55);
  doc.rotate(-8, { origin: [cx, cy] });
  doc.lineWidth(2.4).strokeColor(ink).circle(cx, cy, r).stroke();
  doc.lineWidth(0.8).circle(cx, cy, r - 6).stroke();
  doc
    .font("Helvetica-Bold")
    .fontSize(r * 0.62)
    .fillColor(ink)
    .text(initials, cx - r, cy - r * 0.55, { width: r * 2, align: "center" });
  doc
    .font("Helvetica")
    .fontSize(r * 0.24)
    .text("PAYROLL DEPT", cx - r, cy + r * 0.3, {
      width: r * 2,
      align: "center",
    });
  doc.restore();
  doc.opacity(1).strokeColor("black").fillColor("black");
}

function drawStamp(
  doc: PDFKit.PDFDocument,
  cx: number,
  cy: number,
  r: number,
  company: CompanyDetails,
  stamp?: Buffer,
): void {
  if (stamp) {
    try {
      doc.save();
      doc.opacity(0.7);
      doc.image(stamp, cx - r, cy - r, { fit: [r * 2, r * 2] });
      doc.restore();
      doc.opacity(1);
      return;
    } catch {
      // fall through to the vector stamp on a bad image
    }
  }
  drawVectorStamp(doc, cx, cy, r, initialsOf(company.companyName));
}

// Renders the logo centred just above the current doc.y. An image logo is
// composited onto its own black circular badge (matches the mobile splash);
// the transparent gold emblem needs a dark backing to read on white paper.
function drawHeaderLogo(
  doc: PDFKit.PDFDocument,
  logo: Buffer | undefined,
  size = 52,
): void {
  const cx = doc.page.width / 2;
  const y = doc.y;
  if (logo) {
    try {
      const r = size / 2;
      const cy = y + r;
      const pad = size * 0.16;
      doc.save();
      doc.circle(cx, cy, r).fill("#0A0A0A");
      doc.restore();
      doc.image(logo, cx - r + pad, y + pad, {
        fit: [size - pad * 2, size - pad * 2],
        align: "center",
      });
      doc.fillColor("black");
      doc.y = y + size + 6;
      return;
    } catch {
      // fall through to the vector logo on a bad image
    }
  }
  drawVectorLogo(doc, cx, y, size);
  doc.y = y + size + 4;
}

export function designationLabel(designation: string): string {
  return designation
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const ONES = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];

const TENS = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
];

export function amountInWords(n: number): string {
  let value = Math.floor(Math.abs(n));
  if (value === 0) return "Zero Only";
  const parts: string[] = [];
  const crore = Math.floor(value / 10000000);
  value %= 10000000;
  const lakh = Math.floor(value / 100000);
  value %= 100000;
  const thousand = Math.floor(value / 1000);
  value %= 1000;
  if (crore > 0) parts.push(`${twoDigits(crore)} Crore`);
  if (lakh > 0) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand > 0) parts.push(`${threeDigits(thousand)} Thousand`);
  if (value > 0) parts.push(threeDigits(value));
  const sign = n < 0 ? "Minus " : "";
  let words = `${sign}${parts.join(" ")}`;
  words = words.charAt(0).toUpperCase() + words.slice(1);
  return `${words} Only`;
}

function twoDigits(n: number): string {
  if (n < 20) return ONES[n] ?? "";
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return ones === 0 ? TENS[tens]! : `${TENS[tens]} ${ONES[ones]}`;
}

function threeDigits(n: number): string {
  const parts: string[] = [];
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  if (hundreds > 0) parts.push(`${ONES[hundreds]} Hundred`);
  if (rest > 0) parts.push(twoDigits(rest));
  return parts.join(" ");
}

function money(value: number): string {
  return inr.format(value);
}

function monthName(month: number): string {
  return MONTH_NAMES[month - 1] ?? String(month);
}

function fmtDay(value: number): string {
  return value === Math.round(value) ? String(value) : value.toFixed(2);
}

function formatGeneratedDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateDMY(date: Date): string {
  const d = date.getDate();
  const m = date.getMonth() + 1;
  const y = date.getFullYear();
  const pad = (v: number) => (v < 10 ? `0${v}` : String(v));
  return `${pad(d)}-${pad(m)}-${y}`;
}

// Entry dates arrive as "YYYY-MM-DD" strings from the salary calculator.
function formatEntryDateDMY(key: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) return key;
  const [, y, m, d] = match;
  return `${d}-${m}-${y}`;
}

function render(build: (doc: PDFKit.PDFDocument) => void): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    build(doc);
    doc.end();
  });
}

function contentRight(doc: PDFKit.PDFDocument): number {
  return doc.page.width - (doc.page.margins.right ?? 50);
}

function pageBox(doc: PDFKit.PDFDocument): { L: number; W: number } {
  const L = doc.page.margins.left ?? 50;
  const R = doc.page.margins.right ?? 50;
  return { L, W: doc.page.width - L - R };
}

function hr(
  doc: PDFKit.PDFDocument,
  color = "#999999",
  lineWidth = 0.5,
  start?: number,
  end?: number,
): void {
  const x1 = start ?? (doc.page.margins.left ?? 50);
  const x2 = end ?? contentRight(doc);
  doc
    .moveTo(x1, doc.y)
    .lineTo(x2, doc.y)
    .strokeColor(color)
    .lineWidth(lineWidth)
    .stroke();
}

// A single-line "label .......... value" row. Both texts are drawn on the SAME
// baseline; the value is right-aligned across the full content width and the label
// is width-capped, so neither can wrap into vertical single-character columns.
function line(
  doc: PDFKit.PDFDocument,
  label: string,
  value: string,
  opts: { bold?: boolean; fontSize?: number; gap?: number } = {},
): void {
  const { L, W } = pageBox(doc);
  const size = opts.fontSize ?? 10;
  const y = doc.y;
  doc
    .font(opts.bold ? "Helvetica-Bold" : "Helvetica")
    .fontSize(size)
    .fillColor("black");
  doc.text(label, L, y, { width: W * 0.62, lineBreak: false, ellipsis: true });
  doc.text(value, L, y, { width: W, align: "right", lineBreak: false });
  doc.y = y + size + 4;
  if (opts.gap) doc.moveDown(opts.gap);
}

function sectionHeader(
  doc: PDFKit.PDFDocument,
  label: string,
  amount: string,
): void {
  const { L, W } = pageBox(doc);
  const y = doc.y;
  doc.font("Helvetica-Bold").fontSize(10).fillColor("#333333");
  doc.text(label, L, y, { width: W * 0.62, lineBreak: false });
  doc.text(amount, L, y, { width: W, align: "right", lineBreak: false });
  doc.fillColor("black");
  doc.y = y + 14;
  hr(doc, "#999999", 0.5);
  doc.moveDown(0.4);
}

function infoRow(
  doc: PDFKit.PDFDocument,
  leftLabel: string,
  leftValue: string,
  rightLabel: string,
  rightValue: string,
): void {
  const { L, W } = pageBox(doc);
  const colW = W / 2;
  const y = doc.y;
  doc.fontSize(9).fillColor("black");

  doc
    .font("Helvetica")
    .text(`${leftLabel}:  `, L, y, { width: colW - 8, continued: true });
  doc.font("Helvetica-Bold").text(leftValue || "-");
  const afterLeft = doc.y;

  doc
    .font("Helvetica")
    .text(`${rightLabel}:  `, L + colW, y, { width: colW - 8, continued: true });
  doc.font("Helvetica-Bold").text(rightValue || "-");
  const afterRight = doc.y;

  doc.y = Math.max(afterLeft, afterRight) + 3;
}

export async function buildSalarySlipPdf(
  breakdown: SalaryBreakdown & {
    employee: { designation: string; joiningDate: Date };
  },
  company: CompanyDetails,
  opts: PdfBrandOptions = {},
): Promise<Buffer> {
  return render((doc) => {
    const generated = new Date();
    const margin = doc.page.margins.left ?? 50;
    const right = doc.page.width - margin;

    // 1. Centered header block
    drawHeaderLogo(doc, opts.logo);
    doc.font("Helvetica-Bold").fontSize(16).text("PAYSLIP", { align: "center" });
    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .text(company.companyName, { align: "center" });
    if (company.address) {
      doc.font("Helvetica").fontSize(9).text(company.address, { align: "center" });
    }
    const contact = [company.phone1, company.phone2, company.email]
      .filter(Boolean)
      .join("  |  ");
    if (contact) {
      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor("#666666")
        .text(contact, { align: "center" })
        .fillColor("black");
    }
    doc.moveDown(0.4);
    hr(doc);
    doc.moveDown(0.8);

    // 2. Two-column info grid
    infoRow(
      doc,
      "Date of Joining",
      formatDateDMY(new Date(breakdown.employee.joiningDate)),
      "Employee Name",
      breakdown.employeeName,
    );
    infoRow(
      doc,
      "Pay Period",
      `${monthName(breakdown.month)} ${breakdown.year}`,
      "Employee ID",
      breakdown.employeeNumber,
    );
    infoRow(
      doc,
      "Worked Days",
      String(breakdown.attendance.PRESENT),
      "Designation",
      designationLabel(breakdown.employee.designation),
    );
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#666666")
      .text(
        `Attendance:  ${breakdown.attendance.PRESENT} present · ${breakdown.attendance.HALF_DAY} half · ${breakdown.attendance.SHORT_LEAVE} short · ${breakdown.attendance.ON_LEAVE} on leave · ${breakdown.attendance.ABSENT} absent`,
        margin,
        doc.y,
        { width: right - margin, align: "left" },
      )
      .text(
        `Paid-leave balance carried forward: ${fmtDay(breakdown.paidLeave.closing)}`,
        margin,
        doc.y,
        { width: right - margin, align: "left" },
      )
      .fillColor("black");
    doc.moveDown(0.4);
    hr(doc);
    doc.moveDown(0.6);

    // 3. EARNINGS
    sectionHeader(doc, "Earnings", "Amount");
    line(doc, "Basic", money(breakdown.baseSalary));
    if (breakdown.extraEarnings !== 0) {
      line(
        doc,
        `Holiday / Sunday Work (${fmtDay(breakdown.holidayWork.extraDays)} d)`,
        money(breakdown.extraEarnings),
      );
      for (const entry of breakdown.holidayWork.entries ?? []) {
        doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor("#666666")
          .text(
            `    ${formatEntryDateDMY(entry.date)}  ${entry.label}  (+${fmtDay(entry.credit)} day)`,
            (doc.page.margins.left ?? 50) + 8,
            doc.y,
          )
          .fillColor("black");
        doc.moveDown(0.2);
      }
      doc.moveDown(0.15);
    }
    if (breakdown.extraExpenses !== 0) {
      line(doc, "Approved Expenses", money(breakdown.extraExpenses));
    }
    doc.moveDown(0.3);
    line(
      doc,
      "Total Earnings",
      money(breakdown.baseSalary + breakdown.extraEarnings + breakdown.extraExpenses),
      { bold: true },
    );
    doc.moveDown(0.6);

    // 4. DEDUCTIONS
    sectionHeader(doc, "Deductions", "Amount");
    const unpaidDeduction =
      Math.round(breakdown.paidLeave.overageDays * breakdown.dailyWage * 100) / 100;
    const shortDeduction =
      Math.round(breakdown.shortLeave.overageDays * breakdown.dailyWage * 100) / 100;
    if (breakdown.paidLeave.overageDays !== 0) {
      line(
        doc,
        `Unpaid Leave (${fmtDay(breakdown.paidLeave.overageDays)} d)`,
        money(unpaidDeduction),
      );
    }
    if (breakdown.shortLeave.overageDays !== 0) {
      line(
        doc,
        `Short-Leave Overage (${fmtDay(breakdown.shortLeave.overageDays)} d)`,
        money(shortDeduction),
      );
    }
    if (breakdown.paidLeave.overageDays === 0 && breakdown.shortLeave.overageDays === 0) {
      line(doc, "None", "0");
    }
    doc.moveDown(0.3);
    line(doc, "Total Deductions", money(breakdown.deductionAmount), { bold: true });
    doc.moveDown(0.6);

    // 5. Net Pay
    hr(doc, "#333333", 1);
    doc.moveDown(0.4);
    line(doc, "Net Pay", money(breakdown.finalAmount), { bold: true, fontSize: 12 });
    doc.moveDown(0.2);
    doc
      .font("Helvetica")
      .fontSize(10)
      .text(`In words: ${amountInWords(breakdown.finalAmount)}`, { align: "center" });
    doc.moveDown(1);

    // 6. Signatures
    const sigY = doc.y;
    const leftX = margin;
    const rightX = right - 200;
    doc
      .moveTo(leftX, sigY)
      .lineTo(leftX + 180, sigY)
      .strokeColor("#999999")
      .lineWidth(0.5)
      .stroke();
    doc
      .moveTo(rightX, sigY)
      .lineTo(rightX + 180, sigY)
      .strokeColor("#999999")
      .lineWidth(0.5)
      .stroke();
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor("black");
    doc.text("Employer Signature", leftX, sigY + 4);
    doc.text("Employee Signature", rightX, sigY + 4);
    doc.moveDown(0.5);

    // 6b. Company stamp over the employer signature
    if (opts.withStamp) {
      drawStamp(doc, leftX + 88, sigY + 10, 38, company, opts.stamp);
    }

    // 7. Footer at page bottom
    const footW = doc.page.width - margin * 2;
    doc.y = doc.page.height - (doc.page.margins.bottom ?? 50) - 42;
    doc.font("Helvetica").fontSize(8).fillColor("#666666");
    if (company.footerText) {
      doc.text(company.footerText, margin, doc.y, { width: footW, align: "center" });
    }
    doc.text("This is a system-generated payslip.", margin, doc.y, { width: footW, align: "center" });
    doc.text("All amounts in Indian Rupees (INR).", margin, doc.y, { width: footW, align: "center" });
    doc.text(`Generated ${formatGeneratedDate(generated)}`, margin, doc.y, { width: footW, align: "center" });
    doc.fillColor("black");
  });
}

export async function buildPayrollSummaryPdf(
  company: CompanyDetails,
  month: number,
  year: number,
  rows: {
    employeeId: string;
    name: string;
    designation: string;
    baseSalary: number;
    thisMonthSalary: number;
  }[],
  opts: PdfBrandOptions = {},
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const generated = new Date();

    // 1. Centered header block
    drawHeaderLogo(doc, opts.logo, 46);
    doc.font("Helvetica-Bold").fontSize(16).text("PAYROLL SUMMARY", { align: "center" });
    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .text(company.companyName, { align: "center" });
    if (company.address) {
      doc.font("Helvetica").fontSize(9).text(company.address, { align: "center" });
    }
    doc.moveDown(0.4);
    hr(doc);
    doc.moveDown(0.6);

    // 2. Summary line
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#666666")
      .text(
        `Pay Period: ${monthName(month)} ${year}          Employees: ${rows.length}          Generated: ${formatGeneratedDate(generated)}`,
        { align: "left" },
      )
      .fillColor("black");
    doc.moveDown(0.8);

    // 3. Table with fixed column geometry
    const startX = 40;
    const rowHeight = 18;
    const cols = [
      { key: "employeeId", label: "Employee ID", width: 75, align: "left" },
      { key: "name", label: "Name", width: 135, align: "left" },
      { key: "designation", label: "Designation", width: 120, align: "left" },
      { key: "baseSalary", label: "Base Salary", width: 85, align: "right" },
      { key: "netPay", label: "Net Pay", width: 85, align: "right" },
    ] as const;

    let runningX = startX;
    const colXs = cols.map((col) => {
      const x = runningX;
      runningX += col.width;
      return x;
    });
    const tableRight =
      startX + cols.reduce((sum, col) => sum + col.width, 0);

    type PayrollColKey = (typeof cols)[number]["key"];

    const drawHeader = () => {
      const headerY = doc.y;
      doc.font("Helvetica-Bold").fontSize(9).fillColor("#333333");
      cols.forEach((col, index) => {
        doc.text(col.label, colXs[index]!, headerY, {
          width: col.width,
          align: col.align,
        });
      });
      doc.fillColor("black");
      const ruleY = headerY + 12;
      doc
        .moveTo(startX, ruleY)
        .lineTo(tableRight, ruleY)
        .strokeColor("#999999")
        .lineWidth(0.5)
        .stroke();
      doc.y = ruleY + 4;
    };
    drawHeader();

    let totalBase = 0;
    let totalNet = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]!;
      totalBase += row.baseSalary;
      totalNet += row.thisMonthSalary;

      if (doc.y > 760 - 40) {
        doc.addPage();
        drawHeader();
      }

      const rowY = doc.y;
      doc.font("Helvetica").fontSize(9);
      const values: Record<PayrollColKey, string> = {
        employeeId: row.employeeId,
        name: row.name,
        designation: designationLabel(row.designation),
        baseSalary: money(row.baseSalary),
        netPay: money(row.thisMonthSalary),
      };
      cols.forEach((col, index) => {
        doc.text(values[col.key], colXs[index]!, rowY, {
          width: col.width,
          align: col.align,
        });
      });
      doc
        .moveTo(startX, rowY + rowHeight)
        .lineTo(tableRight, rowY + rowHeight)
        .strokeColor("#dddddd")
        .lineWidth(0.5)
        .stroke();
      doc.y = rowY + rowHeight;
    }

    if (doc.y > 760 - 40) {
      doc.addPage();
      drawHeader();
    }
    doc
      .moveTo(startX, doc.y)
      .lineTo(tableRight, doc.y)
      .strokeColor("#999999")
      .lineWidth(0.5)
      .stroke();
    const totalsY = doc.y + 4;
    doc.font("Helvetica-Bold").fontSize(9);
    const totals: Record<PayrollColKey, string> = {
      employeeId: "",
      name: "",
      designation: "TOTAL",
      baseSalary: money(totalBase),
      netPay: money(totalNet),
    };
    cols.forEach((col, index) => {
      doc.text(totals[col.key], colXs[index]!, totalsY, {
        width: col.width,
        align: col.align,
      });
    });
    doc.moveDown(0.5);

    // 5. Footer
    const fMargin = doc.page.margins.left ?? 40;
    const fWidth = doc.page.width - fMargin * 2;
    doc.y = doc.page.height - (doc.page.margins.bottom ?? 40) - 24;
    doc.font("Helvetica").fontSize(8).fillColor("#666666");
    if (company.footerText) {
      doc.text(company.footerText, fMargin, doc.y, { width: fWidth, align: "center" });
    }
    doc.text(
      "System-generated. All amounts in Indian Rupees (INR).",
      fMargin,
      doc.y,
      { width: fWidth, align: "center" },
    );
    doc.fillColor("black");

    doc.end();
  });
}
