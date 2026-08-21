"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Package, Printer } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ErrorState, EmptyState } from "@/components/common/states";
import { formatEventDate } from "@/modules/crm/utils";
import { apiFetch } from "@/lib/api";
import type { CrmEvent } from "@/modules/crm/types";

export default function KittingReportPage() {
  const [selectedId, setSelectedId] = useState<string>("");

  const { data: events, isPending, isError, refetch } = useQuery({
    queryKey: ["events"],
    queryFn: () => apiFetch<CrmEvent[]>("/api/employee/events"),
  });

  const selected =
    events?.find((event) => event.id === selectedId) ?? events?.[0];

  return (
    <AppShell
      title="Kitting Report"
      subtitle="Review kitting quantities for an event."
      icon={<Package className="size-5" />}
      actions={
        <Button size="sm" onClick={() => window.print()}>
          <Printer className="size-4" />
          Print / PDF
        </Button>
      }
    >
      <Card className="no-print">
        <Label htmlFor="event-select">Select Event</Label>
        <Select
          id="event-select"
          value={selected?.id ?? ""}
          onChange={(event) => setSelectedId(event.target.value)}
          disabled={isPending || isError || (events?.length ?? 0) === 0}
        >
          {!isPending && !isError
            ? events?.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.eventName} — {event.eventCode}
                </option>
              ))
            : null}
        </Select>
      </Card>

      {isPending ? (
        <div className="h-72 animate-pulse rounded-3xl border border-white/10 bg-white/5" />
      ) : isError ? (
        <ErrorState message="Could not load events" onRetry={refetch} />
      ) : events?.length === 0 ? (
        <Card>
          <EmptyState
            message="No events found"
            sub="Events will appear here once they are created."
          />
        </Card>
      ) : (
        <div className="print-area">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-violet-300/80">
                  {selected?.eventCode}
                </p>
                <h2 className="mt-1 text-xl font-bold tracking-tight text-white/90">
                  {selected?.eventName}
                </h2>
                <p className="mt-1 text-sm text-white/60">
                  {selected ? formatEventDate(selected.eventDate) : ""}
                  {selected?.venue ? ` · ${selected.venue}` : ""} ·{" "}
                  {selected?.pax ?? 0} PAX
                </p>
              </div>
              <p className="text-xs font-semibold uppercase tracking-widest text-white/40">
                Kitting Report
              </p>
            </div>

            {selected && selected.inventory.length > 0 ? (
              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wider text-white/60">
                      <th className="px-4 py-3 font-semibold">SKU</th>
                      <th className="px-4 py-3 font-semibold">Item</th>
                      <th className="px-4 py-3 font-semibold">Category</th>
                      <th className="px-4 py-3 font-semibold">Unit</th>
                      <th className="px-4 py-3 text-right font-semibold">
                        Required
                      </th>
                      <th className="px-4 py-3 text-right font-semibold">
                        Issued
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {selected.inventory.map((entry) => (
                      <tr
                        key={entry.id}
                        className="transition-colors hover:bg-white/[0.04]"
                      >
                        <td className="px-4 py-3.5 font-mono text-xs text-violet-300/80">
                          {entry.item.sku}
                        </td>
                        <td className="px-4 py-3.5 font-medium text-white/90">
                          {entry.item.itemName}
                        </td>
                        <td className="px-4 py-3.5 text-white/60">
                          {entry.item.category}
                          {entry.item.subCategory
                            ? ` · ${entry.item.subCategory}`
                            : ""}
                        </td>
                        <td className="px-4 py-3.5 text-white/60">
                          {entry.item.unit}
                        </td>
                        <td className="px-4 py-3.5 text-right font-semibold text-white/90">
                          {entry.requiredQuantity}
                        </td>
                        <td className="px-4 py-3.5 text-right font-semibold text-white/90">
                          {entry.issueQuantity}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-white/10 font-semibold text-white/90">
                      <td colSpan={4} className="px-4 py-3.5">
                        Total
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {selected.inventory.reduce(
                          (sum, entry) => sum + entry.requiredQuantity,
                          0,
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {selected.inventory.reduce(
                          (sum, entry) => sum + entry.issueQuantity,
                          0,
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="mt-6">
                <EmptyState
                  message="No inventory assigned to this event"
                  sub="Kitting quantities will appear here when items are assigned."
                />
              </div>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
