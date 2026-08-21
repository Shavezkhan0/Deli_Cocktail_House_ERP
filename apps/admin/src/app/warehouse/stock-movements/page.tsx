"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  createColumnHelper,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
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
import { formatDate } from "@/lib/format";
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
};

const TYPE_LABELS: Record<string, string> = {
  ADMIN_INCREASE: "Admin Increase",
  ADMIN_DECREASE: "Admin Decrease",
  EVENT_OUT: "Event Out",
  EVENT_IN: "Event In",
  EVENT_DAMAGE: "Damage Report",
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
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Stock Movements
        </h1>
        <p className="text-sm text-muted-foreground">
          View all stock adjustments, event allocations, and damage reports.
        </p>
      </div>

      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>All Movements</CardTitle>
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
          {filteredMovements.length > pageSize ? (
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
    </div>
  );
}
