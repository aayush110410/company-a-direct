import { describe, expect, it } from "vitest";
import { formatINR, gstIncludedPaise } from "./money";

describe("formatINR", () => {
  it("formats whole rupees without decimals", () => {
    expect(formatINR(118000)).toBe("₹1,180");
  });
  it("keeps paise when present", () => {
    expect(formatINR(12345)).toBe("₹123.45");
  });
  it("uses Indian digit grouping", () => {
    expect(formatINR(10000000)).toBe("₹1,00,000");
  });
});

describe("gstIncludedPaise", () => {
  it("extracts 5% GST from a GST-inclusive total", () => {
    expect(gstIncludedPaise(118000)).toBe(5619);
    expect(gstIncludedPaise(105000)).toBe(5000);
  });
});
