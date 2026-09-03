"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  CupSoda,
  Droplets,
  Luggage,
  Package,
  PackageX,
  PartyPopper,
  Recycle,
  RotateCw,
  Settings,
  Shirt,
  Utensils,
  Wine,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ItemsTable, type DashboardItem } from "@/components/dashboard-list-view";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const CATEGORIES: { value: string; label: string; icon: LucideIcon }[] = [
  { value: "SETUP", label: "Setup", icon: Settings },
  { value: "UNIFORM", label: "Uniform", icon: Shirt },
  { value: "GLASSWARE", label: "Glassware", icon: Wine },
  { value: "DISPOSALS", label: "Disposals", icon: Recycle },
  { value: "CONSUMABLE", label: "Consumable Item", icon: Utensils },
  { value: "SYRUP", label: "Syrup", icon: Droplets },
  { value: "BEVERAGE", label: "Beverage", icon: CupSoda },
  { value: "ENTERTAINMENT", label: "Entertainment", icon: PartyPopper },
  { value: "CARTS", label: "Carts", icon: Luggage },
  { value: "OTHER", label: "Other", icon: Package },
];

function CategoryCardSkeleton() {
  return (
    <Card className="glass-card-global">
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div className="flex flex-col gap-2.5">
          <div className="h-3 w-28 animate-pulse rounded bg-white/15" />
          <div className="h-8 w-16 animate-pulse rounded bg-white/15" />
          <div className="h-3 w-12 animate-pulse rounded bg-white/15" />
        </div>
        <div className="size-11 animate-pulse rounded-xl bg-white/15" />
      </CardContent>
    </Card>
  );
}

export function CategoryBreakdownView({
  onBack,
}: {
  onBack: () => void;
}) {
  const { token } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory]);

  const { data: items, isPending, isError, refetch } = useQuery({
    queryKey: ["warehouse-items"],
    queryFn: () => apiFetch<DashboardItem[]>("/api/items", { token }),
  });

  const counts = useMemo(() => {
    return (items ?? []).reduce<Record<string, number>>((acc, item) => {
      acc[item.category] = (acc[item.category] ?? 0) + 1;
      return acc;
    }, {});
  }, [items]);

  const selected =
    CATEGORIES.find((category) => category.value === selectedCategory) ?? null;

  const categoryItemsQuery = useQuery({
    queryKey: ["warehouse-items", selectedCategory],
    queryFn: () =>
      apiFetch<DashboardItem[]>(
        `/api/items?category=${selectedCategory}`,
        { token },
      ),
    enabled: selectedCategory !== null,
  });

  const categoryItems = categoryItemsQuery.data ?? [];
  const totalPages = Math.max(1, Math.ceil(categoryItems.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedCategoryItems = useMemo(
    () => categoryItems.slice((safePage - 1) * pageSize, safePage * pageSize),
    [categoryItems, safePage, pageSize],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1.5">
          <h2 className="text-xl font-bold tracking-tight text-white">
            Category Breakdown
          </h2>
          <p className="text-white-85 text-sm">
            {selected
              ? `Items filed under ${selected.label}.`
              : "Browse warehouse items grouped by category."}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft />
          Back to Dashboard
        </Button>
      </div>

      {selected ? (
        <div className="flex flex-col gap-4">
          <Button
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() => setSelectedCategory(null)}
          >
            <ArrowLeft />
            Back to Categories
          </Button>

          <Card className="glass-card-global">
            <CardHeader className="border-b">
              <CardTitle className="text-white font-bold">
                {selected.label} ({counts[selected.value] ?? 0} items)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <Table>
                <ItemsTable
                  items={paginatedCategoryItems}
                  isPending={categoryItemsQuery.isPending}
                  isError={categoryItemsQuery.isError}
                  onRetry={() => categoryItemsQuery.refetch()}
                />
              </Table>
              {categoryItems.length > 0 ? (
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
                    <span className="text-white-85 text-xs">
                      Showing {paginatedCategoryItems.length} of{" "}
                      {categoryItems.length} items
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
                    <span className="text-white-85 text-xs">
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
      ) : isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <CategoryCardSkeleton key={index} />
          ))}
        </div>
      ) : isError || !items ? (
        <Card className="glass-card-global">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <PackageX className="size-8 text-white/60" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-white">
                Unable to load categories
              </p>
              <p className="text-white-85 text-sm">
                Make sure the API is running and try again.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RotateCw />
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {CATEGORIES.map((category) => {
            const Icon = category.icon;
            return (
              <Card
                key={category.value}
                onClick={() => setSelectedCategory(category.value)}
                className="glass-card-global group relative cursor-pointer overflow-hidden"
              >
                <CardContent className="relative flex items-start justify-between gap-4 p-5">
                  <div className="space-y-1.5">
                    <p className="text-white-85 text-sm font-medium">
                      {category.label}
                    </p>
                    <p className="text-3xl font-bold tracking-tight tabular-nums text-white">
                      {(counts[category.value] ?? 0).toLocaleString()}
                    </p>
                    <p className="text-white-85 text-xs">items</p>
                  </div>
                  <span className="gold-icon-bg flex size-11 shrink-0 items-center justify-center rounded-xl">
                    <Icon className="size-5" />
                  </span>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
