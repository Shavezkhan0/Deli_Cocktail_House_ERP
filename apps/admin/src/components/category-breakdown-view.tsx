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
import { cn } from "@/lib/utils";

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

const CATEGORY_COLORS: Record<string, string> = {
  SETUP: "bg-sky-100 text-sky-700",
  UNIFORM: "bg-violet-100 text-violet-700",
  GLASSWARE: "bg-emerald-100 text-emerald-700",
  DISPOSALS: "bg-amber-100 text-amber-700",
  CONSUMABLE: "bg-rose-100 text-rose-700",
  SYRUP: "bg-pink-100 text-pink-700",
  BEVERAGE: "bg-cyan-100 text-cyan-700",
  ENTERTAINMENT: "bg-purple-100 text-purple-700",
  CARTS: "bg-orange-100 text-orange-700",
  OTHER: "bg-slate-100 text-slate-700",
};

function categoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? "bg-indigo-100 text-indigo-700";
}

function CategoryCardSkeleton() {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div className="flex flex-col gap-2.5">
          <div className="h-3 w-28 animate-pulse rounded bg-muted" />
          <div className="h-8 w-16 animate-pulse rounded bg-muted" />
          <div className="h-3 w-12 animate-pulse rounded bg-muted" />
        </div>
        <div className="size-11 animate-pulse rounded-xl bg-muted" />
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
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Category Breakdown
          </h2>
          <p className="text-sm text-muted-foreground">
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

          <Card>
            <CardHeader className="border-b">
              <CardTitle>
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
              {categoryItems.length > pageSize ? (
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
      ) : isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <CategoryCardSkeleton key={index} />
          ))}
        </div>
      ) : isError || !items ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <PackageX className="size-8 text-muted-foreground" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                Unable to load categories
              </p>
              <p className="text-sm text-muted-foreground">
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
                className="group relative cursor-pointer overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:ring-2 hover:ring-primary/25"
              >
                <CardContent className="relative flex items-start justify-between gap-4 p-5">
                  <div className="space-y-1.5">
                    <p className="text-sm font-medium text-muted-foreground">
                      {category.label}
                    </p>
                    <p className="text-3xl font-bold tracking-tight tabular-nums text-foreground">
                      {(counts[category.value] ?? 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">items</p>
                  </div>
                  <span
                    className={cn(
                      "flex size-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3",
                      categoryColor(category.value),
                    )}
                  >
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
