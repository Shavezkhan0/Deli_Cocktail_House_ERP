import Link from "next/link";
import {
  ArrowUpRight,
  Palette,
  PenTool,
  SlidersHorizontal,
  Tag,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type CrmTool = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  gradient: string;
};

const CRM_TOOLS: CrmTool[] = [
  {
    title: "Menu Design",
    description: "Craft signature cocktail & food menus",
    href: "/crm/menu-design",
    icon: PenTool,
    gradient: "from-violet-500 to-fuchsia-500",
  },
  {
    title: "Glass Tag Designer",
    description: "Design glass tags for your events",
    href: "/crm/glass-tag",
    icon: Tag,
    gradient: "from-fuchsia-500 to-purple-500",
  },
  {
    title: "Stirrer Design",
    description: "Design branded drink stirrers",
    href: "/crm/stirrer",
    icon: SlidersHorizontal,
    gradient: "from-purple-500 to-indigo-500",
  },
  {
    title: "Logo Manager",
    description: "Manage brand logos & artwork",
    href: "/crm/logo",
    icon: Palette,
    gradient: "from-indigo-500 to-violet-500",
  },
];

export function CrmTools() {
  return (
    <section>
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          CRM Tools
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Design assets and brand management for your events.
        </p>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CRM_TOOLS.map((tool) => {
          const Icon = tool.icon;
          return (
            <Link
              key={tool.href}
              href={tool.href}
              className="group relative overflow-hidden rounded-xl bg-card p-5 ring-1 ring-foreground/10 transition-all duration-300 hover:-translate-y-0.5 hover:ring-violet-500/40 hover:shadow-[0_8px_40px_rgba(139,92,246,0.2)]"
            >
              <span
                className={cn(
                  "absolute -right-6 -top-6 size-24 rounded-full bg-gradient-to-br opacity-15 blur-2xl transition-all duration-300 group-hover:scale-125 group-hover:opacity-30",
                  tool.gradient,
                )}
                aria-hidden
              />
              <span
                className={cn(
                  "relative flex size-11 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_0_30px_rgba(139,92,246,0.5)]",
                  tool.gradient,
                )}
              >
                <Icon className="size-5" />
              </span>
              <h3 className="relative mt-4 text-sm font-semibold text-foreground">
                {tool.title}
              </h3>
              <p className="relative mt-1 text-xs leading-relaxed text-muted-foreground">
                {tool.description}
              </p>
              <span className="relative mt-3 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-violet-600 opacity-0 transition-all duration-300 group-hover:opacity-100">
                Open
                <ArrowUpRight className="size-3" />
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
