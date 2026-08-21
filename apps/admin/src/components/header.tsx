"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  Building2,
  ChevronDown,
  GlassWater,
  LayoutGrid,
  LogOut,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
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
  icon: LucideIcon;
}[] = [
  {
    path: "/warehouse",
    title: "Warehouse/Site",
    subtitle: "Inventory & Site Operations",
    icon: Warehouse,
  },
  {
    path: "/dashboard/office",
    title: "Office Module",
    subtitle: "HR & Administration",
    icon: Building2,
  },
  {
    path: "/office",
    title: "Office Module",
    subtitle: "HR & Administration",
    icon: Building2,
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
      icon: GlassWater,
    };
  const BrandIcon = branding.icon;

  function handleBackToModules() {
    router.push("/dashboard");
  }

  function handleLogout() {
    logout();
    router.push("/login");
  }

  const initials = getInitials(user?.name, user?.email);

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-background px-6">
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <BrandIcon className="size-5" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-tight text-foreground">
            {branding.title}
          </p>
          <p className="text-xs text-muted-foreground">{branding.subtitle}</p>
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {initials}
              </span>
              <span className="hidden text-left leading-tight sm:block">
                <span className="block text-sm font-medium text-foreground">
                  {user?.name ?? "Admin"}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {user?.role ?? "Administrator"}
                </span>
              </span>
              <ChevronDown className="size-4 text-muted-foreground" />
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
            <LayoutGrid />
            Back to Modules
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={handleLogout}>
            <LogOut />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
