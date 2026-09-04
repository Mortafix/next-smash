import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: absoluteUrl("/tornei"),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: absoluteUrl("/calendario"),
      changeFrequency: "daily",
      priority: 0.8,
    },
  ];
}
