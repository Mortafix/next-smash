import { describe, expect, it } from "vitest";

import manifest from "@/app/manifest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { buildPageMetadata, siteConfig, websiteJsonLd } from "@/lib/site";

describe("site metadata", () => {
  it("costruisce metadata pubblici coerenti e canonici", () => {
    const metadata = buildPageMetadata({
      title: "Tornei di padel FITP e TPRA in Italia",
      description: siteConfig.description,
      path: "/tornei",
    });

    expect(metadata.title).toBe("Tornei di padel FITP e TPRA in Italia");
    expect(metadata.alternates).toEqual({ canonical: "/tornei" });
    expect(metadata.openGraph).toMatchObject({
      title: "Tornei di padel FITP e TPRA in Italia | NextSmash",
      url: "/tornei",
      locale: "it_IT",
    });
    expect(metadata.twitter).toMatchObject({ card: "summary_large_image" });
  });

  it("esclude le preferenze dall'indicizzazione", () => {
    const metadata = buildPageMetadata({
      title: "Preferenze",
      description: "Preferenze locali",
      path: "/preferenze",
      index: false,
    });

    expect(metadata.alternates).toBeUndefined();
    expect(metadata.robots).toEqual({ index: false, follow: true });
  });

  it("espone un manifest installabile con icona maskable", () => {
    expect(manifest()).toMatchObject({
      name: siteConfig.title,
      start_url: "/tornei",
      display: "standalone",
      theme_color: "#006b8f",
    });
    expect(manifest().icons).toContainEqual(
      expect.objectContaining({ purpose: "maskable", sizes: "512x512" }),
    );
  });

  it("pubblica regole crawler e solo le pagine canoniche", () => {
    expect(robots()).toEqual({
      rules: { userAgent: "*", allow: "/", disallow: "/api/" },
      sitemap: "https://smash.moris.dev/sitemap.xml",
      host: "https://smash.moris.dev",
    });
    expect(sitemap()).toEqual([
      {
        url: "https://smash.moris.dev/tornei",
        changeFrequency: "daily",
        priority: 1,
      },
      {
        url: "https://smash.moris.dev/calendario",
        changeFrequency: "daily",
        priority: 0.8,
      },
    ]);
  });

  it("descrive il portale con JSON-LD senza entità inventate", () => {
    expect(websiteJsonLd).toEqual({
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "NextSmash",
      url: "https://smash.moris.dev",
      description: siteConfig.description,
      inLanguage: "it-IT",
      image: "https://smash.moris.dev/brand/nextsmash-social-card.png",
    });
  });
});
