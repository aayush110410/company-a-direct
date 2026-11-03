/** Money is integer paise everywhere; these helpers are the only place it becomes text. */

const rupees = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 0 });

/** ₹1,180 · ₹123.45 · ₹1,00,000 (Indian digit grouping). */
export function formatINR(paise: number): string {
  const value = paise / 100;
  const text = Number.isInteger(value)
    ? rupees.format(value)
    : new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  return `₹${text}`;
}

/** Menu prices include 5% GST; this is the GST portion of a GST-inclusive total. */
export function gstIncludedPaise(totalPaise: number): number {
  return Math.round((totalPaise * 5) / 105);
}
