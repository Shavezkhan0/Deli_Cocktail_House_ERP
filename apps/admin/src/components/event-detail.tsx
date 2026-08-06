"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { cn } from "@/lib/utils";

type EventDetail = {
  id: string;
  eventName: string;
  eventCode: string;
  eventDate: string;
  startTime: string;
  endTime?: string | null;
  venue: string;
  pax: number;
  eventType: string;
  company: string;
  crm: string;
  siteManager: string;
  siteSupervisor: string;
  butlerVendor?: string | null;
  bartenders: number;
  maleButler: number;
  femaleButler: number;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  status: string;
  inventoryCost: number;
  staffCost: number;
  totalCost: number;
  inventory: EventInventoryRecord[];
  returns: EventReturnSummaryRecord[];
};

type EventInventoryRecord = {
  id: string;
  itemId: string;
  requiredQuantity: number;
  availableQuantity: number;
  reserveQuantity: number;
  issueQuantity: number;
  remarks: string;
  item: ItemSummary;
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
  availableStock: number;
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
  availableQuantity: number;
  required: string;
  reserve: string;
  issue: string;
  remarks: string;
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

const STATUS_COLORS: Record<string, string> = {
  UPCOMING: "bg-sky-100 text-sky-700",
  ONGOING: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-red-100 text-red-700",
};

function statusColor(status: string): string {
  return STATUS_COLORS[status] ?? "bg-muted text-muted-foreground";
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

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

  const [selectedItemId, setSelectedItemId] = useState("");
  const [allocations, setAllocations] = useState<AllocationRow[]>([]);
  const [rowKey, setRowKey] = useState(0);

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

  const selectedItem = items?.find((item) => item.id === selectedItemId);

  function handleAddAllocation() {
    if (!selectedItem) {
      return;
    }
    setAllocations((prev) => [
      ...prev,
      {
        key: `row-${rowKey}`,
        itemId: selectedItem.id,
        sku: selectedItem.sku,
        itemName: selectedItem.itemName,
        unit: selectedItem.unit,
        availableQuantity: selectedItem.availableStock,
        required: "",
        reserve: "",
        issue: "",
        remarks: "",
      },
    ]);
    setRowKey((prev) => prev + 1);
    setSelectedItemId("");
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
      toast.error("Add at least one item to allocate");
      return;
    }

    const payload: AllocationInput[] = [];
    for (const row of allocations) {
      const required = parseQuantity(row.required);
      const reserve = parseQuantity(row.reserve);
      const issue = parseQuantity(row.issue);
      if (required === null || reserve === null || issue === null) {
        toast.error(`Invalid quantity for ${row.itemName}`);
        return;
      }
      payload.push({
        itemId: row.itemId,
        requiredQuantity: required,
        reserveQuantity: reserve,
        issueQuantity: issue,
        remarks: row.remarks.trim(),
      });
    }

    allocate.mutate(payload);
  }

  const addableItems = items?.filter(
    (item) =>
      !allocations.some((row) => row.itemId === item.id) &&
      !inventoryByItemId.has(item.id),
  );

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
                {event.startTime}
                {event.endTime ? ` – ${event.endTime}` : ""}
              </Field>
              <Field label="Venue">{event.venue}</Field>
              <Field label="Pax">{event.pax.toLocaleString()}</Field>
              <Field label="Event Type">{event.eventType}</Field>
              <Field label="Company">{event.company}</Field>
              <Field label="CRM">{event.crm}</Field>
              <Field label="Butler Vendor">
                {event.butlerVendor ?? "—"}
              </Field>
              <Field label="Site Manager">{event.siteManager}</Field>
              <Field label="Site Supervisor">{event.siteSupervisor}</Field>
              <Field label="Staff">
                {event.bartenders} bartenders · {event.maleButler} male ·{" "}
                {event.femaleButler} female
              </Field>
              <Field label="Client">
                {event.clientName}
                <span className="block font-normal text-muted-foreground">
                  {event.clientPhone} · {event.clientEmail}
                </span>
              </Field>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle>Inventory Allocation</CardTitle>
            <CardDescription>
              Reserve and issue stock to the event. Reserved quantity is
              deducted from available stock.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 pt-4">
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex min-w-56 flex-1 flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">
                  Add Item
                </span>
                <Select
                  value={selectedItemId}
                  onValueChange={(value) =>
                    setSelectedItemId(typeof value === "string" ? value : "")
                  }
                  disabled={isCompleted || (addableItems?.length ?? 0) === 0}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select an item" />
                  </SelectTrigger>
                  <SelectContent>
                    {addableItems?.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.sku} · {item.itemName} ({item.availableStock}{" "}
                        available)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                onClick={handleAddAllocation}
                disabled={
                  isCompleted || !selectedItem || (addableItems?.length ?? 0) === 0
                }
              >
                <Plus />
                Add
              </Button>
            </div>

            {allocations.length > 0 ? (
              <div className="rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Required</TableHead>
                      <TableHead className="text-right">Reserve</TableHead>
                      <TableHead className="text-right">Issue</TableHead>
                      <TableHead>Remarks</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allocations.map((row) => (
                      <TableRow key={row.key}>
                        <TableCell>
                          <div className="leading-tight">
                            <p className="text-sm font-medium text-foreground">
                              {row.itemName}
                            </p>
                            <p className="font-mono text-xs text-muted-foreground">
                              {row.sku} · {row.availableQuantity} available
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            value={row.required}
                            onChange={(event) =>
                              updateAllocation(row.key, {
                                required: event.target.value,
                              })
                            }
                            className="h-8 text-right tabular-nums"
                            aria-label={`Required quantity for ${row.itemName}`}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            value={row.reserve}
                            onChange={(event) =>
                              updateAllocation(row.key, {
                                reserve: event.target.value,
                              })
                            }
                            className="h-8 text-right tabular-nums"
                            aria-label={`Reserve quantity for ${row.itemName}`}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            value={row.issue}
                            onChange={(event) =>
                              updateAllocation(row.key, {
                                issue: event.target.value,
                              })
                            }
                            className="h-8 text-right tabular-nums"
                            aria-label={`Issue quantity for ${row.itemName}`}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={row.remarks}
                            onChange={(event) =>
                              updateAllocation(row.key, {
                                remarks: event.target.value,
                              })
                            }
                            className="h-8"
                            aria-label={`Remarks for ${row.itemName}`}
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
                    {allocate.isPending ? "Saving…" : "Allocate Inventory"}
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
                      <TableHead className="text-right">Required</TableHead>
                      <TableHead className="text-right">Available</TableHead>
                      <TableHead className="text-right">Reserved</TableHead>
                      <TableHead className="text-right">Issued</TableHead>
                      <TableHead>Remarks</TableHead>
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
                        <TableCell className="text-right tabular-nums">
                          {record.availableQuantity}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {record.reserveQuantity}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {record.issueQuantity}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {record.remarks || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No inventory allocated to this event yet.
              </p>
            )}
          </CardContent>
        </Card>

        <ReturnSummarySection
          key={`${event.id}-${event.status}`}
          event={event}
        />
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

  const returnRows = event.inventory.map(
    (record) => returns[record.itemId] ?? emptyReturnRow(record.itemId),
  );

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>Return Summary</CardTitle>
        <CardDescription>
          Record returned, damaged, lost and consumed quantities when the event
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
                    <TableHead className="text-right">Consumed</TableHead>
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
                            className="h-8 text-right tabular-nums"
                            aria-label={`Issued quantity for ${record.item.itemName}`}
                          />
                        </TableCell>
                        <TableCell>
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
                            className="h-8 text-right tabular-nums"
                            aria-label={`Returned quantity for ${record.item.itemName}`}
                          />
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
                            type="number"
                            min={0}
                            value={row.consumed}
                            onChange={(event) =>
                              updateReturn(row.itemId, {
                                consumed: event.target.value,
                              })
                            }
                            disabled={isCompleted}
                            className="h-8 text-right tabular-nums"
                            aria-label={`Consumed quantity for ${record.item.itemName}`}
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

            <div className="flex justify-end">
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
