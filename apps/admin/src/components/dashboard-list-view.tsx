"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, PackageX } from "lucide-react";
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
import {
  EVENT_STATUS_COLORS,
  formatDate,
  statusColor,
} from "@/lib/format";
import { cn } from "@/lib/utils";

export type DashboardItem = {
  id: string;
  sku: string;
  itemName: string;
  category: string;
  status: string;
  unit: string;
  openingStock: number;
  maxLevel: number | null;
  currentStock: number;
  availableStock: number;
  expiryDate?: string | null;
};

type DashboardEvent = {
  id: string;
  eventName: string;
  eventDate: string;
  status: string;
  pax: number;
};

export type LostItem = {
  id: string;
  lostQuantity: number;
  item: { itemName: string };
  event: { eventName: string };
};

type DashboardComplain = {
  id: string;
  complainId: string;
  siteManagerName: string;
  eventId?: string | null;
  description: string;
  status: string;
  createdAt: string;
};

type ViewKind = "items" | "events" | "lost" | "complains";

type ViewConfig = {
  title: string;
  url: string;
  kind: ViewKind;
};

const VIEW_CONFIG: Record<string, ViewConfig> = {
  totalItems: { title: "Total Items", url: "/api/items", kind: "items" },
  totalEvents: { title: "Total Events", url: "/api/events", kind: "events" },
  expiringItems: {
    title: "Items to be Expired",
    url: "/api/items?filter=expiring",
    kind: "items",
  },
  lowStockItems: {
    title: "Low Stock",
    url: "/api/items?filter=low-stock",
    kind: "items",
  },
  actionsNeeded: {
    title: "Actions Needed",
    url: "/api/items?filter=actions-needed",
    kind: "items",
  },
  lostItems: {
    title: "Lost Items",
    url: "/api/warehouse/lost-items",
    kind: "lost",
  },
  openEvents: {
    title: "Open Events",
    url: "/api/events?filter=open",
    kind: "events",
  },
  complains: {
    title: "Complaints",
    url: "/api/complains",
    kind: "complains",
  },
};

const ITEM_STATUS_COLORS: Record<string, string> = {
  "In Stock": "bg-emerald-100 text-emerald-700",
  Low: "bg-amber-100 text-amber-700",
  "Action Required": "bg-rose-100 text-rose-700",
};

function LoadingRow({ colSpan }: { colSpan: number }) {
  return (
    <>
      {Array.from({ length: 6 }).map((_, index) => (
        <TableRow key={index}>
          <TableCell colSpan={colSpan}>
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

function ErrorRow({
  colSpan,
  onRetry,
}: {
  colSpan: number;
  onRetry: () => void;
}) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="py-10 text-center">
        <div className="flex flex-col items-center gap-3">
          <PackageX className="size-8 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">
            Unable to load data
          </p>
          <p className="text-sm text-muted-foreground">
            Make sure the API is running and try again.
          </p>
          <Button variant="outline" size="sm" onClick={onRetry}>
            Try again
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <TableRow>
      <TableCell
        colSpan={colSpan}
        className="py-10 text-center text-muted-foreground"
      >
        {label}
      </TableCell>
    </TableRow>
  );
}

export function ItemsTable({
  items,
  isPending,
  isError,
  onRetry,
}: {
  items: DashboardItem[];
  isPending: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  const colSpan = 8;
  return (
    <>
      <TableHeader>
        <TableRow>
          <TableHead>SKU</TableHead>
          <TableHead>Item Name</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Unit</TableHead>
          <TableHead className="text-right">Max Level</TableHead>
          <TableHead className="text-right">Opening Stock</TableHead>
          <TableHead className="text-right">Current Stock</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isPending ? (
          <LoadingRow colSpan={colSpan} />
        ) : isError ? (
          <ErrorRow colSpan={colSpan} onRetry={onRetry} />
        ) : items.length === 0 ? (
          <EmptyRow colSpan={colSpan} label="No items found." />
        ) : (
          items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {item.sku}
              </TableCell>
              <TableCell className="font-medium text-foreground">
                {item.itemName}
              </TableCell>
              <TableCell>{item.category}</TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={cn(
                    "border-transparent",
                    statusColor(item.status, ITEM_STATUS_COLORS),
                  )}
                >
                  {item.status}
                </Badge>
              </TableCell>
              <TableCell>{item.unit}</TableCell>
              <TableCell className="text-right tabular-nums">
                {item.maxLevel?.toLocaleString() ?? "—"}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {item.openingStock.toLocaleString()}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {item.currentStock.toLocaleString()}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </>
  );
}

function EventsTable({
  events,
  isPending,
  isError,
  onRetry,
}: {
  events: DashboardEvent[];
  isPending: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  const colSpan = 4;
  return (
    <>
      <TableHeader>
        <TableRow>
          <TableHead>Event Name</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Pax</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isPending ? (
          <LoadingRow colSpan={colSpan} />
        ) : isError ? (
          <ErrorRow colSpan={colSpan} onRetry={onRetry} />
        ) : events.length === 0 ? (
          <EmptyRow colSpan={colSpan} label="No events found." />
        ) : (
          events.map((event) => (
            <TableRow key={event.id}>
              <TableCell className="font-medium text-foreground">
                {event.eventName}
              </TableCell>
              <TableCell className="tabular-nums">
                {formatDate(event.eventDate)}
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={cn(
                    "border-transparent",
                    statusColor(event.status, EVENT_STATUS_COLORS),
                  )}
                >
                  {event.status}
                </Badge>
              </TableCell>
              <TableCell className="tabular-nums">
                {event.pax.toLocaleString()}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </>
  );
}

export function LostItemsTable({
  items,
  isPending,
  isError,
  onRetry,
}: {
  items: LostItem[];
  isPending: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  const colSpan = 3;
  return (
    <>
      <TableHeader>
        <TableRow>
          <TableHead>Item Name</TableHead>
          <TableHead>Event Name</TableHead>
          <TableHead>Lost Quantity</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isPending ? (
          <LoadingRow colSpan={colSpan} />
        ) : isError ? (
          <ErrorRow colSpan={colSpan} onRetry={onRetry} />
        ) : items.length === 0 ? (
          <EmptyRow colSpan={colSpan} label="No lost items found." />
        ) : (
          items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium text-foreground">
                {item.item?.itemName}
              </TableCell>
              <TableCell>{item.event?.eventName}</TableCell>
              <TableCell className="tabular-nums">
                {item.lostQuantity.toLocaleString()}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </>
  );
}

export type DamagedItem = {
  id: string;
  quantity: number;
  remark: string | null;
  item: { itemName: string };
  event: { eventName: string };
};

export function DamagedItemsTable({
  items,
  isPending,
  isError,
  onRetry,
}: {
  items: DamagedItem[];
  isPending: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  const colSpan = 4;
  return (
    <>
      <TableHeader>
        <TableRow>
          <TableHead>Item Name</TableHead>
          <TableHead>Event Name</TableHead>
          <TableHead>Quantity</TableHead>
          <TableHead>Remark</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isPending ? (
          <LoadingRow colSpan={colSpan} />
        ) : isError ? (
          <ErrorRow colSpan={colSpan} onRetry={onRetry} />
        ) : items.length === 0 ? (
          <EmptyRow colSpan={colSpan} label="No damaged items found." />
        ) : (
          items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium text-foreground">
                {item.item?.itemName}
              </TableCell>
              <TableCell>{item.event?.eventName}</TableCell>
              <TableCell className="tabular-nums">
                {item.quantity.toLocaleString()}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {item.remark || "—"}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </>
  );
}

const COMPLAIN_STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-amber-100 text-amber-700",
  RESOLVED: "bg-emerald-100 text-emerald-700",
  CLOSED: "bg-slate-100 text-slate-700",
};

function ComplaintsTable({
  complains,
  isPending,
  isError,
  onRetry,
}: {
  complains: DashboardComplain[];
  isPending: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  const colSpan = 5;
  return (
    <>
      <TableHeader>
        <TableRow>
          <TableHead>Complain ID</TableHead>
          <TableHead>Site Manager</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isPending ? (
          <LoadingRow colSpan={colSpan} />
        ) : isError ? (
          <ErrorRow colSpan={colSpan} onRetry={onRetry} />
        ) : complains.length === 0 ? (
          <EmptyRow colSpan={colSpan} label="No complaints found." />
        ) : (
          complains.map((complain) => (
            <TableRow key={complain.id}>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {complain.complainId}
              </TableCell>
              <TableCell className="font-medium text-foreground">
                {complain.siteManagerName}
              </TableCell>
              <TableCell className="max-w-md truncate text-muted-foreground">
                {complain.description}
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={cn(
                    "border-transparent",
                    statusColor(complain.status, COMPLAIN_STATUS_COLORS),
                  )}
                >
                  {complain.status}
                </Badge>
              </TableCell>
              <TableCell className="tabular-nums">
                {formatDate(complain.createdAt)}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </>
  );
}

export default function DashboardListView({
  viewId,
  onBack,
}: {
  viewId: string;
  onBack: () => void;
}) {
  const { token } = useAuth();
  const config = VIEW_CONFIG[viewId];
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, categoryFilter]);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["dashboard-list", viewId],
    queryFn: () => apiFetch<unknown[]>(config?.url ?? "", { token }),
    enabled: Boolean(config),
  });

  const itemsData = (data ?? []) as DashboardItem[];
  const categoryOptions = useMemo(
    () => Array.from(new Set(itemsData.map((item) => item.category))).sort(),
    [itemsData],
  );
  const filteredItemsData = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return itemsData.filter((item) => {
      const matchesSearch =
        !query ||
        item.sku.toLowerCase().includes(query) ||
        item.itemName.toLowerCase().includes(query);
      const matchesCategory = !categoryFilter || item.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [itemsData, searchQuery, categoryFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredItemsData.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedItemsData = useMemo(
    () => filteredItemsData.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filteredItemsData, safePage, pageSize],
  );

  if (!config) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Dashboard
          </h2>
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft />
            Back to Dashboard
          </Button>
        </div>
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Unknown dashboard view: {viewId}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1.5">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            {config.title}
          </h2>
          <p className="text-sm text-muted-foreground">
            Filtered list for the selected metric.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft />
          Back to Dashboard
        </Button>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>{config.title}</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {config.kind === "items" ? (
            <div className="flex flex-wrap items-center gap-3 pb-4">
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by SKU or item name…"
                className="w-full sm:max-w-xs"
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
            </div>
          ) : null}
          <Table>
            {config.kind === "items" ? (
              <ItemsTable
                items={paginatedItemsData}
                isPending={isPending}
                isError={isError}
                onRetry={refetch}
              />
            ) : config.kind === "events" ? (
              <EventsTable
                events={(data ?? []) as DashboardEvent[]}
                isPending={isPending}
                isError={isError}
                onRetry={refetch}
              />
            ) : config.kind === "lost" ? (
              <LostItemsTable
                items={(data ?? []) as LostItem[]}
                isPending={isPending}
                isError={isError}
                onRetry={refetch}
              />
            ) : (
              <ComplaintsTable
                complains={(data ?? []) as DashboardComplain[]}
                isPending={isPending}
                isError={isError}
                onRetry={refetch}
              />
            )}
          </Table>
          {config.kind === "items" && filteredItemsData.length > pageSize ? (
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
                  Showing {paginatedItemsData.length} of {filteredItemsData.length} items
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
    </div>
  );
}
