"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Briefcase, CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { EventCard } from "@/components/crm/event-card";
import { apiFetch } from "@/lib/api";
import { ACTIVE_EVENT_STATUSES, type CrmEvent } from "@/lib/crm-types";
import { cn } from "@/lib/utils";

type TabKey = "active" | "completed" | "all";

const TABS: { key: TabKey; label: string }[] = [
  { key: "active", label: "Active Events" },
  { key: "completed", label: "Completed Events" },
  { key: "all", label: "All Events" },
];

const EMPTY_STATE: Record<
  TabKey,
  { title: string; description: string }
> = {
  active: {
    title: "No active events",
    description: "New events assigned to you will show up here.",
  },
  completed: {
    title: "Nothing completed yet",
    description: "Events that wrap up will be archived here.",
  },
  all: {
    title: "No events yet",
    description: "Events assigned to you will show up here.",
  },
};

function EmptyEvents({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 px-6 py-10 text-center">
      <span className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <Briefcase className="size-5" />
      </span>
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

export default function CrmDashboardPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("active");
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["crm-events"],
    queryFn: () => apiFetch<CrmEvent[]>("/api/employee/crm/events"),
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
          Could not load your events
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
    const visibleEvents = events.filter((event) => {
      if (activeTab === "active") {
        return ACTIVE_EVENT_STATUSES.includes(event.status);
      }
      if (activeTab === "completed") {
        return event.status === "COMPLETED";
      }
      return true;
    });

    const counts = {
      active: events.filter((event) =>
        ACTIVE_EVENT_STATUSES.includes(event.status),
      ).length,
      completed: events.filter((event) => event.status === "COMPLETED").length,
      all: events.length,
    };

    content = (
      <div className="flex flex-col gap-8">
        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-violet-600 text-white shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                  )}
                >
                  {tab.key === "completed" ? (
                    <CheckCircle2 className="size-4" />
                  ) : (
                    <Briefcase className="size-4" />
                  )}
                  {tab.label}
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-semibold",
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-violet-100 text-violet-700",
                    )}
                  >
                    {counts[tab.key]}
                  </span>
                </button>
              );
            })}
          </div>

          {visibleEvents.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visibleEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <EmptyEvents
              title={EMPTY_STATE[activeTab].title}
              description={EMPTY_STATE[activeTab].description}
            />
          )}
        </section>
      </div>
    );
  }

  return (
    <AppShell
      title="CRM Dashboard"
      subtitle="Track the events assigned to you, from booking to post-event."
      icon={<Briefcase className="size-5" />}
    >
      {content}
    </AppShell>
  );
}
