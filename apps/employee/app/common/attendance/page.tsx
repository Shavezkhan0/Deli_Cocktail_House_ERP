"use client";

import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CalendarCheck,
  CheckCircle2,
  Info,
  Loader2,
  MapPin,
  Satellite,
} from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { AppShell } from "@/components/layout/app-shell";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { calculateDistance } from "@/lib/geo";
import { formatDate, formatDateTime } from "@/lib/format";

type AttendanceStatus =
  | "PRESENT"
  | "ABSENT"
  | "HALF_DAY"
  | "SHORT_LEAVE"
  | "ON_LEAVE";

type AttendanceRecord = {
  id: string;
  date: string;
  status: AttendanceStatus;
  latitude?: number | null;
  longitude?: number | null;
  createdAt: string;
  updatedAt: string;
};

type AttendanceTodayResponse = {
  marked: boolean;
  attendance: AttendanceRecord | null;
};

type OfficeLocation = {
  latitude: number;
  longitude: number;
  radiusMeters: number;
};

type GeoCoords = {
  latitude: number;
  longitude: number;
  accuracy: number;
};

const STATUS_CONFIG: Record<
  AttendanceStatus,
  { label: string; badge: string; dot: string }
> = {
  PRESENT: { label: "Present", badge: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  ABSENT: { label: "Absent", badge: "bg-rose-100 text-rose-700", dot: "bg-rose-500" },
  HALF_DAY: { label: "Half Day", badge: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
  SHORT_LEAVE: { label: "Short Leave", badge: "bg-yellow-100 text-yellow-700", dot: "bg-yellow-500" },
  ON_LEAVE: { label: "On Leave", badge: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
};

const STATUS_ORDER: AttendanceStatus[] = [
  "PRESENT",
  "ABSENT",
  "HALF_DAY",
  "SHORT_LEAVE",
  "ON_LEAVE",
];

function dateKey(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatMeters(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(2)} km`;
}

function fireConfetti() {
  const colors = ["#6366f1", "#8b5cf6", "#22c55e", "#f59e0b", "#3b82f6"];
  confetti({ particleCount: 90, spread: 75, origin: { y: 0.6 }, colors });
  setTimeout(() => {
    confetti({ particleCount: 60, angle: 60, spread: 55, origin: { x: 0 }, colors });
    confetti({ particleCount: 60, angle: 120, spread: 55, origin: { x: 1 }, colors });
  }, 250);
}

function StatusBadge({ status }: { status: AttendanceStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
        config.badge,
      )}
    >
      <span className={cn("size-1.5 rounded-full", config.dot)} />
      {config.label}
    </span>
  );
}

function MapPreview({ position }: { position: GeoCoords }) {
  const delta = 0.002;
  const bbox = `${position.longitude - delta}%2C${position.latitude - delta / 2}%2C${position.longitude + delta}%2C${position.latitude + delta / 2}`;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${position.latitude}%2C${position.longitude}`;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-muted/20">
      <iframe
        title="Marked location on OpenStreetMap"
        src={src}
        className="h-56 w-full"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}

export default function AttendancePage() {
  const queryClient = useQueryClient();
  const submittingRef = useRef(false);

  const [geoState, setGeoState] = useState<"idle" | "acquiring" | "success" | "error">("idle");
  const [position, setPosition] = useState<GeoCoords | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  const todayQuery = useQuery({
    queryKey: ["attendance", "today"],
    queryFn: () =>
      apiFetch<AttendanceTodayResponse>("/api/employee/attendance/today"),
  });

  const historyQuery = useQuery({
    queryKey: ["attendance", "history"],
    queryFn: () => apiFetch<AttendanceRecord[]>("/api/employee/attendance/history"),
  });

  const officeQuery = useQuery({
    queryKey: ["attendance", "office"],
    queryFn: () => apiFetch<OfficeLocation | null>("/api/employee/attendance/office"),
  });

  const markMutation = useMutation({
    mutationFn: (coords: { latitude: number; longitude: number }) =>
      apiFetch<AttendanceRecord>("/api/employee/attendance/mark", {
        method: "POST",
        body: coords,
      }),
    onSuccess: () => {
      setGeoState("success");
      fireConfetti();
      toast.success("Attendance marked for today!");
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
    onError: (error) => {
      setGeoState("error");
      const message =
        error instanceof Error ? error.message : "Could not mark attendance";
      setGeoError(message);
      toast.error(message);
    },
    onSettled: () => {
      submittingRef.current = false;
    },
  });

  function handleMarkClick() {
    if (submittingRef.current) {
      return;
    }

    if (!navigator.geolocation) {
      setGeoState("error");
      setGeoError("Geolocation is not supported by this browser.");
      return;
    }

    setGeoState("acquiring");
    setGeoError(null);
    setPosition(null);
    submittingRef.current = true;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        navigator.geolocation.clearWatch(watchId);
        const coords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
        setPosition(coords);
        markMutation.mutate(coords);
      },
      (err) => {
        navigator.geolocation.clearWatch(watchId);
        submittingRef.current = false;
        setGeoState("error");
        const message =
          err.code === err.PERMISSION_DENIED
            ? "Location permission was denied. Allow location access and try again."
            : "Could not acquire your location. Try again.";
        setGeoError(message);
        toast.error(message);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }

  const isAcquiring = geoState === "acquiring" || markMutation.isPending;
  const marked = todayQuery.data?.marked === true;

  const markedPosition: GeoCoords | null = useMemo(() => {
    const record = todayQuery.data?.attendance;
    if (
      record &&
      record.latitude != null &&
      record.longitude != null
    ) {
      return {
        latitude: record.latitude,
        longitude: record.longitude,
        accuracy: 0,
      };
    }
    return position;
  }, [todayQuery.data?.attendance, position]);

  const distanceFromOffice = useMemo(() => {
    if (!markedPosition || !officeQuery.data) {
      return null;
    }
    return calculateDistance(
      markedPosition.latitude,
      markedPosition.longitude,
      officeQuery.data.latitude,
      officeQuery.data.longitude,
    );
  }, [markedPosition, officeQuery.data]);

  const days = useMemo(() => {
    const byKey = new Map<string, AttendanceRecord>(
      (historyQuery.data ?? []).map((record) => [
        dateKey(new Date(record.date)),
        record,
      ]),
    );
    const today = new Date();
    const todayKey = dateKey(today);
    const result: {
      date: Date;
      key: string;
      record: AttendanceRecord | null;
      isToday: boolean;
    }[] = [];

    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const key = dateKey(date);
      result.push({
        date,
        key,
        record: byKey.get(key) ?? null,
        isToday: key === todayKey,
      });
    }

    return result;
  }, [historyQuery.data]);

  let content: React.ReactNode;

  if (todayQuery.isPending || historyQuery.isPending) {
    content = (
      <div className="flex flex-col gap-6">
        <div className="h-72 animate-pulse rounded-xl bg-muted" />
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  } else if (todayQuery.isError || historyQuery.isError) {
    content = (
      <div className="flex flex-col items-center gap-3 rounded-xl bg-card py-12 text-center ring-1 ring-foreground/10">
        <AlertTriangle className="size-8 text-rose-500" />
        <p className="text-sm font-medium text-foreground">
          Could not load your attendance data.
        </p>
        <button
          type="button"
          onClick={() => {
            todayQuery.refetch();
            historyQuery.refetch();
            officeQuery.refetch();
          }}
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
        >
          Try again
        </button>
      </div>
    );
  } else {
    content = (
      <div className="flex flex-col gap-6">
        <section className="rounded-xl bg-card p-6 ring-1 ring-foreground/10 sm:p-8">
          {marked ? (
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex flex-col items-center gap-4 text-center">
                <span className="flex size-16 items-center justify-center rounded-full bg-emerald-100">
                  <CheckCircle2 className="size-9 text-emerald-600" />
                </span>
                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-foreground">
                    Attendance marked for today
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Marked on{" "}
                    {formatDateTime(
                      todayQuery.data?.attendance?.date ??
                        new Date().toISOString(),
                    )}
                  </p>
                </div>
                {todayQuery.data?.attendance ? (
                  <StatusBadge status={todayQuery.data.attendance.status} />
                ) : null}
              </div>

              {markedPosition ? (
                <div className="flex w-full flex-col gap-3 lg:max-w-sm">
                  <p className="text-xs font-medium text-muted-foreground">
                    Marked location
                  </p>
                  <MapPreview position={markedPosition} />
                  {distanceFromOffice !== null ? (
                    <p className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-xs">
                      <span className="text-muted-foreground">
                        Distance from office
                      </span>
                      <span className="font-semibold text-foreground">
                        {formatMeters(distanceFromOffice)}
                      </span>
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex flex-col items-center gap-5 text-center">
                <button
                  type="button"
                  onClick={handleMarkClick}
                  disabled={isAcquiring}
                  className={cn(
                    "group relative flex size-44 flex-col items-center justify-center gap-3 rounded-full bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600 text-white shadow-xl shadow-indigo-500/30 transition-all duration-200 disabled:opacity-90",
                    isAcquiring
                      ? "cursor-wait"
                      : "hover:scale-105 hover:shadow-2xl hover:shadow-indigo-500/40 active:scale-95",
                  )}
                >
                  {isAcquiring ? (
                    <>
                      <span className="absolute inset-0 animate-ping rounded-full bg-indigo-400/40" />
                      <span className="absolute -inset-3 animate-pulse rounded-full bg-indigo-400/20" />
                    </>
                  ) : null}
                  <span className="relative flex flex-col items-center gap-2">
                    {isAcquiring ? (
                      <Loader2 className="size-9 animate-spin" />
                    ) : (
                      <CalendarCheck className="size-9" />
                    )}
                    <span className="text-sm font-semibold">
                      {isAcquiring ? "Acquiring GPS…" : "Mark Attendance"}
                    </span>
                  </span>
                </button>

                {isAcquiring ? (
                  <div className="flex flex-col items-center gap-1">
                    <p className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Satellite className="size-3.5 animate-pulse text-indigo-500" />
                      {markMutation.isPending
                        ? "Validating your location…"
                        : "Locating your position…"}
                    </p>
                    {position ? (
                      <p className="font-mono text-xs text-muted-foreground">
                        {position.latitude.toFixed(6)},{" "}
                        {position.longitude.toFixed(6)}
                        {position.accuracy
                          ? ` · ±${Math.round(position.accuracy)}m`
                          : ""}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {geoError ? (
                  <div className="flex w-full items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-left text-sm text-rose-700">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                    <div>
                      <p className="font-medium">{geoError}</p>
                      <p className="mt-0.5 text-xs text-rose-600/80">
                        You can try again.
                      </p>
                    </div>
                  </div>
                ) : null}

                {officeQuery.data ? (
                  <p className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                    <MapPin className="size-3.5" />
                    Geofence: {formatMeters(officeQuery.data.radiusMeters)} around
                    office
                  </p>
                ) : null}

                {officeQuery.isSuccess && !officeQuery.data ? (
                  <p className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-700">
                    <Info className="size-3.5" />
                    Geo validation is disabled — attendance can be marked from
                    anywhere.
                  </p>
                ) : null}
              </div>

              {position ? (
                <div className="flex w-full flex-col gap-3 lg:max-w-sm">
                  <p className="text-xs font-medium text-muted-foreground">
                    Marked location
                  </p>
                  <MapPreview position={position} />
                  {distanceFromOffice !== null ? (
                    <p className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-xs">
                      <span className="text-muted-foreground">
                        Distance from office
                      </span>
                      <span className="font-semibold text-foreground">
                        {formatMeters(distanceFromOffice)}
                      </span>
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
          <div className="border-b border-border px-6 py-4">
            <h2 className="text-base font-semibold tracking-tight text-foreground">
              Attendance History
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Your last 30 days.
            </p>
          </div>

          {historyQuery.data && historyQuery.data.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-6 py-3.5 font-semibold">Date</th>
                    <th className="px-6 py-3.5 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {historyQuery.data.map((record) => (
                    <tr
                      key={record.id}
                      className="transition-colors hover:bg-muted/40"
                    >
                      <td className="px-6 py-4 font-medium text-foreground">
                        {formatDate(record.date)}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={record.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
              <p className="text-sm font-medium text-foreground">
                No attendance records yet
              </p>
              <p className="text-xs text-muted-foreground">
                Mark your attendance to see it here.
              </p>
            </div>
          )}
        </section>

        <section className="rounded-xl bg-card p-6 ring-1 ring-foreground/10">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-foreground">
                Last 30 Days
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                At a glance view of your attendance.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {STATUS_ORDER.map((status) => (
                <span
                  key={status}
                  className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground"
                >
                  <span
                    className={cn(
                      "size-2 rounded-full",
                      STATUS_CONFIG[status].dot,
                    )}
                  />
                  {STATUS_CONFIG[status].label}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-6 gap-2 md:grid-cols-10">
            {days.map((day) => (
              <div
                key={day.key}
                title={
                  day.record
                    ? `${formatDate(day.date.toISOString())}: ${STATUS_CONFIG[day.record.status].label}`
                    : formatDate(day.date.toISOString())
                }
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-lg border border-border p-2",
                  day.isToday && "ring-2 ring-primary/40",
                )}
              >
                <span className="text-[10px] font-medium uppercase text-muted-foreground">
                  {day.date.toLocaleDateString("en-GB", {
                    weekday: "short",
                  })}
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {day.date.getDate()}
                </span>
                {day.record ? (
                  <span
                    className={cn(
                      "size-2.5 rounded-full",
                      STATUS_CONFIG[day.record.status].dot,
                    )}
                  />
                ) : (
                  <span className="size-2.5 rounded-full border border-dashed border-border" />
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  return (
    <AppShell
      title="My Attendance"
      subtitle="Mark your daily attendance and track your record."
      icon={<CalendarCheck className="size-5" />}
    >
      {content}
    </AppShell>
  );
}
