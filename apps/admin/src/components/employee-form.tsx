"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Loader2, UploadCloud, XCircle } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiFetch, API_BASE_URL } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { flattenZodErrors } from "@/lib/validation";

export const DESIGNATION_VALUES = [
  "CRM",
  "ORDERING_OPERATOR",
  "DESIGNER",
  "GRAPHIC_DESIGNER",
  "DATA_ENTRY_OPERATOR",
  "MIS",
  "WAREHOUSE_MANAGER",
  "INVENTORY_MANAGER",
  "PERMANENT_LABOUR",
  "SOFTWARE_DEVELOPER",
  "OFFICE_BOY",
  "DRIVER",
  "SECURITY_GUARD",
] as const;

export const DESIGNATION_OPTIONS: {
  value: (typeof DESIGNATION_VALUES)[number];
  label: string;
}[] = [
  { value: "CRM", label: "CRM" },
  { value: "ORDERING_OPERATOR", label: "Ordering Operator" },
  { value: "DESIGNER", label: "Designer" },
  { value: "GRAPHIC_DESIGNER", label: "Graphic Designer" },
  { value: "DATA_ENTRY_OPERATOR", label: "Data Entry Operator" },
  { value: "MIS", label: "MIS" },
  { value: "WAREHOUSE_MANAGER", label: "Warehouse Manager" },
  { value: "INVENTORY_MANAGER", label: "Inventory Manager" },
  { value: "PERMANENT_LABOUR", label: "Permanent Labour" },
  { value: "SOFTWARE_DEVELOPER", label: "Software Developer" },
  { value: "OFFICE_BOY", label: "Office Boy" },
  { value: "DRIVER", label: "Driver" },
  { value: "SECURITY_GUARD", label: "Security Guard" },
];

export const DESIGNATION_LABELS: Record<string, string> = Object.fromEntries(
  DESIGNATION_OPTIONS.map((option) => [option.value, option.label]),
);

type Employee = {
  id: string;
  employeeId: string;
  name: string;
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
};

type CreateEmployeePayload = {
  name: string;
  contact: string;
  emergencyContact?: string;
  designation: string;
  baseSalary: number;
  joiningDate: string;
  aadharUrl?: string;
  panCardUrl?: string;
  offerLetterUrl?: string;
  bondUrl?: string;
  bankAccountNo?: string;
  bankBranch?: string;
  bankIfsc?: string;
  bankOtherDetails?: string;
};

const employeeSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  contact: z.string().trim().min(1, "Contact is required"),
  emergencyContact: z.string().trim().optional(),
  designation: z.enum(DESIGNATION_VALUES),
  baseSalary: z
    .string()
    .trim()
    .min(1, "Base salary is required")
    .regex(/^\d+(\.\d{1,2})?$/, "Must be a valid amount")
    .transform((value) => Number(value)),
  joiningDate: z.string().trim().min(1, "Joining date is required"),
  bankAccountNo: z.string().trim().optional(),
  bankBranch: z.string().trim().optional(),
  bankIfsc: z.string().trim().optional(),
  bankOtherDetails: z.string().trim().optional(),
});

type EmployeeFormValues = {
  name: string;
  contact: string;
  emergencyContact: string;
  designation: string;
  baseSalary: string;
  joiningDate: string;
  bankAccountNo: string;
  bankBranch: string;
  bankIfsc: string;
  bankOtherDetails: string;
};

const emptyForm: EmployeeFormValues = {
  name: "",
  contact: "",
  emergencyContact: "",
  designation: "",
  baseSalary: "",
  joiningDate: "",
  bankAccountNo: "",
  bankBranch: "",
  bankIfsc: "",
  bankOtherDetails: "",
};

type DocKey = "aadharUrl" | "panCardUrl" | "offerLetterUrl" | "bondUrl";

type DocumentState = {
  url: string;
  fileName: string;
  isUploading: boolean;
};

const emptyDocuments: Record<DocKey, DocumentState> = {
  aadharUrl: { url: "", fileName: "", isUploading: false },
  panCardUrl: { url: "", fileName: "", isUploading: false },
  offerLetterUrl: { url: "", fileName: "", isUploading: false },
  bondUrl: { url: "", fileName: "", isUploading: false },
};

const DOC_OPTIONS: { key: DocKey; label: string; docType: string }[] = [
  { key: "aadharUrl", label: "Aadhar", docType: "aadhar" },
  { key: "panCardUrl", label: "PAN Card", docType: "pan-card" },
  { key: "offerLetterUrl", label: "Offer Letter", docType: "offer-letter" },
  { key: "bondUrl", label: "Bond", docType: "bond" },
];

export async function uploadDocument(
  file: File,
  docType: string,
  token: string | null,
  options?: {
    employeeId?: string;
    oldPath?: string;
  },
): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("docType", docType);
  if (options?.employeeId) {
    formData.append("employeeId", options.employeeId);
  }
  if (options?.oldPath) {
    formData.append("oldPath", options.oldPath);
  }

  const res = await fetch(`${API_BASE_URL}/api/uploads/employee-document`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!res.ok) {
    let message = `Upload failed with status ${res.status}`;
    try {
      const data = (await res.json()) as { message?: string };
      if (data.message) {
        message = data.message;
      }
    } catch {
      // Response body was not JSON; fall back to the generic message.
    }
    throw new Error(message);
  }

  const data = (await res.json()) as { url: string };
  return data.url;
}

export async function deleteDocument(
  path: string,
  token: string | null,
): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/uploads/employee-document`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ path }),
  });

  if (!res.ok) {
    let message = `Delete failed with status ${res.status}`;
    try {
      const data = (await res.json()) as { message?: string };
      if (data.message) {
        message = data.message;
      }
    } catch {
      // Response body was not JSON; fall back to the generic message.
    }
    throw new Error(message);
  }
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

function DocumentField({
  docKey,
  label,
  state,
  onFile,
  onRemove,
}: {
  docKey: DocKey;
  label: string;
  state: DocumentState;
  onFile: (key: DocKey, file?: File) => void;
  onRemove: (key: DocKey) => void;
}) {
  if (state.isUploading) {
    return (
      <div className="flex h-8 items-center gap-2 rounded-lg border border-dashed border-border px-2.5 text-sm text-muted-foreground">
        <Loader2 className="size-4 shrink-0 animate-spin" />
        <span className="truncate">{state.fileName}</span>
      </div>
    );
  }

  if (state.url) {
    return (
      <div className="flex h-8 items-center gap-2 rounded-lg border border-dashed border-border px-2.5 text-sm">
        <FileText className="size-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate text-foreground">
          {state.fileName}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={() => onRemove(docKey)}
        >
          <XCircle />
          Remove
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <label className="flex h-8 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-2.5 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground">
        <UploadCloud className="size-4 shrink-0" />
        Choose file
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          className="sr-only"
          onChange={(event) => onFile(docKey, event.target.files?.[0])}
        />
      </label>
    </div>
  );
}

export function EmployeeForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<EmployeeFormValues>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [documents, setDocuments] =
    useState<Record<DocKey, DocumentState>>(emptyDocuments);

  const createEmployee = useMutation({
    mutationFn: (payload: CreateEmployeePayload) =>
      apiFetch<Employee>("/api/office/employees", {
        method: "POST",
        body: payload,
        token,
      }),
    onSuccess: () => {
      toast.success("Employee created");
      queryClient.invalidateQueries({ queryKey: ["office-employees"] });
      queryClient.invalidateQueries({ queryKey: ["office-dashboard"] });
      onSuccess();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  function update<K extends keyof EmployeeFormValues>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleFileChange(key: DocKey, file?: File) {
    if (!file) {
      return;
    }
    const docLabel = DOC_OPTIONS.find((doc) => doc.key === key)?.label ?? key;
    setDocuments((prev) => ({
      ...prev,
      [key]: { url: "", fileName: file.name, isUploading: true },
    }));

    try {
      const url = await uploadDocument(file, key, token);
      setDocuments((prev) => ({
        ...prev,
        [key]: { url, fileName: file.name, isUploading: false },
      }));
      toast.success(`${docLabel} uploaded`);
    } catch (error) {
      setDocuments((prev) => ({
        ...prev,
        [key]: { url: "", fileName: "", isUploading: false },
      }));
      toast.error(error instanceof Error ? error.message : "Document upload failed");
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (Object.values(documents).some((doc) => doc.isUploading)) {
      toast.error("Wait for all document uploads to finish");
      return;
    }

    const parsed = employeeSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(flattenZodErrors(parsed.error));
      return;
    }

    setErrors({});
    createEmployee.mutate({
      name: parsed.data.name,
      contact: parsed.data.contact,
      ...(parsed.data.emergencyContact?.trim()
        ? { emergencyContact: parsed.data.emergencyContact.trim() }
        : {}),
      designation: parsed.data.designation,
      baseSalary: parsed.data.baseSalary,
      joiningDate: new Date(parsed.data.joiningDate).toISOString(),
      ...(documents.aadharUrl.url ? { aadharUrl: documents.aadharUrl.url } : {}),
      ...(documents.panCardUrl.url ? { panCardUrl: documents.panCardUrl.url } : {}),
      ...(documents.offerLetterUrl.url
        ? { offerLetterUrl: documents.offerLetterUrl.url }
        : {}),
      ...(documents.bondUrl.url ? { bondUrl: documents.bondUrl.url } : {}),
      ...(parsed.data.bankAccountNo?.trim()
        ? { bankAccountNo: parsed.data.bankAccountNo.trim() }
        : {}),
      ...(parsed.data.bankBranch?.trim()
        ? { bankBranch: parsed.data.bankBranch.trim() }
        : {}),
      ...(parsed.data.bankIfsc?.trim()
        ? { bankIfsc: parsed.data.bankIfsc.trim() }
        : {}),
      ...(parsed.data.bankOtherDetails?.trim()
        ? { bankOtherDetails: parsed.data.bankOtherDetails.trim() }
        : {}),
    });
  }

  const isSaving = createEmployee.isPending;

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto sm:grid-cols-2">
        <Field label="Name" error={errors.name} className="sm:col-span-2">
          <Input
            value={form.name}
            onChange={(event) => update("name", event.target.value)}
            placeholder="e.g. Rahul Sharma"
            aria-invalid={Boolean(errors.name)}
          />
        </Field>

        <Field label="Contact" error={errors.contact}>
          <Input
            value={form.contact}
            onChange={(event) => update("contact", event.target.value)}
            placeholder="e.g. +91 98765 43210"
            aria-invalid={Boolean(errors.contact)}
          />
        </Field>

        <Field label="Emergency Contact" error={errors.emergencyContact}>
          <Input
            value={form.emergencyContact}
            onChange={(event) => update("emergencyContact", event.target.value)}
            placeholder="Optional"
            aria-invalid={Boolean(errors.emergencyContact)}
          />
        </Field>

        <Field label="Designation" error={errors.designation} className="sm:col-span-2">
          <Select
            value={form.designation}
            onValueChange={(value) =>
              update("designation", typeof value === "string" ? value : "")
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
        </Field>

        <Field label="Base Salary" error={errors.baseSalary}>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={form.baseSalary}
            onChange={(event) => update("baseSalary", event.target.value)}
            placeholder="e.g. 25000"
            aria-invalid={Boolean(errors.baseSalary)}
          />
        </Field>

        <Field label="Joining Date" error={errors.joiningDate}>
          <Input
            type="date"
            value={form.joiningDate}
            onChange={(event) => update("joiningDate", event.target.value)}
            aria-invalid={Boolean(errors.joiningDate)}
          />
        </Field>

        <div className="flex flex-col gap-2 sm:col-span-2">
          <h3 className="text-sm font-medium text-foreground">Documents</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {DOC_OPTIONS.map((doc) => (
              <DocumentField
                key={doc.key}
                docKey={doc.key}
                label={doc.label}
                state={documents[doc.key]}
                onFile={handleFileChange}
                onRemove={(key) =>
                  setDocuments((prev) => ({
                    ...prev,
                    [key]: { url: "", fileName: "", isUploading: false },
                  }))
                }
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:col-span-2">
          <h3 className="text-sm font-medium text-foreground">Bank Details</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Account No" error={errors.bankAccountNo}>
              <Input
                value={form.bankAccountNo}
                onChange={(event) => update("bankAccountNo", event.target.value)}
                placeholder="Bank account number"
                aria-invalid={Boolean(errors.bankAccountNo)}
              />
            </Field>

            <Field label="Branch" error={errors.bankBranch}>
              <Input
                value={form.bankBranch}
                onChange={(event) => update("bankBranch", event.target.value)}
                placeholder="Bank branch"
                aria-invalid={Boolean(errors.bankBranch)}
              />
            </Field>

            <Field label="IFSC Code" error={errors.bankIfsc}>
              <Input
                value={form.bankIfsc}
                onChange={(event) => update("bankIfsc", event.target.value)}
                placeholder="e.g. HDFC0001234"
                aria-invalid={Boolean(errors.bankIfsc)}
              />
            </Field>

            <Field label="Other Bank Details" error={errors.bankOtherDetails}>
              <Input
                value={form.bankOtherDetails}
                onChange={(event) => update("bankOtherDetails", event.target.value)}
                placeholder="Optional"
                aria-invalid={Boolean(errors.bankOtherDetails)}
              />
            </Field>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSaving}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Creating…" : "Create Employee"}
        </Button>
      </div>
    </form>
  );
}
