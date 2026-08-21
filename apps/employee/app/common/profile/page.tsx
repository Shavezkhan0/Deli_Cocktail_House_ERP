"use client";

import { useQuery } from "@tanstack/react-query";
import { Mail, Phone, User, Wallet, CalendarDays } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { GreetingBanner } from "@/components/common/greeting-banner";
import { QuickStatsRow } from "@/components/common/quick-stats-row";
import { ErrorState, LoadingCards } from "@/components/common/states";
import { formatCurrency, formatDate } from "@/lib/format";
import { apiFetch } from "@/lib/api";

type EmployeeProfile = {
  name: string;
  designation: string;
  email: string | null;
  joiningDate: string;
  baseSalary: number;
  contact: string | null;
};

function humanizeDesignation(designation: string): string {
  return designation
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof User;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-border px-6 py-4 last:border-b-0">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="truncate text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["employee-profile"],
    queryFn: () => apiFetch<EmployeeProfile>("/api/employee/profile"),
  });

  let content: React.ReactNode;

  if (isPending) {
    content = <LoadingCards count={1} />;
  } else if (isError || !data) {
    content = <ErrorState message="Could not load your profile" onRetry={refetch} />;
  } else {
    const initials = data.name
      .trim()
      .split(/\s+/)
      .map((part) => part.charAt(0))
      .slice(0, 2)
      .join("")
      .toUpperCase();

    content = (
      <div className="flex flex-col gap-6">
        <section className="flex items-center gap-4 rounded-xl bg-card p-6 ring-1 ring-foreground/10 sm:p-8">
          <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-semibold text-primary-foreground">
            {initials || "U"}
          </span>
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              {data.name}
            </h2>
            <p className="mt-1 inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {humanizeDesignation(data.designation)}
            </p>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
          <DetailRow icon={Mail} label="Email" value={data.email ?? "—"} />
          <DetailRow icon={Phone} label="Contact" value={data.contact ?? "—"} />
          <DetailRow
            icon={CalendarDays}
            label="Joining Date"
            value={formatDate(data.joiningDate)}
          />
          <DetailRow
            icon={Wallet}
            label="Base Salary"
            value={formatCurrency(data.baseSalary)}
          />
        </section>
      </div>
    );
  }

  return (
    <AppShell
      title="Your Profile"
      subtitle="Your personal and employment details."
      icon={<User className="size-5" />}
    >
      <div className="flex flex-col gap-6">
        <GreetingBanner />
        <QuickStatsRow />
        {content}
      </div>
    </AppShell>
  );
}