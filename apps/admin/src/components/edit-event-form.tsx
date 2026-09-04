"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarX2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EventForm, type EventFormData } from "@/components/event-form";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export function EditEventForm({ eventId }: { eventId: string }) {
  const { token } = useAuth();

  const { data: event, isPending, isError, refetch } = useQuery({
    queryKey: ["warehouse-event", eventId],
    queryFn: () => apiFetch<EventFormData>(`/api/events/${eventId}`, { token }),
  });

  if (isPending) {
    return (
      <Card className="glass-card-global">
        <CardContent className="pt-4">
          <div className="h-6 w-full animate-pulse rounded bg-white/15" />
        </CardContent>
      </Card>
    );
  }

  if (isError || !event) {
    return (
      <Card className="glass-card-global">
        <CardContent className="pt-4">
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <CalendarX2 className="size-8 text-white/60" />
            <p className="text-sm font-medium text-white">
              Unable to load event
            </p>
            <p className="text-white-85 text-sm">
              Make sure the API is running and try again.
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return <EventForm initialData={event} />;
}
