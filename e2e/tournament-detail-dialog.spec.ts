import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function mockRegistrationCounts(page: Page) {
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
            label: "Gara test",
            registeredPlayers: 20,
            registeredPairs: 10,
            capacityPlayers: 32,
            capacityPairs: 16,
            reservePlayers: 0,
            reservePairs: 0,
          },
        ],
      },
    });
  });
}

test("apre, condivide e naviga il dettaglio del torneo", async ({
  context,
  page,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"], {
    origin: "http://localhost:3000",
  });
  await mockRegistrationCounts(page);
  await page.goto("/tornei");

  const titleLink = page.locator(".ns-tournament-card__title-link").first();
  await expect(titleLink).toBeVisible();
  const pageStack = page.locator(".ns-page-stack");
  const pageLeftBeforeDialog = await pageStack.evaluate(
    (element) => element.getBoundingClientRect().left,
  );
  const title = (await titleLink.textContent())?.trim() ?? "";
  const href = await titleLink.getAttribute("href");
  expect(href).toMatch(/^\/tornei\?torneo=/);
  const titleCue = titleLink.locator(".ns-tournament-card__title-cue");
  await expect(titleCue).toHaveAttribute("data-icon", "circle-info");
  await expect(titleLink).toHaveCSS("text-decoration-line", "none");
  await expect(titleCue).toHaveCSS("opacity", "0");
  await titleLink.hover();
  await expect(titleLink).toHaveCSS("color", "rgb(0, 77, 104)");
  await expect(titleCue).toHaveCSS("opacity", "1");

  await titleLink.click();
  const dialog = page.locator(".ns-tournament-detail-dialog");
  await expect(dialog).toBeVisible();
  const pageLeftWithDialog = await pageStack.evaluate(
    (element) => element.getBoundingClientRect().left,
  );
  expect(pageLeftWithDialog).toBeCloseTo(pageLeftBeforeDialog, 0);
  await expect(dialog.getByRole("heading", { level: 2, name: title })).toBeVisible();
  await expect(dialog.getByText("Gara test")).toBeVisible();
  await expect(dialog.getByText("coppie su 16")).toBeVisible();
  await expect(dialog.getByText("10", { exact: true })).toBeVisible();
  await expect(dialog.getByText("Giocatori iscritti")).toHaveCount(0);
  await expect(page).toHaveURL(/\/tornei\?torneo=/);
  await expect(page.locator("html")).toHaveCSS("overflow", "hidden");

  const placement = await dialog.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return {
      horizontal: Math.abs(bounds.left + bounds.width / 2 - window.innerWidth / 2),
      vertical: Math.abs(bounds.top + bounds.height / 2 - window.innerHeight / 2),
    };
  });
  expect(placement.horizontal).toBeLessThanOrEqual(1);
  expect(placement.vertical).toBeLessThanOrEqual(1);

  const accessibility = await new AxeBuilder({ page })
    .include(".ns-tournament-detail-dialog")
    .analyze();
  expect(
    accessibility.violations.filter((violation) =>
      ["serious", "critical"].includes(violation.impact ?? ""),
    ),
  ).toEqual([]);

  await dialog.getByRole("button", { name: "Condividi" }).click();
  await expect(dialog.getByRole("button", { name: "Link copiato" })).toBeVisible();
  const expectedUrl = new URL(href ?? "/tornei", "http://localhost:3000").toString();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(expectedUrl);

  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(page).toHaveURL("/tornei");
  await expect(titleLink).toBeFocused();

  await page.goForward();
  await expect(dialog).toBeVisible();
  await expect(page).toHaveURL(/\/tornei\?torneo=/);
});

test("il link diretto ignora i filtri salvati senza cancellarli", async ({ page }) => {
  await mockRegistrationCounts(page);
  await page.goto("/tornei");

  const titleLink = page.locator(".ns-tournament-card__title-link").first();
  const href = await titleLink.getAttribute("href");
  const total = await page.locator(".ns-results-summary strong").textContent();
  const impossibleQuery = "nessun-torneo-puo-contenere-questa-stringa";

  await page.getByRole("searchbox", { name: "Cerca torneo, circolo o città" }).fill(
    impossibleQuery,
  );
  await expect(page.getByRole("heading", { name: "Nessun torneo trovato" })).toBeVisible();

  await page.goto(href ?? "/tornei");
  await expect(page.locator(".ns-tournament-detail-dialog")).toBeVisible();
  await expect(
    page.getByRole("searchbox", { name: "Cerca torneo, circolo o città" }),
  ).toHaveValue("");
  await expect(page.locator(".ns-results-summary strong")).toHaveText(total ?? "");
  expect(
    await page.evaluate(() => {
      const raw = window.localStorage.getItem("nextsmash:preferences:v1");
      return raw ? JSON.parse(raw).lastFilters.query : null;
    }),
  ).toBe(impossibleQuery);

  await page
    .locator(".ns-tournament-detail-dialog")
    .getByRole("button", { name: /Chiudi dettagli di/ })
    .click();
  await expect(page).toHaveURL("/tornei");
  await page.reload();
  await expect(
    page.getByRole("searchbox", { name: "Cerca torneo, circolo o città" }),
  ).toHaveValue(impossibleQuery);
  await expect(page.getByRole("heading", { name: "Nessun torneo trovato" })).toBeVisible();
});

test("il dialog resta nel viewport a 320 pixel", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await mockRegistrationCounts(page);
  await page.goto("/tornei");
  await page.locator(".ns-tournament-card__title-link").first().click();

  const dialog = page.locator(".ns-tournament-detail-dialog");
  await expect(dialog).toBeVisible();
  const geometry = await dialog.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return {
      left: bounds.left,
      right: bounds.right,
      top: bounds.top,
      bottom: bounds.bottom,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      documentWidth: document.documentElement.scrollWidth,
    };
  });

  expect(geometry.left).toBeGreaterThanOrEqual(0);
  expect(geometry.right).toBeLessThanOrEqual(geometry.viewportWidth);
  expect(geometry.top).toBeGreaterThanOrEqual(0);
  expect(geometry.bottom).toBeLessThanOrEqual(geometry.viewportHeight);
  expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewportWidth);
});
