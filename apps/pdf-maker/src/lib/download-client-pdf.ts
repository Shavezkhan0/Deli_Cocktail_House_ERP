"use client";

import { generateClientPdf } from "./client-pdf";
import type { ClientPdfSource } from "./client-pdf";

export async function fetchProposalPdfData(
  eventId: string,
): Promise<ClientPdfSource> {
  const response = await fetch(
    `/api/events/${encodeURIComponent(eventId)}/pdf-data`,
    { cache: "no-store" },
  );
  if (!response.ok) {
    throw new Error("Failed to load the proposal data");
  }
  const json = (await response.json()) as { data: ClientPdfSource };
  return json.data;
}

export async function downloadClientPdf(
  source: ClientPdfSource,
): Promise<void> {
  const result = await generateClientPdf(
    source.proposal,
    source.company,
    source.teamFlow,
    source.blocks,
  );
  const anchor = document.createElement("a");
  anchor.href = result.url;
  anchor.download = result.filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(result.url), 10_000);
}
