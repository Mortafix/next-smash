import "server-only";

import { and, desc, eq, gte } from "drizzle-orm";
import { connection } from "next/server";

import { getDatabase } from "@/db/client";
import { syncRuns, tournaments, type TournamentRow } from "@/db/schema";
import {
  isTournamentDataStale,
  oldestCompleteSync,
  resolveStaleAfterHours,
} from "@/lib/tournaments/freshness";
import type {
  Tournament,
  TournamentGender,
  TournamentSnapshot,
} from "@/lib/tournaments/types";

function todayIso() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Europe/Rome",
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function parseStringArray(value: string) {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function toTournament(row: TournamentRow): Tournament {
  return {
    id: row.id,
    source: row.source,
    sourceId: row.sourceId,
    title: row.title,
    startDate: row.startDate,
    endDate: row.endDate,
    venueName: row.venueName,
    city: row.city,
    province: row.province,
    provinceCode: row.provinceCode,
    region: row.region,
    latitude: row.latitude,
    longitude: row.longitude,
    locationPrecision: row.locationPrecision,
    genders: parseStringArray(row.gendersJson) as TournamentGender[],
    competitionTypes: parseStringArray(row.competitionTypesJson),
    rankCategories: parseStringArray(row.rankCategoriesJson),
    ageCategories: parseStringArray(row.ageCategoriesJson),
    tpraLevel: row.tpraLevel,
    registrationOnline: row.registrationOnline,
    officialUrl: row.officialUrl,
    sourceStatus: row.sourceStatus,
  };
}

function isMissingSchemaError(error: unknown) {
  return (
    error instanceof Error &&
    /no such table: (tournaments|sync_runs)/i.test(error.message)
  );
}

export async function getTournamentSnapshot(): Promise<TournamentSnapshot> {
  await connection();

  try {
    const database = getDatabase();
    const rows = database
      .select()
      .from(tournaments)
      .where(and(eq(tournaments.active, true), gte(tournaments.endDate, todayIso())))
      .orderBy(tournaments.startDate, tournaments.title)
      .all();

    const latestBySource = (["fitp", "tpra"] as const).map((source) =>
      database
        .select({ completedAt: syncRuns.completedAt })
        .from(syncRuns)
        .where(and(eq(syncRuns.source, source), eq(syncRuns.status, "success")))
        .orderBy(desc(syncRuns.completedAt))
        .limit(1)
        .get(),
    );
    const lastSuccessfulSync = oldestCompleteSync(
      latestBySource.map((run) => run?.completedAt),
    );
    const staleAfterHours = resolveStaleAfterHours(
      process.env.TOURNAMENT_REFRESH_AFTER_HOURS,
    );
    const stale = isTournamentDataStale(
      lastSuccessfulSync,
      new Date(),
      staleAfterHours,
    );

    return {
      tournaments: rows.map(toTournament),
      lastSuccessfulSync: lastSuccessfulSync?.toISOString() ?? null,
      stale,
      setupRequired: false,
    };
  } catch (error) {
    if (!isMissingSchemaError(error)) throw error;

    return {
      tournaments: [],
      lastSuccessfulSync: null,
      stale: true,
      setupRequired: true,
    };
  }
}

export async function getTournamentById(id: string): Promise<Tournament | null> {
  await connection();

  if (!id) return null;

  try {
    const row = getDatabase()
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, id))
      .get();

    return row ? toTournament(row) : null;
  } catch (error) {
    if (!isMissingSchemaError(error)) throw error;
    return null;
  }
}
