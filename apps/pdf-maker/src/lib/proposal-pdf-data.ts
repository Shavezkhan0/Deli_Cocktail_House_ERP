import { prisma } from "@repo/database";
import { LIBRARY } from "@/lib/functions";
import type { ClientPdfProposal } from "./client-pdf";

export interface PdfTeamFlowRow {
  id: string;
  date: string;
  functionType: string;
  functionId: string;
  venue?: string;
  pax: string;
  bartenders: number;
  bartendersNote?: string;
  butlers: number;
}

export async function getProposalPdfData(
  id: string,
): Promise<{ proposal: ClientPdfProposal; company: Record<string, string | null>; teamFlow: PdfTeamFlowRow[]; blocks: PdfBlocksData } | null> {
  const proposal = await prisma.eventProposal.findUnique({
    where: { id },
    include: { functions: { orderBy: { sortOrder: "asc" } } },
  });

  if (!proposal) {
    return null;
  }

  const settings = await prisma.pdfCompanySettings.findFirst({ orderBy: { createdAt: "asc" } });

  const company = settings
    ? {
        companyName: settings.companyName ?? null,
        address: settings.address ?? null,
        phone1: settings.phone1 ?? null,
        phone2: settings.phone2 ?? null,
        email: settings.email ?? null,
        footerText: settings.footerText ?? null,
      }
    : {
        companyName: null,
        address: null,
        phone1: null,
        phone2: null,
        email: null,
        footerText: null,
      };

  const teamFlow = Array.isArray(proposal.teamFlowJson)
    ? [...proposal.teamFlowJson] as unknown as PdfTeamFlowRow[]
    : [];

  const functions = proposal.functions.map((fn) => {
    const template = LIBRARY.find((f) => f.id === fn.functionId);
    const overrideBlocks = Array.isArray(fn.overrideJson) ? fn.overrideJson : null;
    const flow = teamFlow.find((r) => r.functionId === fn.functionId);
    return {
      id: fn.id,
      functionId: fn.functionId,
      name: template?.name ?? fn.functionId,
      blocks: overrideBlocks ?? template?.blocks ?? [],
      category: template?.category,
      functionType: flow?.functionType,
      pax: flow?.pax,
      bartenders: flow?.bartenders ?? 0,
      butlers: flow?.butlers ?? 0,
      venue: flow?.venue,
      date: flow?.date,
    };
  });

  const standardDeliverables = functions.find((f) => f.functionId === "standard-deliverables") ?? null;
  const mixers = functions.find((f) => f.functionId === "mixers") ?? null;
  const pleaseNote = functions.find((f) => f.functionId === "please-note") ?? null;
  const termsConditions = functions.find((f) => f.functionId === "terms-conditions") ?? null;
  const additionalCharges = functions.find((f) => f.functionId === "additional-charges") ?? null;

  const SPECIAL_FUNCTION_IDS = new Set([
    "standard-deliverables",
    "mixers",
    "please-note",
    "terms-conditions",
    "additional-charges",
  ]);

  const eventFunctions = functions.filter((f) => !SPECIAL_FUNCTION_IDS.has(f.functionId));

  const blocks = {
    standardDeliverables: standardDeliverables as PdfFunctionData | null,
    mixers: mixers as PdfFunctionData | null,
    pleaseNote: pleaseNote as PdfFunctionData | null,
    termsConditions: termsConditions as PdfFunctionData | null,
    additionalCharges: additionalCharges as PdfFunctionData | null,
    eventFunctions,
  };

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

type PdfFunctionData = {
  id: string;
  functionId: string;
  name: string;
  category?: string;
  blocks: {
    id: string;
    type: string;
    title: string;
    value?: string;
    description?: string;
    items?: unknown[];
  }[];
  functionType?: string;
  pax?: string;
  bartenders?: number;
  butlers?: number;
  bartendersNote?: string;
  venue?: string;
  date?: string;
};

type PdfBlocksData = {
  standardDeliverables?: PdfFunctionData | null;
  mixers?: PdfFunctionData | null;
  pleaseNote?: PdfFunctionData | null;
  termsConditions?: PdfFunctionData | null;
  additionalCharges?: PdfFunctionData | null;
  eventFunctions: PdfFunctionData[];
};