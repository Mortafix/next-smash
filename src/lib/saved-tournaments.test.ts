import { beforeEach, describe, expect, it, vi } from "vitest";

import { emptyPreferences, preferencesStorageKey, readPreferences } from "@/lib/preferences";
import {
  inspectSavedTournaments,
  removeSavedTournament,
  resetSavedTournaments,
  resolveSavedTournaments,
  saveTournament,
  savedTournamentsChangedEvent,
  savedTournamentsStorageKey,
} from "@/lib/saved-tournaments";
import type { Tournament } from "@/lib/tournaments/types";

function tournament(overrides: Partial<Tournament> = {}): Tournament {
  return {
    id: "fitp:one",
    source: "fitp",
    sourceId: "one",
    title: "Open Milano",
    startDate: "2026-10-10",
    endDate: "2026-10-11",
    venueName: "Padel Milano",
    city: "Milano",
    province: "Milano",
    provinceCode: "MI",
    region: "Lombardia",
    latitude: 45.46,
    longitude: 9.19,
    locationPrecision: "municipality",
    genders: ["male", "female"],
    competitionTypes: ["Doppio"],
    rankCategories: ["3", "4"],
    ageCategories: [],
    tpraLevel: null,
    registrationOnline: true,
    officialUrl: "https://example.test/one",
    sourceStatus: "Iscrizioni aperte",
    ...overrides,
  };
}

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
      get length() { return values.size; },
    } satisfies Storage,
  });
});

describe("tornei salvati nel browser", () => {
  it("conserva lo snapshot completo, evita duplicati e rimuove per ID", () => {
    const first = tournament();
    expect(saveTournament(first)).toBe(true);
    expect(saveTournament(tournament({ id: "tpra:two", source: "tpra" }))).toBe(true);
    const updated = tournament({ title: "Open Milano aggiornato" });
    expect(saveTournament(updated)).toBe(true);

    expect(inspectSavedTournaments(window.localStorage.getItem(savedTournamentsStorageKey))).toEqual({
      status: "ready",
      tournaments: [tournament({ id: "tpra:two", source: "tpra" }), updated],
    });
    expect(removeSavedTournament("fitp:one")).toBe(true);
    expect(inspectSavedTournaments(window.localStorage.getItem(savedTournamentsStorageKey)).tournaments).toHaveLength(1);
  });

  it("usa i dati attuali e mantiene un torneo che la fonte non espone più", () => {
    const saved = [tournament(), tournament({ id: "fitp:archived" })];
    const fresh = tournament({ title: "Open con programma aggiornato" });
    expect(resolveSavedTournaments(saved, [fresh])).toEqual([fresh, saved[1]]);
    expect(saved[0].title).toBe("Open Milano");
  });

  it("mantiene intatte le ricerche della versione precedente durante salvataggi e ripristino tornei", () => {
    const preferences = emptyPreferences();
    const legacyFilters = { ...preferences.lastFilters, region: "Lombardia", regions: undefined };
    const legacy = JSON.stringify({
      ...preferences,
      defaults: legacyFilters,
      lastFilters: legacyFilters,
      savedSearches: [{
        id: "search-one",
        name: "Milano",
        filters: legacyFilters,
        createdAt: "2026-10-05T08:00:00.000Z",
      }],
    });
    window.localStorage.setItem(preferencesStorageKey, legacy);

    expect(saveTournament(tournament())).toBe(true);
    expect(resetSavedTournaments()).toBe(true);
    expect(window.localStorage.getItem(preferencesStorageKey)).toBe(legacy);
    expect(readPreferences().savedSearches[0].name).toBe("Milano");
    expect(readPreferences().savedSearches[0].filters.regions).toEqual(["Lombardia"]);
  });

  it("non sovrascrive contenuto corrotto senza ripristino esplicito", () => {
    const changed = vi.fn();
    window.addEventListener(savedTournamentsChangedEvent, changed);
    window.localStorage.setItem(savedTournamentsStorageKey, "non-json");

    expect(saveTournament(tournament())).toBe(false);
    expect(removeSavedTournament("fitp:one")).toBe(false);
    expect(window.localStorage.getItem(savedTournamentsStorageKey)).toBe("non-json");
    expect(changed).not.toHaveBeenCalled();

    expect(resetSavedTournaments()).toBe(true);
    expect(inspectSavedTournaments(window.localStorage.getItem(savedTournamentsStorageKey))).toEqual({ status: "ready", tournaments: [] });
    expect(changed).toHaveBeenCalledTimes(1);
    window.removeEventListener(savedTournamentsChangedEvent, changed);
  });

  it("distingue archivio vuoto e invalido e rifiuta snapshot pericolosi o incompleti", () => {
    expect(inspectSavedTournaments(null)).toEqual({ status: "empty", tournaments: [] });
    for (const invalid of [
      "non-json",
      JSON.stringify({ version: 99, tournaments: [] }),
      JSON.stringify({ version: 1, tournaments: [{ id: "one" }] }),
      JSON.stringify({ version: 1, tournaments: [tournament({ startDate: "2026-02-30" })] }),
      JSON.stringify({ version: 1, tournaments: [tournament({ officialUrl: "javascript:alert(1)" })] }),
      JSON.stringify({ version: 1, tournaments: [tournament(), tournament()] }),
    ]) {
      expect(inspectSavedTournaments(invalid)).toEqual({ status: "corrupt", tournaments: [] });
    }
  });

  it("non annuncia salvataggi falliti quando il browser rifiuta lo storage", () => {
    const changed = vi.fn();
    window.addEventListener(savedTournamentsChangedEvent, changed);
    Object.defineProperty(window.localStorage, "setItem", {
      configurable: true,
      value: () => { throw new Error("storage unavailable"); },
    });

    expect(saveTournament(tournament())).toBe(false);
    expect(removeSavedTournament("fitp:one")).toBe(false);
    expect(resetSavedTournaments()).toBe(false);
    expect(changed).not.toHaveBeenCalled();
    expect(window.localStorage.getItem(savedTournamentsStorageKey)).toBeNull();
    window.removeEventListener(savedTournamentsChangedEvent, changed);
  });

  it("gestisce anche lo storage che non si può leggere", () => {
    Object.defineProperty(window.localStorage, "getItem", {
      configurable: true,
      value: () => { throw new Error("storage unavailable"); },
    });
    expect(saveTournament(tournament())).toBe(false);
    expect(removeSavedTournament("fitp:one")).toBe(false);
    expect(resetSavedTournaments()).toBe(false);
  });
});
