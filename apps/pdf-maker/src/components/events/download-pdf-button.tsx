"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ClientPdfProposal } from "@/lib/client-pdf";
import {
  downloadClientPdf,
  fetchProposalPdfData,
} from "@/lib/download-client-pdf";
import type { VariantProps } from "class-variance-authority";
import type { buttonVariants } from "@/components/ui/button";

type DownloadPdfButtonProps = {
  proposal?: ClientPdfProposal;
  eventId?: string;
  label?: string;
  className?: string;
  variant?: VariantProps<typeof buttonVariants>["variant"];
  size?: VariantProps<typeof buttonVariants>["size"];
};

export function DownloadPdfButton({
  proposal,
  eventId,
  label = "Download PDF",
  className,
  variant = "default",
  size = "default",
}: DownloadPdfButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    if (isGenerating) {
      return;
    }
    setIsGenerating(true);
    try {
      const proposalData = proposal ?? (await fetchProposalPdfData(eventId ?? ""));
      const source = { proposal: proposalData };
      await downloadClientPdf(source);
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Failed to generate the PDF",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      onClick={handleDownload}
      disabled={isGenerating}
    >
      {isGenerating ? (
        <Loader2
          className="size-4 animate-spin"
          data-icon="inline-start"
          aria-hidden
        />
      ) : (
        <Download data-icon="inline-start" aria-hidden />
      )}
      {isGenerating ? "Generating…" : label}
    </Button>
  );
}
