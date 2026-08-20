"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  MapPin,
  Package,
  Send,
  SendHorizontal,
  Users,
  AlertCircle,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ErrorState } from "@/components/common/states";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { formatEventDate } from "@/modules/crm/utils";

type WarehouseEventInventory = {
  id: string;
  itemId: string;
  itemName: string;
  sku: string;
  category: string;
  unit: string;
  requiredQuantity: number;
  issueQuantity: number;
  loadedQty: number;
  returnedQty: number;
  damageReportedQty: number;
  lostQty: number;
};

type WarehouseEventDetail = {
  id: string;
  eventName: string;
  eventCode: string;
  eventDate: string;
  startTime: string | null;
  venue: string;
  pax: number;
  status: string;
  inventory: WarehouseEventInventory[];
};

type TabKey = "out" | "in" | "damage";

function statusBadge(status: string) {
  switch (status) {
    case "UPCOMING":
      return <Badge tone="info">{status}</Badge>;
    case "ONGOING":
      return <Badge tone="success">{status}</Badge>;
    case "COMPLETED":
      return <Badge tone="violet">{status}</Badge>;
    case "CANCELLED":
      return <Badge tone="danger">{status}</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}

function clampQuantity(raw: string, max: number): string {
  if (raw === "") return "";
  const num = Number(raw);
  if (Number.isNaN(num)) return "";
  return String(Math.max(0, Math.min(num, max)));
}

function DamageReportForm({
  itemId,
  shortfall,
  eventId,
  onSuccess,
}: {
  itemId: string;
  shortfall: number;
  eventId: string;
  onSuccess: () => void;
}) {
  const [quantity, setQuantity] = useState("");
  const [remark, setRemark] = useState("");
  const [reason, setReason] = useState<"DAMAGE" | "LOST">("DAMAGE");
  const [dismissed, setDismissed] = useState(false);

  const reportDamage = useMutation({
    mutationFn: () =>
      apiFetch(`/api/employee/warehouse/events/${eventId}/damage`, {
        method: "POST",
        body: {
          items: [{ itemId, quantity: Number(quantity), remark, reason }],
        },
      }),
    onSuccess: () => {
      toast.success("Damage reported");
      setDismissed(true);
      onSuccess();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  if (dismissed) return null;

  return (
    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-medium text-amber-800">
              {shortfall} short — report damage/loss?
            </p>
            <div className="mt-3 flex flex-col gap-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setReason("DAMAGE")}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                    reason === "DAMAGE"
                      ? "bg-amber-600 text-white"
                      : "bg-amber-100 text-amber-700 hover:bg-amber-200",
                  )}
                >
                  Damage
                </button>
                <button
                  type="button"
                  onClick={() => setReason("LOST")}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                    reason === "LOST"
                      ? "bg-amber-600 text-white"
                      : "bg-amber-100 text-amber-700 hover:bg-amber-200",
                  )}
                >
                  Lost
                </button>
              </div>
              <div className="flex items-center gap-3">
                <Label htmlFor={`damage-qty-${itemId}`} className="text-xs text-amber-700">
                  Qty
                </Label>
                <Input
                  id={`damage-qty-${itemId}`}
                  type="number"
                  min={1}
                  max={shortfall}
                  value={quantity}
                  placeholder="0"
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-20 rounded-lg border-amber-300 bg-white text-sm"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`damage-remark-${itemId}`} className="text-xs text-amber-700">
                  What happened? *
                </Label>
                <Textarea
                  id={`damage-remark-${itemId}`}
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  placeholder="Describe the damage or loss…"
                  rows={2}
                  className="rounded-lg border-amber-300 bg-white text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDismissed(true)}
                  className="border-amber-300 text-amber-700 hover:bg-amber-100"
                >
                  Dismiss
                </Button>
                <Button
                  size="sm"
                  disabled={
                    reportDamage.isPending ||
                    Number(quantity) < 1 ||
                    remark.trim() === ""
                  }
                  onClick={() => reportDamage.mutate()}
                  className="bg-amber-600 text-white hover:bg-amber-700"
                >
                  {reportDamage.isPending
                    ? "Submitting…"
                    : reason === "LOST" ? "Report Loss" : "Report Damage"}
                </Button>
              </div>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="shrink-0 text-amber-400 hover:text-amber-600"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}

export default function WarehouseEventDetailPage() {
  const params = useParams<{ id: string }>();
  const eventId = params?.id;
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>("out");
  const [outQuantities, setOutQuantities] = useState<Record<string, string>>({});
  const [inQuantities, setInQuantities] = useState<Record<string, string>>({});
  const [damageForms, setDamageForms] = useState<
    Record<string, { quantity: string; remark: string; reason: "DAMAGE" | "LOST" }>
  >({});

  const { data: event, isPending, isError, refetch } = useQuery({
    queryKey: ["warehouse-event", eventId],
    queryFn: () =>
      apiFetch<WarehouseEventDetail>(`/api/employee/warehouse/events/${eventId}`),
    enabled: !!eventId,
  });

  const submitOut = useMutation({
    mutationFn: (items: { itemId: string; quantity: number }[]) =>
      apiFetch(`/api/employee/warehouse/events/${eventId}/out`, {
        method: "POST",
        body: { items },
      }),
    onSuccess: () => {
      toast.success("Items dispatched");
      setOutQuantities({});
      queryClient.invalidateQueries({ queryKey: ["warehouse-event", eventId] });
      queryClient.invalidateQueries({ queryKey: ["warehouse-events"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const submitIn = useMutation({
    mutationFn: (items: { itemId: string; quantity: number }[]) =>
      apiFetch(`/api/employee/warehouse/events/${eventId}/in`, {
        method: "POST",
        body: { items },
      }),
    onSuccess: () => {
      toast.success("Items returned");
      setInQuantities({});
      queryClient.invalidateQueries({ queryKey: ["warehouse-event", eventId] });
      queryClient.invalidateQueries({ queryKey: ["warehouse-events"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const submitDamage = useMutation({
    mutationFn: (items: { itemId: string; quantity: number; remark: string; reason: "DAMAGE" | "LOST" }[]) =>
      apiFetch(`/api/employee/warehouse/events/${eventId}/damage`, {
        method: "POST",
        body: { items },
      }),
    onSuccess: () => {
      toast.success("Damage reported");
      setDamageForms({});
      queryClient.invalidateQueries({ queryKey: ["warehouse-event", eventId] });
      queryClient.invalidateQueries({ queryKey: ["warehouse-events"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  function handleOutSubmit() {
    const items = Object.entries(outQuantities)
      .filter(([, qty]) => Number(qty) > 0)
      .map(([itemId, qty]) => ({ itemId, quantity: Number(qty) }));
    if (items.length === 0) return;
    submitOut.mutate(items);
  }

  function handleInSubmit() {
    const items = Object.entries(inQuantities)
      .filter(([, qty]) => Number(qty) > 0)
      .map(([itemId, qty]) => ({ itemId, quantity: Number(qty) }));
    if (items.length === 0) return;
    submitIn.mutate(items);
  }

  function getOutQty(item: WarehouseEventInventory) {
    return outQuantities[item.itemId] ?? "";
  }

  function getInQty(item: WarehouseEventInventory) {
    return inQuantities[item.itemId] ?? "";
  }

  let body: React.ReactNode;

  if (isPending) {
    body = (
      <div className="space-y-6">
        <div className="h-44 animate-pulse rounded-xl bg-muted" />
        <div className="h-96 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  } else if (isError || !event) {
    body = <ErrorState message="Could not load this event" onRetry={refetch} />;
  } else {
    const hasOutItems = event.inventory.some(
      (item) => item.loadedQty < item.issueQuantity,
    );
    const hasInItems = event.inventory.some(
      (item) => item.loadedQty > item.returnedQty,
    );

    body = (
      <div className="flex flex-col gap-6">
        <div className="rounded-xl bg-card p-6 ring-1 ring-foreground/10 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="font-mono text-xs font-semibold uppercase tracking-widest text-orange-600">
              {event.eventCode}
            </span>
            {statusBadge(event.status)}
          </div>

          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
            {event.eventName}
          </h1>

          <div className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
            <p className="flex items-center gap-2">
              <CalendarDays className="size-4 shrink-0 text-orange-500" />
              {formatEventDate(event.eventDate)}
            </p>
            {event.startTime ? (
              <p className="flex items-center gap-2">
                <Clock className="size-4 shrink-0 text-orange-500" />
                {event.startTime}
              </p>
            ) : null}
            <p className="flex items-center gap-2">
              <MapPin className="size-4 shrink-0 text-orange-500" />
              <span className="truncate">{event.venue}</span>
            </p>
            <p className="flex items-center gap-2">
              <Users className="size-4 shrink-0 text-orange-500" />
              {event.pax} PAX
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("out")}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
              activeTab === "out"
                ? "bg-orange-600 text-white shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground",
            )}
          >
            <Send className="size-4" />
            Load Out
            {hasOutItems ? (
              <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.5 text-xs font-semibold">
                {event.inventory.filter((i) => i.loadedQty < i.issueQuantity).length}
              </span>
            ) : null}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("in")}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
              activeTab === "in"
                ? "bg-orange-600 text-white shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground",
            )}
          >
            <SendHorizontal className="size-4" />
            Return In
            {hasInItems ? (
              <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.5 text-xs font-semibold">
                {event.inventory.filter((i) => i.loadedQty > i.returnedQty).length}
              </span>
            ) : null}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("damage")}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
              activeTab === "damage"
                ? "bg-orange-600 text-white shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground",
            )}
          >
            <AlertCircle className="size-4" />
            Report Issue
          </button>
        </div>

        {activeTab === "out" ? (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3 font-semibold">SKU</th>
                    <th className="px-4 py-3 font-semibold">Item</th>
                    <th className="px-4 py-3 font-semibold">Unit</th>
                    <th className="px-4 py-3 text-right font-semibold">Required</th>
                    <th className="px-4 py-3 text-right font-semibold">Issued</th>
                    <th className="px-4 py-3 text-right font-semibold">Loaded</th>
                    <th className="px-4 py-3 text-right font-semibold">To Load</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {event.inventory.map((item) => {
                    const remaining = Math.max(0, item.issueQuantity - item.loadedQty);
                    const isComplete = remaining === 0;
                    return (
                      <tr
                        key={item.id}
                        className={cn(
                          "transition-colors hover:bg-muted/30",
                          isComplete && "opacity-60",
                        )}
                      >
                        <td className="px-4 py-3.5 font-mono text-xs text-muted-foreground">
                          {item.sku}
                        </td>
                        <td className="px-4 py-3.5 font-medium text-foreground">
                          {item.itemName}
                        </td>
                        <td className="px-4 py-3.5 text-muted-foreground">
                          {item.unit}
                        </td>
                        <td className="px-4 py-3.5 text-right text-muted-foreground">
                          {item.requiredQuantity}
                        </td>
                        <td className="px-4 py-3.5 text-right font-medium text-foreground">
                          {item.issueQuantity}
                        </td>
                        <td className="px-4 py-3.5 text-right font-medium text-foreground">
                          {item.loadedQty}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          {isComplete ? (
                            <span className="text-xs font-medium text-emerald-600">
                              Done
                            </span>
                          ) : (
                            <Input
                              type="number"
                              min={0}
                              max={remaining}
                              value={getOutQty(item)}
                              placeholder="0"
                              onChange={(e) =>
                                setOutQuantities((prev) => ({
                                  ...prev,
                                  [item.itemId]: clampQuantity(
                                    e.target.value,
                                    remaining,
                                  ),
                                }))
                              }
                              className="w-20 rounded-lg py-1.5 text-right text-xs"
                            />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-end border-t border-border px-4 py-3">
              <Button
                size="sm"
                disabled={
                  submitOut.isPending ||
                  !Object.values(outQuantities).some((q) => Number(q) > 0)
                }
                onClick={handleOutSubmit}
              >
                <Send className="size-3.5" />
                {submitOut.isPending ? "Dispatching…" : "Submit Out"}
              </Button>
            </div>
          </Card>
        ) : activeTab === "in" ? (
          <div className="flex flex-col gap-4">
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 py-3 font-semibold">SKU</th>
                      <th className="px-4 py-3 font-semibold">Item</th>
                      <th className="px-4 py-3 font-semibold">Unit</th>
                      <th className="px-4 py-3 text-right font-semibold">Loaded</th>
                      <th className="px-4 py-3 text-right font-semibold">Returned</th>
                      <th className="px-4 py-3 text-right font-semibold">Damage</th>
                      <th className="px-4 py-3 text-right font-semibold">Lost</th>
                      <th className="px-4 py-3 text-right font-semibold">To Return</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {event.inventory.map((item) => {
                      const outstanding = Math.max(0, item.loadedQty - item.returnedQty);
                      const isComplete = outstanding === 0;
                      return (
                        <tr
                          key={item.id}
                          className={cn(
                            "transition-colors hover:bg-muted/30",
                            isComplete && "opacity-60",
                          )}
                        >
                          <td className="px-4 py-3.5 font-mono text-xs text-muted-foreground">
                            {item.sku}
                          </td>
                          <td className="px-4 py-3.5 font-medium text-foreground">
                            {item.itemName}
                          </td>
                          <td className="px-4 py-3.5 text-muted-foreground">
                            {item.unit}
                          </td>
                          <td className="px-4 py-3.5 text-right font-medium text-foreground">
                            {item.loadedQty}
                          </td>
                          <td className="px-4 py-3.5 text-right font-medium text-foreground">
                            {item.returnedQty}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            {item.damageReportedQty > 0 ? (
                              <span className="text-xs font-medium text-amber-600">
                                {item.damageReportedQty}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">0</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            {item.lostQty > 0 ? (
                              <span className="text-xs font-medium text-amber-600">
                                {item.lostQty}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">0</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            {isComplete ? (
                              <span className="text-xs font-medium text-emerald-600">
                                Done
                              </span>
                            ) : (
                              <Input
                                type="number"
                                min={0}
                                max={outstanding}
                                value={getInQty(item)}
                                placeholder="0"
                                onChange={(e) =>
                                  setInQuantities((prev) => ({
                                    ...prev,
                                    [item.itemId]: clampQuantity(
                                      e.target.value,
                                      outstanding,
                                    ),
                                  }))
                                }
                                className="w-20 rounded-lg py-1.5 text-right text-xs"
                              />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-end border-t border-border px-4 py-3">
                <Button
                  size="sm"
                  disabled={
                    submitIn.isPending ||
                    !Object.values(inQuantities).some((q) => Number(q) > 0)
                  }
                  onClick={handleInSubmit}
                >
                  <SendHorizontal className="size-3.5" />
                  {submitIn.isPending ? "Returning…" : "Submit In"}
                </Button>
              </div>
            </Card>

            {event.inventory.map((item) => {
              const outstanding = Math.max(0, item.loadedQty - item.returnedQty);
              const currentReturn = Number(inQuantities[item.itemId] ?? 0);
              const newReturned = item.returnedQty + currentReturn;
              const shortfallAfterReturn = Math.max(0, item.loadedQty - newReturned);
              const showDamage =
                currentReturn > 0 && shortfallAfterReturn > item.damageReportedQty + item.lostQty;

              return showDamage ? (
                <DamageReportForm
                  key={item.id}
                  itemId={item.itemId}
                  shortfall={shortfallAfterReturn - item.damageReportedQty - item.lostQty}
                  eventId={eventId!}
                  onSuccess={refetch}
                />
              ) : null;
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 py-3 font-semibold">SKU</th>
                      <th className="px-4 py-3 font-semibold">Item</th>
                      <th className="px-4 py-3 font-semibold">Unit</th>
                      <th className="px-4 py-3 text-right font-semibold">Loaded</th>
                      <th className="px-4 py-3 text-right font-semibold">Returned</th>
                      <th className="px-4 py-3 text-right font-semibold">Damage Reported</th>
                      <th className="px-4 py-3 text-right font-semibold">Lost</th>
                      <th className="px-4 py-3 text-right font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {event.inventory.map((item) => {
                      const form = damageForms[item.itemId];
                      const quantity = form?.quantity ?? "";
                      const remark = form?.remark ?? "";
                      const isFormOpen = !!form;
                      return (
                        <tr
                          key={item.id}
                          className="transition-colors hover:bg-muted/30"
                        >
                          <td className="px-4 py-3.5 font-mono text-xs text-muted-foreground">
                            {item.sku}
                          </td>
                          <td className="px-4 py-3.5 font-medium text-foreground">
                            {item.itemName}
                          </td>
                          <td className="px-4 py-3.5 text-muted-foreground">
                            {item.unit}
                          </td>
                          <td className="px-4 py-3.5 text-right font-medium text-foreground">
                            {item.loadedQty}
                          </td>
                          <td className="px-4 py-3.5 text-right font-medium text-foreground">
                            {item.returnedQty}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            {item.damageReportedQty > 0 ? (
                              <span className="text-xs font-medium text-amber-600">
                                {item.damageReportedQty}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">0</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            {item.lostQty > 0 ? (
                              <span className="text-xs font-medium text-amber-600">
                                {item.lostQty}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">0</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            {isFormOpen ? (
                              <span className="text-xs font-medium text-emerald-600">
                                Reporting below
                              </span>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  setDamageForms((prev) => ({
                                    ...prev,
                                    [item.itemId]: { quantity: "", remark: "", reason: "DAMAGE" as const },
                                  }))
                                }
                              >
                                <AlertCircle className="size-3.5" />
                                Report
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>

            {event.inventory.map((item) => {
              const form = damageForms[item.itemId];
              if (!form) return null;
              return (
                <div
                  key={item.id}
                  className="rounded-xl border border-amber-200 bg-amber-50 p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-amber-800">
                          Report issue for {item.itemName}
                        </p>
                        <div className="mt-3 flex flex-col gap-3">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setDamageForms((prev) => ({
                                  ...prev,
                                  [item.itemId]: {
                                    ...prev[item.itemId],
                                    reason: "DAMAGE",
                                  },
                                }))
                              }
                              className={cn(
                                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                                form.reason === "DAMAGE"
                                  ? "bg-amber-600 text-white"
                                  : "bg-amber-100 text-amber-700 hover:bg-amber-200",
                              )}
                            >
                              Damage
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setDamageForms((prev) => ({
                                  ...prev,
                                  [item.itemId]: {
                                    ...prev[item.itemId],
                                    reason: "LOST",
                                  },
                                }))
                              }
                              className={cn(
                                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                                form.reason === "LOST"
                                  ? "bg-amber-600 text-white"
                                  : "bg-amber-100 text-amber-700 hover:bg-amber-200",
                              )}
                            >
                              Lost
                            </button>
                          </div>
                          <div className="flex items-center gap-3">
                            <Label
                              htmlFor={`damage-tab-qty-${item.itemId}`}
                              className="text-xs text-amber-700"
                            >
                              Qty
                            </Label>
                            <Input
                              id={`damage-tab-qty-${item.itemId}`}
                              type="number"
                              min={1}
                              value={form.quantity}
                              placeholder="0"
                              onChange={(e) =>
                                setDamageForms((prev) => ({
                                  ...prev,
                                  [item.itemId]: {
                                    ...prev[item.itemId],
                                    quantity: e.target.value,
                                  },
                                }))
                              }
                              className="w-20 rounded-lg border-amber-300 bg-white text-sm"
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <Label
                              htmlFor={`damage-tab-remark-${item.itemId}`}
                              className="text-xs text-amber-700"
                            >
                              What happened? *
                            </Label>
                            <Textarea
                              id={`damage-tab-remark-${item.itemId}`}
                              value={form.remark}
                              onChange={(e) =>
                                setDamageForms((prev) => ({
                                  ...prev,
                                  [item.itemId]: {
                                    ...prev[item.itemId],
                                    remark: e.target.value,
                                  },
                                }))
                              }
                              placeholder="Describe the damage or loss…"
                              rows={2}
                              className="rounded-lg border-amber-300 bg-white text-sm"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setDamageForms((prev) => {
                                  const next = { ...prev };
                                  delete next[item.itemId];
                                  return next;
                                })
                              }
                              className="border-amber-300 text-amber-700 hover:bg-amber-100"
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              disabled={
                                submitDamage.isPending ||
                                Number(form.quantity) < 1 ||
                                form.remark.trim() === ""
                              }
                              onClick={() =>
                                submitDamage.mutate([
                                  {
                                    itemId: item.itemId,
                                    quantity: Number(form.quantity),
                                    remark: form.remark,
                                    reason: form.reason,
                                  },
                                ])
                              }
                              className="bg-amber-600 text-white hover:bg-amber-700"
                            >
                              {submitDamage.isPending
                                ? "Submitting…"
                                : form.reason === "LOST" ? "Report Loss" : "Report Damage"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setDamageForms((prev) => {
                          const next = { ...prev };
                          delete next[item.itemId];
                          return next;
                        })
                      }
                      className="shrink-0 text-amber-400 hover:text-amber-600"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <AppShell
      title="Event Dispatch"
      subtitle="Load out items and process returns for this event."
      icon={<Package className="size-5" />}
    >
      <Link
        href="/dashboard"
        className="flex w-fit items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-orange-700"
      >
        <ArrowLeft className="size-4" />
        Back to Dashboard
      </Link>
      {body}
    </AppShell>
  );
}