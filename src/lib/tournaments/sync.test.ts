// @vitest-environment node

import { count, eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

import { getDatabase } from "@/db/client";
import { tournaments } from "@/db/schema";
import type { PucFetchResult } from "@/lib/tournaments/puc";
import { syncTournamentSource } from "@/lib/tournaments/sync";

function snapshot(title: string): PucFetchResult {
  return {
    source: "fitp",
    declaredTotal: 1,
    tournaments: [
      {
        id: "fitp:test-id",
        source: "fitp",
        sourceId: "test-id",
        title,
        startDate: "2026-09-05",
        endDate: "2026-09-06",
        venueName: "Club Test",
        city: "Milano",
        province: "Milano",
        provinceCode: "MI",
        genders: ["male"],
        competitionTypes: ["Doppio M."],
        rankCategories: ["2"],
        ageCategories: ["NOR"],
        tpraLevel: null,
        registrationOnline: true,
        officialUrl: "https://example.test/tournament",
        sourceStatus: "in programma",
        rawJson: "{}",
        checksum: "checksum",
      },
    ],
  };
}

beforeAll(() => {
  const directory = mkdtempSync(join(tmpdir(), "nextsmash-sync-test-"));
  process.env.DATABASE_PATH = join(directory, "test.sqlite");
  migrate(getDatabase(), { migrationsFolder: join(process.cwd(), "drizzle") });
});

describe("sincronizzazione transazionale", () => {
  it("pubblica uno snapshot completo", async () => {
    const result = await syncTournamentSource("fitp", async () => snapshot("Versione 1"));
    const stored = getDatabase()
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, "fitp:test-id"))
      .get();

    expect(result.ok).toBe(true);
    expect(stored?.title).toBe("Versione 1");
    expect(stored?.active).toBe(true);
    expect(stored?.region).toBe("Lombardia");
  });

  it("conserva lo snapshot precedente se la fonte fallisce", async () => {
    const result = await syncTournamentSource("fitp", async () => {
      throw new Error("PUC non disponibile");
    });
    const stored = getDatabase()
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, "fitp:test-id"))
      .get();

    expect(result).toMatchObject({ ok: false, error: "PUC non disponibile" });
    expect(stored?.title).toBe("Versione 1");
    expect(stored?.active).toBe(true);
  });

  it("non sostituisce dati esistenti con uno snapshot vuoto", async () => {
    const result = await syncTournamentSource("fitp", async () => ({
      source: "fitp",
      declaredTotal: 0,
      tournaments: [],
    }));
    const active = getDatabase()
      .select({ value: count() })
      .from(tournaments)
      .where(eq(tournaments.active, true))
      .get();

    expect(result.ok).toBe(false);
    expect(active?.value).toBe(1);
  });
});
