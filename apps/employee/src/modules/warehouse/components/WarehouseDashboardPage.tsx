"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CalendarDays,
  ChevronRight,
  MapPin,
  PackageCheck,
  Send,
  Users,
  Warehouse,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { StatCard, type StatCardProps } from "@/components/common/quick-stats-row";

type WarehouseEventInventory = {
  id: string;
  itemId: string;
  requiredQuantity: number;
  issueQuantity: number;
  item: {
    id: string;
    sku: string;
    itemName: string;
    category: string;
    unit: string;
  };
};

type WarehouseEvent = {
  id: string;
  eventName: string;
  eventCode: string;
  eventDate: string;
  startTime: string | null;
  venue: string;
  pax: number;
  status: string;
  pendingDispatchCount: number;
  pendingReturnCount: number;
  inventory: WarehouseEventInventory[];
};

type EventStatus = "UPCOMING" | "ONGOING" | "COMPLETED" | "CANCELLED";

const STATUS_STYLES: Record<EventStatus, string> = {
  UPCOMING: "bg-sky-100 text-sky-700",
  ONGOING: "bg-emerald-100 text-emerald-700",
  COMPLETED: "bg-violet-100 text-violet-700",
  CANCELLED: "bg-rose-100 text-rose-700",
};

const STATUS_DOTS: Record<EventStatus, string> = {
  UPCOMING: "bg-sky-500",
  ONGOING: "bg-emerald-500",
  COMPLETED: "bg-violet-500",
  CANCELLED: "bg-rose-500",
};

function formatEventDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function EventStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const key = (status as EventStatus) in STATUS_STYLES ? (status as EventStatus) : "UPCOMING";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
        STATUS_STYLES[key],
        className,
      )}
    >
      <span
        className={cn("size-1.5 rounded-full", STATUS_DOTS[key])}
        aria-hidden
      />
      {status.replace("_", " ")}
    </span>
  );
}

function WarehouseEventCard({ event }: { event: WarehouseEvent }) {
  const actionState =
    event.pendingDispatchCount > 0
      ? {
          label: `${event.pendingDispatchCount} to load`,
          pillClass: "bg-orange-100 text-orange-700",
          dotClass: "bg-orange-500",
        }
      : event.pendingReturnCount > 0
        ? {
            label: `${event.pendingReturnCount} to return`,
            pillClass: "bg-sky-100 text-sky-700",
            dotClass: "bg-sky-500",
          }
        : {
            label: "All clear",
            pillClass: "bg-emerald-100 text-emerald-700",
            dotClass: "bg-emerald-500",
          };

  return (
    <Link
      href={`/modules/warehouse/events/${event.id}`}
      className="group flex flex-col rounded-xl bg-card p-6 ring-1 ring-foreground/10 transition-all duration-300 hover:-translate-y-0.5 hover:ring-orange-500/40 hover:shadow-[0_8px_40px_rgba(249,115,22,0.15)]"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-orange-600">
          {event.eventCode}
        </span>
        <EventStatusBadge status={event.status} />
      </div>

      <h3 className="mt-4 line-clamp-2 text-lg font-semibold tracking-tight text-foreground">
        {event.eventName}
      </h3>

      <div className="mt-3 flex flex-col gap-2 text-xs text-muted-foreground">
        <p className="flex items-center gap-2">
          <CalendarDays className="size-3.5 shrink-0 text-orange-500" />
          <span className="truncate">{formatEventDate(event.eventDate)}</span>
          {event.startTime ? (
            <>
              <span className="text-muted-foreground/50">·</span>
              <span>{event.startTime}</span>
            </>
          ) : null}
        </p>
        <p className="flex items-center gap-2">
          <MapPin className="size-3.5 shrink-0 text-orange-500" />
          <span className="truncate">{event.venue}</span>
        </p>
        <p className="flex items-center gap-2">
          <Users className="size-3.5 shrink-0 text-orange-500" />
          <span>{event.pax} PAX</span>
        </p>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
            actionState.pillClass,
          )}
        >
          <span
            className={cn("size-1.5 rounded-full", actionState.dotClass)}
            aria-hidden
          />
          {actionState.label}
        </span>
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground transition-all duration-300 group-hover:border-orange-500/40 group-hover:bg-orange-100 group-hover:text-orange-700">
          <ChevronRight className="size-3.5" />
        </span>
      </div>
    </Link>
  );
}

export function WarehouseDashboardPage() {
  const [activeFilter, setActiveFilter] = useState<"active" | "completed" | "all">("active");
  const [statFilter, setStatFilter] = useState<"dispatch" | "return" | null>(null);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["warehouse-events"],
    queryFn: () => apiFetch<WarehouseEvent[]>("/api/employee/warehouse/events"),
  });

  let content: React.ReactNode;

  if (isPending) {
    content = (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-64 animate-pulse rounded-xl bg-muted"
          />
        ))}
      </div>
    );
  } else if (isError) {
    content = (
      <div className="flex flex-col items-center gap-3 rounded-xl bg-card py-12 text-center ring-1 ring-foreground/10">
        <AlertTriangle className="size-8 text-rose-500" />
        <p className="text-sm font-medium text-foreground">
          Could not load events
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
        >
          Try again
        </button>
      </div>
    );
  } else {
    const events = data ?? [];
    const toDispatchCount = events.filter((event) => event.pendingDispatchCount > 0).length;
    const toReturnCount = events.filter((event) => event.pendingReturnCount > 0).length;

    const stats: (Pick<StatCardProps, "label" | "icon" | "accent" | "onClick" | "active"> & { count: number })[] = [
      {
        label: "Events to Dispatch",
        icon: Send,
        accent: "bg-orange-100 text-orange-700",
        count: toDispatchCount,
        onClick: () =>
          setStatFilter((prev) => (prev === "dispatch" ? null : "dispatch")),
        active: statFilter === "dispatch",
      },
      {
        label: "Pending Returns",
        icon: PackageCheck,
        accent: "bg-sky-100 text-sky-700",
        count: toReturnCount,
        onClick: () =>
          setStatFilter((prev) => (prev === "return" ? null : "return")),
        active: statFilter === "return",
      },
    ];

    const filteredEvents = statFilter
      ? events.filter((event) =>
          statFilter === "dispatch"
            ? event.pendingDispatchCount > 0
            : event.pendingReturnCount > 0,
        )
      : events.filter((event) => {
          if (activeFilter === "active") {
            return event.status === "UPCOMING" || event.status === "ONGOING";
          }
          if (activeFilter === "completed") {
            return event.status === "COMPLETED";
          }
          return true;
        });

    const sortedEvents = statFilter
      ? filteredEvents
      : [...filteredEvents].sort(
          (a, b) =>
            Number(b.pendingDispatchCount > 0 || b.pendingReturnCount > 0) -
            Number(a.pendingDispatchCount > 0 || a.pendingReturnCount > 0),
        );

    content = (
      <div className="flex flex-col gap-8">
        <div className="grid gap-4 sm:grid-cols-2">
          {stats.map((stat) => (
            <StatCard
              key={stat.label}
              label={stat.label}
              icon={stat.icon}
              accent={stat.accent}
              onClick={stat.onClick}
              active={stat.active}
            >
              {stat.count}
            </StatCard>
          ))}
        </div>

        <section className="flex flex-col gap-4">
          {statFilter ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-medium text-muted-foreground">
                {statFilter === "dispatch"
                  ? "Showing events that need dispatch"
                  : "Showing events with pending returns"}
              </p>
              <button
                type="button"
                onClick={() => setStatFilter(null)}
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
              >
                Clear filter
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {(["active", "completed", "all"] as const).map((tab) => {
                const isActive = activeFilter === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveFilter(tab)}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-orange-600 text-white shadow-sm"
                        : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                    )}
                  >
                    <Warehouse className="size-4" />
                    {tab === "active"
                      ? "Active Events"
                      : tab === "completed"
                        ? "Completed"
                        : "All"}
                  </button>
                );
              })}
            </div>
          )}

          {sortedEvents.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sortedEvents.map((event) => (
                <WarehouseEventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 px-6 py-10 text-center">
              <span className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <Warehouse className="size-5" />
              </span>
              <p className="text-sm font-medium text-foreground">
                {statFilter === "dispatch"
                  ? "Nothing needs dispatch right now"
                  : statFilter === "return"
                    ? "No pending returns right now"
                    : "No events yet"}
              </p>
              <p className="text-xs text-muted-foreground">
                {statFilter
                  ? "Check back later or clear the filter."
                  : "Events will appear here when they are scheduled."}
              </p>
            </div>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {content}
    </div>
  );
}
