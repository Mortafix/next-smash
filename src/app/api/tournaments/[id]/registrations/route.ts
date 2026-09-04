import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getDatabase } from "@/db/client";
import { tournaments } from "@/db/schema";
import type { TournamentRegistrationSummary } from "@/lib/tournaments/registration-types";
import { fetchTournamentRegistrationSummary } from "@/lib/tournaments/registrations";
import type { TournamentSource } from "@/lib/tournaments/types";

export const runtime = "nodejs";

const CACHE_TTL_MS = 10 * 60 * 1_000;
const MAX_CACHE_ENTRIES = 256;
const CACHE_CONTROL =
  "public, max-age=600, s-maxage=600, stale-while-revalidate=60";

const fitpIdSchema = z.uuid();
const tpraIdSchema = z.string().regex(/^\d+$/).max(20);

type ParsedTournamentId = {
  id: string;
  source: TournamentSource;
  sourceId: string;
};

type CacheEntry = {
  expiresAt: number;
  promise: Promise<TournamentRegistrationSummary>;
};

const summaryCache = new Map<string, CacheEntry>();

function parseTournamentId(value: string): ParsedTournamentId | null {
  const separator = value.indexOf(":");
  if (separator <= 0) return null;

  const source = value.slice(0, separator);
  const sourceId = value.slice(separator + 1);
  if (source === "fitp" && fitpIdSchema.safeParse(sourceId).success) {
    return { id: value, source, sourceId };
  }
  if (source === "tpra" && tpraIdSchema.safeParse(sourceId).success) {
    return { id: value, source, sourceId };
  }
  return null;
}

function pruneExpiredCache(now: number) {
  for (const [key, entry] of summaryCache) {
    if (entry.expiresAt <= now) summaryCache.delete(key);
  }
}

function evictOldestCacheEntry() {
  const oldestKey = summaryCache.keys().next().value as string | undefined;
  if (oldestKey !== undefined) summaryCache.delete(oldestKey);
}

async function getCachedSummary(tournament: ParsedTournamentId) {
  const now = Date.now();
  pruneExpiredCache(now);

  const cached = summaryCache.get(tournament.id);
  if (cached) return cached.promise;

  if (summaryCache.size >= MAX_CACHE_ENTRIES) evictOldestCacheEntry();

  const promise = fetchTournamentRegistrationSummary(
    tournament.source,
    tournament.sourceId,
  );
  summaryCache.set(tournament.id, {
    expiresAt: now + CACHE_TTL_MS,
    promise,
  });

  try {
    return await promise;
  } catch (error) {
    if (summaryCache.get(tournament.id)?.promise === promise) {
      summaryCache.delete(tournament.id);
    }
    throw error;
  }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const tournament = parseTournamentId(id);
  if (!tournament) {
    return NextResponse.json(
      { error: "Identificativo torneo non valido" },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }

  try {
    const stored = getDatabase()
      .select({ id: tournaments.id })
      .from(tournaments)
      .where(eq(tournaments.id, tournament.id))
      .get();

    if (!stored) {
      return NextResponse.json(
        { error: "Torneo non trovato" },
        { status: 404, headers: { "cache-control": "no-store" } },
      );
    }

    const summary = await getCachedSummary(tournament);
    return NextResponse.json(summary, {
      headers: { "cache-control": CACHE_CONTROL },
    });
  } catch {
    return NextResponse.json(
      { error: "Impossibile recuperare le iscrizioni del torneo" },
      { status: 502, headers: { "cache-control": "no-store" } },
    );
  }
}
