import type { SupabaseClient } from "@supabase/supabase-js";
import type { PrepModel } from "@/domain/prep/model";
import { fromPrepModelRow, toPrepModelRow } from "@/domain/prep/model-row";
import type { Database } from "./db-types";

/** The active prep-time model, or null (callers then use the documented fallback rule). */
export async function loadActiveModel(client: SupabaseClient<Database>): Promise<PrepModel | null> {
  const { data, error } = await client.from("prep_models").select("*").eq("is_active", true).maybeSingle();
  if (error || !data) return null;
  return fromPrepModelRow(data);
}

export async function saveModel(client: SupabaseClient<Database>, model: PrepModel): Promise<void> {
  const off = await client.from("prep_models").update({ is_active: false }).eq("is_active", true);
  if (off.error) throw new Error(`deactivate models: ${off.error.message}`);
  const row = toPrepModelRow(model, true);
  const { error } = await client.from("prep_models").upsert({ ...row, coefficients: row.coefficients, feature_ranges: row.feature_ranges });
  if (error) throw new Error(`save model: ${error.message}`);
}
