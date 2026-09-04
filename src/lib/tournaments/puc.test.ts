import { describe, expect, it, vi } from "vitest";

import {
  fetchPucTournaments,
  normalizePucRow,
} from "@/lib/tournaments/puc";

function pucRow(id: number, source: 1 | 2 = 1) {
  return {
    cod_fonte: source,
    guid: `00000000-0000-0000-0000-${String(id).padStart(12, "0")}`,
    id_torneo_digital: source === 2 ? id : 0,
    data_inizio: "05/09/2026",
    data_fine: "07/09/2026",
    nome_torneo: ` Torneo ${id} `,
    citta: "Milano",
    provincia: "Milano",
    sigla_provincia: "MI",
    tennisclub: " Club Centrale ",
    iscrizione_online: true,
    id_statoPUC: 3,
    cat_class: source === 1 ? "1;2;4" : null,
    cat_eta: source === 1 ? "NOR;O35" : null,
    tipo_torneo: "Doppio M.;Doppio F.;Misto",
    id_settore: 2,
  };
}

function mockResponse(body: string, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => body,
  } as Response;
}

function envelope(rows: unknown[], record = rows.length) {
  return mockResponse(JSON.stringify({ competizioni: rows, record }));
}

const fixedOptions = {
  startDate: new Date(2026, 8, 3, 12),
  endDate: new Date(2027, 8, 3, 12),
};

describe("normalizePucRow", () => {
  it("normalizza un torneo FITP con più gare", () => {
    const tournament = normalizePucRow(pucRow(7), "fitp");

    expect(tournament.id).toBe(
      "fitp:00000000-0000-0000-0000-000000000007",
    );
    expect(tournament.title).toBe("Torneo 7");
    expect(tournament.genders).toEqual(["male", "female", "mixed"]);
    expect(tournament.rankCategories).toEqual(["1", "2", "4"]);
    expect(tournament.sourceStatus).toBe("iscrizioni aperte");
    expect(tournament.officialUrl).toContain("competitionId=");
  });

  it("usa l’id digitale e deriva il livello TPRA dal titolo", () => {
    const row = { ...pucRow(42, 2), nome_torneo: "  Weekend EXPERT Roma  " };
    const tournament = normalizePucRow(row, "tpra");

    expect(tournament.id).toBe("tpra:42");
    expect(tournament.tpraLevel).toBe("expert");
    expect(tournament.rankCategories).toEqual([]);
    expect(tournament.officialUrl).toContain("/42?");
  });

  it("rifiuta una fonte diversa da quella richiesta", () => {
    expect(() => normalizePucRow(pucRow(1, 2), "fitp")).toThrow(
      /Fonte PUC inattesa/,
    );
  });
});

describe("fetchPucTournaments", () => {
  it("usa solo l’API server-side con filtro Padel e senza data fine", async () => {
    const fetchMock = vi.fn(async (_url, init) => {
      const payload = JSON.parse(String(init?.body));
      expect(payload).toMatchObject({
        id_disciplina: 172,
        tipo_competizione: "1",
        data_fine: null,
        rowstoskip: 0,
        fetchrows: 100,
      });
      return envelope([pucRow(1)]);
    });
    const fetchImplementation = fetchMock as unknown as typeof fetch;

    const result = await fetchPucTournaments("fitp", {
      ...fixedOptions,
      fetchImplementation,
    });

    expect(result.declaredTotal).toBe(1);
    expect(result.tournaments).toHaveLength(1);
    expect(fetchImplementation).toHaveBeenCalledTimes(1);
  });

  it("ricostruisce snapshot oltre il cap tramite le 20 regioni", async () => {
    const regionOne = Array.from({ length: 50 }, (_, index) => pucRow(index + 1));
    const regionTwo = Array.from({ length: 51 }, (_, index) =>
      pucRow(index + 51),
    );
    const fetchMock = vi.fn(async (_url, init) => {
      const payload = JSON.parse(String(init?.body));
      if (payload.id_regione === null) {
        return envelope(regionOne.concat(regionTwo).slice(0, 100), 101);
      }
      if (payload.id_regione === 1) return envelope(regionOne);
      if (payload.id_regione === 2) return envelope(regionTwo);
      return envelope([]);
    });
    const fetchImplementation = fetchMock as unknown as typeof fetch;

    const result = await fetchPucTournaments("fitp", {
      ...fixedOptions,
      fetchImplementation,
    });

    expect(result.declaredTotal).toBe(101);
    expect(result.tournaments).toHaveLength(101);
    expect(fetchMock).toHaveBeenCalledTimes(21);
    for (const call of fetchMock.mock.calls) {
      expect(JSON.parse(String(call[1]?.body)).rowstoskip).toBe(0);
    }
  });

  it("rifiuta una pagina corta invece di pubblicare dati incompleti", async () => {
    const fetchImplementation = vi.fn(
      async () => envelope([pucRow(1)], 2),
    ) as unknown as typeof fetch;

    await expect(
      fetchPucTournaments("fitp", {
        ...fixedOptions,
        fetchImplementation,
      }),
    ).rejects.toThrow(/Snapshot PUC incompleto/);
  });

  it("rifiuta un body vuoto anche con HTTP 200", async () => {
    const fetchImplementation = vi.fn(
      async () => mockResponse(""),
    ) as unknown as typeof fetch;

    await expect(
      fetchPucTournaments("fitp", {
        ...fixedOptions,
        fetchImplementation,
      }),
    ).rejects.toThrow(/body vuoto/);
    expect(fetchImplementation).toHaveBeenCalledTimes(3);
  });

  it("rifiuta totali regionali cambiati durante l’acquisizione", async () => {
    const rootRows = Array.from({ length: 100 }, (_, index) => pucRow(index + 1));
    const fetchImplementation = vi.fn(async (_url, init) => {
      const payload = JSON.parse(String(init?.body));
      if (payload.id_regione === null) return envelope(rootRows, 101);
      return envelope([]);
    }) as unknown as typeof fetch;

    await expect(
      fetchPucTournaments("fitp", {
        ...fixedOptions,
        fetchImplementation,
      }),
    ).rejects.toThrow(/Shard regionali PUC incompleti/);
  });
});
