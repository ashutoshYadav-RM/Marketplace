export type DayHours = {
  dayOfWeek: number; // 0 = Sunday .. 6 = Saturday, matches Postgres/JS getDay()
  isClosed: boolean;
  openTime: string | null; // "HH:MM" or "HH:MM:SS"
  closeTime: string | null;
};

export const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

/**
 * Whether a location is open right now, evaluated in *its* timezone, not
 * the viewer's — a shop in Mumbai is "open" or "closed" on Mumbai time
 * regardless of where the customer loading the page happens to be.
 */
export function isOpenNow(hours: DayHours[], timezone: string, at: Date = new Date()): boolean {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(at);

  const weekdayShort = parts.find((p) => p.type === "weekday")?.value ?? "";
  const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  const nowMinutes = Number(hour) * 60 + Number(minute);

  const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayOfWeek = WEEKDAYS.indexOf(weekdayShort);
  const today = hours.find((h) => h.dayOfWeek === dayOfWeek);
  if (!today || today.isClosed || !today.openTime || !today.closeTime) return false;

  const toMinutes = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  const open = toMinutes(today.openTime);
  const close = toMinutes(today.closeTime);
  // Overnight hours (e.g. 18:00–02:00) wrap past midnight.
  return open <= close ? nowMinutes >= open && nowMinutes < close : nowMinutes >= open || nowMinutes < close;
}
