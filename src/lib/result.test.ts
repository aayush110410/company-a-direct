import { describe, expect, it } from "vitest";
import { fail, ok } from "./result";

describe("ActionResult helpers", () => {
  it("wraps data in an ok result", () => {
    expect(ok(5)).toEqual({ ok: true, data: 5 });
  });

  it("builds a failure with field and details", () => {
    expect(fail("Nope", "code", { a: 1 })).toEqual({
      ok: false,
      error: "Nope",
      field: "code",
      details: { a: 1 },
    });
  });

  it("omits field and details when not given", () => {
    expect(fail("Nope")).toEqual({ ok: false, error: "Nope" });
  });
});
