"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AnimatedDialog,
  AnimatedDialogContent,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/animated-dialog";
import { Input } from "@/components/ui/input";
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

type Holiday = {
  id: string;
  date: string;
  name: string;
  createdAt: string;
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const HOLIDAY_COLOR = "#8b5cf6";

function dateKeyFromParts(year: number, month: number, day: number): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${year}-${pad(month)}-${pad(day)}`;
}

function dateKeyFromTimestamp(value: string): string {
  const date = new Date(value);
  return dateKeyFromParts(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

function Field({
  label,
  error,
  className,
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export default function HolidaysPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const now = new Date();
  const [calendarMonth, setCalendarMonth] = useState(now.getMonth() + 1);
  const [calendarYear, setCalendarYear] = useState(now.getFullYear());

  const [dialogDate, setDialogDate] = useState<string | null>(null);
  const [dialogHolidayId, setDialogHolidayId] = useState<string | null>(null);
  const [dialogName, setDialogName] = useState("");
  const [dialogError, setDialogError] = useState<string | undefined>();

  const [deleteTarget, setDeleteTarget] = useState<Holiday | null>(null);

  const { data: holidays, isPending, isError, refetch } = useQuery({
    queryKey: ["office-holidays"],
    queryFn: () => apiFetch<Holiday[]>("/api/office/holidays", { token }),
  });

  const holidaysByDate = useMemo(() => {
    const map = new Map<string, Holiday>();
    for (const holiday of holidays ?? []) {
      map.set(dateKeyFromTimestamp(holiday.date), holiday);
    }
    return map;
  }, [holidays]);

  const createHoliday = useMutation({
    mutationFn: (payload: { date: string; name: string }) =>
      apiFetch<Holiday>("/api/office/holidays", {
        method: "POST",
        body: payload,
        token,
      }),
    onSuccess: () => {
      toast.success("Holiday added");
      queryClient.invalidateQueries({ queryKey: ["office-holidays"] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateHoliday = useMutation({
    mutationFn: (payload: { id: string; date: string; name: string }) =>
      apiFetch<Holiday>(`/api/office/holidays/${payload.id}`, {
        method: "PATCH",
        body: { date: payload.date, name: payload.name },
        token,
      }),
    onSuccess: () => {
      toast.success("Holiday updated");
      closeDialog();
      queryClient.invalidateQueries({ queryKey: ["office-holidays"] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteHoliday = useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/api/office/holidays/${id}`, {
        method: "DELETE",
        token,
      }),
    onSuccess: () => {
      toast.success("Holiday removed");
      closeDialog();
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["office-holidays"] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  function goToPreviousMonth() {
    setCalendarMonth((prevMonth) => {
      if (prevMonth === 1) {
        setCalendarYear((prevYear) => prevYear - 1);
        return 12;
      }
      return prevMonth - 1;
    });
  }

  function goToNextMonth() {
    setCalendarMonth((prevMonth) => {
      if (prevMonth === 12) {
        setCalendarYear((prevYear) => prevYear + 1);
        return 1;
      }
      return prevMonth + 1;
    });
  }

  function openDialogForDate(key: string) {
    const existing = holidaysByDate.get(key);
    setDialogDate(key);
    setDialogHolidayId(existing?.id ?? null);
    setDialogName(existing?.name ?? "");
    setDialogError(undefined);
  }

  function openDialogForHoliday(holiday: Holiday) {
    openDialogForDate(dateKeyFromTimestamp(holiday.date));
  }

  function closeDialog() {
    setDialogDate(null);
    setDialogHolidayId(null);
    setDialogName("");
    setDialogError(undefined);
  }

  function handleDialogSave() {
    if (!dialogDate) {
      return;
    }
    if (!dialogName.trim()) {
      setDialogError("Holiday name is required");
      return;
    }
    if (dialogHolidayId) {
      updateHoliday.mutate({
        id: dialogHolidayId,
        date: dialogDate,
        name: dialogName.trim(),
      });
    } else {
      createHoliday.mutate(
        { date: dialogDate, name: dialogName.trim() },
        { onSuccess: () => closeDialog() },
      );
    }
  }

  const calendarFirstDay = new Date(calendarYear, calendarMonth - 1, 1);
  const calendarLeadingBlanks = calendarFirstDay.getDay();
  const calendarDaysInMonth = new Date(calendarYear, calendarMonth, 0).getDate();
  const calendarTodayKey = dateKeyFromParts(
    now.getFullYear(),
    now.getMonth() + 1,
    now.getDate(),
  );
  const calendarMonthLabel = `${MONTH_NAMES[calendarMonth - 1]} ${calendarYear}`;
  const isEditingExisting = dialogHolidayId !== null;
  const dialogSaving = createHoliday.isPending || updateHoliday.isPending;

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Holidays
        </h1>
        <p className="text-white-85 text-sm">
          Manage system-wide holidays. Holidays are non-working days and are
          excluded from salary deductions. Past dates can be added or edited
          too — useful for backfilling holidays that were missed.
        </p>
      </div>

      <Card className="glass-card-global">
        <CardHeader className="border-b">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-white font-bold">Holiday Calendar</CardTitle>
              <CardDescription className="text-white-85">
                Click any date — past or future — to add or edit a holiday.
              </CardDescription>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={goToPreviousMonth}
                aria-label="Previous month"
              >
                <ChevronLeft />
              </Button>
              <span className="min-w-32 text-center text-sm font-semibold text-white">
                {calendarMonthLabel}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={goToNextMonth}
                aria-label="Next month"
              >
                <ChevronRight />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="mx-auto w-full max-w-xl">
            <div className="grid grid-cols-7 gap-1">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div
                  key={day}
                  className="py-1 text-center text-[11px] font-semibold uppercase tracking-wide text-white-85"
                >
                  {day}
                </div>
              ))}
              {Array.from({ length: calendarLeadingBlanks }).map((_, index) => (
                <div key={`blank-${index}`} />
              ))}
              {Array.from({ length: calendarDaysInMonth }).map((_, index) => {
                const day = index + 1;
                const key = dateKeyFromParts(calendarYear, calendarMonth, day);
                const holiday = holidaysByDate.get(key);
                const isSunday =
                  new Date(calendarYear, calendarMonth - 1, day).getDay() === 0;
                const isToday = key === calendarTodayKey;
                const label = new Date(
                  calendarYear,
                  calendarMonth - 1,
                  day,
                ).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                });
                const title = holiday
                  ? `${label} — Holiday (${holiday.name})`
                  : isSunday
                    ? `${label} — Sunday`
                    : `${label} — click to add a holiday`;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => openDialogForDate(key)}
                    title={title}
                    className={cn(
                      "relative flex aspect-square min-h-9 flex-col items-center justify-center gap-1 rounded-lg text-xs font-semibold transition-transform hover:scale-105",
                      holiday
                        ? "text-white shadow-sm"
                        : "bg-white/10 text-white-85",
                      isToday
                        ? "ring-2 ring-primary/40 ring-offset-1 ring-offset-background"
                        : "",
                    )}
                    style={holiday ? { backgroundColor: HOLIDAY_COLOR } : undefined}
                  >
                    <span className="text-sm font-bold leading-none">{day}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-white-85">
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: HOLIDAY_COLOR }}
              />
              Holiday
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-white-85">
              <span className="size-2.5 rounded-full bg-white-85/30" />
              No holiday — click to add
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card-global">
        <CardHeader className="border-b">
          <CardTitle className="text-white font-bold">All Holidays</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>
                  <div className="text-right">Actions</div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell colSpan={3}>
                      <div className="h-4 w-full animate-pulse rounded bg-white/15" />
                    </TableCell>
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={3} className="py-10 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <p className="text-sm font-medium text-white">
                        Unable to load holidays
                      </p>
                      <Button variant="outline" size="sm" onClick={() => refetch()}>
                        Try again
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (holidays ?? []).length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="py-10 text-center text-white-85"
                  >
                    No holidays added yet.
                  </TableCell>
                </TableRow>
              ) : (
                (holidays ?? []).map((holiday) => (
                  <TableRow key={holiday.id}>
                    <TableCell className="font-medium tabular-nums text-foreground">
                      {formatDate(holiday.date)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {holiday.name}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openDialogForHoliday(holiday)}
                          aria-label={`Edit ${holiday.name}`}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive hover:bg-destructive/10"
                          disabled={deleteHoliday.isPending}
                          onClick={() => setDeleteTarget(holiday)}
                          aria-label={`Remove ${holiday.name}`}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AnimatedDialog
        open={dialogDate !== null}
        onOpenChange={(open) => {
          if (!open) {
            closeDialog();
          }
        }}
      >
        <AnimatedDialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {isEditingExisting ? "Edit Holiday" : "Add Holiday"}
            </DialogTitle>
            <DialogDescription>
              {dialogDate
                ? new Date(`${dialogDate}T00:00:00`).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : ""}
            </DialogDescription>
          </DialogHeader>

          <Field label="Holiday Name" error={dialogError}>
            <Input
              value={dialogName}
              onChange={(event) => {
                setDialogName(event.target.value);
                setDialogError(undefined);
              }}
              placeholder="e.g. Diwali, Republic Day"
              aria-invalid={Boolean(dialogError)}
              autoFocus
            />
          </Field>

          <DialogFooter className="gap-2 sm:justify-between">
            {isEditingExisting ? (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:bg-destructive/10"
                disabled={deleteHoliday.isPending}
                onClick={() => {
                  const target = (holidays ?? []).find(
                    (holiday) => holiday.id === dialogHolidayId,
                  );
                  closeDialog();
                  if (target) {
                    setDeleteTarget(target);
                  }
                }}
              >
                <Trash2 />
                Remove
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <DialogClose render={<Button variant="outline" type="button" />}>
                Cancel
              </DialogClose>
              <Button
                type="button"
                onClick={handleDialogSave}
                disabled={dialogSaving}
              >
                {dialogSaving ? "Saving…" : isEditingExisting ? "Save Changes" : "Add Holiday"}
              </Button>
            </div>
          </DialogFooter>
          </AnimatedDialogContent>
        </AnimatedDialog>

      <AnimatedDialog
        open={deleteTarget !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setDeleteTarget(null);
          }
        }}
      >
        <AnimatedDialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Holiday</DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? `Are you sure you want to delete "${deleteTarget.name}" (${formatDate(deleteTarget.date)})?`
                : "Are you sure you want to delete this holiday?"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              variant="destructive"
              disabled={deleteHoliday.isPending}
              onClick={() => {
                if (deleteTarget) {
                  deleteHoliday.mutate(deleteTarget.id);
                }
              }}
            >
              {deleteHoliday.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </AnimatedDialogContent>
      </AnimatedDialog>
    </div>
  );
}