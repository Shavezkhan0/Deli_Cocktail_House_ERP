import { EventBuilder } from "@/components/events/event-builder";

export const dynamic = "force-dynamic";

export default async function NewEventPage() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Create New Event
        </h1>
        <p className="text-sm text-muted-foreground">
          Build a new event proposal.
        </p>
      </div>

      <EventBuilder mode="create" />
    </div>
  );
}
