import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ModuleConfig = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  accent: string;
};

const modules: ModuleConfig[] = [
  {
    title: "Office Module",
    description: "HR, attendance, approvals and administrative operations.",
    href: "/dashboard/office",
    icon: Building2,
    accent: "bg-sky-100 text-sky-700",
  },
  {
    title: "Warehouse Module",
    description: "Inventory, low-stock alerts and dispatch management.",
    href: "/dashboard/warehouse",
    icon: Warehouse,
    accent: "bg-amber-100 text-amber-700",
  },
  {
    title: "Event Module",
    description: "Plan events, assign managers and track item approvals.",
    href: "/dashboard/events",
    icon: CalendarDays,
    accent: "bg-emerald-100 text-emerald-700",
  },
];

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Module Selection
        </h1>
        <p className="text-sm text-muted-foreground">
          Choose a module to get started.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((module) => {
          const Icon = module.icon;
          return (
            <Link key={module.href} href={module.href} className="group">
              <Card className="h-full transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-lg group-hover:ring-primary/30">
                <CardContent className="flex h-full flex-col gap-8 p-6">
                  <div className="flex items-start justify-between gap-4">
                    <span
                      className={cn(
                        "flex size-14 items-center justify-center rounded-2xl",
                        module.accent,
                      )}
                    >
                      <Icon className="size-7" />
                    </span>
                    <span className="flex size-9 items-center justify-center rounded-full border bg-muted/50 text-muted-foreground transition-transform duration-200 group-hover:translate-x-1 group-hover:text-primary">
                      <ArrowRight className="size-4" />
                    </span>
                  </div>
                  <div className="mt-auto space-y-1.5">
                    <h2 className="text-lg font-semibold tracking-tight text-foreground">
                      {module.title}
                    </h2>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {module.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
