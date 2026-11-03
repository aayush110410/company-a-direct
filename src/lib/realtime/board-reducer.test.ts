import { describe, expect, it } from "vitest";
import { type BoardOrder, boardReducer } from "./board-reducer";

const order = (id: string, status: BoardOrder["status"] = "placed"): BoardOrder => ({
  id,
  status,
  paidAt: "2026-11-06T14:44:00Z",
  readyBy: "2026-11-06T15:14:00Z",
  promisedAt: "2026-11-06T15:26:00Z",
  travelMinutes: 12,
  items: [{ name: "Chicken dum biryani", portion: "Family pack", qty: 1, addons: [] }],
  confidence: "normal",
  source: "model",
  lateAlerted: false,
});

describe("boardReducer", () => {
  it("replaces everything on a snapshot", () => {
    const s = boardReducer({ a: order("a") }, { type: "snapshot", orders: [order("b")] });
    expect(Object.keys(s)).toEqual(["b"]);
  });

  it("updates a card in place", () => {
    const s = boardReducer({ a: order("a") }, { type: "upsert", order: order("a", "preparing") });
    expect(s.a?.status).toBe("preparing");
  });

  it("drops cards that leave the kitchen", () => {
    for (const status of ["delivered", "cancelled", "expired", "awaiting_payment"] as const) {
      expect(boardReducer({ a: order("a") }, { type: "upsert", order: order("a", status) })).toEqual({});
    }
  });

  it("removes by id", () => {
    expect(boardReducer({ a: order("a"), b: order("b") }, { type: "remove", id: "a" })).toEqual({ b: order("b") });
  });
});
