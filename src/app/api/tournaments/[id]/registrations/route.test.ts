// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findStoredTournament: vi.fn(),
  fetchSummary: vi.fn(),
}));

vi.mock("@/db/client", () => ({
  getDatabase: () => ({
    select: () => ({
      from: () => ({
        where: () => ({ get: mocks.findStoredTournament }),
      }),
    }),
  }),
}));

vi.mock("@/lib/tournaments/registrations", () => ({
  fetchTournamentRegistrationSummary: mocks.fetchSummary,
}));

import { GET } from "@/app/api/tournaments/[id]/registrations/route";

function callRoute(id: string) {
  return GET(new Request(`http://localhost/api/tournaments/${id}/registrations`), {
    params: Promise.resolve({ id }),
  });
}

beforeEach(() => {
  mocks.findStoredTournament.mockReset();
  mocks.fetchSummary.mockReset();
});

describe("GET /api/tournaments/[id]/registrations", () => {
  it("rifiuta un identificativo non valido", async () => {
    const response = await callRoute("fitp:not-a-uuid");

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Identificativo torneo non valido",
    });
    expect(mocks.findStoredTournament).not.toHaveBeenCalled();
  });

  it("restituisce 404 quando il torneo non è nello snapshot locale", async () => {
    mocks.findStoredTournament.mockReturnValue(undefined);

    const response = await callRoute("tpra:123456");

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Torneo non trovato" });
    expect(mocks.fetchSummary).not.toHaveBeenCalled();
  });

  it("restituisce solo il DTO aggregato e lo conserva per dieci minuti", async () => {
    const id = "fitp:00000000-0000-4000-8000-000000000001";
    const summary = {
      source: "fitp" as const,
      entries: [
        {
          label: "Doppio Maschile",
          registeredPlayers: 12,
          registeredPairs: 6,
          capacityPlayers: null,
          capacityPairs: null,
          reservePlayers: 0,
          reservePairs: 0,
        },
      ],
      fetchedAt: "2026-09-04T10:00:00.000Z",
    };
    mocks.findStoredTournament.mockReturnValue({ id });
    mocks.fetchSummary.mockResolvedValue(summary);

    const [first, second] = await Promise.all([callRoute(id), callRoute(id)]);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    await expect(first.json()).resolves.toEqual(summary);
    expect(first.headers.get("cache-control")).toContain("max-age=600");
    expect(mocks.fetchSummary).toHaveBeenCalledTimes(1);
    expect(mocks.fetchSummary).toHaveBeenCalledWith(
      "fitp",
      "00000000-0000-4000-8000-000000000001",
    );
  });

  it("non mette in cache i fallimenti della fonte", async () => {
    const id = "tpra:987654";
    mocks.findStoredTournament.mockReturnValue({ id });
    mocks.fetchSummary
      .mockRejectedValueOnce(new Error("Fonte non disponibile"))
      .mockResolvedValueOnce({
        source: "tpra",
        entries: [],
        fetchedAt: "2026-09-04T10:00:00.000Z",
      });

    const failed = await callRoute(id);
    const recovered = await callRoute(id);

    expect(failed.status).toBe(502);
    await expect(failed.json()).resolves.toEqual({
      error: "Impossibile recuperare le iscrizioni del torneo",
    });
    expect(recovered.status).toBe(200);
    expect(mocks.fetchSummary).toHaveBeenCalledTimes(2);
  });
});
