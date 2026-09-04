"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CalendarCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Info,
  Loader2,
  LogIn,
  LogOut,
  MapPin,
  Satellite,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { AppShell } from "@/components/layout/app-shell";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { apiFetch, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { monthLabel } from "@/lib/format";
import { calculateDistance } from "@/lib/geo";
import { formatDate, formatTime } from "@/lib/format";

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
  checkInTime?: string | null;
  checkOutTime?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  createdAt: string;
  updatedAt: string;
  correctedByAdmin?: boolean;
  previousStatus?: AttendanceStatus | null;
  correctedAt?: string | null;
};

type MarkAttendanceResponse = {
  event: "check-in" | "check-out";
  attendance: AttendanceRecord;
};

type AttendanceTodayResponse = {
  marked: boolean;
  attendance: AttendanceRecord | null;
};

type AttendanceSummary = {
  PRESENT: number;
  ABSENT: number;
  HALF_DAY: number;
  SHORT_LEAVE: number;
  ON_LEAVE: number;
};

type AttendanceHistoryResponse = {
  records: AttendanceRecord[];
  summary: AttendanceSummary;
};

type LeaveBalanceData = {
  month: number;
  year: number;
  shortLeave?: {
    allowance: number;
    usedThisMonth: number;
    remaining: number;
  };
};

type Holiday = {
  id: string;
  date: string;
  name: string;
  createdAt: string;
};

type OfficeLocation = {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  locationName?: string;
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
  PRESENT: {
    label: "Present",
    badge: "border-emerald-400/30 bg-emerald-500/15 text-emerald-300",
    dot: "bg-emerald-400",
  },
  ABSENT: {
    label: "Absent",
    badge: "border-rose-400/30 bg-rose-500/15 text-rose-300",
    dot: "bg-rose-400",
  },
  HALF_DAY: {
    label: "Half Day",
    badge: "border-amber-400/30 bg-amber-500/15 text-amber-300",
    dot: "bg-amber-400",
  },
  SHORT_LEAVE: {
    label: "Short Leave",
    badge: "border-yellow-400/30 bg-yellow-500/15 text-yellow-300",
    dot: "bg-yellow-400",
  },
  ON_LEAVE: {
    label: "On Leave",
    badge: "border-blue-400/30 bg-blue-500/15 text-blue-300",
    dot: "bg-blue-400",
  },
};

const STATUS_ORDER: AttendanceStatus[] = [
  "PRESENT",
  "HALF_DAY",
  "SHORT_LEAVE",
  "ON_LEAVE",
  "ABSENT",
];

const STATUS_COLORS: Record<AttendanceStatus, string> = {
  PRESENT: "#10b981",
  ABSENT: "#f43f5e",
  HALF_DAY: "#f59e0b",
  SHORT_LEAVE: "#eab308",
  ON_LEAVE: "#3b82f6",
};

const HOLIDAY_COLOR = "#8b5cf6";

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

function formatElapsedMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
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
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide backdrop-blur-sm",
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
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
      <iframe
        title="Marked location on OpenStreetMap"
        src={src}
        className="h-52 w-full"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="glass-card-global flex flex-col items-center gap-5 p-8 sm:flex-row sm:items-start">
        <div className="size-36 animate-pulse rounded-full bg-white/10" />
        <div className="flex flex-1 flex-col gap-3">
          <div className="h-6 w-48 animate-pulse rounded-lg bg-white/10" />
          <div className="h-4 w-32 animate-pulse rounded bg-white/10" />
          <div className="h-4 w-64 animate-pulse rounded bg-white/10" />
        </div>
      </div>
      <div className="glass-card-global h-64 animate-pulse p-6" />
      <div className="glass-card-global h-48 animate-pulse p-6" />
    </div>
  );
}

export default function AttendancePage() {
  const queryClient = useQueryClient();
  const submittingRef = useRef(false);

  const [geoState, setGeoState] = useState<"idle" | "acquiring" | "success" | "error">("idle");
  const [position, setPosition] = useState<GeoCoords | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [locationBlocked, setLocationBlocked] = useState(false);
  const [historyMonth, setHistoryMonth] = useState(() => new Date().getMonth());
  const [historyYear, setHistoryYear] = useState(() => new Date().getFullYear());
  const [pageSize, setPageSize] = useState<number | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [pendingAction, setPendingAction] = useState<
    "check-in" | "check-out" | null
  >(null);

  useEffect(() => {
    setPageIndex(0);
  }, [pageSize, historyMonth, historyYear]);

  const todayQuery = useQuery({
    queryKey: ["attendance", "today"],
    queryFn: () =>
      apiFetch<AttendanceTodayResponse>("/api/employee/attendance/today"),
  });

  const historyQuery = useQuery({
    queryKey: ["attendance", "history", historyYear, historyMonth],
    queryFn: () =>
      apiFetch<AttendanceHistoryResponse>(
        `/api/employee/attendance/history?month=${historyMonth + 1}&year=${historyYear}`,
      ),
  });

  const holidaysQuery = useQuery({
    queryKey: ["attendance", "holidays", historyYear, historyMonth],
    queryFn: () =>
      apiFetch<Holiday[]>(
        `/api/employee/attendance/holidays?month=${historyMonth + 1}&year=${historyYear}`,
      ),
  });

  const officeQuery = useQuery({
    queryKey: ["attendance", "office"],
    queryFn: () => apiFetch<OfficeLocation | null>("/api/employee/attendance/office"),
  });

  const leaveBalanceQuery = useQuery({
    queryKey: ["attendance", "leave-balance", historyYear, historyMonth],
    queryFn: () =>
      apiFetch<LeaveBalanceData>(
        `/api/employee/salary/leave-balance?month=${historyMonth + 1}&year=${historyYear}`,
      ),
  });

  const markMutation = useMutation({
    mutationFn: (coords: { latitude: number; longitude: number }) =>
      apiFetch<MarkAttendanceResponse>("/api/employee/attendance/mark", {
        method: "POST",
        body: coords,
      }),
    onSuccess: (data) => {
      setGeoState("success");
      fireConfetti();
      toast.success(
        data.event === "check-in"
          ? "Checked in for today!"
          : "Checked out for today!",
      );
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
    onError: (error) => {
      setGeoState("error");
      if (error instanceof ApiError && error.code === "LOCATION_NOT_ALLOWED") {
        setLocationBlocked(true);
        return;
      }
      const message =
        error instanceof Error ? error.message : "Could not mark attendance";
      setGeoError(message);
      toast.error(message);
    },
    onSettled: () => {
      submittingRef.current = false;
    },
  });

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(timer);
  }, []);

  function handleMarkClick() {
    if (submittingRef.current) {
      return;
    }
    if (hasCheckedIn && !hasCheckedOut) {
      if (isCheckOutLocked) {
        toast.info(
          `You just checked in at ${todayRecord?.checkInTime ? formatTime(todayRecord.checkInTime) : "recently"}. Check-out is locked for 15 minutes to prevent accidental checkouts. Unlocks in ${checkoutUnlockMinutes} min.`,
        );
        return;
      }
    }
    setPendingAction(hasCheckedIn ? "check-out" : "check-in");
  }

  function confirmMarkAction() {
    if (submittingRef.current) {
      return;
    }
    setPendingAction(null);

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

  function goToPreviousMonth() {
    setHistoryMonth((prev) => {
      if (prev === 0) {
        setHistoryYear((year) => year - 1);
        return 11;
      }
      return prev - 1;
    });
  }

  function goToNextMonth() {
    setHistoryMonth((prev) => {
      if (prev === 11) {
        setHistoryYear((year) => year + 1);
        return 0;
      }
      return prev + 1;
    });
  }

  const historyMonthLabel = new Date(
    historyYear,
    historyMonth,
    1,
  ).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const historySummary: AttendanceSummary = historyQuery.data?.summary ?? {
    PRESENT: 0,
    ABSENT: 0,
    HALF_DAY: 0,
    SHORT_LEAVE: 0,
    ON_LEAVE: 0,
  };

  const historySummaryChips = [
    { label: "Present", value: historySummary.PRESENT, dot: "bg-emerald-400" },
    {
      label: "Leave",
      value: historySummary.ABSENT + historySummary.ON_LEAVE,
      dot: "bg-blue-400",
    },
    { label: "Half Day", value: historySummary.HALF_DAY, dot: "bg-amber-400" },
    {
      label: "Short Leave",
      value: historySummary.SHORT_LEAVE,
      dot: "bg-yellow-400",
    },
  ];

  const isAcquiring = geoState === "acquiring" || markMutation.isPending;
  const todayRecord = todayQuery.data?.attendance ?? null;
  const hasCheckedIn = !!todayRecord?.checkInTime;
  const hasCheckedOut = !!todayRecord?.checkOutTime;

  const checkInDate = todayRecord?.checkInTime ? new Date(todayRecord.checkInTime) : null;
  const minutesSinceCheckIn = checkInDate
    ? Math.floor((now.getTime() - checkInDate.getTime()) / (1000 * 60))
    : 999;
  const isCheckOutLocked = hasCheckedIn && !hasCheckedOut && minutesSinceCheckIn < 15;
  const checkoutUnlockMinutes = Math.max(1, 15 - minutesSinceCheckIn);

  const isPastCheckInWindow =
    now.getHours() * 60 + now.getMinutes() > 14 * 60 + 30;
  const isPastCheckOutTime =
    now.getHours() * 60 + now.getMinutes() >= 18 * 60 + 0;

  const monthRecordsByDate = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    const prefers = (a: AttendanceRecord, b: AttendanceRecord): boolean => {
      const aCheckin = a.checkInTime ? 1 : 0;
      const bCheckin = b.checkInTime ? 1 : 0;
      if (aCheckin !== bCheckin) return aCheckin > bCheckin;
      const aAdmin = a.correctedByAdmin ? 1 : 0;
      const bAdmin = b.correctedByAdmin ? 1 : 0;
      if (aAdmin !== bAdmin) return aAdmin > bAdmin;
      const aNotAbsent = a.status !== "ABSENT" ? 1 : 0;
      const bNotAbsent = b.status !== "ABSENT" ? 1 : 0;
      if (aNotAbsent !== bNotAbsent) return aNotAbsent > bNotAbsent;
      return false;
    };
    for (const record of historyQuery.data?.records ?? []) {
      const key = dateKey(new Date(record.date));
      const existing = map.get(key);
      if (!existing || prefers(record, existing)) {
        map.set(key, record);
      }
    }
    return map;
  }, [historyQuery.data]);

  const holidaysByDate = useMemo(() => {
    const map = new Map<string, Holiday>();
    for (const holiday of holidaysQuery.data ?? []) {
      map.set(dateKey(new Date(holiday.date)), holiday);
    }
    return map;
  }, [holidaysQuery.data]);

  const calendarLeadingBlanks = new Date(historyYear, historyMonth, 1).getDay();
  const calendarDaysInMonth = new Date(historyYear, historyMonth + 1, 0).getDate();
  const calendarTodayKey = dateKey(new Date());

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

  const allRecords = historyQuery.data?.records ?? [];
  const totalPages = pageSize === null ? 1 : Math.max(1, Math.ceil(allRecords.length / pageSize));
  const visibleRecords = useMemo(() => {
    if (pageSize === null) return allRecords;
    const start = pageIndex * pageSize;
    return allRecords.slice(start, start + pageSize);
  }, [allRecords, pageSize, pageIndex]);

  let content: React.ReactNode;

  if (todayQuery.isPending || historyQuery.isPending || holidaysQuery.isPending) {
    content = <ProfileSkeleton />;
  } else if (todayQuery.isError || historyQuery.isError || holidaysQuery.isError) {
    content = (
      <div className="glass-card-global flex flex-col items-center gap-4 py-16 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-red-500/15">
          <AlertTriangle className="size-7 text-red-400" />
        </div>
        <p className="text-base font-semibold text-white">
          Could not load your attendance data.
        </p>
        <p className="text-sm text-white/60">
          Something went wrong while fetching your records.
        </p>
        <button
          type="button"
          onClick={() => {
            todayQuery.refetch();
            historyQuery.refetch();
            holidaysQuery.refetch();
            officeQuery.refetch();
          }}
          className="mt-2 rounded-xl border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-white/15"
        >
          Try again
        </button>
      </div>
    );
  } else {
    content = (
      <div className="flex flex-col gap-6">
        {/* ─── Check-In / Check-Out Hero Card ─── */}
        <section className="glass-card-global p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-1 flex-col items-center gap-5 text-center">
              {/* Punch Button */}
              <button
                type="button"
                onClick={handleMarkClick}
                disabled={
                  isAcquiring ||
                  hasCheckedOut ||
                  isCheckOutLocked ||
                  (!hasCheckedIn && isPastCheckInWindow)
                }
                className={cn(
                  "group relative flex size-40 flex-col items-center justify-center gap-3 rounded-full text-primary-foreground shadow-xl transition-all duration-300 sm:size-44",
                  hasCheckedOut
                    ? "cursor-not-allowed bg-primary opacity-80 shadow-primary/20"
                    : isCheckOutLocked
                      ? "cursor-not-allowed bg-primary opacity-85 shadow-primary/20"
                      : "bg-primary shadow-primary/30 hover:shadow-primary/50",
                  !hasCheckedOut && !isCheckOutLocked && !isAcquiring
                    ? "hover:scale-105 active:scale-95"
                    : isAcquiring
                      ? "cursor-wait"
                      : "",
                )}
              >
                {isAcquiring ? (
                  <>
                    <span className="absolute inset-0 animate-ping rounded-full bg-primary/40" />
                    <span className="absolute -inset-4 animate-pulse rounded-full bg-primary/20" />
                  </>
                ) : null}
                <span className="relative flex flex-col items-center gap-2">
                  {isAcquiring ? (
                    <Loader2 className="size-9 animate-spin text-primary-foreground" />
                  ) : isCheckOutLocked ? (
                    <CheckCircle2 className="size-9 text-primary-foreground" />
                  ) : hasCheckedIn ? (
                    <LogOut className="size-9 text-primary-foreground" />
                  ) : (
                    <LogIn className="size-9 text-primary-foreground" />
                  )}
                  <span className="text-sm font-bold tracking-wide text-primary-foreground">
                    {isAcquiring
                      ? "Acquiring GPS..."
                      : hasCheckedOut
                        ? "Checked Out"
                        : isCheckOutLocked
                          ? "Checked In"
                          : hasCheckedIn
                            ? "Check Out"
                            : "Check In"}
                  </span>
                  {isCheckOutLocked ? (
                    <span className="flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-amber-300">
                      <Clock className="size-3" />
                      Unlocks in {checkoutUnlockMinutes}m
                    </span>
                  ) : null}
                </span>
              </button>

              {/* Checked-in live timer / timestamp */}
              {hasCheckedIn && !hasCheckedOut && !isAcquiring && todayRecord?.checkInTime ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2">
                    <span className="size-2 animate-pulse rounded-full bg-emerald-400" />
                    <span className="text-sm font-semibold text-white">
                      Elapsed: {formatElapsedMinutes(minutesSinceCheckIn)}
                    </span>
                  </div>
                  {isCheckOutLocked ? (
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">
                      <Clock className="size-3.5" />
                      Check-out is locked for 15 minutes after check-in.
                    </div>
                  ) : (
                    <p className="max-w-xs text-xs text-white/60">
                      {isPastCheckOutTime
                        ? "You're past checkout time — check out now to close today's attendance."
                        : "Check out after 6:00 PM for a full Present day — checking out earlier may mark today as Half Day or Short Leave."}
                    </p>
                  )}
                </div>
              ) : null}

              {hasCheckedIn && hasCheckedOut && !isAcquiring ? (
                <div className="flex flex-col items-center gap-1.5">
                  <p className="text-sm text-white/70">
                    Checked in at{" "}
                    <span className="font-bold text-white">
                      {todayRecord?.checkInTime ? formatTime(todayRecord.checkInTime) : "—"}
                    </span>
                  </p>
                  <p className="text-sm text-white/70">
                    Checked out at{" "}
                    <span className="font-bold text-white">
                      {todayRecord?.checkOutTime ? formatTime(todayRecord.checkOutTime) : "—"}
                    </span>
                  </p>
                </div>
              ) : null}

              {!hasCheckedIn && isPastCheckInWindow ? (
                <p className="max-w-xs text-xs text-white/50">
                  Attendance window closed for today. Check-in closes at 2:30 PM.
                </p>
              ) : null}

              {todayRecord ? (
                <StatusBadge status={todayRecord.status} />
              ) : null}

              {/* GPS acquiring status */}
              {isAcquiring ? (
                <div className="flex flex-col items-center gap-1.5">
                  <p className="inline-flex items-center gap-1.5 text-xs font-medium text-white/70">
                    <Satellite className="size-3.5 animate-pulse text-indigo-400" />
                    {markMutation.isPending
                      ? "Validating your location..."
                      : "Locating your position..."}
                  </p>
                  {position ? (
                    <p className="font-mono text-[11px] text-white/50">
                      {position.latitude.toFixed(6)},{" "}
                      {position.longitude.toFixed(6)}
                      {position.accuracy
                        ? ` +/-${Math.round(position.accuracy)}m`
                        : ""}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {/* Geo error */}
              {geoError ? (
                <div className="flex w-full max-w-sm items-start gap-2.5 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-left text-sm text-red-300">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <div>
                    <p className="font-medium">{geoError}</p>
                    <p className="mt-0.5 text-xs text-red-400/70">
                      You can try again.
                    </p>
                  </div>
                </div>
              ) : null}

              {/* Office location pill */}
              {officeQuery.data ? (
                <p className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
                  <MapPin className="size-3.5 shrink-0 text-sky-400" />
                  Check-in location:{" "}
                  <strong className="font-semibold text-white">
                    {officeQuery.data.locationName ?? "Office"}
                  </strong>
                  <span className="text-white/50">
                    (within {formatMeters(officeQuery.data.radiusMeters)})
                  </span>
                </p>
              ) : null}

              {officeQuery.isSuccess && !officeQuery.data ? (
                <p className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-xs text-amber-300">
                  <Info className="size-3.5" />
                  Geo validation is disabled — attendance can be marked from
                  anywhere.
                </p>
              ) : null}
            </div>

            {/* Map preview */}
            {markedPosition ? (
              <div className="flex w-full flex-col gap-3 lg:max-w-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-white/50">
                  Marked location
                </p>
                <MapPreview position={markedPosition} />
                {distanceFromOffice !== null ? (
                  <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
                    <span className="text-xs text-white/60">
                      Distance from{" "}
                      {officeQuery.data?.locationName ?? "office"}
                    </span>
                    <span className="rounded-full border border-sky-400/30 bg-sky-500/15 px-2.5 py-0.5 text-xs font-bold text-sky-300">
                      {formatMeters(distanceFromOffice)}
                    </span>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>

        {/* ─── Attendance Calendar Widget ─── */}
        <section className="glass-card-global overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4 sm:px-6">
            <div>
              <h2 className="text-lg font-bold text-white">
                Attendance Calendar
              </h2>
              <p className="mt-0.5 text-xs text-white/60">
                Your day-by-day attendance for the month.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goToPreviousMonth}
                disabled={historyQuery.isPending}
                aria-label="Previous month"
                className="flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-white/15 disabled:opacity-40"
              >
                <ChevronLeft className="size-3.5" />
                <span className="hidden sm:inline">Prev</span>
              </button>
              <span className="min-w-24 whitespace-nowrap rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-center text-sm font-bold text-white sm:min-w-36">
                {historyMonthLabel}
              </span>
              <button
                type="button"
                onClick={goToNextMonth}
                disabled={historyQuery.isPending}
                aria-label="Next month"
                className="flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-white/15 disabled:opacity-40"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="size-3.5" />
              </button>
            </div>
          </div>

          <div className="px-5 py-6 sm:px-6">
            <div className="mx-auto w-full max-w-xl">
              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-1.5">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div
                    key={day}
                    className="py-1.5 text-center text-[11px] font-bold uppercase tracking-widest text-white/40"
                  >
                    {day}
                  </div>
                ))}

                {/* Leading blanks */}
                {Array.from({ length: calendarLeadingBlanks }).map((_, index) => (
                  <div key={`blank-${index}`} />
                ))}

                {/* Day cells */}
                {Array.from({ length: calendarDaysInMonth }).map((_, index) => {
                  const day = index + 1;
                  const cellDate = new Date(historyYear, historyMonth, day);
                  const key = dateKey(cellDate);
                  const record = monthRecordsByDate.get(key);
                  const holiday = holidaysByDate.get(key);
                  const isSunday = cellDate.getDay() === 0;
                  const isHolidayCell = !record && (!!holiday || isSunday);
                  const isToday = key === calendarTodayKey;
                  const label = cellDate.toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  });
                  const title = record
                    ? `${label} — ${STATUS_CONFIG[record.status].label}${
                        record.correctedByAdmin
                          ? ` (corrected by admin, was ${
                              record.previousStatus
                                ? STATUS_CONFIG[record.previousStatus].label
                                : "no record"
                            })`
                          : ""
                      }`
                    : isHolidayCell
                      ? holiday
                        ? `${label} — Holiday (${holiday.name})`
                        : `${label} — Sunday`
                      : `${label} — No record`;

                  return (
                    <div
                      key={key}
                      title={title}
                      className={cn(
                        "relative flex aspect-square min-h-9 flex-col items-center justify-center gap-1 rounded-xl text-xs font-semibold transition-all duration-200 hover:scale-110",
                        record || isHolidayCell
                          ? "text-white shadow-sm"
                          : "border border-white/5 bg-white/5 text-white/30",
                        isToday
                          ? "ring-2 ring-sky-400/60 ring-offset-2 ring-offset-[#1e3a8a] shadow-lg shadow-sky-500/20"
                          : "",
                      )}
                      style={
                        record
                          ? { backgroundColor: STATUS_COLORS[record.status] }
                          : isHolidayCell
                            ? { backgroundColor: HOLIDAY_COLOR }
                            : undefined
                      }
                    >
                      <span className="text-sm font-bold leading-none">{day}</span>
                      {record?.correctedByAdmin ? (
                        <span className="absolute top-0.5 right-0.5 flex size-3.5 items-center justify-center rounded-full bg-amber-400 shadow-sm">
                          <ShieldCheck className="size-2 text-amber-900" />
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Status legend */}
            <div className="mt-6 flex flex-wrap items-center gap-2">
              {STATUS_ORDER.map((status) => (
                <span
                  key={status}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-white/70"
                >
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: STATUS_COLORS[status] }}
                  />
                  {STATUS_CONFIG[status].label}: {historySummary[status]}
                </span>
              ))}
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-white/70">
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: HOLIDAY_COLOR }}
                />
                Holiday
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-white/70">
                <ShieldCheck className="size-3 text-amber-400" />
                Corrected by admin
              </span>
            </div>
          </div>
        </section>

        {/* ─── Attendance History Table ─── */}
        <section className="glass-card-global overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4 sm:px-6">
            <div>
              <h2 className="text-lg font-bold text-white">
                Attendance History
              </h2>
              <p className="mt-0.5 text-xs text-white/60">
                Detailed records for {historyMonthLabel}.
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              {([10, 20, null] as const).map((size) => (
                <button
                  key={size === null ? "all" : size}
                  type="button"
                  onClick={() => setPageSize(size)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                    pageSize === size
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80",
                  )}
                >
                  {size === null ? "Full month" : String(size)}
                </button>
              ))}
            </div>
          </div>

          {/* Summary stat badges */}
          <div className="flex flex-wrap gap-2 border-b border-white/10 px-5 py-3 sm:px-6">
            {historySummaryChips.map((chip) => (
              <span
                key={chip.label}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/70"
              >
                <span className={cn("size-2 rounded-full", chip.dot)} />
                {chip.label}: {chip.value}
              </span>
            ))}
            {leaveBalanceQuery.isSuccess &&
            leaveBalanceQuery.data?.shortLeave &&
            leaveBalanceQuery.data.shortLeave.allowance > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-yellow-400/20 bg-yellow-500/10 px-3 py-1 text-xs font-semibold text-yellow-300">
                <span className="size-2 rounded-full bg-yellow-400" />
                Short leave remaining:{" "}
                {leaveBalanceQuery.data.shortLeave.remaining} /{" "}
                {leaveBalanceQuery.data.shortLeave.allowance} ({monthLabel(
                  historyMonth + 1,
                  historyYear,
                )})
              </span>
            ) : null}
          </div>

          {/* Table */}
          {historyQuery.data && allRecords.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wider text-white/60">
                      <th className="px-6 py-3.5 font-semibold">Date</th>
                      <th className="px-6 py-3.5 font-semibold">Check In</th>
                      <th className="px-6 py-3.5 font-semibold">Check Out</th>
                      <th className="px-6 py-3.5 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRecords.map((record) => (
                      <tr
                        key={record.id}
                        className="border-b border-white/5 transition-all duration-150 hover:bg-white/[0.06]"
                      >
                        <td className="px-6 py-4 font-medium text-white">
                          {formatDate(record.date)}
                        </td>
                        <td className="px-6 py-4 tabular-nums text-white/70">
                          {record.checkInTime ? formatTime(record.checkInTime) : "—"}
                        </td>
                        <td className="px-6 py-4 tabular-nums text-white/70">
                          {record.checkOutTime ? formatTime(record.checkOutTime) : "—"}
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={record.status} />
                          {record.correctedByAdmin ? (
                            <p className="mt-1 flex items-center gap-1 text-[11px] text-amber-400/80">
                              <ShieldCheck className="size-3" />
                              Admin corrected:{" "}
                              {record.previousStatus
                                ? STATUS_CONFIG[record.previousStatus].label
                                : "no record"}{" "}
                              → {STATUS_CONFIG[record.status].label}
                            </p>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {pageSize !== null && totalPages > 1 ? (
                <div className="flex items-center justify-center gap-4 border-t border-white/10 px-4 py-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                    disabled={pageIndex === 0}
                    className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                  >
                    <ChevronLeft className="size-4" />
                    Previous
                  </Button>
                  <span className="text-xs text-white/50">
                    Page {pageIndex + 1} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPageIndex((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={pageIndex >= totalPages - 1}
                    className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                  >
                    Next
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              ) : null}
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-white/5">
                <CalendarCheck className="size-6 text-white/30" />
              </div>
              <p className="text-sm font-semibold text-white/80">
                No attendance records for this month
              </p>
              <p className="text-xs text-white/40">
                Mark your attendance to see it here.
              </p>
            </div>
          )}
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

      <ConfirmDialog
        open={pendingAction !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingAction(null);
          }
        }}
        title={pendingAction === "check-out" ? "Check out now?" : "Check in now?"}
        description={
          pendingAction === "check-out" ? (
            <div className="flex flex-col gap-2">
              <span>
                Are you sure you want to <strong>Check Out</strong> now?
              </span>
              {!isPastCheckOutTime ? (
                <span className="rounded-md bg-amber-500/10 p-2.5 text-xs text-amber-700 dark:text-amber-300">
                  <strong>Early Check-Out Warning:</strong> Checking out before 6:00 PM may reduce today&apos;s attendance to <strong>Half Day</strong> or <strong>Short Leave</strong>.
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">
                  This will record your checkout time and close today&apos;s attendance.
                </span>
              )}
            </div>
          ) : (
            "Are you sure you want to Check In now? Your current location will be recorded for attendance."
          )
        }
        confirmLabel={pendingAction === "check-out" ? "Check Out" : "Check In"}
        confirmIcon={
          pendingAction === "check-out" ? (
            <LogOut className="size-4" />
          ) : (
            <LogIn className="size-4" />
          )
        }
        confirmDisabled={isAcquiring}
        onConfirm={confirmMarkAction}
      />

      <Dialog
        open={locationBlocked}
        onOpenChange={(open) => {
          if (!open) {
            setLocationBlocked(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Action Failed</DialogTitle>
            <DialogDescription>
              You are outside the allowed location radius for check-in/out.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>
              Close
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
