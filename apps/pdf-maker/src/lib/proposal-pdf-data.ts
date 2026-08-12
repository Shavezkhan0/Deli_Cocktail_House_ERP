import { prisma } from "@repo/database";
import { LIBRARY } from "@/lib/functions";
import type {
  ClientPdfBlock,
  ClientPdfBlocksData,
  ClientPdfCompany,
  ClientPdfFunction,
  ClientPdfProposal,
  ClientPdfSource,
  ClientPdfTeamFlowRow,
} from "./client-pdf";

export async function getProposalPdfData(
  id: string,
): Promise<ClientPdfSource | null> {
  const [proposal, settings] = await Promise.all([
    prisma.eventProposal.findUnique({
      where: { id },
      include: { functions: { orderBy: { sortOrder: "asc" } } },
    }),
    prisma.pdfCompanySettings.findFirst({ orderBy: { createdAt: "asc" } }),
  ]);

  if (!proposal) {
    return null;
  }

  const company: ClientPdfCompany = {
    companyName: settings?.companyName ?? null,
    address: settings?.address ?? null,
    phone1: settings?.phone1 ?? null,
    phone2: settings?.phone2 ?? null,
    email: settings?.email ?? null,
    footerText: settings?.footerText ?? null,
  };

  const functions = proposal.functions.map((fn): ClientPdfFunction => {
    const template = LIBRARY.find((f) => f.id === fn.functionId);
    const overrideBlocks = Array.isArray(fn.overrideJson)
      ? (fn.overrideJson as ClientPdfBlock[])
      : null;
    return {
      id: fn.id,
      functionId: fn.functionId,
      name: template?.name ?? fn.functionId,
      blocks: overrideBlocks ?? template?.blocks ?? [],
      category: template?.category,
    };
  });

  const standardDeliverables =
    functions.find((f) => f.functionId === "standard-deliverables") ?? null;
  const mixers = functions.find((f) => f.functionId === "mixers") ?? null;
  const pleaseNote = functions.find((f) => f.functionId === "please-note") ?? null;
  const termsConditions =
    functions.find((f) => f.functionId === "terms-conditions") ?? null;
  const additionalCharges =
    functions.find((f) => f.functionId === "additional-charges") ?? null;

  const SPECIAL_FUNCTION_IDS = new Set([
    "standard-deliverables",
    "mixers",
    "please-note",
    "terms-conditions",
    "additional-charges",
  ]);

  const eventFunctions = functions.filter(
    (f) => !SPECIAL_FUNCTION_IDS.has(f.functionId),
  );

  const blocks: ClientPdfBlocksData = {
    standardDeliverables,
    mixers,
    pleaseNote,
    termsConditions,
    additionalCharges,
    eventFunctions,
  };

  const teamFlow = Array.isArray(proposal.teamFlowJson)
    ? (proposal.teamFlowJson as ClientPdfTeamFlowRow[])
    : [];

  const pdfProposal: ClientPdfProposal = {
    id: proposal.id,
    eventName: proposal.eventName,
    eventDate: proposal.eventDate.toISOString(),
    venue: proposal.venue ?? null,
    clientName: proposal.clientName ?? null,
    guestCount: proposal.guestCount ?? null,
  };

  return { proposal: pdfProposal, company, teamFlow, blocks };
}
