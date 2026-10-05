import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Sidkarta till Google: bara de offentliga sidorna.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/skattjakt-barnkalas`, changeFrequency: "monthly", priority: 0.8 },
  ];
}
