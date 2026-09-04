import { and, count, desc, eq } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import { syncRuns, tournaments } from "@/db/schema";
import { resolveMunicipality } from "@/lib/locations/municipalities";
import {
  fetchPucTournaments,
  type PucFetchResult,
} from "@/lib/tournaments/puc";
import {
  isTournamentDataStale,
  oldestCompleteSync,
  resolveStaleAfterHours,
  tournamentSyncCooldownMinutes,
  tournamentSyncLeaseMinutes,
} from "@/lib/tournaments/freshness";
import {
  tournamentSources,
  type TournamentSource,
} from "@/lib/tournaments/types";

type FetchSource = (source: TournamentSource) => Promise<PucFetchResult>;

export type SourceSyncResult = {
  source: TournamentSource;
  ok: boolean;
  recordsSeen: number;
  recordsStored: number;
  error: string | null;
};

export type TournamentSyncClaim =
  | {
      status: "started" | "running";
      runId: number;
      lastSuccessfulSync: string | null;
    }
  | {
      status: "fresh";
      lastSuccessfulSync: string;
    }
  | {
      status: "cooldown";
      lastSuccessfulSync: string | null;
      retryAt: string;
    }
  | { status: "setup-required" };

export type TournamentSyncBatchResult = {
  runId: number;
  status: "success" | "failed";
  results: SourceSyncResult[];
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Errore sconosciuto";
}

function isMissingSchemaError(error: unknown) {
  return (
    error instanceof Error &&
    /no such table: (tournaments|sync_runs)/i.test(error.message)
  );
}

export async function syncTournamentSource(
  source: TournamentSource,
  fetchSource: FetchSource = fetchPucTournaments,
  batchRunId?: number,
): Promise<SourceSyncResult> {
  const database = getDatabase();
  const startedAt = new Date();
  const run = database
    .insert(syncRuns)
    .values({ source, startedAt, status: "running" })
    .returning({ id: syncRuns.id })
    .get();

  try {
    if (batchRunId !== undefined) {
      const batch = database
        .select({ status: syncRuns.status })
        .from(syncRuns)
        .where(and(eq(syncRuns.id, batchRunId), eq(syncRuns.source, "all")))
        .get();
      if (batch?.status !== "running") {
        throw new Error("Sincronizzazione sostituita da un aggiornamento più recente");
      }
    }

    const snapshot = await fetchSource(source);
    const previousActive = database
      .select({ value: count() })
      .from(tournaments)
      .where(and(eq(tournaments.source, source), eq(tournaments.active, true)))
      .get()?.value;

    if (snapshot.declaredTotal === 0 && (previousActive ?? 0) > 0) {
      throw new Error(
        `Snapshot ${source} vuoto: conservato l’ultimo elenco valido`,
      );
    }

    const now = new Date();
    database.transaction((transaction) => {
      if (batchRunId !== undefined) {
        const batch = transaction
          .select({ status: syncRuns.status })
          .from(syncRuns)
          .where(and(eq(syncRuns.id, batchRunId), eq(syncRuns.source, "all")))
          .get();
        if (batch?.status !== "running") {
          throw new Error(
            "Sincronizzazione sostituita da un aggiornamento più recente",
          );
        }
      }

      transaction
        .update(tournaments)
        .set({ active: false })
        .where(eq(tournaments.source, source))
        .run();

      for (const tournament of snapshot.tournaments) {
        const municipality = resolveMunicipality(
          tournament.city,
          tournament.provinceCode,
        );
        const values = {
          id: tournament.id,
          source: tournament.source,
          sourceId: tournament.sourceId,
          title: tournament.title,
          startDate: tournament.startDate,
          endDate: tournament.endDate,
          venueName: tournament.venueName,
          city: tournament.city,
          province: tournament.province,
          provinceCode: tournament.provinceCode,
          region: municipality?.regionName ?? null,
          latitude: municipality?.latitude ?? null,
          longitude: municipality?.longitude ?? null,
          locationPrecision: municipality ? ("municipality" as const) : ("unknown" as const),
          gendersJson: JSON.stringify(tournament.genders),
          competitionTypesJson: JSON.stringify(tournament.competitionTypes),
          rankCategoriesJson: JSON.stringify(tournament.rankCategories),
          ageCategoriesJson: JSON.stringify(tournament.ageCategories),
          tpraLevel: tournament.tpraLevel,
          registrationOnline: tournament.registrationOnline,
          officialUrl: tournament.officialUrl,
          sourceStatus: tournament.sourceStatus,
          rawJson: tournament.rawJson,
          checksum: tournament.checksum,
          active: true,
          firstSeenAt: now,
          lastSeenAt: now,
          syncedAt: now,
        };

        transaction
          .insert(tournaments)
          .values(values)
          .onConflictDoUpdate({
            target: tournaments.id,
            set: {
              sourceId: values.sourceId,
              title: values.title,
              startDate: values.startDate,
              endDate: values.endDate,
              venueName: values.venueName,
              city: values.city,
              province: values.province,
              provinceCode: values.provinceCode,
              region: values.region,
              latitude: values.latitude,
              longitude: values.longitude,
              locationPrecision: values.locationPrecision,
              gendersJson: values.gendersJson,
              competitionTypesJson: values.competitionTypesJson,
              rankCategoriesJson: values.rankCategoriesJson,
              ageCategoriesJson: values.ageCategoriesJson,
              tpraLevel: values.tpraLevel,
              registrationOnline: values.registrationOnline,
              officialUrl: values.officialUrl,
              sourceStatus: values.sourceStatus,
              rawJson: values.rawJson,
              checksum: values.checksum,
              active: true,
              lastSeenAt: now,
              syncedAt: now,
            },
          })
          .run();
      }
    });

    database
      .update(syncRuns)
      .set({
        status: "success",
        completedAt: now,
        recordsSeen: snapshot.declaredTotal,
        recordsStored: snapshot.tournaments.length,
        errorMessage: null,
      })
      .where(eq(syncRuns.id, run.id))
      .run();

    return {
      source,
      ok: true,
      recordsSeen: snapshot.declaredTotal,
      recordsStored: snapshot.tournaments.length,
      error: null,
    };
  } catch (error) {
    const message = errorMessage(error);
    database
      .update(syncRuns)
      .set({
        status: "failed",
        completedAt: new Date(),
        errorMessage: message,
      })
      .where(eq(syncRuns.id, run.id))
      .run();

    return {
      source,
      ok: false,
      recordsSeen: 0,
      recordsStored: 0,
      error: message,
    };
  }
}

export async function syncAllTournaments(
  fetchSource: FetchSource = fetchPucTournaments,
  batchRunId?: number,
) {
  const results: SourceSyncResult[] = [];
  for (const source of tournamentSources) {
    results.push(
      await syncTournamentSource(source, fetchSource, batchRunId),
    );
  }
  return results;
}

export function claimTournamentSync({
  force = false,
  now = new Date(),
}: {
  force?: boolean;
  now?: Date;
} = {}): TournamentSyncClaim {
  try {
    const database = getDatabase();

    return database.transaction(
      (transaction) => {
        const latestBySource = tournamentSources.map((source) =>
          transaction
            .select({ completedAt: syncRuns.completedAt })
            .from(syncRuns)
            .where(
              and(eq(syncRuns.source, source), eq(syncRuns.status, "success")),
            )
            .orderBy(desc(syncRuns.completedAt))
            .limit(1)
            .get(),
        );
        const lastSuccessfulSync = oldestCompleteSync(
          latestBySource.map((run) => run?.completedAt),
        );
        const serializedLastSync = lastSuccessfulSync?.toISOString() ?? null;
        const staleAfterHours = resolveStaleAfterHours(
          process.env.TOURNAMENT_REFRESH_AFTER_HOURS,
        );

        if (
          !force &&
          !isTournamentDataStale(lastSuccessfulSync, now, staleAfterHours)
        ) {
          return {
            status: "fresh" as const,
            lastSuccessfulSync: serializedLastSync!,
          };
        }

        const latestBatch = transaction
          .select({
            id: syncRuns.id,
            status: syncRuns.status,
            startedAt: syncRuns.startedAt,
            completedAt: syncRuns.completedAt,
          })
          .from(syncRuns)
          .where(eq(syncRuns.source, "all"))
          .orderBy(desc(syncRuns.startedAt))
          .limit(1)
          .get();
        let expiredRunningBatch = false;

        if (latestBatch?.status === "running") {
          const leaseAge = now.getTime() - latestBatch.startedAt.getTime();
          if (leaseAge <= tournamentSyncLeaseMinutes * 60_000) {
            return {
              status: "running" as const,
              runId: latestBatch.id,
              lastSuccessfulSync: serializedLastSync,
            };
          }

          transaction
            .update(syncRuns)
            .set({
              status: "failed",
              completedAt: now,
              errorMessage: "Sincronizzazione interrotta prima del completamento",
            })
            .where(eq(syncRuns.id, latestBatch.id))
            .run();
          expiredRunningBatch = true;
        }

        if (
          !force &&
          latestBatch?.status === "failed" &&
          !expiredRunningBatch
        ) {
          const lastAttemptAt =
            latestBatch.completedAt ?? latestBatch.startedAt;
          const retryAt = new Date(
            lastAttemptAt.getTime() + tournamentSyncCooldownMinutes * 60_000,
          );

          if (retryAt.getTime() > now.getTime()) {
            return {
              status: "cooldown" as const,
              lastSuccessfulSync: serializedLastSync,
              retryAt: retryAt.toISOString(),
            };
          }
        }

        const run = transaction
          .insert(syncRuns)
          .values({ source: "all", startedAt: now, status: "running" })
          .returning({ id: syncRuns.id })
          .get();

        return {
          status: "started" as const,
          runId: run.id,
          lastSuccessfulSync: serializedLastSync,
        };
      },
      { behavior: "immediate" },
    );
  } catch (error) {
    if (isMissingSchemaError(error)) return { status: "setup-required" };
    throw error;
  }
}

export async function runClaimedTournamentSync(
  runId: number,
  fetchSource: FetchSource = fetchPucTournaments,
): Promise<TournamentSyncBatchResult> {
  const database = getDatabase();
  const claimedRun = database
    .select({ status: syncRuns.status })
    .from(syncRuns)
    .where(and(eq(syncRuns.id, runId), eq(syncRuns.source, "all")))
    .get();

  if (claimedRun?.status !== "running") {
    throw new Error("Sincronizzazione non disponibile o già conclusa");
  }

  const results: SourceSyncResult[] = [];

  try {
    results.push(...(await syncAllTournaments(fetchSource, runId)));
  } catch (error) {
    results.push({
      source: tournamentSources[results.length] ?? "fitp",
      ok: false,
      recordsSeen: 0,
      recordsStored: 0,
      error: errorMessage(error),
    });
  }

  const succeeded = results.length === tournamentSources.length &&
    results.every((result) => result.ok);
  const completedAt = new Date();
  const failureSummary = results
    .filter((result) => !result.ok)
    .map((result) => `${result.source.toUpperCase()}: ${result.error}`)
    .join("; ");

  database
    .update(syncRuns)
    .set({
      status: succeeded ? "success" : "failed",
      completedAt,
      recordsSeen: results.reduce(
        (total, result) => total + result.recordsSeen,
        0,
      ),
      recordsStored: results.reduce(
        (total, result) => total + result.recordsStored,
        0,
      ),
      errorMessage: succeeded
        ? null
        : failureSummary || "Sincronizzazione non completata",
    })
    .where(and(eq(syncRuns.id, runId), eq(syncRuns.status, "running")))
    .run();

  return {
    runId,
    status: succeeded ? "success" : "failed",
    results,
  };
}

export function failClaimedTournamentSync(runId: number, error: unknown) {
  getDatabase()
    .update(syncRuns)
    .set({
      status: "failed",
      completedAt: new Date(),
      errorMessage: errorMessage(error),
    })
    .where(and(eq(syncRuns.id, runId), eq(syncRuns.status, "running")))
    .run();
}

export function getTournamentSyncRun(runId: number, now = new Date()) {
  try {
    const database = getDatabase();
    let run = database
      .select({
        id: syncRuns.id,
        status: syncRuns.status,
        startedAt: syncRuns.startedAt,
        completedAt: syncRuns.completedAt,
      })
      .from(syncRuns)
      .where(and(eq(syncRuns.id, runId), eq(syncRuns.source, "all")))
      .get();

    if (!run) return null;

    const leaseExpired =
      run.status === "running" &&
      now.getTime() - run.startedAt.getTime() >
        tournamentSyncLeaseMinutes * 60_000;

    if (leaseExpired) {
      run = database.transaction(
        (transaction) => {
          const current = transaction
            .select({
              id: syncRuns.id,
              status: syncRuns.status,
              startedAt: syncRuns.startedAt,
              completedAt: syncRuns.completedAt,
            })
            .from(syncRuns)
            .where(and(eq(syncRuns.id, runId), eq(syncRuns.source, "all")))
            .get();

          if (
            current?.status === "running" &&
            now.getTime() - current.startedAt.getTime() >
              tournamentSyncLeaseMinutes * 60_000
          ) {
            transaction
              .update(syncRuns)
              .set({
                status: "failed",
                completedAt: now,
                errorMessage: "Sincronizzazione oltre il tempo massimo",
              })
              .where(
                and(eq(syncRuns.id, runId), eq(syncRuns.status, "running")),
              )
              .run();

            return { ...current, status: "failed" as const, completedAt: now };
          }

          return current;
        },
        { behavior: "immediate" },
      );
    }

    if (!run) return null;

    const completedAt = run.completedAt?.toISOString() ?? null;

    return {
      runId: run.id,
      status: run.status,
      startedAt: run.startedAt.toISOString(),
      completedAt,
      ...(run.status === "failed"
        ? {
            retryAt: new Date(
              (run.completedAt ?? run.startedAt).getTime() +
                tournamentSyncCooldownMinutes * 60_000,
            ).toISOString(),
          }
        : {}),
    };
  } catch (error) {
    if (isMissingSchemaError(error)) return null;
    throw error;
  }
}
