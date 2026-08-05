"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createColumnHelper, tableFeatures, useTable } from "@tanstack/react-table";
import { Plus } from "lucide-react";
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
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

type EventStatus =
  | "PLANNED"
  | "CONFIRMED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

type Manager = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type EventItem = {
  id: string;
  eventId: string;
  itemName: string;
  requestedQty: number;
  approvedQty: number | null;
  status: string;
};

type Event = {
  id: string;
  name: string;
  clientName: string;
  date: string;
  status: EventStatus;
  warehouseManagerId: string | null;
  siteManagerId: string | null;
  warehouseManager: Manager | null;
  siteManager: Manager | null;
  items: EventItem[];
};

type CreateEventPayload = {
  name: string;
  clientName: string;
  date: string;
  warehouseManagerId?: string;
  siteManagerId?: string;
};

const statusVariant: Record<EventStatus, "default" | "secondary" | "outline" | "destructive" | "ghost"> = {
  PLANNED: "outline",
  CONFIRMED: "default",
  IN_PROGRESS: "secondary",
  COMPLETED: "ghost",
  CANCELLED: "destructive",
};

const eventSchema = z.object({
  name: z.string().trim().min(1, "Event name is required"),
  clientName: z.string().trim().min(1, "Client name is required"),
  date: z
    .string()
    .min(1, "Date is required")
    .refine((value) => !Number.isNaN(Date.parse(value)), "Enter a valid date"),
  warehouseManagerId: z.string().optional(),
  siteManagerId: z.string().optional(),
});

type EventFormValues = z.infer<typeof eventSchema>;

const emptyForm: EventFormValues = {
  name: "",
  clientName: "",
  date: "",
  warehouseManagerId: "",
  siteManagerId: "",
};

const features = tableFeatures({});
const columnHelper = createColumnHelper<typeof features, Event>();
const EMPTY_EVENTS: Event[] = [];

const columns = columnHelper.columns([
  columnHelper.accessor("name", {
    header: "Event Name",
    cell: (info) => (
      <span className="font-medium text-foreground">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor("clientName", {
    header: "Client",
    cell: (info) => (
      <span className="text-muted-foreground">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor("date", {
    header: "Date",
    cell: (info) => formatDate(info.getValue()),
  }),
  columnHelper.accessor("status", {
    header: "Status",
    cell: (info) => (
      <Badge variant={statusVariant[info.getValue()]}>{info.getValue()}</Badge>
    ),
  }),
]);

function flattenZodErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "");
    if (!out[key]) {
      out[key] = issue.message;
    }
  }
  return out;
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export default function EventsPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<EventFormValues>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: events, isPending, isError } = useQuery({
    queryKey: ["events"],
    queryFn: () => apiFetch<Event[]>("/api/events", { token }),
  });

  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: () => apiFetch<Manager[]>("/api/users", { token }),
  });

  const warehouseManagers = (users ?? []).filter(
    (user) => user.role === "WAREHOUSE_MANAGER" || user.role === "SUPER_ADMIN",
  );
  const siteManagers = (users ?? []).filter(
    (user) => user.role === "SITE_MANAGER" || user.role === "SUPER_ADMIN",
  );

  const createEvent = useMutation({
    mutationFn: (payload: CreateEventPayload) =>
      apiFetch<Event>("/api/events", { method: "POST", body: payload, token }),
    onSuccess: () => {
      toast.success("Event created");
      queryClient.invalidateQueries({ queryKey: ["events"] });
      setOpen(false);
      setForm(emptyForm);
      setErrors({});
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const table = useTable({
    features,
    columns,
    data: events ?? EMPTY_EVENTS,
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
    createEvent.mutate({
      name: parsed.data.name,
      clientName: parsed.data.clientName,
      date: parsed.data.date,
      warehouseManagerId: parsed.data.warehouseManagerId || undefined,
      siteManagerId: parsed.data.siteManagerId || undefined,
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>All Events</CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button />}>
              <Plus />
              Create Event
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create Event</DialogTitle>
                <DialogDescription>
                  Add a new catering event to the schedule.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <Field label="Event Name" error={errors.name}>
                  <Input
                    value={form.name}
                    onChange={(event) => update("name", event.target.value)}
                    placeholder="e.g. Corporate Gala Night"
                    aria-invalid={Boolean(errors.name)}
                  />
                </Field>
                <Field label="Client" error={errors.clientName}>
                  <Input
                    value={form.clientName}
                    onChange={(event) => update("clientName", event.target.value)}
                    placeholder="Client name"
                    aria-invalid={Boolean(errors.clientName)}
                  />
                </Field>
                <Field label="Date" error={errors.date}>
                  <Input
                    type="date"
                    value={form.date}
                    onChange={(event) => update("date", event.target.value)}
                    aria-invalid={Boolean(errors.date)}
                  />
                </Field>
                <Field label="Warehouse Manager" error={errors.warehouseManagerId}>
                  <Select
                    value={form.warehouseManagerId}
                    onValueChange={(value) =>
                      update("warehouseManagerId", String(value ?? ""))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select warehouse manager" />
                    </SelectTrigger>
                    <SelectContent align="start">
                      <SelectItem value="">None</SelectItem>
                      {warehouseManagers.map((manager) => (
                        <SelectItem key={manager.id} value={manager.id}>
                          {manager.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Site Manager" error={errors.siteManagerId}>
                  <Select
                    value={form.siteManagerId}
                    onValueChange={(value) =>
                      update("siteManagerId", String(value ?? ""))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select site manager" />
                    </SelectTrigger>
                    <SelectContent align="start">
                      <SelectItem value="">None</SelectItem>
                      {siteManagers.map((manager) => (
                        <SelectItem key={manager.id} value={manager.id}>
                          {manager.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <DialogFooter>
                  <DialogClose render={<Button variant="outline" />}>
                    Cancel
                  </DialogClose>
                  <Button type="submit" disabled={createEvent.isPending}>
                    {createEvent.isPending ? "Creating…" : "Create Event"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : (
                        <table.FlexRender header={header} />
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isPending ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell colSpan={columns.length}>
                      <div className="h-4 w-full animate-pulse rounded bg-muted" />
                    </TableCell>
                  </TableRow>
                ))
              ) : isError || !events ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="py-8 text-center text-muted-foreground"
                  >
                    Unable to load events. Make sure the API is running.
                  </TableCell>
                </TableRow>
              ) : events.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No events yet. Create your first event.
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getAllCells().map((cell) => (
                      <TableCell key={cell.id}>
                        <table.FlexRender cell={cell} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
