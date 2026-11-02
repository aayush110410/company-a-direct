import { z } from "zod";
import { publicEnv } from "@/lib/env.public";

/**
 * Server-only config. Not guarded by `server-only` because seed scripts and tests load it;
 * the service key reaches the app only through `src/server/supabase/admin.ts`, which is guarded.
 */
const schema = z.object({
  APP_URL: z.url().default("http://localhost:3000"),
  DEMO_MODE: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  // A documented demo credential for reviewer accounts, not a secret.
  DEMO_USER_PASSWORD: z.string().min(8).default("Biryani@2026"),
});

let cached: (z.infer<typeof schema> & typeof publicEnv) | undefined;

export function serverEnv() {
  cached ??= { ...schema.parse(process.env), ...publicEnv };
  return cached;
}
