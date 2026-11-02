import { describe, expect, it } from "vitest";
import { formatIstTime, istClock } from "./time";

describe("istClock", () => {
  it("converts UTC to IST day and minutes", () => {
    // 14:00 UTC Friday = 19:30 IST Friday
    expect(istClock(new Date("2026-11-06T14:00:00Z"))).toEqual({ day: 5, minutes: 1170 });
  });

  it("rolls over to the next IST day after 18:30 UTC", () => {
    // 18:45 UTC Friday = 00:15 IST Saturday
    expect(istClock(new Date("2026-11-06T18:45:00Z"))).toEqual({ day: 6, minutes: 15 });
  });
});

describe("formatIstTime", () => {
  it("formats as h:mm am/pm in IST", () => {
    expect(formatIstTime(new Date("2026-11-06T15:32:00Z"))).toBe("9:02 pm");
    expect(formatIstTime(new Date("2026-11-06T04:05:00Z"))).toBe("9:35 am");
    expect(formatIstTime(new Date("2026-11-06T06:30:00Z"))).toBe("12:00 pm");
  });
});
