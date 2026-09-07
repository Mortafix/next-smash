import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const width of [1280, 320]) {
  test(`calendario personalizzato e scorciatoie weekend a ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 800 });
    await page.clock.setFixedTime(new Date("2026-09-07T12:00:00+02:00"));
    await page.goto("/tornei");
    const filters = page.locator(".ns-filters");
    await filters.getByRole("button", { name: /Filtri/ }).click();
    const dateFrom = filters.getByLabel("Dal", { exact: true });
    const dateTo = filters.getByLabel("Al", { exact: true });

    await filters.getByText("Questo weekend", { exact: true }).click();
    await expect(dateFrom).toHaveValue("12/09/2026");
    await expect(dateTo).toHaveValue("13/09/2026");
    await filters.getByText("Prossimo weekend", { exact: true }).click();
    await expect(dateFrom).toHaveValue("19/09/2026");
    await expect(dateTo).toHaveValue("20/09/2026");
    await expect(filters.getByRole("checkbox", { name: "Questo weekend", exact: true })).not.toBeChecked();
    await expect(filters.getByRole("checkbox", { name: "Prossimo weekend", exact: true })).toBeChecked();

    const trigger = filters.getByRole("button", { name: "Apri calendario per Dal" });
    await trigger.click();
    const picker = page.getByRole("dialog", { name: "Data iniziale" });
    await expect(picker).toBeVisible();
    await expect(filters.locator('input[type="date"]')).toHaveCount(0);
    const selectedDay = picker.getByRole("button", { name: "sabato 19 settembre 2026" });
    await expect(selectedDay).toBeFocused();

    const dimensions = await picker.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return {
        left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom,
        overflow: element.scrollWidth > element.clientWidth,
        pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      };
    });
    expect(dimensions.left).toBeGreaterThanOrEqual(0);
    expect(dimensions.right).toBeLessThanOrEqual(width);
    expect(dimensions.top).toBeGreaterThanOrEqual(0);
    expect(dimensions.bottom).toBeLessThanOrEqual(800);
    expect(dimensions.overflow).toBe(false);
    expect(dimensions.pageOverflow).toBe(false);
    expect((await new AxeBuilder({ page }).include(".ns-date-picker").analyze()).violations).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`date-picker-${width}.png`) });

    await selectedDay.press("ArrowLeft");
    await expect(picker.getByRole("button", { name: "venerdì 18 settembre 2026" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(picker).not.toBeVisible();
    await expect(dateFrom).toHaveValue("18/09/2026");
    await expect(trigger).toBeFocused();
    await expect(filters.getByRole("checkbox", { name: "Prossimo weekend", exact: true })).not.toBeChecked();

    await filters.getByRole("button", { name: "Apri calendario per Al" }).click();
    const endPicker = page.getByRole("dialog", { name: "Data finale" });
    await expect(endPicker.getByRole("button", { name: "giovedì 17 settembre 2026" })).toBeDisabled();
    await expect(endPicker.getByRole("button", { name: "venerdì 18 settembre 2026" })).toBeEnabled();
    await endPicker.getByRole("button", { name: "Mese successivo" }).click();
    await expect(endPicker.getByRole("heading", { name: "ottobre 2026" })).toBeVisible();
    await endPicker.getByRole("button", { name: "domenica 4 ottobre 2026" }).click();
    await expect(dateTo).toHaveValue("04/10/2026");

    await trigger.click();
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
    await trigger.click();
    await picker.getByRole("button", { name: "Svuota" }).focus();
    await page.keyboard.press("Tab");
    await expect(picker).not.toBeVisible();
    await expect(dateTo).toBeFocused();

    await filters.getByText("Prossimo weekend", { exact: true }).click();
    await filters.getByText("Prossimo weekend", { exact: true }).click();
    await expect(dateFrom).toHaveValue("");
    await expect(dateTo).toHaveValue("");
  });
}
