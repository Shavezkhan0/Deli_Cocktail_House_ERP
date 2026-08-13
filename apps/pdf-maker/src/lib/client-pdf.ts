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

export type GenerateClientPdfResult = { url: string; filename: string };

const PAGE_WIDTH_PX = 794; // A4 @ 96dpi
const PAGE_HEIGHT_PX = 1123;
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const CAPTURE_SCALE = 2;

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
  // position:fixed + top:-10000px keeps it off-screen but html2canvas can still find it
  root.style.cssText = `position:fixed;top:-10000px;left:0;width:${PAGE_WIDTH_PX}px;pointer-events:none;overflow:visible;`;
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

/**
 * REFERENCE HTML APPROACH:
 * Measure each block's rendered height independently, then pack blocks into
 * fixed-height pages (with header+footer baked in). This guarantees every
 * section is visible — no slicing, no missing content.
 */

function measureAvailableBodyHeight(templatePage: HTMLElement): number {
  // Returns the usable body height inside a fixed-height page
  const body = templatePage.querySelector<HTMLElement>(".doc-body");
  if (!body) return 800;
  return body.clientHeight;
}

function measureBlocksHeights(htmlBlocks: string[], root: HTMLElement): number[] {
  if (!htmlBlocks.length) return [];
  const wrap = document.createElement("div");
  wrap.style.cssText = `position:absolute;left:0;top:0;width:${PAGE_WIDTH_PX}px;visibility:hidden;`;
  wrap.innerHTML =
    `<div class="doc-body" style="flex:none;height:auto;overflow:visible;display:flex;flex-direction:column;padding:24px 44px;">` +
    htmlBlocks.map((h, i) => `<div data-measure-idx="${i}">${h}</div>`).join("") +
    `</div>`;
  root.appendChild(wrap);
  const heights = htmlBlocks.map((_, i) => {
    const el = wrap.querySelector<HTMLElement>(`[data-measure-idx="${i}"]`);
    return el ? el.getBoundingClientRect().height : 0;
  });
  wrap.remove();
  return heights;
}

function packPagesFromBlocks(
  blocksHtml: string[],
  heights: number[],
  capacity: number
): string[] {
  const safeCapacity = capacity * 0.97; // 3% safety margin
  const pages: string[] = [];
  let curHtml: string[] = [];
  let curH = 0;

  for (let i = 0; i < blocksHtml.length; i++) {
    const h = heights[i];
    if (curHtml.length > 0 && curH + h > safeCapacity) {
      pages.push(curHtml.join(""));
      curHtml = [];
      curH = 0;
    }
    curHtml.push(blocksHtml[i]);
    curH += h;
  }
  if (curHtml.length > 0) {
    pages.push(curHtml.join(""));
  }
  return pages;
}

function buildFullPage(bodyHtml: string, headerHtml: string, footerHtml: string): HTMLElement {
  const page = document.createElement("div");
  page.className = "doc-page";
  // Force exact A4 dimensions for PDF capture — overrides the preview CSS
  page.style.cssText = `width:${PAGE_WIDTH_PX}px;height:${PAGE_HEIGHT_PX}px;background:#fff;overflow:hidden;position:relative;font-family:'PT Serif',serif;color:#111;`;
  page.innerHTML =
    `<div class="watermark"><span>DCH</span></div>` +
    `<div class="doc-content" style="position:relative;z-index:2;height:100%;display:flex;flex-direction:column;">` +
    headerHtml +
    `<div class="doc-body" style="padding:24px 44px;flex:1;min-height:0;overflow:hidden;display:flex;flex-direction:column;">` + bodyHtml + `</div>` +
    footerHtml +
    `</div>`;
  return page;
}

async function capturePageNode(pageNode: HTMLElement, root: HTMLElement): Promise<HTMLCanvasElement> {
  root.innerHTML = "";
  root.appendChild(pageNode);
  ensureTokenOverrides(root);
  await nextFrame();

  return html2canvas(pageNode, {
    scale: CAPTURE_SCALE,
    backgroundColor: "#ffffff",
    useCORS: true,
    logging: false,
    windowWidth: PAGE_WIDTH_PX,
    windowHeight: PAGE_HEIGHT_PX,
    scrollY: 0,
    scrollX: 0,
    onclone: (clonedDocument) => {
      let style = clonedDocument.getElementById(`${RENDER_ROOT_ID}-tokens`) as HTMLStyleElement | null;
      if (!style) {
        style = clonedDocument.createElement("style");
        style.id = `${RENDER_ROOT_ID}-tokens`;
        clonedDocument.head.appendChild(style);
      }
      style.textContent = buildTokenOverrideRule(":root");
    },
  });
}

export async function generateClientPdf(
  proposal: ClientPdfProposal,
  sourceElement?: HTMLElement | null
): Promise<GenerateClientPdfResult> {
  const visibleDocPage = sourceElement?.querySelector?.(".doc-page") as HTMLElement | null
    ?? sourceElement as HTMLElement | null
    ?? document.querySelector<HTMLElement>(".doc-page");

  if (!visibleDocPage) {
    throw new Error("Could not find the document preview on screen");
  }

  const root = getRenderRoot();
  root.innerHTML = "";

  if (typeof document.fonts?.ready === "object") {
    await document.fonts.ready;
  }

  // Extract header and footer HTML from the source template
  const topbar = visibleDocPage.querySelector<HTMLElement>(".doc-topbar");
  const logoWrap = visibleDocPage.querySelector<HTMLElement>(".doc-logo-wrap");
  const footer = visibleDocPage.querySelector<HTMLElement>(".doc-footer-wrapper") 
    ?? visibleDocPage.querySelector<HTMLElement>(".doc-footer");

  const headerHtml = (topbar?.outerHTML ?? "") + (logoWrap?.outerHTML ?? "");
  const footerHtml = footer?.outerHTML ?? "";

  // Build a template page to measure available body height
  const templatePage = buildFullPage("", headerHtml, footerHtml);
  root.appendChild(templatePage);
  await nextFrame();
  const availableBodyHeight = measureAvailableBodyHeight(templatePage);
  templatePage.remove();

  // Collect all content blocks from the source document
  const docBody = visibleDocPage.querySelector<HTMLElement>(".doc-body");
  if (!docBody) {
    throw new Error("Failed to build the PDF document");
  }

  // Each direct child of .doc-body is a block
  const blockElements = Array.from(docBody.children) as HTMLElement[];
  const blocksHtml = blockElements.map((el) => el.outerHTML);

  // Measure heights of all blocks
  const heights = measureBlocksHeights(blocksHtml, root);

  // Pack blocks into pages based on available height
  const packedPages = packPagesFromBlocks(blocksHtml, heights, availableBodyHeight);

  // Generate PDF
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  for (let i = 0; i < packedPages.length; i++) {
    const pageNode = buildFullPage(packedPages[i], headerHtml, footerHtml);
    const canvas = await capturePageNode(pageNode, root);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.95);

    if (i > 0) {
      pdf.addPage();
    }
    pdf.addImage(dataUrl, "JPEG", 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM);
    root.innerHTML = "";
  }

  const filename = `${proposal.id.replace(/[^a-zA-Z0-9_-]+/g, "_")}-proposal.pdf`;
  const url = URL.createObjectURL(pdf.output("blob"));
  root.innerHTML = "";
  return { url, filename };
}
