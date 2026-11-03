import { z } from "zod";

/** "+91 98765 43210", "98765-43210", "919876543210" → "+919876543210"; null if not an Indian mobile. */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  const local = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
  return /^[6-9]\d{9}$/.test(local) ? `+91${local}` : null;
}

const id = z.uuid();

const line = z.object({
  itemId: id,
  portionId: id,
  qty: z.number().int().min(1).max(20),
  addonIds: z.array(id).max(8),
});

export const quoteSchema = z.object({
  outletId: id,
  lines: z.array(line).min(1, "Your cart is empty").max(30),
  couponCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{3,16}$/, "That code isn't valid")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  deliveryLat: z.number().min(-90).max(90),
  deliveryLng: z.number().min(-180).max(180),
});

export const placeOrderSchema = quoteSchema.extend({
  address: z.string().trim().min(10, "Add your full address: flat, building and street").max(200),
  phone: z.string().transform((p, ctx) => {
    const n = normalizePhone(p);
    if (!n) {
      ctx.addIssue({ code: "custom", message: "Enter a 10-digit Indian mobile number" });
      return z.NEVER;
    }
    return n;
  }),
  paymentMethod: z.enum(["upi", "card"]),
});

export const paySchema = z.object({
  orderId: z.string().regex(/^WEB-\d{6,}$/),
  outcome: z.enum(["succeed", "fail", "timeout"]),
});
