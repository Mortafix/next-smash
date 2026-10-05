import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  emptyPreferences,
  inspectPreferences,
  parsePreferences,
  preferencesChangedEvent,
  preferencesStorageKey,
  readPreferences,
  resetPreferences,
  writePreferences,
} from "@/lib/preferences";
import { defaultTournamentFilters, regionsForTournamentZone } from "@/lib/tournaments/filters";

function filtersWithoutRegions() {
  return Object.fromEntries(Object.entries(defaultTournamentFilters).filter(([key]) => key !== "regions"));
}

describe("preferenze browser", () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key),
        clear: () => values.clear(),
        key: (index: number) => [...values.keys()][index] ?? null,
        get length() {
          return values.size;
        },
      } satisfies Storage,
    });
  });

  it("distingue storage vuoto, valido e corrotto", () => {
    const preferences = emptyPreferences();
    preferences.defaults.regions = ["Lombardia"];

    expect(inspectPreferences(null)).toEqual({
      status: "empty",
      preferences: emptyPreferences(),
    });
    expect(inspectPreferences(JSON.stringify(preferences))).toEqual({
      status: "ready",
      preferences,
    });
    expect(inspectPreferences("non-json")).toEqual({
      status: "corrupt",
      preferences: emptyPreferences(),
    });
    expect(inspectPreferences("").status).toBe("corrupt");
  });

  it("mantiene il fallback compatibile se lo storage è corrotto", () => {
    expect(parsePreferences("non-json")).toEqual(emptyPreferences());
    expect(parsePreferences('{"version":99}')).toEqual(emptyPreferences());
  });

  it("salva e rilegge filtri e ricerche solo nel browser", () => {
    const preferences = emptyPreferences();
    preferences.defaults.regions = ["Lombardia"];
    writePreferences(preferences);

    expect(readPreferences().defaults.regions).toEqual(["Lombardia"]);
    expect(window.localStorage.getItem(preferencesStorageKey)).toContain(
      "Lombardia",
    );
  });

  it("migra regioni singole da filtri e ricerche già salvati nel browser", () => {
    const legacyFilters = filtersWithoutRegions();
    const stored = {
      version: 1,
      defaults: { ...legacyFilters, region: "Valle d'Aosta/Vallée d'Aoste" },
      lastFilters: { ...legacyFilters, region: "Trentino-Alto Adige/Südtirol", provinceCode: "TN" },
      savedSearches: [{
        id: "prima-ricerca", name: "Weekend Lombardia", createdAt: "2026-09-01T12:00:00.000Z",
        filters: { ...legacyFilters, region: "Lombardia", dateFrom: "2026-10-09" },
      }],
    };
    const inspected = inspectPreferences(JSON.stringify(stored));
    expect(inspected.status).toBe("ready");
    expect(inspected.preferences.defaults.regions).toEqual(["Valle d’Aosta"]);
    expect(inspected.preferences.lastFilters).toMatchObject({ regions: ["Trentino-Alto Adige"], provinceCode: "TN" });
    expect(inspected.preferences.savedSearches[0]).toMatchObject({
      id: "prima-ricerca", name: "Weekend Lombardia",
      filters: { regions: ["Lombardia"], dateFrom: "2026-10-09" },
    });
    expect(inspected.preferences.lastFilters).not.toHaveProperty("region");
    window.localStorage.setItem(preferencesStorageKey, JSON.stringify(stored));
    expect(writePreferences(inspected.preferences)).toBe(true);
    expect(readPreferences().savedSearches[0].filters.regions).toEqual(["Lombardia"]);
  });

  it("usa una selezione vuota se il nuovo campo manca e non perde le ricerche", () => {
    const filtersWithoutRegion = filtersWithoutRegions();
    const stored = { ...emptyPreferences(), lastFilters: filtersWithoutRegion };
    expect(inspectPreferences(JSON.stringify(stored))).toMatchObject({
      status: "ready", preferences: { lastFilters: { regions: [] } },
    });
  });

  it("preserva le zone salvate e dà precedenza alle regioni nuove rispetto al campo precedente", () => {
    const stored = emptyPreferences();
    stored.lastFilters.regions = regionsForTournamentZone("centro");
    const parsed = parsePreferences(JSON.stringify({
      ...stored, lastFilters: { ...stored.lastFilters, region: "Lombardia" },
    }));
    expect(parsed.lastFilters.regions).toEqual(["Lazio", "Marche", "Toscana", "Umbria"]);
  });

  it("segnala il fallimento senza notificare un cambiamento inesistente", () => {
    const changed = vi.fn();
    window.addEventListener(preferencesChangedEvent, changed);
    Object.defineProperty(window.localStorage, "setItem", {
      configurable: true,
      value: () => {
        throw new Error("storage unavailable");
      },
    });

    expect(writePreferences(emptyPreferences())).toBe(false);
    expect(changed).not.toHaveBeenCalled();

    window.removeEventListener(preferencesChangedEvent, changed);
  });

  it("non sovrascrive dati corrotti senza un ripristino esplicito", () => {
    const changed = vi.fn();
    window.localStorage.setItem(preferencesStorageKey, "non-json");
    window.addEventListener(preferencesChangedEvent, changed);

    expect(writePreferences(emptyPreferences())).toBe(false);
    expect(window.localStorage.getItem(preferencesStorageKey)).toBe("non-json");
    expect(changed).not.toHaveBeenCalled();

    expect(resetPreferences()).toBe(true);
    expect(
      inspectPreferences(window.localStorage.getItem(preferencesStorageKey)).status,
    ).toBe("ready");
    expect(changed).toHaveBeenCalledTimes(1);

    window.removeEventListener(preferencesChangedEvent, changed);
  });
});
