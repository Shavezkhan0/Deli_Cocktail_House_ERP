import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@repo/database";
import { requireAuth } from "@/lib/session";
import { ProposalToolbar } from "@/components/events/proposal-toolbar";
import { parseDescription, parseTemplateData } from "@/lib/function-templates";

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

type FunctionRow = {
  id: string;
  functionName: string;
  date: Date;
  startTime: string | null;
  endTime: string | null;
  pax: number | null;
  bartenders: number | null;
  butlers: number | null;
  siteManager: string | null;
  theme: string | null;
  notes: string | null;
  description: string | null;
  selectedCocktails: string[];
};

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}

function ordinal(day: number): string {
  const ones = day % 10;
  const tens = day % 100;
  if (ones === 1 && tens !== 11) return `${day}ST`;
  if (ones === 2 && tens !== 12) return `${day}ND`;
  if (ones === 3 && tens !== 13) return `${day}RD`;
  return `${day}TH`;
}

function formatHeadingDate(start: Date, end: Date): string {
  const sameDay = start.toDateString() === end.toDateString();
  if (sameDay) {
    return `${ordinal(start.getDate())} ${MONTHS[start.getMonth()]}`;
  }
  const sameMonth =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth();
  if (sameMonth) {
    return `${ordinal(start.getDate())} - ${ordinal(end.getDate())} ${
      MONTHS[start.getMonth()]
    }`;
  }
  return `${ordinal(start.getDate())} ${MONTHS[start.getMonth()]} - ${ordinal(
    end.getDate(),
  )} ${MONTHS[end.getMonth()]}`;
}

function formatTime(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }
  return value;
}

export default async function ProposalPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAuth();

  const { id } = await params;

  const [event, settings] = await Promise.all([
    prisma.pdfEvent.findUnique({
      where: { id },
      include: { functions: { orderBy: { date: "asc" } } },
    }),
    prisma.pdfCompanySettings.findFirst({ orderBy: { createdAt: "asc" } }),
  ]);

  if (!event) {
    notFound();
  }

  const company: CompanySettings = settings ?? {};
  const theme = company.defaultTheme ?? "modern";
  const { primary, accent } = THEME_ACCENTS[theme] ?? THEME_ACCENTS.modern;
  const fontClass =
    company.defaultFont === "Times-Roman"
      ? "font-serif"
      : company.defaultFont === "Courier"
        ? "font-mono"
        : "font-sans";

  const functions: FunctionRow[] = event.functions.map((fn) => ({
    id: fn.id,
    functionName: fn.functionName,
    date: fn.date,
    startTime: fn.startTime,
    endTime: fn.endTime,
    pax: fn.pax,
    bartenders: fn.bartenders,
    butlers: fn.butlers,
    siteManager: fn.siteManager,
    theme: fn.theme,
    notes: fn.notes,
    description: fn.description,
    selectedCocktails:
      parseTemplateData(fn.templateData).selectedCocktails ?? [],
  }));

  const deliverables = stringList(event.deliverables);
  const mixers = stringList(event.mixers);

  const heading = `${formatHeadingDate(event.startDate, event.endDate)}: ${
    event.venue
  }${event.city ? `, ${event.city}` : ""}`;

  const tableColumns: {
    label: string;
    width: string;
    get: (fn: FunctionRow) => string;
  }[] = [
    { label: "FUNCTION", width: "23%", get: (fn) => fn.functionName },
    {
      label: "DATE",
      width: "15%",
      get: (fn) =>
        fn.date.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
    },
    {
      label: "TIME",
      width: "12%",
      get: (fn) => `${formatTime(fn.startTime)}–${formatTime(fn.endTime)}`,
    },
    {
      label: "PAX",
      width: "9%",
      get: (fn) => (fn.pax != null ? String(fn.pax) : "—"),
    },
    {
      label: "BAR / BUTL",
      width: "15%",
      get: (fn) => `${fn.bartenders ?? 0}/${fn.butlers ?? 0}`,
    },
    {
      label: "SITE MANAGER",
      width: "15%",
      get: (fn) => fn.siteManager ?? "—",
    },
    {
      label: "THEME",
      width: "11%",
      get: (fn) => fn.theme ?? "—",
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-[860px] flex-col gap-6 px-4 py-6">
      <ProposalToolbar eventId={event.id} />

      <div
        className="proposal-page mx-auto w-full max-w-[820px] overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-foreground/10"
        style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
      >
        <div className={fontClass}>
          {/* HEADING */}
          <div className="px-12 pt-8">
            <h2 className="text-center text-[15px] font-bold uppercase underline">
              {heading}
            </h2>
          </div>

          {/* STANDARD BAR DELIVERABLES */}
          {deliverables.length > 0 ? (
            <section className="mt-8 break-inside-avoid px-12">
              <h3 className="text-center text-[13px] font-bold uppercase">
                Standard Bar Deliverables
              </h3>
              <ul className="mt-3 space-y-[3px]">
                {deliverables.map((item) => (
                  <li key={item} className="text-[10px]">
                    ♦ {item}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* MIXERS */}
          {mixers.length > 0 ? (
            <section className="mt-8 break-inside-avoid px-12">
              <h3 className="text-center text-[13px] font-bold uppercase underline">
                Mixers
              </h3>
              <ul className="mt-3 space-y-[3px]">
                {mixers.map((item) => (
                  <li key={item} className="text-[10px]">
                    • {item}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* TEAM FLOW */}
          {functions.length > 0 ? (
            <section className="mt-8 break-inside-avoid px-12">
              <h3 className="text-center text-[13px] font-bold uppercase underline">
                Team Flow
              </h3>
              <table className="mt-3 w-full border-collapse text-left">
                <thead>
                  <tr style={{ backgroundColor: primary }}>
                    {tableColumns.map((col) => (
                      <th
                        key={col.label}
                        className="px-2 py-2 text-[7.5px] font-bold tracking-wide text-white"
                        style={{ width: col.width }}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {functions.map((fn, index) => (
                    <tr
                      key={fn.id}
                      className={index % 2 === 0 ? "bg-white" : "bg-[#f4f4f5]"}
                    >
                      {tableColumns.map((col) => (
                        <td
                          key={col.label}
                          className="border-b border-zinc-200/70 px-2 py-[5px] text-[8px]"
                          style={{ color: "#18181b" }}
                        >
                          {col.get(fn)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div
                className="h-[2px] w-full"
                style={{ backgroundColor: accent }}
              />
            </section>
          ) : null}

          {/* INDIVIDUAL FUNCTIONS */}
          {functions.length > 0 ? (
            <section className="mt-10 px-12">
              <h3 className="text-center text-[13px] font-bold uppercase underline">
                Individual Functions
              </h3>
              {functions.map((fn) => {
                const blocks = parseDescription(fn.description ?? "");
                const hasUniformLine = blocks.some((block) =>
                  block.text.toUpperCase().includes("BARTENDERS UNIFORM"),
                );
                const hasSetupLine = blocks.some((block) =>
                  block.text.toUpperCase().includes("BAR SETUP"),
                );
                return (
                  <div key={fn.id} className="mt-8 break-inside-avoid">
                    <h4 className="text-center text-[13px] font-bold uppercase underline">
                      {fn.functionName}
                    </h4>
                    <div className="mt-3 space-y-[3px]">
                      {!hasUniformLine ? (
                        <p className="text-[10px] uppercase">
                          ♦ BARTENDERS UNIFORM:- {fn.theme ?? "AS PER THEME"}
                        </p>
                      ) : null}
                      {!hasSetupLine ? (
                        <p className="text-[10px] uppercase">
                          ♦ BAR SETUP:- {fn.notes ?? "AS PER THEME"}
                        </p>
                      ) : null}
                      {blocks.map((block, index) =>
                        block.type === "subheading" ? (
                          <p
                            key={index}
                            className="pt-2 text-[10px] font-semibold uppercase"
                          >
                            ♦ {block.text}
                          </p>
                        ) : block.type === "item" ? (
                          <p key={index} className="pl-4 text-[10px]">
                            • {block.text}
                          </p>
                        ) : (
                          <p key={index} className="text-[10px]">
                            {block.text}
                          </p>
                        ),
                      )}
                      {fn.selectedCocktails.length > 0 ? (
                        <ul className="mt-1 space-y-[3px]">
                          {fn.selectedCocktails.map((cocktail) => (
                            <li key={cocktail} className="pl-4 text-[10px]">
                              • {cocktail}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </section>
          ) : null}

          {/* PLEASE NOTE */}
          <section
            className="mt-10 break-inside-avoid break-before-page px-12"
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
            className="mt-10 break-inside-avoid break-before-page px-12"
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
