"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Info, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
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
import { flattenZodErrors } from "@/lib/validation";

const ALL_DESIGNATIONS = [
  "CRM",
  "GRAPHIC_DESIGNER",
  "OPERATION_COORDINATOR",
  "DATA_ENTRY_OPERATOR",
  "PROCESS_COORDINATOR",
  "IT",
  "OFFICE_BOY",
  "WAREHOUSE_MANAGER",
  "VIDEO_EDITOR",
  "MARKETING_EXECUTIVE",
  "SALES_EXECUTIVE",
  "DRIVER",
];

type DesignationLocation = {
  id: string;
  designation: string;
  locationName: string;
  latitude: number;
  longitude: number;
  radiusM: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

function humanizeDesignation(d: string): string {
  return d
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

type LocationFormValues = {
  locationName: string;
  latitude: string;
  longitude: string;
  radiusM: string;
};

const emptyForm: LocationFormValues = {
  locationName: "",
  latitude: "",
  longitude: "",
  radiusM: "100",
};

const locationFormSchema = z.object({
  locationName: z.string().trim().min(1, "Location name is required"),
  latitude: z
    .string()
    .trim()
    .min(1, "Required")
    .regex(/^-?\d+(\.\d+)?$/, "Must be a valid number"),
  longitude: z
    .string()
    .trim()
    .min(1, "Required")
    .regex(/^-?\d+(\.\d+)?$/, "Must be a valid number"),
  radiusM: z
    .string()
    .trim()
    .min(1, "Required")
    .regex(/^\d+$/, "Must be a whole number"),
});

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
      <label className="text-sm font-medium text-white">{label}</label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function Coordinate({ value }: { value: number }) {
  return (
    <span className="font-mono text-xs text-white-85">
      {value.toFixed(6)}
    </span>
  );
}

function StatusBadge({ assigned }: { assigned: boolean }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "border-transparent",
        assigned
          ? "bg-emerald-100 text-emerald-700"
          : "bg-amber-100 text-amber-700",
      )}
    >
      {assigned ? "Assigned" : "Not Set"}
    </Badge>
  );
}

export default function DesignationLocationsPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const [selectedDesignation, setSelectedDesignation] = useState<string | null>(
    null,
  );
  const [form, setForm] = useState<LocationFormValues>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: assignments, isPending, isError, refetch } = useQuery({
    queryKey: ["office-designation-locations"],
    queryFn: () =>
      apiFetch<DesignationLocation[]>("/api/designation-locations", { token }),
  });

  const assignmentsByDesignation = new Map(
    (assignments ?? []).map((assignment) => [
      assignment.designation,
      assignment,
    ]),
  );

  const saveLocation = useMutation({
    mutationFn: (payload: {
      designation: string;
      locationName: string;
      latitude: number;
      longitude: number;
      radiusM: number;
    }) =>
      apiFetch<DesignationLocation>("/api/designation-locations", {
        method: "POST",
        body: payload,
        token,
      }),
    onSuccess: () => {
      toast.success("Location assigned");
      invalidateQueries();
      closeForm();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const removeLocation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/api/designation-locations/${id}`, {
        method: "DELETE",
        token,
      }),
    onSuccess: () => {
      toast.success("Assignment removed");
      invalidateQueries();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  function invalidateQueries() {
    queryClient.invalidateQueries({
      queryKey: ["office-designation-locations"],
    });
  }

  function closeForm() {
    setSelectedDesignation(null);
    setForm(emptyForm);
    setErrors({});
  }

  function openForm(designation: string) {
    const existing = assignmentsByDesignation.get(designation);
    setSelectedDesignation(designation);
    setForm(
      existing
        ? {
            locationName: existing.locationName,
            latitude: String(existing.latitude),
            longitude: String(existing.longitude),
            radiusM: String(existing.radiusM),
          }
        : emptyForm,
    );
    setErrors({});
  }

  function update<K extends keyof LocationFormValues>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedDesignation) {
      return;
    }

    const parsed = locationFormSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(flattenZodErrors(parsed.error));
      return;
    }

    setErrors({});
    saveLocation.mutate({
      designation: selectedDesignation,
      locationName: parsed.data.locationName,
      latitude: Number(parsed.data.latitude),
      longitude: Number(parsed.data.longitude),
      radiusM: Number(parsed.data.radiusM),
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Designation Locations
        </h1>
        <p className="text-slate-600 text-sm">
          Assign check-in locations per designation. Employees fall back to the
          global office location when none is set.
        </p>
      </div>

      {selectedDesignation ? (
        <Card className="glass-card-global">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2 text-white font-bold">
              <Building2 className="size-4 text-white-85" />
              {humanizeDesignation(selectedDesignation)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-4"
            >
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Designation">
                  <Select
                    value={selectedDesignation}
                    onValueChange={(value) =>
                      typeof value === "string"
                        ? setSelectedDesignation(value)
                        : undefined
                    }
                  >
                    <SelectTrigger className="w-full" disabled>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={selectedDesignation}>
                        {humanizeDesignation(selectedDesignation)}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Location Name" error={errors.locationName}>
                  <Input
                    value={form.locationName}
                    onChange={(event) =>
                      update("locationName", event.target.value)
                    }
                    placeholder="e.g. Main Office, Warehouse"
                    aria-invalid={Boolean(errors.locationName)}
                  />
                </Field>

                <Field label="Latitude" error={errors.latitude}>
                  <Input
                    type="number"
                    step="any"
                    value={form.latitude}
                    onChange={(event) => update("latitude", event.target.value)}
                    placeholder="e.g. 12.971599"
                    aria-invalid={Boolean(errors.latitude)}
                  />
                </Field>

                <Field label="Longitude" error={errors.longitude}>
                  <Input
                    type="number"
                    step="any"
                    value={form.longitude}
                    onChange={(event) => update("longitude", event.target.value)}
                    placeholder="e.g. 77.594566"
                    aria-invalid={Boolean(errors.longitude)}
                  />
                </Field>

                <Field label="Radius (meters)" error={errors.radiusM}>
                  <Input
                    type="number"
                    min={0}
                    value={form.radiusM}
                    onChange={(event) => update("radiusM", event.target.value)}
                    placeholder="100"
                    aria-invalid={Boolean(errors.radiusM)}
                  />
                </Field>
              </div>

              <p className="flex items-center gap-1.5 text-xs text-white-85">
                <Info className="size-3.5 shrink-0" />
                Tip: You can get lat/lng from Google Maps by right-clicking on
                a location.
              </p>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={closeForm}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saveLocation.isPending}>
                  {saveLocation.isPending ? "Saving…" : "Save Location"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card className="glass-card-global">
        <CardHeader className="border-b">
          <CardTitle className="text-white font-bold">All Designations</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Designation</TableHead>
                <TableHead>Location Name</TableHead>
                <TableHead>Latitude</TableHead>
                <TableHead>Longitude</TableHead>
                <TableHead>Radius</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell colSpan={7}>
                      <div className="h-4 w-full animate-pulse rounded bg-white/15" />
                    </TableCell>
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <p className="text-sm font-medium text-white">
                        Unable to load designation locations
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetch()}
                      >
                        Try again
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                ALL_DESIGNATIONS.map((designation) => {
                  const assignment = assignmentsByDesignation.get(designation);
                  const assigned = Boolean(assignment);

                  return (
                    <TableRow key={designation}>
                      <TableCell className="font-medium text-white">
                        {humanizeDesignation(designation)}
                      </TableCell>
                      <TableCell>
                        {assignment ? (
                          assignment.locationName
                        ) : (
                          <span className="text-white/80">
                            — Not Set —
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {assignment ? (
                          <Coordinate value={assignment.latitude} />
                        ) : (
                          <span className="text-white/80">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {assignment ? (
                          <Coordinate value={assignment.longitude} />
                        ) : (
                          <span className="text-white/80">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {assignment ? (
                          <span className="tabular-nums text-white/80">
                            {assignment.radiusM} m
                          </span>
                        ) : (
                          <span className="text-white/80">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge assigned={assigned} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          {assignment ? (
                            <>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => openForm(designation)}
                                aria-label={`Edit ${designation}`}
                              >
                                <Pencil />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="text-destructive hover:text-destructive"
                                disabled={removeLocation.isPending}
                                onClick={() =>
                                  removeLocation.mutate(assignment.id)
                                }
                                aria-label={`Remove ${designation}`}
                              >
                                <Trash2 />
                              </Button>
                            </>
                          ) : (
<Button
                          variant="outline"
                          size="sm"
                          onClick={() => openForm(designation)}
                        >
                          <Plus className="size-4" />
                          Assign
                        </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
