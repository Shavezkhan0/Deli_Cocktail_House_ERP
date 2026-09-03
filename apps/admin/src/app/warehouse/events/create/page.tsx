"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EventForm } from "@/components/event-form";

export default function CreateEventPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Create Event
          </h1>
          <p className="text-white-85 text-sm">
            Schedule a new event for site operations.
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

      <EventForm />
    </div>
  );
}
