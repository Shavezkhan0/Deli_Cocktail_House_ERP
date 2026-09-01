"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PackagePlus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { flattenZodErrors } from "@/lib/validation";

export type EventFormData = {
  id: string;
  eventName: string;
  eventDate: string;
  venue: string;
  pax: number;
  status?: string;
  inventoryCost: number;
  staffCost: number;
  totalCost: number;
  crmChecklist?: { id: string; section: string; label: string; completed: boolean; sortOrder: number }[];
};

type CreateEventPayload = {
  eventName: string;
  eventDate: string;
  venue: string;
  pax: number;
  status: EventStatus;
  inventoryCost: number;
  staffCost: number;
  totalCost: number;
  crmChecklist: { section: string; label: string }[];
};

type EventStatus = "ONGOING" | "COMPLETED";

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

type AllocationRow = {
  key: string;
  itemId: string;
  sku: string;
  itemName: string;
  unit: string;
  quantity: string;
};

type AllocationInput = {
  itemId: string;
  requiredQuantity: number;
  reserveQuantity: number;
  issueQuantity: number;
  remarks: string;
};

const EVENT_STATUS_OPTIONS: { value: EventStatus; label: string }[] = [
  { value: "ONGOING", label: "Ongoing" },
  { value: "COMPLETED", label: "Completed" },
];

const nonNegativeInt = z
  .string()
  .trim()
  .min(1, "Required")
  .regex(/^\d+$/, "Must be a non-negative whole number")
  .transform((value) => Number(value));

const eventSchema = z.object({
  eventName: z.string().trim().min(1, "Event name is required"),
  eventDate: z.string().trim().min(1, "Event date is required"),
  venue: z.string().trim().min(1, "Venue is required"),
  pax: nonNegativeInt,
  status: z.string().trim().min(1, "Status is required"),
});

type EventFormValues = {
  eventName: string;
  eventDate: string;
  venue: string;
  pax: string;
  status: EventStatus;
};

const emptyForm: EventFormValues = {
  eventName: "",
  eventDate: "",
  venue: "",
  pax: "",
  status: "ONGOING",
};

function toFormValues(event: EventFormData): EventFormValues {
  const date = new Date(event.eventDate);
  const eventDate = Number.isNaN(date.getTime())
    ? ""
    : `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(
        2,
        "0",
      )}-${String(date.getUTCDate()).padStart(2, "0")}`;

  return {
    eventName: event.eventName,
    eventDate,
    venue: event.venue,
    pax: String(event.pax),
    status: (event.status as EventStatus | undefined) ?? "ONGOING",
  };
}

function Field({
  label,
  error,
  className,
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
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

export function EventForm({ initialData }: { initialData?: EventFormData }) {
  const isEditing = initialData !== undefined;
  const { token } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<EventFormValues>(() =>
    initialData ? toFormValues(initialData) : emptyForm,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [itemTab, setItemTab] = useState<"list">("list");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [allocations, setAllocations] = useState<AllocationRow[]>([]);
  const [rowKey, setRowKey] = useState(0);

  const { data: items } = useQuery({
    queryKey: ["warehouse-items"],
    queryFn: () => apiFetch<InventoryItem[]>("/api/items", { token }),
  });

  const inventoryByItemId = useMemo(() => {
    const map = new Map<string, { itemId: string }>();
    return map;
  }, []);

  const selectedItem = items?.find((item) => item.id === selectedItemId);

  const addableItems = items?.filter(
    (item) =>
      !allocations.some((row) => row.itemId === item.id) &&
      !inventoryByItemId.has(item.id),
  );

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
        quantity: "",
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
      apiFetch(`/api/events/${initialData?.id}/allocate`, {
        method: "POST",
        body: payload,
        token,
      }),
    onSuccess: () => {
      toast.success("Item list saved");
      setAllocations([]);
      queryClient.invalidateQueries({ queryKey: ["warehouse-event", initialData?.id] });
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

  const saveEvent = useMutation({
    mutationFn: (payload: CreateEventPayload) =>
      isEditing
        ? apiFetch<{ id: string }>(`/api/events/${initialData.id}`, {
            method: "PUT",
            body: payload,
            token,
          })
        : apiFetch<{ id: string }>("/api/events", {
            method: "POST",
            body: payload,
            token,
          }),
    onSuccess: (data) => {
      toast.success(isEditing ? "Event updated" : "Event created");
      queryClient.invalidateQueries({ queryKey: ["warehouse-events"] });
      queryClient.invalidateQueries({ queryKey: ["warehouse-dashboard"] });
      router.push(`/warehouse/events/${data.id}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  function update<K extends keyof EventFormValues>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = eventSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(flattenZodErrors(parsed.error));
      return;
    }

    setErrors({});
    saveEvent.mutate({
      eventName: parsed.data.eventName,
      eventDate: new Date(parsed.data.eventDate).toISOString(),
      venue: parsed.data.venue,
      pax: parsed.data.pax,
      status: parsed.data.status as EventStatus,
      inventoryCost: isEditing ? initialData.inventoryCost : 0,
      staffCost: isEditing ? initialData.staffCost : 0,
      totalCost: isEditing ? initialData.totalCost : 0,
      crmChecklist: [],
    });
  }

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>Event Details</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Event Name"
              error={errors.eventName}
              className="sm:col-span-2"
            >
              <Input
                value={form.eventName}
                onChange={(event) => update("eventName", event.target.value)}
                placeholder="e.g. Corporate Gala Dinner"
                aria-invalid={Boolean(errors.eventName)}
              />
            </Field>

            <Field label="Event Date" error={errors.eventDate}>
              <Input
                type="date"
                value={form.eventDate}
                onChange={(event) => update("eventDate", event.target.value)}
                aria-invalid={Boolean(errors.eventDate)}
              />
            </Field>

            <Field label="Venue" error={errors.venue} className="sm:col-span-2">
              <Input
                value={form.venue}
                onChange={(event) => update("venue", event.target.value)}
                placeholder="e.g. Marina Bay Sands Ballroom"
                aria-invalid={Boolean(errors.venue)}
              />
            </Field>

            <Field label="Pax" error={errors.pax}>
              <Input
                type="number"
                min={0}
                value={form.pax}
                onChange={(event) => update("pax", event.target.value)}
                placeholder="0"
                aria-invalid={Boolean(errors.pax)}
              />
            </Field>

            <Field label="Status" error={errors.status}>
              <Select
                value={form.status}
                onValueChange={(value) =>
                  update(
                    "status",
                    typeof value === "string" ? value : "ONGOING",
                  )
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          {isEditing ? (
            <Card>
              <CardHeader className="border-b">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <CardTitle>Item List</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Add the items and quantities needed for this event.
                    </p>
                  </div>
                </div>
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
                      disabled={(addableItems?.length ?? 0) === 0}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select an item" />
                      </SelectTrigger>
                      <SelectContent>
                        {addableItems?.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.sku} · {item.itemName} (
                            {item.currentStock.toLocaleString()} in stock)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddAllocation}
                    disabled={!selectedItem || (addableItems?.length ?? 0) === 0}
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
                          <TableHead>SKU</TableHead>
                          <TableHead>Unit</TableHead>
                          <TableHead className="text-right">
                            Quantity Needed
                          </TableHead>
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
                                type="button"
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
                        type="button"
                        onClick={handleAllocate}
                        disabled={allocate.isPending}
                      >
                        <PackagePlus />
                        {allocate.isPending ? "Saving…" : "Save Item List"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No items added yet. Select an item above to add it to this
                    event.
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Save the event first to manage the item list.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href="/warehouse/events" />}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saveEvent.isPending}>
              {saveEvent.isPending
                ? isEditing
                  ? "Updating…"
                  : "Creating…"
                : isEditing
                  ? "Update Event"
                  : "Create Event"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
