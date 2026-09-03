import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

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
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Module Selection
          </h1>
          <div
            style={{
              borderBottom: "3px solid #f7d98a",
              width: "4rem",
              marginTop: "8px",
            }}
          />
        </div>
        <p className="text-white-85 text-sm">Choose a module to get started.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {modules.map((module) => {
          const Icon = module.icon;
          return (
            <Link key={module.href} href={module.href} className="group">
              <Card className="glass-card-global h-full">
                <CardContent className="flex h-full flex-col gap-8 p-6">
                  <div className="flex items-start justify-between gap-4">
                    <span className="gold-icon-bg flex size-14 items-center justify-center rounded-2xl">
                      <Icon className="size-7" />
                    </span>
                    <span
                      className="flex size-9 items-center justify-center rounded-full transition-transform duration-200 group-hover:translate-x-1"
                      style={{
                        border: "1px solid rgba(255,255,255,0.35)",
                        background: "transparent",
                        color: "white",
                      }}
                    >
                      <ArrowRight className="size-4" />
                    </span>
                  </div>
                  <div className="mt-auto space-y-1.5">
                    <h2 className="text-lg font-bold tracking-tight text-white">
                      {module.title}
                    </h2>
                    <p className="text-white-85 text-sm leading-relaxed">
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
