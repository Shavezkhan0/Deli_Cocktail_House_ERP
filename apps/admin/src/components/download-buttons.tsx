"use client";

import { useState } from "react";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import { Download as DownloadIcon } from "@/components/animate-ui/icons/download";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { downloadFile } from "@/lib/download";
import { useAuth } from "@/lib/auth";

/**
 * Twin download buttons — "PDF" and "Excel" — for any endpoint that accepts a
 * `?format=pdf|csv` query param. The PDF carries the company logo/stamp; the
 * Excel (.csv, opens in Excel) is plain data.
 */
export function DownloadButtons({
  baseUrl,
  fileBase,
  label = "Download",
  size = "sm",
}: {
  /** URL without the format param, e.g. `/api/office/payroll/summary-pdf?month=8&year=2026` */
  baseUrl: string;
  /** filename without extension, e.g. `payroll-summary-2026-8` */
  fileBase: string;
  label?: string;
  size?: "xs" | "sm" | "default";
}) {
  const { token } = useAuth();
  const [busy, setBusy] = useState<null | "pdf" | "csv">(null);

  async function run(format: "pdf" | "csv") {
    const sep = baseUrl.includes("?") ? "&" : "?";
    const ext = format === "csv" ? "csv" : "pdf";
    setBusy(format);
    try {
      await downloadFile(
        `${baseUrl}${sep}format=${format}`,
        token,
        `${fileBase}.${ext}`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Download failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        size={size}
        onClick={() => run("pdf")}
        disabled={busy !== null}
      >
        {busy === "pdf" ? <Loader2 className="animate-spin" /> : <DownloadIcon animateOnHover />}
        {label} PDF
      </Button>
      <Button
        variant="outline"
        size={size}
        onClick={() => run("csv")}
        disabled={busy !== null}
      >
        {busy === "csv" ? (
          <Loader2 className="animate-spin" />
        ) : (
          <FileSpreadsheet />
        )}
        {label} Excel
      </Button>
    </div>
  );
}