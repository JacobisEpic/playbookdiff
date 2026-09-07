import type { MetadataRoute } from "next";
import { pages } from "../lib/docs";
import { productionOrigin } from "../lib/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${productionOrigin}/`, priority: 1 },
    { url: `${productionOrigin}/docs`, priority: 0.8 },
    ...pages.map((page) => ({ url: `${productionOrigin}/docs/${page.slug}`, priority: 0.6 })),
  ];
}
