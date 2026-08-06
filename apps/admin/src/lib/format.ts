export const EVENT_STATUS_COLORS: Record<string, string> = {
  UPCOMING: "bg-sky-100 text-sky-700",
  ONGOING: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-red-100 text-red-700",
};

export const STOCK_STATUS_COLORS: Record<string, string> = {
  "Action Required": "bg-red-100 text-red-700",
  Low: "bg-amber-100 text-amber-700",
  "In Stock": "bg-emerald-100 text-emerald-700",
};

export function statusColor(
  status: string,
  colors: Record<string, string> = EVENT_STATUS_COLORS,
): string {
  return colors[status] ?? "bg-muted text-muted-foreground";
}

export function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
