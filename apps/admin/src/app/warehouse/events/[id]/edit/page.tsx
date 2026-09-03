import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditEventForm } from "@/components/edit-event-form";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Edit Event
          </h1>
          <p className="text-white-85 text-sm">
            Update the event details.
          </p>
        </div>

        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href="/warehouse/events" />}
        >
          <ArrowLeft />
          Back to Events
        </Button>
      </div>

      <EditEventForm eventId={id} />
    </div>
  );
}
