import { NextResponse } from "next/server";
import { createAdminClient } from "@/server/supabase/admin";

export const dynamic = "force-dynamic";

/** Render's health check and the keep-alive ping: the app is up and can reach its database. */
export async function GET() {
  const { error } = await createAdminClient().from("outlets").select("id").limit(1);
  return NextResponse.json({ ok: !error, db: !error }, { status: error ? 503 : 200, headers: { "cache-control": "no-store" } });
}
