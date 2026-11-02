import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    "",
    "/verify",
    "/how-it-works",
    "/evidence",
    "/use-cases",
    "/about",
  ].map((p) => ({
    url: `https://humanauth-iota.vercel.app${p}`,
  }));
}
