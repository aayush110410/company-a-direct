/**
 * Delivery areas customers can pick when they would rather not share their location.
 * Shamshabad is deliberately outside every outlet's radius to show the out-of-range state.
 */
export type Area = { slug: string; name: string; city: "hyderabad" | "bengaluru"; lat: number; lng: number };

export const AREAS: Area[] = [
  { slug: "kondapur", name: "Kondapur", city: "hyderabad", lat: 17.4655, lng: 78.3615 },
  { slug: "hitech-city", name: "HITEC City", city: "hyderabad", lat: 17.4474, lng: 78.3762 },
  { slug: "gachibowli", name: "Gachibowli", city: "hyderabad", lat: 17.4401, lng: 78.3489 },
  { slug: "kukatpally", name: "Kukatpally", city: "hyderabad", lat: 17.4948, lng: 78.3996 },
  { slug: "jubilee-hills", name: "Jubilee Hills", city: "hyderabad", lat: 17.4326, lng: 78.4071 },
  { slug: "banjara-hills", name: "Banjara Hills", city: "hyderabad", lat: 17.4156, lng: 78.4347 },
  { slug: "ameerpet", name: "Ameerpet", city: "hyderabad", lat: 17.4375, lng: 78.4483 },
  { slug: "begumpet", name: "Begumpet", city: "hyderabad", lat: 17.4447, lng: 78.4664 },
  { slug: "secunderabad", name: "Secunderabad", city: "hyderabad", lat: 17.4399, lng: 78.4983 },
  { slug: "himayatnagar", name: "Himayatnagar", city: "hyderabad", lat: 17.401, lng: 78.487 },
  { slug: "tolichowki", name: "Tolichowki", city: "hyderabad", lat: 17.3986, lng: 78.4167 },
  { slug: "old-city", name: "Old City (Charminar)", city: "hyderabad", lat: 17.3616, lng: 78.4747 },
  { slug: "dilsukhnagar", name: "Dilsukhnagar", city: "hyderabad", lat: 17.3687, lng: 78.5247 },
  { slug: "lb-nagar", name: "LB Nagar", city: "hyderabad", lat: 17.3457, lng: 78.5522 },
  { slug: "miyapur", name: "Miyapur", city: "hyderabad", lat: 17.4969, lng: 78.3577 },
  { slug: "kompally", name: "Kompally", city: "hyderabad", lat: 17.536, lng: 78.484 },
  { slug: "shamshabad", name: "Shamshabad", city: "hyderabad", lat: 17.2403, lng: 78.4294 },
  { slug: "indiranagar", name: "Indiranagar", city: "bengaluru", lat: 12.9719, lng: 77.6412 },
  { slug: "koramangala", name: "Koramangala", city: "bengaluru", lat: 12.9352, lng: 77.6245 },
  { slug: "whitefield", name: "Whitefield", city: "bengaluru", lat: 12.9698, lng: 77.75 },
];
