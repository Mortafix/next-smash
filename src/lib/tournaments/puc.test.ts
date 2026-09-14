import { describe, expect, it, vi } from "vitest";

import { toIsoDate, toItalianDate } from "@/lib/dates";
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

function provincialRows(count: number, perDay = 1) {
  return Array.from({ length: count }, (_, index) => {
    const date = toItalianDate(
      new Date(2026, 8, 5 + Math.floor(index / perDay), 12),
    );
    return { ...pucRow(index + 1, 2), data_inizio: date, data_fine: date };
  });
}

function provinceFetch(rows: ReturnType<typeof provincialRows>) {
  return vi.fn(async (_url: unknown, init?: RequestInit) => {
    const payload = JSON.parse(String(init?.body));
    expect(payload).toMatchObject({
      tipo_competizione: "2",
      data_fine: null,
      rowstoskip: 0,
      fetchrows: 100,
    });
    if (
      (payload.id_regione !== null && payload.id_regione !== 1) ||
      (payload.id_provincia !== null && payload.id_provincia !== 201)
    ) {
      return envelope([]);
    }
    const matching = rows.filter(
      (row) => toIsoDate(row.data_inizio)! >= toIsoDate(payload.data_inizio)!,
    );
    return envelope(matching.slice(0, 100), matching.length);
  });
}

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

  it.each([102, 260])(
    "recupera tutti i %i tornei di una provincia oltre il cap",
    async (count) => {
      const rows = provincialRows(count, 3);
      const fetchMock = provinceFetch(rows);
      const result = await fetchPucTournaments("tpra", {
        ...fixedOptions,
        fetchImplementation: fetchMock as typeof fetch,
      });

      expect(result.declaredTotal).toBe(count);
      expect(result.tournaments.map((tournament) => tournament.sourceId)).toEqual(
        rows.map((row) => String(row.id_torneo_digital)),
      );
    },
  );

  it("include tutta la data di confine e i tornei che finiscono dopo di essa", async () => {
    const rows = provincialRows(105, 3);
    rows[0].data_fine = "31/12/2026";
    const fetchMock = provinceFetch(rows);
    const result = await fetchPucTournaments("tpra", {
      ...fixedOptions,
      fetchImplementation: fetchMock as typeof fetch,
    });

    expect(result.tournaments).toHaveLength(105);
    expect(result.tournaments[0].endDate).toBe("2026-12-31");
    const continuation = fetchMock.mock.calls
      .map((call) => JSON.parse(String(call[1]?.body)))
      .find((payload) => payload.data_inizio === rows[99].data_inizio);
    expect(continuation).toMatchObject({ id_regione: 1, id_provincia: 201 });
    expect(
      result.tournaments.filter(
        (tournament) => tournament.startDate === toIsoDate(rows[99].data_inizio),
      ),
    ).toHaveLength(3);
  });

  it.each([
    {
      name: "totale cambiato",
      response: () => envelope(provincialRows(2), 2),
      error: /Shard temporali PUC incompleti/,
    },
    {
      name: "pagina corta",
      response: () => envelope([], 3),
      error: /Snapshot PUC incompleto/,
    },
    {
      name: "body vuoto",
      response: () => mockResponse(""),
      error: /body vuoto/,
    },
    {
      name: "filtro ignorato",
      response: () => envelope(provincialRows(102).slice(0, 100), 102),
      error: /Shard temporali PUC incompleti/,
    },
    {
      name: "date fuori intervallo",
      response: () => envelope(provincialRows(3)),
      error: /Date PUC non ordinate o fuori intervallo/,
    },
    {
      name: "date non ordinate",
      response: () => envelope(provincialRows(102).slice(99).reverse()),
      error: /Date PUC non ordinate o fuori intervallo/,
    },
  ])("rifiuta una continuazione con $name", async ({ response, error }) => {
    const rows = provincialRows(102);
    const baseFetch = provinceFetch(rows);
    const fetchMock = vi.fn(async (url, init) => {
      const payload = JSON.parse(String(init?.body));
      if (payload.data_inizio === rows[99].data_inizio) return response();
      return baseFetch(url, init);
    });

    await expect(
      fetchPucTournaments("tpra", {
        ...fixedOptions,
        fetchImplementation: fetchMock as typeof fetch,
      }),
    ).rejects.toThrow(error);
  });

  it("interrompe una provincia satura sulla stessa data senza saltare tornei", async () => {
    const fetchMock = provinceFetch(provincialRows(101, 101));
    await expect(
      fetchPucTournaments("tpra", {
        ...fixedOptions,
        fetchImplementation: fetchMock as typeof fetch,
      }),
    ).rejects.toThrow(/impossibile avanzare per data/);
    expect(
      fetchMock.mock.calls.filter(
        (call) => JSON.parse(String(call[1]?.body)).id_provincia === 201,
      ),
    ).toHaveLength(1);
  });

  it("rifiuta tornei duplicati anche quando il numero di righe coincide", async () => {
    await expect(
      fetchPucTournaments("tpra", {
        ...fixedOptions,
        fetchImplementation: vi.fn(
          async () => envelope([pucRow(1, 2), pucRow(1, 2)]),
        ) as typeof fetch,
      }),
    ).rejects.toThrow(/Identificativi PUC duplicati/);
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
