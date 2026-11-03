"use client";

import { useEffect, useState } from "react";
import type { AvailabilityStatus } from "@/domain/availability";
import { createBrowserClient } from "@/server/supabase/browser";
import { subscribeTable } from "./channel";

/** Live per-outlet stock switches: when a kitchen marks an item out, every open menu greys it. */
export function useLiveAvailability(outletId: string, initial: Record<string, AvailabilityStatus>) {
  const [stock, setStock] = useState(initial);

  useEffect(() => {
    return subscribeTable<{ outlet_id: string; item_id: string; status: AvailabilityStatus }>(createBrowserClient(), {
      channel: `menu-stock:${outletId}`,
      table: "outlet_item_availability",
      filter: `outlet_id=eq.${outletId}`,
      onChange: ({ new: row }) => {
        if (!row || row.outlet_id !== outletId) return;
        setStock((s) => ({ ...s, [row.item_id]: row.status }));
      },
      onStatus: () => {},
    });
  }, [outletId]);

  return stock;
}
