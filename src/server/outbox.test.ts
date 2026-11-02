import { describe, expect, it } from "vitest";
import { canSend, maskPhone } from "./outbox";

describe("maskPhone", () => {
  it("keeps the first digit and last three", () => {
    expect(maskPhone("+919000000001")).toBe("+91 9XXXX XX001");
  });
});

describe("canSend", () => {
  it("always allows order updates", () => {
    expect(canSend("transactional", false)).toBe(true);
  });
  it("only sends marketing to customers who opted in (DPDP)", () => {
    expect(canSend("marketing", false)).toBe(false);
    expect(canSend("marketing", true)).toBe(true);
  });
});
