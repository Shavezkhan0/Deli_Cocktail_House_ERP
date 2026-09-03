"use client";

import { usePathname, useRouter } from "next/navigation";
import { ChevronDown } from "@/components/animate-ui/icons/chevron-down";
import { LayoutDashboard } from "@/components/animate-ui/icons/layout-dashboard";
import { LogOut } from "@/components/animate-ui/icons/log-out";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth";

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
  return email?.slice(0, 2).toUpperCase() ?? "AD";
}

const BRANDING: {
  path: string;
  title: string;
  subtitle: string;
  logo: string;
}[] = [
  {
    path: "/warehouse",
    title: "Warehouse/Site",
    subtitle: "Inventory & Site Operations",
    logo: "/Logo.png",
  },
  {
    path: "/dashboard/office",
    title: "Office Module",
    subtitle: "HR & Administration",
    logo: "/Logo.png",
  },
  {
    path: "/office",
    title: "Office Module",
    subtitle: "HR & Administration",
    logo: "/Logo.png",
  },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const branding =
    BRANDING.find((item) => pathname.startsWith(item.path)) ?? {
      title: "Deli Cocktail House",
      subtitle: "Catering ERP",
      logo: "/Logo.png",
    };

  function handleBackToModules() {
    router.push("/dashboard");
  }

  function handleLogout() {
    logout();
    router.push("/login");
  }

  const initials = getInitials(user?.name, user?.email);

  return (
    <header
      className="flex h-16 shrink-0 items-center justify-between px-6 sticky top-0 z-50"
      style={{
        background: "rgba(255,255,255,0.06)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        borderBottom: "1px solid rgba(255,255,255,0.15)",
      }}
    >
      <div className="flex items-center gap-3">
        <div className="gold-gradient-circle flex size-9 items-center justify-center overflow-hidden rounded-xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={branding.logo}
            alt={branding.title}
            className="size-9 object-cover"
          />
        </div>
        <div className="leading-tight">
          <p className="text-gold-accent text-sm font-semibold tracking-tight">
            {branding.title}
          </p>
          <p className="text-white-85 text-xs">{branding.subtitle}</p>
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span className="gold-gradient-circle flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                {initials}
              </span>
              <span className="hidden text-left leading-tight sm:block">
                <span className="block text-sm font-medium text-white">
                  {user?.name ?? "Admin"}
                </span>
                <span className="block text-white-85 text-xs">
                  {user?.role ?? "Administrator"}
                </span>
              </span>
              <ChevronDown animateOnHover className="size-4 text-muted-foreground" />
            </button>
          }
        />
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuGroup>
            <DropdownMenuLabel>
              <span className="block">{user?.name ?? "Admin"}</span>
              <span className="block font-normal text-muted-foreground">
                {user?.email}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
          </DropdownMenuGroup>
          <DropdownMenuItem onClick={handleBackToModules}>
            <LayoutDashboard animateOnHover className="size-4" />
            Back to Modules
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={handleLogout}>
            <LogOut animateOnHover className="size-4" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
