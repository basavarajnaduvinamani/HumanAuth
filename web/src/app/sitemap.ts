import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/verify", "/how-it-works", "/evidence", "/about"].map((p) => ({
    url: `https://humanauth.vercel.app${p}`,
  }));
}
