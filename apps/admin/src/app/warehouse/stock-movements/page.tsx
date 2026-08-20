"use client";

import { useState } from "react";
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
  item: { sku: string; itemName: string };
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

  const filteredMovements =
    typeFilter === "ADMIN"
      ? (movements ?? []).filter(
          (m) => m.type === "ADMIN_INCREASE" || m.type === "ADMIN_DECREASE",
        )
      : movements ?? EMPTY_MOVEMENTS;

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
    data: filteredMovements,
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
        </CardContent>
      </Card>
    </div>
  );
}
