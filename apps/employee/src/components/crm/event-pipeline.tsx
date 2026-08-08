import { Fragment } from "react";
import {
  CalendarDays,
  Check,
  Package,
  PenTool,
  RefreshCw,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { EventStatus } from "@/lib/crm-types";
import { cn } from "@/lib/utils";

const PIPELINE_STEPS: { label: string; icon: LucideIcon }[] = [
  { label: "Booking", icon: CalendarDays },
  { label: "Menu Design", icon: PenTool },
  { label: "Kitting", icon: Package },
  { label: "Event Day", icon: Sparkles },
  { label: "Post-Event", icon: RefreshCw },
];

export function getPipelineProgress(
  status: EventStatus,
  inventoryCount: number,
): number {
  switch (status) {
    case "COMPLETED":
      return PIPELINE_STEPS.length;
    case "ONGOING":
      return 3;
    case "UPCOMING":
      return inventoryCount > 0 ? 2 : 0;
    case "CANCELLED":
    default:
      return -1;
  }
}

export function EventPipeline({
  status,
  inventoryCount,
  className,
}: {
  status: EventStatus;
  inventoryCount: number;
  className?: string;
}) {
  const progress = getPipelineProgress(status, inventoryCount);
  const allDone = progress >= PIPELINE_STEPS.length;

  return (
    <div className={cn("flex w-full items-start", className)}>
      {PIPELINE_STEPS.map((step, index) => {
        const done = allDone || index < progress;
        const current = !allDone && progress >= 0 && index === progress;
        const Icon = step.icon;

        return (
          <Fragment key={step.label}>
            <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors duration-300",
                  done &&
                    "border-violet-500 bg-violet-500 text-white shadow-[0_0_12px_rgba(139,92,246,0.4)]",
                  current &&
                    "animate-pulse border-violet-500 bg-violet-100 text-violet-700 shadow-[0_0_0_4px_rgba(139,92,246,0.15)]",
                  !done &&
                    !current &&
                    "border-border bg-muted text-muted-foreground",
                )}
              >
                {done ? (
                  <Check className="size-3.5" strokeWidth={3} />
                ) : (
                  <Icon className="size-3" />
                )}
              </span>
              <span
                className={cn(
                  "text-center text-[10px] font-medium leading-tight",
                  done || current ? "text-violet-700" : "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
            </div>

            {index < PIPELINE_STEPS.length - 1 && (
              <div
                className={cn(
                  "mt-3 h-0.5 min-w-4 flex-1 self-start rounded-full transition-colors duration-300",
                  allDone || index + 1 <= progress
                    ? "bg-gradient-to-r from-violet-500 to-violet-400"
                    : "bg-border",
                )}
              />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
