import { PHOTOS } from "./photos";

export type SeedDiet = "veg" | "non_veg" | "egg";

export type SeedItem = {
  slug: string;
  name: string;
  category: string;
  description: string;
  diet: SeedDiet;
  spice: 0 | 1 | 2 | 3;
  allergens: string[];
  /** Minutes of cooking for one standard portion. */
  basePrep: number;
  schedule?: "evenings";
  /** Hyderabad prices in rupees, GST included. Bengaluru is derived. */
  portions: { name: string; multiplier: number; hyderabad: number }[];
  addons?: { name: string; rupees: number; diet: SeedDiet }[];
  photo: { url: string; credit: string };
};

export const CATEGORIES = [
  { slug: "biryani", name: "Biryani", sort: 1 },
  { slug: "haleem", name: "Haleem", sort: 2 },
  { slug: "starters", name: "Starters", sort: 3 },
  { slug: "sides", name: "Sides", sort: 4 },
  { slug: "desserts", name: "Desserts", sort: 5 },
  { slug: "drinks", name: "Drinks", sort: 6 },
] as const;

/** Haleem is an evening dish (assumption, labelled in the TDD). */
export const SCHEDULES = [{ name: "evenings", days: [0, 1, 2, 3, 4, 5, 6], startsAt: "17:00", endsAt: "23:59" }] as const;

/** Bengaluru outlets charge about 8% more, rounded to the nearest ₹10 (assumption A2). */
export function bengaluruRupees(hyderabad: number): number {
  return Math.round((hyderabad * 1.08) / 10) * 10;
}

/** Stable key for a portion before it has a database id. */
export const portionKey = (slug: string, portion: string) => `${slug}:${portion}`;

const biryaniAddons = (meat: boolean): SeedItem["addons"] => [
  { name: "Extra mirchi ka salan", rupees: 40, diet: "veg" },
  { name: "Extra dahi chutney", rupees: 30, diet: "veg" },
  { name: "Boiled egg", rupees: 20, diet: "egg" },
  ...(meat ? [{ name: "Extra leg piece", rupees: 120, diet: "non_veg" as const }] : []),
];

const single = (hyderabad: number) => [{ name: "Single", multiplier: 1, hyderabad }];
const biryaniPortions = (singleRs: number, familyRs: number) => [
  { name: "Single", multiplier: 1, hyderabad: singleRs },
  { name: "Family pack", multiplier: 1.6, hyderabad: familyRs },
];

const photo = (slug: string) => PHOTOS[slug] ?? { url: "", credit: "" };

const items: Omit<SeedItem, "photo">[] = [
  {
    slug: "chicken-dum-biryani",
    name: "Chicken dum biryani",
    category: "biryani",
    description: "Aged basmati layered over yoghurt-marinated chicken, sealed with dough and slow-cooked on dum.",
    diet: "non_veg",
    spice: 2,
    allergens: ["dairy", "nuts"],
    basePrep: 18,
    portions: biryaniPortions(340, 980),
    addons: biryaniAddons(true),
  },
  {
    slug: "mutton-dum-biryani",
    name: "Mutton dum biryani",
    category: "biryani",
    description: "Tender goat on the bone, kachchi-style: raw marinade and rice cooked together under the seal.",
    diet: "non_veg",
    spice: 2,
    allergens: ["dairy", "nuts"],
    basePrep: 18,
    portions: biryaniPortions(420, 1180),
    addons: biryaniAddons(true),
  },
  {
    slug: "veg-biryani",
    name: "Veg biryani",
    category: "biryani",
    description: "Seasonal vegetables, saffron and fried onions, layered and finished on dum.",
    diet: "veg",
    spice: 1,
    allergens: ["dairy", "nuts"],
    basePrep: 18,
    portions: biryaniPortions(280, 760),
    addons: biryaniAddons(false),
  },
  {
    slug: "egg-biryani",
    name: "Egg biryani",
    category: "biryani",
    description: "Masala-roasted boiled eggs buried in fragrant biryani rice.",
    diet: "egg",
    spice: 2,
    allergens: ["dairy", "egg", "nuts"],
    basePrep: 18,
    portions: biryaniPortions(300, 820),
    addons: biryaniAddons(false),
  },
  {
    slug: "mutton-haleem",
    name: "Mutton haleem",
    category: "haleem",
    description: "Goat, broken wheat and lentils pounded for hours into a silky stew, topped with birista and lime.",
    diet: "non_veg",
    spice: 1,
    allergens: ["gluten", "dairy", "nuts"],
    basePrep: 6,
    schedule: "evenings",
    portions: single(350),
  },
  {
    slug: "chicken-65",
    name: "Chicken 65",
    category: "starters",
    description: "Fiery fried chicken tossed with curry leaves and green chilli.",
    diet: "non_veg",
    spice: 3,
    allergens: ["gluten", "dairy"],
    basePrep: 12,
    portions: single(320),
  },
  {
    slug: "apollo-fish",
    name: "Apollo fish",
    category: "starters",
    description: "Hyderabad's own: boneless fish fried crisp, then tossed in a tangy chilli-garlic glaze.",
    diet: "non_veg",
    spice: 3,
    allergens: ["fish", "gluten", "egg"],
    basePrep: 12,
    portions: single(380),
  },
  {
    slug: "paneer-65",
    name: "Paneer 65",
    category: "starters",
    description: "Cottage cheese in the classic 65 spice crust, finished with curry leaves.",
    diet: "veg",
    spice: 2,
    allergens: ["dairy", "gluten"],
    basePrep: 12,
    portions: single(290),
  },
  {
    slug: "mirchi-ka-salan",
    name: "Mirchi ka salan",
    category: "sides",
    description: "Long green chillies in a peanut, sesame and tamarind gravy — biryani's partner.",
    diet: "veg",
    spice: 2,
    allergens: ["nuts", "sesame"],
    basePrep: 3,
    portions: single(80),
  },
  {
    slug: "dahi-chutney",
    name: "Dahi chutney",
    category: "sides",
    description: "Cool whipped yoghurt with onion, mint and green chilli.",
    diet: "veg",
    spice: 0,
    allergens: ["dairy"],
    basePrep: 3,
    portions: single(40),
  },
  {
    slug: "bagara-baingan",
    name: "Bagara baingan",
    category: "sides",
    description: "Baby brinjals in a roasted peanut, coconut and sesame masala.",
    diet: "veg",
    spice: 2,
    allergens: ["nuts", "sesame"],
    basePrep: 3,
    portions: single(180),
  },
  {
    slug: "double-ka-meetha",
    name: "Double ka meetha",
    category: "desserts",
    description: "Fried bread soaked in saffron syrup and reduced milk, with almonds.",
    diet: "veg",
    spice: 0,
    allergens: ["gluten", "dairy", "nuts"],
    basePrep: 4,
    portions: single(100),
  },
  {
    slug: "qubani-ka-meetha",
    name: "Qubani ka meetha",
    category: "desserts",
    description: "Stewed dried apricots with fresh cream — a Hyderabadi wedding dessert.",
    diet: "veg",
    spice: 0,
    allergens: ["dairy", "nuts"],
    basePrep: 4,
    portions: single(140),
  },
  {
    slug: "phirni",
    name: "Phirni",
    category: "desserts",
    description: "Ground-rice pudding set in a clay cup, with cardamom and pistachio.",
    diet: "veg",
    spice: 0,
    allergens: ["dairy", "nuts"],
    basePrep: 4,
    portions: single(90),
  },
  {
    slug: "irani-chai",
    name: "Irani chai",
    category: "drinks",
    description: "Strong, sweet and creamy, brewed the Irani café way.",
    diet: "veg",
    spice: 0,
    allergens: ["dairy"],
    basePrep: 3,
    portions: single(40),
  },
  {
    slug: "fresh-lime-soda",
    name: "Fresh lime soda",
    category: "drinks",
    description: "Fresh lime with soda, sweet or salted.",
    diet: "veg",
    spice: 0,
    allergens: [],
    basePrep: 3,
    portions: single(70),
  },
];

export const MENU: SeedItem[] = items.map((item) => ({ ...item, photo: photo(item.slug) }));
