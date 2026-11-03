import { describe, expect, it } from "vitest";
import imageLoader from "./image-loader";

describe("imageLoader", () => {
  it("asks Unsplash's CDN for the exact width", () => {
    const url = new URL(imageLoader({ src: "https://images.unsplash.com/photo-1", width: 640 }));
    expect(url.searchParams.get("w")).toBe("640");
    expect(url.searchParams.get("auto")).toBe("format");
  });
  it("leaves other images untouched", () => {
    expect(imageLoader({ src: "http://127.0.0.1:54321/storage/v1/object/public/menu-photos/a.jpg", width: 640 })).toBe(
      "http://127.0.0.1:54321/storage/v1/object/public/menu-photos/a.jpg",
    );
  });
});
