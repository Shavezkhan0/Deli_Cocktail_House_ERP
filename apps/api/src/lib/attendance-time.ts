export const ATTENDANCE_TIMEZONE = "Asia/Kolkata";

export function istHourMinute(date: Date): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: ATTENDANCE_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return { hour, minute };
}

export function startOfToday(): Date {
  const now = new Date();
  const dateParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ATTENDANCE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = Number(dateParts.find((p) => p.type === "year")?.value);
  const month = Number(dateParts.find((p) => p.type === "month")?.value);
  const day = Number(dateParts.find((p) => p.type === "day")?.value);
  // IST is UTC+5:30 with no DST; midnight IST is 18:30 UTC the previous day.
  return new Date(Date.UTC(year, month - 1, day, -5, -30, 0, 0));
}

export function timeToMinutes(hour: number, minute: number): number {
  return hour * 60 + minute;
}

export function istDayOfWeek(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: ATTENDANCE_TIMEZONE,
    weekday: "short",
  }).formatToParts(date);
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
  const map: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  return map[weekday] ?? -1;
}

export function istDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ATTENDANCE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  return `${year}-${month}-${day}`;
}
