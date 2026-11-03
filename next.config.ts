import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const dev = process.env.NODE_ENV !== "production";
const realtime = supabaseUrl.replace(/^http/, "ws");

/**
 * Static CSP. Next's App Router injects inline bootstrap scripts and a header set here can't carry
 * a per-request nonce, so scripts allow 'unsafe-inline' (an accepted limit, noted in the TDD).
 * Everything else is locked to this origin, Supabase (REST + Realtime websocket) and Unsplash images.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://images.unsplash.com ${supabaseUrl}`,
  `connect-src 'self' ${supabaseUrl} ${realtime}${dev ? " ws: http://localhost:*" : ""}`,
  "font-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "geolocation=(self), camera=(), microphone=(), payment=()" },
];

const nextConfig: NextConfig = {
  // Every page is per-user or live data, so we use classic dynamic rendering rather than
  // Cache Components / Partial Prerendering (see the ledger ruling in Task 1).
  poweredByHeader: false,
  // Keep the dev overlay badge off the UI (it covers real content in demos and screenshots).
  devIndicators: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  cacheComponents: false,
  partialPrefetching: false,
  images: {
    // Unsplash resizes its own photos; see src/lib/image-loader.ts.
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      new URL(`${supabaseUrl}/storage/v1/object/public/**`),
    ],
    // Local Supabase Storage is served from 127.0.0.1, which Next blocks by default.
    dangerouslyAllowLocalIP: process.env.NODE_ENV !== "production",
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
