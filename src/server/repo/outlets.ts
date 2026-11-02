import type { OutletGeo } from "@/domain/geo";
import { createServerClient } from "../supabase/server";

export type OutletSummary = OutletGeo & {
  slug: string;
  name: string;
  area: string;
  kind: "outlet" | "cloud_kitchen";
  fssaiLicence: string;
  cityId: string;
  citySlug: string;
  minPromiseMinutes: number;
  capacitySlots: number;
};

const COLUMNS =
  "id, slug, name, area, kind, lat, lng, delivery_radius_km, is_accepting_orders, fssai_licence, city_id, min_promise_minutes, capacity_slots, cities(slug)";

type Row = {
  id: string;
  slug: string;
  name: string;
  area: string;
  kind: "outlet" | "cloud_kitchen";
  lat: number;
  lng: number;
  delivery_radius_km: number;
  is_accepting_orders: boolean;
  fssai_licence: string;
  city_id: string;
  min_promise_minutes: number;
  capacity_slots: number;
  cities: { slug: string } | null;
};

export function toOutletSummary(r: Row): OutletSummary {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    area: r.area,
    kind: r.kind,
    lat: r.lat,
    lng: r.lng,
    radiusKm: Number(r.delivery_radius_km),
    isAcceptingOrders: r.is_accepting_orders,
    fssaiLicence: r.fssai_licence,
    cityId: r.city_id,
    citySlug: r.cities?.slug ?? "",
    minPromiseMinutes: r.min_promise_minutes,
    capacitySlots: r.capacity_slots,
  };
}

export async function getOutlets(): Promise<OutletSummary[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase.from("outlets").select(COLUMNS).order("name");
  if (error) throw new Error(`load outlets: ${error.message}`);
  return (data as unknown as Row[]).map(toOutletSummary);
}

export async function getOutletBySlug(slug: string): Promise<OutletSummary | null> {
  const supabase = await createServerClient();
  const { data } = await supabase.from("outlets").select(COLUMNS).eq("slug", slug).maybeSingle();
  return data ? toOutletSummary(data as unknown as Row) : null;
}

export async function getOutletById(id: string): Promise<OutletSummary | null> {
  const supabase = await createServerClient();
  const { data } = await supabase.from("outlets").select(COLUMNS).eq("id", id).maybeSingle();
  return data ? toOutletSummary(data as unknown as Row) : null;
}
