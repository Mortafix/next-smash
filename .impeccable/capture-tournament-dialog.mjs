import { chromium } from "@playwright/test";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

await page.route("**/api/tournaments/*/registrations", async (route) => {
  const pathParts = new URL(route.request().url()).pathname.split("/");
  const tournamentId = decodeURIComponent(pathParts.at(-2) ?? "");
  const source = tournamentId.startsWith("tpra:") ? "tpra" : "fitp";

  await route.fulfill({
    contentType: "application/json",
    json: {
      source,
      fetchedAt: "2026-09-04T10:30:00.000Z",
      entries: [
        {
          label: "Doppio maschile",
          registeredPlayers: 34,
          registeredPairs: 17,
          capacityPlayers: 48,
          capacityPairs: 24,
          reservePlayers: 0,
          reservePairs: 0,
        },
        {
          label: "Doppio femminile",
          registeredPlayers: 20,
          registeredPairs: 10,
          capacityPlayers: 32,
          capacityPairs: 16,
          reservePlayers: 2,
          reservePairs: 1,
        },
      ],
    },
  });
});

await page.goto("http://localhost:3000/tornei");
const titleLink = page.locator(".ns-tournament-card__title-link").first();
const href = await titleLink.getAttribute("href");
const wrappedTitleLink = page.locator(".ns-tournament-card__title-link").nth(1);
await wrappedTitleLink.hover();
await page.screenshot({ path: ".impeccable/review/title-hover.png" });
await titleLink.click();
await page.getByText("17", { exact: true }).waitFor();
await page.screenshot({ path: ".impeccable/review/desktop.png" });
const imageDownload = page.waitForEvent("download");
await page.getByRole("button", { name: /Scarica l'immagine di/ }).click();
const downloadedImage = await imageDownload;
await downloadedImage.saveAs(".impeccable/review/tournament-share.png");

await page.setViewportSize({ width: 320, height: 720 });
await page.goto(new URL(href ?? "/tornei", "http://localhost:3000").toString());
await page.getByText("17", { exact: true }).waitFor();
await page.screenshot({ path: ".impeccable/review/mobile.png" });

await browser.close();
