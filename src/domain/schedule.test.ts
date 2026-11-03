import { describe, expect, it } from "vitest";
import { clockLabel, isOutletOpen, isWithinSchedule, nextOpeningLabel, type Schedule } from "./schedule";

const everyDay = [0, 1, 2, 3, 4, 5, 6];
const evenings: Schedule = { days: everyDay, startsAt: "17:00", endsAt: "23:59" };
// IST = UTC + 5:30
const ist = (hhmm: string, date = "2026-11-06") => {
  const [h, m] = hhmm.split(":").map(Number);
  return new Date(Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)), h! - 5, m! - 30));
};

describe("isWithinSchedule", () => {
  it("treats no schedule as all day", () => {
    expect(isWithinSchedule(null, ist("03:00"))).toBe(true);
  });
  it("opens at the start minute", () => {
    expect(isWithinSchedule(evenings, ist("16:59"))).toBe(false);
    expect(isWithinSchedule(evenings, ist("17:00"))).toBe(true);
    expect(isWithinSchedule(evenings, ist("23:59"))).toBe(true);
  });
  it("supports windows that run past midnight, keyed to the start day", () => {
    const lateFriday: Schedule = { days: [5], startsAt: "22:00", endsAt: "02:00" };
    expect(isWithinSchedule(lateFriday, ist("23:00", "2026-11-06"))).toBe(true); // Friday
    expect(isWithinSchedule(lateFriday, ist("01:30", "2026-11-07"))).toBe(true); // early Saturday
    expect(isWithinSchedule(lateFriday, ist("01:30", "2026-11-06"))).toBe(false); // early Friday = Thursday's window
  });
  it("respects the day list", () => {
    const weekends: Schedule = { days: [0, 6], startsAt: "12:00", endsAt: "15:00" };
    expect(isWithinSchedule(weekends, ist("13:00", "2026-11-06"))).toBe(false); // Friday
    expect(isWithinSchedule(weekends, ist("13:00", "2026-11-07"))).toBe(true); // Saturday
  });
});

describe("nextOpeningLabel", () => {
  it("names the opening time", () => {
    expect(nextOpeningLabel(evenings, ist("16:59"))).toBe("Available from 5:00 pm");
  });
});

describe("isOutletOpen", () => {
  const usual = { opensAt: "11:00:00", closesAt: "23:59:00" };

  it("is open between opening and closing, IST", () => {
    expect(isOutletOpen(usual, ist("21:00"))).toBe(true);
    expect(isOutletOpen(usual, ist("11:00"))).toBe(true);
  });

  it("is closed before opening", () => {
    expect(isOutletOpen(usual, ist("10:30"))).toBe(false);
    expect(isOutletOpen(usual, ist("03:00"))).toBe(false);
  });

  it("handles a kitchen that closes after midnight", () => {
    const late = { opensAt: "18:00", closesAt: "02:00" };
    expect(isOutletOpen(late, ist("00:30"))).toBe(true);
    expect(isOutletOpen(late, ist("02:30"))).toBe(false);
  });
});

describe("clockLabel", () => {
  it("reads a database time the way the rest of the site does", () => {
    expect(clockLabel("11:00:00")).toBe("11:00 am");
    expect(clockLabel("17:30")).toBe("5:30 pm");
    expect(clockLabel("00:15")).toBe("12:15 am");
  });
});
