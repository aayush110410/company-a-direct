import { cn } from "@/lib/cn";

export type Diet = "veg" | "non_veg" | "egg";

const LABELS: Record<Diet, string> = {
  veg: "Vegetarian",
  non_veg: "Non-vegetarian",
  egg: "Contains egg",
};

/**
 * FSSAI-style food marks: green square with a dot for veg, brown square with a triangle
 * for non-veg (egg dishes are non-veg under FSSAI rules). Shape differs, not just colour.
 */
export function DietMark({ diet, size = 16, className }: { diet: Diet; size?: number; className?: string }) {
  const colour = diet === "veg" ? "var(--color-veg)" : "var(--color-nonveg)";
  return (
    <svg
      role="img"
      aria-label={LABELS[diet]}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      className={cn("shrink-0", className)}
    >
      <title>{LABELS[diet]}</title>
      <rect x="0.75" y="0.75" width="14.5" height="14.5" rx="2" fill="#ffffff" stroke={colour} strokeWidth="1.5" />
      {diet === "veg" ? <circle cx="8" cy="8" r="3.6" fill={colour} /> : <polygon points="8,3.6 12.4,11.6 3.6,11.6" fill={colour} />}
    </svg>
  );
}
