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
    preferences.defaults.region = "Lombardia";

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
    preferences.defaults.region = "Lombardia";
    writePreferences(preferences);

    expect(readPreferences().defaults.region).toBe("Lombardia");
    expect(window.localStorage.getItem(preferencesStorageKey)).toContain(
      "Lombardia",
    );
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
