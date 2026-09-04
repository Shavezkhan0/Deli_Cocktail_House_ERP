"use client";

import { useRouter } from "next/navigation";
import { ChevronDown, LayoutDashboard, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLogout } from "@/components/common/logout-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function getInitials(name?: string | null, email?: string | null): string {
  if (name && name.trim()) {
    return name
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }
  return email?.slice(0, 2).toUpperCase() ?? "EM";
}

export function Header() {
  const router = useRouter();
  const { user } = useAuth();
  const logout = useLogout();

  const initials = getInitials(user?.name, user?.email);

  return (
    <header
      className="flex h-16 shrink-0 items-center justify-between px-6 sticky top-0 z-50"
      style={{
        background: "#1e3a8a",
        borderBottom: "1px solid #1e40af",
      }}
    >
      <div className="flex items-center gap-3">
        <div className="gold-gradient-circle flex size-9 items-center justify-center overflow-hidden rounded-xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/Logo.png"
            alt="Deli Cocktail House"
            className="size-9 object-cover"
          />
        </div>
        <div className="leading-tight">
          <p className="text-white text-sm font-semibold tracking-tight">
            Deli Cocktail House
          </p>
          <p className="text-white-85 text-xs">Employee Portal</p>
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/10 focus-visible:ring-3 focus-visible:ring-white/30">
          <span className="gold-gradient-circle flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
            {initials}
          </span>
          <span className="hidden text-left leading-tight sm:block">
            <span className="block text-sm font-medium text-white">
              {user?.name ?? "Employee"}
            </span>
            <span className="block text-white-85 text-xs">
              {user?.designation
                ? user.designation
                    .toLowerCase()
                    .split("_")
                    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                    .join(" ")
                : "Employee"}
            </span>
          </span>
          <ChevronDown className="size-4 text-white/85" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuGroup>
            <DropdownMenuLabel>
              <span className="block">{user?.name ?? "Employee"}</span>
              <span className="block font-normal text-muted-foreground">
                {user?.email}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
          </DropdownMenuGroup>
          <DropdownMenuItem onClick={() => router.push("/common/profile")}>
            <LayoutDashboard className="size-4" />
            Your Profile
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={logout}>
            <LogOut className="size-4" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
