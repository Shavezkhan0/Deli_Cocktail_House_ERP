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
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
        <h2 className="text-lg font-semibold tracking-tight text-white">
          {title}
        </h2>
        <p className="mt-1 text-sm text-slate-400">{description}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <div
              key={feature.title}
              className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-xl transition-colors duration-200 hover:bg-white/[0.08]"
            >
              <span
                className={cn(
                  "flex size-10 items-center justify-center rounded-xl",
                  feature.accent,
                )}
              >
                <Icon className="size-5" />
              </span>
              <h3 className="mt-4 text-sm font-semibold text-white">
                {feature.title}
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                {feature.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
