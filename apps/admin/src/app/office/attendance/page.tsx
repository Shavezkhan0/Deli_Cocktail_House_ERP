"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  createColumnHelper,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { Eye, Loader2, RotateCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

type AttendanceSummary = {
  id: string;
  employeeId: string;
  name: string;
  baseSalary: number;
  totalWorkingDays: number;
  totalFullDays: number;
  totalHalfDays: number;
  totalShortLeaves: number;
  netSalary: number;
};

type EmployeeDetails = {
  id: string;
  employeeId: string;
  name: string;
  joiningDate: string;
  totalMonthsSinceJoining: number;
  leaveScore?: number | null;
};

function formatSalary(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function AttendancePage() {
  const { token } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: summary, isPending, isError, refetch } = useQuery({
    queryKey: ["office-attendance-summary"],
    queryFn: () => apiFetch<AttendanceSummary[]>("/api/office/attendance/summary", { token }),
  });

  const { data: details, isPending: detailsPending, isError: detailsError } = useQuery({
    queryKey: ["office-employee-details", selectedId],
    queryFn: () =>
      apiFetch<EmployeeDetails>(`/api/office/employees/${selectedId}/details`, {
        token,
      }),
    enabled: selectedId !== null,
  });

  const columnHelper = createColumnHelper<typeof features, AttendanceSummary>();
  const features = tableFeatures({});

  const columns = columnHelper.columns([
    columnHelper.accessor("employeeId", {
      header: "Employee ID",
      cell: (info) => (
        <span className="font-mono text-xs text-muted-foreground">
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor("name", {
      header: "Employee Name",
      cell: (info) => (
        <span className="font-medium text-foreground">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor("totalFullDays", {
      header: () => <div className="text-center">Full Days</div>,
      cell: (info) => (
        <span className="block text-center tabular-nums">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor("totalHalfDays", {
      header: () => <div className="text-center">Half Days</div>,
      cell: (info) => (
        <span className="block text-center tabular-nums">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor("totalShortLeaves", {
      header: () => <div className="text-center">Short Leaves</div>,
      cell: (info) => (
        <span className="block text-center tabular-nums">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor("netSalary", {
      header: () => <div className="text-right">Net Salary</div>,
      cell: (info) => (
        <span className="block text-right tabular-nums">
          {formatSalary(info.getValue())}
        </span>
      ),
    }),
    columnHelper.accessor("id", {
      header: () => <div className="text-right">Actions</div>,
      cell: (info) => (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedId(info.getValue())}
          >
            <Eye />
            View Details
          </Button>
        </div>
      ),
    }),
  ]);

  const table = useTable({
    features,
    columns,
    data: summary ?? [],
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Attendance & Salary
          </h1>
          <p className="text-sm text-muted-foreground">
            Monthly attendance summary and net salary for all employees.
          </p>
        </div>
        {!isPending && !isError && summary ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
          >
            <RotateCw />
            Refresh
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Monthly Summary</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : (
                        <table.FlexRender header={header} />
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isPending ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell colSpan={columns.length}>
                      <div className="h-4 w-full animate-pulse rounded bg-muted" />
                    </TableCell>
                  </TableRow>
                ))
              ) : isError || !summary ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="py-10 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <p className="text-sm font-medium text-foreground">
                        Unable to load attendance summary
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Make sure the API is running and try again.
                      </p>
                      <Button variant="outline" size="sm" onClick={() => refetch()}>
                        Try again
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : summary.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="py-10 text-center text-muted-foreground"
                  >
                    No attendance records yet.
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedId(row.original.id)}
                  >
                    {row.getAllCells().map((cell) => (
                      <TableCell key={cell.id}>
                        <table.FlexRender cell={cell} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={selectedId !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setSelectedId(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Employee Details</DialogTitle>
            <DialogDescription>
              {details
                ? `${details.name} (${details.employeeId})`
                : "Loading employee details…"}
            </DialogDescription>
          </DialogHeader>

          {detailsPending ? (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading details…
            </div>
          ) : detailsError || !details ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Unable to load employee details.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground">Join Date</p>
                  <p className="mt-1 text-base font-semibold tabular-nums text-foreground">
                    {formatDate(details.joiningDate)}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground">
                    Months Since Joining
                  </p>
                  <p className="mt-1 text-base font-semibold tabular-nums text-foreground">
                    {details.totalMonthsSinceJoining}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed p-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Leave Score</p>
                  <p className="text-xs text-muted-foreground">
                    Leave balance and score will appear here.
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="shrink-0 border-dashed text-muted-foreground"
                >
                  Coming soon
                </Badge>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
