"use client";

import { useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ImageIcon, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveSettings } from "@/app/(app)/settings/actions";
import { parseLines } from "@/lib/constants";
import { cn } from "@/lib/utils";

type SettingsFormState = {
  companyName: string;
  logoUrl: string;
  headerLogoUrl: string;
  address: string;
  phone1: string;
  phone2: string;
  email: string;
  footerText: string;
  defaultFont: string;
  defaultTheme: string;
  defaultTerms: string;
  defaultDeliverables: string;
  defaultMixers: string;
};

type SettingsFormProps = {
  initial?: SettingsFormState;
};

function Field({
  label,
  htmlFor,
  hint,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="text-sm font-medium text-foreground"
      >
        {label}
      </label>
      {children}
      {hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function LogoField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "logos");
      const response = await fetch("/api/uploads", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(data?.message ?? "Upload failed");
      }
      const data = (await response.json()) as { url: string };
      onChange(data.url);
      toast.success("Logo uploaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div className="flex items-center gap-3">
        <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-input bg-muted/40">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value}
              alt=""
              className="size-full object-contain"
            />
          ) : (
            <ImageIcon className="size-6 text-muted-foreground" />
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <Input
            type="url"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Paste an image URL…"
          />
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <Loader2 className="animate-spin" data-icon="inline-start" />
              ) : (
                <Upload data-icon="inline-start" />
              )}
              {isUploading ? "Uploading…" : "Upload image"}
            </Button>
            {value ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange("")}
              >
                Remove
              </Button>
            ) : null}
          </div>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}

export function SettingsForm({ initial }: SettingsFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<SettingsFormState>(
    initial ?? {
      companyName: "",
      logoUrl: "",
      headerLogoUrl: "",
      address: "",
      phone1: "",
      phone2: "",
      email: "",
      footerText: "",
      defaultFont: "Helvetica",
      defaultTheme: "modern",
      defaultTerms: "",
      defaultDeliverables: "",
      defaultMixers: "",
    },
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  function update<K extends keyof SettingsFormState>(
    key: K,
    value: SettingsFormState[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await saveSettings({
        companyName: form.companyName,
        logoUrl: form.logoUrl,
        headerLogoUrl: form.headerLogoUrl,
        address: form.address,
        phone1: form.phone1,
        phone2: form.phone2,
        email: form.email,
        footerText: form.footerText,
        defaultFont: form.defaultFont,
        defaultTheme: form.defaultTheme,
        defaultTerms: form.defaultTerms,
        defaultDeliverables: parseLines(form.defaultDeliverables),
        defaultMixers: parseLines(form.defaultMixers),
      });
      toast.success("Settings saved");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save settings");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Branding</CardTitle>
          <CardDescription>
            Your company identity and how it appears on proposals.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Company name" htmlFor="companyName">
              <Input
                id="companyName"
                value={form.companyName}
                onChange={(event) => update("companyName", event.target.value)}
                placeholder="e.g. Deli Cocktail House"
                required
              />
            </Field>
            <Field label="Email" htmlFor="email" className="sm:col-span-2">
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(event) => update("email", event.target.value)}
                placeholder="bookings@example.com"
              />
            </Field>
          </div>

          <Field label="Address" htmlFor="address">
            <Textarea
              id="address"
              value={form.address}
              onChange={(event) => update("address", event.target.value)}
              placeholder="Street, area, city, PIN"
              rows={2}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Phone 1" htmlFor="phone1">
              <Input
                id="phone1"
                value={form.phone1}
                onChange={(event) => update("phone1", event.target.value)}
                placeholder="+91 98XXX XXXXX"
              />
            </Field>
            <Field label="Phone 2" htmlFor="phone2">
              <Input
                id="phone2"
                value={form.phone2}
                onChange={(event) => update("phone2", event.target.value)}
                placeholder="+91 98XXX XXXXX"
              />
            </Field>
          </div>

          <Field label="Footer text" htmlFor="footerText">
            <Input
              id="footerText"
              value={form.footerText}
              onChange={(event) => update("footerText", event.target.value)}
              placeholder="Printed at the bottom of every page"
            />
          </Field>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Save settings"}
        </Button>
      </div>
    </form>
  );
}
