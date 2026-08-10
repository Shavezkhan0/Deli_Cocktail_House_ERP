import Link from "next/link";
import { prisma } from "@repo/database";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EventsTable } from "@/components/events/events-table";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const events = await prisma.pdfEvent.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { functions: true } } },
  });

  const serialized = events.map((event) => ({
    id: event.id,
    eventId: event.eventId,
    eventName: event.eventName,
    startDate: event.startDate.toISOString(),
    endDate: event.endDate.toISOString(),
    venue: event.venue,
    city: event.city,
    state: event.state,
    eventType: event.eventType,
    packageType: event.packageType,
    packagePax: event.packagePax,
    clientName: event.clientName,
    status: event.status,
    functionCount: event._count.functions,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Events
          </h1>
          <p className="text-sm text-muted-foreground">
            Create and manage event proposals for your clients.
          </p>
        </div>
        <Button size="lg" nativeButton={false} render={<Link href="/events/new" />}>
          <Plus data-icon="inline-start" />
          Create New Event
        </Button>
      </div>

      <EventsTable events={serialized} />
    </div>
  );
}
