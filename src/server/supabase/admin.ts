import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../db-types";
import { serverEnv } from "../env";

let client: SupabaseClient<Database> | undefined;

/**
 * Service-role client: bypasses RLS. Only server actions use it, after checking the
 * caller's role and validating input. Never import this from client code.
 */
export function createAdminClient(): SupabaseClient<Database> {
  const env = serverEnv();
  client ??= createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
