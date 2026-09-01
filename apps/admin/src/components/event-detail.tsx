"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  FileDown,
  Loader2,
  PackageCheck,
  PackagePlus,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate, statusColor } from "@/lib/format";
import { cn } from "@/lib/utils";

type EventDetail = {
  id: string;
  eventName: string;
  eventCode: string;
  eventDate: string;
  startTime: string | null;
  endTime?: string | null;
  venue: string;
  pax: number;
  eventType: string;
  company: string;
  crm: string | null;
  siteManager: string | null;
  siteSupervisor: string | null;
  crmEmployee?: { id: string; name: string; employeeId: string } | null;
  siteManagerEmp?: { id: string; name: string; employeeId: string } | null;
  siteSupervisorEmp?: { id: string; name: string; employeeId: string } | null;
  butlerVendor?: string | null;
  bartenders: number;
  maleButler: number;
  femaleButler: number;
  clientName: string;
  clientPhone: string;
  clientEmail: string | null;
  status: string;
  inventoryCost: number;
  staffCost: number;
  totalCost: number;
  inventory: EventInventoryRecord[];
  returns: EventReturnSummaryRecord[];
  crmChecklist: EventChecklistRecord[];
  damageReports: DamageReportRecord[];
};

type DamageReportRecord = {
  id: string;
  itemId: string;
  type: "EVENT_DAMAGE" | "EVENT_LOST";
  quantity: number;
  remark: string | null;
  createdAt: string;
  item: ItemSummary;
};

type EventChecklistRecord = {
  id: string;
  eventId: string;
  section: string;
  label: string;
  completed: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

type EventInventoryRecord = {
  id: string;
  itemId: string;
  requiredQuantity: number;
  reserveQuantity: number;
  issueQuantity: number;
  remarks: string;
  item: ItemSummary;
  loadedQty: number;
  returnedQty: number;
  damageReportedQty: number;
  lostQty: number;
};

type EventReturnSummaryRecord = {
  id: string;
  itemId: string;
  issuedQuantity: number;
  returnedQuantity: number;
  damagedQuantity: number;
  lostQuantity: number;
  consumedQuantity: number;
  remarks: string;
  item: ItemSummary;
};

type ItemSummary = {
  id: string;
  sku: string;
  itemName: string;
  unit: string;
  category: string;
};

type InventoryItem = ItemSummary & {
  currentStock: number;
};

type AllocationInput = {
  itemId: string;
  requiredQuantity: number;
  reserveQuantity: number;
  issueQuantity: number;
  remarks: string;
};

type ReturnSummaryInput = {
  itemId: string;
  issuedQuantity: number;
  returnedQuantity: number;
  damagedQuantity: number;
  lostQuantity: number;
  consumedQuantity: number;
  remarks: string;
};

type AllocationRow = {
  key: string;
  itemId: string;
  sku: string;
  itemName: string;
  unit: string;
  quantity: string;
};

type ReturnRow = {
  itemId: string;
  issued: string;
  returned: string;
  damaged: string;
  lost: string;
  consumed: string;
  remarks: string;
};

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="text-sm font-medium text-foreground">{children}</span>
    </div>
  );
}

function parseQuantity(value: string): number | null {
  if (value.trim() === "") {
    return 0;
  }
  if (!/^\d+$/.test(value.trim())) {
    return null;
  }
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function emptyReturnRow(itemId: string): ReturnRow {
  return {
    itemId,
    issued: "0",
    returned: "0",
    damaged: "0",
    lost: "0",
    consumed: "0",
    remarks: "",
  };
}

export function EventDetail({ eventId }: { eventId: string }) {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const [itemSearchQuery, setItemSearchQuery] = useState("");
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [allocations, setAllocations] = useState<AllocationRow[]>([]);
  const [rowKey, setRowKey] = useState(0);
  const [itemTab, setItemTab] = useState<"list" | "activity" | "damage">("list");

  const {
    data: event,
    isPending,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["warehouse-event", eventId],
    queryFn: () => apiFetch<EventDetail>(`/api/events/${eventId}`, { token }),
  });

  const { data: items } = useQuery({
    queryKey: ["warehouse-items"],
    queryFn: () => apiFetch<InventoryItem[]>("/api/items", { token }),
  });

  const isCompleted = event?.status === "COMPLETED";

  const inventoryByItemId = useMemo(() => {
    const map = new Map<string, EventInventoryRecord>();
    for (const record of event?.inventory ?? []) {
      map.set(record.itemId, record);
    }
    return map;
  }, [event]);

  function toggleItemSelection(itemId: string) {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }

  function handleAddSelected() {
    if (!items) {
      return;
    }
    const toAdd = [...selectedItemIds];
    if (toAdd.length === 0) {
      return;
    }
    for (const itemId of toAdd) {
      const item = items.find((i) => i.id === itemId);
      if (!item) {
        continue;
      }
      setAllocations((prev) => [
        ...prev,
        {
          key: `row-${rowKey + prev.length}`,
          itemId: item.id,
          sku: item.sku,
          itemName: item.itemName,
          unit: item.unit,
          quantity: "",
        },
      ]);
    }
    setRowKey((prev) => prev + toAdd.length);
    setSelectedItemIds(new Set());
    setItemSearchQuery("");
  }

  function updateAllocation(
    key: string,
    patch: Partial<AllocationRow>,
  ) {
    setAllocations((prev) =>
      prev.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }

  function removeAllocation(key: string) {
    setAllocations((prev) => prev.filter((row) => row.key !== key));
  }

  const allocate = useMutation({
    mutationFn: (payload: AllocationInput[]) =>
      apiFetch(`/api/events/${eventId}/allocate`, {
        method: "POST",
        body: payload,
        token,
      }),
    onSuccess: () => {
      toast.success("Inventory allocation saved");
      setAllocations([]);
      queryClient.invalidateQueries({ queryKey: ["warehouse-event", eventId] });
      queryClient.invalidateQueries({ queryKey: ["warehouse-items"] });
      queryClient.invalidateQueries({ queryKey: ["warehouse-events"] });
      queryClient.invalidateQueries({ queryKey: ["warehouse-dashboard"] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  function handleAllocate() {
    if (allocations.length === 0) {
      toast.error("Add at least one item to save");
      return;
    }

    const payload: AllocationInput[] = [];
    for (const row of allocations) {
      const qty = parseQuantity(row.quantity);
      if (qty === null || qty <= 0) {
        toast.error(`Enter a valid quantity for ${row.itemName}`);
        return;
      }
      payload.push({
        itemId: row.itemId,
        requiredQuantity: qty,
        reserveQuantity: qty,
        issueQuantity: qty,
        remarks: "",
      });
    }

    allocate.mutate(payload);
  }

  const addableItems = items?.filter(
    (item) =>
      !allocations.some((row) => row.itemId === item.id) &&
      !inventoryByItemId.has(item.id),
  );

  const filteredAddableItems = useMemo(() => {
    if (!addableItems) {
      return [];
    }
    const query = itemSearchQuery.trim().toLowerCase();
    if (!query) {
      return addableItems;
    }
    return addableItems.filter(
      (item) =>
        item.sku.toLowerCase().includes(query) ||
        item.itemName.toLowerCase().includes(query),
    );
  }, [addableItems, itemSearchQuery]);

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !event) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <p className="text-sm font-medium text-foreground">
          Unable to load event
        </p>
        <p className="text-sm text-muted-foreground">
          Make sure the API is running and try again.
        </p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {event.eventName}
            </h1>
            <Badge
              variant="outline"
              className={cn("border-transparent", statusColor(event.status))}
            >
              {event.status}
            </Badge>
          </div>
          <p className="font-mono text-xs text-muted-foreground">
            {event.eventCode}
          </p>
        </div>

        <Button variant="outline" nativeButton={false} render={<Link href="/warehouse/events" />}>
          <ArrowLeft />
          Back to Events
        </Button>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Event Details</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Date">
                {formatDate(event.eventDate)}
              </Field>
              <Field label="Time">
                {event.startTime ?? "—"}
                {event.endTime ? ` – ${event.endTime}` : ""}
              </Field>
              <Field label="Venue">{event.venue}</Field>
              <Field label="Pax">{event.pax.toLocaleString()}</Field>
              <Field label="Event Type">{event.eventType}</Field>
              <Field label="Company">{event.company}</Field>
              <Field label="CRM">
                {event.crmEmployee?.name ?? event.crm ?? "—"}
              </Field>
              <Field label="Butler Vendor">
                {event.butlerVendor ?? "—"}
              </Field>
              <Field label="Site Manager">
                {event.siteManagerEmp?.name ?? event.siteManager ?? "—"}
              </Field>
              <Field label="Site Supervisor">
                {event.siteSupervisorEmp?.name ?? event.siteSupervisor ?? "—"}
              </Field>
              <Field label="Staff">
                {event.bartenders} bartenders · {event.maleButler} male ·{" "}
                {event.femaleButler} female
              </Field>
              <Field label="Client">
                {event.clientName}
                <span className="block font-normal text-muted-foreground">
                  {event.clientPhone} · {event.clientEmail ?? "—"}
                </span>
              </Field>
            </div>
          </CardContent>
        </Card>

        <>
        <Card>
          <CardHeader className="border-b">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Item List</CardTitle>
                <CardDescription>
                  Add the items and quantities needed for this event.
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setItemTab("list")}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
                    itemTab === "list"
                      ? "bg-foreground text-background shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                  )}
                >
                  Item List
                </button>
                <button
                  type="button"
                  onClick={() => setItemTab("activity")}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
                    itemTab === "activity"
                      ? "bg-foreground text-background shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                  )}
                >
                  Warehouse Activity
                </button>
                <button
                  type="button"
                  onClick={() => setItemTab("damage")}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
                    itemTab === "damage"
                      ? "bg-foreground text-background shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                  )}
                >
                  Reports
                  {event.damageReports.length > 0 ? (
                    <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-xs font-semibold text-amber-700">
                      {event.damageReports.length}
                    </span>
                  ) : null}
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 pt-4">
            {itemTab === "list" ? (
              <>
                {!isCompleted && (addableItems?.length ?? 0) > 0 ? (
                  <div className="flex flex-col gap-2">
                    <Input
                      value={itemSearchQuery}
                      onChange={(e) => setItemSearchQuery(e.target.value)}
                      placeholder="Search by SKU or item name…"
                      disabled={isCompleted}
                    />
                    {filteredAddableItems.length > 0 ? (
                      <div className="max-h-64 overflow-y-auto rounded-xl border">
                        {filteredAddableItems.map((item) => {
                          const checked = selectedItemIds.has(item.id);
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => toggleItemSelection(item.id)}
                              className={cn(
                                "flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/50",
                                checked && "bg-muted/70",
                              )}
                            >
                              <span
                                className={cn(
                                  "flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                                  checked
                                    ? "border-emerald-500 bg-emerald-500 text-white"
                                    : "border-border hover:border-emerald-500/50",
                                )}
                              >
                                {checked ? (
                                  <Check className="size-3.5" />
                                ) : null}
                              </span>
                              <span className="flex-1">
                                <span className="font-mono text-xs text-muted-foreground">
                                  {item.sku}
                                </span>
                                <span className="ml-2 font-medium text-foreground">
                                  {item.itemName}
                                </span>
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {item.currentStock.toLocaleString()} in stock
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {itemSearchQuery
                          ? "No items match your search."
                          : "No more items to add."}
                      </p>
                    )}
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        onClick={handleAddSelected}
                        disabled={selectedItemIds.size === 0}
                      >
                        <Plus />
                        Add Selected
                        {selectedItemIds.size > 0
                          ? ` (${selectedItemIds.size})`
                          : null}
                      </Button>
                    </div>
                  </div>
                ) : null}

                {allocations.length > 0 ? (
                  <div className="rounded-xl border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead>Unit</TableHead>
                          <TableHead className="text-right">Quantity Needed</TableHead>
                          <TableHead className="w-10" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allocations.map((row) => (
                          <TableRow key={row.key}>
                            <TableCell className="text-sm font-medium text-foreground">
                              {row.itemName}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              {row.sku}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {row.unit}
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min={1}
                                value={row.quantity}
                                onChange={(event) =>
                                  updateAllocation(row.key, {
                                    quantity: event.target.value,
                                  })
                                }
                                className="h-8 text-right tabular-nums"
                                aria-label={`Quantity needed for ${row.itemName}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeAllocation(row.key)}
                                aria-label={`Remove ${row.itemName}`}
                              >
                                <Trash2 />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div className="flex justify-end gap-2 border-t border-border p-3">
                      <Button
                        onClick={handleAllocate}
                        disabled={allocate.isPending || isCompleted}
                      >
                        <PackagePlus />
                        {allocate.isPending ? "Saving…" : "Save Item List"}
                      </Button>
                    </div>
                  </div>
                ) : null}

                {event.inventory.length > 0 ? (
                  <div className="rounded-xl border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead className="text-right">Quantity</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {event.inventory.map((record) => (
                          <TableRow key={record.id}>
                            <TableCell>
                              <div className="leading-tight">
                                <p className="text-sm font-medium text-foreground">
                                  {record.item.itemName}
                                </p>
                                <p className="font-mono text-xs text-muted-foreground">
                                  {record.item.sku}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {record.requiredQuantity}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No items added to this event yet.
                  </p>
                )}
              </>
            ) : itemTab === "activity" ? (
              <>
                {event.inventory.length > 0 ? (
                  <div className="rounded-xl border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead className="text-right">Quantity Needed</TableHead>
                          <TableHead className="text-right">Issued</TableHead>
                          <TableHead className="text-right">Returned</TableHead>
                          <TableHead className="text-right">Damage Reported</TableHead>
                          <TableHead className="text-right">Lost</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {event.inventory.map((record) => (
                          <TableRow key={record.id}>
                            <TableCell className="text-sm font-medium text-foreground">
                              {record.item.itemName}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              {record.item.sku}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {record.requiredQuantity}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {record.loadedQty}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {record.returnedQty}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {record.damageReportedQty}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {record.lostQty}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No items allocated to this event yet.
                  </p>
                )}
              </>
            ) : (
              <>
                {event.damageReports.length > 0 ? (
                  <div className="rounded-xl border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-right">Quantity</TableHead>
                          <TableHead>Remark</TableHead>
                          <TableHead>Reported At</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {event.damageReports.map((report) => (
                          <TableRow key={report.id}>
                            <TableCell className="text-sm font-medium text-foreground">
                              {report.item.itemName}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              {report.item.sku}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "border-transparent text-xs",
                                  report.type === "EVENT_LOST"
                                    ? "bg-rose-500/15 text-rose-700"
                                    : "bg-amber-500/20 text-amber-700",
                                )}
                              >
                                {report.type === "EVENT_LOST" ? "Lost" : "Damage"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {report.quantity}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {report.remark || "—"}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDate(report.createdAt)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No damage has been reported for this event.
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <ReturnSummarySection
          key={`${event.id}-${event.status}`}
          event={event}
        />
        </>
      </div>
    </div>
  );
}

function buildReturnRows(event: EventDetail): Record<string, ReturnRow> {
  const byReturn = new Map<string, EventReturnSummaryRecord>();
  for (const record of event.returns) {
    byReturn.set(record.itemId, record);
  }

  const next: Record<string, ReturnRow> = {};
  for (const record of event.inventory) {
    const existing = byReturn.get(record.itemId);
    next[record.itemId] = existing
      ? {
          itemId: existing.itemId,
          issued: String(existing.issuedQuantity),
          returned: String(existing.returnedQuantity),
          damaged: String(existing.damagedQuantity),
          lost: String(existing.lostQuantity),
          consumed: String(existing.consumedQuantity),
          remarks: existing.remarks ?? "",
        }
      : {
          ...emptyReturnRow(record.itemId),
          issued: String(record.issueQuantity),
        };
  }
  return next;
}

function ReturnSummarySection({ event }: { event: EventDetail }) {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const isCompleted = event.status === "COMPLETED";
  const [returns, setReturns] = useState<Record<string, ReturnRow>>(() =>
    buildReturnRows(event),
  );
  const [issuedItems, setIssuedItems] = useState<Set<string>>(() => new Set());
  const [returnedItems, setReturnedItems] = useState<Set<string>>(
    () => new Set(),
  );

  function updateReturn(itemId: string, patch: Partial<ReturnRow>) {
    setReturns((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], ...patch },
    }));
  }

  const complete = useMutation({
    mutationFn: (payload: ReturnSummaryInput[]) =>
      apiFetch(`/api/events/${event.id}/complete`, {
        method: "POST",
        body: payload,
        token,
      }),
    onSuccess: () => {
      toast.success("Event completed and stock returned");
      queryClient.invalidateQueries({
        queryKey: ["warehouse-event", event.id],
      });
      queryClient.invalidateQueries({ queryKey: ["warehouse-items"] });
      queryClient.invalidateQueries({ queryKey: ["warehouse-events"] });
      queryClient.invalidateQueries({ queryKey: ["warehouse-dashboard"] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const checkout = useMutation({
    mutationFn: (payload: { itemId: string; quantity: number }[]) =>
      apiFetch(`/api/events/${event.id}/checkout`, {
        method: "POST",
        body: payload,
        token,
      }),
    onSuccess: () => {
      toast.success("Items issued from IMS");
      queryClient.invalidateQueries({
        queryKey: ["warehouse-event", event.id],
      });
      queryClient.invalidateQueries({ queryKey: ["warehouse-items"] });
      queryClient.invalidateQueries({ queryKey: ["warehouse-events"] });
      queryClient.invalidateQueries({ queryKey: ["warehouse-dashboard"] });
      setIssuedItems(new Set(event.inventory.map((r) => r.itemId)));
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const checkin = useMutation({
    mutationFn: (payload: { itemId: string; quantity: number }[]) =>
      apiFetch(`/api/events/${event.id}/checkin`, {
        method: "POST",
        body: payload,
        token,
      }),
    onSuccess: () => {
      toast.success("Items returned to IMS");
      queryClient.invalidateQueries({
        queryKey: ["warehouse-event", event.id],
      });
      queryClient.invalidateQueries({ queryKey: ["warehouse-items"] });
      queryClient.invalidateQueries({ queryKey: ["warehouse-events"] });
      queryClient.invalidateQueries({ queryKey: ["warehouse-dashboard"] });
      setReturnedItems(new Set(event.inventory.map((r) => r.itemId)));
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  function handleCheckout() {
    const payload = event.inventory.map((r) => ({
      itemId: r.itemId,
      quantity: r.issueQuantity,
    }));
    checkout.mutate(payload);
  }

  function handleCheckin() {
    const payload = event.inventory.map((r) => {
      const row = returns[r.itemId];
      return { itemId: r.itemId, quantity: Number(row?.returned ?? 0) };
    });
    checkin.mutate(payload);
  }

  function handleComplete() {
    if (event.inventory.length === 0) {
      toast.error("Allocate inventory to the event before completing");
      return;
    }

    const payload: ReturnSummaryInput[] = [];
    for (const record of event.inventory) {
      const row = returns[record.itemId] ?? emptyReturnRow(record.itemId);
      const issued = parseQuantity(row.issued);
      const returned = parseQuantity(row.returned);
      const damaged = parseQuantity(row.damaged);
      const lost = parseQuantity(row.lost);
      const consumed = parseQuantity(row.consumed);
      if (
        issued === null ||
        returned === null ||
        damaged === null ||
        lost === null ||
        consumed === null
      ) {
        toast.error(`Invalid quantity for ${record.item.itemName}`);
        return;
      }
      payload.push({
        itemId: record.itemId,
        issuedQuantity: issued,
        returnedQuantity: returned,
        damagedQuantity: damaged,
        lostQuantity: lost,
        consumedQuantity: consumed,
        remarks: row.remarks.trim(),
      });
    }

    complete.mutate(payload);
  }

  function handleDownloadChecklist() {
    const rows = event.inventory.map((record) => ({
      ...(returns[record.itemId] ?? emptyReturnRow(record.itemId)),
      record,
    }));

    const rowsHtml = rows
      .map(
        (row) => `
        <tr>
          <td>${row.record.item.itemName}</td>
          <td>${row.record.item.sku}</td>
          <td>${row.record.item.unit}</td>
          <td><input type="checkbox" /> ${row.issued}</td>
          <td><input type="checkbox" /> ${row.returned}</td>
          <td>${row.damaged}</td>
          <td>${row.lost}</td>
          <td>${row.remarks || "&nbsp;"}</td>
        </tr>`,
      )
      .join("");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${event.eventName} — Return Checklist</title>
  <style>
    body {
      font-family: Arial, Helvetica, sans-serif;
      color: #111;
      padding: 24px;
    }
    h1 {
      font-size: 22px;
      margin: 0 0 4px;
    }
    .subtitle {
      font-size: 13px;
      color: #555;
      margin-bottom: 24px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    th, td {
      border: 1px solid #bbb;
      padding: 8px 10px;
      text-align: left;
      vertical-align: top;
    }
    th {
      background: #f0f0f0;
      font-weight: 600;
    }
    .print-btn {
      display: inline-block;
      margin-bottom: 20px;
      padding: 10px 18px;
      font-size: 14px;
      border: 1px solid #999;
      border-radius: 6px;
      background: #f0f0f0;
      cursor: pointer;
    }
    @media print {
      .print-btn {
        display: none;
      }
      body {
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">Print</button>
  <h1>${event.eventName} — Return Checklist</h1>
  <div class="subtitle">Event Code: ${event.eventCode} &nbsp;|&nbsp; Date: ${formatDate(
        event.eventDate,
      )}</div>
  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th>SKU</th>
        <th>Unit</th>
        <th>Issued</th>
        <th>Returned</th>
        <th>Damaged</th>
        <th>Lost</th>
        <th>Remarks</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>
</body>
</html>`;

    const win = window.open("", "_blank", "noopener,noreferrer");
    if (!win) {
      toast.error("Popup blocked. Allow popups to download the checklist.");
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 300);
  }

  const returnRows = event.inventory.map(
    (record) => returns[record.itemId] ?? emptyReturnRow(record.itemId),
  );

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>Return Summary</CardTitle>
        <CardDescription>
          Record returned, damaged and lost quantities when the event
          wraps up. Completing the event updates stock and marks it completed.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pt-4">
        {event.inventory.length > 0 ? (
          <>
            <div className="rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Issued</TableHead>
                    <TableHead className="text-right">Returned</TableHead>
                    <TableHead className="text-right">Damaged</TableHead>
                    <TableHead className="text-right">Lost</TableHead>
                    <TableHead>Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {returnRows.map((row) => {
                    const record = event.inventory.find(
                      (entry) => entry.itemId === row.itemId,
                    );
                    if (!record) {
                      return null;
                    }
                    return (
                      <TableRow key={row.itemId}>
                        <TableCell>
                          <div className="leading-tight">
                            <p className="text-sm font-medium text-foreground">
                              {record.item.itemName}
                            </p>
                            <p className="font-mono text-xs text-muted-foreground">
                              {record.item.sku}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            <Input
                              type="number"
                              min={0}
                              value={row.issued}
                              onChange={(event) =>
                                updateReturn(row.itemId, {
                                  issued: event.target.value,
                                })
                              }
                              disabled={isCompleted}
                              className="h-8 w-20 text-right tabular-nums"
                              aria-label={`Issued quantity for ${record.item.itemName}`}
                            />
                            {issuedItems.has(row.itemId) ? (
                              <Badge
                                variant="outline"
                                className="shrink-0 border-transparent bg-emerald-500/15 text-emerald-700"
                              >
                                Issued ✓
                              </Badge>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            <Input
                              type="number"
                              min={0}
                              value={row.returned}
                              onChange={(event) =>
                                updateReturn(row.itemId, {
                                  returned: event.target.value,
                                })
                              }
                              disabled={isCompleted}
                              className="h-8 w-20 text-right tabular-nums"
                              aria-label={`Returned quantity for ${record.item.itemName}`}
                            />
                            {returnedItems.has(row.itemId) ? (
                              <Badge
                                variant="outline"
                                className="shrink-0 border-transparent bg-sky-500/15 text-sky-700"
                              >
                                Returned ✓
                              </Badge>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            value={row.damaged}
                            onChange={(event) =>
                              updateReturn(row.itemId, {
                                damaged: event.target.value,
                              })
                            }
                            disabled={isCompleted}
                            className="h-8 text-right tabular-nums"
                            aria-label={`Damaged quantity for ${record.item.itemName}`}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            value={row.lost}
                            onChange={(event) =>
                              updateReturn(row.itemId, {
                                lost: event.target.value,
                              })
                            }
                            disabled={isCompleted}
                            className="h-8 text-right tabular-nums"
                            aria-label={`Lost quantity for ${record.item.itemName}`}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={row.remarks}
                            onChange={(event) =>
                              updateReturn(row.itemId, {
                                remarks: event.target.value,
                              })
                            }
                            disabled={isCompleted}
                            className="h-8"
                            aria-label={`Remarks for ${record.item.itemName}`}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <Button
                variant="outline"
                onClick={handleCheckout}
                disabled={
                  isCompleted ||
                  checkout.isPending ||
                  issuedItems.size === event.inventory.length
                }
              >
                <PackagePlus />
                {checkout.isPending ? "Issuing…" : "Issue All Items (from IMS)"}
              </Button>
              <Button
                variant="outline"
                onClick={handleCheckin}
                disabled={isCompleted || checkin.isPending}
              >
                <PackageCheck />
                {checkin.isPending ? "Returning…" : "Return All Items (to IMS)"}
              </Button>
              <Button
                variant="outline"
                onClick={handleDownloadChecklist}
                disabled={isCompleted}
              >
                <FileDown />
                Download Checklist
              </Button>
              <Button
                variant="default"
                onClick={handleComplete}
                disabled={complete.isPending || isCompleted}
              >
                <PackageCheck />
                {isCompleted
                  ? "Event Completed"
                  : complete.isPending
                    ? "Completing…"
                    : "Complete Event & Return Stock"}
              </Button>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Allocate inventory to the event to record returns.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
