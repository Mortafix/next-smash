import { z } from "zod";

import {
  defaultTournamentFilters,
  type TournamentFilters,
} from "@/lib/tournaments/filters";

export const preferencesStorageKey = "nextsmash:preferences:v1";
export const preferencesChangedEvent = "nextsmash:preferences-changed";

const originSchema = z.object({
  label: z.string(),
  latitude: z.number().finite(),
  longitude: z.number().finite(),
});

const filtersSchema = z.object({
  query: z.string(),
  source: z.enum(["all", "fitp", "tpra"]),
  gender: z.enum(["all", "male", "female", "mixed", "open", "unknown"]),
  rankCategory: z.enum(["all", "1", "2", "3", "4"]),
  tpraLevel: z.enum(["all", "entry", "expert"]),
  region: z.string(),
  provinceCode: z.string(),
  dateFrom: z.string(),
  dateTo: z.string(),
  sort: z.enum(["date", "distance"]),
  origin: originSchema.nullable(),
});

const savedSearchSchema = z.object({
  id: z.string(),
  name: z.string(),
  filters: filtersSchema,
  createdAt: z.string(),
});

const storedPreferencesSchema = z.object({
  version: z.literal(1),
  defaults: filtersSchema,
  lastFilters: filtersSchema,
  savedSearches: z.array(savedSearchSchema),
});

export type SavedSearch = z.infer<typeof savedSearchSchema>;
export type StoredPreferences = z.infer<typeof storedPreferencesSchema>;

export type PreferencesInspection =
  | { status: "empty"; preferences: StoredPreferences }
  | { status: "ready"; preferences: StoredPreferences }
  | { status: "corrupt"; preferences: StoredPreferences };

export function emptyPreferences(): StoredPreferences {
  return {
    version: 1,
    defaults: { ...defaultTournamentFilters },
    lastFilters: { ...defaultTournamentFilters },
    savedSearches: [],
  };
}

export function inspectPreferences(value: string | null): PreferencesInspection {
  if (value === null) {
    return { status: "empty", preferences: emptyPreferences() };
  }

  try {
    return {
      status: "ready",
      preferences: storedPreferencesSchema.parse(JSON.parse(value)),
    };
  } catch {
    return { status: "corrupt", preferences: emptyPreferences() };
  }
}

export function parsePreferences(value: string | null): StoredPreferences {
  return inspectPreferences(value).preferences;
}

export function readPreferences(): StoredPreferences {
  if (typeof window === "undefined") return emptyPreferences();
  try {
    return parsePreferences(window.localStorage.getItem(preferencesStorageKey));
  } catch {
    return emptyPreferences();
  }
}

function persistPreferences(
  preferences: StoredPreferences,
  { replaceCorrupt = false }: { replaceCorrupt?: boolean } = {},
) {
  if (typeof window === "undefined") return false;

  try {
    if (
      !replaceCorrupt &&
      inspectPreferences(window.localStorage.getItem(preferencesStorageKey)).status ===
        "corrupt"
    ) {
      return false;
    }

    window.localStorage.setItem(
      preferencesStorageKey,
      JSON.stringify(storedPreferencesSchema.parse(preferences)),
    );
    window.dispatchEvent(new Event(preferencesChangedEvent));
    return true;
  } catch {
    return false;
  }
}

export function writePreferences(preferences: StoredPreferences) {
  return persistPreferences(preferences);
}

export function resetPreferences() {
  return persistPreferences(emptyPreferences(), { replaceCorrupt: true });
}

export function saveLastFilters(filters: TournamentFilters) {
  const preferences = readPreferences();
  writePreferences({ ...preferences, lastFilters: filters });
}

export function newSavedSearch(
  name: string,
  filters: TournamentFilters,
): SavedSearch {
  return {
    id: crypto.randomUUID(),
    name: name.trim(),
    filters,
    createdAt: new Date().toISOString(),
  };
}
