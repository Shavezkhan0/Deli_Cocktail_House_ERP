"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarCheck2,
  CalendarClock,
  CalendarX2,
  ChevronLeft,
  ChevronRight,
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

function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function todayString(): string {
  return toLocalDateString(new Date());
}

function shiftDate(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return toLocalDateString(date);
}

function formatDateLong(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

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

function buildStats(data: DashboardMetrics, isToday: boolean): Stat[] {
  const dayLabel = isToday ? "today" : "for the selected day";
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
      label: isToday ? "Present Today" : "Present — Selected Day",
      value: data.presentToday,
      hint: `Marked present ${dayLabel}`,
      icon: CalendarCheck2,
      iconClass: "bg-teal-100 text-teal-700",
      barClass: "from-teal-400 to-teal-600",
    },
    {
      id: "absentToday",
      label: isToday ? "Absent Today" : "Absent — Selected Day",
      value: data.absentToday,
      hint: `Marked absent ${dayLabel}`,
      icon: CalendarX2,
      iconClass: "bg-rose-100 text-rose-700",
      barClass: "from-rose-400 to-rose-600",
    },
    {
      id: "onLeaveToday",
      label: isToday ? "On Leave Today" : "On Leave — Selected Day",
      value: data.onLeaveToday,
      hint: `On approved leave ${dayLabel}`,
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
      <Card className="glass-card-global group relative overflow-hidden">
        <CardContent className="relative flex items-start justify-between gap-4 p-5">
          <div className="min-w-0 flex-1 space-y-1.5">
            <p className="truncate text-sm font-medium text-white-85">
              {stat.label}
            </p>
            <p className="text-3xl font-bold tracking-tight tabular-nums text-white">
              {stat.value.toLocaleString()}
            </p>
            <p className="truncate text-xs text-white-85">{stat.hint}</p>
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
    </button>
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

export default function OfficeDashboardPage() {
  const { token } = useAuth();
  const [activeView, setActiveView] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(todayString);

  const isToday = selectedDate === todayString();

  const { data, isPending, isError, refetch, isFetching } = useQuery({
    queryKey: ["office-dashboard", selectedDate],
    queryFn: () =>
      apiFetch<DashboardMetrics>(
        `/api/office/dashboard?date=${selectedDate}`,
        { token },
      ),
  });

  const stats = data ? buildStats(data, isToday) : [];

  if (activeView) {
    return (
      <OfficeDashboardListView
        viewId={activeView}
        date={selectedDate}
        onBack={() => setActiveView(null)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Office Dashboard
          </h1>
          <p className="text-slate-600 text-sm">
            {isToday
              ? "Live overview of workforce and attendance. Click a card for details."
              : `Attendance overview for ${formatDateLong(selectedDate)}. Click a card for details.`}
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

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="date"
          value={selectedDate}
          max={todayString()}
          onChange={(e) => {
            const v = e.target.value;
            if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
              setSelectedDate(v);
            }
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-600/25 [color-scheme:light]"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSelectedDate((d) => shiftDate(d, -1))}
        >
          <ChevronLeft className="size-4" />
          Previous Day
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={isToday}
          onClick={() => setSelectedDate((d) => shiftDate(d, 1))}
        >
          Next Day
          <ChevronRight className="size-4" />
        </Button>
        {!isToday ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedDate(todayString())}
          >
            Back to Today
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
        <Card className="glass-card-global">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Loader2 className="size-8 text-white/60" />
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
