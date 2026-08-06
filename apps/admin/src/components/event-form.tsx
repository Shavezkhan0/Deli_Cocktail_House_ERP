"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { flattenZodErrors } from "@/lib/validation";

export type EventFormData = {
  id: string;
  eventName: string;
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
  inventoryCost: number;
  staffCost: number;
  totalCost: number;
};

type CreateEventPayload = {
  eventName: string;
  eventDate: string;
  startTime: string;
  endTime?: string;
  venue: string;
  pax: number;
  eventType: string;
  company: string;
  crm: string;
  siteManager: string;
  siteSupervisor: string;
  butlerVendor?: string;
  bartenders: number;
  maleButler: number;
  femaleButler: number;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  inventoryCost: number;
  staffCost: number;
  totalCost: number;
};

const nonNegativeInt = z
  .string()
  .trim()
  .min(1, "Required")
  .regex(/^\d+$/, "Must be a non-negative whole number")
  .transform((value) => Number(value));

const eventSchema = z.object({
  eventName: z.string().trim().min(1, "Event name is required"),
  eventDate: z.string().trim().min(1, "Event date is required"),
  startTime: z.string().trim().min(1, "Start time is required"),
  endTime: z.string().trim().optional(),
  venue: z.string().trim().min(1, "Venue is required"),
  pax: nonNegativeInt,
  eventType: z.string().trim().min(1, "Event type is required"),
  company: z.string().trim().min(1, "Company is required"),
  crm: z.string().trim().min(1, "CRM is required"),
  siteManager: z.string().trim().min(1, "Site manager is required"),
  siteSupervisor: z.string().trim().min(1, "Site supervisor is required"),
  butlerVendor: z.string().trim().optional(),
  bartenders: nonNegativeInt,
  maleButler: nonNegativeInt,
  femaleButler: nonNegativeInt,
  clientName: z.string().trim().min(1, "Client name is required"),
  clientPhone: z.string().trim().min(1, "Client phone is required"),
  clientEmail: z.string().trim().min(1, "Client email is required"),
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
  butlerVendor: string;
  bartenders: string;
  maleButler: string;
  femaleButler: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
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
  butlerVendor: "",
  bartenders: "",
  maleButler: "",
  femaleButler: "",
  clientName: "",
  clientPhone: "",
  clientEmail: "",
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
    startTime: event.startTime,
    endTime: event.endTime ?? "",
    venue: event.venue,
    pax: String(event.pax),
    eventType: event.eventType,
    company: event.company,
    crm: event.crm,
    siteManager: event.siteManager,
    siteSupervisor: event.siteSupervisor,
    butlerVendor: event.butlerVendor ?? "",
    bartenders: String(event.bartenders),
    maleButler: String(event.maleButler),
    femaleButler: String(event.femaleButler),
    clientName: event.clientName,
    clientPhone: event.clientPhone,
    clientEmail: event.clientEmail,
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

export function EventForm({ initialData }: { initialData?: EventFormData }) {
  const isEditing = initialData !== undefined;
  const { token } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<EventFormValues>(() =>
    initialData ? toFormValues(initialData) : emptyForm,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

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
      startTime: parsed.data.startTime,
      venue: parsed.data.venue,
      pax: parsed.data.pax,
      eventType: parsed.data.eventType,
      company: parsed.data.company,
      crm: parsed.data.crm,
      siteManager: parsed.data.siteManager,
      siteSupervisor: parsed.data.siteSupervisor,
      bartenders: parsed.data.bartenders,
      maleButler: parsed.data.maleButler,
      femaleButler: parsed.data.femaleButler,
      clientName: parsed.data.clientName,
      clientPhone: parsed.data.clientPhone,
      clientEmail: parsed.data.clientEmail,
      inventoryCost: isEditing ? initialData.inventoryCost : 0,
      staffCost: isEditing ? initialData.staffCost : 0,
      totalCost: isEditing ? initialData.totalCost : 0,
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
              <Field label="Start Time" error={errors.startTime}>
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

            <Field label="CRM" error={errors.crm}>
              <Input
                value={form.crm}
                onChange={(event) => update("crm", event.target.value)}
                placeholder="CRM owner"
                aria-invalid={Boolean(errors.crm)}
              />
            </Field>

            <Field label="Site Manager" error={errors.siteManager}>
              <Input
                value={form.siteManager}
                onChange={(event) => update("siteManager", event.target.value)}
                placeholder="Site manager name"
                aria-invalid={Boolean(errors.siteManager)}
              />
            </Field>

            <Field label="Site Supervisor" error={errors.siteSupervisor}>
              <Input
                value={form.siteSupervisor}
                onChange={(event) =>
                  update("siteSupervisor", event.target.value)
                }
                placeholder="Site supervisor name"
                aria-invalid={Boolean(errors.siteSupervisor)}
              />
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

            <Field label="Client Email" error={errors.clientEmail}>
              <Input
                type="email"
                value={form.clientEmail}
                onChange={(event) => update("clientEmail", event.target.value)}
                placeholder="e.g. client@example.com"
                aria-invalid={Boolean(errors.clientEmail)}
              />
            </Field>
          </div>

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
