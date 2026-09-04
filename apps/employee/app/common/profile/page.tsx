"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Mail,
  Phone,
  User,
  Wallet,
  CalendarDays,
  BadgeCheck,
  Clock,
  Briefcase,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { GreetingBanner } from "@/components/common/greeting-banner";
import { QuickStatsRow } from "@/components/common/quick-stats-row";
import { ErrorState } from "@/components/common/states";
import { LogoutButton } from "@/components/common/logout-button";
import { formatCurrency, formatDate } from "@/lib/format";
import { apiFetch } from "@/lib/api";

type EmployeeProfile = {
  id?: string;
  employeeId?: string;
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

function ProfileSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="glass-card-global flex flex-col items-center gap-5 p-8 sm:flex-row sm:items-start">
        <div className="size-20 animate-pulse rounded-full bg-white/15" />
        <div className="flex flex-col items-center gap-3 sm:items-start">
          <div className="h-6 w-48 animate-pulse rounded-lg bg-white/15" />
          <div className="h-5 w-28 animate-pulse rounded-full bg-white/15" />
          <div className="h-4 w-32 animate-pulse rounded bg-white/15" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="glass-card-global flex items-center gap-4 p-5"
          >
            <div className="size-11 animate-pulse rounded-xl bg-white/15" />
            <div className="flex flex-col gap-2">
              <div className="h-3 w-20 animate-pulse rounded bg-white/15" />
              <div className="h-4 w-36 animate-pulse rounded bg-white/15" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProfileHero({ data }: { data: EmployeeProfile }) {
  const initials = data.name
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="glass-card-global flex flex-col items-center gap-5 p-8 sm:flex-row sm:items-start">
      <div className="relative">
        <div className="flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-sky-500 text-2xl font-bold text-white shadow-lg shadow-indigo-500/30 ring-4 ring-white/20">
          {initials || "U"}
        </div>
        <span className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm">
          <BadgeCheck className="size-3.5" />
        </span>
      </div>

      <div className="flex flex-col items-center gap-3 text-center sm:items-start sm:text-left">
        <h2 className="text-xl font-bold text-white">{data.name}</h2>

        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white/85 backdrop-blur-sm">
          <Briefcase className="size-3" />
          {humanizeDesignation(data.designation)}
        </span>

        <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-white-85">
          <span className="flex items-center gap-1">
            <BadgeCheck className="size-3.5 text-sky-300" />
            ID: {data.employeeId || "—"}
          </span>
          <span className="h-3 w-px bg-white/20" />
          <span className="flex items-center gap-1">
            <CalendarDays className="size-3.5 text-sky-300" />
            Joined {formatDate(data.joiningDate)}
          </span>
          <span className="h-3 w-px bg-white/20" />
          <span className="flex items-center gap-1">
            <Clock className="size-3.5 text-emerald-300" />
            Active
          </span>
        </div>
      </div>
    </div>
  );
}

function DetailCard({
  icon: Icon,
  label,
  value,
  iconAccent,
}: {
  icon: typeof User;
  label: string;
  value: string;
  iconAccent: string;
}) {
  return (
    <div className="glass-card-global group flex items-center gap-4 p-5 transition-all duration-200 hover:-translate-y-0.5">
      <span
        className={`gold-icon-bg flex size-11 shrink-0 items-center justify-center rounded-xl ${iconAccent}`}
      >
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/70">
          {label}
        </p>
        <p className="truncate text-base font-bold text-white">{value}</p>
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
    content = <ProfileSkeleton />;
  } else if (isError || !data) {
    content = <ErrorState message="Could not load your profile" onRetry={refetch} />;
  } else {
    content = (
      <div className="flex flex-col gap-6">
        <ProfileHero data={data} />

        <div className="grid gap-4 sm:grid-cols-2">
          <DetailCard
            icon={Mail}
            label="Email"
            value={data.email ?? "—"}
            iconAccent=""
          />
          <DetailCard
            icon={Phone}
            label="Contact"
            value={data.contact ?? "—"}
            iconAccent=""
          />
          <DetailCard
            icon={CalendarDays}
            label="Joining Date"
            value={formatDate(data.joiningDate)}
            iconAccent=""
          />
          <DetailCard
            icon={Wallet}
            label="Base Salary"
            value={formatCurrency(data.baseSalary)}
            iconAccent=""
          />
        </div>
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

        <LogoutButton
          label="Log out"
          className="glass-card-global flex w-full items-center justify-center gap-2 border border-red-500/30 px-4 py-3.5 text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/20 active:scale-[0.99]"
        />
      </div>
    </AppShell>
  );
}
