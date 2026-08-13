"use client";

import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const DESIGNATION_COLORS: Record<string, string> = {
  CRM: "bg-sky-100 text-sky-700",
  GRAPHIC_DESIGNER: "bg-fuchsia-100 text-fuchsia-700",
  OPERATION_COORDINATOR: "bg-indigo-100 text-indigo-700",
  DATA_ENTRY_OPERATOR: "bg-teal-100 text-teal-700",
  PROCESS_COORDINATOR: "bg-blue-100 text-blue-700",
  IT_SOFTWARE_DEVELOPER: "bg-purple-100 text-purple-700",
  OFFICE_BOY: "bg-stone-100 text-stone-700",
  WAREHOUSE_MANAGER: "bg-orange-100 text-orange-700",
  VIDEO_EDITOR: "bg-pink-100 text-pink-700",
  MARKETING_EXECUTIVE: "bg-rose-100 text-rose-700",
  SALES_EXECUTIVE: "bg-amber-100 text-amber-700",
  DRIVER: "bg-slate-100 text-slate-700",
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) {
    return "Good Morning";
  }
  if (hour < 17) {
    return "Good Afternoon";
  }
  return "Good Evening";
}

function humanizeDesignation(designation: string): string {
  return designation
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function GreetingBanner() {
  const { user } = useAuth();
  const firstName = user?.name.trim().split(/\s+/)[0] ?? "there";

  return (
    <div className="flex flex-col gap-4 rounded-xl bg-card p-6 ring-1 ring-foreground/10 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {getGreeting()}, {firstName}! <span className="inline-block">👋</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here&apos;s an overview of your work with Deli Cocktail House today.
        </p>
      </div>

      {user ? (
        <span
          className={cn(
            "inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide",
            DESIGNATION_COLORS[user.designation] ??
              "bg-muted text-muted-foreground",
          )}
        >
          {humanizeDesignation(user.designation)}
        </span>
      ) : null}
    </div>
  );
}
