import { redirect } from "next/navigation";
import { cache } from "react";
import { type ActionResult, fail, ok } from "@/lib/result";
import { homeFor, type Role } from "./auth-rules";
import { createServerClient } from "./supabase/server";

export { homeFor, type Role, safeNext } from "./auth-rules";

export type Session = {
  userId: string;
  email: string;
  role: Role;
  outletId: string | null;
  fullName: string;
  phone: string | null;
};

/** The signed-in user from a verified JWT (getClaims), with role and outlet from their profile. */
export const getSession = cache(async (): Promise<Session | null> => {
  const supabase = await createServerClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, outlet_id, full_name, phone")
    .eq("id", data.claims.sub)
    .maybeSingle();
  if (!profile) return null;

  return {
    userId: data.claims.sub,
    email: (data.claims.email as string | undefined) ?? "",
    role: profile.role,
    outletId: profile.outlet_id,
    fullName: profile.full_name,
    phone: profile.phone,
  };
});

/** For pages and layouts: redirects when signed out or in the wrong role. */
export async function requireRole(roles: Role[], next?: string): Promise<Session> {
  const session = await getSession();
  if (!session) redirect(next ? `/sign-in?next=${encodeURIComponent(next)}` : "/sign-in");
  if (!roles.includes(session.role)) redirect(homeFor(session.role));
  return session;
}

/** For server actions: returns a failure instead of redirecting, so the UI can explain. */
export async function requireActionRole(roles: Role[]): Promise<ActionResult<Session>> {
  const session = await getSession();
  if (!session) return fail("Please sign in again", "auth");
  if (!roles.includes(session.role)) return fail("You don't have access to this", "auth");
  return ok(session);
}
