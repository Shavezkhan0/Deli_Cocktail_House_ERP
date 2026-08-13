"use client";

import type { ClientPdfProposal } from "./client-pdf";
import { generateClientPdf } from "./client-pdf";

export async function fetchProposalPdfData(
  eventId: string,
): Promise<{ proposal: ClientPdfProposal }> {
  const response = await fetch(
    `/api/events/${encodeURIComponent(eventId)}/pdf-data`,
    { cache: "no-store" },
  );
  if (!response.ok) {
    throw new Error("Failed to load the proposal data");
  }
  const json = (await response.json()) as {
    data: { proposal: ClientPdfProposal };
  };
  return { proposal: json.data.proposal };
}

export async function downloadClientPdf(
  source: { proposal: ClientPdfProposal },
): Promise<void> {
  const result = await generateClientPdf(source.proposal);
  const anchor = document.createElement("a");
  anchor.href = result.url;
  anchor.download = result.filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(result.url), 10_000);
}
