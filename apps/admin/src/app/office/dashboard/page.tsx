"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarCheck2,
  CalendarClock,
  CalendarX2,
  Loader2,
  RotateCw,
  UserCheck,
  type LucideIcon,
} from "lucide-react";
import { OfficeDashboardListView } from "@/components/office-dashboard-list-view";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

type DashboardMetrics = {
  totalEmployees: number;
  activeEmployees: number;
  leftEmployees: number;
  presentToday: number;
  absentToday: number;
  onLeaveToday: number;
  ongoingEvents: number;
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

function buildStats(data: DashboardMetrics): Stat[] {
  return [
    {
      id: "activeEmployees",
      label: "Active Employees",
      value: data.activeEmployees,
      hint: "Currently working",
      icon: UserCheck,
      iconClass: "bg-emerald-100 text-emerald-700",
      barClass: "from-emerald-400 to-emerald-600",
    },
    {
      id: "presentToday",
      label: "Present Today",
      value: data.presentToday,
      hint: "Marked present for today",
      icon: CalendarCheck2,
      iconClass: "bg-teal-100 text-teal-700",
      barClass: "from-teal-400 to-teal-600",
    },
    {
      id: "absentToday",
      label: "Absent Today",
      value: data.absentToday,
      hint: "Marked absent for today",
      icon: CalendarX2,
      iconClass: "bg-rose-100 text-rose-700",
      barClass: "from-rose-400 to-rose-600",
    },
    {
      id: "onLeaveToday",
      label: "Employees on Leave",
      value: data.onLeaveToday,
      hint: "On approved leave today",
      icon: CalendarClock,
      iconClass: "bg-amber-100 text-amber-700",
      barClass: "from-amber-400 to-amber-600",
    },
  ];
}

function StatCard({ stat, onClick }: { stat: Stat; onClick: () => void }) {
  const Icon = stat.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className="group block w-full cursor-pointer rounded-2xl text-left outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
    >
      <Card className="overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:ring-2 hover:ring-primary/25">
        <CardContent className="relative flex items-start justify-between gap-4 p-5">
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-muted-foreground">
              {stat.label}
            </p>
            <p className="text-3xl font-bold tracking-tight tabular-nums text-foreground">
              {stat.value.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">{stat.hint}</p>
          </div>
          <span
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3",
              stat.iconClass,
            )}
          >
            <Icon className="size-5" />
          </span>
        </CardContent>
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r opacity-70 transition-opacity duration-300 group-hover:opacity-100",
            stat.barClass,
          )}
        />
      </Card>
    </button>
  );
}

function StatSkeleton() {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div className="flex flex-col gap-2.5">
          <div className="h-3 w-28 animate-pulse rounded bg-muted" />
          <div className="h-8 w-16 animate-pulse rounded bg-muted" />
          <div className="h-3 w-36 animate-pulse rounded bg-muted" />
        </div>
        <div className="size-11 animate-pulse rounded-xl bg-muted" />
      </CardContent>
    </Card>
  );
}

export default function OfficeDashboardPage() {
  const { token } = useAuth();
  const [activeView, setActiveView] = useState<string | null>(null);

  const { data, isPending, isError, refetch, isFetching } = useQuery({
    queryKey: ["office-dashboard"],
    queryFn: () => apiFetch<DashboardMetrics>("/api/office/dashboard", { token }),
  });

  const stats = data ? buildStats(data) : [];

  if (activeView) {
    return (
      <OfficeDashboardListView
        viewId={activeView}
        onBack={() => setActiveView(null)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Office Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Live overview of workforce and attendance. Click a card for details.
          </p>
        </div>
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

      {isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <StatSkeleton key={index} />
          ))}
        </div>
      ) : isError || !data ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Loader2 className="size-8 text-muted-foreground" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                Unable to load dashboard metrics
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
          {stats.map((stat) => (
            <StatCard
              key={stat.id}
              stat={stat}
              onClick={() => setActiveView(stat.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
