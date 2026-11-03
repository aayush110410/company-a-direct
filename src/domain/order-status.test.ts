import { describe, expect, it } from "vitest";
import { canTransition, KITCHEN_COLUMNS, kitchenActionLabel, nextKitchenStatus } from "./order-status";

describe("canTransition", () => {
  it("lets kitchen staff walk the prep path in order", () => {
    expect(canTransition("placed", "preparing", "kitchen_staff")).toBe(true);
    expect(canTransition("preparing", "ready", "kitchen_staff")).toBe(true);
    expect(canTransition("ready", "handed_to_rider", "kitchen_staff")).toBe(true);
  });
  it("never moves an order backwards or skips stages", () => {
    expect(canTransition("ready", "preparing", "outlet_manager")).toBe(false);
    expect(canTransition("placed", "ready", "kitchen_staff")).toBe(false);
  });
  it("lets staff cancel only before the food is ready", () => {
    expect(canTransition("preparing", "cancelled", "kitchen_staff")).toBe(true);
    expect(canTransition("ready", "cancelled", "kitchen_staff")).toBe(false);
  });
  it("reserves payment, expiry and delivery for the system", () => {
    expect(canTransition("awaiting_payment", "placed", "system")).toBe(true);
    expect(canTransition("awaiting_payment", "expired", "system")).toBe(true);
    expect(canTransition("handed_to_rider", "delivered", "system")).toBe(true);
    expect(canTransition("awaiting_payment", "placed", "kitchen_staff")).toBe(false);
    expect(canTransition("handed_to_rider", "delivered", "kitchen_staff")).toBe(false);
  });
  it("gives customers no transitions", () => {
    expect(canTransition("placed", "cancelled", "customer")).toBe(false);
    expect(canTransition("awaiting_payment", "placed", "customer")).toBe(false);
  });
});

describe("kitchen helpers", () => {
  it("names the next step and its button", () => {
    expect(nextKitchenStatus("placed")).toBe("preparing");
    expect(kitchenActionLabel("placed")).toBe("Start");
    expect(kitchenActionLabel("preparing")).toBe("Mark ready");
    expect(kitchenActionLabel("ready")).toBe("Hand to rider");
    expect(nextKitchenStatus("handed_to_rider")).toBeNull();
    expect(kitchenActionLabel("handed_to_rider")).toBeNull();
  });
  it("defines the four board columns", () => {
    expect(KITCHEN_COLUMNS.map((c) => c.title)).toEqual(["New", "Preparing", "Ready for pickup", "With rider"]);
  });
});
