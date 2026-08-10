import { notFound } from "next/navigation";
import { prisma } from "@repo/database";
import {
  EventBuilder,
  type BuilderEvent,
  type BuilderEventFunction,
} from "@/components/events/event-builder";
import { parseTemplateData } from "@/lib/function-templates";

export const dynamic = "force-dynamic";

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}

function toDateInput(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function serializeEvent(
  event: NonNullable<Awaited<ReturnType<typeof findEvent>>>,
): BuilderEvent {
  return {
    id: event.id,
    eventName: event.eventName,
    startDate: toDateInput(event.startDate),
    endDate: toDateInput(event.endDate),
    venue: event.venue,
    deliverables: toStringArray(event.deliverables),
    mixers: toStringArray(event.mixers),
    functions: event.functions.map(
      (fn): BuilderEventFunction => {
        const templateData = parseTemplateData(fn.templateData);
        return {
          id: fn.id,
          functionName: fn.functionName,
          date: fn.date.toISOString(),
          startTime: fn.startTime ?? undefined,
          endTime: fn.endTime ?? undefined,
          pax: fn.pax,
          bartenders: fn.bartenders,
          butlers: fn.butlers,
          siteManager: fn.siteManager ?? undefined,
          theme: fn.theme ?? undefined,
          description: fn.description ?? undefined,
          notes: fn.notes ?? undefined,
          selectedCocktails: templateData.selectedCocktails ?? [],
          sections: templateData.sections ?? [],
        };
      },
    ),
  };
}

async function findEvent(id: string) {
  return prisma.pdfEvent.findUnique({
    where: { id },
    include: { functions: { orderBy: { date: "asc" } } },
  });
}

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const event = await findEvent(id);

  if (!event) {
    notFound();
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Edit Event
        </h1>
        <p className="text-sm text-muted-foreground">
          Update the proposal details for{" "}
          <span className="font-medium text-foreground">{event.eventName}</span>.
        </p>
      </div>

      <EventBuilder mode="edit" event={serializeEvent(event)} />
    </div>
  );
}
