import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear());
});

test("filtra l’elenco e salva una ricerca nel browser", async ({ page }) => {
  const response = await page.goto("/tornei");
  await page.waitForLoadState("networkidle");
  expect(response?.headers()["x-frame-options"]).toBe("DENY");
  expect(response?.headers()["x-content-type-options"]).toBe("nosniff");
  await expect(page.getByRole("heading", { name: "Tornei in programma" })).toBeVisible();
  await expect(page.locator(".ns-results-summary p")).toContainText(
    /torne[io] trovat[oi]/,
  );
  const sortGroup = page.getByRole("group", { name: "Ordina i tornei" });
  const dateSort = sortGroup.getByRole("radio", { name: "Data" });
  const distanceSort = sortGroup.getByRole("radio", { name: "Distanza" });
  await expect(dateSort).toBeChecked();
  await expect(distanceSort).toBeEnabled();
  await expect(distanceSort).not.toHaveAttribute("aria-describedby");
  await expect(
    sortGroup.getByText("Distanza: attiva la posizione nei filtri."),
  ).toHaveCount(0);
  const sortTargetHeights = await sortGroup.locator(".ns-sort-option").evaluateAll(
    (elements) => elements.map((element) => element.getBoundingClientRect().height),
  );
  expect(sortTargetHeights.every((height) => height >= 44)).toBe(true);

  const filters = page.locator(".ns-filters");
  const filterToggle = filters.getByRole("button", {
    name: /Filtri 0 filtri attivi/i,
  });
  await expect(
    page.getByRole("button", { name: "Salva i filtri attivi" }),
  ).toHaveCount(0);
  await expect(filterToggle).toHaveAttribute("aria-expanded", "false");
  const closedToggleRadii = await filterToggle.evaluate((element) => {
    const styles = window.getComputedStyle(element);
    return {
      topLeft: styles.borderTopLeftRadius,
      bottomLeft: styles.borderBottomLeftRadius,
    };
  });
  expect(parseFloat(closedToggleRadii.topLeft)).toBeGreaterThan(0);
  expect(closedToggleRadii.bottomLeft).toBe(closedToggleRadii.topLeft);
  await filterToggle.click();
  await expect(filterToggle).toHaveAttribute("aria-expanded", "true");
  const openToggleRadii = await filterToggle.evaluate((element) => {
    const styles = window.getComputedStyle(element);
    return {
      topLeft: styles.borderTopLeftRadius,
      bottomLeft: styles.borderBottomLeftRadius,
    };
  });
  expect(parseFloat(openToggleRadii.topLeft)).toBeGreaterThan(0);
  expect(openToggleRadii.bottomLeft).toBe("0px");

  const dateFrom = filters.getByLabel("Dal", { exact: true });
  await expect(dateFrom).toHaveAttribute("type", "text");
  await expect(dateFrom).toHaveAttribute("placeholder", "gg/mm/aaaa");
  await dateFrom.fill("05092026");
  await dateFrom.press("Tab");
  await expect(dateFrom).toHaveValue("05/09/2026");
  await dateFrom.fill("");
  await dateFrom.press("Tab");
  await expect(dateFrom).toHaveValue("");

  await expect(filters.getByLabel("Provincia")).toHaveCount(0);
  await expect(
    filters.getByRole("heading", { level: 3, name: "Categoria" }),
  ).toBeVisible();

  const genderGroup = filters.getByRole("group", { name: "Tipologia" });
  const maleChip = genderGroup.getByText("Maschile", { exact: true }).locator("..");
  const femaleChip = genderGroup.getByText("Femminile", { exact: true }).locator("..");
  const mixedChip = genderGroup.getByText("Misto", { exact: true }).locator("..");
  await expect(maleChip.locator("svg").first()).toHaveAttribute(
    "data-icon",
    "mars-double",
  );
  await expect(femaleChip.locator("svg").first()).toHaveAttribute(
    "data-icon",
    "venus-double",
  );
  await expect(mixedChip.locator("svg").first()).toHaveAttribute(
    "data-icon",
    "venus-mars",
  );
  await expect(maleChip).toHaveCSS("cursor", "pointer");
  await expect(maleChip.getByText("Maschile", { exact: true })).toHaveCSS(
    "cursor",
    "pointer",
  );
  await genderGroup.getByText("Maschile", { exact: true }).click();
  await filters.getByLabel("Regione").selectOption("Lombardia");
  await expect(filters.getByLabel("Provincia")).toBeVisible();
  await expect(filters.locator(".ns-location-control")).toHaveCSS(
    "border-top-width",
    "0px",
  );
  await expect(filters.locator(".ns-filter-actions")).toHaveCSS(
    "border-top-width",
    "1px",
  );
  await expect(filters.getByText("Entry è il livello di accesso")).toHaveCount(0);
  await expect(filters.getByText("Seleziona la fascia ammessa")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Azzera" })).toHaveCount(1);

  const activeFilterBar = page.locator(".ns-active-filter-bar");
  const activeFilters = activeFilterBar.getByRole("list", {
    name: "Filtri attivi",
  });
  const filterActions = activeFilterBar.getByRole("group", {
    name: "Azioni sui filtri attivi",
  });
  await expect(activeFilters.getByRole("button", { name: /Salva|Azzera/ })).toHaveCount(0);
  const saveActiveFilters = filterActions.getByRole("button", {
    name: "Salva i filtri attivi",
  });
  const resetActiveFilters = filterActions.getByRole("button", {
    name: "Azzera",
  });
  await expect(saveActiveFilters).toBeVisible();
  await expect(resetActiveFilters).toBeVisible();
  await expect(resetActiveFilters).toHaveCSS(
    "background-color",
    "rgb(180, 35, 24)",
  );
  await expect(resetActiveFilters).toHaveCSS("color", "rgb(255, 254, 247)");
  await resetActiveFilters.hover();
  await expect(resetActiveFilters).toHaveCSS(
    "background-color",
    "rgb(253, 231, 228)",
  );
  await expect(resetActiveFilters).toHaveCSS("color", "rgb(180, 35, 24)");
  await page.mouse.move(0, 0);

  const lombardiaChip = activeFilters.getByRole("button", {
    name: "Rimuovi filtro: Lombardia",
  });
  const removeCue = lombardiaChip.locator(".ns-active-filter-chip__remove");
  const chipLabel = lombardiaChip.locator(".ns-active-filter-chip__label");
  await expect(lombardiaChip).toHaveCSS("cursor", "pointer");
  await expect(chipLabel).toHaveCSS("cursor", "pointer");
  await expect(removeCue).toHaveCSS("opacity", "0");
  await lombardiaChip.hover();
  await expect(removeCue).toHaveCSS("opacity", "1");
  await expect(removeCue).toHaveCSS("color", "rgb(180, 35, 24)");
  await expect(chipLabel).toHaveCSS("opacity", "0.14");
  await page.mouse.move(0, 0);
  await saveActiveFilters.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Filtri da salvare", { exact: true })).toBeVisible();
  const dialogPosition = await dialog.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      centerX: rect.left + rect.width / 2,
      centerY: rect.top + rect.height / 2,
      viewportCenterX: window.innerWidth / 2,
      viewportCenterY: window.innerHeight / 2,
    };
  });
  expect(Math.abs(dialogPosition.centerX - dialogPosition.viewportCenterX)).toBeLessThanOrEqual(1);
  expect(Math.abs(dialogPosition.centerY - dialogPosition.viewportCenterY)).toBeLessThanOrEqual(1);
  await dialog.getByLabel("Nome ricerca").fill("Weekend Lombardia");
  await dialog.getByRole("button", { name: "Salva", exact: true }).click();

  const toast = page.locator(".ns-toast");
  await expect(toast).toContainText("Ricerca salvata");

  await genderGroup.getByText("Tutte", { exact: true }).click();
  await filters.getByLabel("Regione").selectOption("");
  await expect(
    page.getByRole("button", { name: "Salva i filtri attivi" }),
  ).toHaveCount(0);
  const savedToggle = page.getByRole("button", {
    name: /Ricerche 1 ricerca salvata/i,
  });
  await savedToggle.click();
  await page.getByRole("button", { name: /Weekend Lombardia/ }).click();
  await expect(page.getByRole("button", { name: /Rimuovi filtro: Doppio maschile/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Rimuovi filtro: Lombardia/ })).toBeVisible();

  await toast.getByRole("link", { name: "Vai alle Preferenze" }).click();
  const savedSearchCard = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: "Weekend Lombardia" }),
  });
  await expect(savedSearchCard).toBeVisible();
  await expect(savedSearchCard.getByText("Doppio maschile", { exact: true })).toBeVisible();
  await expect(savedSearchCard.getByText("Lombardia", { exact: true })).toBeVisible();
});

test("gestisce le ricerche salvate da tastiera anche su mobile", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/preferenze");
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => {
    const filters = {
      query: "",
      source: "all",
      gender: "all",
      rankCategory: "all",
      tpraLevel: "all",
      region: "",
      provinceCode: "",
      dateFrom: "",
      dateTo: "",
      sort: "date",
      origin: null,
    };
    window.localStorage.setItem(
      "nextsmash:preferences:v1",
      JSON.stringify({
        version: 1,
        defaults: filters,
        lastFilters: { ...filters, region: "Lombardia" },
        savedSearches: [
          {
            id: "one",
            name: "Weekend Milano",
            filters: { ...filters, region: "Lombardia" },
            createdAt: "2026-09-04T08:00:00.000Z",
          },
          {
            id: "two",
            name: "Roma sera",
            filters: { ...filters, region: "Lazio" },
            createdAt: "2026-09-04T08:00:00.000Z",
          },
        ],
      }),
    );
    window.dispatchEvent(new Event("nextsmash:preferences-changed"));
  });

  await expect(page.getByLabel("2 ricerche salvate")).toBeVisible();
  await expect(
    page.getByRole("list", { name: "Riepilogo degli ultimi filtri usati" }),
  ).toContainText("Lombardia");

  const renameButton = page.getByRole("button", {
    name: "Rinomina la ricerca «Weekend Milano»",
  });
  await renameButton.focus();
  await page.keyboard.press("Enter");
  const input = page.getByRole("textbox", { name: "Nome ricerca" });
  await expect(input).toBeFocused();
  await input.fill("   ");
  await page.getByRole("button", { name: "Salva nome" }).click();
  await expect(input).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByText(/almeno un carattere/i)).toBeVisible();

  await input.fill("Weekend Nord");
  await page.getByRole("button", { name: "Salva nome" }).click();
  const renamedButton = page.getByRole("button", {
    name: "Rinomina la ricerca «Weekend Nord»",
  });
  await expect(renamedButton).toBeFocused();

  const deleteButton = page.getByRole("button", {
    name: "Elimina la ricerca «Weekend Nord»",
  });
  await deleteButton.focus();
  await page.keyboard.press("Enter");
  const undoButton = page.getByRole("button", {
    name: "Annulla eliminazione di «Weekend Nord»",
  });
  await expect(undoButton).toBeFocused();
  await expect(page.getByLabel("1 ricerca salvata")).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Usa la ricerca «Weekend Nord»" }),
  ).toBeFocused();

  const dimensions = await page.locator("html").evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBe(dimensions.clientWidth);
  const buttonHeights = await page
    .locator(".ns-preferences button:visible")
    .evaluateAll((buttons) =>
      buttons.map((button) => button.getBoundingClientRect().height),
    );
  expect(buttonHeights.every((height) => height >= 44)).toBe(true);

  await page
    .getByRole("button", { name: "Rinomina la ricerca «Weekend Nord»" })
    .click();
  const audit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    audit.violations.filter((violation) =>
      ["serious", "critical"].includes(violation.impact ?? ""),
    ),
  ).toEqual([]);
});

test("non lascia /preferenze quando lo storage rifiuta la base", async ({ page }) => {
  await page.goto("/preferenze");
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => {
    const filters = {
      query: "",
      source: "all",
      gender: "all",
      rankCategory: "all",
      tpraLevel: "all",
      region: "",
      provinceCode: "",
      dateFrom: "",
      dateTo: "",
      sort: "date",
      origin: null,
    };
    window.localStorage.setItem(
      "nextsmash:preferences:v1",
      JSON.stringify({
        version: 1,
        defaults: { ...filters, region: "Lazio" },
        lastFilters: filters,
        savedSearches: [],
      }),
    );
    window.dispatchEvent(new Event("nextsmash:preferences-changed"));
    Object.defineProperty(Storage.prototype, "setItem", {
      configurable: true,
      value: () => {
        throw new Error("storage unavailable");
      },
    });
  });

  await page.getByRole("button", { name: "Apri questa base" }).click();

  await expect(page).toHaveURL(/\/preferenze$/);
  await expect(page.locator(".ns-preferences__feedback[role='alert']")).toContainText(
    "nessuna modifica è stata applicata",
  );
});

test("propone solo regione, provincia e posizione corrente", async ({ page }) => {
  await page.goto("/tornei");
  const filters = page.locator(".ns-filters");
  await filters.getByRole("button", { name: /Filtri/ }).click();

  await expect(filters.getByLabel("Regione")).toBeVisible();
  await expect(filters.getByLabel("Provincia")).toHaveCount(0);
  await expect(
    filters.getByRole("button", { name: "Usa la mia posizione" }),
  ).toBeVisible();
  await expect(filters.getByText("Comune di partenza", { exact: true })).toHaveCount(0);
  await expect(filters.getByText("oppure", { exact: true })).toHaveCount(0);
  await expect(filters.getByText(/comune/i)).toHaveCount(0);
});

test("mostra vicino a me con stato attivo e rimozione compatta", async ({
  context,
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await context.grantPermissions(["geolocation"], {
    origin: "http://localhost:3000",
  });
  await context.setGeolocation({ latitude: 45.4642, longitude: 9.19 });
  await page.goto("/tornei");

  const sortGroup = page.getByRole("group", { name: "Ordina i tornei" });
  await expect(sortGroup.locator(".ns-sort-option__check")).toBeHidden();
  const distanceSort = sortGroup.getByRole("radio", { name: "Distanza" });
  const distanceOption = sortGroup
    .locator(".ns-sort-option")
    .filter({ hasText: "Distanza" });
  await expect(distanceSort).toBeEnabled();
  await distanceOption.click();
  await expect(distanceSort).toBeChecked();
  await expect(sortGroup.locator(".ns-sort-option__check")).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Rimuovi filtro: Vicino a me" }),
  ).toBeVisible();

  const firstCard = page.locator(".ns-tournament-card").first();
  const distanceBadge = firstCard.locator(".ns-distance-badge");
  await expect(distanceBadge).toHaveText(/^\d+\sKM$/);
  await expect(distanceBadge).not.toContainText("≈");
  const kickerGeometry = await firstCard.locator(".ns-card-kicker").evaluate((kicker) => {
    const source = kicker.querySelector<HTMLElement>(".ns-source-mark");
    const state = kicker.querySelector<HTMLElement>(".ns-state-badge");
    const distance = kicker.querySelector<HTMLElement>(".ns-distance-badge");
    const centerY = (element: HTMLElement | null) => {
      const rect = element?.getBoundingClientRect();
      return rect ? rect.top + rect.height / 2 : Number.POSITIVE_INFINITY;
    };
    return {
      source: centerY(source),
      state: centerY(state),
      distance: centerY(distance),
    };
  });
  expect(Math.abs(kickerGeometry.source - kickerGeometry.state)).toBeLessThanOrEqual(1);
  expect(Math.abs(kickerGeometry.source - kickerGeometry.distance)).toBeLessThanOrEqual(1);
  const mobileWidth = await page.locator("html").evaluate((element) => ({
    client: element.clientWidth,
    scroll: element.scrollWidth,
  }));
  expect(mobileWidth.scroll).toBe(mobileWidth.client);

  const filters = page.locator(".ns-filters");
  await filters.getByRole("button", { name: /Filtri/ }).click();
  await expect(filters.getByText("Vicino a me", { exact: true })).toBeVisible();
  await expect(
    sortGroup.getByText("Distanza: attiva la posizione nei filtri."),
  ).toHaveCount(0);
  await sortGroup
    .locator(".ns-sort-option")
    .filter({ hasText: "Data" })
    .click();
  await expect(sortGroup.getByRole("radio", { name: "Data" })).toBeChecked();
  const removeLocation = filters.getByRole("button", {
    name: "Rimuovi Vicino a me",
  });
  await expect(removeLocation).toBeVisible();
  await expect(removeLocation).toHaveText("");
  await expect(
    page.getByRole("button", { name: "Rimuovi filtro: Vicino a me" }),
  ).toBeVisible();
});

test("non salva un ordinamento distanza senza coordinate", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: () => undefined,
      },
    });
  });
  await page.goto("/tornei");

  const sortGroup = page.getByRole("group", { name: "Ordina i tornei" });
  await sortGroup.getByText("Distanza", { exact: true }).click();
  await expect(sortGroup.getByRole("radio", { name: "Data" })).toBeChecked();
  await expect(sortGroup.getByRole("radio", { name: "Distanza" })).toBeDisabled();
  const storedPreferences = await page.evaluate(() =>
    window.localStorage.getItem("nextsmash:preferences:v1"),
  );
  expect(
    storedPreferences === null ||
      JSON.parse(storedPreferences).lastFilters.sort === "date",
  ).toBe(true);

  await page.reload();
  const reloadedSortGroup = page.getByRole("group", { name: "Ordina i tornei" });
  await expect(reloadedSortGroup.getByRole("radio", { name: "Data" })).toBeChecked();
  await expect(
    reloadedSortGroup.getByRole("radio", { name: "Distanza" }),
  ).toBeEnabled();
});

test("gerarchizza la data verticale e ancora l’anno in basso", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/tornei");
  await page.evaluate(async () => {
    await document.fonts.ready;
  });

  const firstCard = page.locator(".ns-tournament-card").first();
  await expect
    .poll(() =>
      firstCard.locator(".ns-date-rail").evaluate((rail) =>
        getComputedStyle(rail).borderRightWidth,
      ),
    )
    .toBe("2px");

  const dateGeometry = await firstCard.evaluate((card) => {
    const endpoints = [...card.querySelectorAll<HTMLElement>(".ns-date-rail__segment")];
    const rail = card.querySelector<HTMLElement>(".ns-date-rail");
    const year = card.querySelector<HTMLElement>(".ns-date-rail__year");
    const divider = card.querySelector<HTMLElement>(".ns-date-rail__divider");
    const month = card.querySelector<HTMLElement>(".ns-date-rail__month");
    const day = card.querySelector<HTMLElement>(".ns-date-rail__segment strong");
    const yearStyles = year ? getComputedStyle(year) : null;
    const monthStyles = month ? getComputedStyle(month) : null;
    const dayStyles = day ? getComputedStyle(day) : null;
    const railRect = rail?.getBoundingClientRect();
    const yearRect = year?.getBoundingClientRect();
    return {
      endpointWidths: endpoints.map((endpoint) => {
        const day = endpoint.querySelector<HTMLElement>("strong");
        const month = endpoint.querySelector<HTMLElement>("span");
        return {
          day: day?.getBoundingClientRect().width ?? 0,
          month: month?.getBoundingClientRect().width ?? 0,
        };
      }),
      yearBorder: yearStyles?.borderTopWidth ?? "",
      yearShadow: yearStyles?.boxShadow ?? "",
      monthFontSize: parseFloat(monthStyles?.fontSize ?? "0"),
      yearFontSize: parseFloat(yearStyles?.fontSize ?? "0"),
      dayFontSize: parseFloat(dayStyles?.fontSize ?? "0"),
      yearFontWeight: Number(yearStyles?.fontWeight ?? 0),
      yearOpacity: Number(yearStyles?.opacity ?? 0),
      yearBottomGap:
        railRect && yearRect ? railRect.bottom - yearRect.bottom : Number.POSITIVE_INFINITY,
      dividerBackground: divider ? getComputedStyle(divider).backgroundColor : "",
    };
  });

  expect(dateGeometry.endpointWidths.length).toBeGreaterThan(0);
  for (const endpoint of dateGeometry.endpointWidths) {
    expect(Math.abs(endpoint.day - endpoint.month)).toBeLessThanOrEqual(1);
  }
  expect(dateGeometry.yearBorder).toBe("0px");
  expect(dateGeometry.yearShadow).toBe("none");
  expect(dateGeometry.monthFontSize).toBeGreaterThanOrEqual(20);
  expect(dateGeometry.yearFontSize).toBeGreaterThan(dateGeometry.monthFontSize);
  expect(dateGeometry.yearFontSize).toBeLessThan(dateGeometry.dayFontSize);
  expect(dateGeometry.yearFontWeight).toBeGreaterThanOrEqual(700);
  expect(dateGeometry.yearOpacity).toBe(0.5);
  expect(dateGeometry.yearBottomGap).toBeGreaterThanOrEqual(10);
  expect(dateGeometry.yearBottomGap).toBeLessThanOrEqual(20);
  expect(dateGeometry.dividerBackground).toBe("rgb(7, 25, 35)");
});

test("mostra calendario e agenda del giorno", async ({ page }) => {
  await page.goto("/calendario");
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("heading", { name: "Calendario tornei" })).toBeVisible();
  await expect(page.locator("#calendar-month")).toBeVisible();
  await page.locator(".ns-calendar-day").nth(15).click();
  await expect(page.locator(".ns-calendar-agenda")).toBeVisible();
});

test("naviga il calendario come una griglia e conferma la data", async ({ page }) => {
  await page.goto("/calendario");
  await page.waitForLoadState("networkidle");

  const days = page.locator(".ns-calendar-day");
  await expect(days).toHaveCount(42);
  expect(
    await days.evaluateAll((elements) =>
      elements.filter((element) => element.getAttribute("tabindex") === "0").length,
    ),
  ).toBe(1);

  const initial = page.locator('.ns-calendar-day[tabindex="0"]');
  const initialLabel = await initial.getAttribute("aria-label");
  const selectedBefore = await page
    .locator('td[aria-selected="true"] .ns-calendar-day')
    .getAttribute("aria-label");

  await initial.press("ArrowRight");
  const focused = page.locator('.ns-calendar-day[tabindex="0"]');
  await expect(focused).toBeFocused();
  expect(await focused.getAttribute("aria-label")).not.toBe(initialLabel);
  expect(
    await page
      .locator('td[aria-selected="true"] .ns-calendar-day')
      .getAttribute("aria-label"),
  ).toBe(selectedBefore);

  await focused.press("Enter");
  await expect(focused.locator("xpath=..")).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#calendar-selection-status")).toContainText(
    (await focused.getAttribute("aria-label"))?.split(",")[0] ?? "",
  );

  await focused.press("PageDown");
  await expect(page.locator('.ns-calendar-day[tabindex="0"]')).toBeFocused();
  expect(
    await days.evaluateAll((elements) =>
      elements.filter((element) => element.getAttribute("tabindex") === "0").length,
    ),
  ).toBe(1);

  await page.keyboard.press("Tab");
  expect(
    await page.evaluate(() => Boolean(document.activeElement?.closest("#calendar-grid"))),
  ).toBe(false);
});

test("sincronizza il mese adiacente e mantiene target mobili da 44 px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/calendario");
  await page.waitForLoadState("networkidle");

  const adjacentDay = page.locator("td[data-outside] .ns-calendar-day").last();
  const adjacentDate = await adjacentDay.getAttribute("data-date");
  expect(adjacentDate).not.toBeNull();
  const expectedMonth = new Intl.DateTimeFormat("it-IT", {
    month: "long",
    year: "numeric",
  }).format(new Date(`${adjacentDate}T12:00:00`));

  await adjacentDay.click();
  await expect(page.locator("#calendar-month")).toHaveText(expectedMonth);
  await expect(page.locator(`.ns-calendar-day[data-date="${adjacentDate}"]`)).toBeFocused();
  await expect(
    page.locator(`.ns-calendar-day[data-date="${adjacentDate}"]`).locator("xpath=.."),
  ).toHaveAttribute("aria-selected", "true");

  const geometry = await page.evaluate(() => {
    const days = [...document.querySelectorAll<HTMLElement>(".ns-calendar-day")];
    const todayButton = document.querySelector<HTMLElement>(".ns-today-button");
    return {
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      minimumDayWidth: Math.min(...days.map((day) => day.getBoundingClientRect().width)),
      minimumDayHeight: Math.min(...days.map((day) => day.getBoundingClientRect().height)),
      todayHeight: todayButton?.getBoundingClientRect().height ?? 0,
    };
  });

  expect(geometry.scrollWidth).toBe(geometry.clientWidth);
  expect(geometry.minimumDayWidth).toBeGreaterThanOrEqual(44);
  expect(geometry.minimumDayHeight).toBeGreaterThanOrEqual(44);
  expect(geometry.todayHeight).toBeGreaterThanOrEqual(44);

  const lastDay = page.locator(".ns-calendar-day").last();
  await lastDay.focus();
  const focusGeometry = await page.evaluate(() => {
    const focused = document.activeElement?.getBoundingClientRect();
    const mobileNavigation = document.querySelector(".mobile-nav")?.getBoundingClientRect();
    return {
      focusBottom: focused?.bottom ?? Number.POSITIVE_INFINITY,
      navigationTop: mobileNavigation?.top ?? Number.NEGATIVE_INFINITY,
    };
  });
  expect(focusGeometry.focusBottom).toBeLessThanOrEqual(focusGeometry.navigationTop);
});

test("non crea overflow e usa la navigazione inferiore a 320 px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/tornei");
  await expect(page.locator(".mobile-nav")).toBeVisible();
  await expect(page.locator(".desktop-nav")).toBeHidden();
  const filters = page.locator(".ns-filters");
  await filters.getByRole("button", { name: /Filtri/ }).click();
  await filters.getByLabel("Regione").selectOption("Lombardia");

  const mobileActionDivider = await page
    .locator(".ns-active-filter-actions")
    .evaluate((element) => {
      const styles = window.getComputedStyle(element);
      return {
        blockStart: styles.borderBlockStartWidth,
        inlineStart: styles.borderInlineStartWidth,
      };
    });
  expect(mobileActionDivider.blockStart).toBe("2px");
  expect(mobileActionDivider.inlineStart).toBe("0px");

  const dimensions = await page.locator("html").evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBe(dimensions.clientWidth);

  const mobileToolbar = await page.locator(".ns-results-toolbar").evaluate((toolbar) => {
    const summary = toolbar.querySelector<HTMLElement>(".ns-results-summary");
    const actions = toolbar.querySelector<HTMLElement>(".ns-results-actions");
    const options = [...toolbar.querySelectorAll<HTMLElement>(".ns-sort-option")];
    const summaryRect = summary?.getBoundingClientRect();
    const actionsRect = actions?.getBoundingClientRect();
    return {
      centerDelta:
        summaryRect && actionsRect
          ? Math.abs(
              summaryRect.top + summaryRect.height / 2 -
                (actionsRect.top + actionsRect.height / 2),
            )
          : Number.POSITIVE_INFINITY,
      optionHeights: options.map((option) => option.getBoundingClientRect().height),
      optionRows: new Set(
        options.map((option) => Math.round(option.getBoundingClientRect().top)),
      ).size,
    };
  });
  expect(mobileToolbar.centerDelta).toBeLessThanOrEqual(1);
  expect(mobileToolbar.optionRows).toBe(1);
  expect(mobileToolbar.optionHeights.every((height) => height >= 44)).toBe(true);

  await page.getByRole("button", { name: "Salva i filtri attivi" }).click();
  const mobileDialogCenter = await page.getByRole("dialog").evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2 - window.innerWidth / 2,
      y: rect.top + rect.height / 2 - window.innerHeight / 2,
    };
  });
  expect(Math.abs(mobileDialogCenter.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(mobileDialogCenter.y)).toBeLessThanOrEqual(1);
  await page.getByRole("dialog").getByRole("button", { name: "Chiudi" }).click();

  const cardVisuals = await page.locator(".ns-tournament-card").first().evaluate((card) => {
    const rail = card.querySelector<HTMLElement>(".ns-date-rail");
    const placeIcon = card.querySelector<HTMLElement>(
      ".ns-tournament-card__place-icon",
    );
    const placeCopy = card.querySelector<HTMLElement>(
      ".ns-tournament-card__place-copy",
    );
    const mixed = card.querySelector<HTMLElement>(
      ".ns-tournament-card__category-icon--mixed",
    );
    const mixedLeft = mixed?.querySelector<HTMLElement>(
      ".ns-tournament-card__category-symbol--mixed-left",
    );
    const mixedRight = mixed?.querySelector<HTMLElement>(
      ".ns-tournament-card__category-symbol--mixed-right",
    );
    const railRect = rail?.getBoundingClientRect();
    const iconRect = placeIcon?.getBoundingClientRect();
    const copyRect = placeCopy?.getBoundingClientRect();

    return {
      cardInnerWidth: card.clientWidth,
      railWidth: railRect?.width ?? 0,
      placeCenterDelta:
        iconRect && copyRect
          ? Math.abs(
              iconRect.top + iconRect.height / 2 -
                (copyRect.top + copyRect.height / 2),
            )
          : Number.POSITIVE_INFINITY,
      mixedBackgroundLeft: mixed
        ? getComputedStyle(mixed, "::before").backgroundColor
        : "",
      mixedBackgroundRight: mixed
        ? getComputedStyle(mixed, "::after").backgroundColor
        : "",
      mixedLeftClip: mixedLeft ? getComputedStyle(mixedLeft).clipPath : "",
      mixedRightClip: mixedRight ? getComputedStyle(mixedRight).clipPath : "",
      placeIconWidth: iconRect?.width ?? 0,
    };
  });
  expect(
    Math.abs(cardVisuals.cardInnerWidth - cardVisuals.railWidth),
  ).toBeLessThanOrEqual(1);
  expect(cardVisuals.placeCenterDelta).toBeLessThanOrEqual(1);
  expect(cardVisuals.placeIconWidth).toBeGreaterThanOrEqual(39);
  expect(cardVisuals.placeIconWidth).toBeLessThanOrEqual(41);
  expect(cardVisuals.mixedBackgroundLeft).not.toBe(cardVisuals.mixedBackgroundRight);
  expect(cardVisuals.mixedLeftClip).toContain("50%");
  expect(cardVisuals.mixedRightClip).toContain("50%");
});

test("mantiene i titoli di pagina su una riga quando lo spazio è sufficiente", async ({
  page,
}) => {
  for (const width of [320, 1280]) {
    await page.setViewportSize({ width, height: 800 });

    for (const [path, title] of [
      ["/tornei", "Tornei in programma"],
      ["/calendario", "Calendario tornei"],
      ["/preferenze", "Le mie ricerche"],
    ] as const) {
      await page.goto(path);
      await page.evaluate(async () => {
        await document.fonts.ready;
      });

      const lineCount = await page
        .getByRole("heading", { level: 1, name: title })
        .evaluate((heading) => {
          const range = document.createRange();
          range.selectNodeContents(heading);
          return new Set(
            Array.from(range.getClientRects(), (rect) => Math.round(rect.top)),
          ).size;
        });

      expect(lineCount).toBe(1);
    }
  }
});

test("i filtri aperti non creano overflow sui viewport desktop", async ({ page }) => {
  for (const width of [1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/tornei");
    await page
      .getByRole("searchbox", { name: "Cerca torneo, circolo o città" })
      .fill("una ricerca molto lunga senza interruzioni xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");
    await page.locator(".ns-filters").getByRole("button", { name: /Filtri/ }).click();
    await page.getByRole("button", { name: /Ricerche/ }).click();

    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    const filters = page.locator(".ns-filters");
    const weekendWidths = await filters
      .locator(".ns-choice-chip--standalone")
      .evaluate((element) => ({
        chip: element.getBoundingClientRect().width,
        group: element.parentElement?.getBoundingClientRect().width ?? 0,
      }));
    expect(Math.abs(weekendWidths.chip - weekendWidths.group)).toBeLessThanOrEqual(1);

    const fitpRows = await filters
      .getByRole("group", { name: "Fascia FITP" })
      .locator(".ns-choice-chip")
      .evaluateAll((elements) =>
        new Set(elements.map((element) => Math.round(element.getBoundingClientRect().top)))
          .size,
      );
    expect(fitpRows).toBe(1);

    const dimensions = await page.locator("html").evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }));
    const sidebar = await page.locator(".ns-filter-sidebar").evaluate((element) => ({
      clientHeight: element.clientHeight,
      clientWidth: element.clientWidth,
      overflowY: window.getComputedStyle(element).overflowY,
      scrollHeight: element.scrollHeight,
      scrollWidth: element.scrollWidth,
      right: element.getBoundingClientRect().right,
    }));

    expect(dimensions.scrollWidth).toBe(dimensions.clientWidth);
    expect(sidebar.scrollWidth).toBeLessThanOrEqual(sidebar.clientWidth + 1);
    expect(sidebar.scrollHeight).toBeLessThanOrEqual(sidebar.clientHeight + 1);
    expect(sidebar.overflowY).toBe("visible");
    expect(sidebar.right).toBeLessThanOrEqual(width);

    const desktopActionDivider = await page
      .locator(".ns-active-filter-actions")
      .evaluate((element) => {
        const styles = window.getComputedStyle(element);
        return {
          blockStart: styles.borderBlockStartWidth,
          inlineStart: styles.borderInlineStartWidth,
        };
      });
    expect(desktopActionDivider.blockStart).toBe("0px");
    expect(desktopActionDivider.inlineStart).toBe("2px");

    for (const selector of [
      ".ns-filter-expander",
      ".ns-filter-fields",
      ".ns-filter-group",
      ".ns-choice-group",
      ".ns-choice-chips",
    ]) {
      const boxes = await page.locator(selector).evaluateAll((elements) =>
        elements.map((element) => ({
          clientWidth: element.clientWidth,
          scrollWidth: element.scrollWidth,
        })),
      );
      for (const box of boxes) {
        expect(box.scrollWidth).toBeLessThanOrEqual(box.clientWidth + 1);
      }
    }
  }

  await page.setViewportSize({ width: 1024, height: 800 });
  await page.goto("/calendario");
  await page.locator(".ns-filters").getByRole("button", { name: /Filtri/ }).click();
  const calendarDimensions = await page.locator("html").evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(calendarDimensions.scrollWidth).toBe(calendarDimensions.clientWidth);
});

test("non presenta violazioni WCAG serie nelle tre pagine", async ({ page }) => {
  for (const path of ["/tornei", "/calendario", "/preferenze"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const audit = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    const importantViolations = audit.violations.filter((violation) =>
      ["serious", "critical"].includes(violation.impact ?? ""),
    );
    expect(importantViolations, `Violazioni in ${path}`).toEqual([]);
  }
});
