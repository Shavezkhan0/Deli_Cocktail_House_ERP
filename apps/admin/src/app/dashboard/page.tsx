import Link from "next/link";
import {
  ArrowRight,
  Building2,
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
    title: "Office",
    description: "HR, attendance, approvals and administrative operations.",
    href: "/office/dashboard",
    icon: Building2,
    accent: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  },
  {
    title: "Warehouse/Site",
    description: "Inventory, low-stock alerts and event dispatch management.",
    href: "/warehouse/dashboard",
    icon: Warehouse,
    accent: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-300",
  },
];

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1.5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Module Selection
          </h1>
          <div className="mt-1 h-0.5 w-16 rounded-full bg-primary" />
        </div>
        <p className="text-sm text-muted-foreground">
          Choose a module to get started.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {modules.map((module) => {
          const Icon = module.icon;
          return (
            <Link key={module.href} href={module.href} className="group">
              <Card className="h-full transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-xl group-hover:shadow-primary/15 group-hover:ring-2 group-hover:ring-primary/40">
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
