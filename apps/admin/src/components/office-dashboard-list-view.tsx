"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { DESIGNATION_LABELS } from "@/components/employee-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
          <Loader2 className="size-8 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">
            Unable to load data
          </p>
          <p className="text-sm text-muted-foreground">
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
        className="py-10 text-center text-muted-foreground"
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
  onBack,
}: {
  viewId: string;
  onBack: () => void;
}) {
  const { token } = useAuth();
  const config = VIEW_CONFIG[viewId];

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["office-dashboard-detail", viewId],
    queryFn: () =>
      apiFetch<EmployeeRow[]>(config.url, { token }),
    enabled: Boolean(config),
  });

  if (!config) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Office Dashboard
          </h2>
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft />
            Back to Dashboard
          </Button>
        </div>
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
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
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            {config.title}
          </h2>
          <p className="text-sm text-muted-foreground">
            Filtered list for the selected metric.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft />
          Back to Dashboard
        </Button>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>{config.title}</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <Table>
            <EmployeesTable
              employees={data ?? []}
              isPending={isPending}
              isError={isError}
              onRetry={refetch}
            />
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
