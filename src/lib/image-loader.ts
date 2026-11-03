/**
 * next/image loader. Unsplash photos are resized by Unsplash's own CDN (imgix parameters),
 * so the app server never downloads multi-megabyte originals; other images (menu photos
 * uploaded to Supabase Storage) are already web-sized and served as they are.
 */
export default function imageLoader({ src, width, quality }: { src: string; width: number; quality?: number }): string {
  if (src.startsWith("https://images.unsplash.com/")) {
    const url = new URL(src);
    url.searchParams.set("w", String(width));
    url.searchParams.set("q", String(quality ?? 72));
    url.searchParams.set("auto", "format");
    url.searchParams.set("fit", "max");
    return url.toString();
  }
  return src;
}
