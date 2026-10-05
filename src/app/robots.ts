import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Sökmotorer får läsa sidorna. De privata sidorna har "noindex" och visas därför inte i sökresultat.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
