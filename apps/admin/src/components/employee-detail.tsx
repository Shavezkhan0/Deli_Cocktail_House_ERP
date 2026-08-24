"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Banknote,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  FileText,
  Loader2,
  Pencil,
  Plus,
  RotateCw,
  Trash2,
  TriangleAlert,
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
import { Textarea } from "@/components/ui/textarea";
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
  DESIGNATION_OPTIONS,
  deleteDocument,
  uploadDocument,
} from "@/components/employee-form";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";

type Employee = {
  id: string;
  employeeId: string;
  name: string;
  email?: string | null;
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

type WorkingOverride = {
  id: string;
  employeeId: string;
  date: string;
  type: "FORCE_WORK" | "FORCE_LEAVE";
  reason: string | null;
  createdAt: string;
};

type OverrideTypeValue = "FORCE_WORK" | "FORCE_LEAVE";

type AttendanceRecord = {
  id: string;
  employeeId: string;
  date: string;
  status: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  createdAt: string;
  correctedByAdmin?: boolean;
  previousStatus?: string | null;
  correctedAt?: string | null;
};

type Holiday = {
  id: string;
  date: string;
  name: string;
  createdAt: string;
};

type ApprovedExpense = {
  id: string;
  submittedBy: string;
  amount: number;
  description: string;
  date: string | null;
  createdAt: string;
};

type SalaryBreakdown = {
  employeeId: string;
  employeeNumber: string;
  employeeName: string;
  month: number;
  year: number;
  baseSalary: number;
  dailyWage: number;
  monthsSinceJoining: number;
  earnedLeaves: number;
  compensatoryLeaves: number;
  usedLeaves: number;
  availableLeaveBalance: number;
  attendance: {
    PRESENT: number;
    ABSENT: number;
    ON_LEAVE: number;
    HALF_DAY: number;
    SHORT_LEAVE: number;
    sundayAbsences: number;
    holidayAbsences: number;
    overriddenAbsences: number;
  };
  totalLeavesTaken: number;
  unpaidLeaves: number;
  deductionAmount: number;
  extraExpenses: number;
  extraExpenseEntries: {
    id: string;
    amount: number;
    description: string;
    date: string | null;
  }[];
  finalAmount: number;
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

const CHECK_IN_LATE_MINUTES = 10 * 60 + 45; // late if checked in after 10:45 AM
const CHECK_OUT_EARLY_MINUTES = 17 * 60 + 30; // early if checked out before 5:30 PM

function timeToMinutes(value: string | null): number {
  if (!value) {
    return -1;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return -1;
  }
  return date.getHours() * 60 + date.getMinutes();
}

const ATTENDANCE_STATUS_BADGES: Record<string, string> = {
  PRESENT: "bg-emerald-100 text-emerald-700",
  ABSENT: "bg-rose-100 text-rose-700",
  HALF_DAY: "bg-amber-100 text-amber-700",
  SHORT_LEAVE: "bg-yellow-100 text-yellow-700",
  ON_LEAVE: "bg-blue-100 text-blue-700",
};

const OVERRIDE_DOT_COLORS: Record<string, string> = {
  FORCE_WORK: "bg-indigo-500",
  FORCE_LEAVE: "bg-sky-500",
};

const ATTENDANCE_STATUS_COLORS: Record<string, string> = {
  PRESENT: "#10b981",
  ABSENT: "#f43f5e",
  HALF_DAY: "#f59e0b",
  SHORT_LEAVE: "#eab308",
  ON_LEAVE: "#3b82f6",
};

const HOLIDAY_COLOR = "#8b5cf6";

function dateKeyFromParts(year: number, month: number, day: number): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${year}-${pad(month)}-${pad(day)}`;
}

function dateKeyFromTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return dateKeyFromParts(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

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
  email: string;
  contact: string;
  emergencyContact: string;
  designation: string;
  joiningDate: string;
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

function SalaryBreakdownView({ breakdown }: { breakdown: SalaryBreakdown }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-primary/5 p-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground">
            Paid Leave Balance
          </p>
          <p className="mt-0.5 text-3xl font-bold tabular-nums text-primary">
            {breakdown.availableLeaveBalance}
          </p>
        </div>
        <p className="max-w-sm text-xs text-muted-foreground">
          Earned {breakdown.earnedLeaves} leaves ({breakdown.compensatoryLeaves}{" "}
          from working on Sundays/holidays) · Used {breakdown.usedLeaves}. Leaves
          taken beyond this balance are deducted at the daily wage
          ({formatSalary(breakdown.dailyWage)}/day).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-muted/30 p-4">
          <p className="text-xs text-muted-foreground">Base Salary</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
            {formatSalary(breakdown.baseSalary)}
          </p>
        </div>
        <div className="rounded-lg border bg-muted/30 p-4">
          <p className="text-xs text-muted-foreground">Leave Deduction</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-rose-600">
            − {formatSalary(breakdown.deductionAmount)}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {breakdown.unpaidLeaves} unpaid leaves
          </p>
        </div>
        <div className="rounded-lg border bg-muted/30 p-4">
          <p className="text-xs text-muted-foreground">Extra Expenses</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-emerald-600">
            + {formatSalary(breakdown.extraExpenses)}
          </p>
        </div>
        <div className="rounded-lg border border-primary/30 bg-primary/10 p-4">
          <p className="text-xs text-muted-foreground">Final Total</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-foreground">
            {formatSalary(breakdown.finalAmount)}
          </p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {breakdown.attendance.PRESENT} present · {breakdown.attendance.ABSENT}{" "}
        absent ({breakdown.attendance.sundayAbsences} on Sundays,{" "}
        {breakdown.attendance.holidayAbsences} on holidays,{" "}
        {breakdown.attendance.overriddenAbsences} overridden) ·{" "}
        {breakdown.attendance.ON_LEAVE} on leave ·{" "}
        {breakdown.attendance.HALF_DAY} half days ·{" "}
        {breakdown.attendance.SHORT_LEAVE} short leaves
      </p>
    </div>
  );
}

export function EmployeeDetail({ employeeId }: { employeeId: string }) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<
    "profile" | "bank" | "salary" | "attendance"
  >("profile");
  const [uploading, setUploading] = useState<DocKey | null>(null);
  const [deleting, setDeleting] = useState<DocKey | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({
    name: "",
    email: "",
    contact: "",
    emergencyContact: "",
    designation: "",
    joiningDate: "",
    baseSalary: "",
    status: "ACTIVE",
    leavingDate: "",
  });

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const [overrideDialogDate, setOverrideDialogDate] = useState<string | null>(
    null,
  );
  const [overrideType, setOverrideType] =
    useState<OverrideTypeValue>("FORCE_WORK");
  const [overrideDialogReason, setOverrideDialogReason] = useState("");

  const [attendanceStatusValue, setAttendanceStatusValue] = useState("");

  const [breakdownMonth, setBreakdownMonth] = useState(currentMonth);
  const [breakdownYear, setBreakdownYear] = useState(currentYear);

  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseDate, setExpenseDate] = useState("");

  const [attendanceMonth, setAttendanceMonth] = useState(currentMonth);
  const [attendanceYear, setAttendanceYear] = useState(currentYear);

  const openEditModal = () => {
    if (!employee) {
      return;
    }
    setEditForm({
      name: employee.name,
      email: employee.email ?? "",
      contact: employee.contact ?? "",
      emergencyContact: employee.emergencyContact ?? "",
      designation: employee.designation ?? "",
      joiningDate: employee.joiningDate
        ? toDateInputValue(employee.joiningDate)
        : "",
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
        email: editForm.email.trim() || null,
        contact: editForm.contact.trim() || null,
        emergencyContact: editForm.emergencyContact.trim() || null,
        designation: editForm.designation,
        baseSalary: Number(editForm.baseSalary),
        status: editForm.status,
        leavingDate,
        ...(editForm.joiningDate
          ? {
              joiningDate: new Date(
                `${editForm.joiningDate}T00:00:00`,
              ).toISOString(),
            }
          : {}),
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

  const workingOverridesQuery = useQuery({
    queryKey: ["office-working-overrides", employeeId],
    queryFn: () =>
      apiFetch<WorkingOverride[]>(
        `/api/office/employees/${employeeId}/working-overrides`,
        { token },
      ),
  });

  const holidaysQuery = useQuery({
    queryKey: ["office-holidays"],
    queryFn: () => apiFetch<Holiday[]>("/api/office/holidays", { token }),
  });

  const approvedExpensesQuery = useQuery({
    queryKey: ["office-approved-expenses", employeeId],
    queryFn: () =>
      apiFetch<ApprovedExpense[]>(
        `/api/office/employees/${employeeId}/expenses`,
        { token },
      ),
  });

  const attendanceHistoryQuery = useQuery({
    queryKey: [
      "office-employee-attendance",
      employeeId,
      attendanceMonth,
      attendanceYear,
    ],
    queryFn: () =>
      apiFetch<AttendanceRecord[]>(
        `/api/office/employees/${employeeId}/attendance?month=${attendanceMonth}&year=${attendanceYear}`,
        { token },
      ),
  });

  const salaryBreakdownQuery = useQuery({
    queryKey: [
      "office-salary-breakdown",
      employeeId,
      breakdownMonth,
      breakdownYear,
    ],
    queryFn: () =>
      apiFetch<SalaryBreakdown>(
        `/api/office/employees/${employeeId}/salary-breakdown?month=${breakdownMonth}&year=${breakdownYear}`,
        { token },
      ),
  });

  const currentSalaryBreakdownQuery = useQuery({
    queryKey: [
      "office-salary-breakdown-current",
      employeeId,
      currentMonth,
      currentYear,
    ],
    queryFn: () =>
      apiFetch<SalaryBreakdown>(
        `/api/office/employees/${employeeId}/salary-breakdown?month=${currentMonth}&year=${currentYear}`,
        { token },
      ),
  });

  const leaveBalanceQuery = useQuery({
    queryKey: [
      "office-leave-balance",
      employeeId,
      attendanceMonth,
      attendanceYear,
    ],
    queryFn: () =>
      apiFetch<SalaryBreakdown>(
        `/api/office/employees/${employeeId}/salary-breakdown?month=${attendanceMonth}&year=${attendanceYear}`,
        { token },
      ),
  });

  const saveOverride = useMutation({
    mutationFn: (payload: {
      date: string;
      type: OverrideTypeValue;
      reason?: string;
    }) =>
      apiFetch<WorkingOverride>(
        `/api/office/employees/${employeeId}/attendance-override`,
        { method: "POST", body: payload, token },
      ),
    onSuccess: () => {
      toast.success("Attendance override saved");
      setOverrideDialogDate(null);
      setOverrideDialogReason("");
      queryClient.invalidateQueries({
        queryKey: ["office-working-overrides", employeeId],
      });
      queryClient.invalidateQueries({
        queryKey: ["office-salary-breakdown"],
      });
      queryClient.invalidateQueries({
        queryKey: ["office-salary-breakdown-current"],
      });
      queryClient.invalidateQueries({
        queryKey: ["office-leave-balance"],
      });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteOverride = useMutation({
    mutationFn: (overrideId: string) =>
      apiFetch<void>(
        `/api/office/employees/${employeeId}/working-overrides/${overrideId}`,
        { method: "DELETE", token },
      ),
    onSuccess: () => {
      toast.success("Override removed");
      setOverrideDialogDate(null);
      setOverrideDialogReason("");
      queryClient.invalidateQueries({
        queryKey: ["office-working-overrides", employeeId],
      });
      queryClient.invalidateQueries({
        queryKey: ["office-salary-breakdown-current"],
      });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateAttendanceStatus = useMutation({
    mutationFn: (payload: { date: string; status: string }) =>
      apiFetch<AttendanceRecord>(
        `/api/office/employees/${employeeId}/attendance-status`,
        { method: "POST", body: payload, token },
      ),
    onSuccess: () => {
      toast.success("Attendance status updated");
      setOverrideDialogDate(null);
      setOverrideDialogReason("");
      setAttendanceStatusValue("");
      queryClient.invalidateQueries({
        queryKey: ["office-employee-attendance", employeeId],
      });
      queryClient.invalidateQueries({
        queryKey: ["office-salary-breakdown"],
      });
      queryClient.invalidateQueries({
        queryKey: ["office-salary-breakdown-current"],
      });
      queryClient.invalidateQueries({
        queryKey: ["office-leave-balance"],
      });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const createExpense = useMutation({
    mutationFn: (payload: {
      amount: number;
      description: string;
      date: string;
    }) =>
      apiFetch<ApprovedExpense>(
        `/api/office/employees/${employeeId}/expenses`,
        { method: "POST", body: payload, token },
      ),
    onSuccess: () => {
      toast.success("Extra expense added");
      setExpenseAmount("");
      setExpenseDescription("");
      setExpenseDate("");
      queryClient.invalidateQueries({
        queryKey: ["office-approved-expenses", employeeId],
      });
      queryClient.invalidateQueries({
        queryKey: ["office-salary-breakdown"],
      });
      queryClient.invalidateQueries({
        queryKey: ["office-salary-breakdown-current"],
      });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  function goToPreviousAttendanceMonth() {
    setAttendanceMonth((prevMonth) => {
      if (prevMonth === 1) {
        setAttendanceYear((prevYear) => prevYear - 1);
        return 12;
      }
      return prevMonth - 1;
    });
  }

  function goToNextAttendanceMonth() {
    setAttendanceMonth((prevMonth) => {
      if (prevMonth === 12) {
        setAttendanceYear((prevYear) => prevYear + 1);
        return 1;
      }
      return prevMonth + 1;
    });
  }

  function openOverrideDialog(date: string) {
    const existing = (workingOverridesQuery.data ?? []).find(
      (override) => dateKeyFromTimestamp(override.date) === date,
    );
    setOverrideType(existing?.type ?? "FORCE_WORK");
    setOverrideDialogReason(existing?.reason ?? "");
    setAttendanceStatusValue(attendanceRecordsByDate.get(date)?.status ?? "");
    setOverrideDialogDate(date);
  }

  function handleAttendanceStatusSave() {
    if (!overrideDialogDate || !attendanceStatusValue) {
      return;
    }
    updateAttendanceStatus.mutate({
      date: overrideDialogDate,
      status: attendanceStatusValue,
    });
  }

  function handleOverrideSave() {
    if (!overrideDialogDate) {
      return;
    }
    saveOverride.mutate({
      date: overrideDialogDate,
      type: overrideType,
      reason: overrideDialogReason.trim() || undefined,
    });
  }

  function handleExpenseSubmit(event: React.FormEvent) {
    event.preventDefault();
    const amount = Number(expenseAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (!expenseDescription.trim()) {
      toast.error("Description is required");
      return;
    }
    if (!expenseDate) {
      toast.error("Select a date");
      return;
    }
    createExpense.mutate({
      amount,
      description: expenseDescription.trim(),
      date: expenseDate,
    });
  }

  const employee = employeeQuery.data;
  const salaries = salariesQuery.data ?? [];

  const currentMonthSalary = salaries.find(
    (salary) =>
      salary.month === currentMonth && salary.year === currentYear,
  );

  const currentMonthEstimate =
    currentSalaryBreakdownQuery.data?.finalAmount ??
    (employee?.baseSalary ?? 0);

  const attendanceRecordsByDate = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    for (const record of attendanceHistoryQuery.data ?? []) {
      const key = dateKeyFromTimestamp(record.date);
      if (key) {
        map.set(key, record);
      }
    }
    return map;
  }, [attendanceHistoryQuery.data]);

  const overridesByDate = useMemo(() => {
    const map = new Map<string, WorkingOverride>();
    for (const override of workingOverridesQuery.data ?? []) {
      const key = dateKeyFromTimestamp(override.date);
      if (key) {
        map.set(key, override);
      }
    }
    return map;
  }, [workingOverridesQuery.data]);

  const holidaysByDate = useMemo(() => {
    const map = new Map<string, Holiday>();
    for (const holiday of holidaysQuery.data ?? []) {
      const key = dateKeyFromTimestamp(holiday.date);
      if (key) {
        map.set(key, holiday);
      }
    }
    return map;
  }, [holidaysQuery.data]);

  const historyRecords = attendanceHistoryQuery.data ?? [];
  const statPresentDays = historyRecords.filter(
    (record) => record.status === "PRESENT",
  ).length;
  const statHalfDays = historyRecords.filter(
    (record) => record.status === "HALF_DAY",
  ).length;
  const statShortLeaves = historyRecords.filter(
    (record) => record.status === "SHORT_LEAVE",
  ).length;
  const remainingPaidLeaves = leaveBalanceQuery.data?.availableLeaveBalance;

  const monthStatusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      PRESENT: 0,
      ABSENT: 0,
      HALF_DAY: 0,
      SHORT_LEAVE: 0,
      ON_LEAVE: 0,
    };
    for (const record of attendanceHistoryQuery.data ?? []) {
      counts[record.status] = (counts[record.status] ?? 0) + 1;
    }
    return counts;
  }, [attendanceHistoryQuery.data]);

  const calendarFirstDay = new Date(attendanceYear, attendanceMonth - 1, 1);
  const calendarLeadingBlanks = calendarFirstDay.getDay();
  const calendarDaysInMonth = new Date(
    attendanceYear,
    attendanceMonth,
    0,
  ).getDate();
  const calendarTodayKey = dateKeyFromParts(
    new Date().getFullYear(),
    new Date().getMonth() + 1,
    new Date().getDate(),
  );

  const selectedOverride =
    overrideDialogDate != null
      ? overridesByDate.get(overrideDialogDate)
      : undefined;

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
    { key: "attendance" as const, label: "Attendance", icon: CalendarPlus },
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
                  label="Email"
                  value={employee.email ?? "—"}
                />
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

      {activeTab === "attendance" ? (
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Total Present Days
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                  {attendanceHistoryQuery.isPending ? "…" : statPresentDays}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <p className="text-xs text-muted-foreground">Total Half Days</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                  {attendanceHistoryQuery.isPending ? "…" : statHalfDays}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Total Short Leaves
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                  {attendanceHistoryQuery.isPending ? "…" : statShortLeaves}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Remaining Paid Leave Balance
                </p>
                {leaveBalanceQuery.isPending ? (
                  <div className="mt-2 h-7 w-16 animate-pulse rounded bg-muted" />
                ) : (
                  <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                    {remainingPaidLeaves ?? "—"}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="border-b">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle>
                    <span className="inline-flex items-center gap-2">
                      <CalendarDays className="size-4 text-primary" />
                      Attendance Calendar
                    </span>
                  </CardTitle>
                  <CardDescription>
                    Click a date to assign work on a holiday (FORCE_WORK) or
                    grant a leave (FORCE_LEAVE). Ringed dates have overrides;
                    dots show attendance records.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-end gap-3">
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      onClick={goToPreviousAttendanceMonth}
                      aria-label="Previous month"
                    >
                      <ChevronLeft />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      onClick={goToNextAttendanceMonth}
                      aria-label="Next month"
                    >
                      <ChevronRight />
                    </Button>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-foreground">
                      Month
                    </label>
                    <Select
                      value={String(attendanceMonth)}
                      onValueChange={(value) =>
                        setAttendanceMonth(
                          typeof value === "string" ? Number(value) : attendanceMonth,
                        )
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
                    <label className="text-sm font-medium text-foreground">
                      Year
                    </label>
                    <Input
                      type="number"
                      min={2000}
                      className="w-28"
                      value={String(attendanceYear)}
                      onChange={(event) =>
                        setAttendanceYear(Number(event.target.value) || currentYear)
                      }
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="mx-auto w-full max-w-xl">
                <div className="grid grid-cols-7 gap-1">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                    <div
                      key={day}
                      className="py-1 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      {day}
                    </div>
                  ))}
                  {Array.from({ length: calendarLeadingBlanks }).map((_, index) => (
                    <div key={`blank-${index}`} />
                  ))}
                  {Array.from({ length: calendarDaysInMonth }).map((_, index) => {
                    const day = index + 1;
                    const key = dateKeyFromParts(
                      attendanceYear,
                      attendanceMonth,
                      day,
                    );
                    const record = attendanceRecordsByDate.get(key);
                    const override = overridesByDate.get(key);
                    const holiday = holidaysByDate.get(key);
                    const isSunday =
                      new Date(attendanceYear, attendanceMonth - 1, day).getDay() === 0;
                    const isHolidayCell = !record && (!!holiday || isSunday);
                    const isToday = key === calendarTodayKey;
                    const tooltip = override
                      ? `${formatDate(override.date)} — ${
                          override.type === "FORCE_WORK"
                            ? "Force work"
                            : "Force leave"
                        }${override.reason ? ` (${override.reason})` : ""}`
                      : record
                        ? `${formatDate(record.date)} — ${record.status.replace(
                            "_",
                            " ",
                          )}${
                            record.correctedByAdmin
                              ? ` (corrected by admin, was ${
                                  record.previousStatus
                                    ? record.previousStatus.replace("_", " ")
                                    : "no record"
                                })`
                              : ""
                          }`
                        : isHolidayCell
                          ? holiday
                            ? `Holiday — ${holiday.name}`
                            : "Sunday"
                          : "No override — click to assign";
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => openOverrideDialog(key)}
                        title={tooltip}
                        className={cn(
                          "relative flex aspect-square min-h-7 flex-col items-center justify-center gap-1 rounded-lg text-xs font-semibold transition-transform hover:scale-105",
                          record || isHolidayCell
                            ? "text-white shadow-sm"
                            : "bg-muted/60 text-muted-foreground",
                          override
                            ? "ring-2 ring-indigo-500/70 ring-offset-1 ring-offset-background"
                            : isToday
                              ? "ring-2 ring-primary/40 ring-offset-1 ring-offset-background"
                              : "",
                        )}
                        style={
                          record && ATTENDANCE_STATUS_COLORS[record.status]
                            ? { backgroundColor: ATTENDANCE_STATUS_COLORS[record.status] }
                            : isHolidayCell
                              ? { backgroundColor: HOLIDAY_COLOR }
                              : undefined
                        }
                      >
                        <span className="text-sm font-bold leading-none">
                          {day}
                        </span>
                        {override ? (
                          <span
                            className={cn(
                              "absolute top-1 right-1 size-1.5 rounded-full",
                              OVERRIDE_DOT_COLORS[override.type],
                            )}
                          />
                        ) : null}
                        {record?.correctedByAdmin ? (
                          <span className="absolute top-1 left-1 size-1.5 rounded-full bg-amber-400 ring-1 ring-white/70" />
                        ) : null}
                        <span
                          className={cn(
                            "size-1.5 rounded-full",
                            record || isHolidayCell
                              ? "bg-white/80"
                              : "bg-muted-foreground/30",
                          )}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
                <span className="text-xs font-medium text-muted-foreground">
                  Overrides:
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="size-2.5 rounded-full bg-indigo-500" />
                  Force Work
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="size-2.5 rounded-full bg-sky-500" />
                  Force Leave
                </span>
                <span className="ml-2 text-xs font-medium text-muted-foreground">
                  Attendance:
                </span>
                {(["PRESENT", "HALF_DAY", "SHORT_LEAVE", "ON_LEAVE", "ABSENT"] as const).map(
                  (status) => (
                    <span
                      key={status}
                      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
                    >
                      <span
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: ATTENDANCE_STATUS_COLORS[status] }}
                      />
                      {status.replace("_", " ")}:{" "}
                      {monthStatusCounts[status] ?? 0}
                    </span>
                  ),
                )}
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: HOLIDAY_COLOR }}
                  />
                  Holiday
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="size-2.5 rounded-full bg-amber-400" />
                  Corrected by admin
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle>Attendance History</CardTitle>
                  <CardDescription>
                    Daily check-in and check-out times. Red highlights mark a
                    late check-in (after 10:45 AM) or an early departure (before
                    5:30 PM).
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {attendanceHistoryQuery.isPending ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-10 w-full animate-pulse rounded bg-muted"
                    />
                  ))}
                </div>
              ) : attendanceHistoryQuery.isError ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Unable to load attendance history.
                </p>
              ) : (attendanceHistoryQuery.data ?? []).length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No attendance records for this month.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Check In</TableHead>
                        <TableHead>Check Out</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(attendanceHistoryQuery.data ?? []).map((record) => {
                        const checkInMinutes = timeToMinutes(record.checkInTime);
                        const checkOutMinutes = timeToMinutes(record.checkOutTime);
                        const isLateCheckIn =
                          checkInMinutes > CHECK_IN_LATE_MINUTES;
                        const isEarlyCheckOut =
                          checkOutMinutes >= 0 &&
                          checkOutMinutes < CHECK_OUT_EARLY_MINUTES;
                        return (
                          <TableRow key={record.id}>
                            <TableCell className="font-medium tabular-nums text-foreground">
                              {formatDate(record.date)}
                            </TableCell>
                            <TableCell>
                              {record.checkInTime ? (
                                <span
                                  className={cn(
                                    "inline-flex items-center gap-1.5 tabular-nums",
                                    isLateCheckIn
                                      ? "font-semibold text-rose-600"
                                      : "text-foreground",
                                  )}
                                >
                                  {formatTime(record.checkInTime)}
                                  {isLateCheckIn ? (
                                    <span title="Checked in late (after 10:45 AM)">
                                      <TriangleAlert
                                        className="size-3.5 shrink-0 text-rose-500"
                                        aria-label="Late check-in"
                                      />
                                    </span>
                                  ) : null}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {record.checkOutTime ? (
                                <span
                                  className={cn(
                                    "inline-flex items-center gap-1.5 tabular-nums",
                                    isEarlyCheckOut
                                      ? "font-semibold text-rose-600"
                                      : "text-foreground",
                                  )}
                                >
                                  {formatTime(record.checkOutTime)}
                                  {isEarlyCheckOut ? (
                                    <span title="Left early (before 5:30 PM)">
                                      <TriangleAlert
                                        className="size-3.5 shrink-0 text-rose-500"
                                        aria-label="Early check-out"
                                      />
                                    </span>
                                  ) : null}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={cn(
                                  ATTENDANCE_STATUS_BADGES[record.status] ??
                                    "bg-muted text-muted-foreground",
                                )}
                              >
                                {record.status.replace("_", " ")}
                              </Badge>
                              {record.correctedByAdmin ? (
                                <p className="mt-1 text-[11px] text-muted-foreground">
                                  Admin corrected:{" "}
                                  {record.previousStatus
                                    ? record.previousStatus.replace("_", " ")
                                    : "no record"}{" "}
                                  → {record.status.replace("_", " ")}
                                </p>
                              ) : null}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle>Assigned Dates</CardTitle>
              <CardDescription>
                All attendance overrides for this employee.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {workingOverridesQuery.isPending ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-10 w-full animate-pulse rounded bg-muted"
                    />
                  ))}
                </div>
              ) : workingOverridesQuery.isError ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Unable to load overrides.
                </p>
              ) : (workingOverridesQuery.data ?? []).length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No overrides assigned yet. Click a day on the calendar to add
                  one.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>
                        <div className="text-right">Actions</div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(workingOverridesQuery.data ?? []).map((override) => (
                      <TableRow key={override.id}>
                        <TableCell className="font-medium tabular-nums text-foreground">
                          {formatDate(override.date)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              override.type === "FORCE_WORK"
                                ? "bg-indigo-100 text-indigo-700"
                                : "bg-sky-100 text-sky-700",
                            )}
                          >
                            {override.type === "FORCE_WORK"
                              ? "Force Work"
                              : "Force Leave"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {override.reason ?? "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-destructive hover:bg-destructive/10"
                              disabled={deleteOverride.isPending}
                              onClick={() => deleteOverride.mutate(override.id)}
                              aria-label="Remove override"
                            >
                              <Trash2 />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Dialog
        open={overrideDialogDate !== null}
        onOpenChange={(open) => {
          if (!open) {
            setOverrideDialogDate(null);
            setOverrideDialogReason("");
            setAttendanceStatusValue("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Attendance Day</DialogTitle>
            <DialogDescription>
              {overrideDialogDate
                ? new Date(`${overrideDialogDate}T00:00:00`).toLocaleDateString(
                    "en-GB",
                    {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    },
                  )
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
              <label className="text-sm font-medium text-foreground">
                Attendance Status
              </label>
              <p className="text-xs text-muted-foreground">
                Correct this employee&apos;s recorded status for the day —
                e.g. change a mis-marked Absent to Present.
              </p>
              <div className="flex items-center gap-2">
                <Select
                  value={attendanceStatusValue}
                  onValueChange={(value) =>
                    setAttendanceStatusValue(value ?? "")
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="No record for this day" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PRESENT">Present</SelectItem>
                    <SelectItem value="ABSENT">Absent</SelectItem>
                    <SelectItem value="HALF_DAY">Half Day</SelectItem>
                    <SelectItem value="SHORT_LEAVE">Short Leave</SelectItem>
                    <SelectItem value="ON_LEAVE">On Leave</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  size="sm"
                  disabled={
                    updateAttendanceStatus.isPending || !attendanceStatusValue
                  }
                  onClick={handleAttendanceStatusSave}
                >
                  {updateAttendanceStatus.isPending ? "Saving…" : "Save Status"}
                </Button>
              </div>
            </div>
            <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
              <label className="text-sm font-medium text-foreground">
                Attendance Override
              </label>
              <p className="text-xs text-muted-foreground">
                Separately, assign this holiday/Sunday as a working day for
                this employee, or grant a leave.
              </p>
              <Select
                value={overrideType}
                onValueChange={(value) =>
                  setOverrideType(value as OverrideTypeValue)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FORCE_WORK">
                    Assign Work on Holiday
                  </SelectItem>
                  <SelectItem value="FORCE_LEAVE">Assign Leave</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">
                  Reason{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </label>
                <Textarea
                  value={overrideDialogReason}
                  onChange={(event) =>
                    setOverrideDialogReason(event.target.value)
                  }
                  placeholder="e.g. Compensating for last week"
                />
              </div>
              {selectedOverride ? (
                <p className="text-xs text-muted-foreground">
                  An override already exists for this date. Saving will
                  update it.
                </p>
              ) : null}
              <div className="flex items-center justify-end gap-2">
                {selectedOverride ? (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={deleteOverride.isPending}
                    onClick={() => deleteOverride.mutate(selectedOverride.id)}
                  >
                    <Trash2 />
                    Remove
                  </Button>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  disabled={saveOverride.isPending}
                  onClick={handleOverrideSave}
                >
                  {saveOverride.isPending
                    ? "Saving…"
                    : selectedOverride
                      ? "Update Override"
                      : "Save Override"}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>
              Cancel
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <CardHeader className="border-b">
              <CardTitle>Salary Breakdown</CardTitle>
              <CardDescription>
                Automatic calculation using the 30-day rule and the paid leave
                balance.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="mb-4 flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-foreground">
                    Month
                  </label>
                  <Select
                    value={String(breakdownMonth)}
                    onValueChange={(value) =>
                      setBreakdownMonth(
                        typeof value === "string" ? Number(value) : breakdownMonth,
                      )
                    }
                  >
                    <SelectTrigger className="w-40">
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
                  <label className="text-sm font-medium text-foreground">
                    Year
                  </label>
                  <Input
                    type="number"
                    min={2000}
                    className="w-28"
                    value={String(breakdownYear)}
                    onChange={(event) =>
                      setBreakdownYear(Number(event.target.value) || currentYear)
                    }
                  />
                </div>
              </div>

              {salaryBreakdownQuery.isPending ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-20 w-full animate-pulse rounded-lg bg-muted"
                    />
                  ))}
                </div>
              ) : salaryBreakdownQuery.isError ||
                !salaryBreakdownQuery.data ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Unable to load the salary breakdown.
                </p>
              ) : (
                <SalaryBreakdownView breakdown={salaryBreakdownQuery.data} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle>Extra Expenses</CardTitle>
              <CardDescription>
                Approved expenses are added to the employee&apos;s salary for the
                month of the selected date.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <form
                onSubmit={handleExpenseSubmit}
                className="flex flex-col gap-4"
              >
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-foreground">
                      Amount
                    </label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={expenseAmount}
                      onChange={(event) => setExpenseAmount(event.target.value)}
                      placeholder="e.g. 500"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-foreground">
                      Description
                    </label>
                    <Input
                      value={expenseDescription}
                      onChange={(event) =>
                        setExpenseDescription(event.target.value)
                      }
                      placeholder="e.g. Transport for event"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-foreground">
                      Date
                    </label>
                    <Input
                      type="date"
                      value={expenseDate}
                      onChange={(event) => setExpenseDate(event.target.value)}
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={createExpense.isPending}>
                    <Plus />
                    {createExpense.isPending ? "Adding…" : "Add Expense"}
                  </Button>
                </div>
              </form>

              <div className="mt-6">
                {approvedExpensesQuery.isPending ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div
                        key={index}
                        className="h-10 w-full animate-pulse rounded bg-muted"
                      />
                    ))}
                  </div>
                ) : approvedExpensesQuery.isError ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    Unable to load expenses.
                  </p>
                ) : (approvedExpensesQuery.data ?? []).length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    No extra expenses added yet.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>
                          <div className="text-right">Amount</div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(approvedExpensesQuery.data ?? []).map((expense) => (
                        <TableRow key={expense.id}>
                          <TableCell className="font-medium tabular-nums text-foreground">
                            {expense.date ? formatDate(expense.date) : "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {expense.description}
                          </TableCell>
                          <TableCell>
                            <div className="text-right tabular-nums text-foreground">
                              {formatSalary(expense.amount)}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                {currentMonthSalary ? "Current Month Salary" : "Current Month Estimate"}
              </CardTitle>
              <CardDescription>
                {currentMonthSalary
                  ? `Published salary for ${MONTH_NAMES[currentMonth - 1]} ${currentYear}.`
                  : `Estimated salary for ${MONTH_NAMES[currentMonth - 1]} ${currentYear} using the 30-day rule, paid leave balance and approved expenses.`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-3xl font-bold tracking-tight tabular-nums text-foreground">
                    {formatSalary(
                      currentMonthSalary
                        ? currentMonthSalary.amount
                        : currentMonthEstimate,
                    )}
                  </p>
                  {currentMonthSalary ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {currentMonthSalary.status === "PAID"
                        ? currentMonthSalary.paidDate
                          ? `Paid on ${formatDate(currentMonthSalary.paidDate)}`
                          : "Paid"
                        : "Published, payment pending"}
                    </p>
                  ) : currentSalaryBreakdownQuery.isPending ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Calculating from attendance…
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {currentSalaryBreakdownQuery.data?.attendance.ABSENT ?? 0}{" "}
                      absent ·{" "}
                      {currentSalaryBreakdownQuery.data?.unpaidLeaves ?? 0} unpaid
                      leaves ·{" "}
                      {formatSalary(
                        currentSalaryBreakdownQuery.data?.extraExpenses ?? 0,
                      )}{" "}
                      expenses
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
                    disabled={saveSalary.isPending || currentSalaryBreakdownQuery.isPending}
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
                  Email
                </label>
                <Input
                  type="email"
                  value={editForm.email}
                  onChange={(event) => editField("email", event.target.value)}
                  placeholder="e.g. rahul@example.com"
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
                  Emergency Contact
                </label>
                <Input
                  value={editForm.emergencyContact}
                  onChange={(event) =>
                    editField("emergencyContact", event.target.value)
                  }
                  placeholder="Emergency contact number"
                />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-sm font-medium text-foreground">
                  Designation
                </label>
                <Select
                  value={editForm.designation}
                  onValueChange={(value) =>
                    editField("designation", typeof value === "string" ? value : "")
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select designation" />
                  </SelectTrigger>
                  <SelectContent>
                    {DESIGNATION_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-sm font-medium text-foreground">
                  Joining Date
                </label>
                <Input
                  type="date"
                  value={editForm.joiningDate}
                  onChange={(event) =>
                    editField("joiningDate", event.target.value)
                  }
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
