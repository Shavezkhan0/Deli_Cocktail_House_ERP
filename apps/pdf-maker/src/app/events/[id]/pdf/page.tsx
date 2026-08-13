import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/session";
import { getProposalPdfData } from "@/lib/proposal-pdf-data";
import { PDFViewerWrapper } from "@/components/pdf/PDFViewerWrapper";
import {
  STANDARD_DELIVERABLES,
  MIXERS_DEFAULT,
  PLEASE_NOTE_OPTIONS,
  TERMS_AND_CONDITIONS,
} from "@/lib/dch-constants";

type PdfBlock = {
  id: string;
  type: string;
  title: string;
  value?: string;
  description?: string;
  items?: unknown[];
};

type PdfFunction = {
  id: string;
  functionId: string;
  name: string;
  category?: string;
  blocks: PdfBlock[];
  functionType?: string;
  pax?: string;
  bartenders?: number;
  butlers?: number;
  bartendersNote?: string;
  venue?: string;
  date?: string;
};

type PdfSubItem = {
  name?: string | null;
  description?: string | null;
};

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Proposal Preview | Deli Cocktail House",
};

const MONTHS = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];

function ordinal(day: number): string {
  const ones = day % 10;
  const tens = day % 100;
  if (ones === 1 && tens !== 11) return `${day}st`;
  if (ones === 2 && tens !== 12) return `${day}nd`;
  if (ones === 3 && tens !== 13) return `${day}rd`;
  return `${day}th`;
}

function formatFullDate(date: Date): string {
  return `${ordinal(date.getDate())} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

function Block({ block }: { block: PdfBlock }) {
  if (block.type === "simple") {
    return (
      <p className="doc-p">
        {block.title}{block.value ? `: ${block.value}` : ""}
      </p>
    );
  }
  if (block.type === "list") {
    return (
      <ul className="doc-ul">
        {block.items?.map((it: unknown, i: number) =>
          <li key={i}>{String(it)}</li>
        )}
      </ul>
    );
  }
  if (block.type === "text") {
    return (
      <div>
        <p className="doc-p"><strong>{block.title}</strong></p>
        <p className="doc-p">{block.description}</p>
      </div>
    );
  }
  if (block.type === "text_with_items") {
    return (
      <div>
        <p className="doc-p"><strong>{block.title}</strong></p>
        <p className="doc-p">{block.description}</p>
        <ul className="doc-ul">
          {block.items?.map((it: unknown, i: number) =>
            <li key={i}>{String(it)}</li>
          )}
        </ul>
      </div>
    );
  }
  if (block.type === "text_with_subitems") {
    return (
      <div>
        <p className="doc-p"><strong>{block.title}</strong></p>
        {block.description ? <p className="doc-p">{block.description}</p> : null}
        <ul className="doc-ul">
          {block.items?.map((it: unknown, i: number) => {
            const sub = (it ?? {}) as PdfSubItem;
            return (
              <li key={i}>
                <p className="concept-name">{sub.name}</p>
                {sub.description ? (
                  <p className="doc-p" style={{ marginTop: "-6px", marginBottom: "10px" }}>{sub.description}</p>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    );
  }
  return null;
}

function renderFunctionSection(fn: PdfFunction, forceNewPage: boolean) {
  const pageBreakStyle: CSSProperties | undefined = forceNewPage
    ? { breakBefore: "always", pageBreakBefore: "always" }
    : undefined;

  const fieldBlocks = fn.blocks.filter((b) => b.type === "simple");
  const contentBlocks = fn.blocks.filter((b) => b.type !== "simple");

  return (
    <section
      key={fn.id}
      className={`break-inside-avoid`}
      style={pageBreakStyle}
      data-page-break={forceNewPage ? "true" : undefined}
    >
      <h1 className="doc-h1">{fn.name}</h1>

      {/* Function details line */}
      {(fn.functionType || fn.pax || fn.bartenders || fn.butlers) && (
        <ul className="doc-ul" style={{ marginBottom: "16px" }}>
          {fn.functionType && <li><strong>Function Type:</strong> {fn.functionType}</li>}
          {fn.pax && <li><strong>Pax:</strong> {fn.pax}</li>}
          {fn.bartenders && fn.bartenders > 0 && (
            <li><strong>Bartenders:</strong> {fn.bartenders}{fn.bartendersNote ? ` (${fn.bartendersNote})` : ""}</li>
          )}
          {fn.butlers && fn.butlers > 0 && (
            <li><strong>Butlers:</strong> {fn.butlers}</li>
          )}
        </ul>
      )}

      {fieldBlocks.length > 0 && (
        <ul className="doc-ul">
          {fieldBlocks.map((b) => (
            <li key={b.id}>
              <strong>{b.title}:</strong> {b.value || "—"}
            </li>
          ))}
        </ul>
      )}

      <div>
        {contentBlocks.map((block) => (
          <Block key={block.id} block={block} />
        ))}
      </div>
    </section>
  );
}

export default async function ProposalPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAuth();

  const { id } = await params;

  const data = await getProposalPdfData(id);
  if (!data) {
    notFound();
  }

  const { proposal, company, teamFlow, blocks } = data;
  const fullDate = formatFullDate(new Date(proposal.eventDate));

  // Use DB data if available, otherwise fall back to hardcoded constants
  const stdDeliverableItems: string[] =
    (blocks.standardDeliverables?.blocks[0]?.items as string[] | undefined) ??
    STANDARD_DELIVERABLES;

  const mixerItems: string[] =
    (blocks.mixers?.blocks[0]?.items as string[] | undefined) ??
    MIXERS_DEFAULT;

  const pleaseNoteItems: string[] =
    (blocks.pleaseNote?.blocks[0]?.items as string[] | undefined) ??
    PLEASE_NOTE_OPTIONS.slice(0, 4);

  // T&C from DB blocks, else hardcoded
  const termsBlocks = blocks.termsConditions?.blocks ?? [];

  return (
    <main className="min-h-screen bg-gray-100 relative">
      <PDFViewerWrapper proposal={proposal}>
        <div className="doc-page">
          <div className="doc-content">
            <div className="doc-topbar" />

            <div className="doc-logo-wrap">
              <div className="doc-logo">Deli Cocktail House</div>
              <div className="doc-logo-sub">By Emerge</div>
            </div>

            <div className="doc-body">

              {/* ── COVER PAGE ── */}
              <div className="doc-hero">{fullDate}</div>
              <div className="doc-hero-sub">{proposal.eventName}</div>
              {proposal.venue && <div className="doc-hero-sub">{proposal.venue}</div>}
              {(proposal.clientName || (proposal.guestCount && proposal.guestCount > 0)) && (
                <p className="doc-p" style={{ textAlign: "center", marginBottom: "26px", fontWeight: "700" }}>
                  {proposal.clientName ? `Client: ${proposal.clientName}` : ""}
                  {proposal.guestCount && proposal.guestCount > 0
                    ? `${proposal.clientName ? " • " : ""}Guests: ${proposal.guestCount}`
                    : ""}
                </p>
              )}

              {/* ── STANDARD BAR DELIVERABLES ── always shown */}
              <div className="doc-h2">Standard Bar Deliverables on All Functions</div>
              <ul className="doc-ul">
                {stdDeliverableItems.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>

              {/* ── MIXERS ── always shown */}
              <div className="doc-h2 center">Mixers</div>
              <ul className="doc-ul mixers">
                {mixerItems.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>

              {/* ── TEAM FLOW ── shown if teamFlow rows exist */}
              {teamFlow.length > 0 && (
                <section
                  data-page-break="true"
                  style={{ breakBefore: "always", pageBreakBefore: "always" }}
                >
                  <div className="doc-h1">Team Flow</div>
                  <table className="doc-table">
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
                    <tbody>
                      {teamFlow.map((row) => (
                        <tr key={row.id}>
                          <td>{row.date || "—"}</td>
                          <td>{row.functionType || "—"}</td>
                          <td>{row.venue || "—"}</td>
                          <td>{row.pax || "—"}</td>
                          <td>
                            {row.bartenders > 0 ? row.bartenders : "—"}
                            {row.bartendersNote ? (
                              <span style={{ fontSize: "10px", color: "#666", marginLeft: "4px" }}>
                                ({row.bartendersNote})
                              </span>
                            ) : null}
                          </td>
                          <td>{row.butlers > 0 ? row.butlers : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              )}

              {/* ── EVENT FUNCTIONS ── each function from the proposal */}
              {blocks.eventFunctions.map((fn) =>
                renderFunctionSection(fn as PdfFunction, true)
              )}

              {/* ── PLEASE NOTE ── always shown */}
              <section
                data-page-break="true"
                style={{ breakBefore: "always", pageBreakBefore: "always" }}
              >
                <div className="doc-h1">Please Note</div>
                <ul className="doc-ul arrow">
                  {pleaseNoteItems.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </section>

              {/* ── ADDITIONAL CHARGES ── only if DB has them */}
              {blocks.additionalCharges && (
                <section
                  data-page-break="true"
                  style={{ breakBefore: "always", pageBreakBefore: "always" }}
                >
                  <div className="doc-h1">Additional Charges</div>
                  {blocks.additionalCharges.blocks.map((block: PdfBlock) => (
                    block.type === "list" ? (
                      <ul key={block.id} className="doc-ul arrow">
                        {block.items?.map((it: unknown, i: number) => <li key={i}>{String(it)}</li>)}
                      </ul>
                    ) : <Block key={block.id} block={block as PdfBlock} />
                  ))}
                </section>
              )}

              {/* ── TERMS & CONDITIONS ── always shown (DB or hardcoded) */}
              <section
                data-page-break="true"
                style={{ breakBefore: "always", pageBreakBefore: "always" }}
              >
                <div className="doc-h1">Terms &amp; Conditions</div>
                {termsBlocks.length > 0 ? (
                  termsBlocks.map((block: PdfBlock) => (
                    <div key={block.id}>
                      <div className="doc-h2">❖ {block.title}</div>
                      <p className="doc-p">{block.description}</p>
                    </div>
                  ))
                ) : (
                  TERMS_AND_CONDITIONS.map((t, i) => (
                    <div key={i}>
                      <div className="doc-h2">❖ {t.h}</div>
                      <p className="doc-p">{t.p}</p>
                    </div>
                  ))
                )}
              </section>

            </div>{/* end .doc-body */}

            {/* ── FOOTER ── */}
            <div className="doc-footer">
              <div>☎ {company?.phone1 || company?.phone2 ? `${company.phone1 ?? ""}${company.phone2 ? ` / ${company.phone2}` : ""}` : "+91-9999109404 / 9599737354"}</div>
              <div>{company?.address || "C-3/16, Phase 2, Ashok Vihar, Delhi"}</div>
              <div>✉ {company?.email || "Delicocktailhouse@gmail.com"}</div>
            </div>

          </div>{/* end .doc-content */}
        </div>{/* end .doc-page */}
      </PDFViewerWrapper>
    </main>
  );
}