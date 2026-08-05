"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CircleAlert, PackageCheck } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

type InventoryItem = {
  id: string;
  name: string;
  category: string;
  totalQuantity: number;
  availableQuantity: number;
  reservedQuantity: number;
  dispatchedQuantity: number;
  damagedQuantity: number;
  lostQuantity: number;
  minStockLevel: number;
  createdAt: string;
  updatedAt: string;
};

type Severity = "critical" | "warning";

function getSeverity(item: InventoryItem): Severity {
  if (item.availableQuantity === 0) {
    return "critical";
  }
  if (item.availableQuantity * 2 <= item.minStockLevel) {
    return "critical";
  }
  return "warning";
}

function stockRatio(item: InventoryItem): number {
  if (item.minStockLevel <= 0) {
    return 100;
  }
  return Math.min(100, (item.availableQuantity / item.minStockLevel) * 100);
}

function LowStockCard({ item }: { item: InventoryItem }) {
  const severity = getSeverity(item);
  const isCritical = severity === "critical";

  return (
    <Card
      className={cn(
        "ring-2",
        isCritical
          ? "bg-red-50/60 ring-red-200"
          : "bg-amber-50/60 ring-amber-200",
      )}
    >
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-lg",
                isCritical
                  ? "bg-red-100 text-red-600"
                  : "bg-amber-100 text-amber-600",
              )}
            >
              {isCritical ? (
                <AlertTriangle className="size-5" />
              ) : (
                <CircleAlert className="size-5" />
              )}
            </span>
            <div className="min-w-0 space-y-0.5">
              <p className="truncate text-sm font-semibold text-foreground">
                {item.name}
              </p>
              <p className="text-xs text-muted-foreground">{item.category}</p>
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "shrink-0 border-transparent",
              isCritical
                ? "bg-red-100 text-red-700"
                : "bg-amber-100 text-amber-700",
            )}
          >
            {isCritical ? "Critical" : "Low Stock"}
          </Badge>
        </div>

        <div className="flex items-baseline justify-between">
          <span className="text-xs text-muted-foreground">Available</span>
          <span
            className={cn(
              "text-lg font-bold tabular-nums tracking-tight",
              isCritical ? "text-red-600" : "text-amber-600",
            )}
          >
            {item.availableQuantity}
            <span className="ml-1 text-xs font-medium text-muted-foreground">
              / min {item.minStockLevel}
            </span>
          </span>
        </div>

        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              isCritical ? "bg-red-500" : "bg-amber-400",
            )}
            style={{ width: `${stockRatio(item)}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function LowStockSkeleton() {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex items-center gap-3">
          <div className="size-10 animate-pulse rounded-lg bg-muted" />
          <div className="space-y-2">
            <div className="h-4 w-36 animate-pulse rounded bg-muted" />
            <div className="h-3 w-20 animate-pulse rounded bg-muted" />
          </div>
        </div>
        <div className="h-6 w-24 animate-pulse rounded bg-muted" />
        <div className="h-2 w-full animate-pulse rounded-full bg-muted" />
      </CardContent>
    </Card>
  );
}

export default function WarehouseOverviewPage() {
  const { token } = useAuth();

  const {
    data: items,
    isPending,
    isError,
  } = useQuery({
    queryKey: ["warehouse-low-stock"],
    queryFn: () =>
      apiFetch<InventoryItem[]>("/api/warehouse/inventory/low-stock", {
        token,
      }),
  });

  const criticalCount = items?.filter((item) => getSeverity(item) === "critical").length ?? 0;
  const warningCount = items?.filter((item) => getSeverity(item) === "warning").length ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Warehouse Overview
          </h1>
          <p className="text-sm text-muted-foreground">
            Monitor stock levels and identify items that need restocking.
          </p>
        </div>

        {!isPending && !isError && items ? (
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="border-transparent bg-red-100 text-red-700"
            >
              {criticalCount} critical
            </Badge>
            <Badge
              variant="outline"
              className="border-transparent bg-amber-100 text-amber-700"
            >
              {warningCount} low
            </Badge>
          </div>
        ) : null}
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="size-4.5 text-amber-600" />
            Low Stock Alerts
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          {isPending ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <LowStockSkeleton key={index} />
              ))}
            </div>
          ) : isError || !items ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <p className="text-sm font-medium text-foreground">
                Unable to load low-stock alerts
              </p>
              <p className="text-sm text-muted-foreground">
                Make sure the API is running and try again.
              </p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <PackageCheck className="size-8 text-emerald-600" />
              <p className="text-sm font-medium text-foreground">
                All stock levels healthy
              </p>
              <p className="text-sm text-muted-foreground">
                No inventory items are below their minimum stock level.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {items.map((item) => (
                <LowStockCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
