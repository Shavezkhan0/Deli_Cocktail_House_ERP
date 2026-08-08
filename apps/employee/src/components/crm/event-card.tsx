import Link from "next/link";
import { CalendarDays, ChevronRight, MapPin, Users } from "lucide-react";
import type { CrmEvent } from "@/lib/crm-types";
import { formatEventDate } from "@/lib/crm-format";
import { EventStatusBadge } from "./event-status-badge";
import { EventPipeline } from "./event-pipeline";

export function EventCard({ event }: { event: CrmEvent }) {
  return (
    <Link
      href={`/crm/events/${event.id}`}
      className="group flex flex-col rounded-xl bg-card p-6 ring-1 ring-foreground/10 transition-all duration-300 hover:-translate-y-0.5 hover:ring-violet-500/40 hover:shadow-[0_8px_40px_rgba(139,92,246,0.18)]"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-violet-600">
          {event.eventCode}
        </span>
        <EventStatusBadge status={event.status} />
      </div>

      <h3 className="mt-4 line-clamp-2 text-lg font-semibold tracking-tight text-foreground">
        {event.eventName}
      </h3>

      <div className="mt-3 flex flex-col gap-2 text-xs text-muted-foreground">
        <p className="flex items-center gap-2">
          <CalendarDays className="size-3.5 shrink-0 text-violet-500" />
          <span className="truncate">{formatEventDate(event.eventDate)}</span>
          <span className="text-muted-foreground/50">·</span>
          <span>{event.startTime ?? "—"}</span>
        </p>
        <p className="flex items-center gap-2">
          <MapPin className="size-3.5 shrink-0 text-violet-500" />
          <span className="truncate">{event.venue}</span>
        </p>
        <p className="flex items-center gap-2">
          <Users className="size-3.5 shrink-0 text-violet-500" />
          <span>{event.pax} PAX</span>
        </p>
      </div>

      <div className="mt-5 flex items-center gap-2 border-t border-border pt-4">
        <EventPipeline
          status={event.status}
          inventoryCount={event.inventory.length}
          className="flex-1"
        />
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground transition-all duration-300 group-hover:border-violet-500/40 group-hover:bg-violet-100 group-hover:text-violet-700">
          <ChevronRight className="size-3.5" />
        </span>
      </div>
    </Link>
  );
}
