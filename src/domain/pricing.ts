/** Server-side cart pricing. Client totals are display only; this is what an order is charged. */

export type CartLine = { itemId: string; portionId: string; qty: number; addonIds: string[] };

export type PriceBook = {
  portions: Record<string, { itemId: string; pricePaise: number }>;
  addons: Record<string, { itemId: string; pricePaise: number }>;
};

export type PricedLine = CartLine & { unitPaise: number; linePaise: number };

export type PriceCartResult =
  | { ok: true; lines: PricedLine[]; subtotalPaise: number }
  | { ok: false; error: "unknown_portion" | "unknown_addon" | "bad_qty" | "empty"; index?: number };

export const MAX_QTY = 20;

export function priceCart(lines: CartLine[], book: PriceBook): PriceCartResult {
  if (lines.length === 0) return { ok: false, error: "empty" };

  const priced: PricedLine[] = [];
  for (const [index, line] of lines.entries()) {
    if (!Number.isInteger(line.qty) || line.qty < 1 || line.qty > MAX_QTY) {
      return { ok: false, error: "bad_qty", index };
    }
    const portion = book.portions[line.portionId];
    if (!portion || portion.itemId !== line.itemId) return { ok: false, error: "unknown_portion", index };

    let unitPaise = portion.pricePaise;
    for (const addonId of line.addonIds) {
      const addon = book.addons[addonId];
      if (!addon || addon.itemId !== line.itemId) return { ok: false, error: "unknown_addon", index };
      unitPaise += addon.pricePaise;
    }
    priced.push({ ...line, unitPaise, linePaise: unitPaise * line.qty });
  }

  return { ok: true, lines: priced, subtotalPaise: priced.reduce((sum, l) => sum + l.linePaise, 0) };
}
