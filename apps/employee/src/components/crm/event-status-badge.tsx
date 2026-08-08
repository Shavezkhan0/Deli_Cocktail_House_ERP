import type { EventStatus } from "@/lib/crm-types";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<EventStatus, string> = {
  UPCOMING: "bg-sky-100 text-sky-700",
  ONGOING: "bg-emerald-100 text-emerald-700",
  COMPLETED: "bg-violet-100 text-violet-700",
  CANCELLED: "bg-rose-100 text-rose-700",
};

const STATUS_DOTS: Record<EventStatus, string> = {
  UPCOMING: "bg-sky-500",
  ONGOING: "bg-emerald-500",
  COMPLETED: "bg-violet-500",
  CANCELLED: "bg-rose-500",
};

export function EventStatusBadge({
  status,
  className,
}: {
  status: EventStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
        STATUS_STYLES[status],
        className,
      )}
    >
      <span
        className={cn("size-1.5 rounded-full", STATUS_DOTS[status])}
        aria-hidden
      />
      {status.replace("_", " ")}
    </span>
  );
}
