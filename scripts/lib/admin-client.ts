import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/server/db-types";
import { serverEnv } from "@/server/env";

/** Service-role client for scripts. Never imported by app code (that uses src/server/supabase/admin.ts). */
export function adminClientForScripts(): SupabaseClient<Database> {
  const env = serverEnv();
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
