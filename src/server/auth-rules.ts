/** Pure routing rules for roles, shared by the proxy, layouts and sign-in. */

export type Role = "customer" | "kitchen_staff" | "outlet_manager" | "admin";

export function homeFor(role: Role): string {
  switch (role) {
    case "customer":
      return "/";
    case "kitchen_staff":
    case "outlet_manager":
      return "/kitchen";
    case "admin":
      return "/admin/menu";
  }
}

const ALLOWED_PREFIXES: Record<Role, string[]> = {
  customer: ["/o/", "/checkout", "/pay/", "/orders"],
  kitchen_staff: ["/kitchen"],
  outlet_manager: ["/kitchen"],
  admin: ["/admin", "/kitchen"],
};

/** Where to go after sign-in: only same-site paths this role may open; anything else goes home. */
export function safeNext(next: string | null | undefined, role: Role): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return homeFor(role);

  let url: URL;
  try {
    url = new URL(next, "http://same.site");
  } catch {
    return homeFor(role);
  }
  if (url.origin !== "http://same.site") return homeFor(role);

  const path = url.pathname;
  const allowed = (role === "customer" && path === "/") || ALLOWED_PREFIXES[role].some((p) => path === p || path.startsWith(p));
  return allowed ? `${path}${url.search}` : homeFor(role);
}
