"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarX2, Info, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

  const [date, setDate] = useState("");
  const [name, setName] = useState("");
  const [errors, setErrors] = useState<{ date?: string; name?: string }>({});

  const { data: holidays, isPending, isError, refetch } = useQuery({
    queryKey: ["office-holidays"],
    queryFn: () => apiFetch<Holiday[]>("/api/office/holidays", { token }),
  });

  const createHoliday = useMutation({
    mutationFn: (payload: { date: string; name: string }) =>
      apiFetch<Holiday>("/api/office/holidays", {
        method: "POST",
        body: payload,
        token,
      }),
    onSuccess: () => {
      toast.success("Holiday added");
      setDate("");
      setName("");
      setErrors({});
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
      queryClient.invalidateQueries({ queryKey: ["office-holidays"] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: { date?: string; name?: string } = {};
    if (!date) {
      nextErrors.date = "Select a date";
    }
    if (!name.trim()) {
      nextErrors.name = "Holiday name is required";
    }
    setErrors(nextErrors);
    if (nextErrors.date || nextErrors.name) {
      return;
    }

    createHoliday.mutate({ date, name: name.trim() });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Holidays
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage system-wide holidays. Holidays are non-working days and are
          excluded from salary deductions.
        </p>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <CalendarX2 className="size-4 text-muted-foreground" />
            Add Holiday
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Date" error={errors.date}>
                <Input
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  aria-invalid={Boolean(errors.date)}
                />
              </Field>
              <Field label="Holiday Name" error={errors.name}>
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Diwali, Republic Day"
                  aria-invalid={Boolean(errors.name)}
                />
              </Field>
            </div>

            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Info className="size-3.5 shrink-0" />
              Employees are not penalised for absence on this date.
            </p>

            <div className="flex justify-end">
              <Button type="submit" disabled={createHoliday.isPending}>
                <Plus />
                {createHoliday.isPending ? "Adding…" : "Add Holiday"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>All Holidays</CardTitle>
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
                      <div className="h-4 w-full animate-pulse rounded bg-muted" />
                    </TableCell>
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={3} className="py-10 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <p className="text-sm font-medium text-foreground">
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
                    className="py-10 text-center text-muted-foreground"
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
                      <div className="flex justify-end">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive hover:bg-destructive/10"
                          disabled={deleteHoliday.isPending}
                          onClick={() => deleteHoliday.mutate(holiday.id)}
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
    </div>
  );
}
