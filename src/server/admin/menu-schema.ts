import { z } from "zod";
import { ALLERGENS } from "@/domain/allergens";

export { ALLERGENS };

/** Validates a menu item from the admin editor. Prices are entered in rupees; every city needs one. */
export function makeMenuItemSchema(cityIds: string[]) {
  const diet = z.enum(["veg", "non_veg", "egg"]);
  return z.object({
    id: z.uuid().optional(),
    name: z.string().trim().min(2, "Give the dish a name").max(60),
    description: z.string().trim().max(160, "Keep the description under 160 characters"),
    diet,
    spiceLevel: z.number().int().min(0).max(3),
    allergens: z.array(z.enum(ALLERGENS)).max(ALLERGENS.length),
    basePrepMinutes: z.number().int().min(1, "Prep time must be at least a minute").max(90),
    categoryId: z.uuid(),
    scheduleId: z.uuid().nullable(),
    photoUrl: z.url("Add a photo"),
    photoCredit: z.string().trim().max(80).default(""),
    portions: z
      .array(
        z
          .object({
            id: z.uuid().optional(),
            name: z.string().trim().min(1).max(30),
            prepMultiplier: z.number().min(0.5).max(3),
            prices: z.record(z.string(), z.number().int().min(1, "Prices must be at least ₹1").max(10_000)),
          })
          .superRefine((p, ctx) => {
            const missing = cityIds.filter((c) => p.prices[c] === undefined);
            if (missing.length) ctx.addIssue({ code: "custom", message: `Set a price for every city (${p.name})`, path: ["prices"] });
          }),
      )
      .min(1, "Add at least one portion")
      .max(4, "Four portions at most"),
    addons: z
      .array(z.object({ id: z.uuid().optional(), name: z.string().trim().min(1).max(40), priceRupees: z.number().int().min(0).max(2000), diet }))
      .max(8),
  });
}

export type MenuItemInput = z.infer<ReturnType<typeof makeMenuItemSchema>>;
