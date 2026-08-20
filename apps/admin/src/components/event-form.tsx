"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PackagePlus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { DEFAULT_CRM_CHECKLIST } from "@repo/database/src/default-checklist";
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
  startTime: string | null;
  endTime?: string | null;
  venue: string;
  pax: number;
  eventType: string;
  company: string;
  crm: string | null;
  siteManager: string | null;
  siteSupervisor: string | null;
  crmEmployeeId?: string | null;
  siteManagerId?: string | null;
  siteSupervisorId?: string | null;
  butlerVendor?: string | null;
  status?: string;
  bartenders: number;
  maleButler: number;
  femaleButler: number;
  clientName: string;
  clientPhone: string;
  clientEmail: string | null;
  inventoryCost: number;
  staffCost: number;
  totalCost: number;
  crmChecklist?: { id: string; section: string; label: string; completed: boolean; sortOrder: number }[];
};

type CreateEventPayload = {
  eventName: string;
  eventDate: string;
  startTime?: string | null;
  endTime?: string;
  venue: string;
  pax: number;
  eventType: string;
  company: string;
  crm?: string | null;
  siteManager?: string | null;
  siteSupervisor?: string | null;
  crmEmployeeId?: string | null;
  siteManagerId?: string | null;
  siteSupervisorId?: string | null;
  butlerVendor?: string;
  status: EventStatus;
  bartenders: number;
  maleButler: number;
  femaleButler: number;
  clientName: string;
  clientPhone: string;
  clientEmail?: string | null;
  inventoryCost: number;
  staffCost: number;
  totalCost: number;
  crmChecklist: { section: string; label: string }[];
};

type EmployeeOption = {
  id: string;
  name: string;
  employeeId: string;
  designation: string;
};

type EventStatus = "UPCOMING" | "ONGOING" | "COMPLETED" | "CANCELLED";

type CrmChecklistSection = { title: string; items: string[] };

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

type AllocationRow = {
  key: string;
  itemId: string;
  sku: string;
  itemName: string;
  unit: string;
  availableQuantity: number;
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
  { value: "UPCOMING", label: "Upcoming" },
  { value: "ONGOING", label: "Ongoing" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

function groupChecklistSections(
  items: { section: string; label: string }[],
): CrmChecklistSection[] {
  const sections: CrmChecklistSection[] = [];
  for (const item of items) {
    const last = sections[sections.length - 1];
    if (last && last.title === item.section) {
      last.items.push(item.label);
    } else {
      sections.push({ title: item.section || "General", items: [item.label] });
    }
  }
  return sections;
}

const nonNegativeInt = z
  .string()
  .trim()
  .min(1, "Required")
  .regex(/^\d+$/, "Must be a non-negative whole number")
  .transform((value) => Number(value));

const eventSchema = z.object({
  eventName: z.string().trim().min(1, "Event name is required"),
  eventDate: z.string().trim().min(1, "Event date is required"),
  startTime: z.string().trim().optional(),
  endTime: z.string().trim().optional(),
  venue: z.string().trim().min(1, "Venue is required"),
  pax: nonNegativeInt,
  eventType: z.string().trim().min(1, "Event type is required"),
  company: z.string().trim().min(1, "Company is required"),
  crm: z.string().trim().optional(),
  siteManager: z.string().trim().optional(),
  siteSupervisor: z.string().trim().optional(),
  crmEmployeeId: z.string().optional(),
  siteManagerId: z.string().optional(),
  siteSupervisorId: z.string().optional(),
  status: z.string().trim().min(1, "Status is required"),
  butlerVendor: z.string().trim().optional(),
  bartenders: nonNegativeInt,
  maleButler: nonNegativeInt,
  femaleButler: nonNegativeInt,
  clientName: z.string().trim().min(1, "Client name is required"),
  clientPhone: z.string().trim().min(1, "Client phone is required"),
  clientEmail: z.string().trim().optional(),
});

type EventFormValues = {
  eventName: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  venue: string;
  pax: string;
  eventType: string;
  company: string;
  crm: string;
  siteManager: string;
  siteSupervisor: string;
  crmEmployeeId: string;
  siteManagerId: string;
  siteSupervisorId: string;
  status: EventStatus;
  butlerVendor: string;
  bartenders: string;
  maleButler: string;
  femaleButler: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  crmChecklist: CrmChecklistSection[];
};

const emptyForm: EventFormValues = {
  eventName: "",
  eventDate: "",
  startTime: "",
  endTime: "",
  venue: "",
  pax: "",
  eventType: "",
  company: "",
  crm: "",
  siteManager: "",
  siteSupervisor: "",
  crmEmployeeId: "",
  siteManagerId: "",
  siteSupervisorId: "",
  status: "UPCOMING",
  butlerVendor: "",
  bartenders: "",
  maleButler: "",
  femaleButler: "",
  clientName: "",
  clientPhone: "",
  clientEmail: "",
  crmChecklist: DEFAULT_CRM_CHECKLIST.map((section) => ({
    title: section.section,
    items: [...section.items],
  })),
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
    startTime: event.startTime ?? "",
    endTime: event.endTime ?? "",
    venue: event.venue,
    pax: String(event.pax),
    eventType: event.eventType,
    company: event.company,
    crm: event.crm ?? "",
    siteManager: event.siteManager ?? "",
    siteSupervisor: event.siteSupervisor ?? "",
    crmEmployeeId: event.crmEmployeeId ?? "",
    siteManagerId: event.siteManagerId ?? "",
    siteSupervisorId: event.siteSupervisorId ?? "",
    status: (event.status as EventStatus | undefined) ?? "UPCOMING",
    butlerVendor: event.butlerVendor ?? "",
    bartenders: String(event.bartenders),
    maleButler: String(event.maleButler),
    femaleButler: String(event.femaleButler),
    clientName: event.clientName,
    clientPhone: event.clientPhone,
    clientEmail: event.clientEmail ?? "",
    crmChecklist: groupChecklistSections(event.crmChecklist ?? []),
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
  const [sectionTab, setSectionTab] = useState<"checklist" | "items">(
    "checklist",
  );
  const [itemTab, setItemTab] = useState<"list">("list");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [allocations, setAllocations] = useState<AllocationRow[]>([]);
  const [rowKey, setRowKey] = useState(0);

  const { data: employees = [] } = useQuery({
    queryKey: ["office-employees"],
    queryFn: () => apiFetch<EmployeeOption[]>("/api/office/employees", { token }),
  });

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
        availableQuantity: selectedItem.availableStock,
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

  function assignEmployee(
    idKey: "crmEmployeeId" | "siteManagerId" | "siteSupervisorId",
    nameKey: "crm" | "siteManager" | "siteSupervisor",
    value: string,
  ) {
    const employee = employees.find((emp) => emp.id === value);
    setForm((prev) => ({
      ...prev,
      [idKey]: value,
      ...(employee ? { [nameKey]: employee.name } : {}),
    }));
  }

  function updateSectionTitle(index: number, title: string) {
    setForm((prev) => ({
      ...prev,
      crmChecklist: prev.crmChecklist.map((section, i) =>
        i === index ? { ...section, title } : section,
      ),
    }));
  }

  function updateSectionItem(sectionIndex: number, itemIndex: number, value: string) {
    setForm((prev) => ({
      ...prev,
      crmChecklist: prev.crmChecklist.map((section, i) =>
        i === sectionIndex
          ? {
              ...section,
              items: section.items.map((item, j) => (j === itemIndex ? value : item)),
            }
          : section,
      ),
    }));
  }

  function removeSectionItem(sectionIndex: number, itemIndex: number) {
    setForm((prev) => ({
      ...prev,
      crmChecklist: prev.crmChecklist.map((section, i) =>
        i === sectionIndex
          ? { ...section, items: section.items.filter((_, j) => j !== itemIndex) }
          : section,
      ),
    }));
  }

  function removeSection(index: number) {
    setForm((prev) => ({
      ...prev,
      crmChecklist: prev.crmChecklist.filter((_, i) => i !== index),
    }));
  }

  function addSectionItem(sectionIndex: number) {
    setForm((prev) => ({
      ...prev,
      crmChecklist: prev.crmChecklist.map((section, i) =>
        i === sectionIndex ? { ...section, items: [...section.items, ""] } : section,
      ),
    }));
  }

  function addSection() {
    setForm((prev) => ({
      ...prev,
      crmChecklist: [...prev.crmChecklist, { title: "", items: [""] }],
    }));
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
      startTime: parsed.data.startTime?.trim() || null,
      venue: parsed.data.venue,
      pax: parsed.data.pax,
      eventType: parsed.data.eventType,
      company: parsed.data.company,
      crm: parsed.data.crm?.trim() || null,
      siteManager: parsed.data.siteManager?.trim() || null,
      siteSupervisor: parsed.data.siteSupervisor?.trim() || null,
      crmEmployeeId: parsed.data.crmEmployeeId || null,
      siteManagerId: parsed.data.siteManagerId || null,
      siteSupervisorId: parsed.data.siteSupervisorId || null,
      status: parsed.data.status as EventStatus,
      bartenders: parsed.data.bartenders,
      maleButler: parsed.data.maleButler,
      femaleButler: parsed.data.femaleButler,
      clientName: parsed.data.clientName,
      clientPhone: parsed.data.clientPhone,
      clientEmail: parsed.data.clientEmail?.trim() || null,
      inventoryCost: isEditing ? initialData.inventoryCost : 0,
      staffCost: isEditing ? initialData.staffCost : 0,
      totalCost: isEditing ? initialData.totalCost : 0,
      crmChecklist: form.crmChecklist.flatMap((section) =>
        section.items
          .map((item) => item.trim())
          .filter((item) => item.length > 0)
          .map((item) => ({
            section: section.title.trim() || "General",
            label: item,
          })),
      ),
      ...(parsed.data.endTime?.trim()
        ? { endTime: parsed.data.endTime.trim() }
        : {}),
      ...(parsed.data.butlerVendor?.trim()
        ? { butlerVendor: parsed.data.butlerVendor.trim() }
        : {}),
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

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Start Time (Optional)" error={errors.startTime}>
                <Input
                  type="time"
                  value={form.startTime}
                  onChange={(event) => update("startTime", event.target.value)}
                  aria-invalid={Boolean(errors.startTime)}
                />
              </Field>

              <Field label="End Time" error={errors.endTime}>
                <Input
                  type="time"
                  value={form.endTime}
                  onChange={(event) => update("endTime", event.target.value)}
                  aria-invalid={Boolean(errors.endTime)}
                />
              </Field>
            </div>

            <Field label="Venue" error={errors.venue} className="sm:col-span-2">
              <Input
                value={form.venue}
                onChange={(event) => update("venue", event.target.value)}
                placeholder="e.g. Marina Bay Sands Ballroom"
                aria-invalid={Boolean(errors.venue)}
              />
            </Field>

            <Field label="Event Type" error={errors.eventType}>
              <Input
                value={form.eventType}
                onChange={(event) => update("eventType", event.target.value)}
                placeholder="e.g. Corporate"
                aria-invalid={Boolean(errors.eventType)}
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

            <Field label="Company" error={errors.company}>
              <Input
                value={form.company}
                onChange={(event) => update("company", event.target.value)}
                placeholder="e.g. Acme Corp"
                aria-invalid={Boolean(errors.company)}
              />
            </Field>

            <Field label="Status" error={errors.status}>
              <Select
                value={form.status}
                onValueChange={(value) =>
                  update(
                    "status",
                    typeof value === "string" ? value : "UPCOMING",
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

            <Field label="CRM (Optional)" error={errors.crm}>
              <Select
                value={form.crmEmployeeId}
                onValueChange={(value) =>
                  assignEmployee(
                    "crmEmployeeId",
                    "crm",
                    typeof value === "string" ? value : "",
                  )
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select CRM employee">
                    {(value) =>
                      employees.find((employee) => employee.id === value)
                        ?.name ?? ""
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.name} ({employee.employeeId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Site Manager (Optional)" error={errors.siteManager}>
              <Select
                value={form.siteManagerId}
                onValueChange={(value) =>
                  assignEmployee(
                    "siteManagerId",
                    "siteManager",
                    typeof value === "string" ? value : "",
                  )
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select site manager">
                    {(value) =>
                      employees.find((employee) => employee.id === value)
                        ?.name ?? ""
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.name} ({employee.employeeId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Site Supervisor (Optional)" error={errors.siteSupervisor}>
              <Select
                value={form.siteSupervisorId}
                onValueChange={(value) =>
                  assignEmployee(
                    "siteSupervisorId",
                    "siteSupervisor",
                    typeof value === "string" ? value : "",
                  )
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select site supervisor">
                    {(value) =>
                      employees.find((employee) => employee.id === value)
                        ?.name ?? ""
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.name} ({employee.employeeId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Butler Vendor" error={errors.butlerVendor}>
              <Input
                value={form.butlerVendor}
                onChange={(event) => update("butlerVendor", event.target.value)}
                placeholder="Optional"
                aria-invalid={Boolean(errors.butlerVendor)}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Bartenders" error={errors.bartenders}>
                <Input
                  type="number"
                  min={0}
                  value={form.bartenders}
                  onChange={(event) =>
                    update("bartenders", event.target.value)
                  }
                  placeholder="0"
                  aria-invalid={Boolean(errors.bartenders)}
                />
              </Field>

              <Field label="Male Butler" error={errors.maleButler}>
                <Input
                  type="number"
                  min={0}
                  value={form.maleButler}
                  onChange={(event) => update("maleButler", event.target.value)}
                  placeholder="0"
                  aria-invalid={Boolean(errors.maleButler)}
                />
              </Field>

              <Field label="Female Butler" error={errors.femaleButler}>
                <Input
                  type="number"
                  min={0}
                  value={form.femaleButler}
                  onChange={(event) =>
                    update("femaleButler", event.target.value)
                  }
                  placeholder="0"
                  aria-invalid={Boolean(errors.femaleButler)}
                />
              </Field>
            </div>

            <Field
              label="Client Name"
              error={errors.clientName}
              className="sm:col-span-2"
            >
              <Input
                value={form.clientName}
                onChange={(event) => update("clientName", event.target.value)}
                placeholder="Client contact name"
                aria-invalid={Boolean(errors.clientName)}
              />
            </Field>

            <Field label="Client Phone" error={errors.clientPhone}>
              <Input
                value={form.clientPhone}
                onChange={(event) => update("clientPhone", event.target.value)}
                placeholder="e.g. +65 9123 4567"
                aria-invalid={Boolean(errors.clientPhone)}
              />
            </Field>

            <Field label="Client Email (Optional)" error={errors.clientEmail}>
              <Input
                type="email"
                value={form.clientEmail}
                onChange={(event) => update("clientEmail", event.target.value)}
                placeholder="e.g. client@example.com"
                aria-invalid={Boolean(errors.clientEmail)}
              />
            </Field>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSectionTab("checklist")}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
                sectionTab === "checklist"
                  ? "bg-foreground text-background shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground",
              )}
            >
              CRM Checklist
            </button>
            <button
              type="button"
              onClick={() => setSectionTab("items")}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
                sectionTab === "items"
                  ? "bg-foreground text-background shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground",
              )}
            >
              Item List
            </button>
          </div>

          {sectionTab === "checklist" ? (
            <div className="flex flex-col gap-3 rounded-xl border border-border p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">
                  CRM Checklist
                </h3>
                <span className="text-xs text-muted-foreground">
                  {form.crmChecklist.reduce(
                    (total, section) => total + section.items.length,
                    0,
                  )}{" "}
                  tasks
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Tasks the assigned CRM will tick off while preparing this event,
                divided into sections.
              </p>
              <div className="flex flex-col gap-4">
                {form.crmChecklist.map((section, sectionIndex) => (
                  <div
                    key={sectionIndex}
                    className="flex flex-col gap-2 rounded-lg border border-border/70 bg-muted/20 p-3"
                  >
                    <div className="flex items-center gap-2">
                      <Input
                        value={section.title}
                        onChange={(event) =>
                          updateSectionTitle(sectionIndex, event.target.value)
                        }
                        placeholder="Section title"
                        aria-label={`CRM checklist section ${sectionIndex + 1} title`}
                        className="font-medium"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeSection(sectionIndex)}
                      >
                        Remove
                      </Button>
                    </div>
                    <div className="flex flex-col gap-2">
                      {section.items.map((item, itemIndex) => (
                        <div
                          key={itemIndex}
                          className="flex items-center gap-2"
                        >
                          <Input
                            value={item}
                            onChange={(event) =>
                              updateSectionItem(
                                sectionIndex,
                                itemIndex,
                                event.target.value,
                              )
                            }
                            placeholder={`Task ${itemIndex + 1}`}
                            aria-label={`Task ${itemIndex + 1} in ${section.title}`}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="shrink-0 text-muted-foreground hover:text-destructive"
                            onClick={() =>
                              removeSectionItem(sectionIndex, itemIndex)
                            }
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="self-start"
                      onClick={() => addSectionItem(sectionIndex)}
                    >
                      Add Task
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                className="self-start"
                onClick={addSection}
              >
                Add Section
              </Button>
            </div>
          ) : isEditing ? (
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
                            {item.sku} · {item.itemName} ({item.availableStock}{" "}
                            available)
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
                            Available Stock
                          </TableHead>
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
                            <TableCell className="text-right tabular-nums">
                              {row.availableQuantity.toLocaleString()}
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
