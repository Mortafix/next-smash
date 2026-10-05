import { z } from "zod";

import { toIsoDate } from "@/lib/dates";
import {
  tournamentGenders,
  tournamentSources,
  type Tournament,
} from "@/lib/tournaments/types";

export const savedTournamentsStorageKey = "nextsmash:saved-tournaments:v1";
export const savedTournamentsChangedEvent = "nextsmash:saved-tournaments-changed";

const dateSchema = z.string().refine((value) => toIsoDate(value) === value);
const tournamentSchema = z.object({
  id: z.string().min(1),
  source: z.enum(tournamentSources),
  sourceId: z.string(),
  title: z.string().min(1),
  startDate: dateSchema,
  endDate: dateSchema,
  venueName: z.string().nullable(),
  city: z.string().nullable(),
  province: z.string().nullable(),
  provinceCode: z.string().nullable(),
  region: z.string().nullable(),
  latitude: z.number().finite().min(-90).max(90).nullable(),
  longitude: z.number().finite().min(-180).max(180).nullable(),
  locationPrecision: z.enum(["municipality", "unknown"]),
  genders: z.array(z.enum(tournamentGenders)),
  competitionTypes: z.array(z.string()),
  rankCategories: z.array(z.string()),
  ageCategories: z.array(z.string()),
  tpraLevel: z.string().nullable(),
  registrationOnline: z.boolean(),
  officialUrl: z.url({ protocol: /^https?$/ }),
  sourceStatus: z.string().nullable(),
});

const storedSchema = z.object({
  version: z.literal(1),
  tournaments: z.array(tournamentSchema).refine(
    (items) => new Set(items.map((item) => item.id)).size === items.length,
  ),
});

export type SavedTournamentsInspection = {
  status: "empty" | "ready" | "corrupt";
  tournaments: Tournament[];
};

export function inspectSavedTournaments(value: string | null): SavedTournamentsInspection {
  if (value === null) return { status: "empty", tournaments: [] };

  try {
    const stored = storedSchema.parse(JSON.parse(value));
    return { status: "ready", tournaments: stored.tournaments };
  } catch {
    return { status: "corrupt", tournaments: [] };
  }
}

function persistSavedTournaments(
  tournaments: Tournament[],
  { replaceCorrupt = false }: { replaceCorrupt?: boolean } = {},
) {
  if (typeof window === "undefined") return false;

  try {
    const storedValue = window.localStorage.getItem(savedTournamentsStorageKey);
    if (
      !replaceCorrupt &&
      inspectSavedTournaments(storedValue).status === "corrupt"
    ) {
      return false;
    }

    const stored = storedSchema.parse({ version: 1, tournaments });
    window.localStorage.setItem(savedTournamentsStorageKey, JSON.stringify(stored));
    window.dispatchEvent(new Event(savedTournamentsChangedEvent));
    return true;
  } catch {
    return false;
  }
}

export function saveTournament(tournament: Tournament): boolean {
  if (typeof window === "undefined") return false;

  try {
    const state = inspectSavedTournaments(
      window.localStorage.getItem(savedTournamentsStorageKey),
    );
    if (state.status === "corrupt") return false;

    // Persist the complete snapshot so a saved tournament survives source removal.
    const saved = tournamentSchema.parse(tournament);
    const existing = state.tournaments.findIndex((item) => item.id === saved.id);
    const tournaments = [...state.tournaments];
    if (existing === -1) tournaments.unshift(saved);
    else tournaments[existing] = saved;
    return persistSavedTournaments(tournaments);
  } catch {
    return false;
  }
}

export function removeSavedTournament(id: string): boolean {
  if (typeof window === "undefined") return false;

  try {
    const state = inspectSavedTournaments(
      window.localStorage.getItem(savedTournamentsStorageKey),
    );
    if (state.status === "corrupt") return false;
    return persistSavedTournaments(state.tournaments.filter((item) => item.id !== id));
  } catch {
    return false;
  }
}

export function resetSavedTournaments(): boolean {
  return persistSavedTournaments([], { replaceCorrupt: true });
}

export function resolveSavedTournaments(
  saved: Tournament[],
  current: Tournament[],
): Tournament[] {
  const currentById = new Map(current.map((tournament) => [tournament.id, tournament]));
  return saved.map((tournament) => currentById.get(tournament.id) ?? tournament);
}
