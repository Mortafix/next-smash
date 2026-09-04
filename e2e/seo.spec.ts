import { expect, test } from "@playwright/test";

const SITE_URL = "https://smash.moris.dev";

test("espone brand e metadata completi sulle pagine pubbliche", async ({ page }) => {
  await page.goto("/tornei?torneo=esempio");

  await expect(page).toHaveTitle(
    "Tornei di padel FITP e TPRA in Italia | NextSmash",
  );
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    "Trova e confronta i prossimi tornei individuali di padel FITP e TPRA in Italia per data, livello e distanza.",
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    `${SITE_URL}/tornei`,
  );
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
    "content",
    `${SITE_URL}/tornei`,
  );
  await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute(
    "content",
    "it_IT",
  );
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    "content",
    "summary_large_image",
  );
  await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute(
    "content",
    `${SITE_URL}/brand/nextsmash-social-card.png`,
  );
  await expect(page.locator('meta[name="twitter:image:alt"]')).toHaveAttribute(
    "content",
    "NextSmash — Trova il prossimo torneo",
  );

  const brandLink = page.getByRole("link", {
    name: "NextSmash, vai all’elenco dei tornei",
  });
  await expect(brandLink).toBeVisible();
  await expect(brandLink).toContainText("NEXT");
  await expect(brandLink).toContainText("SMASH");
  await expect(brandLink).toContainText("Trova il prossimo torneo");

  const jsonLd = JSON.parse(
    (await page.locator('script[type="application/ld+json"]').textContent()) ?? "{}",
  );
  expect(jsonLd).toMatchObject({
    "@type": "WebSite",
    name: "NextSmash",
    url: SITE_URL,
    inLanguage: "it-IT",
  });

  await page.goto("/calendario");
  await expect(page).toHaveTitle(
    "Calendario tornei di padel FITP e TPRA | NextSmash",
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    `${SITE_URL}/calendario`,
  );
});

test("mantiene il wordmark leggibile alle larghezze supportate", async ({ page }) => {
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/tornei");

    const brandLink = page.getByRole("link", {
      name: "NextSmash, vai all’elenco dei tornei",
    });
    const box = await brandLink.boundingBox();

    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width);
  }
});

test("non indicizza le preferenze e pubblica i file SEO", async ({ page, request }) => {
  await page.goto("/preferenze");
  await expect(page).toHaveTitle("Preferenze | NextSmash");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex, follow/i,
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);

  const [robotsResponse, sitemapResponse, manifestResponse] = await Promise.all([
    request.get("/robots.txt"),
    request.get("/sitemap.xml"),
    request.get("/manifest.webmanifest"),
  ]);

  expect(robotsResponse.ok()).toBe(true);
  expect(await robotsResponse.text()).toContain(
    `Sitemap: ${SITE_URL}/sitemap.xml`,
  );

  const sitemapBody = await sitemapResponse.text();
  expect(sitemapResponse.ok()).toBe(true);
  expect(sitemapBody).toContain(`${SITE_URL}/tornei`);
  expect(sitemapBody).toContain(`${SITE_URL}/calendario`);
  expect(sitemapBody).not.toContain("/preferenze");

  expect(manifestResponse.ok()).toBe(true);
  expect(await manifestResponse.json()).toMatchObject({
    name: "NextSmash — Trova il prossimo torneo",
    start_url: "/tornei",
    display: "standalone",
  });

  for (const path of [
    "/favicon.ico",
    "/icon.png",
    "/apple-icon.png",
    "/brand/app-icon-192.png",
    "/brand/app-icon-512.png",
    "/brand/app-icon-maskable-512.png",
    "/brand/nextsmash-social-card.png",
  ]) {
    expect((await request.get(path)).ok(), `${path} non disponibile`).toBe(true);
  }
});
