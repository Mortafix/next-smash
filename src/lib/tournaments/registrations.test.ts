// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

import { fetchTournamentRegistrationSummary } from "@/lib/tournaments/registrations";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const fixedNow = () => new Date("2026-09-04T10:00:00.000Z");

describe("fetchTournamentRegistrationSummary", () => {
  it("normalizza tutte le gare FITP senza esporre i partecipanti", async () => {
    const fetchImplementation = vi.fn(async () =>
      jsonResponse({
        Tournaments: [
          {
            TournamentDescription: "Doppio Femminile Open",
            IsDoubleTournament: true,
            NumberOfParticipants: 3,
            Participants: Array.from({ length: 6 }, (_, index) => ({
              Name: `Nome ${index}`,
              MembershipCard: `Tessera ${index}`,
            })),
          },
          {
            TournamentDescription: "Singolare Open",
            IsDoubleTournament: false,
            NumberOfParticipants: "5",
            Participants: [{ Name: "Dato da non esporre" }],
          },
        ],
      }),
    ) as unknown as typeof fetch;

    const summary = await fetchTournamentRegistrationSummary("fitp", "fitp-id", {
      fetchImplementation,
      fitpApiUrl: "https://example.test/fitp",
      now: fixedNow,
    });

    expect(summary).toEqual({
      source: "fitp",
      fetchedAt: "2026-09-04T10:00:00.000Z",
      entries: [
        {
          label: "Doppio Femminile Open",
          registeredPlayers: 6,
          registeredPairs: 3,
          capacityPlayers: null,
          capacityPairs: null,
          reservePlayers: 0,
          reservePairs: 0,
        },
        {
          label: "Singolare Open",
          registeredPlayers: 5,
          registeredPairs: null,
          capacityPlayers: null,
          capacityPairs: null,
          reservePlayers: 0,
          reservePairs: null,
        },
      ],
    });
    expect(JSON.stringify(summary)).not.toMatch(/Nome|Tessera|MembershipCard/);
    expect(fetchImplementation).toHaveBeenCalledWith(
      "https://example.test/fitp",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ competitionUid: "fitp-id" }),
      }),
    );
  });

  it("calcola i giocatori FITP dalle coppie solo quando Participants è assente", async () => {
    const fetchImplementation = vi.fn(async () =>
      jsonResponse({
        Tournaments: [
          {
            TournamentDescription: "Doppio Maschile",
            IsDoubleTournament: true,
            NumberOfParticipants: 7,
          },
        ],
      }),
    ) as unknown as typeof fetch;

    const summary = await fetchTournamentRegistrationSummary("fitp", "fitp-id", {
      fetchImplementation,
      now: fixedNow,
    });

    expect(summary.entries[0]).toMatchObject({
      registeredPlayers: 14,
      registeredPairs: 7,
    });
  });

  it("normalizza iscritti, capienza e riserve TPRA", async () => {
    const fetchImplementation = vi.fn(async () =>
      jsonResponse({
        results: [
          {
            numero_iscritti: "8",
            numero_iscritti_massimi: "24",
            doppio: true,
            iscritti: [{ giocatore_1: "Dato privato" }],
            teste_di_serie: [],
            riserve: [{}, {}],
          },
        ],
      }),
    ) as unknown as typeof fetch;

    const summary = await fetchTournamentRegistrationSummary("tpra", "216893", {
      fetchImplementation,
      tpraApiUrl: "https://example.test/tpra",
      now: fixedNow,
    });

    expect(summary).toEqual({
      source: "tpra",
      fetchedAt: "2026-09-04T10:00:00.000Z",
      entries: [
        {
          label: "Iscrizioni confermate",
          registeredPlayers: 8,
          registeredPairs: 4,
          capacityPlayers: 24,
          capacityPairs: 12,
          reservePlayers: 4,
          reservePairs: 2,
        },
      ],
    });
    expect(JSON.stringify(summary)).not.toContain("Dato privato");
    expect(fetchImplementation).toHaveBeenCalledWith(
      "https://example.test/tpra",
      expect.objectContaining({ body: JSON.stringify({ id: "216893" }) }),
    );
  });

  it("non inventa un numero di coppie TPRA quando i giocatori sono dispari", async () => {
    const fetchImplementation = vi.fn(async () =>
      jsonResponse({
        results: [
          {
            numero_iscritti: 5,
            numero_iscritti_massimi: 9,
            doppio: true,
            riserve: [],
          },
        ],
      }),
    ) as unknown as typeof fetch;

    const summary = await fetchTournamentRegistrationSummary("tpra", "42", {
      fetchImplementation,
      now: fixedNow,
    });

    expect(summary.entries[0]).toMatchObject({
      registeredPlayers: 5,
      registeredPairs: null,
      capacityPlayers: 9,
      capacityPairs: null,
    });
  });

  it("non ritenta gli errori HTTP definitivi", async () => {
    const fetchImplementation = vi.fn(async () =>
      jsonResponse({ error: "bad request" }, 400),
    ) as unknown as typeof fetch;

    await expect(
      fetchTournamentRegistrationSummary("tpra", "42", {
        fetchImplementation,
        maxAttempts: 2,
      }),
    ).rejects.toThrow(/HTTP 400/);
    expect(fetchImplementation).toHaveBeenCalledTimes(1);
  });

  it("ritenta un errore temporaneo", async () => {
    const fetchImplementation = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, 503))
      .mockResolvedValueOnce(
        jsonResponse({
          results: [
            {
              numero_iscritti: 2,
              numero_iscritti_massimi: null,
              doppio: false,
              riserve: [],
            },
          ],
        }),
      ) as unknown as typeof fetch;

    const summary = await fetchTournamentRegistrationSummary("tpra", "42", {
      fetchImplementation,
      maxAttempts: 2,
      now: fixedNow,
    });

    expect(summary.entries[0]).toMatchObject({
      registeredPlayers: 2,
      registeredPairs: null,
    });
    expect(fetchImplementation).toHaveBeenCalledTimes(2);
  });

  it("rifiuta una risposta esterna strutturalmente non valida", async () => {
    const fetchImplementation = vi.fn(async () =>
      jsonResponse({ results: [] }),
    ) as unknown as typeof fetch;

    await expect(
      fetchTournamentRegistrationSummary("tpra", "42", {
        fetchImplementation,
        maxAttempts: 1,
      }),
    ).rejects.toThrow("Risposta iscrizioni TPRA non valida");
  });
});
