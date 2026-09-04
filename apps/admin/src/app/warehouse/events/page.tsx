"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createColumnHelper,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { CalendarX2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AnimatedDialog,
  AnimatedDialogContent,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/animated-dialog";
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

type WarehouseEvent = {
  id: string;
  eventName: string;
  eventCode: string;
  eventDate: string;
  venue: string;
  status: string;
};

const features = tableFeatures({});
const columnHelper = createColumnHelper<typeof features, WarehouseEvent>();

function EventActions({
  event,
  onEdit,
  onDelete,
}: {
  event: WarehouseEvent;
  onEdit: (event: WarehouseEvent) => void;
  onDelete: (event: WarehouseEvent) => void;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={(clickEvent) => {
          clickEvent.preventDefault();
          clickEvent.stopPropagation();
          onEdit(event);
        }}
        aria-label={`Edit ${event.eventName}`}
      >
        <Pencil />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        className="text-destructive hover:text-destructive"
        onClick={(clickEvent) => {
          clickEvent.preventDefault();
          clickEvent.stopPropagation();
          onDelete(event);
        }}
        aria-label={`Delete ${event.eventName}`}
      >
        <Trash2 />
      </Button>
    </div>
  );
}

export default function WarehouseEventsPage() {
  const { token } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [deleteTarget, setDeleteTarget] = useState<WarehouseEvent | null>(null);
  const [statusFilter, setStatusFilter] = useState("ONGOING");

  const { data: events, isPending, isError, refetch } = useQuery({
    queryKey: ["warehouse-events"],
    queryFn: () =>
      apiFetch<WarehouseEvent[]>("/api/events", {
        token,
      }),
  });

  const deleteEvent = useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/api/events/${id}`, {
        method: "DELETE",
        token,
      }),
    onSuccess: () => {
      toast.success("Event deleted");
      queryClient.invalidateQueries({ queryKey: ["warehouse-events"] });
      queryClient.invalidateQueries({ queryKey: ["warehouse-dashboard"] });
      setDeleteTarget(null);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  function handleEdit(event: WarehouseEvent) {
    router.push(`/warehouse/events/${event.id}/edit`);
  }

  const columns = columnHelper.columns([
    columnHelper.accessor("eventCode", {
      header: "Event Code",
      cell: (info) => (
        <span className="font-mono text-xs text-white/80">
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor("eventName", {
      header: "Name",
      cell: (info) => (
        <span className="font-medium text-white">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor("eventDate", {
      header: "Date",
      cell: (info) => (
        <span className="tabular-nums">{formatDate(info.getValue())}</span>
      ),
    }),
    columnHelper.accessor("venue", {
      header: "Venue",
      cell: (info) => (
        <span className="text-white/80">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor("status", {
      header: "Status",
      cell: (info) => (
        <Badge
          variant="outline"
          className={cn("border-transparent", statusColor(info.getValue()))}
        >
          {info.getValue()}
        </Badge>
      ),
    }),
    columnHelper.display({
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: (info) => {
        const event = info.row.original;
        return (
          <EventActions
            event={event}
            onEdit={handleEdit}
            onDelete={setDeleteTarget}
          />
        );
      },
    }),
  ]);

  const filteredEvents = (events ?? [])
    .filter((event) => !statusFilter || event.status === statusFilter)
    .sort(
      (a, b) =>
        new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime(),
    );

  const table = useTable({
    features,
    columns,
    data: filteredEvents,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Events
          </h1>
          <p className="text-slate-600 text-sm">
            Scheduled events and their site allocation status.
          </p>
        </div>

        <Button nativeButton={false} render={<Link href="/warehouse/events/create" />}>
          <Plus />
          Create Event
        </Button>
      </div>

      <div className="flex gap-2">
        <Button
          variant={statusFilter === "" ? "default" : "outline"}
          size="sm"
          onClick={() => setStatusFilter("")}
        >
          All Events
        </Button>
        <Button
          variant={statusFilter === "ONGOING" ? "default" : "outline"}
          size="sm"
          onClick={() => setStatusFilter("ONGOING")}
        >
          Ongoing
        </Button>
        <Button
          variant={statusFilter === "COMPLETED" ? "default" : "outline"}
          size="sm"
          onClick={() => setStatusFilter("COMPLETED")}
        >
          Completed
        </Button>
      </div>

      <Card className="glass-card-global">
        <CardHeader className="border-b">
          <CardTitle className="text-white font-bold">
            {statusFilter === ""
              ? "All Events"
              : statusFilter === "ONGOING"
                ? "Ongoing Events"
                : "Completed Events"}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
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
                Array.from({ length: 6 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell colSpan={columns.length}>
                      <div className="h-4 w-full animate-pulse rounded bg-white/15" />
                    </TableCell>
                  </TableRow>
                ))
              ) : isError || !events ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="py-10 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <CalendarX2 className="size-8 text-white/60" />
                      <p className="text-sm font-medium text-white">
                        Unable to load events
                      </p>
                      <p className="text-white-85 text-sm">
                        Make sure the API is running and try again.
                      </p>
                      <Button variant="outline" size="sm" onClick={() => refetch()}>
                        Try again
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredEvents.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="py-10 text-center text-white-85"
                  >
                    {statusFilter
                      ? `No ${statusFilter === "ONGOING" ? "ongoing" : "completed"} events found.`
                      : "No events scheduled yet."}
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    onClick={() =>
                      router.push(`/warehouse/events/${row.original.id}`)
                    }
                    className="cursor-pointer"
                  >
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

      <AnimatedDialog
        open={deleteTarget !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setDeleteTarget(null);
          }
        }}
      >
        <AnimatedDialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Event</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this event?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              variant="destructive"
              disabled={deleteEvent.isPending}
              onClick={() => {
                if (deleteTarget) {
                  deleteEvent.mutate(deleteTarget.id);
                }
              }}
            >
              {deleteEvent.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </AnimatedDialogContent>
      </AnimatedDialog>
    </div>
  );
}
