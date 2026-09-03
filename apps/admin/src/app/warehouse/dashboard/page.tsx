"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlarmClock,
  CalendarCheck2,
  CalendarDays,
  ClipboardCheck,
  Hourglass,
  Layers,
  Loader2,
  MessageSquareWarning,
  Package,
  PackageX,
  RotateCw,
  TrendingDown,
  Users,
  type LucideIcon,
} from "lucide-react";
import DashboardListView from "@/components/dashboard-list-view";
import { CategoryBreakdownView } from "@/components/category-breakdown-view";
import { LostAndDamageView } from "@/components/lost-and-damage-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

type DashboardMetrics = {
  totalItems: number;
  totalEvents: number;
  expiringItems: number;
  lowStockItems: number;
  actionNeededItems: number;
  openEvents: number;
  totalLostItems: number;
  totalDamagedItems: number;
  totalComplains: number;
};

type Stat = {
  id: string;
  label: string;
  value: number;
  hint: string;
  icon: LucideIcon;
  iconClass: string;
  barClass: string;
};

const TOTAL_ITEM_CATEGORIES = 10; // SETUP, UNIFORM, GLASSWARE, DISPOSALS, CONSUMABLE, SYRUP, BEVERAGE, ENTERTAINMENT, CARTS, OTHER — keep this in sync with the CATEGORIES list in apps/admin/src/components/category-breakdown-view.tsx if categories are ever added/removed there.

type StatCategory = {
  title: string;
  stats: Stat[];
};

function buildStats(data: DashboardMetrics): StatCategory[] {
  const allStats: Stat[] = [
    {
      id: "totalItems",
      label: "Total Items",
      value: data.totalItems,
      hint: "Across all categories",
      icon: Package,
      iconClass: "bg-sky-100 text-sky-700",
      barClass: "from-sky-400 to-sky-600",
    },
    {
      id: "itemsByCategory",
      label: "Item by Category",
      value: TOTAL_ITEM_CATEGORIES,
      hint: `${TOTAL_ITEM_CATEGORIES} categories to browse`,
      icon: Layers,
      iconClass: "bg-teal-100 text-teal-700",
      barClass: "from-teal-400 to-teal-600",
    },
    {
      id: "expiringItems",
      label: "Items to be Expired",
      value: data.expiringItems,
      hint: "Expiring in the next 30 days",
      icon: AlarmClock,
      iconClass: "bg-amber-100 text-amber-700",
      barClass: "from-amber-400 to-amber-600",
    },
    {
      id: "lowStockItems",
      label: "Low Stock",
      value: data.lowStockItems,
      hint: "Stock between 20% and 50%",
      icon: TrendingDown,
      iconClass: "bg-rose-100 text-rose-700",
      barClass: "from-rose-400 to-rose-600",
    },
    {
      id: "actionsNeeded",
      label: "Actions Needed",
      value: data.actionNeededItems,
      hint: "Stock under 20% or Out of Stock",
      icon: ClipboardCheck,
      iconClass: "bg-orange-100 text-orange-700",
      barClass: "from-orange-400 to-orange-600",
    },
    {
      id: "lostItems",
      label: "Lost and Damage",
      value: data.totalLostItems + data.totalDamagedItems,
      hint: "Reported across events",
      icon: PackageX,
      iconClass: "bg-red-100 text-red-700",
      barClass: "from-red-400 to-red-600",
    },
    {
      id: "totalEvents",
      label: "Total Events",
      value: data.totalEvents,
      hint: "All events scheduled",
      icon: CalendarDays,
      iconClass: "bg-violet-100 text-violet-700",
      barClass: "from-violet-400 to-violet-600",
    },
    {
      id: "openEvents",
      label: "Open Events",
      value: data.openEvents,
      hint: "Upcoming or ongoing",
      icon: CalendarCheck2,
      iconClass: "bg-emerald-100 text-emerald-700",
      barClass: "from-emerald-400 to-emerald-600",
    },
    {
      id: "complains",
      label: "Complaints",
      value: data.totalComplains,
      hint: "Reported issues",
      icon: MessageSquareWarning,
      iconClass: "bg-yellow-100 text-yellow-700",
      barClass: "from-yellow-400 to-yellow-600",
    },
  ];

  const inventoryIds = new Set([
    "totalItems",
    "itemsByCategory",
    "expiringItems",
    "lowStockItems",
    "actionsNeeded",
    "lostItems",
  ]);
  const eventIds = new Set(["totalEvents", "openEvents"]);
  const complainIds = new Set(["complains"]);

  const inventory = allStats.filter((s) => inventoryIds.has(s.id));
  const events = allStats.filter((s) => eventIds.has(s.id));
  const complaints = allStats.filter((s) => complainIds.has(s.id));

  return [
    { title: "Warehouse Inventory Dashboard", stats: inventory },
    { title: "Warehouse Events Dashboard", stats: events },
    { title: "Complaints", stats: complaints },
  ];
}

const placeholders: { label: string; hint: string; icon: LucideIcon }[] = [
  {
    label: "Loading list approve",
    hint: "Items pending approval",
    icon: Hourglass,
  },
  {
    label: "Loading list wait for approve",
    hint: "Awaiting final approval",
    icon: Loader2,
  },
  {
    label: "SM and SS",
    hint: "Site manager & site supervisor",
    icon: Users,
  },
];

function StatCard({ stat, onClick }: { stat: Stat; onClick?: () => void }) {
  const Icon = stat.icon;
  return (
    <Card onClick={onClick} className="glass-card-global group relative cursor-pointer overflow-hidden">
      <CardContent className="relative flex items-start justify-between gap-4 p-5">
        <div className="space-y-1.5">
          <p className="text-white-85 text-sm font-medium">
            {stat.label}
          </p>
          <p className="text-3xl font-bold tracking-tight tabular-nums text-white">
            {stat.value.toLocaleString()}
          </p>
          <p className="text-white-85 text-xs">{stat.hint}</p>
        </div>
        <span className="gold-icon-bg flex size-11 shrink-0 items-center justify-center rounded-xl">
          <Icon className="size-5" />
        </span>
      </CardContent>
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r opacity-70",
          stat.barClass,
        )}
      />
    </Card>
  );
}

function PlaceholderCard({
  label,
  hint,
  icon: Icon,
}: {
  label: string;
  hint: string;
  icon: LucideIcon;
}) {
  return (
    <Card className="glass-card-global relative overflow-hidden border-dashed">
      <CardContent className="flex items-center gap-4 p-5">
        <span className="gold-icon-bg flex size-11 shrink-0 items-center justify-center rounded-xl">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="truncate text-sm font-semibold text-white">
            {label}
          </p>
          <p className="text-white-85 truncate text-xs">{hint}</p>
        </div>
        <Badge
          variant="outline"
          className="shrink-0 border-dashed text-white-85"
        >
          Coming soon
        </Badge>
      </CardContent>
    </Card>
  );
}

function StatSkeleton() {
  return (
    <Card className="glass-card-global">
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div className="flex flex-col gap-2.5">
          <div className="h-3 w-28 animate-pulse rounded bg-white/15" />
          <div className="h-8 w-16 animate-pulse rounded bg-white/15" />
          <div className="h-3 w-36 animate-pulse rounded bg-white/15" />
        </div>
        <div className="size-11 animate-pulse rounded-xl bg-white/15" />
      </CardContent>
    </Card>
  );
}

export default function WarehouseDashboardPage() {
  const { token } = useAuth();
  const [activeView, setActiveView] = useState<string | null>(null);

  const { data, isPending, isError, refetch, isFetching } = useQuery({
    queryKey: ["warehouse-dashboard"],
    queryFn: () =>
      apiFetch<DashboardMetrics>("/api/warehouse/dashboard", { token }),
  });

  const stats = data ? buildStats(data) : [];

  return (
    <div className="flex flex-col gap-3">
      {!activeView ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-slate-600 text-sm">
            Live overview of Inventory and Events
          </p>
          {!isPending && !isError && data ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RotateCw className={cn(isFetching && "animate-spin")} />
              Refresh
            </Button>
          ) : null}
        </div>
      ) : null}

      {isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <StatSkeleton key={index} />
          ))}
        </div>
      ) : isError || !data ? (
        <Card className="glass-card-global">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <PackageX className="size-8 text-white/60" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-white">
                Unable to load dashboard metrics
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
      ) : activeView === "itemsByCategory" ? (
        <CategoryBreakdownView onBack={() => setActiveView(null)} />
      ) : activeView === "lostItems" ? (
        <LostAndDamageView onBack={() => setActiveView(null)} />
      ) : activeView ? (
        <DashboardListView
          viewId={activeView}
          onBack={() => setActiveView(null)}
        />
      ) : (
        <>
          {stats.map((category) => (
            <section key={category.title} className="space-y-4">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                {category.title}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {category.stats.map((stat) => (
                  <StatCard
                    key={stat.id}
                    stat={stat}
                    onClick={() => setActiveView(stat.id)}
                  />
                ))}
              </div>
            </section>
          ))}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {placeholders.map((placeholder) => (
              <PlaceholderCard key={placeholder.label} {...placeholder} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
