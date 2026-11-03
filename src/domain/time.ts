/**
 * All business rules run on Indian Standard Time, whatever the server's zone.
 * Domain code receives `now` as a parameter and uses these helpers to read it.
 */
export const IST = "Asia/Kolkata";

const DAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

const clockFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: IST,
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const timeFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: IST,
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

/** Day of week (0 = Sunday) and minutes since midnight, in IST. */
export function istClock(now: Date): { day: number; minutes: number } {
  const parts = Object.fromEntries(clockFormat.formatToParts(now).map((p) => [p.type, p.value]));
  const day = DAY_INDEX[parts.weekday ?? ""];
  if (day === undefined) throw new Error(`Unrecognised weekday: ${parts.weekday}`);
  return { day, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
}

/** "9:02 pm" style label in IST. */
export function formatIstTime(d: Date): string {
  return timeFormat.format(d).replace(/\s?([AP])M$/i, (_, m: string) => ` ${m.toLowerCase()}m`);
}
