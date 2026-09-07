import { describe, expect, it } from "vitest";

import {
  activeFilterCount,
  activeTournamentFilters,
  clearTournamentFilter,
  defaultTournamentFilters,
  distanceInKilometres,
  filterTournaments,
  weekendRange,
} from "@/lib/tournaments/filters";
import type { Tournament } from "@/lib/tournaments/types";

function tournament(overrides: Partial<Tournament> = {}): Tournament {
  return {
    id: "fitp:1",
    source: "fitp",
    sourceId: "1",
    title: "Open Lombardia",
    startDate: "2026-09-05",
    endDate: "2026-09-07",
    venueName: "Padel Club",
    city: "Milano",
    province: "Milano",
    provinceCode: "MI",
    region: "Lombardia",
    latitude: 45.4642,
    longitude: 9.19,
    locationPrecision: "municipality",
    genders: ["male", "female"],
    competitionTypes: ["Doppio M.", "Doppio F."],
    rankCategories: ["2", "3"],
    ageCategories: ["NOR"],
    tpraLevel: null,
    registrationOnline: true,
    officialUrl: "https://example.test/1",
    sourceStatus: "iscrizioni aperte",
    ...overrides,
  };
}

describe("filterTournaments", () => {
  it("considera la sovrapposizione dell’intervallo date", () => {
    const result = filterTournaments([tournament()], {
      ...defaultTournamentFilters,
      dateFrom: "2026-09-06",
      dateTo: "2026-09-06",
    });
    expect(result).toHaveLength(1);
  });

  it("filtra genere e regione su tornei con più gare", () => {
    expect(
      filterTournaments([tournament()], {
        ...defaultTournamentFilters,
        gender: "male",
        region: "Lombardia",
      }),
    ).toHaveLength(1);
  });

  it("non confonde fascia FITP e livello TPRA", () => {
    const tpra = tournament({
      id: "tpra:2",
      source: "tpra",
      tpraLevel: "expert",
      rankCategories: [],
    });
    const result = filterTournaments([tournament(), tpra], {
      ...defaultTournamentFilters,
      rankCategory: "2",
    });
    expect(result.map((item) => item.id)).toEqual(["fitp:1"]);
  });

  it("ordina per distanza lasciando in fondo le località non risolte", () => {
    const result = filterTournaments(
      [
        tournament({ id: "fitp:missing", latitude: null, longitude: null }),
        tournament({ id: "fitp:rome", latitude: 41.9028, longitude: 12.4964 }),
        tournament({ id: "fitp:milan" }),
      ],
      {
        ...defaultTournamentFilters,
        sort: "distance",
        origin: { label: "Milano", latitude: 45.4642, longitude: 9.19 },
      },
    );
    expect(result.map((item) => item.id)).toEqual([
      "fitp:milan",
      "fitp:rome",
      "fitp:missing",
    ]);
  });
});

describe("geografia e scorciatoie", () => {
  it("calcola una distanza plausibile Milano–Roma", () => {
    expect(
      distanceInKilometres(
        { latitude: 45.4642, longitude: 9.19 },
        { latitude: 41.9028, longitude: 12.4964 },
      ),
    ).toBeCloseTo(477, -1);
  });

  it("seleziona il weekend corrente quando oggi è sabato", () => {
    expect(weekendRange(new Date(2026, 8, 5, 12))).toEqual({
      dateFrom: "2026-09-05",
      dateTo: "2026-09-06",
    });
  });

  it("distingue questo weekend dal prossimo anche la domenica", () => {
    const sunday = new Date(2026, 8, 6, 12);
    expect(weekendRange(sunday)).toEqual({ dateFrom: "2026-09-05", dateTo: "2026-09-06" });
    expect(weekendRange(sunday, 1)).toEqual({ dateFrom: "2026-09-12", dateTo: "2026-09-13" });
  });

  it.each([
    [new Date(2026, 8, 7, 12), "2026-09-19", "2026-09-20"],
    [new Date(2026, 11, 27, 12), "2027-01-02", "2027-01-03"],
    [new Date(2026, 2, 22, 12), "2026-03-28", "2026-03-29"],
  ])("calcola il prossimo weekend oltre i cambi di mese, anno e ora legale (%s)", (reference, dateFrom, dateTo) => {
    expect(weekendRange(reference, 1)).toEqual({ dateFrom, dateTo });
  });
});

describe("riepilogo filtri", () => {
  const filters = {
    ...defaultTournamentFilters,
    query: "Roma",
    dateFrom: "2026-09-05",
    dateTo: "2026-09-06",
    region: "Lazio",
  };

  it("conta gruppi semantici e include la query", () => {
    expect(activeFilterCount(filters)).toBe(3);
    expect(activeTournamentFilters(filters)).toEqual([
      { key: "query", label: "Cerca “Roma”" },
      { key: "region", label: "Lazio" },
      {
        key: "dateRange",
        label: "Dal 5 set 2026 al 6 set 2026",
      },
    ]);
  });

  it("rimuove un gruppo senza perdere gli altri", () => {
    expect(clearTournamentFilter(filters, "dateRange")).toEqual({
      ...filters,
      dateFrom: "",
      dateTo: "",
    });
  });

  it("ripristina l’ordinamento per data quando rimuove l’origine", () => {
    expect(
      clearTournamentFilter(
        {
          ...defaultTournamentFilters,
          sort: "distance",
          origin: { label: "Roma", latitude: 41.9, longitude: 12.5 },
        },
        "origin",
      ),
    ).toMatchObject({ origin: null, sort: "date" });
  });

  it("descrive la geolocalizzazione come vicino a me", () => {
    const nearby = activeTournamentFilters({
      ...defaultTournamentFilters,
      origin: {
        label: "La mia posizione",
        latitude: 45.4642,
        longitude: 9.19,
      },
    });

    expect(nearby).toEqual([{ key: "origin", label: "Vicino a me" }]);
  });
});
