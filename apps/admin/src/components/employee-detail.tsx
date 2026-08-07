"use client";

import { useState, type ChangeEvent } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Banknote,
  CheckCircle2,
  Circle,
  FileText,
  Loader2,
  Pencil,
  RotateCw,
  Trash2,
  UploadCloud,
  User,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  DESIGNATION_LABELS,
  deleteDocument,
  uploadDocument,
} from "@/components/employee-form";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type Employee = {
  id: string;
  employeeId: string;
  name: string;
  contact?: string | null;
  emergencyContact?: string | null;
  designation: string;
  baseSalary: number;
  status: string;
  leavingDate: string | null;
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
  totalMonthsSinceJoining?: number;
};

type Salary = {
  id: string;
  employeeId: string;
  month: number;
  year: number;
  amount: number;
  status: string;
  paidDate: string | null;
  createdAt: string;
  updatedAt: string;
};

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

type DocKey = "aadharUrl" | "panCardUrl" | "offerLetterUrl" | "bondUrl";

const DOC_OPTIONS: { key: DocKey; label: string; docType: string }[] = [
  { key: "aadharUrl", label: "Aadhar", docType: "aadhar" },
  { key: "panCardUrl", label: "PAN Card", docType: "pan-card" },
  { key: "offerLetterUrl", label: "Offer Letter", docType: "offer-letter" },
  { key: "bondUrl", label: "Bond", docType: "bond" },
];

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

const BUCKET_PREFIX = "/storage/v1/object/public/employee-documents/";

function storagePathFromUrl(url: string): string {
  const index = url.indexOf(BUCKET_PREFIX);
  if (index === -1) {
    return "";
  }
  return url.slice(index + BUCKET_PREFIX.length);
}

type BankForm = {
  bankAccountNo: string;
  bankBranch: string;
  bankIfsc: string;
  bankOtherDetails: string;
};

type EditForm = {
  name: string;
  contact: string;
  baseSalary: string;
  status: string;
  leavingDate: string;
};

function toDateInputValue(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

export function EmployeeDetail({ employeeId }: { employeeId: string }) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"profile" | "bank" | "salary">(
    "profile",
  );
  const [uploading, setUploading] = useState<DocKey | null>(null);
  const [deleting, setDeleting] = useState<DocKey | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({
    name: "",
    contact: "",
    baseSalary: "",
    status: "ACTIVE",
    leavingDate: "",
  });

  const openEditModal = () => {
    if (!employee) {
      return;
    }
    setEditForm({
      name: employee.name,
      contact: employee.contact ?? "",
      baseSalary: String(employee.baseSalary),
      status: employee.status ?? "ACTIVE",
      leavingDate: employee.leavingDate
        ? toDateInputValue(employee.leavingDate)
        : "",
    });
    setEditOpen(true);
  };

  const editField = (field: keyof EditForm, value: string) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleEditSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editForm.name.trim()) {
      toast.error("Name is required");
      return;
    }
    const leavingDate =
      editForm.status === "LEFT" && editForm.leavingDate
        ? new Date(`${editForm.leavingDate}T00:00:00`).toISOString()
        : null;
    try {
      await updateEmployee.mutateAsync({
        name: editForm.name.trim(),
        contact: editForm.contact.trim() || null,
        baseSalary: Number(editForm.baseSalary),
        status: editForm.status,
        leavingDate,
      });
      setEditOpen(false);
    } catch {
      // Error is already surfaced by the mutation's onError handler.
    }
  };

  const employeeQuery = useQuery({
    queryKey: ["office-employee", employeeId],
    queryFn: () =>
      apiFetch<Employee>(`/api/office/employees/${employeeId}`, { token }),
  });

  const salariesQuery = useQuery({
    queryKey: ["office-employee-salaries", employeeId],
    queryFn: () =>
      apiFetch<Salary[]>(`/api/office/employees/${employeeId}/salaries`, {
        token,
      }),
  });

  const attendanceQuery = useQuery({
    queryKey: ["office-attendance-summary"],
    queryFn: () =>
      apiFetch<AttendanceSummary[]>("/api/office/attendance/summary", {
        token,
      }),
  });

  const updateEmployee = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiFetch<Employee>(`/api/office/employees/${employeeId}`, {
        method: "PUT",
        body: payload,
        token,
      }),
    onSuccess: () => {
      toast.success("Employee updated");
      queryClient.invalidateQueries({
        queryKey: ["office-employee", employeeId],
      });
      queryClient.invalidateQueries({ queryKey: ["office-employees"] });
      queryClient.invalidateQueries({ queryKey: ["office-dashboard"] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const saveSalary = useMutation({
    mutationFn: (payload: {
      month: number;
      year: number;
      amount: number;
      status: string;
    }) =>
      apiFetch<Salary>(`/api/office/employees/${employeeId}/salaries`, {
        method: "POST",
        body: payload,
        token,
      }),
    onSuccess: () => {
      toast.success("Salary updated");
      queryClient.invalidateQueries({
        queryKey: ["office-employee-salaries", employeeId],
      });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const employee = employeeQuery.data;
  const salaries = salariesQuery.data ?? [];
  const attendanceSummary = attendanceQuery.data;
  const currentMonthSummary = attendanceSummary?.find(
    (item) => item.id === employeeId,
  );

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const currentMonthSalary = salaries.find(
    (salary) =>
      salary.month === currentMonth && salary.year === currentYear,
  );

  const currentMonthEstimate =
    currentMonthSummary && currentMonthSummary.totalWorkingDays > 0
      ? currentMonthSummary.netSalary
      : (employee?.baseSalary ?? 0);

  const [bankForm, setBankForm] = useState<BankForm>({
    bankAccountNo: "",
    bankBranch: "",
    bankIfsc: "",
    bankOtherDetails: "",
  });

  function bankField(
    key: keyof BankForm,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    setBankForm((prev) => ({ ...prev, [key]: event.target.value }));
  }

  function openBankTab() {
    if (employee) {
      setBankForm({
        bankAccountNo: employee.bankAccountNo ?? "",
        bankBranch: employee.bankBranch ?? "",
        bankIfsc: employee.bankIfsc ?? "",
        bankOtherDetails: employee.bankOtherDetails ?? "",
      });
    }
    setActiveTab("bank");
  }

  function handleBankSave() {
    updateEmployee.mutate({
      bankAccountNo: bankForm.bankAccountNo.trim(),
      bankBranch: bankForm.bankBranch.trim(),
      bankIfsc: bankForm.bankIfsc.trim(),
      bankOtherDetails: bankForm.bankOtherDetails.trim(),
    });
  }

  async function handleDocumentUpload(
    doc: (typeof DOC_OPTIONS)[number],
    file?: File,
  ) {
    if (!file || !employee) {
      return;
    }
    setUploading(doc.key);
    try {
      const oldUrl = employee[doc.key];
      const oldPath = oldUrl ? storagePathFromUrl(oldUrl) : "";
      const url = await uploadDocument(file, doc.docType, token, {
        employeeId,
        oldPath,
      });
      await updateEmployee.mutateAsync({ [doc.key]: url });
      toast.success(`${doc.label} uploaded`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : `${doc.label} upload failed`,
      );
    } finally {
      setUploading(null);
    }
  }

  async function handleDocumentDelete(doc: (typeof DOC_OPTIONS)[number]) {
    if (!employee) {
      return;
    }
    const url = employee[doc.key];
    if (!url) {
      return;
    }
    const filePath = storagePathFromUrl(url);
    if (!filePath) {
      toast.error("Could not determine the file to delete");
      return;
    }
    setDeleting(doc.key);
    try {
      await deleteDocument(filePath, token);
      await updateEmployee.mutateAsync({ [doc.key]: null });
      toast.success(`${doc.label} deleted`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : `${doc.label} delete failed`,
      );
    } finally {
      setDeleting(null);
    }
  }

  function handleMarkPaid(salary: Salary) {
    saveSalary.mutate({
      month: salary.month,
      year: salary.year,
      amount: salary.amount,
      status: "PAID",
    });
  }

  function handleMarkCurrentMonthPaid() {
    saveSalary.mutate({
      month: currentMonth,
      year: currentYear,
      amount: currentMonthEstimate,
      status: "PAID",
    });
  }

  if (employeeQuery.isPending) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading employee details…
        </div>
      </div>
    );
  }

  if (employeeQuery.isError || !employee) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-sm font-medium text-foreground">
            Unable to load employee details
          </p>
          <p className="text-sm text-muted-foreground">
            Make sure the API is running and try again.
          </p>
          <Button variant="outline" size="sm" onClick={() => employeeQuery.refetch()}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  const tabs = [
    { key: "profile" as const, label: "Profile & Documents", icon: User },
    { key: "bank" as const, label: "Bank Details", icon: Wallet },
    { key: "salary" as const, label: "Salary Info", icon: Banknote },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href="/office/employees" />}
          >
            <ArrowLeft />
            Back
          </Button>
          <div className="space-y-0.5">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {employee.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {employee.employeeId} ·{" "}
              {DESIGNATION_LABELS[employee.designation] ?? employee.designation}
            </p>
          </div>
        </div>
        <div className="flex gap-1 rounded-xl border bg-card p-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  if (tab.key === "bank") {
                    openBankTab();
                  } else {
                    setActiveTab(tab.key);
                  }
                }}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === "profile" ? (
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div>
                <CardTitle>Employee Information</CardTitle>
                <CardDescription>
                  Basic details and joining information.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={openEditModal}
                className="shrink-0"
              >
                <Pencil />
                Edit Profile
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <InfoRow label="Employee ID" value={employee.employeeId} />
                <InfoRow label="Name" value={employee.name} />
                <InfoRow
                  label="Designation"
                  value={
                    DESIGNATION_LABELS[employee.designation] ??
                    employee.designation
                  }
                />
                <InfoRow
                  label="Status"
                  value={
                    employee.status === "LEFT" ? (
                      <Badge
                        variant="outline"
                        className="border-transparent bg-amber-100 text-amber-700"
                      >
                        <Circle />
                        Left Company
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-transparent bg-emerald-100 text-emerald-700"
                      >
                        <CheckCircle2 />
                        Active
                      </Badge>
                    )
                  }
                />
                <InfoRow label="Contact" value={employee.contact ?? "—"} />
                <InfoRow
                  label="Emergency Contact"
                  value={employee.emergencyContact ?? "—"}
                />
                <InfoRow
                  label="Joining Date"
                  value={formatDate(employee.joiningDate)}
                />
                <InfoRow
                  label="Leaving Date"
                  value={
                    employee.leavingDate
                      ? formatDate(employee.leavingDate)
                      : "—"
                  }
                />
                <InfoRow
                  label="Base Salary"
                  value={formatSalary(employee.baseSalary)}
                />
                <InfoRow
                  label="Months Since Joining"
                  value={employee.totalMonthsSinceJoining ?? "—"}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
              <CardDescription>
                Upload any missing documents (Aadhar, PAN, Offer Letter, Bond).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                {DOC_OPTIONS.map((doc) => {
                  const url = employee[doc.key];
                  const isUploading = uploading === doc.key;
                  const isDeleting = deleting === doc.key;
                  const busy = isUploading || isDeleting;
                  return (
                    <div
                      key={doc.key}
                      className="flex items-center justify-between gap-3 rounded-lg border p-3"
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <FileText className="size-4 shrink-0 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">
                          {doc.label}
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {url ? (
                          <Badge
                            variant="outline"
                            className="border-transparent bg-emerald-100 text-emerald-700"
                          >
                            <CheckCircle2 />
                            Uploaded
                          </Badge>
                        ) : null}
                        {url ? (
                          <Button
                            variant="ghost"
                            size="xs"
                            disabled={busy}
                            nativeButton={false}
                            render={
                              <Link href={url} target="_blank" rel="noreferrer" />
                            }
                          >
                            View
                          </Button>
                        ) : null}
                        {url ? (
                          <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-dashed px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground">
                            {isUploading ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <RotateCw className="size-3.5" />
                            )}
                            {isUploading ? "Uploading…" : "Re-upload"}
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png,.webp"
                              className="sr-only"
                              disabled={busy}
                              onChange={(event) =>
                                handleDocumentUpload(doc, event.target.files?.[0])
                              }
                            />
                          </label>
                        ) : (
                          <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-dashed px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground">
                            {isUploading ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <UploadCloud className="size-3.5" />
                            )}
                            {isUploading ? "Uploading…" : "Upload"}
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png,.webp"
                              className="sr-only"
                              disabled={busy}
                              onChange={(event) =>
                                handleDocumentUpload(doc, event.target.files?.[0])
                              }
                            />
                          </label>
                        )}
                        {url ? (
                          <Button
                            variant="ghost"
                            size="xs"
                            className="text-destructive hover:bg-destructive/10"
                            disabled={busy}
                            onClick={() => handleDocumentDelete(doc)}
                          >
                            {isDeleting ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="size-3.5" />
                            )}
                            {isDeleting ? "Deleting…" : "Delete"}
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {activeTab === "bank" ? (
        <Card>
          <CardHeader>
            <CardTitle>Bank Details</CardTitle>
            <CardDescription>
              Update the employee&apos;s bank account information.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">
                  Account No
                </label>
                <Input
                  value={bankForm.bankAccountNo}
                  onChange={(event) => bankField("bankAccountNo", event)}
                  placeholder="Bank account number"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">
                  Branch
                </label>
                <Input
                  value={bankForm.bankBranch}
                  onChange={(event) => bankField("bankBranch", event)}
                  placeholder="Bank branch"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">
                  IFSC Code
                </label>
                <Input
                  value={bankForm.bankIfsc}
                  onChange={(event) => bankField("bankIfsc", event)}
                  placeholder="e.g. HDFC0001234"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">
                  Other Bank Details
                </label>
                <Input
                  value={bankForm.bankOtherDetails}
                  onChange={(event) => bankField("bankOtherDetails", event)}
                  placeholder="Optional"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button
                onClick={handleBankSave}
                disabled={updateEmployee.isPending}
              >
                <Pencil />
                {updateEmployee.isPending ? "Saving…" : "Save Bank Details"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "salary" ? (
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Current Month Estimate</CardTitle>
              <CardDescription>
                Estimated salary for {MONTH_NAMES[currentMonth - 1]}{" "}
                {currentYear} based on attendance and base salary.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-3xl font-bold tracking-tight tabular-nums text-foreground">
                    {formatSalary(currentMonthEstimate)}
                  </p>
                  {currentMonthSummary ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {currentMonthSummary.totalFullDays} full days ·{" "}
                      {currentMonthSummary.totalHalfDays} half days ·{" "}
                      {currentMonthSummary.totalShortLeaves} short leaves
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Based on base salary of {formatSalary(employee.baseSalary)}
                    </p>
                  )}
                </div>
                {currentMonthSalary?.status === "PAID" ? (
                  <Badge
                    variant="outline"
                    className="border-transparent bg-emerald-100 text-emerald-700"
                  >
                    <CheckCircle2 />
                    Paid
                  </Badge>
                ) : (
                  <Button
                    onClick={handleMarkCurrentMonthPaid}
                    disabled={saveSalary.isPending}
                  >
                    <CheckCircle2 />
                    {saveSalary.isPending ? "Saving…" : "Mark as Paid"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle>Salary History</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {salariesQuery.isPending ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-10 w-full animate-pulse rounded bg-muted"
                    />
                  ))}
                </div>
              ) : salariesQuery.isError ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Unable to load salary records.
                </p>
              ) : salaries.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No salary records yet. Mark the current month as paid to get
                  started.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead>Year</TableHead>
                      <TableHead>
                        <div className="text-right">Amount</div>
                      </TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Paid Date</TableHead>
                      <TableHead>
                        <div className="text-right">Actions</div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salaries.map((salary) => {
                      const paid = salary.status === "PAID";
                      return (
                        <TableRow key={salary.id}>
                          <TableCell className="text-foreground">
                            {MONTH_NAMES[salary.month - 1]}
                          </TableCell>
                          <TableCell className="tabular-nums text-muted-foreground">
                            {salary.year}
                          </TableCell>
                          <TableCell>
                            <div className="text-right tabular-nums text-foreground">
                              {formatSalary(salary.amount)}
                            </div>
                          </TableCell>
                          <TableCell>
                            {paid ? (
                              <Badge
                                variant="outline"
                                className="border-transparent bg-emerald-100 text-emerald-700"
                              >
                                <CheckCircle2 />
                                PAID
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="border-transparent bg-amber-100 text-amber-700"
                              >
                                <Circle />
                                UNPAID
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {salary.paidDate
                              ? formatDate(salary.paidDate)
                              : "—"}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end">
                              {!paid ? (
                                <Button
                                  size="sm"
                                  onClick={() => handleMarkPaid(salary)}
                                  disabled={saveSalary.isPending}
                                >
                                  <CheckCircle2 />
                                  Mark Paid
                                </Button>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  Completed
                                </span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="flex max-h-[85vh] flex-col gap-4 p-4 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Update basic details, salary and employment status.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={handleEditSubmit}
            className="flex min-h-0 flex-1 flex-col gap-4"
          >
            <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto sm:grid-cols-2">
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-sm font-medium text-foreground">
                  Name
                </label>
                <Input
                  value={editForm.name}
                  onChange={(event) => editField("name", event.target.value)}
                  placeholder="Employee name"
                />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-sm font-medium text-foreground">
                  Contact
                </label>
                <Input
                  value={editForm.contact}
                  onChange={(event) => editField("contact", event.target.value)}
                  placeholder="Contact number"
                />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-sm font-medium text-foreground">
                  Base Salary
                </label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={editForm.baseSalary}
                  onChange={(event) =>
                    editField("baseSalary", event.target.value)
                  }
                  placeholder="Monthly base salary"
                />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-sm font-medium text-foreground">
                  Employment Status
                </label>
                <Select
                  value={editForm.status}
                  onValueChange={(value) =>
                    editField("status", typeof value === "string" ? value : "ACTIVE")
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="LEFT">Left Company</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editForm.status === "LEFT" ? (
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className="text-sm font-medium text-foreground">
                    Leaving Date
                  </label>
                  <Input
                    type="date"
                    value={editForm.leavingDate}
                    onChange={(event) =>
                      editField("leavingDate", event.target.value)
                    }
                  />
                </div>
              ) : null}
            </div>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" type="button" />}>
                Cancel
              </DialogClose>
              <Button type="submit" disabled={updateEmployee.isPending}>
                {updateEmployee.isPending ? "Saving…" : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
