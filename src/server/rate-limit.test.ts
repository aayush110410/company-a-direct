import { describe, expect, it } from "vitest";
import { clientIp, rateLimit } from "./rate-limit";

describe("rateLimit", () => {
  it("allows up to the limit inside the window, then blocks", () => {
    const key = `t-${Math.random()}`;
    for (let i = 0; i < 5; i++) expect(rateLimit(key, 5, 60_000, 1_000 + i).allowed).toBe(true);
    const blocked = rateLimit(key, 5, 60_000, 1_010);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it("allows again once the window has passed", () => {
    const key = `t-${Math.random()}`;
    for (let i = 0; i < 5; i++) rateLimit(key, 5, 60_000, 1_000);
    expect(rateLimit(key, 5, 60_000, 61_001).allowed).toBe(true);
  });

  it("keeps keys independent", () => {
    const a = `a-${Math.random()}`;
    const b = `b-${Math.random()}`;
    for (let i = 0; i < 5; i++) rateLimit(a, 5, 60_000, 1_000);
    expect(rateLimit(b, 5, 60_000, 1_000).allowed).toBe(true);
  });
});

describe("clientIp", () => {
  it("takes the first x-forwarded-for hop", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe("203.0.113.7");
  });
  it("falls back when no header is present", () => {
    expect(clientIp(new Headers())).toBe("unknown");
  });
});
