import { isWithinSchedule, nextOpeningLabel, type Schedule } from "./schedule";

export type AvailabilityStatus = "available" | "out_of_stock" | "hidden";

export type ItemAvailability =
  | { state: "available" }
  | { state: "out_of_stock" }
  | { state: "hidden" }
  | { state: "off_schedule"; label: string };

/** Combines the central menu (active, schedule) with the outlet's own stock switch. */
export function itemAvailability(
  input: { status: AvailabilityStatus | null; schedule: Schedule | null; isActive: boolean },
  now: Date,
): ItemAvailability {
  if (!input.isActive || input.status === "hidden") return { state: "hidden" };
  if (input.status === "out_of_stock") return { state: "out_of_stock" };
  if (input.schedule && !isWithinSchedule(input.schedule, now)) {
    return { state: "off_schedule", label: nextOpeningLabel(input.schedule, now) };
  }
  return { state: "available" };
}

export function isOrderable(a: ItemAvailability): boolean {
  return a.state === "available";
}
