"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  createColumnHelper,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { ArrowUpRight, Plus } from "lucide-react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  EmployeeForm,
  DESIGNATION_LABELS,
} from "@/components/employee-form";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Employee = {
  id: string;
  employeeId: string;
  name: string;
  email?: string | null;
  contact: string;
  emergencyContact?: string | null;
  designation: string;
  baseSalary: number;
  joiningDate: string;
  aadharUrl?: string | null;
  panCardUrl?: string | null;
  offerLetterUrl?: string | null;
  bondUrl?: string | null;
  bankAccountNo?: string | null;
  bankBranch?: string | null;
  bankIfsc?: string | null;
  bankOtherDetails?: string | null;
  createdAt: string;
  updatedAt: string;
};

function formatSalary(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function EmployeesPage() {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);

  const { data: employees, isPending, isError, refetch } = useQuery({
    queryKey: ["office-employees"],
    queryFn: () => apiFetch<Employee[]>("/api/office/employees", { token }),
  });

  const sortedEmployees = [...(employees ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const columnHelper = createColumnHelper<typeof features, Employee>();
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
        <Link
          href={`/office/employees/${info.row.original.id}`}
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          {info.getValue()}
        </Link>
      ),
    }),
    columnHelper.accessor("contact", {
      header: "Contact",
      cell: (info) => <span className="text-muted-foreground">{info.getValue()}</span>,
    }),
    columnHelper.accessor("email", {
      header: "Email",
      cell: (info) => (
        <span className="text-muted-foreground">
          {info.getValue() ?? "—"}
        </span>
      ),
    }),
    columnHelper.accessor("designation", {
      header: "Designation",
      cell: (info) => (
        <Badge variant="outline" className="border-transparent bg-sky-100 text-sky-700">
          {DESIGNATION_LABELS[info.getValue()] ?? info.getValue()}
        </Badge>
      ),
    }),
    columnHelper.accessor("baseSalary", {
      header: () => <div className="text-right">Salary</div>,
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
            nativeButton={false}
            render={
              <Link href={`/office/employees/${info.getValue()}`} />
            }
          >
            <ArrowUpRight />
            View
          </Button>
        </div>
      ),
    }),
  ]);

  const table = useTable({
    features,
    columns,
    data: sortedEmployees,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Employees
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your catering staff and roles.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button />}>
            <Plus />
            Add Employee
          </DialogTrigger>
          <DialogContent className="flex max-h-[85vh] flex-col gap-4 p-4 sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Employee</DialogTitle>
              <DialogDescription>
                Fill in the employee details, documents and bank information.
              </DialogDescription>
            </DialogHeader>
            {open ? (
              <EmployeeForm
                onSuccess={() => setOpen(false)}
                onCancel={() => setOpen(false)}
              />
            ) : null}
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>All Employees</CardTitle>
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
              ) : isError || !employees ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="py-10 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <p className="text-sm font-medium text-foreground">
                        Unable to load employees
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
              ) : employees.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="py-10 text-center text-muted-foreground"
                  >
                    No employees yet. Add your first employee.
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
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
    </div>
  );
}
