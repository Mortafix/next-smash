// @vitest-environment node

import { and, count, eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { getDatabase } from "@/db/client";
import { syncRuns, tournaments } from "@/db/schema";
import {
  tournamentSyncCooldownMinutes,
  tournamentSyncLeaseMinutes,
} from "@/lib/tournaments/freshness";
import type { PucFetchResult } from "@/lib/tournaments/puc";
import {
  claimTournamentSync,
  getTournamentSyncRun,
  runClaimedTournamentSync,
} from "@/lib/tournaments/sync";
import type { TournamentSource } from "@/lib/tournaments/types";

const now = new Date("2026-09-04T12:00:00.000Z");

function successfulSourceRun(source: TournamentSource, completedAt: Date) {
  getDatabase()
    .insert(syncRuns)
    .values({
      source,
      status: "success",
      startedAt: new Date(completedAt.getTime() - 1_000),
      completedAt,
    })
    .run();
}

function sourceSnapshot(source: TournamentSource): PucFetchResult {
  return {
    source,
    declaredTotal: 1,
    tournaments: [
      {
        id: `${source}:coordinator-test`,
        source,
        sourceId: "coordinator-test",
        title: `Torneo ${source.toUpperCase()}`,
        startDate: "2026-09-05",
        endDate: "2026-09-06",
        venueName: "Club Test",
        city: "Milano",
        province: "Milano",
        provinceCode: "MI",
        genders: ["open"],
        competitionTypes: ["Doppio"],
        rankCategories: [],
        ageCategories: ["NOR"],
        tpraLevel: null,
        registrationOnline: true,
        officialUrl: `https://example.test/${source}`,
        sourceStatus: "in programma",
        rawJson: "{}",
        checksum: `${source}-checksum`,
      },
    ],
  };
}

beforeAll(() => {
  const directory = mkdtempSync(join(tmpdir(), "nextsmash-coordinator-test-"));
  process.env.DATABASE_PATH = join(directory, "test.sqlite");
  migrate(getDatabase(), { migrationsFolder: join(process.cwd(), "drizzle") });
});

beforeEach(() => {
  delete process.env.TOURNAMENT_REFRESH_AFTER_HOURS;
  getDatabase().delete(tournaments).run();
  getDatabase().delete(syncRuns).run();
});

describe("coordinator della sincronizzazione tornei", () => {
  it("acquisisce un claim quando non esiste uno snapshot completo", () => {
    const claim = claimTournamentSync({ now });

    expect(claim).toMatchObject({
      status: "started",
      lastSuccessfulSync: null,
    });
    expect(claim.status).toBe("started");
    if (claim.status !== "started") throw new Error("Claim non acquisito");

    expect(getTournamentSyncRun(claim.runId, now)).toEqual({
      runId: claim.runId,
      status: "running",
      startedAt: now.toISOString(),
      completedAt: null,
    });
  });

  it("deduplica claim successivi mentre il batch è in esecuzione", () => {
    const first = claimTournamentSync({ now });
    expect(first.status).toBe("started");
    if (first.status !== "started") throw new Error("Claim non acquisito");

    const duplicate = claimTournamentSync({
      now: new Date(now.getTime() + 1_000),
    });
    const runningBatches = getDatabase()
      .select({ value: count() })
      .from(syncRuns)
      .where(and(eq(syncRuns.source, "all"), eq(syncRuns.status, "running")))
      .get();

    expect(duplicate).toMatchObject({
      status: "running",
      runId: first.runId,
    });
    expect(runningBatches?.value).toBe(1);
  });

  it("rispetta il confine di freschezza delle 12 ore", () => {
    const oldestSync = new Date(now.getTime() - 12 * 60 * 60_000);
    successfulSourceRun("fitp", oldestSync);
    successfulSourceRun("tpra", new Date(now.getTime() - 60_000));

    expect(claimTournamentSync({ now })).toEqual({
      status: "fresh",
      lastSuccessfulSync: oldestSync.toISOString(),
    });

    expect(
      claimTournamentSync({ now: new Date(now.getTime() + 1) }),
    ).toMatchObject({
      status: "started",
      lastSuccessfulSync: oldestSync.toISOString(),
    });
  });

  it("non considera fresco uno snapshot a cui manca una fonte", () => {
    successfulSourceRun("fitp", new Date(now.getTime() - 60_000));

    expect(claimTournamentSync({ now })).toMatchObject({
      status: "started",
      lastSuccessfulSync: null,
    });
  });

  it("completa con successo il batch rivendicato e ne salva i contatori", async () => {
    const claim = claimTournamentSync({ now });
    expect(claim.status).toBe("started");
    if (claim.status !== "started") throw new Error("Claim non acquisito");
    const fetchSource = vi.fn(async (source: TournamentSource) =>
      sourceSnapshot(source),
    );

    const result = await runClaimedTournamentSync(claim.runId, fetchSource);
    const storedBatch = getDatabase()
      .select()
      .from(syncRuns)
      .where(eq(syncRuns.id, claim.runId))
      .get();

    expect(fetchSource.mock.calls.map(([source]) => source)).toEqual([
      "fitp",
      "tpra",
    ]);
    expect(result).toMatchObject({
      runId: claim.runId,
      status: "success",
      results: [
        { source: "fitp", ok: true },
        { source: "tpra", ok: true },
      ],
    });
    expect(storedBatch).toMatchObject({
      status: "success",
      recordsSeen: 2,
      recordsStored: 2,
      errorMessage: null,
    });
    expect(storedBatch?.completedAt).toBeInstanceOf(Date);
  });

  it("marca il batch come fallito se fallisce anche una sola fonte", async () => {
    const claim = claimTournamentSync({ now });
    expect(claim.status).toBe("started");
    if (claim.status !== "started") throw new Error("Claim non acquisito");
    const fetchSource = vi.fn(async (source: TournamentSource) => {
      if (source === "tpra") throw new Error("TPRA non disponibile");
      return sourceSnapshot(source);
    });

    const result = await runClaimedTournamentSync(claim.runId, fetchSource);
    const storedBatch = getDatabase()
      .select()
      .from(syncRuns)
      .where(eq(syncRuns.id, claim.runId))
      .get();

    expect(result).toMatchObject({
      status: "failed",
      results: [
        { source: "fitp", ok: true },
        { source: "tpra", ok: false, error: "TPRA non disponibile" },
      ],
    });
    expect(storedBatch).toMatchObject({
      status: "failed",
      recordsSeen: 1,
      recordsStored: 1,
      errorMessage: "TPRA: TPRA non disponibile",
    });
  });

  it("applica il cooldown dopo un fallimento e riparte al suo confine", () => {
    const failedAt = new Date(now.getTime() - 2 * 60_000);
    getDatabase()
      .insert(syncRuns)
      .values({
        source: "all",
        status: "failed",
        startedAt: new Date(failedAt.getTime() - 1_000),
        completedAt: failedAt,
        errorMessage: "Fonte non disponibile",
      })
      .run();
    const retryAt = new Date(
      failedAt.getTime() + tournamentSyncCooldownMinutes * 60_000,
    );

    expect(claimTournamentSync({ now })).toEqual({
      status: "cooldown",
      lastSuccessfulSync: null,
      retryAt: retryAt.toISOString(),
    });
    expect(claimTournamentSync({ now: retryAt })).toMatchObject({
      status: "started",
      lastSuccessfulSync: null,
    });
  });

  it("mantiene il lease al confine e sostituisce un claim appena scaduto", () => {
    const startedAt = new Date(
      now.getTime() - tournamentSyncLeaseMinutes * 60_000,
    );
    const oldRun = getDatabase()
      .insert(syncRuns)
      .values({ source: "all", status: "running", startedAt })
      .returning({ id: syncRuns.id })
      .get();

    expect(claimTournamentSync({ now })).toMatchObject({
      status: "running",
      runId: oldRun.id,
    });

    const replacement = claimTournamentSync({
      now: new Date(now.getTime() + 1),
    });
    const expiredRun = getDatabase()
      .select()
      .from(syncRuns)
      .where(eq(syncRuns.id, oldRun.id))
      .get();

    expect(replacement).toMatchObject({ status: "started" });
    expect(replacement.status).toBe("started");
    if (replacement.status !== "started") {
      throw new Error("Claim sostitutivo non acquisito");
    }
    expect(replacement.runId).not.toBe(oldRun.id);
    expect(expiredRun).toMatchObject({
      status: "failed",
      completedAt: new Date(now.getTime() + 1),
      errorMessage: "Sincronizzazione interrotta prima del completamento",
    });
  });

  it("espone come fallito un batch running con lease scaduto", () => {
    const startedAt = new Date(
      now.getTime() - tournamentSyncLeaseMinutes * 60_000 - 1,
    );
    const run = getDatabase()
      .insert(syncRuns)
      .values({ source: "all", status: "running", startedAt })
      .returning({ id: syncRuns.id })
      .get();

    expect(getTournamentSyncRun(run.id, now)).toEqual({
      runId: run.id,
      status: "failed",
      startedAt: startedAt.toISOString(),
      completedAt: now.toISOString(),
      retryAt: new Date(
        now.getTime() + tournamentSyncCooldownMinutes * 60_000,
      ).toISOString(),
    });
    expect(
      getDatabase()
        .select({ status: syncRuns.status })
        .from(syncRuns)
        .where(eq(syncRuns.id, run.id))
        .get()?.status,
    ).toBe("failed");
  });

  it("impedisce a un worker sostituito di pubblicare lo snapshot", async () => {
    const oldStartedAt = new Date(
      now.getTime() - tournamentSyncLeaseMinutes * 60_000 - 1,
    );
    const oldClaim = claimTournamentSync({ now: oldStartedAt });
    expect(oldClaim.status).toBe("started");
    if (oldClaim.status !== "started") throw new Error("Claim non acquisito");

    let releaseFetch!: (snapshot: PucFetchResult) => void;
    let signalFetchStarted!: () => void;
    const fetchStarted = new Promise<void>((resolve) => {
      signalFetchStarted = resolve;
    });
    const blockedFetch = new Promise<PucFetchResult>((resolve) => {
      releaseFetch = resolve;
    });
    const fetchSource = vi.fn(() => {
      signalFetchStarted();
      return blockedFetch;
    });
    const oldWorker = runClaimedTournamentSync(oldClaim.runId, fetchSource);
    await fetchStarted;

    const replacement = claimTournamentSync({ now });
    expect(replacement.status).toBe("started");
    if (replacement.status !== "started") {
      throw new Error("Claim sostitutivo non acquisito");
    }

    releaseFetch(sourceSnapshot("fitp"));
    const oldResult = await oldWorker;
    const publishedTournaments = getDatabase()
      .select({ value: count() })
      .from(tournaments)
      .get();
    const oldBatch = getDatabase()
      .select()
      .from(syncRuns)
      .where(eq(syncRuns.id, oldClaim.runId))
      .get();

    expect(fetchSource).toHaveBeenCalledTimes(1);
    expect(oldResult).toMatchObject({
      status: "failed",
      results: [
        {
          source: "fitp",
          ok: false,
          error: "Sincronizzazione sostituita da un aggiornamento più recente",
        },
        {
          source: "tpra",
          ok: false,
          error: "Sincronizzazione sostituita da un aggiornamento più recente",
        },
      ],
    });
    expect(publishedTournaments?.value).toBe(0);
    expect(oldBatch?.status).toBe("failed");
    expect(getTournamentSyncRun(replacement.runId, now)?.status).toBe(
      "running",
    );
  });
});
