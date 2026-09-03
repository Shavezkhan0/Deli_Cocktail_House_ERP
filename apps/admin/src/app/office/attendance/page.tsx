"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  createColumnHelper,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { Eye, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AnimatedDialog,
  AnimatedDialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/animated-dialog";
import { Input } from "@/components/ui/input";
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
import { DownloadButtons } from "@/components/download-buttons";
import {
  SalaryCalculation,
  type SalaryCalcData,
} from "@/components/salary-calculation";

type PaidLeaveBreakdown = {
  opening: number;
  grantedThisMonth: number;
  available: number;
  usedThisMonth: number;
  overageDays: number;
  closing: number;
};

type ShortLeaveBreakdown = {
  allowance: number;
  usedThisMonth: number;
  remaining: number;
  overageDays: number;
};

type AttendanceSummary = {
  id: string;
  employeeId: string;
  name: string;
  designation: string;
  baseSalary: number;
  daysInMonth: number;
  dailyWage: number;
  fullDays: number;
  halfDays: number;
  shortLeaves: number;
  onLeave: number;
  absent: number;
  paidLeave: PaidLeaveBreakdown;
  shortLeave: ShortLeaveBreakdown;
  holidayWork: {
    extraDays: number;
    entries: { date: string; status: string; credit: number }[];
  };
  eligibleForLeaves: boolean;
  eligibleFrom: string;
  deductionAmount: number;
  extraEarnings: number;
  extraExpenses: number;
  estimatedNetSalary: number;
};

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function formatSalary(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function AttendancePage() {
  const { token } = useAuth();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [selectedRow, setSelectedRow] = useState<AttendanceSummary | null>(null);

  const { data: summary, isPending, isError, refetch } = useQuery({
    queryKey: ["office-attendance-summary", month, year],
    queryFn: () =>
      apiFetch<AttendanceSummary[]>(
        `/api/office/attendance/summary?month=${month}&year=${year}`,
        { token },
      ),
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
      header: "Name",
      cell: (info) => (
        <span className="font-medium text-foreground">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor("fullDays", {
      header: () => <div className="text-center">Full Days</div>,
      cell: (info) => (
        <span className="block text-center tabular-nums">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor("halfDays", {
      header: () => <div className="text-center">Half Days</div>,
      cell: (info) => (
        <span className="block text-center tabular-nums">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor("shortLeaves", {
      header: () => <div className="text-center">Short Leaves</div>,
      cell: (info) => (
        <span className="block text-center tabular-nums">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor("absent", {
      header: () => <div className="text-center">Absent</div>,
      cell: (info) => (
        <span className="block text-center tabular-nums">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor("estimatedNetSalary", {
      header: () => <div className="text-right">Est. Net Salary</div>,
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
            onClick={() => setSelectedRow(info.row.original)}
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
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Attendance & Salary
          </h1>
          <p className="text-white-85 text-sm">
            Monthly attendance summary and net salary for all employees.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-white">Month</label>
            <Select
              value={String(month)}
              onValueChange={(value) =>
                setMonth(typeof value === "string" ? Number(value) : month)
              }
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTH_NAMES.map((monthName, index) => (
                  <SelectItem key={monthName} value={String(index + 1)}>
                    {monthName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-white">Year</label>
            <Input
              type="number"
              min={2000}
              className="w-28"
              value={String(year)}
              onChange={(event) =>
                setYear(Number(event.target.value) || now.getFullYear())
              }
            />
          </div>
          {!isPending && !isError && summary ? (
            <div className="flex flex-wrap items-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
              >
                <RotateCw />
                Refresh
              </Button>
              <DownloadButtons
                baseUrl={`/api/office/payroll/summary-pdf?month=${month}&year=${year}`}
                fileBase={`payroll-summary-${year}-${month}`}
                label="Summary"
              />
            </div>
          ) : null}
        </div>
      </div>

      <Card className="glass-card-global">
        <CardHeader className="border-b">
          <CardTitle className="text-white font-bold">Monthly Summary</CardTitle>
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
                      <div className="h-4 w-full animate-pulse rounded bg-white/15" />
                    </TableCell>
                  </TableRow>
                ))
              ) : isError || !summary ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="py-10 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <p className="text-sm font-medium text-white">
                        Unable to load attendance summary
                      </p>
                      <p className="text-white-85 text-sm">
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
                    className="py-10 text-center text-white-85"
                  >
                    No attendance records yet.
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedRow(row.original)}
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

      <AnimatedDialog
        open={selectedRow != null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setSelectedRow(null);
          }
        }}
      >
        <AnimatedDialogContent className="w-[calc(100vw-2rem)] max-h-[85vh] overflow-y-auto overflow-x-hidden sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Salary Details</DialogTitle>
            <DialogDescription>
              {selectedRow
                ? `${selectedRow.name} (${selectedRow.employeeId})`
                : ""}
            </DialogDescription>
          </DialogHeader>

          {selectedRow ? (
            <SalaryDetailsView row={selectedRow} month={month} year={year} />
          ) : null}
        </AnimatedDialogContent>
      </AnimatedDialog>
    </div>
  );
}

function SalaryDetailsView({
  row,
  month,
  year,
}: {
  row: AttendanceSummary;
  month: number;
  year: number;
}) {
  const data: SalaryCalcData = {
    month,
    year,
    baseSalary: row.baseSalary,
    daysInMonth: row.daysInMonth,
    dailyWage: row.dailyWage,
    attendance: {
      PRESENT: row.fullDays,
      HALF_DAY: row.halfDays,
      SHORT_LEAVE: row.shortLeaves,
      ON_LEAVE: row.onLeave,
      ABSENT: row.absent,
    },
    paidLeave: row.paidLeave,
    shortLeave: row.shortLeave,
    holidayWork: { extraDays: row.holidayWork.extraDays },
    extraExpenses: row.extraExpenses,
    deductionAmount: row.deductionAmount,
    extraEarnings: row.extraEarnings,
    finalAmount: row.estimatedNetSalary,
    eligibleForLeaves: row.eligibleForLeaves,
    eligibleFrom: row.eligibleFrom,
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">Base Salary</p>
          <p className="mt-1 text-base font-semibold tabular-nums text-foreground">
            {formatSalary(row.baseSalary)}
          </p>
        </div>
        <div className="rounded-lg border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">Daily Wage</p>
          <p className="mt-1 text-base font-semibold tabular-nums text-foreground">
            {formatSalary(row.dailyWage)}
          </p>
        </div>
        <div className="rounded-lg border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">Days in Month</p>
          <p className="mt-1 text-base font-semibold tabular-nums text-foreground">
            {row.daysInMonth}
          </p>
        </div>
        <div className="rounded-lg border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">Attendance</p>
          <p className="mt-1 text-sm tabular-nums text-foreground">
            {row.fullDays} full · {row.halfDays} half · {row.shortLeaves} short ·{" "}
            {row.onLeave} on leave · {row.absent} absent
          </p>
        </div>
      </div>

      <SalaryCalculation data={data} />

      <DownloadButtons
        baseUrl={`/api/office/employees/${row.id}/salary-slip?month=${month}&year=${year}`}
        fileBase={`slip-${row.employeeId}-${year}-${month}`}
        label="Slip"
      />
    </div>
  );
}

