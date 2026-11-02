/** Seed coupons (assumption: the brief asks for coupons but names none). */
export function seedCoupons(now: Date) {
  const day = 86_400_000;
  return [
    {
      code: "DIRECT10",
      kind: "percent" as const,
      value: 10,
      min_order_paise: 30000,
      max_discount_paise: 10000,
      valid_from: new Date(now.getTime() - day).toISOString(),
      valid_to: new Date(now.getTime() + 60 * day).toISOString(),
      per_customer_limit: 20,
      is_active: true,
    },
    {
      code: "FEAST75",
      kind: "flat" as const,
      value: 7500,
      min_order_paise: 69900,
      max_discount_paise: null,
      valid_from: new Date(now.getTime() - day).toISOString(),
      valid_to: new Date(now.getTime() + 60 * day).toISOString(),
      per_customer_limit: 5,
      is_active: true,
    },
    {
      code: "WELCOME",
      kind: "percent" as const,
      value: 20,
      min_order_paise: 0,
      max_discount_paise: 15000,
      valid_from: new Date(now.getTime() - 90 * day).toISOString(),
      valid_to: new Date(now.getTime() - 30 * day).toISOString(),
      per_customer_limit: 1,
      is_active: true,
    },
  ];
}
