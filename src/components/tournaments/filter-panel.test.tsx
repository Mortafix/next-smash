import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FilterPanel } from "@/components/tournaments/filter-panel";
import { emptyPreferences, parsePreferences } from "@/lib/preferences";
import { defaultTournamentFilters, regionsForTournamentZone, type TournamentFilters } from "@/lib/tournaments/filters";

const store = vi.hoisted(() => ({ preferences: null as ReturnType<typeof emptyPreferences> | null }));

vi.mock("@/hooks/use-preferences-store", () => ({
  usePreferencesStore: () => store.preferences ?? emptyPreferences(),
}));
vi.mock("@/components/tournaments/location-control", () => ({ LocationControl: () => null }));

afterEach(() => {
  cleanup();
  store.preferences = null;
});

function Panel({ initial = defaultTournamentFilters }: { initial?: TournamentFilters }) {
  const [filters, setFilters] = useState(initial);
  return (
    <>
      <FilterPanel
        filters={filters}
        onChange={setFilters}
        regions={["Lombardia", "Trentino-Alto Adige/Südtirol", "[object Object]"]}
        provinces={[
          { value: "MI", label: "Milano (MI)", region: "Lombardia" },
          { value: "TN", label: "Trento (TN)", region: "Trentino-Alto Adige/Südtirol" },
          { value: "RM", label: "Roma (RM)", region: "Lazio" },
        ]}
      />
      <output data-testid="current-filters">{JSON.stringify(filters)}</output>
    </>
  );
}

function currentFilters(): TournamentFilters {
  return JSON.parse(screen.getByTestId("current-filters").textContent ?? "{}");
}

async function openFilters() {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: /^Filtri/ }));
  return user;
}

async function openRegions(user: ReturnType<typeof userEvent.setup>, container: HTMLElement) {
  const summary = container.querySelector(".ns-region-picker__toggle");
  expect(summary).not.toBeNull();
  await user.click(summary!);
  return within(screen.getByRole("group", { name: "Regioni" }));
}

describe("filtri territoriali", () => {
  it("seleziona una zona alla volta e aggiorna la zona quando le regioni cambiano", async () => {
    const { container } = render(<Panel />);
    const user = await openFilters();
    await user.selectOptions(screen.getByLabelText("Zona"), "centro");
    expect(currentFilters().regions).toEqual(regionsForTournamentZone("centro"));
    const regionGroup = await openRegions(user, container);
    expect(regionGroup.getAllByRole("checkbox")).toHaveLength(20);
    expect(regionGroup.getByRole("checkbox", { name: "Marche" })).toBeChecked();

    await user.click(regionGroup.getByRole("checkbox", { name: "Marche" }));
    expect(screen.getByLabelText("Zona")).toHaveValue("");
    expect(screen.getByLabelText("Zona")).toHaveDisplayValue("Regioni personalizzate");
    expect(regionGroup.getByRole("checkbox", { name: "Lazio" })).toBeChecked();
    await user.click(regionGroup.getByRole("checkbox", { name: "Marche" }));
    expect(screen.getByLabelText("Zona")).toHaveValue("centro");
    await user.click(regionGroup.getByRole("checkbox", { name: "Lombardia" }));
    expect(screen.getByLabelText("Zona")).toHaveValue("");

    await user.selectOptions(screen.getByLabelText("Zona"), "nord");
    expect(currentFilters().regions).toEqual(regionsForTournamentZone("nord"));
    expect(regionGroup.getByRole("checkbox", { name: "Lazio" })).not.toBeChecked();
    expect(regionGroup.getByRole("checkbox", { name: "Valle d’Aosta" })).toBeChecked();
    expect(screen.queryByText("[object Object]")).not.toBeInTheDocument();
  });

  it("azzera la provincia dopo ogni modifica territoriale e filtra anche gli alias provinciali", async () => {
    const { container } = render(<Panel initial={{ ...defaultTournamentFilters, regions: ["Lombardia"], provinceCode: "MI" }} />);
    const user = await openFilters();
    expect(screen.getByLabelText("Provincia")).toHaveValue("MI");
    await user.selectOptions(screen.getByLabelText("Zona"), "nord");
    expect(screen.getByLabelText("Provincia")).toHaveValue("");
    expect(screen.getByRole("option", { name: "Trento (TN)" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Roma (RM)" })).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Provincia"), "TN");
    const regionGroup = await openRegions(user, container);
    await user.click(regionGroup.getByRole("checkbox", { name: "Veneto" }));
    expect(screen.getByLabelText("Provincia")).toHaveValue("");
    await user.click(regionGroup.getByRole("button", { name: "Tutta Italia" }));
    expect(currentFilters().regions).toEqual([]);
    expect(screen.queryByLabelText("Provincia")).not.toBeInTheDocument();
  });

  it("applica una ricerca browser precedente preservando regione e provincia migrate", async () => {
    const legacyFilters = { ...defaultTournamentFilters, regions: undefined, region: "Lombardia", provinceCode: "MI" };
    store.preferences = parsePreferences(JSON.stringify({
      ...emptyPreferences(), savedSearches: [{
        id: "legacy", name: "Milano weekend", filters: legacyFilters, createdAt: "2026-09-01T12:00:00.000Z",
      }],
    }));
    render(<Panel />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /^Ricerche/ }));
    await user.click(screen.getByRole("button", { name: /Milano weekend/ }));
    expect(currentFilters()).toMatchObject({ regions: ["Lombardia"], provinceCode: "MI" });
  });
});
