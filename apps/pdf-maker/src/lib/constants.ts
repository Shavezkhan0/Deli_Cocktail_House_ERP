export const STATUS_OPTIONS = [
  "DRAFT",
  "READY",
  "GENERATED",
  "ARCHIVED",
  "CANCELLED",
] as const;

export type EventStatusOption = (typeof STATUS_OPTIONS)[number];

type BadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "ghost"
  | "link";

export const STATUS_STYLES: Record<
  string,
  {
    variant: BadgeVariant;
    className?: string;
  }
> = {
  DRAFT: { variant: "outline" },
  READY: { variant: "secondary" },
  GENERATED: {
    variant: "default",
    className: "bg-emerald-600 text-emerald-50 hover:bg-emerald-600/80",
  },
  ARCHIVED: { variant: "ghost" },
  CANCELLED: { variant: "destructive" },
};

export const THEME_OPTIONS = [
  { value: "modern", label: "Modern" },
  { value: "classic", label: "Classic" },
  { value: "elegant", label: "Elegant" },
  { value: "minimal", label: "Minimal" },
] as const;

export const FONT_OPTIONS = [
  { value: "Helvetica", label: "Helvetica" },
  { value: "Times-Roman", label: "Times Roman" },
  { value: "Courier", label: "Courier" },
] as const;

export function parseLines(value: string | null | undefined): string[] {
  if (!value) {
    return [];
  }
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function toLines(items: unknown[] | null | undefined): string {
  if (!Array.isArray(items)) {
    return "";
  }
  return items.filter((item) => typeof item === "string").join("\n");
}

export const DEFAULT_DELIVERABLES = [
  "All Bar Equipment",
  "Personalized Cocktail & Mocktail Menu",
  "Stirrers",
  "Glass Tags",
  "Edible Glitters",
  "Personalized Garnish",
  "Edible Cocktail Prints",
];

export const DEFAULT_MIXERS = [
  "COMPLETE ASSORTMENT OF ALL DOMESTIC & IMPORTED GARNISHES",
  "MONIN SYRUPS & ANGOSTURA BITTERS",
];
