"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  createColumnHelper,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { Loader2 } from "lucide-react";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/animated-dialog";
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
import { formatDate, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";

type StockMovement = {
  id: string;
  itemId: string;
  eventId: string | null;
  type: string;
  quantity: number;
  remark: string | null;
  createdByAdminId: string | null;
  createdByEmployeeId: string | null;
  createdAt: string;
  item: { sku: string; itemName: string; category: string };
  event: { eventName: string } | null;
};

const TYPE_COLORS: Record<string, string> = {
  ADMIN_INCREASE: "bg-emerald-100 text-emerald-700",
  ADMIN_DECREASE: "bg-rose-100 text-rose-700",
  EVENT_OUT: "bg-amber-100 text-amber-700",
  EVENT_IN: "bg-sky-100 text-sky-700",
  EVENT_DAMAGE: "bg-red-100 text-red-700",
  EVENT_LOST: "bg-purple-100 text-purple-700",
};

const TYPE_LABELS: Record<string, string> = {
  ADMIN_INCREASE: "Admin Increase",
  ADMIN_DECREASE: "Admin Decrease",
  EVENT_OUT: "Issued",
  EVENT_IN: "Returned",
  EVENT_DAMAGE: "Damaged",
  EVENT_LOST: "Lost",
};

type EventMovementEvent = {
  id: string;
  eventName: string;
  eventCode: string;
  eventDate: string;
  venue: string;
  status: string;
};

type EventMovement = {
  id: string;
  itemId: string;
  type: string;
  quantity: number;
  remark: string | null;
  createdAt: string;
  item: { sku: string; itemName: string; category: string; unit: string };
  user: { id: string; name: string } | null;
};

type EventMovementDetail = {
  event: EventMovementEvent;
  movements: EventMovement[];
};

const QUICK_FILTERS = [
  { label: "All", value: "" },
  { label: "Damage Reports", value: "EVENT_DAMAGE" },
  { label: "Admin Adjustments", value: "ADMIN" },
] as const;

const features = tableFeatures({});
const EMPTY_MOVEMENTS: StockMovement[] = [];

function TypeBadge({ type }: { type: string }) {
  return (
    <Badge
      variant="outline"
      className={cn("border-transparent whitespace-nowrap", TYPE_COLORS[type])}
    >
      {TYPE_LABELS[type] ?? type}
    </Badge>
  );
}

export default function StockMovementsPage() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<"movements" | "events">("movements");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [eventStatusFilter, setEventStatusFilter] = useState("ONGOING");
  const [typeFilter, setTypeFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, typeFilter, categoryFilter]);

  const typeParam =
    typeFilter === "ADMIN"
      ? undefined
      : typeFilter || undefined;

  const { data: movements, isPending, isError, refetch } = useQuery({
    queryKey: ["stock-movements", typeParam],
    queryFn: () => {
      const params = new URLSearchParams();
      if (typeParam) params.set("type", typeParam);
      const qs = params.toString();
      return apiFetch<StockMovement[]>(
        `/api/items/stock-movements${qs ? `?${qs}` : ""}`,
        { token },
      );
    },
  });

  const { data: eventMovements, isPending: eventsPending, isError: eventsError, refetch: eventsRefetch } =
    useQuery({
      queryKey: ["warehouse-movement-events", eventStatusFilter],
      queryFn: () => {
        const params = new URLSearchParams();
        if (eventStatusFilter) params.set("status", eventStatusFilter);
        const qs = params.toString();
        return apiFetch<EventMovementEvent[]>(
          `/api/warehouse/movements/events${qs ? `?${qs}` : ""}`,
          { token },
        );
      },
    });

  const {
    data: eventDetail,
    isPending: detailPending,
    isFetching: detailFetching,
  } = useQuery({
    queryKey: ["warehouse-movement-event", selectedEventId],
    queryFn: () =>
      apiFetch<EventMovementDetail>(
        `/api/warehouse/movements/events/${selectedEventId}`,
        { token },
      ),
    enabled: Boolean(selectedEventId),
  });

  const typeFiltered =
    typeFilter === "ADMIN"
      ? (movements ?? []).filter(
          (m) => m.type === "ADMIN_INCREASE" || m.type === "ADMIN_DECREASE",
        )
      : movements ?? EMPTY_MOVEMENTS;

  const categoryOptions = useMemo(
    () => Array.from(new Set((movements ?? []).map((m) => m.item.category))).sort(),
    [movements],
  );

  const search = searchQuery.trim().toLowerCase();
  const filteredMovements = (search || categoryFilter)
    ? typeFiltered.filter(
        (m) =>
          (!search ||
            m.item.itemName.toLowerCase().includes(search) ||
            m.item.sku.toLowerCase().includes(search) ||
            (m.event?.eventName ?? "").toLowerCase().includes(search)) &&
          (!categoryFilter || m.item.category === categoryFilter),
      )
    : typeFiltered;

  const totalPages = Math.max(1, Math.ceil(filteredMovements.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedMovements = useMemo(
    () => filteredMovements.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filteredMovements, safePage, pageSize],
  );

  const columnHelper = createColumnHelper<typeof features, StockMovement>();

  const columns = columnHelper.columns([
    columnHelper.accessor("createdAt", {
      header: "Date",
      cell: (info) => (
        <span className="text-muted-foreground">
          {formatDate(info.getValue())}
        </span>
      ),
    }),
    columnHelper.accessor("item", {
      header: "Item",
      cell: (info) => {
        const item = info.getValue();
        return (
          <div className="flex flex-col">
            <span className="font-medium text-foreground">{item.itemName}</span>
            <span className="font-mono text-xs text-muted-foreground">
              {item.sku}
            </span>
          </div>
        );
      },
    }),
    columnHelper.accessor("type", {
      header: "Type",
      cell: (info) => <TypeBadge type={info.getValue()} />,
    }),
    columnHelper.accessor("quantity", {
      header: () => <div className="text-right">Quantity</div>,
      cell: (info) => (
        <span className="block text-right tabular-nums">
          {info.getValue().toLocaleString()}
        </span>
      ),
    }),
    columnHelper.accessor("event", {
      header: "Event",
      cell: (info) => {
        const event = info.getValue();
        return (
          <span className="text-muted-foreground">
            {event?.eventName ?? "—"}
          </span>
        );
      },
    }),
    columnHelper.accessor("remark", {
      header: "Remark",
      cell: (info) => (
        <span className="text-muted-foreground">
          {info.getValue() || "—"}
        </span>
      ),
    }),
  ]);

  const table = useTable({
    features,
    columns,
    data: paginatedMovements,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Stock Movements
        </h1>
        <p className="text-white-85 text-sm">
          View all stock adjustments, event allocations, and damage reports.
        </p>
      </div>

      <div className="flex gap-2">
        <Button
          variant={activeTab === "movements" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("movements")}
        >
          All Movements
        </Button>
        <Button
          variant={activeTab === "events" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("events")}
        >
          Event Movements
        </Button>
      </div>

      {activeTab === "movements" ? (
        <Card className="glass-card-global">
        <CardHeader className="border-b">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-white font-bold">All Movements</CardTitle>
            <div className="flex flex-wrap items-center gap-3">
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by item, SKU, or event…"
                className="w-full sm:w-64"
              />
              <Select
                value={categoryFilter}
                onValueChange={(value) =>
                  setCategoryFilter(typeof value === "string" ? value : "")
                }
              >
                <SelectTrigger className="w-full sm:w-52">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Categories</SelectItem>
                  {categoryOptions.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-1">
                {QUICK_FILTERS.map((filter) => (
                  <Button
                    key={filter.value}
                    variant={typeFilter === filter.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTypeFilter(filter.value)}
                  >
                    {filter.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
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
                      <div className="h-4 w-full animate-pulse rounded bg-muted" />
                    </TableCell>
                  </TableRow>
                ))
              ) : isError || !movements ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="py-10 text-center"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <p className="text-sm font-medium text-foreground">
                        Unable to load stock movements
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Make sure the API is running and try again.
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
              ) : filteredMovements.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="py-10 text-center text-muted-foreground"
                  >
                    No stock movements recorded yet.
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
          {filteredMovements.length > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <div className="flex items-center gap-3">
                <Select
                  value={String(pageSize)}
                  onValueChange={(value) => {
                    setPageSize(Number(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-36" size="sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 15, 25, 35, 50].map((size) => (
                      <SelectItem key={size} value={String(size)}>
                        {size} per page
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-xs text-muted-foreground">
                  Showing {paginatedMovements.length} of {filteredMovements.length}{" "}
                  movements
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safePage <= 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <span className="text-xs text-muted-foreground">
                  Page {safePage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safePage >= totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
      ) : (
        <Card className="glass-card-global">
          <CardHeader className="border-b">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="text-white font-bold">Event Movements</CardTitle>
              <Select
                value={eventStatusFilter}
                onValueChange={(value) =>
                  setEventStatusFilter(value ?? "")
                }
              >
                <SelectTrigger className="w-36" size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All</SelectItem>
                  <SelectItem value="ONGOING">Ongoing</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {eventsPending ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : eventsError ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <p className="text-sm text-muted-foreground">
                  Failed to load event movements.
                </p>
                <Button variant="outline" size="sm" onClick={() => eventsRefetch()}>
                  Retry
                </Button>
              </div>
            ) : (eventMovements ?? []).length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No event movements recorded yet.
              </div>
            ) : (
              <Table className="mt-4">
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Venue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(eventMovements ?? []).map((event) => (
                    <TableRow
                      key={event.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedEventId(event.id)}
                    >
                      <TableCell className="font-medium">
                        {event.eventName}
                        <span className="ml-2 font-normal text-muted-foreground">
                          {event.eventCode}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(event.eventDate)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {event.venue || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      <AnimatedDialog
        open={Boolean(selectedEventId)}
        onOpenChange={(open) => {
          if (!open) setSelectedEventId(null);
        }}
      >
        <AnimatedDialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {eventDetail?.event.eventName ?? "Event Movements"}
            </DialogTitle>
            <DialogDescription>
              {eventDetail
                ? `${formatDate(eventDetail.event.eventDate)}${
                    eventDetail.event.venue ? ` — ${eventDetail.event.venue}` : ""
                  }`
                : "Loading…"}
            </DialogDescription>
          </DialogHeader>

          {detailFetching && !eventDetail ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (eventDetail?.movements ?? []).length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No movements recorded for this event.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(eventDetail?.movements ?? []).map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell>
                      <div className="font-medium">{movement.item.itemName}</div>
                      <div className="text-xs text-muted-foreground">
                        {movement.item.sku} · {movement.item.category}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          "font-medium",
                          TYPE_COLORS[movement.type] ?? "bg-muted text-muted-foreground",
                        )}
                      >
                        {TYPE_LABELS[movement.type] ?? movement.type}
                        {movement.remark ? ` · ${movement.remark}` : ""}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {movement.type === "EVENT_IN" ||
                      movement.type === "EVENT_DAMAGE" ||
                      movement.type === "EVENT_LOST" ? (
                        <span className="text-rose-600">−{movement.quantity}</span>
                      ) : (
                        <span className="text-emerald-600">+{movement.quantity}</span>
                      )}{" "}
                      <span className="text-xs text-muted-foreground">
                        {movement.item.unit}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {movement.user?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <div>{formatDate(movement.createdAt)}</div>
                      <div className="text-xs">{formatTime(movement.createdAt)}</div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </AnimatedDialogContent>
      </AnimatedDialog>
    </div>
  );
}
