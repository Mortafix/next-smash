// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  after: vi.fn(),
  claimTournamentSync: vi.fn(),
  getTournamentSyncRun: vi.fn(),
  runClaimedTournamentSync: vi.fn(),
}));

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return { ...actual, after: mocks.after };
});

vi.mock("@/lib/tournaments/sync", () => ({
  claimTournamentSync: mocks.claimTournamentSync,
  getTournamentSyncRun: mocks.getTournamentSyncRun,
  runClaimedTournamentSync: mocks.runClaimedTournamentSync,
}));

import { GET, POST } from "@/app/api/tournaments/refresh/route";

function getRoute(runId: string | null) {
  const url = new URL("http://localhost/api/tournaments/refresh");
  if (runId !== null) url.searchParams.set("runId", runId);
  return GET(new Request(url));
}

async function expectNoStore(response: Response) {
  expect(response.headers.get("cache-control")).toBe("no-store");
}

beforeEach(() => {
  mocks.after.mockReset();
  mocks.claimTournamentSync.mockReset();
  mocks.getTournamentSyncRun.mockReset();
  mocks.runClaimedTournamentSync.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/tournaments/refresh", () => {
  it("restituisce subito il run avviato e delega il lavoro ad after", async () => {
    mocks.claimTournamentSync.mockReturnValue({
      status: "started",
      runId: 17,
      lastSuccessfulSync: null,
    });
    mocks.runClaimedTournamentSync.mockResolvedValue({
      runId: 17,
      status: "success",
      results: [],
    });

    const response = await POST();

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({
      status: "running",
      runId: 17,
    });
    await expectNoStore(response);
    expect(mocks.after).toHaveBeenCalledTimes(1);
    expect(mocks.runClaimedTournamentSync).not.toHaveBeenCalled();

    const callback = mocks.after.mock.calls[0]?.[0] as
      | (() => Promise<void>)
      | undefined;
    expect(callback).toBeTypeOf("function");
    await callback?.();

    expect(mocks.runClaimedTournamentSync).toHaveBeenCalledOnce();
    expect(mocks.runClaimedTournamentSync).toHaveBeenCalledWith(17);
  });

  it("riusa un aggiornamento già in corso senza schedularne un secondo", async () => {
    mocks.claimTournamentSync.mockReturnValue({
      status: "running",
      runId: 23,
      lastSuccessfulSync: "2026-09-03T08:00:00.000Z",
    });

    const response = await POST();

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({
      status: "running",
      runId: 23,
    });
    await expectNoStore(response);
    expect(mocks.after).not.toHaveBeenCalled();
  });

  it.each([
    {
      claim: {
        status: "fresh",
        lastSuccessfulSync: "2026-09-04T08:00:00.000Z",
      },
      expectedStatus: 200,
      expectedBody: {
        status: "fresh",
        lastSuccessfulSync: "2026-09-04T08:00:00.000Z",
      },
    },
    {
      claim: {
        status: "cooldown",
        lastSuccessfulSync: "2026-09-03T08:00:00.000Z",
        retryAt: "2026-09-04T08:05:00.000Z",
      },
      expectedStatus: 200,
      expectedBody: {
        status: "cooldown",
        retryAt: "2026-09-04T08:05:00.000Z",
      },
    },
    {
      claim: { status: "setup-required" },
      expectedStatus: 503,
      expectedBody: {
        status: "setup-required",
        message: "Il servizio dati non è ancora pronto.",
      },
    },
  ])(
    "espone il contratto $claim.status",
    async ({ claim, expectedStatus, expectedBody }) => {
      mocks.claimTournamentSync.mockReturnValue(claim);

      const response = await POST();

      expect(response.status).toBe(expectedStatus);
      await expect(response.json()).resolves.toEqual(expectedBody);
      await expectNoStore(response);
      expect(mocks.after).not.toHaveBeenCalled();
    },
  );

  it("converte gli errori di claim in una risposta indisponibile", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.claimTournamentSync.mockImplementation(() => {
      throw new Error("database occupato");
    });

    const response = await POST();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      status: "error",
      message: "L’aggiornamento non può essere avviato in questo momento.",
    });
    await expectNoStore(response);
  });
});

describe("GET /api/tournaments/refresh", () => {
  it.each([null, "", "test", "0", "-1", "1.5", "9007199254740992"])(
    "rifiuta il runId non valido %s",
    async (runId) => {
      const response = await getRoute(runId);

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        status: "error",
        message: "Identificativo non valido.",
      });
      await expectNoStore(response);
      expect(mocks.getTournamentSyncRun).not.toHaveBeenCalled();
    },
  );

  it("restituisce lo stato serializzato del run", async () => {
    const run = {
      runId: 31,
      status: "success",
      startedAt: "2026-09-04T08:00:00.000Z",
      completedAt: "2026-09-04T08:01:00.000Z",
    };
    mocks.getTournamentSyncRun.mockReturnValue(run);

    const response = await getRoute("31");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(run);
    await expectNoStore(response);
    expect(mocks.getTournamentSyncRun).toHaveBeenCalledWith(31);
  });

  it("restituisce 404 quando il run non esiste", async () => {
    mocks.getTournamentSyncRun.mockReturnValue(null);

    const response = await getRoute("41");

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      status: "error",
      message: "Aggiornamento non trovato.",
    });
    await expectNoStore(response);
  });

  it("converte gli errori di lettura in una risposta indisponibile", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.getTournamentSyncRun.mockImplementation(() => {
      throw new Error("database occupato");
    });

    const response = await getRoute("51");

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      status: "error",
      message: "Stato non disponibile.",
    });
    await expectNoStore(response);
  });
});
