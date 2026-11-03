import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";

const nextConfig: NextConfig = {
  // Every page is per-user or live data, so we use classic dynamic rendering rather than
  // Cache Components / Partial Prerendering (see the ledger ruling in Task 1).
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
