import { expect, test, type Page } from "@playwright/test";

const savedTournamentsKey = "nextsmash:saved-tournaments:v1";
const preferencesKey = "nextsmash:preferences:v1";

const zones = [
  {
    value: "nord",
    regions: [
      "Valle d’Aosta",
      "Piemonte",
      "Liguria",
      "Lombardia",
      "Trentino-Alto Adige",
      "Veneto",
      "Friuli-Venezia Giulia",
      "Emilia-Romagna",
    ],
  },
  { value: "centro", regions: ["Toscana", "Umbria", "Marche", "Lazio"] },
  {
    value: "sud-isole",
    regions: [
      "Abruzzo",
      "Molise",
      "Campania",
      "Puglia",
      "Basilicata",
      "Calabria",
      "Sicilia",
      "Sardegna",
    ],
  },
];

async function mockRegistrationCounts(page: Page) {
  await page.route("**/api/tournaments/*/registrations", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { source: "fitp", fetchedAt: "2026-10-05T10:00:00.000Z", entries: [] },
    }),
  );
}

test("salva il torneo nel browser e lo rimuove dal profilo dopo il reload", async ({ page }) => {
  await mockRegistrationCounts(page);
  await page.goto("/tornei");

  const titleLink = page.locator(".ns-tournament-card__title-link").first();
  await expect(titleLink).toBeVisible();
  const title = (await titleLink.textContent())?.trim() ?? "";
  const href = await titleLink.getAttribute("href");
  const tournamentId = new URL(href ?? "", page.url()).searchParams.get("torneo");
  expect(tournamentId).not.toBeNull();
  await expect(page.locator(".ns-tournament-card").getByRole("button", { name: "Salva", exact: true })).toHaveCount(0);

  await titleLink.click();
  const dialog = page.locator(".ns-tournament-detail-dialog");
  const saveButton = dialog.getByRole("button", { name: "Salva", exact: true });
  await expect(saveButton).toHaveAttribute("aria-pressed", "false");
  await saveButton.click();
  await expect(dialog.getByRole("button", { name: "Salvato", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => page.evaluate((key) => {
    const stored = JSON.parse(window.localStorage.getItem(key) ?? "{}");
    return stored.tournaments?.map((tournament: { id: string }) => tournament.id);
  }, savedTournamentsKey)).toEqual([tournamentId]);

  await page.reload();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Salvato", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Escape");
  await page.goto("/profilo");

  await expect(page.getByRole("heading", { level: 1, name: "Profilo" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Filtri di partenza" })).toHaveCount(0);
  expect(await page.getByRole("heading", { level: 2 }).allTextContents()).toEqual([
    "Tornei salvati",
    "Ricerche salvate",
  ]);
  const savedSection = page.getByRole("region", { name: "Tornei salvati", exact: true });
  const savedTitle = savedSection.getByRole("link", { name: title, exact: true });
  await expect(savedTitle).toBeVisible();
  await savedTitle.click();
  await expect(page).toHaveURL(/\/profilo\?torneo=/);
  await expect(dialog.getByRole("heading", { level: 2, name: title, exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Salvato", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Salva", exact: true })).toHaveAttribute("aria-pressed", "false");
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL("/profilo");
  await expect(savedSection.getByRole("heading", { name: "Nessun torneo salvato" })).toBeVisible();
  await page.reload();
  await expect(savedSection.getByRole("heading", { name: "Nessun torneo salvato" })).toBeVisible();
});

test("le zone scelgono le regioni e si sincronizzano con le modifiche manuali", async ({ page }) => {
  await page.goto("/tornei");
  const filters = page.locator(".ns-filters");
  await filters.getByRole("button", { name: /Filtri/ }).click();
  const zone = filters.getByRole("combobox", { name: "Zona", exact: true });
  await filters.locator(".ns-region-picker__toggle").click();

  const regionCheckboxes = filters.getByRole("group", { name: "Regioni", exact: true }).getByRole("checkbox");
  await expect(regionCheckboxes).toHaveCount(20);
  await expect(filters.getByText("[object Object]", { exact: true })).toHaveCount(0);

  for (const { value, regions } of zones) {
    await zone.selectOption(value);
    await expect(zone).toHaveValue(value);
    await expect.poll(() => regionCheckboxes.evaluateAll((inputs) =>
      inputs.filter((input) => (input as HTMLInputElement).checked)
        .map((input) => (input as HTMLInputElement).value).sort(),
    )).toEqual([...regions].sort());
    await expect.poll(() => page.evaluate((key) =>
      JSON.parse(window.localStorage.getItem(key) ?? "{}").lastFilters?.regions?.sort(),
    preferencesKey)).toEqual([...regions].sort());
  }

  await zone.selectOption("centro");
  const lazio = filters.getByRole("checkbox", { name: "Lazio", exact: true });
  await lazio.uncheck();
  await expect(zone).toHaveValue("");
  await expect(lazio).not.toBeChecked();
  await lazio.check();
  await expect(zone).toHaveValue("centro");
  await filters.getByRole("checkbox", { name: "Lombardia", exact: true }).check();
  await expect(zone).toHaveValue("");

  await zone.selectOption("nord");
  await page.reload();
  await expect(page.getByRole("button", { name: "Rimuovi filtro: Zona Nord", exact: true })).toBeVisible();
  const filterToggle = filters.getByRole("button", { name: /Filtri/ });
  if ((await filterToggle.getAttribute("aria-expanded")) !== "true") {
    await filterToggle.click();
  }
  await expect(zone).toHaveValue("nord");
});

test("aprire e chiudere un torneo conserva mese, giorno e scroll del calendario", async ({ page }) => {
  await mockRegistrationCounts(page);
  await page.goto("/tornei");
  const period = await page.locator(".ns-tournament-card .ns-date-rail").first().getAttribute("aria-label");
  const match = period?.match(/(\d{1,2}) (\p{L}+) (\d{4})/u);
  expect(match).not.toBeNull();
  const months = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
  const monthIndex = months.indexOf(match![2]);
  expect(monthIndex).toBeGreaterThanOrEqual(0);
  const year = Number(match![3]);
  const initialDate = new Date(year, monthIndex - 1, 1, 12);
  await page.clock.setFixedTime(initialDate);
  await page.goto("/calendario");
  const monthHeading = page.locator("#calendar-month");
  await expect(monthHeading).toHaveText(new Intl.DateTimeFormat("it-IT", { month: "long", year: "numeric" }).format(initialDate));
  await page.getByRole("button", { name: /Mese successivo,/ }).click();
  const selectedDate = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${match![1].padStart(2, "0")}`;
  const selectedDay = page.locator(`.ns-calendar-day[data-date="${selectedDate}"]`);
  await selectedDay.click();

  const agendaTitle = page.locator("#calendar-agenda-title");
  const agenda = page.locator(".ns-calendar-agenda");
  const titleLink = agenda.locator(".ns-tournament-card__title-link").first();
  await expect(titleLink).toBeVisible();
  await titleLink.scrollIntoViewIfNeeded();
  const monthBefore = await monthHeading.textContent();
  const dayBefore = await agendaTitle.textContent();
  const scrollBefore = await page.evaluate(() => window.scrollY);
  await expect(titleLink).toHaveAttribute("href", /^\/calendario\?torneo=/);
  await titleLink.click();
  const dialog = page.locator(".ns-tournament-detail-dialog");
  await expect(dialog).toBeVisible();
  await expect(page).toHaveURL(/\/calendario\?torneo=/);
  await expect(monthHeading).toHaveText(monthBefore ?? "");
  await expect(agendaTitle).toHaveText(dayBefore ?? "");

  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(page).toHaveURL("/calendario");
  await expect(monthHeading).toHaveText(monthBefore ?? "");
  await expect(agendaTitle).toHaveText(dayBefore ?? "");
  await expect(selectedDay.locator("..")).toHaveAttribute("aria-selected", "true");
  await expect(titleLink).toBeFocused();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(scrollBefore);

  await page.goForward();
  await expect(dialog).toBeVisible();
  await expect(page).toHaveURL(/\/calendario\?torneo=/);
  await dialog.getByRole("button", { name: /Chiudi dettagli di/ }).click();
  await expect(page).toHaveURL("/calendario");
  await expect(monthHeading).toHaveText(monthBefore ?? "");
  await expect(agendaTitle).toHaveText(dayBefore ?? "");
});
