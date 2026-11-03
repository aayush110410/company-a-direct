"use client";

import { createBrowserClient as createSsrBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env.public";
import type { Database } from "../db-types";

let client: SupabaseClient<Database> | undefined;

/** One browser client per tab, used for Realtime subscriptions (reads only, under RLS). */
export function createBrowserClient(): SupabaseClient<Database> {
  client ??= createSsrBrowserClient<Database>(publicEnv.NEXT_PUBLIC_SUPABASE_URL, publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return client;
}
