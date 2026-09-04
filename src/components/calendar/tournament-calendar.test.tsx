import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TournamentCalendar } from "@/components/calendar/tournament-calendar";
import type { TournamentSnapshot } from "@/lib/tournaments/types";

vi.mock("@/components/tournaments/active-filter-chips", () => ({
  ActiveFilterChips: () => null,
}));

vi.mock("@/components/tournaments/filter-panel", () => ({
  FilterPanel: () => null,
}));

vi.mock("@/components/tournaments/freshness-banner", () => ({
  FreshnessBanner: () => null,
}));

vi.mock("@/components/tournaments/tournament-card", () => ({
  TournamentCard: ({ tournament }: { tournament: { title: string } }) => (
    <article>{tournament.title}</article>
  ),
}));

vi.mock("@/components/tournaments/use-tournament-filters", async () => {
  const { defaultTournamentFilters } = await import("@/lib/tournaments/filters");
  return {
    useTournamentFilters: () => ({
      filters: defaultTournamentFilters,
      setFilters: vi.fn(),
    }),
  };
});

function snapshot(
  tournamentDates: Array<{ id: string; title: string; startDate: string; endDate?: string }> = [],
): TournamentSnapshot {
  return {
    lastSuccessfulSync: "2026-09-04T08:00:00.000Z",
    setupRequired: false,
    stale: false,
    tournaments: tournamentDates.map((tournament) => ({
      id: tournament.id,
      source: "fitp",
      sourceId: tournament.id,
      title: tournament.title,
      startDate: tournament.startDate,
      endDate: tournament.endDate ?? tournament.startDate,
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
    })),
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-15T12:00:00"));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("TournamentCalendar", () => {
  it("espone una griglia semantica con un solo giorno nel tab order", () => {
    render(<TournamentCalendar snapshot={snapshot()} />);

    const grid = screen.getByRole("grid", { name: /settembre 2026/i });
    const days = within(grid).getAllByRole("button");

    expect(within(grid).getAllByRole("columnheader")).toHaveLength(7);
    expect(within(grid).getAllByRole("gridcell")).toHaveLength(42);
    expect(days.filter((day) => day.tabIndex === 0)).toHaveLength(1);
    expect(days.filter((day) => day.tabIndex === -1)).toHaveLength(41);
    expect(
      screen.getByRole("button", { name: /^martedì 15 settembre 2026.*oggi/i }),
    ).toHaveAttribute("aria-current", "date");
    expect(
      within(
        screen.getByRole("button", {
          name: /^martedì 15 settembre 2026.*oggi/i,
        }),
      ).getByText("Oggi"),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: /vai a oggi/i })).toHaveClass(
      "ns-today-button",
    );
  });

  it("sposta il focus con le convenzioni da calendario senza cambiare la selezione", () => {
    render(<TournamentCalendar snapshot={snapshot()} />);

    const initial = screen.getByRole("button", {
      name: /^martedì 15 settembre 2026/i,
    });
    initial.focus();

    fireEvent.keyDown(initial, { key: "ArrowRight" });
    const nextDay = screen.getByRole("button", {
      name: /mercoledì 16 settembre 2026/i,
    });
    expect(nextDay).toHaveFocus();
    expect(nextDay).toHaveAttribute("tabindex", "0");
    expect(initial.closest("td")).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(nextDay, { key: "ArrowDown" });
    const nextWeek = screen.getByRole("button", {
      name: /mercoledì 23 settembre 2026/i,
    });
    expect(nextWeek).toHaveFocus();

    fireEvent.keyDown(nextWeek, { key: "Home" });
    const monday = screen.getByRole("button", {
      name: /lunedì 21 settembre 2026/i,
    });
    expect(monday).toHaveFocus();

    fireEvent.keyDown(monday, { key: "End" });
    const sunday = screen.getByRole("button", {
      name: /domenica 27 settembre 2026/i,
    });
    expect(sunday).toHaveFocus();

    fireEvent.keyDown(sunday, { key: "PageDown" });
    const sameDayNextMonth = screen.getByRole("button", {
      name: /martedì 27 ottobre 2026/i,
    });
    expect(sameDayNextMonth).toHaveFocus();
    expect(
      screen.getByRole("heading", { name: /^ottobre 2026$/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /martedì 15 settembre 2026/i })).toBeInTheDocument();
  });

  it("allinea mese, selezione e agenda quando si sceglie un giorno adiacente", () => {
    render(<TournamentCalendar snapshot={snapshot()} />);

    const adjacentDay = screen.getByRole("button", {
      name: /giovedì 1 ottobre 2026/i,
    });
    adjacentDay.focus();
    fireEvent.click(adjacentDay);

    expect(
      screen.getByRole("heading", { name: /^ottobre 2026$/i }),
    ).toBeInTheDocument();
    const selectedDay = screen.getByRole("button", {
      name: /giovedì 1 ottobre 2026/i,
    });
    expect(selectedDay).toHaveFocus();
    expect(selectedDay.closest("td")).toHaveAttribute("aria-selected", "true");
    expect(
      screen.getByRole("heading", { name: /giovedì 1 ottobre 2026/i }),
    ).toBeInTheDocument();
  });

  it("annuncia i risultati e usa una lista semantica con uno zero-state subordinato", () => {
    render(
      <TournamentCalendar
        snapshot={snapshot([
          {
            id: "settembre-15",
            title: "Open di settembre",
            startDate: "2026-09-15",
          },
        ])}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      /martedì 15 settembre 2026.*1 torneo/i,
    );
    expect(screen.getByRole("status")).toHaveClass("ns-visually-hidden");
    expect(screen.queryByRole("link", { name: /vedi i tornei/i })).not.toBeInTheDocument();
    expect(screen.getByRole("list")).toContainElement(
      screen.getByText("Open di settembre"),
    );

    fireEvent.click(
      screen.getByRole("button", { name: /mercoledì 16 settembre 2026/i }),
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      /mercoledì 16 settembre 2026.*0 tornei/i,
    );
    expect(screen.getByRole("heading", { level: 3, name: "Nessun torneo" })).toBeVisible();
  });

  it("aggiorna oggi quando cambia la data nel fuso Europe/Rome", () => {
    vi.setSystemTime(new Date("2026-09-15T21:59:30.000Z"));
    render(<TournamentCalendar snapshot={snapshot()} />);

    expect(
      screen.getByRole("button", { name: /^martedì 15 settembre 2026.*oggi/i }),
    ).toHaveAttribute("aria-current", "date");

    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    expect(
      screen.getByRole("button", { name: /^mercoledì 16 settembre 2026.*oggi/i }),
    ).toHaveAttribute("aria-current", "date");
    expect(
      screen.getByRole("button", { name: /^martedì 15 settembre 2026/i }),
    ).not.toHaveAttribute("aria-current");
  });
});
