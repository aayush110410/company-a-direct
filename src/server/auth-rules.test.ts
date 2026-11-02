import { describe, expect, it } from "vitest";
import { homeFor, safeNext } from "./auth-rules";

describe("homeFor", () => {
  it("sends each role to its own screen", () => {
    expect(homeFor("customer")).toBe("/");
    expect(homeFor("kitchen_staff")).toBe("/kitchen");
    expect(homeFor("outlet_manager")).toBe("/kitchen");
    expect(homeFor("admin")).toBe("/admin/menu");
  });
});

describe("safeNext", () => {
  it.each(["https://evil.com", "//evil.com", "/\\evil.com", "/%2F%2Fevil.com", "javascript:alert(1)", "", null])(
    "rejects %s",
    (next) => {
      expect(safeNext(next, "customer")).toBe("/");
    },
  );

  it("keeps a customer on customer pages only", () => {
    expect(safeNext("/checkout", "customer")).toBe("/checkout");
    expect(safeNext("/orders/WEB-778120", "customer")).toBe("/orders/WEB-778120");
    expect(safeNext("/kitchen", "customer")).toBe("/");
    expect(safeNext("/admin/menu", "customer")).toBe("/");
  });

  it("keeps staff on the kitchen and admins on admin or kitchen", () => {
    expect(safeNext("/kitchen", "kitchen_staff")).toBe("/kitchen");
    expect(safeNext("/checkout", "kitchen_staff")).toBe("/kitchen");
    expect(safeNext("/admin/outbox", "admin")).toBe("/admin/outbox");
    expect(safeNext("/kitchen?outlet=kondapur", "admin")).toBe("/kitchen?outlet=kondapur");
  });
});
