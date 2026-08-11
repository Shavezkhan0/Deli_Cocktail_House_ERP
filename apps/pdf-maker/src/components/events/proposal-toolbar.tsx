"use client";

import Link from "next/link";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ProposalToolbar({
  eventId,
}: {
  eventId: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 print:hidden">
      <Button
        variant="outline"
        size="lg"
        nativeButton={false}
        render={<Link href={`/events/${eventId}/edit`} />}
      >
        <ArrowLeft data-icon="inline-start" />
        Back to Edit
      </Button>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="lg" onClick={() => window.print()}>
          <Printer data-icon="inline-start" />
          Print / Save as PDF
        </Button>
        <Button size="lg" nativeButton={false} render={<a href={`/api/generate-pdf?id=${eventId}`} />}>
          <Download data-icon="inline-start" />
          Download PDF
        </Button>
      </div>
    </div>
  );
}
