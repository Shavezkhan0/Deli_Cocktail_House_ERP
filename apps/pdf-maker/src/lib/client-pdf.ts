import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

export type ClientPdfProposal = {
  id: string;
  eventName: string;
  eventDate: string;
  venue?: string | null;
  clientName?: string | null;
  guestCount?: number | null;
};

export type ClientPdfCompany = {
  companyName?: string | null;
  address?: string | null;
  companyAddress?: string | null;
  phone1?: string | null;
  phone2?: string | null;
  email?: string | null;
  companyEmail?: string | null;
  footerText?: string | null;
};

export type ClientPdfSubItem = {
  name?: string | null;
  description?: string | null;
};

export type ClientPdfBlock = {
  id: string;
  type: string;
  title: string;
  value?: string;
  description?: string;
  items?: unknown[];
};

export type ClientPdfFunction = {
  id: string;
  functionId: string;
  name: string;
  category?: string;
  blocks: ClientPdfBlock[];
};

export type ClientPdfTeamFlowRow = {
  id: string;
  date: string;
  functionType: string;
  venue?: string;
  pax: string;
  bartenders: number;
  bartendersNote?: string;
  butlers: number;
};

export type ClientPdfBlocksData = {
  standardDeliverables?: ClientPdfFunction | null;
  mixers?: ClientPdfFunction | null;
  pleaseNote?: ClientPdfFunction | null;
  termsConditions?: ClientPdfFunction | null;
  additionalCharges?: ClientPdfFunction | null;
  eventFunctions: ClientPdfFunction[];
};

export type ClientPdfSource = {
  proposal: ClientPdfProposal;
  company: ClientPdfCompany;
  teamFlow: ClientPdfTeamFlowRow[];
  blocks: ClientPdfBlocksData;
};

export type GenerateClientPdfResult = { url: string; filename: string };

const PAGE_WIDTH_PX = 794; // A4 @ 96dpi
const PAGE_HEIGHT_PX = 1123;
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const CAPTURE_SCALE = 2;

const MONTHS = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];

const RENDER_ROOT_ID = "render-root";

// html2canvas cannot parse lab()/oklch()/color-mix(). Tailwind v4 emits its
// design tokens in those color spaces, so we shadow them with plain hex values
// for the off-screen render subtree.
const STATIC_TOKEN_OVERRIDES = [
  "--background:#ffffff",
  "--foreground:#111111",
  "--card:#ffffff",
  "--popover:#ffffff",
  "--primary:#111111",
  "--primary-foreground:#ffffff",
  "--secondary:#f4f4f5",
  "--secondary-foreground:#111111",
  "--muted:#f4f4f5",
  "--muted-foreground:#71717a",
  "--accent:#f4f4f5",
  "--accent-foreground:#111111",
  "--destructive:#e11d48",
  "--border:#e4e4e7",
  "--input:#e4e4e7",
  "--ring:#71717a",
  "--sidebar:#ffffff",
  "--sidebar-foreground:#111111",
  "--sidebar-primary:#111111",
  "--sidebar-primary-foreground:#ffffff",
  "--sidebar-accent:#f4f4f5",
  "--sidebar-accent-foreground:#111111",
  "--sidebar-border:#e4e4e7",
  "--sidebar-ring:#71717a",
  "--chart-1:#e11d48",
  "--chart-2:#f59e0b",
  "--chart-3:#10b981",
  "--chart-4:#3b82f6",
  "--chart-5:#8b5cf6",
].join(";");

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function ordinal(day: number): string {
  const ones = day % 10;
  const tens = day % 100;
  if (ones === 1 && tens !== 11) return `${day}ST`;
  if (ones === 2 && tens !== 12) return `${day}ND`;
  if (ones === 3 && tens !== 13) return `${day}RD`;
  return `${day}TH`;
}

function formatFullDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return `${ordinal(date.getDate())} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

function blockToHtml(block: ClientPdfBlock): string {
  switch (block.type) {
    case "simple":
      return `<p class="doc-p"><strong>${escapeHtml(block.title)}</strong>${
        block.value ? `: ${escapeHtml(block.value)}` : ""
      }</p>`;
    case "list":
      return `<ul class="doc-ul">${(block.items ?? [])
        .map((item: unknown) => `<li>${escapeHtml(String(item))}</li>`)
        .join("")}</ul>`;
    case "text":
      return `<div><p class="doc-p"><strong>${escapeHtml(block.title)}</strong></p>${
        block.description ? `<p class="doc-p">${escapeHtml(block.description)}</p>` : ""
      }</div>`;
    case "text_with_items":
      return `<div><p class="doc-p"><strong>${escapeHtml(block.title)}</strong></p>${
        block.description ? `<p class="doc-p">${escapeHtml(block.description)}</p>` : ""
      }<ul class="doc-ul">${(block.items ?? [])
        .map((item: unknown) => `<li>${escapeHtml(String(item))}</li>`)
        .join("")}</ul></div>`;
    case "text_with_subitems":
      return `<div><p class="doc-p"><strong>${escapeHtml(block.title)}</strong></p>${
        block.description ? `<p class="doc-p">${escapeHtml(block.description)}</p>` : ""
      }<ul class="doc-ul">${(block.items ?? [])
        .map((item: unknown) => {
          const sub = (item ?? {}) as ClientPdfSubItem;
          return `<li><p class="concept-name">${escapeHtml(sub.name ?? "")}</p>${
            sub.description
              ? `<p class="doc-p" style="margin-top:-6px;margin-bottom:10px;">${escapeHtml(sub.description)}</p>`
              : ""
          }</li>`;
        })
        .join("")}</ul></div>`;
    default:
      return "";
  }
}

function eventFunctionToHtml(fn: ClientPdfFunction): string {
  const fieldBlocks = fn.blocks.filter((b) => b.type === "simple");
  const contentBlocks = fn.blocks.filter((b) => b.type !== "simple");

  const fieldsHtml =
    fieldBlocks.length > 0
      ? `<ul class="doc-ul">${fieldBlocks
          .map((b) => `<li><strong>${escapeHtml(b.title)}:</strong> ${escapeHtml(b.value || "—")}</li>`)
          .join("")}</ul>`
      : "";

  return `<section class="break-inside-avoid break-before-page" data-page-break="true">
  <h1 class="doc-h1">${escapeHtml(fn.name)}</h1>
  ${fieldsHtml}
  <div class="mt-3 space-y-[3px]">
    ${contentBlocks.map(blockToHtml).join("")}
  </div>
</section>`;
}

function teamFlowToHtml(teamFlow: ClientPdfTeamFlowRow[]): string {
  if (teamFlow.length === 0) {
    return "";
  }
  const rows = teamFlow
    .map((row) => {
      const bartenders =
        row.bartenders > 0 ? String(row.bartenders) : "—";
      const note = row.bartendersNote
        ? `<span style="font-size:10px;color:#666;margin-left:4px;">(${escapeHtml(row.bartendersNote)})</span>`
        : "";
      return `<tr>
        <td>${escapeHtml(row.date || "—")}</td>
        <td>${escapeHtml(row.functionType)}</td>
        <td>${escapeHtml(row.venue || "—")}</td>
        <td>${escapeHtml(row.pax || "—")}</td>
        <td>${bartenders}${note}</td>
        <td>${row.butlers > 0 ? String(row.butlers) : "—"}</td>
      </tr>`;
    })
    .join("");
  return `<section class="break-inside-avoid break-before-page" data-page-break="true">
  <div class="doc-h1">Team Flow</div>
  <div class="mt-4 overflow-x-auto">
    <table class="doc-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Function Type</th>
          <th>Venue</th>
          <th>Pax</th>
          <th>Bartenders</th>
          <th>Butlers</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
</section>`;
}

function buildDocumentHtml(source: ClientPdfSource): string {
  const { proposal, company, teamFlow, blocks } = source;

  const companyName = company.companyName || "Deli Cocktail House by Emerge";
  const address = company.companyAddress || company.address || "";
  const email = company.companyEmail || company.email || "";
  const phone1 = company.phone1 || "";
  const phone2 = company.phone2 || "";

  const coverLine = [
    proposal.clientName ? `Client: ${proposal.clientName}` : "",
    proposal.guestCount && proposal.guestCount > 0
      ? `Guests: ${proposal.guestCount}`
      : "",
  ]
    .filter(Boolean)
    .join(" • ");

  const cover = `
<h1 class="doc-hero">${escapeHtml(formatFullDate(proposal.eventDate))}</h1>
<h1 class="doc-hero-sub">${escapeHtml(proposal.eventName ?? "")}</h1>
<h1 class="doc-hero-sub">${escapeHtml(proposal.venue ?? "")}</h1>
${coverLine ? `<p class="doc-p" style="text-align:center;margin-bottom:26px;font-weight:700;">${escapeHtml(coverLine)}</p>` : ""}`;

  let standardDeliverablesHtml = "";
  if (blocks.standardDeliverables && blocks.standardDeliverables.blocks.length > 0) {
    const items = blocks.standardDeliverables.blocks[0]?.items ?? [];
    standardDeliverablesHtml = `
      <div class="doc-h2">Standard Bar Deliverables on All Functions</div>
      <ul class="doc-ul">
        ${items.map((it) => `<li>${escapeHtml(String(it))}</li>`).join("")}
      </ul>
    `;
  }

  let mixersHtml = "";
  if (blocks.mixers && blocks.mixers.blocks.length > 0) {
    const items = blocks.mixers.blocks[0]?.items ?? [];
    mixersHtml = `
      <div class="doc-h2 center">Mixers</div>
      <ul class="doc-ul mixers">
        ${items.map((it) => `<li>${escapeHtml(String(it))}</li>`).join("")}
      </ul>
    `;
  }

  const header = `
<div class="doc-topbar"></div>
<div class="doc-logo-wrap">
  <div class="doc-logo">${escapeHtml(companyName)}</div>
  <div class="doc-logo-sub">Event Proposal</div>
</div>`;

  const footer = `
<div class="doc-footer">
  <div style="flex:1;text-align:left;">${escapeHtml(phone1)}${phone1 && phone2 ? " | " : ""}${escapeHtml(phone2)}</div>
  <div style="flex:1;text-align:center;">${escapeHtml(address)}</div>
  <div style="flex:1;text-align:right;">${escapeHtml(email)}</div>
</div>`;

  const eventFunctionsHtml = blocks.eventFunctions
    .map((fn) => eventFunctionToHtml(fn))
    .join("");

  let pleaseNoteHtml = "";
  if (blocks.pleaseNote) {
    const content = blocks.pleaseNote.blocks
      .map((block) => {
        if (block.type === "list") {
          return `<ul class="doc-ul arrow">${(block.items ?? [])
            .map((it) => `<li>${escapeHtml(String(it))}</li>`)
            .join("")}</ul>`;
        }
        return blockToHtml(block);
      })
      .join("");
    pleaseNoteHtml = `<section class="break-inside-avoid break-before-page" data-page-break="true">
      <div class="doc-h1">Please Note</div>
      ${content}
    </section>`;
  }

  let additionalChargesHtml = "";
  if (blocks.additionalCharges) {
    const content = blocks.additionalCharges.blocks
      .map((block) => {
        if (block.type === "list") {
          return `<ul class="doc-ul arrow">${(block.items ?? [])
            .map((it) => `<li>${escapeHtml(String(it))}</li>`)
            .join("")}</ul>`;
        }
        return blockToHtml(block);
      })
      .join("");
    additionalChargesHtml = `<section class="break-inside-avoid break-before-page" data-page-break="true">
      <div class="doc-h1">Additional Charges</div>
      ${content}
    </section>`;
  }

  let termsHtml = "";
  if (blocks.termsConditions) {
    const content = blocks.termsConditions.blocks
      .map((block) => {
        const titleHtml = `<div class="doc-h2">❖ ${escapeHtml(block.title)}</div>`;
        let bodyHtml = "";
        if (block.type === "list" && block.items) {
          bodyHtml = `<ul class="doc-ul">${(block.items as unknown[])
            .map((it) => `<li>${escapeHtml(String(it))}</li>`)
            .join("")}</ul>`;
        } else if (block.type === "simple" && block.value) {
          bodyHtml = `<p class="doc-p">${escapeHtml(block.value)}</p>`;
        } else if (block.type === "text" && block.description) {
          bodyHtml = `<p class="doc-p">${escapeHtml(block.description)}</p>`;
        } else {
          bodyHtml = blockToHtml(block);
        }
        return `${titleHtml}${bodyHtml}`;
      })
      .join("");
    termsHtml = `
    <section class="break-inside-avoid break-before-page" data-page-break="true">
      <div class="doc-h1">Terms & Conditions</div>
      ${content}
    </section>`;
  }

  const bodyChildren = [
    cover,
    standardDeliverablesHtml,
    mixersHtml,
    teamFlowToHtml(teamFlow),
    eventFunctionsHtml,
    pleaseNoteHtml,
    additionalChargesHtml,
    termsHtml,
  ].join("");

  return `<div class="doc-page" style="width:${PAGE_WIDTH_PX}px;">
  <div class="watermark"><span>DCH</span></div>
  <div class="doc-content">
    ${header}
    <div class="doc-body">
      ${bodyChildren}
    </div>
    ${footer}
  </div>
</div>`;
}

function cssColorToSrgb(value: string): string | null {
  try {
    const context = document.createElement("canvas").getContext("2d");
    if (!context) {
      return null;
    }
    context.clearRect(0, 0, 1, 1);
    context.fillStyle = "#000000";
    context.fillStyle = value;
    if (context.fillStyle === "rgb(0, 0, 0)" && value !== "#000000") {
      return null;
    }
    context.fillRect(0, 0, 1, 1);
    const { data } = context.getImageData(0, 0, 1, 1);
    const hex = (n: number) => n.toString(16).padStart(2, "0");
    if (data[3] === 255) {
      return `#${hex(data[0])}${hex(data[1])}${hex(data[2])}`;
    }
    return `rgba(${data[0]}, ${data[1]}, ${data[2]}, ${(data[3] / 255).toFixed(3)})`;
  } catch {
    return null;
  }
}

function collectUnsupportedColorVars(): string {
  const rootStyle = getComputedStyle(document.documentElement);
  const overrides: string[] = [];
  for (let i = 0; i < rootStyle.length; i += 1) {
    const name = rootStyle.item(i);
    if (!name || !name.startsWith("--")) {
      continue;
    }
    const value = rootStyle.getPropertyValue(name).trim();
    if (!/^(lab|oklch|oklab|lch|hwb)\(/i.test(value)) {
      continue;
    }
    const srgb = cssColorToSrgb(value);
    if (srgb) {
      overrides.push(`${name}:${srgb}`);
    }
  }
  return overrides.join(";");
}

function buildTokenOverrideRule(selector: string): string {
  const dynamic = collectUnsupportedColorVars();
  const body = [STATIC_TOKEN_OVERRIDES, dynamic].filter(Boolean).join(";");
  return `${selector}{${body}}`;
}

function getRenderRoot(): HTMLDivElement {
  let root = document.getElementById(RENDER_ROOT_ID) as HTMLDivElement | null;
  if (!root) {
    root = document.createElement("div");
    root.id = RENDER_ROOT_ID;
    document.body.appendChild(root);
  }
  root.style.cssText = `position:absolute;left:-9999px;top:0;width:${PAGE_WIDTH_PX}px;pointer-events:none;overflow:visible;`;
  root.innerHTML = "";
  return root;
}

function ensureTokenOverrides(root: HTMLElement): void {
  let style = root.querySelector<HTMLStyleElement>(`#${RENDER_ROOT_ID}-tokens`);
  if (!style) {
    style = document.createElement("style");
    style.id = `${RENDER_ROOT_ID}-tokens`;
    root.appendChild(style);
  }
  style.textContent = buildTokenOverrideRule(`#${RENDER_ROOT_ID}`);
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

function groupBodyChildren(body: HTMLElement): HTMLElement[][] {
  const groups: HTMLElement[][] = [];
  let current: HTMLElement[] = [];
  for (const child of Array.from(body.children) as HTMLElement[]) {
    if (child.hasAttribute("data-page-break") && current.length > 0) {
      groups.push(current);
      current = [];
    }
    current.push(child);
  }
  if (current.length > 0) {
    groups.push(current);
  }
  return groups;
}

function canvasSlice(
  canvas: HTMLCanvasElement,
  yOffset: number,
  height: number,
): HTMLCanvasElement {
  const slice = document.createElement("canvas");
  slice.width = canvas.width;
  slice.height = height;
  const context = slice.getContext("2d")!;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, slice.width, slice.height);
  context.drawImage(
    canvas,
    0,
    yOffset,
    canvas.width,
    height,
    0,
    0,
    canvas.width,
    height,
  );
  return slice;
}

async function capturePage(
  pageNode: HTMLElement,
): Promise<{ canvas: HTMLCanvasElement; pageCount: number }> {
  await nextFrame();
  const headerHeight =
    pageNode.querySelector<HTMLElement>(".doc-topbar")?.offsetHeight ?? 0;
  const logoHeight =
    pageNode.querySelector<HTMLElement>(".doc-logo-wrap")?.offsetHeight ?? 0;
  const footerHeight =
    pageNode.querySelector<HTMLElement>(".doc-footer")?.offsetHeight ?? 0;
  const body = pageNode.querySelector<HTMLElement>(".doc-body");

  const availableBodyHeight =
    PAGE_HEIGHT_PX - headerHeight - logoHeight - footerHeight;

  let bodyHeight = body?.offsetHeight ?? 0;
  let needsSlicing = bodyHeight > availableBodyHeight;

  if (!needsSlicing) {
    pageNode.style.minHeight = "";
    pageNode.style.height = `${PAGE_HEIGHT_PX}px`;
    await nextFrame();
    bodyHeight = body?.offsetHeight ?? 0;
    needsSlicing = bodyHeight > availableBodyHeight;
  }

  const canvas = await html2canvas(pageNode, {
    scale: CAPTURE_SCALE,
    backgroundColor: "#ffffff",
    useCORS: true,
    logging: false,
    windowWidth: PAGE_WIDTH_PX,
    onclone: (clonedDocument) => {
      let style = clonedDocument.getElementById(
        `${RENDER_ROOT_ID}-tokens`,
      ) as HTMLStyleElement | null;
      if (!style) {
        style = clonedDocument.createElement("style");
        style.id = `${RENDER_ROOT_ID}-tokens`;
        clonedDocument.head.appendChild(style);
      }
      style.textContent = buildTokenOverrideRule(":root");
    },
  });

  const totalPx = canvas.height;
  const pagePx = PAGE_HEIGHT_PX * CAPTURE_SCALE;
  const pageCount = needsSlicing ? Math.ceil(totalPx / pagePx) : 1;
  return { canvas, pageCount };
}

export async function generateClientPdf(
  proposal: ClientPdfProposal,
  companySettings: ClientPdfCompany,
  teamFlow: ClientPdfTeamFlowRow[],
  blocksData: ClientPdfBlocksData,
): Promise<GenerateClientPdfResult> {
  const source: ClientPdfSource = {
    proposal,
    company: companySettings,
    teamFlow,
    blocks: blocksData,
  };

  const root = getRenderRoot();
  root.innerHTML = buildDocumentHtml(source);
  ensureTokenOverrides(root);

  if (typeof document.fonts?.ready === "object") {
    await document.fonts.ready;
  }

  const docPage = root.querySelector<HTMLElement>(".doc-page");
  const body = docPage?.querySelector<HTMLElement>(".doc-body");
  if (!docPage || !body) {
    throw new Error("Failed to build the PDF document");
  }

  const watermark = docPage.querySelector<HTMLElement>(".watermark");
  const topbar = docPage.querySelector<HTMLElement>(".doc-topbar");
  const logoWrap = docPage.querySelector<HTMLElement>(".doc-logo-wrap");
  const footer = docPage.querySelector<HTMLElement>(".doc-footer");

  const groups = groupBodyChildren(body);

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const pagePx = PAGE_HEIGHT_PX * CAPTURE_SCALE;

  for (let index = 0; index < groups.length; index += 1) {
    const group = groups[index];

    const pageNode = document.createElement("div");
    pageNode.className = "doc-page";
    pageNode.style.cssText = `width:${PAGE_WIDTH_PX}px;background:#ffffff;`;

    const content = document.createElement("div");
    content.className = "doc-content";

    const bodyNode = document.createElement("div");
    bodyNode.className = "doc-body";
    for (const element of group) {
      bodyNode.appendChild(element.cloneNode(true));
    }

    if (watermark) {
      pageNode.appendChild(watermark.cloneNode(true));
    }
    if (topbar) {
      content.appendChild(topbar.cloneNode(true));
    }
    if (logoWrap) {
      content.appendChild(logoWrap.cloneNode(true));
    }
    content.appendChild(bodyNode);
    if (footer) {
      content.appendChild(footer.cloneNode(true));
    }
    pageNode.appendChild(content);
    root.appendChild(pageNode);

    const { canvas, pageCount } = await capturePage(pageNode);

    for (let page = 0; page < pageCount; page += 1) {
      const chunk = canvasSlice(canvas, page * pagePx, pagePx);
      const dataUrl = chunk.toDataURL("image/jpeg", 0.95);
      if (page > 0) {
        pdf.addPage();
      }
      pdf.addImage(dataUrl, "JPEG", 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM);
    }

    pageNode.remove();
  }

  const filename = `${proposal.id.replace(/[^a-zA-Z0-9_-]+/g, "_")}-proposal.pdf`;
  const url = URL.createObjectURL(pdf.output("blob"));
  return { url, filename };
}
