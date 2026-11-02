/**
 * Outlet matching by straight-line distance (assumption A6: no paid maps API).
 * Travel time is a rough rider estimate used in the delivery promise.
 */

export type LatLng = { lat: number; lng: number };
export type OutletGeo = LatLng & { id: string; radiusKm: number; isAcceptingOrders: boolean };

export type OutletMatch =
  | { kind: "match"; outletId: string; distanceKm: number }
  | { kind: "out_of_range"; nearestOutletId: string; distanceKm: number }
  | { kind: "none" };

const EARTH_RADIUS_KM = 6371;
const toRad = (deg: number) => (deg * Math.PI) / 180;

export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** 4 min per km plus 6 min pickup and handover, capped at 45 min. */
export function travelMinutes(km: number): number {
  return Math.min(Math.round(4 * km + 6), 45);
}

export function matchOutlet(point: LatLng, outlets: OutletGeo[]): OutletMatch {
  const ranked = outlets
    .filter((o) => o.isAcceptingOrders)
    .map((o) => ({ outlet: o, distanceKm: haversineKm(point, o) }))
    .sort((a, b) => a.distanceKm - b.distanceKm);

  const nearest = ranked[0];
  if (!nearest) return { kind: "none" };

  const inRange = ranked.find((r) => r.distanceKm <= r.outlet.radiusKm);
  if (inRange) return { kind: "match", outletId: inRange.outlet.id, distanceKm: round1(inRange.distanceKm) };
  return { kind: "out_of_range", nearestOutletId: nearest.outlet.id, distanceKm: round1(nearest.distanceKm) };
}

const round1 = (n: number) => Math.round(n * 10) / 10;
