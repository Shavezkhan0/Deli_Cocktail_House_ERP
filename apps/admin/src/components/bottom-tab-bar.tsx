"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type BottomTabItem = {
  href: string;
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
};

export function BottomTabBar({ items }: { items: BottomTabItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="no-print fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
      <div className="relative mx-auto flex max-w-lg items-center gap-1 rounded-full border border-border bg-popover p-1.5 shadow-xl shadow-foreground/5">
        {items.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 rounded-full px-2 py-2 transition-colors",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-5 shrink-0" />
              <span className="max-w-full truncate text-[10px] font-semibold leading-none">
                {item.shortLabel ?? item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
