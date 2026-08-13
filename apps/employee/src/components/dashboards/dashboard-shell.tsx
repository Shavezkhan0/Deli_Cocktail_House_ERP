import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type DashboardFeature = {
  title: string;
  description: string;
  icon: LucideIcon;
  accent: string;
};

export function DashboardShell({
  title,
  description,
  features,
}: {
  title: string;
  description: string;
  features: DashboardFeature[];
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl bg-card p-6 ring-1 ring-foreground/10">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>

      {features && features.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="rounded-xl bg-card p-5 ring-1 ring-foreground/10 transition-colors hover:bg-muted/50"
              >
                <span
                  className={cn(
                    "flex size-10 items-center justify-center rounded-xl",
                    feature.accent,
                  )}
                >
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-4 text-sm font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
