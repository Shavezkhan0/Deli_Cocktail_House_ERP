"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { ArrowLeft as ArrowLeftIcon } from "@/components/animate-ui/icons/arrow-left";
import { DESIGNATION_LABELS } from "@/components/employee-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

type EmployeeRow = {
  id: string;
  employeeId: string;
  name: string;
  designation: string;
  todayCheckInTime?: string | null;
};

type ViewConfig = {
  title: string;
  url: string;
};

const VIEW_CONFIG: Record<string, ViewConfig> = {
  activeEmployees: {
    title: "Active Employees",
    url: "/api/office/employees?employeeStatus=ACTIVE",
  },
  presentToday: {
    title: "Present Today",
    url: "/api/office/employees?attendanceStatus=PRESENT",
  },
  absentToday: {
    title: "Absent Today",
    url: "/api/office/employees?attendanceStatus=ABSENT",
  },
  onLeaveToday: {
    title: "Employees on Leave",
    url: "/api/office/employees?attendanceStatus=ON_LEAVE",
  },
};

function formatDateLong(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function todayString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function LoadingRow({ colSpan }: { colSpan: number }) {
  return (
    <>
      {Array.from({ length: 6 }).map((_, index) => (
        <TableRow key={index}>
          <TableCell colSpan={colSpan}>
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

function ErrorRow({
  colSpan,
  onRetry,
}: {
  colSpan: number;
  onRetry: () => void;
}) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="py-10 text-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 text-white/60" />
          <p className="text-sm font-medium text-white">
            Unable to load data
          </p>
          <p className="text-white-85 text-sm">
            Make sure the API is running and try again.
          </p>
          <Button variant="outline" size="sm" onClick={onRetry}>
            Try again
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <TableRow>
      <TableCell
        colSpan={colSpan}
        className="py-10 text-center text-white-85"
      >
        {label}
      </TableCell>
    </TableRow>
  );
}

function EmployeesTable({
  employees,
  isPending,
  isError,
  onRetry,
}: {
  employees: EmployeeRow[];
  isPending: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  const colSpan = 4;
  return (
    <>
      <TableHeader>
        <TableRow>
          <TableHead>Employee ID</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Designation</TableHead>
          <TableHead>Check-in Time</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isPending ? (
          <LoadingRow colSpan={colSpan} />
        ) : isError ? (
          <ErrorRow colSpan={colSpan} onRetry={onRetry} />
        ) : employees.length === 0 ? (
          <EmptyRow colSpan={colSpan} label="No employees found." />
        ) : (
          employees.map((employee) => (
            <TableRow key={employee.id}>
              <TableCell className="font-medium">{employee.employeeId}</TableCell>
              <TableCell>{employee.name}</TableCell>
              <TableCell>
                {DESIGNATION_LABELS[employee.designation] ??
                  employee.designation}
              </TableCell>
              <TableCell>
                {employee.todayCheckInTime
                  ? new Date(employee.todayCheckInTime).toLocaleTimeString(
                      [],
                      { hour: "numeric", minute: "2-digit", hour12: true },
                    )
                  : "—"}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </>
  );
}

export function OfficeDashboardListView({
  viewId,
  date,
  onBack,
}: {
  viewId: string;
  date: string;
  onBack: () => void;
}) {
  const { token } = useAuth();
  const config = VIEW_CONFIG[viewId];

  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [date, viewId]);

  const dateUrlParam = `&date=${date}`;
  const isToday = date === todayString();

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["office-dashboard-detail", viewId, date],
    queryFn: () =>
      apiFetch<EmployeeRow[]>(`${config.url}${dateUrlParam}`, { token }),
    enabled: Boolean(config),
  });

  const allEmployees = data ?? [];
  const totalPages = Math.max(1, Math.ceil(allEmployees.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedEmployees = useMemo(
    () => allEmployees.slice((safePage - 1) * pageSize, safePage * pageSize),
    [allEmployees, safePage, pageSize],
  );

  const displayTitle = config
    ? isToday
      ? config.title
      : `${config.title} — ${formatDateLong(date)}`
    : "";

  if (!config) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold tracking-tight text-white">
            Office Dashboard
          </h2>
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeftIcon animateOnHover />
            Back to Dashboard
          </Button>
        </div>
        <Card className="glass-card-global">
          <CardContent className="py-10 text-center text-sm text-white-85">
            Unknown dashboard view: {viewId}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1.5">
          <h2 className="text-xl font-bold tracking-tight text-white">
            {displayTitle}
          </h2>
          <p className="text-white-85 text-sm">
            {isToday
              ? "Filtered list for the selected metric."
              : `Showing data for ${formatDateLong(date)}.`}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeftIcon animateOnHover />
          Back to Dashboard
        </Button>
      </div>

      <Card className="glass-card-global">
        <CardHeader className="border-b">
          <CardTitle className="text-white font-bold">{displayTitle}</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <Table>
            <EmployeesTable
              employees={paginatedEmployees}
              isPending={isPending}
              isError={isError}
              onRetry={refetch}
            />
          </Table>
          {allEmployees.length > 0 ? (
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
                  Showing {paginatedEmployees.length} of {allEmployees.length} employees
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
  );
}
