import { z } from "zod";

// Zod probes `new Function` to decide whether to compile parsers. The CSP has no 'unsafe-eval',
// so browsers report that probe as a violation even though Zod catches it. Parse without it.
z.config({ jitless: true });

/**
 * Public config, safe in client bundles. Next only inlines literal
 * `process.env.NEXT_PUBLIC_*` references, so each key is read explicitly.
 */
export const publicEnv = z
  .object({
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  })
  .parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
