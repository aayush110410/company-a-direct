/** The allergens Company A declares on its menu. */
export const ALLERGENS = ["dairy", "nuts", "gluten", "egg", "fish", "soy", "sesame", "mustard"] as const;
export type Allergen = (typeof ALLERGENS)[number];
