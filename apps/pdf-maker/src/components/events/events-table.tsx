"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarRange,
  Download,
  Edit3,
  Eye,
  FileText,
  MoreHorizontal,
  Package,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteEventProposal } from "@/app/(app)/events/actions";
import { STATUS_STYLES } from "@/lib/constants";
import {
  downloadClientPdf,
  fetchProposalPdfData,
} from "@/lib/download-client-pdf";

export type EventTableRow = {
  id: string;
  eventId: string;
  eventName: string;
  startDate: string;
  endDate: string;
  venue: string;
  city: string | null;
  state: string | null;
  eventType: string | null;
  packageType: string | null;
  packagePax: number | null;
  clientName: string | null;
  status: string;
  functionCount: number;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateRange(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (start.toDateString() === end.toDateString()) {
    return formatDate(startIso);
  }
  return `${formatDate(startIso)} — ${formatDate(endIso)}`;
}

export function EventsTable({ events }: { events: EventTableRow[] }) {
  const router = useRouter();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const confirmEvent = events.find((event) => event.id === confirmId);

  async function handleDownload(id: string) {
    if (downloadingId) {
      return;
    }
    setDownloadingId(id);
    try {
      const source = await fetchProposalPdfData(id);
      await downloadClientPdf(source);
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Failed to generate the PDF",
      );
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleDelete() {
    if (!confirmId) {
      return;
    }
    setIsDeleting(true);
    try {
      await deleteEventProposal(confirmId);
      toast.success("Event deleted");
      setConfirmId(null);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete event",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed bg-card py-20 text-center">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <FileText className="size-6" />
        </div>
        <div className="space-y-1">
          <p className="font-medium text-foreground">No events yet</p>
          <p className="text-sm text-muted-foreground">
            Create your first event proposal to get started.
          </p>
        </div>
        <Button size="lg" nativeButton={false} render={<Link href="/events/new" />}>
          <Plus data-icon="inline-start" />
          Create New Event
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Venue</TableHead>
              <TableHead>Package</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10 text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((event) => {
              const statusStyle = STATUS_STYLES[event.status] ?? {
                variant: "outline",
              };
              return (
                <TableRow key={event.id}>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <Link
                        href={`/events/${event.id}/edit`}
                        className="font-medium text-foreground transition-colors hover:text-primary"
                      >
                        {event.eventName}
                      </Link>
                      <span className="text-xs text-muted-foreground">
                        {event.eventId}
                        {event.eventType ? ` · ${event.eventType}` : ""}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <CalendarRange className="size-3.5" />
                      {formatDateRange(event.startDate, event.endDate)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{event.venue}</span>
                      {event.city && (
                        <span className="text-xs text-muted-foreground">
                          {[event.city, event.state].filter(Boolean).join(", ")}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <Package className="size-3.5" />
                      {event.packageType ?? "—"}
                      {event.packagePax != null
                        ? ` · ${event.packagePax} pax`
                        : ""}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{event.clientName ?? "—"}</span>
                      <span className="text-xs text-muted-foreground">
                        {event.functionCount} function
                        {event.functionCount === 1 ? "" : "s"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={statusStyle.variant}
                      className={statusStyle.className}
                    >
                      {event.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button variant="ghost" size="icon" aria-label="Actions" />
                        }
                      >
                        <MoreHorizontal />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          render={<Link href={`/events/${event.id}/edit`} />}
                        >
                          <Edit3 />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          render={<Link href={`/events/${event.id}/pdf`} />}
                        >
                          <Eye />
                          Preview
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDownload(event.id)}
                        >
                          <Download />
                          Download PDF
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setConfirmId(event.id)}
                        >
                          <Trash2 />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={confirmId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmId(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete event?</DialogTitle>
            <DialogDescription>
              <span className="font-medium text-foreground">
                {confirmEvent?.eventName}
              </span>{" "}
              ({confirmEvent?.eventId}) and its functions will be permanently
              removed. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmId(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
