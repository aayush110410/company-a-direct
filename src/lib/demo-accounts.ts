/** Seeded reviewer accounts. All share the demo password from `DEMO_USER_PASSWORD`. */
export const DEMO_ACCOUNTS = {
  customer: { email: "customer@example.com", role: "customer", label: "Customer" },
  kitchen: {
    email: "kitchen.kondapur@example.com",
    role: "kitchen_staff",
    outletSlug: "kondapur",
    label: "Kitchen · Kondapur",
  },
  manager: {
    email: "manager.kondapur@example.com",
    role: "outlet_manager",
    outletSlug: "kondapur",
    label: "Manager · Kondapur",
  },
  kitchenGachibowli: {
    email: "kitchen.gachibowli@example.com",
    role: "kitchen_staff",
    outletSlug: "gachibowli-cloud-kitchen",
    label: "Kitchen · Gachibowli",
  },
  admin: { email: "admin@example.com", role: "admin", label: "Admin" },
} as const;

export type DemoKey = keyof typeof DEMO_ACCOUNTS;
