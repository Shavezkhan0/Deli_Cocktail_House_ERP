export function formatEventDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function formatTime(value: string | null): string {
  if (!value) {
    return "—";
  }

  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i.exec(value.trim());
  if (!match) {
    return value;
  }

  let hours = Number(match[1]);
  const minutes = match[2];
  const meridiem = match[3];

  if (!meridiem) {
    const period = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${period}`;
  }

  return `${hours}:${minutes} ${meridiem.toUpperCase()}`;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}
