"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Check,
  Clock,
  ListTodo,
  MapPin,
  Package,
  Plus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { EventStatusBadge } from "@/modules/crm/components/EventStatusBadge";
import { EventPipeline } from "@/modules/crm/components/EventPipeline";
import { apiFetch } from "@/lib/api";
import type { CrmEvent } from "@/modules/crm/types";
import { formatCurrency, formatEventDate, formatTime } from "@/modules/crm/utils";
import { cn } from "@/lib/utils";

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

function DetailCard({
  title,
  icon,
  children,
  className,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl bg-card p-6 ring-1 ring-foreground/10 ${className ?? ""}`}
    >
      <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-foreground">
        <span className="text-violet-600">{icon}</span>
        {title}
      </h3>
      {children}
    </div>
  );
}

export default function CrmEventDetailPage() {
  const params = useParams<{ id: string }>();
  const eventId = params?.id;
  const queryClient = useQueryClient();

  const [newChecklistLabel, setNewChecklistLabel] = useState("");

  const { data: event, isPending, isError, refetch } = useQuery({
    queryKey: ["crm-event", eventId],
    queryFn: () => apiFetch<CrmEvent>(`/api/employee/crm/events/${eventId}`),
    enabled: !!eventId,
  });

  const toggleChecklistItem = useMutation({
    mutationFn: ({
      itemId,
      completed,
    }: {
      itemId: string;
      completed: boolean;
    }) =>
      apiFetch(`/api/employee/crm/events/${eventId}/crm-checklist/${itemId}`, {
        method: "PATCH",
        body: { completed },
      }),
    onSuccess: () => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ["crm-event", eventId] });
      queryClient.invalidateQueries({ queryKey: ["crm-events"] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const addChecklistItem = useMutation({
    mutationFn: (label: string) =>
      apiFetch(`/api/employee/crm/events/${eventId}/crm-checklist`, {
        method: "POST",
        body: { label },
      }),
    onSuccess: () => {
      setNewChecklistLabel("");
      queryClient.invalidateQueries({ queryKey: ["crm-event", eventId] });
      queryClient.invalidateQueries({ queryKey: ["crm-events"] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  let body: React.ReactNode;

  if (isPending) {
    body = (
      <div className="space-y-6">
        <div className="h-44 animate-pulse rounded-xl bg-muted" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="h-72 animate-pulse rounded-xl bg-muted lg:col-span-2" />
          <div className="h-72 animate-pulse rounded-xl bg-muted" />
        </div>
      </div>
    );
  } else if (isError || !event) {
    body = (
      <div className="flex flex-col items-center gap-3 rounded-xl bg-card py-12 text-center ring-1 ring-foreground/10">
        <AlertTriangle className="size-8 text-rose-500" />
        <p className="text-sm font-medium text-foreground">
          Could not load this event
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
    const doneCount = event.crmChecklist.filter(
      (item) => item.completed,
    ).length;
    const groupedChecklist = event.crmChecklist.reduce<
      { section: string; items: typeof event.crmChecklist }[]
    >((sections, item) => {
      const last = sections[sections.length - 1];
      if (last && last.section === item.section) {
        last.items.push(item);
      } else {
        sections.push({
          section: item.section || "General",
          items: [item],
        });
      }
      return sections;
    }, []);

    body = (
      <div className="space-y-6">
        <div className="rounded-xl bg-card p-6 ring-1 ring-foreground/10 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="font-mono text-xs font-semibold uppercase tracking-widest text-violet-600">
              {event.eventCode}
            </span>
            <EventStatusBadge status={event.status} />
          </div>

          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
            {event.eventName}
          </h1>

          <div className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
            <p className="flex items-center gap-2">
              <CalendarDays className="size-4 shrink-0 text-violet-500" />
              {formatEventDate(event.eventDate)}
            </p>
            <p className="flex items-center gap-2">
              <Clock className="size-4 shrink-0 text-violet-500" />
              {formatTime(event.startTime)} – {formatTime(event.endTime)}
            </p>
            <p className="flex items-center gap-2">
              <MapPin className="size-4 shrink-0 text-violet-500" />
              <span className="truncate">{event.venue}</span>
            </p>
            <p className="flex items-center gap-2">
              <Users className="size-4 shrink-0 text-violet-500" />
              {event.pax} PAX
            </p>
          </div>

          <div className="mt-6 rounded-xl bg-muted/50 px-4 py-5">
            <EventPipeline
              status={event.status}
              inventoryCount={event.inventory.length}
            />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-6 lg:col-span-2">
            <DetailCard
              title="CRM Checklist"
              icon={<ListTodo className="size-4" />}
            >
              {event.crmChecklist.length > 0 ? (
                <div className="mt-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-medium text-muted-foreground">
                      {doneCount} of {event.crmChecklist.length} tasks done
                    </span>
                    {doneCount === event.crmChecklist.length ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 font-semibold text-emerald-700">
                        <Check className="size-3.5" />
                        All tasks complete
                      </span>
                    ) : null}
                  </div>

                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                      style={{
                        width: `${(doneCount / event.crmChecklist.length) * 100}%`,
                      }}
                    />
                  </div>

                  <ul className="flex flex-col gap-4">
                    {groupedChecklist.map((group) => (
                      <li key={group.section} className="flex flex-col gap-2">
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-violet-700">
                          {group.section}
                        </h4>
                        <ul className="flex flex-col gap-2">
                          {group.items.map((item) => (
                            <li
                              key={item.id}
                              className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-3 py-2.5"
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  toggleChecklistItem.mutate({
                                    itemId: item.id,
                                    completed: !item.completed,
                                  })
                                }
                                disabled={toggleChecklistItem.isPending}
                                aria-label={
                                  item.completed
                                    ? "Mark as incomplete"
                                    : "Mark as complete"
                                }
                                className={cn(
                                  "flex size-6 shrink-0 items-center justify-center rounded-md border transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                                  item.completed
                                    ? "border-emerald-500 bg-emerald-500 text-white"
                                    : "border-border hover:border-emerald-500/50",
                                )}
                              >
                                {item.completed ? (
                                  <Check className="size-4" />
                                ) : null}
                              </button>
                              <span
                                className={cn(
                                  "flex-1 text-sm font-medium",
                                  item.completed &&
                                    "text-muted-foreground line-through",
                                )}
                              >
                                {item.label}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">
                  No CRM checklist tasks defined for this event yet.
                </p>
              )}

              <div className="mt-4 flex items-center gap-2 border-t border-border pt-4">
                <input
                  type="text"
                  value={newChecklistLabel}
                  onChange={(event) => setNewChecklistLabel(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      const label = newChecklistLabel.trim();
                      if (label) {
                        addChecklistItem.mutate(label);
                      }
                    }
                  }}
                  placeholder="Add your own task…"
                  className="h-9 flex-1 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
                <button
                  type="button"
                  disabled={
                    addChecklistItem.isPending ||
                    newChecklistLabel.trim() === ""
                  }
                  onClick={() => {
                    const label = newChecklistLabel.trim();
                    if (label) {
                      addChecklistItem.mutate(label);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Plus className="size-4" />
                  Add Task
                </button>
              </div>
            </DetailCard>

            <DetailCard title="Event Inventory" icon={<Package className="size-4" />}>
              {event.inventory.length > 0 ? (
                <ul className="mt-4 flex flex-col gap-3">
                  {event.inventory.map((entry) => (
                    <li
                      key={entry.id}
                      className="rounded-xl border border-border bg-muted/30 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {entry.item.itemName}
                          </p>
                          <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                            {entry.item.sku} · {entry.item.category}
                            {entry.item.subCategory
                              ? ` · ${entry.item.subCategory}`
                              : ""}
                          </p>
                        </div>
                        <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                          {entry.item.unit}
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {[
                          ["Required", entry.requiredQuantity],
                          ["Reserved", entry.reserveQuantity],
                          ["Issued", entry.issueQuantity],
                        ].map(([label, value]) => (
                          <div
                            key={label as string}
                            className="rounded-lg bg-card px-3 py-2 ring-1 ring-foreground/10"
                          >
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                              {label}
                            </p>
                            <p className="mt-0.5 text-sm font-bold text-violet-700">
                              {value as number}
                            </p>
                          </div>
                        ))}
                      </div>
                      {entry.remarks ? (
                        <p className="mt-3 text-xs text-muted-foreground">
                          {entry.remarks}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">
                  No inventory assigned to this event yet.
                </p>
              )}
            </DetailCard>
          </div>

          <div className="flex flex-col gap-6">
            <DetailCard title="Cost Summary" icon={<Package className="size-4" />}>
              <dl className="mt-4 flex flex-col gap-3">
                <div className="flex items-center justify-between text-sm">
                  <dt className="text-muted-foreground">Inventory</dt>
                  <dd className="font-medium text-foreground">
                    {formatCurrency(event.inventoryCost)}
                  </dd>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <dt className="text-muted-foreground">Staff</dt>
                  <dd className="font-medium text-foreground">
                    {formatCurrency(event.staffCost)}
                  </dd>
                </div>
                <div className="flex items-center justify-between border-t border-border pt-3 text-base">
                  <dt className="font-semibold text-foreground">Total</dt>
                  <dd className="font-bold text-violet-700">
                    {formatCurrency(event.totalCost)}
                  </dd>
                </div>
              </dl>
            </DetailCard>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AppShell
      title="Event Details"
      subtitle="Full details, pipeline and inventory for this event."
      icon={<CalendarDays className="size-5" />}
    >
      <Link
        href="/modules/crm/dashboard"
        className="flex w-fit items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-violet-700"
      >
        <ArrowLeft className="size-4" />
        Back to CRM Dashboard
      </Link>
      {body}
    </AppShell>
  );
}
