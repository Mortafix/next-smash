import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TournamentExplorer } from "@/components/tournaments/tournament-explorer";
import {
  emptyPreferences,
  parsePreferences,
  preferencesStorageKey,
} from "@/lib/preferences";
import { defaultTournamentFilters } from "@/lib/tournaments/filters";
import type { Tournament, TournamentSnapshot } from "@/lib/tournaments/types";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

vi.mock("@/components/tournaments/active-filter-chips", () => ({
  ActiveFilterChips: () => null,
}));

vi.mock("@/components/tournaments/filter-panel", () => ({
  FilterPanel: ({
    filters,
    onChange,
  }: {
    filters: typeof defaultTournamentFilters;
    onChange: (
      action: (current: typeof defaultTournamentFilters) => typeof defaultTournamentFilters,
    ) => void;
  }) => (
    <div data-testid="filter-panel" data-region={filters.region}>
      <button
        type="button"
        onClick={() =>
          onChange((current) => ({ ...current, source: "tpra" }))
        }
      >
        Mostra TPRA
      </button>
    </div>
  ),
}));

vi.mock("@/components/tournaments/freshness-banner", () => ({
  FreshnessBanner: () => null,
}));

vi.mock("@/components/tournaments/tournament-detail-dialog", () => ({
  TournamentDetailDialog: ({
    tournament,
    onClose,
  }: {
    tournament: { title: string } | null;
    onClose: () => void;
  }) =>
    tournament ? (
      <div role="dialog" aria-label="Dettaglio torneo">
        <span>{tournament.title}</span>
        <button type="button" onClick={onClose}>
          Chiudi dettaglio
        </button>
      </div>
    ) : null,
}));

function tournament(id: string, overrides: Partial<Tournament> = {}): Tournament {
  return {
    id,
    source: "fitp",
    sourceId: id.split(":")[1] ?? id,
    title: `Torneo ${id}`,
    startDate: "2026-09-10",
    endDate: "2026-09-12",
    venueName: "Circolo Test",
    city: "Milano",
    province: "Milano",
    provinceCode: "MI",
    region: "Lombardia",
    latitude: null,
    longitude: null,
    locationPrecision: "unknown",
    genders: ["open"],
    competitionTypes: [],
    rankCategories: [],
    ageCategories: [],
    tpraLevel: null,
    registrationOnline: true,
    officialUrl: "https://example.test/torneo",
    sourceStatus: null,
    ...overrides,
  };
}

function snapshot(tournaments: Tournament[]): TournamentSnapshot {
  return {
    tournaments,
    lastSuccessfulSync: "2026-09-04T08:00:00.000Z",
    stale: false,
    setupRequired: false,
  };
}

let storedValues: Map<string, string>;

beforeEach(() => {
  storedValues = new Map();
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => storedValues.get(key) ?? null,
      setItem: (key: string, value: string) => storedValues.set(key, value),
      removeItem: (key: string) => storedValues.delete(key),
      clear: () => storedValues.clear(),
      key: (index: number) => [...storedValues.keys()][index] ?? null,
      get length() {
        return storedValues.size;
      },
    } satisfies Storage,
  });
  window.history.replaceState(null, "", "/tornei");
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("TournamentExplorer tournament deep-link", () => {
  it("usa filtri vuoti sul deep-link senza cancellare le preferenze", async () => {
    const preferences = emptyPreferences();
    preferences.lastFilters = {
      ...defaultTournamentFilters,
      region: "Lazio",
    };
    window.localStorage.setItem(
      preferencesStorageKey,
      JSON.stringify(preferences),
    );
    window.history.replaceState(
      null,
      "",
      "/tornei?torneo=fitp%3Astorico",
    );

    render(
      <TournamentExplorer
        snapshot={snapshot([
          tournament("fitp:uno"),
          tournament("fitp:due", { region: "Lazio" }),
        ])}
        initialTournament={tournament("fitp:storico", {
          title: "Torneo storico",
        })}
      />,
    );

    expect(screen.getByTestId("filter-panel")).toHaveAttribute("data-region", "");
    expect(
      screen.getByText("2", { selector: ".ns-results-summary strong" }).parentElement,
    ).toHaveTextContent("2 tornei trovati");
    expect(screen.getByRole("dialog", { name: "Dettaglio torneo" })).toHaveTextContent(
      "Torneo storico",
    );
    expect(
      parsePreferences(window.localStorage.getItem(preferencesStorageKey)).lastFilters
        .region,
    ).toBe("Lazio");

    await userEvent.click(screen.getByRole("button", { name: "Mostra TPRA" }));

    const persisted = parsePreferences(
      window.localStorage.getItem(preferencesStorageKey),
    ).lastFilters;
    expect(persisted.source).toBe("tpra");
    expect(persisted.region).toBe("");
  });

  it("apre localmente con un URL pulito, usa Back e restituisce il focus", async () => {
    const user = userEvent.setup();
    const back = vi.spyOn(window.history, "back").mockImplementation(() => undefined);
    const currentSnapshot = snapshot([tournament("fitp:uno")]);
    window.history.replaceState(null, "", "/tornei?parametro=da-rimuovere");
    const view = render(<TournamentExplorer snapshot={currentSnapshot} />);
    const title = screen.getByRole("link", { name: "Torneo fitp:uno" });

    await user.click(title);

    expect(window.location.pathname).toBe("/tornei");
    expect(window.location.search).toBe("?torneo=fitp%3Auno");

    view.rerender(<TournamentExplorer snapshot={currentSnapshot} />);
    expect(screen.getByRole("dialog", { name: "Dettaglio torneo" })).toHaveTextContent(
      "Torneo fitp:uno",
    );

    await user.click(screen.getByRole("button", { name: "Chiudi dettaglio" }));
    expect(back).toHaveBeenCalledOnce();

    window.history.replaceState(null, "", "/tornei");
    view.rerender(<TournamentExplorer snapshot={currentSnapshot} />);
    await waitFor(() => expect(title).toHaveFocus());
  });

  it("chiude un accesso diretto restando sulla pagina tornei", async () => {
    window.history.replaceState(null, "", "/tornei?torneo=fitp%3Auno");
    render(
      <TournamentExplorer snapshot={snapshot([tournament("fitp:uno")])} />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Chiudi dettaglio" }),
    );

    expect(window.location.pathname).toBe("/tornei");
    expect(window.location.search).toBe("");
  });
});
