import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type DashboardFeature = {
  title: string;
  description: string;
  icon: LucideIcon;
  accent: string;
  href?: string;
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
    <div className="flex flex-col gap-6">
      <div className="space-y-1.5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-dark-heading">
            {title}
          </h1>
          <div
            style={{
              borderBottom: "3px solid #3b82f6",
              width: "4rem",
              marginTop: "8px",
            }}
          />
        </div>
        <p className="text-sm text-slate-600">{description}</p>
      </div>

      {features && features.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="glass-card-global group relative overflow-hidden"
              >
                <div className="relative flex items-start justify-between gap-4 p-5">
                  <div className="space-y-1.5">
                    <p className="text-sm font-medium text-white">
                      {feature.title}
                    </p>
                    <p className="text-xs leading-relaxed text-white-85">
                      {feature.description}
                    </p>
                  </div>
                  <span className="gold-icon-bg flex size-11 shrink-0 items-center justify-center rounded-xl">
                    <Icon className="size-5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
