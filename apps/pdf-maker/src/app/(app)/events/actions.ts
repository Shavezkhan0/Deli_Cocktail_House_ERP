"use server";

import { prisma, Prisma } from "@repo/database";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/session";
import type { FunctionTemplateData } from "@/lib/function-templates";

export type EventFunctionInput = {
  id?: string;
  functionName: string;
  date: string;
  startTime?: string;
  endTime?: string;
  pax?: number | null;
  bartenders?: number | null;
  butlers?: number | null;
  siteManager?: string;
  theme?: string;
  description?: string;
  notes?: string;
  templateData?: FunctionTemplateData | null;
};

export type EventInput = {
  id?: string;
  eventName: string;
  startDate: string;
  endDate: string;
  venue?: string;
  deliverables?: string[];
  mixers?: string[];
  functions?: EventFunctionInput[];
};

function cleanText(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function toJsonList(value: string[] | undefined): string[] {
  return Array.isArray(value)
    ? value.map((item) => item.trim()).filter(Boolean)
    : [];
}

function generateEventId(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  const suffix = crypto.randomUUID().slice(0, 4).toUpperCase();
  return slug ? `EVT-${slug}-${suffix}` : `EVT-${suffix}`;
}

export async function createEvent(
  input: EventInput,
): Promise<{ id: string }> {
  await requireAuth();

  if (!input.eventName.trim()) {
    throw new Error("Event Name is required.");
  }
  if (!input.startDate || !input.endDate || !input.venue?.trim()) {
    throw new Error("Dates and Venue are required.");
  }

  const startDate = new Date(input.startDate);
  const endDate = new Date(input.endDate);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    throw new Error("Invalid dates.");
  }

  const event = await prisma.pdfEvent.create({
    data: {
      eventId: generateEventId(input.eventName.trim()),
      eventName: input.eventName.trim(),
      startDate,
      endDate,
      venue: input.venue?.trim() ?? "",
      status: "DRAFT",
      deliverables: toJsonList(input.deliverables),
      mixers: toJsonList(input.mixers),
      functions: {
        create:
          input.functions?.map((fn) => ({
            functionName: fn.functionName,
            date: new Date(fn.date),
            startTime: cleanText(fn.startTime),
            endTime: cleanText(fn.endTime),
            pax: fn.pax ?? null,
            bartenders: fn.bartenders ?? null,
            butlers: fn.butlers ?? null,
            siteManager: cleanText(fn.siteManager),
            theme: cleanText(fn.theme),
            description: cleanText(fn.description),
            notes: cleanText(fn.notes),
            templateData: fn.templateData ?? Prisma.JsonNull,
          })) ?? [],
      },
    },
  });

  revalidatePath("/");
  return { id: event.id };
}

export async function updateEvent(input: EventInput): Promise<{ id: string }> {
  await requireAuth();

  if (!input.id) {
    throw new Error("Event id is required.");
  }
  if (!input.eventName.trim()) {
    throw new Error("Event Name is required.");
  }
  if (!input.startDate || !input.endDate || !input.venue?.trim()) {
    throw new Error("Dates and Venue are required.");
  }

  const startDate = new Date(input.startDate);
  const endDate = new Date(input.endDate);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    throw new Error("Invalid dates.");
  }

  const existing = await prisma.pdfEvent.findUnique({
    where: { id: input.id },
    include: { functions: true },
  });
  if (!existing) {
    throw new Error("Event not found.");
  }

  await prisma.pdfEvent.update({
    where: { id: existing.id },
    data: {
      eventName: input.eventName.trim(),
      startDate,
      endDate,
      venue: input.venue?.trim() ?? "",
      deliverables: toJsonList(input.deliverables),
      mixers: toJsonList(input.mixers),
    },
  });

  await prisma.pdfFunction.deleteMany({ where: { eventId: existing.id } });
  if (input.functions && input.functions.length > 0) {
    await prisma.pdfFunction.createMany({
      data: input.functions.map((fn) => ({
        eventId: existing.id,
        functionName: fn.functionName,
        date: new Date(fn.date),
        startTime: cleanText(fn.startTime),
        endTime: cleanText(fn.endTime),
        pax: fn.pax ?? null,
        bartenders: fn.bartenders ?? null,
        butlers: fn.butlers ?? null,
        siteManager: cleanText(fn.siteManager),
        theme: cleanText(fn.theme),
        description: cleanText(fn.description),
        notes: cleanText(fn.notes),
        templateData: fn.templateData ?? Prisma.JsonNull,
      })),
    });
  }

  revalidatePath("/");
  return { id: existing.id };
}

export async function deleteEvent(id: string): Promise<{ ok: true }> {
  await requireAuth();

  await prisma.pdfEvent.delete({
    where: { id },
  });

  revalidatePath("/");
  return { ok: true };
}

export async function deleteEventProposal(id: string): Promise<{ ok: true }> {
  await requireAuth();

  await prisma.eventProposal.delete({
    where: { id },
  });

  revalidatePath("/");
  return { ok: true };
}

export type EventProposalFunctionInput = {
  functionId: string;
  sortOrder?: number;
  overrideJson?: unknown;
};

export type EventProposalInput = {
  eventName: string;
  clientName: string;
  venue: string;
  eventDate: string;
  guestCount: number;
  companyName?: string;
  companyAddress?: string;
  companyContact?: string;
  companyEmail?: string;
  companyFooterText?: string;
  functions?: EventProposalFunctionInput[];
  teamFlowJson?: unknown;
};

function toOverrideJson(value: unknown): unknown {
  if (value === null || value === undefined) {
    return Prisma.JsonNull;
  }
  if (typeof value === "string" && value.trim() === "") {
    return Prisma.JsonNull;
  }
  return value;
}

export async function getProposalTemplates() {
  await requireAuth();

  return prisma.proposalFunctionTemplate.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      blocks: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });
}

export async function createEventProposal(
  input: EventProposalInput,
): Promise<{ id: string }> {
  await requireAuth();

  if (!input.eventName.trim()) {
    throw new Error("Event Name is required.");
  }
  if (!input.clientName.trim()) {
    throw new Error("Client Name is required.");
  }
  if (!input.venue.trim()) {
    throw new Error("Venue is required.");
  }
  if (!input.eventDate) {
    throw new Error("Event Date is required.");
  }
  if (!Number.isFinite(input.guestCount) || input.guestCount < 0) {
    throw new Error("Guest Count must be a positive number.");
  }

  const eventDate = new Date(input.eventDate);
  if (Number.isNaN(eventDate.getTime())) {
    throw new Error("Invalid event date.");
  }

  const proposal = await prisma.eventProposal.create({
    data: {
      eventName: input.eventName.trim(),
      clientName: input.clientName.trim(),
      venue: input.venue.trim(),
      eventDate,
      guestCount: input.guestCount,
      companyName: cleanText(input.companyName),
      companyAddress: cleanText(input.companyAddress),
      companyContact: cleanText(input.companyContact),
      companyEmail: cleanText(input.companyEmail),
      companyFooterText: cleanText(input.companyFooterText),
      teamFlowJson: input.teamFlowJson ?? Prisma.JsonNull,
      functions: {
        create:
          input.functions?.map((fn) => ({
            functionId: fn.functionId,
            sortOrder: fn.sortOrder ?? 0,
            overrideJson: toOverrideJson(fn.overrideJson),
          })) ?? [],
      },
    },
  });

  revalidatePath("/events");
  return { id: proposal.id };
}

export async function getEventProposal(id: string) {
  await requireAuth();

  const proposal = await prisma.eventProposal.findUnique({
    where: { id },
    include: {
      functions: {
        orderBy: { sortOrder: "asc" },
        include: {
          function: {
            include: {
              blocks: {
                orderBy: { sortOrder: "asc" },
              },
            },
          },
        },
      },
    },
  });

  if (!proposal) {
    throw new Error("Event Proposal not found.");
  }

  return proposal;
}

export async function updateEventProposal(
  id: string,
  input: EventProposalInput,
): Promise<{ id: string }> {
  await requireAuth();

  const existing = await prisma.eventProposal.findUnique({
    where: { id },
  });
  if (!existing) {
    throw new Error("Event Proposal not found.");
  }

  if (!input.eventName.trim()) {
    throw new Error("Event Name is required.");
  }
  if (!input.clientName.trim()) {
    throw new Error("Client Name is required.");
  }
  if (!input.venue.trim()) {
    throw new Error("Venue is required.");
  }
  if (!input.eventDate) {
    throw new Error("Event Date is required.");
  }
  if (!Number.isFinite(input.guestCount) || input.guestCount < 0) {
    throw new Error("Guest Count must be a positive number.");
  }

  const eventDate = new Date(input.eventDate);
  if (Number.isNaN(eventDate.getTime())) {
    throw new Error("Invalid event date.");
  }

  await prisma.eventProposal.update({
    where: { id: existing.id },
    data: {
      eventName: input.eventName.trim(),
      clientName: input.clientName.trim(),
      venue: input.venue.trim(),
      eventDate,
      guestCount: input.guestCount,
      companyName: cleanText(input.companyName),
      companyAddress: cleanText(input.companyAddress),
      companyContact: cleanText(input.companyContact),
      companyEmail: cleanText(input.companyEmail),
      companyFooterText: cleanText(input.companyFooterText),
      teamFlowJson: input.teamFlowJson ?? Prisma.JsonNull,
    },
  });

  await prisma.eventProposalFunction.deleteMany({
    where: { proposalId: existing.id },
  });
  if (input.functions && input.functions.length > 0) {
    await prisma.eventProposalFunction.createMany({
      data: input.functions.map((fn) => ({
        proposalId: existing.id,
        functionId: fn.functionId,
        sortOrder: fn.sortOrder ?? 0,
        overrideJson: toOverrideJson(fn.overrideJson),
      })),
    });
  }

  revalidatePath("/events");
  return { id: existing.id };
}
