import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/session";
import { getProposalPdfData } from "@/lib/proposal-pdf-data";
import { DownloadPdfButton } from "@/components/events/download-pdf-button";
import type {
  ClientPdfBlock,
  ClientPdfFunction,
  ClientPdfSubItem,
} from "@/lib/client-pdf";

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
  if (ones === 1 && tens !== 11) return `${day}ST`;
  if (ones === 2 && tens !== 12) return `${day}ND`;
  if (ones === 3 && tens !== 13) return `${day}RD`;
  return `${day}TH`;
}

function formatFullDate(date: Date): string {
  return `${ordinal(date.getDate())} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

function Block({ block }: { block: ClientPdfBlock }) {
  if (block.type === "simple") {
    return (
      <p className="doc-p">
        <strong>{block.title}</strong>{block.value ? `: ${block.value}` : ""}
      </p>
    );
  }
  if (block.type === "list") {
    return (
      <ul className="doc-ul">
        {block.items?.map((it: unknown, i: number) => (
          <li key={i}>{String(it)}</li>
        ))}
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
          {block.items?.map((it: unknown, i: number) => (
            <li key={i}>{String(it)}</li>
          ))}
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
            const sub = (it ?? {}) as ClientPdfSubItem;
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

function renderFunctionSection(fn: ClientPdfFunction, forceNewPage: boolean) {
  const pageBreakClass = forceNewPage ? "break-before-page" : "";
  const pageBreakStyle: CSSProperties | undefined = forceNewPage
    ? { breakBefore: "always", pageBreakBefore: "always" }
    : undefined;

  // Extract the standard simple fields (Uniform, Setup, Ice, Butler, Entertainment)
  // to bundle them into a single list, as requested by the user.
  const fieldBlocks = fn.blocks.filter((b) => b.type === "simple");
  const contentBlocks = fn.blocks.filter((b) => b.type !== "simple");

  return (
    <section
      key={fn.id}
      className={`break-inside-avoid ${pageBreakClass}`}
      style={pageBreakStyle}
      data-page-break={forceNewPage ? "true" : undefined}
    >
      <h1 className="doc-h1">{fn.name}</h1>
      
      {fieldBlocks.length > 0 && (
        <ul className="doc-ul">
          {fieldBlocks.map((b) => (
            <li key={b.id}>
              <strong>{b.title}:</strong> {b.value || "—"}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 space-y-[3px]">
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

  return (
    <>
      <DownloadPdfButton
        data={data}
        className="fixed bottom-6 right-6 z-50 rounded-full px-4 py-2 shadow-lg print:hidden"
        size="lg"
      />
      <div className="doc-page">
        <div className="watermark"><span>DCH</span></div>
        <div className="doc-content">
          <div className="doc-topbar" />

          <div className="doc-logo-wrap">
            <div className="doc-logo">{company.companyName || "Deli Cocktail House by Emerge"}</div>
            <div className="doc-logo-sub">Event Proposal</div>
          </div>

          <div className="doc-body">
            {/* COVER PAGE */}
            <div className="doc-hero">{fullDate}</div>
            <div className="doc-hero-sub">{proposal.eventName}</div>
            <div className="doc-hero-sub">{proposal.venue}</div>
            {proposal.clientName || (proposal.guestCount && proposal.guestCount > 0) ? (
              <p className="doc-p" style={{ textAlign: "center", marginBottom: "26px", fontWeight: "700" }}>
                {proposal.clientName ? `Client: ${proposal.clientName}` : ""}
                {proposal.guestCount && proposal.guestCount > 0 ? `${proposal.clientName ? " • " : ""}Guests: ${proposal.guestCount}` : ""}
              </p>
            ) : null}

            {blocks.standardDeliverables && blocks.standardDeliverables.blocks.length > 0 && (
              <>
                <div className="doc-h2">Standard Bar Deliverables on All Functions</div>
                <ul className="doc-ul">
                  {blocks.standardDeliverables.blocks[0]?.items?.map((it: unknown, i: number) => (
                    <li key={i}>{String(it)}</li>
                  ))}
                </ul>
              </>
            )}

            {blocks.mixers && blocks.mixers.blocks.length > 0 && (
              <>
                <div className="doc-h2 center">Mixers</div>
                <ul className="doc-ul mixers">
                  {blocks.mixers.blocks[0]?.items?.map((it: unknown, i: number) => (
                    <li key={i}>{String(it)}</li>
                  ))}
                </ul>
              </>
            )}

            {/* TEAM FLOW */}
            {teamFlow.length > 0 && (
              <section
                className="break-inside-avoid break-before-page"
                style={{ breakBefore: "always", pageBreakBefore: "always" }}
                data-page-break="true"
              >
                <div className="doc-h1">Team Flow</div>
                <div className="mt-4 overflow-x-auto">
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
                          <td>{row.functionType}</td>
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
                </div>
              </section>
            )}

            {/* EVENT FUNCTIONS */}
            {blocks.eventFunctions.map((fn) => (
              renderFunctionSection(fn, true)
            ))}

            {/* PLEASE NOTE */}
            {blocks.pleaseNote && (
              <section className="break-inside-avoid break-before-page" style={{ breakBefore: "always", pageBreakBefore: "always" }} data-page-break="true">
                <div className="doc-h1">Please Note</div>
                {blocks.pleaseNote.blocks.map((block) => (
                  block.type === "list" ? (
                    <ul key={block.id} className="doc-ul arrow">
                      {block.items?.map((it: unknown, i: number) => <li key={i}>{String(it)}</li>)}
                    </ul>
                  ) : <Block key={block.id} block={block} />
                ))}
              </section>
            )}

            {/* ADDITIONAL CHARGES */}
            {blocks.additionalCharges && (
              <section className="break-inside-avoid break-before-page" style={{ breakBefore: "always", pageBreakBefore: "always" }} data-page-break="true">
                <div className="doc-h1">Additional Charges</div>
                {blocks.additionalCharges.blocks.map((block) => (
                  block.type === "list" ? (
                    <ul key={block.id} className="doc-ul arrow">
                      {block.items?.map((it: unknown, i: number) => <li key={i}>{String(it)}</li>)}
                    </ul>
                  ) : <Block key={block.id} block={block} />
                ))}
              </section>
            )}

            {/* TERMS & CONDITIONS */}
            {blocks.termsConditions && (
              <section className="break-inside-avoid break-before-page" style={{ breakBefore: "always", pageBreakBefore: "always" }} data-page-break="true">
                <div className="doc-h1">Terms & Conditions</div>
                {blocks.termsConditions.blocks.map((block) => (
                  <div key={block.id}>
                    <div className="doc-h2">❖ {block.title}</div>
                    <p className="doc-p">{block.description}</p>
                  </div>
                ))}
              </section>
            )}
          </div>

          <div className="doc-footer">
            <div style={{ flex: 1, textAlign: "left" }}>
              {company.phone1}{company.phone1 && company.phone2 ? " | " : ""}{company.phone2}
            </div>
            <div style={{ flex: 1, textAlign: "center" }}>{company.companyAddress || company.address}</div>
            <div style={{ flex: 1, textAlign: "right" }}>{company.companyEmail || company.email}</div>
          </div>
        </div>
      </div>
    </>
  );
}
