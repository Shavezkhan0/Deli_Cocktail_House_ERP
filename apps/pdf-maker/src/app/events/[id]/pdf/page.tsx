import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@repo/database";
import { requireAuth } from "@/lib/session";
import { ProposalToolbar } from "@/components/events/proposal-toolbar";
import { LIBRARY } from "@/lib/functions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Proposal Preview | Deli Cocktail House",
};

const THEME_ACCENTS: Record<string, { primary: string; accent: string }> = {
  modern: { primary: "#0f172a", accent: "#0ea5e9" },
  classic: { primary: "#1e3a5f", accent: "#c9a227" },
  elegant: { primary: "#3b0764", accent: "#c026d3" },
  minimal: { primary: "#18181b", accent: "#52525b" },
};

const PLEASE_NOTE_POINTS = [
  "BAR STRUCTURE BY DECORATOR",
  "LIQUOR BY CLIENT",
  "GLASSWARE BY HOTEL",
  "BEVERAGES BY HOTEL",
  "STAFF TRAVEL & STAY IS ALL INCLUSIVE OF THE PACKAGE",
];

const TERMS_AND_CONDITIONS = [
  {
    title: "BAR SIZE & SETUP REQUIREMENT",
    body: "To ensure the smooth functioning and overall success of the event, it is imperative that the size and setup of the bars strictly adhere to the specifications and recommendations provided by DCH. These guidelines are based on an assessment of the event's requirements and are designed to optimize service efficiency and guest satisfaction. Failure to comply may result in compromised event quality and shall be addressed as per the terms outlined in this agreement.",
  },
  {
    title: "ALCOHOL SUPPLY REQUIREMENTS",
    body: "The client agrees to stock and supply the bar with alcohol as specifically outlined and recommended by DCH. These recommendations are made to ensure a high level of service quality and to meet the preferences and expectations of the event attendees. It is the client's responsibility to ensure that an adequate supply of the agreed-upon types and quantities of alcohol is available at the event to avoid any disruption in service.",
  },
  {
    title: "ATTENDANCE & PREPARATION",
    body: "For DCH to adequately prepare for the event and ensure sufficient staffing, equipment, and supplies, the client must provide a clear and final guest count no later than three days prior to the event. This information is critical for effective execution and the overall success of the event. Failure to provide accurate and timely details may impact service quality and will be addressed as per the terms outlined in this agreement.",
  },
];

const MONTHS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

type CompanySettings = {
  companyName?: string | null;
  footerText?: string | null;
  defaultFont?: string | null;
  defaultTheme?: string | null;
  defaultTerms?: string | null;
};

type ProposalBlock = {
  id: string;
  type: string;
  title: string;
  value?: string;
  description?: string;
  items?: any[];
};

function ordinal(day: number): string {
  const ones = day % 10;
  const tens = day % 100;
  if (ones === 1 && tens !== 11) return `${day}ST`;
  if (ones === 2 && tens !== 12) return `${day}ND`;
  if (ones === 3 && tens !== 13) return `${day}RD`;
  return `${day}TH`;
}

function formatHeadingDate(date: Date): string {
  return `${ordinal(date.getDate())} ${MONTHS[date.getMonth()]}`;
}

function Block({ block }: { block: ProposalBlock }) {
  if (block.type === "simple") {
    return (
      <p className="text-[10px]">
        <span className="font-semibold">{block.title}</span>
        {block.value ? `: ${block.value}` : ""}
      </p>
    );
  }
  if (block.type === "list") {
    return (
      <div>
        <p className="text-[10px] font-semibold">{block.title}</p>
        <ul className="mt-1 list-disc space-y-[3px] pl-5 text-[10px] text-[#3f3f46]">
          {block.items?.map((it: string, i: number) => <li key={i}>{it}</li>)}
        </ul>
      </div>
    );
  }
  if (block.type === "text") {
    return (
      <div>
        <p className="text-[10px] font-semibold">{block.title}</p>
        <p className="mt-1 text-[10px] leading-relaxed text-[#3f3f46]">
          {block.description}
        </p>
      </div>
    );
  }
  if (block.type === "text_with_items") {
    return (
      <div>
        <p className="text-[10px] font-semibold">{block.title}</p>
        <p className="mt-1 text-[10px] leading-relaxed text-[#3f3f46]">
          {block.description}
        </p>
        <ul className="mt-1 list-disc space-y-[3px] pl-5 text-[10px] text-[#3f3f46]">
          {block.items?.map((it: string, i: number) => <li key={i}>{it}</li>)}
        </ul>
      </div>
    );
  }
  if (block.type === "text_with_subitems") {
    return (
      <div>
        <p className="text-[10px] font-semibold">{block.title}</p>
        {block.description ? (
          <p className="mt-1 text-[10px] leading-relaxed text-[#3f3f46]">
            {block.description}
          </p>
        ) : null}
        <div className="mt-2 space-y-2">
          {block.items?.map((it: any, i: number) => (
            <div key={i}>
              <p className="text-[10px] font-semibold">{it.name}</p>
              <p className="text-[10px] leading-relaxed text-[#3f3f46]">
                {it.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
}

export default async function ProposalPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAuth();

  const { id } = await params;

  const [proposal, settings] = await Promise.all([
    prisma.eventProposal.findUnique({
      where: { id },
      include: { functions: { orderBy: { sortOrder: "asc" } } },
    }),
    prisma.pdfCompanySettings.findFirst({ orderBy: { createdAt: "asc" } }),
  ]);

  if (!proposal) {
    notFound();
  }

  const company: CompanySettings = settings ?? {};
  const theme = company.defaultTheme ?? "modern";
  const { primary } = THEME_ACCENTS[theme] ?? THEME_ACCENTS.modern;
  const fontClass =
    company.defaultFont === "Times-Roman"
      ? "font-serif"
      : company.defaultFont === "Courier"
        ? "font-mono"
        : "font-sans";

  const functions = proposal.functions.map((fn) => {
    const template = LIBRARY.find((f) => f.id === fn.functionId);
    const overrideBlocks = Array.isArray(fn.overrideJson)
      ? (fn.overrideJson as ProposalBlock[])
      : null;
    return {
      id: fn.id,
      name: template?.name ?? fn.functionId,
      blocks: overrideBlocks ?? template?.blocks ?? [],
    };
  });

  const heading = `${formatHeadingDate(proposal.eventDate)}: ${proposal.venue}`;

  return (
    <div className="mx-auto flex w-full max-w-[860px] flex-col gap-6 px-4 py-6">
      <ProposalToolbar eventId={proposal.id} />

      <div
        className="proposal-page mx-auto w-full max-w-[820px] overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-foreground/10 print:overflow-visible"
        style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
      >
        <div className={fontClass}>
          {/* HEADING */}
          <div className="px-12 pt-8">
            <h2 className="text-center text-[15px] font-bold uppercase underline">
              {heading}
            </h2>
          </div>

          {/* EVENT DETAILS */}
          <section className="mt-6 px-12">
            <p className="text-center text-[10px] text-[#3f3f46]">
              {proposal.eventName}
              {proposal.clientName ? ` — ${proposal.clientName}` : ""}
              {proposal.guestCount > 0 ? ` — ${proposal.guestCount} PAX` : ""}
            </p>
          </section>

          {/* INDIVIDUAL FUNCTIONS */}
          {functions.length > 0 ? (
            <section className="mt-10 px-12 print:overflow-visible">
              {functions.map((fn) => (
                <section
                  key={fn.id}
                  className="break-inside-avoid break-before-page print:break-before-page print:overflow-visible"
                  style={{ breakBefore: "always", pageBreakBefore: "always" }}
                >
                  <h3 className="text-center text-[13px] font-bold uppercase underline">
                    {fn.name}
                  </h3>
                  <div className="mt-3 space-y-[3px]">
                    {fn.blocks.map((block) => (
                      <Block key={block.id} block={block} />
                    ))}
                  </div>
                </section>
              ))}
            </section>
          ) : null}

          {/* PLEASE NOTE */}
          <section
            className="mt-10 break-inside-avoid break-before-page px-12 print:break-before-page print:overflow-visible"
            style={{ breakBefore: "always", pageBreakBefore: "always" }}
          >
            <h3 className="text-center text-[13px] font-bold uppercase underline">
              PLEASE NOTE
            </h3>
            <ul className="mt-3 space-y-[3px]">
              {PLEASE_NOTE_POINTS.map((point) => (
                <li key={point} className="text-[10px] uppercase">
                  ➤ {point}
                </li>
              ))}
            </ul>
          </section>

          {/* TERMS & CONDITIONS */}
          <section
            className="mt-10 break-inside-avoid break-before-page px-12 print:break-before-page print:overflow-visible"
            style={{ breakBefore: "always", pageBreakBefore: "always" }}
          >
            <h3 className="text-center text-[13px] font-bold uppercase underline">
              TERMS &amp; CONDITIONS
            </h3>
            <div className="mt-3 flex flex-col gap-3">
              {TERMS_AND_CONDITIONS.map((block) => (
                <div key={block.title}>
                  <p className="text-[10px] font-bold uppercase">
                    • {block.title}
                  </p>
                  <p className="mt-1 text-[8.5px] leading-relaxed text-[#3f3f46]">
                    {block.body}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {company.footerText ? (
            <p className="border-t border-zinc-200 py-2.5 text-center text-[8px] text-zinc-400 print:hidden">
              {company.footerText}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
