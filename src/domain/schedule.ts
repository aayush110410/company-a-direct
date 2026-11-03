import { formatIstTime, istClock } from "./time";

/** A time-based menu window in IST. `days` (0 = Sunday) name the day the window starts. */
export type Schedule = { days: number[]; startsAt: string; endsAt: string };

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

export function isWithinSchedule(s: Schedule | null, now: Date): boolean {
  if (!s) return true;
  const { day, minutes } = istClock(now);
  const start = toMinutes(s.startsAt);
  const end = toMinutes(s.endsAt);

  if (start <= end) return s.days.includes(day) && minutes >= start && minutes <= end;
  // Overnight window: the late part belongs to today's start, the early part to yesterday's.
  if (minutes >= start) return s.days.includes(day);
  return minutes <= end && s.days.includes((day + 6) % 7);
}

/** "Available from 5:00 pm" — the start time is the same every day it runs. */
export function nextOpeningLabel(s: Schedule, now: Date): string {
  const start = toMinutes(s.startsAt);
  const at = new Date(now);
  // Build a Date whose IST clock reads the start time, so formatting stays in one place.
  const { minutes } = istClock(now);
  at.setTime(now.getTime() + (start - minutes) * 60_000);
  return `Available from ${formatIstTime(at)}`;
}

const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];

/** Outlet hours in IST. A closing time earlier than the opening time runs past midnight. */
export function isOutletOpen(hours: { opensAt: string; closesAt: string }, now: Date): boolean {
  return isWithinSchedule({ days: EVERY_DAY, startsAt: hours.opensAt, endsAt: hours.closesAt }, now);
}

/** A wall-clock time ("11:00:00") in the site's format ("11:00 am"). */
export function clockLabel(hhmm: string): string {
  const total = toMinutes(hhmm);
  const h = Math.floor(total / 60);
  return `${h % 12 || 12}:${String(total % 60).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
}
