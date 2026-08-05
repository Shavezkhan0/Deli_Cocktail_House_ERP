"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type ModuleTab = {
  href: string;
  label: string;
  icon: LucideIcon;
};

type ModuleSidebarProps = {
  basePath: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  tabs: ModuleTab[];
};

function isActive(pathname: string, basePath: string, href: string): boolean {
  if (href === basePath) {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function ModuleSidebar({
  basePath,
  title,
  subtitle,
  icon: ModuleIcon,
  tabs,
}: ModuleSidebarProps) {
  const pathname = usePathname();

  function renderLink(tab: ModuleTab, mobile = false) {
    const active = isActive(pathname, basePath, tab.href);
    const TabIcon = tab.icon;
    return (
      <Link
        key={tab.href}
        href={tab.href}
        className={cn(
          "flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          mobile ? "shrink-0 gap-2" : "gap-3",
          active
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <TabIcon className="size-4" />
        {tab.label}
      </Link>
    );
  }

  return (
    <>
      <nav className="flex items-center gap-1 overflow-x-auto rounded-xl border bg-card p-1 md:hidden">
        {tabs.map((tab) => renderLink(tab, true))}
      </nav>

      <aside className="sticky top-6 hidden h-[calc(100vh-7rem)] w-64 shrink-0 flex-col rounded-2xl border bg-card p-3 shadow-sm md:flex">
        <div className="flex items-center gap-3 border-b border-border px-2 py-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ModuleIcon className="size-5" />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-tight text-foreground">
              {title}
            </p>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>

        <nav className="mt-3 flex flex-col gap-1">
          {tabs.map((tab) => renderLink(tab))}
        </nav>

        <div className="mt-auto border-t border-border pt-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
          >
            <ArrowLeft className="size-4" />
            Back to Dashboard
          </Link>
        </div>
      </aside>
    </>
  );
}
