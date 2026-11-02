/**
 * 14 outlets and 3 cloud kitchens (from the brief). City split, coordinates, radii and FSSAI
 * numbers are assumptions (A2): coordinates are the real neighbourhoods; licence numbers are
 * synthetic (99… prefix) and must be replaced with real ones before launch.
 */
export const CITIES = [
  { slug: "hyderabad", name: "Hyderabad" },
  { slug: "bengaluru", name: "Bengaluru" },
] as const;

type SeedOutlet = {
  slug: string;
  name: string;
  city: "hyderabad" | "bengaluru";
  kind: "outlet" | "cloud_kitchen";
  area: string;
  lat: number;
  lng: number;
};

const raw: SeedOutlet[] = [
  { slug: "kondapur", name: "Kondapur", city: "hyderabad", kind: "outlet", area: "Kondapur", lat: 17.47, lng: 78.357 },
  { slug: "kukatpally", name: "Kukatpally", city: "hyderabad", kind: "outlet", area: "Kukatpally", lat: 17.4948, lng: 78.3996 },
  { slug: "madhapur", name: "Madhapur", city: "hyderabad", kind: "outlet", area: "Madhapur", lat: 17.4483, lng: 78.3915 },
  { slug: "banjara-hills", name: "Banjara Hills", city: "hyderabad", kind: "outlet", area: "Banjara Hills", lat: 17.4156, lng: 78.4347 },
  { slug: "ameerpet", name: "Ameerpet", city: "hyderabad", kind: "outlet", area: "Ameerpet", lat: 17.4375, lng: 78.4483 },
  { slug: "secunderabad", name: "Secunderabad", city: "hyderabad", kind: "outlet", area: "Secunderabad", lat: 17.4399, lng: 78.4983 },
  { slug: "dilsukhnagar", name: "Dilsukhnagar", city: "hyderabad", kind: "outlet", area: "Dilsukhnagar", lat: 17.3687, lng: 78.5247 },
  { slug: "himayatnagar", name: "Himayatnagar", city: "hyderabad", kind: "outlet", area: "Himayatnagar", lat: 17.401, lng: 78.487 },
  { slug: "mehdipatnam", name: "Mehdipatnam", city: "hyderabad", kind: "outlet", area: "Mehdipatnam", lat: 17.395, lng: 78.44 },
  { slug: "miyapur", name: "Miyapur", city: "hyderabad", kind: "outlet", area: "Miyapur", lat: 17.4969, lng: 78.3577 },
  { slug: "charminar", name: "Charminar", city: "hyderabad", kind: "outlet", area: "Old City", lat: 17.3616, lng: 78.4747 },
  { slug: "gachibowli-cloud-kitchen", name: "Gachibowli cloud kitchen", city: "hyderabad", kind: "cloud_kitchen", area: "Gachibowli", lat: 17.4401, lng: 78.3489 },
  { slug: "kompally-cloud-kitchen", name: "Kompally cloud kitchen", city: "hyderabad", kind: "cloud_kitchen", area: "Kompally", lat: 17.536, lng: 78.484 },
  { slug: "lb-nagar-cloud-kitchen", name: "LB Nagar cloud kitchen", city: "hyderabad", kind: "cloud_kitchen", area: "LB Nagar", lat: 17.3457, lng: 78.5522 },
  { slug: "indiranagar", name: "Indiranagar", city: "bengaluru", kind: "outlet", area: "Indiranagar", lat: 12.9719, lng: 77.6412 },
  { slug: "koramangala", name: "Koramangala", city: "bengaluru", kind: "outlet", area: "Koramangala", lat: 12.9352, lng: 77.6245 },
  { slug: "whitefield", name: "Whitefield", city: "bengaluru", kind: "outlet", area: "Whitefield", lat: 12.9698, lng: 77.75 },
];

export const OUTLETS = raw.map((o, i) => ({
  ...o,
  deliveryRadiusKm: o.kind === "cloud_kitchen" ? 7 : 5,
  fssaiLicence: `990000000${String(101 + i).padStart(5, "0")}`,
  minPromiseMinutes: 35,
  capacitySlots: o.kind === "cloud_kitchen" ? 6 : 4,
}));
