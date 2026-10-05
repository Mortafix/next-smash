import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PreferencesManager } from "@/components/preferences/preferences-manager";
import {
  emptyPreferences,
  inspectPreferences,
  parsePreferences,
  preferencesStorageKey,
  type SavedSearch,
  type StoredPreferences,
} from "@/lib/preferences";
import { defaultTournamentFilters } from "@/lib/tournaments/filters";
import { savedTournamentsStorageKey } from "@/lib/saved-tournaments";
import type { Tournament } from "@/lib/tournaments/types";

const { routerPush } = vi.hoisted(() => ({ routerPush: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPush }),
}));

let values: Map<string, string>;
let storageWrites: Array<[string, string]>;
let storageReadsShouldFail: boolean;
let storageShouldFail: boolean;

function savedSearch(id: string, name: string, region: string): SavedSearch {
  return {
    id,
    name,
    filters: { ...defaultTournamentFilters, regions: [region] },
    createdAt: "2026-09-04T08:00:00.000Z",
  };
}

function seedPreferences(preferences: StoredPreferences) {
  values.set(preferencesStorageKey, JSON.stringify(preferences));
}

function storedPreferences() {
  return parsePreferences(values.get(preferencesStorageKey) ?? null);
}

function savedTournament(overrides: Partial<Tournament> = {}): Tournament {
  return {
    id: "fitp:one",
    source: "fitp",
    sourceId: "one",
    title: "Open Milano",
    startDate: "2026-10-10",
    endDate: "2026-10-11",
    venueName: "Padel Milano",
    city: "Milano",
    province: "Milano",
    provinceCode: "MI",
    region: "Lombardia",
    latitude: 45.46,
    longitude: 9.19,
    locationPrecision: "municipality",
    genders: ["male"],
    competitionTypes: ["Doppio"],
    rankCategories: ["3", "4"],
    ageCategories: [],
    tpraLevel: null,
    registrationOnline: true,
    officialUrl: "https://example.test/one",
    sourceStatus: "Iscrizioni aperte",
    ...overrides,
  };
}

function seedTournaments(tournaments: Tournament[]) {
  values.set(savedTournamentsStorageKey, JSON.stringify({ version: 1, tournaments }));
}

beforeEach(() => {
  values = new Map<string, string>();
  storageWrites = [];
  storageReadsShouldFail = false;
  storageShouldFail = false;
  routerPush.mockReset();

  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => {
        if (storageReadsShouldFail) throw new Error("storage unavailable");
        return values.get(key) ?? null;
      },
      setItem: (key: string, value: string) => {
        storageWrites.push([key, value]);
        if (storageShouldFail) throw new Error("storage unavailable");
        values.set(key, value);
      },
      removeItem: (key: string) => values.delete(key),
      clear: () => values.clear(),
      key: (index: number) => [...values.keys()][index] ?? null,
      get length() {
        return values.size;
      },
    } satisfies Storage,
  });

  Object.defineProperty(window, "requestAnimationFrame", {
    configurable: true,
    value: (callback: FrameRequestCallback) =>
      window.setTimeout(() => callback(performance.now()), 0),
  });
  Object.defineProperty(window, "cancelAnimationFrame", {
    configurable: true,
    value: (frame: number) => window.clearTimeout(frame),
  });
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value(this: HTMLDialogElement) { this.setAttribute("open", ""); },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.removeAttribute("open");
      this.dispatchEvent(new Event("close"));
    },
  });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ source: "fitp", entries: [], fetchedAt: "2026-10-05T08:00:00Z" }),
  }));
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.documentElement.style.overflow = "";
  document.body.style.overflow = "";
  window.history.replaceState(null, "", "/");
});

describe("PreferencesManager", () => {
  it("apre nel profilo i dati attuali di un torneo salvato e restituisce il focus alla card", async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, "", "/profilo");
    seedTournaments([savedTournament()]);
    render(<PreferencesManager currentTournaments={[savedTournament({ title: "Open Milano aggiornato" })]} />);

    const link = screen.getByRole("link", { name: "Open Milano aggiornato" });
    expect(link).toHaveAttribute("href", "/profilo?torneo=fitp%3Aone");
    await user.click(link);

    const dialog = screen.getByRole("dialog", { name: "Open Milano aggiornato" });
    expect(dialog).toHaveAttribute("open");
    expect(window.location.pathname).toBe("/profilo");
    expect(window.location.search).toBe("?torneo=fitp%3Aone");
    expect(routerPush).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole("button", { name: "Chiudi dettagli di Open Milano aggiornato" }));
    await waitFor(() => expect(link).toHaveFocus());
    expect(window.location.pathname).toBe("/profilo");
    expect(window.location.search).toBe("");
  });

  it("mantiene i dettagli dopo aver rimosso l’ultimo torneo e restituisce il focus alla sezione", async () => {
    const user = userEvent.setup();
    seedTournaments([savedTournament()]);
    render(<PreferencesManager />);
    await user.click(screen.getByRole("link", { name: "Open Milano" }));
    const dialog = screen.getByRole("dialog", { name: "Open Milano" });

    await user.click(within(dialog).getByRole("button", { name: "Salvato" }));

    expect(screen.getByRole("heading", { name: "Nessun torneo salvato" })).toBeVisible();
    expect(dialog).toHaveAttribute("open");
    expect(within(dialog).getByRole("button", { name: "Salva" })).toBeEnabled();
    await user.click(within(dialog).getByRole("button", { name: "Chiudi dettagli di Open Milano" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Tornei salvati" })).toHaveFocus());
  });

  it("mantiene aperto anche un torneo raggiunto dal link del profilo dopo la rimozione", async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, "", "/profilo?torneo=fitp%3Aone");
    seedTournaments([savedTournament()]);
    render(<PreferencesManager initialTournamentId="fitp:one" />);

    const dialog = screen.getByRole("dialog", { name: "Open Milano" });
    await user.click(within(dialog).getByRole("button", { name: "Salvato" }));
    expect(dialog).toHaveAttribute("open");
    expect(within(dialog).getByRole("button", { name: "Salva" })).toBeEnabled();

    await user.click(within(dialog).getByRole("button", { name: "Chiudi dettagli di Open Milano" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Tornei salvati" })).toHaveFocus());
    expect(window.location.pathname).toBe("/profilo");
    expect(window.location.search).toBe("");
  });

  it("conserva i tornei archiviati quando non ci sono più nella fonte corrente", () => {
    seedTournaments([savedTournament()]);
    render(<PreferencesManager currentTournaments={[]} />);
    expect(screen.getByRole("link", { name: "Open Milano" })).toBeVisible();
    expect(screen.getByLabelText("1 torneo salvato")).toBeInTheDocument();
  });

  it("ripristina i tornei corrotti senza eliminare le ricerche salvate", async () => {
    const user = userEvent.setup();
    const preferences = emptyPreferences();
    preferences.savedSearches = [savedSearch("one", "Weekend Milano", "Lombardia")];
    seedPreferences(preferences);
    values.set(savedTournamentsStorageKey, "non-json");
    render(<PreferencesManager />);

    expect(screen.getByRole("alert")).toHaveTextContent("Tornei salvati da ripristinare");
    expect(screen.getByRole("button", { name: "Usa la ricerca «Weekend Milano»" })).toBeEnabled();
    expect(values.get(savedTournamentsStorageKey)).toBe("non-json");
    await user.click(screen.getByRole("button", { name: "Ripristina tornei salvati" }));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Nessun torneo salvato" })).toBeVisible();
    expect(storedPreferences().savedSearches[0].name).toBe("Weekend Milano");
  });

  it("blocca le modifiche su dati corrotti e offre il ripristino esplicito", async () => {
    const user = userEvent.setup();
    values.set(preferencesStorageKey, "non-json");

    render(<PreferencesManager />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Ricerche salvate da ripristinare",
    );
    expect(screen.queryByRole("heading", { name: "Filtri di partenza" })).not.toBeInTheDocument();
    expect(values.get(preferencesStorageKey)).toBe("non-json");
    expect(storageWrites).toHaveLength(0);

    await user.click(
      screen.getByRole("button", { name: "Ripristina ricerche salvate" }),
    );

    expect(await screen.findByRole("status")).toHaveTextContent(
      "ripristinati ai valori iniziali",
    );
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
    expect(inspectPreferences(values.get(preferencesStorageKey) ?? null).status).toBe(
      "ready",
    );
    expect(storageWrites).toHaveLength(1);
  });

  it("conserva il dato corrotto se anche il ripristino viene rifiutato", async () => {
    const user = userEvent.setup();
    values.set(preferencesStorageKey, "non-json");
    render(<PreferencesManager />);
    await screen.findByRole("alert");
    storageShouldFail = true;

    await user.click(
      screen.getByRole("button", { name: "Ripristina ricerche salvate" }),
    );

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("nessuna modifica è stata applicata");
    expect(values.get(preferencesStorageKey)).toBe("non-json");
    expect(
      screen.getByRole("button", { name: "Ripristina ricerche salvate" }),
    ).toBeEnabled();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("spiega come riabilitare lo storage quando non è disponibile", async () => {
    storageReadsShouldFail = true;

    render(<PreferencesManager />);

    const [alert] = await screen.findAllByRole("alert");
    expect(alert).toHaveTextContent("Archiviazione locale non disponibile");
    expect(alert).toHaveTextContent(
      "Abilita l’archiviazione locale nelle impostazioni del browser",
    );
    expect(
      screen.queryByRole("button", { name: "Ripristina ricerche salvate" }),
    ).not.toBeInTheDocument();
    expect(storageWrites).toHaveLength(0);
  });

  it("mostra solo tornei e ricerche salvate senza modificare i dati delle vecchie basi", () => {
    const preferences = emptyPreferences();
    preferences.lastFilters = { ...defaultTournamentFilters, regions: ["Lombardia"] };
    preferences.defaults = { ...defaultTournamentFilters, regions: ["Lazio"] };
    seedPreferences(preferences);

    render(<PreferencesManager />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Profilo");
    expect(screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent)).toEqual(["Tornei salvati", "Ricerche salvate"]);
    expect(screen.queryByRole("heading", { name: "Filtri di partenza" })).not.toBeInTheDocument();
    expect(storedPreferences()).toEqual(preferences);
    expect(storageWrites).toHaveLength(0);
  });

  it("non apre l’elenco quando il browser rifiuta la scrittura", async () => {
    const user = userEvent.setup();
    const preferences = emptyPreferences();
    preferences.savedSearches = [savedSearch("one", "Roma sera", "Lazio")];
    seedPreferences(preferences);
    render(<PreferencesManager />);
    storageShouldFail = true;

    await user.click(screen.getByRole("button", { name: "Usa la ricerca «Roma sera»" }));

    expect(routerPush).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "nessuna modifica è stata applicata",
    );
    expect(storedPreferences().lastFilters.regions).toEqual([]);
  });

  it("valida la rinomina e restituisce il focus al controllo della card", async () => {
    const user = userEvent.setup();
    const preferences = emptyPreferences();
    preferences.savedSearches = [savedSearch("one", "Weekend Milano", "Lombardia")];
    seedPreferences(preferences);
    render(<PreferencesManager />);

    await user.click(
      screen.getByRole("button", {
        name: "Rinomina la ricerca «Weekend Milano»",
      }),
    );
    const input = screen.getByRole("textbox", { name: "Nome ricerca" });
    expect(input).toHaveFocus();

    await user.clear(input);
    await user.type(input, "   ");
    await user.click(screen.getByRole("button", { name: "Salva nome" }));
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveFocus();
    expect(screen.getByText(/almeno un carattere/i)).toBeVisible();

    await user.clear(input);
    await user.type(input, "Roma sera");
    await user.click(screen.getByRole("button", { name: "Salva nome" }));

    const renameButton = await screen.findByRole("button", {
      name: "Rinomina la ricerca «Roma sera»",
    });
    await waitFor(() => expect(renameButton).toHaveFocus());
    expect(storedPreferences().savedSearches[0]?.name).toBe("Roma sera");
    expect(screen.getByRole("status")).toHaveTextContent(
      "Ricerca rinominata «Roma sera».",
    );
  });

  it("mantiene aperta la rinomina e il testo se il salvataggio fallisce", async () => {
    const user = userEvent.setup();
    const preferences = emptyPreferences();
    preferences.savedSearches = [savedSearch("one", "Weekend Milano", "Lombardia")];
    seedPreferences(preferences);
    render(<PreferencesManager />);

    await user.click(
      screen.getByRole("button", {
        name: "Rinomina la ricerca «Weekend Milano»",
      }),
    );
    const input = screen.getByRole("textbox", { name: "Nome ricerca" });
    await user.clear(input);
    await user.type(input, "Nome da conservare");
    storageShouldFail = true;

    await user.click(screen.getByRole("button", { name: "Salva nome" }));

    expect(input).toHaveValue("Nome da conservare");
    expect(input).toHaveFocus();
    expect(screen.getByRole("alert")).toBeVisible();
    expect(storedPreferences().savedSearches[0]?.name).toBe("Weekend Milano");
  });

  it("porta il focus all’undo e ripristina ricerca, ordine e focus", async () => {
    const user = userEvent.setup();
    const preferences = emptyPreferences();
    preferences.savedSearches = [
      savedSearch("one", "Weekend Milano", "Lombardia"),
      savedSearch("two", "Roma sera", "Lazio"),
    ];
    seedPreferences(preferences);
    render(<PreferencesManager />);

    await user.click(
      screen.getByRole("button", {
        name: "Elimina la ricerca «Weekend Milano»",
      }),
    );

    const undoButton = await screen.findByRole("button", {
      name: "Annulla eliminazione di «Weekend Milano»",
    });
    await waitFor(() => expect(undoButton).toHaveFocus());
    expect(screen.getByLabelText("1 ricerca salvata")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Elimina la ricerca «Roma sera»" }),
    ).toBeDisabled();

    await user.click(undoButton);

    const restoredUseButton = await screen.findByRole("button", {
      name: "Usa la ricerca «Weekend Milano»",
    });
    await waitFor(() => expect(restoredUseButton).toHaveFocus());
    expect(screen.getByLabelText("2 ricerche salvate")).toBeInTheDocument();
    expect(storedPreferences().savedSearches.map((search) => search.id)).toEqual([
      "one",
      "two",
    ]);
  });

  it("mantiene card e focus quando l’eliminazione non può essere salvata", async () => {
    const user = userEvent.setup();
    const preferences = emptyPreferences();
    preferences.savedSearches = [savedSearch("one", "Weekend Milano", "Lombardia")];
    seedPreferences(preferences);
    render(<PreferencesManager />);
    storageShouldFail = true;

    const card = screen.getByRole("article");
    const deleteButton = within(card).getByRole("button", {
      name: "Elimina la ricerca «Weekend Milano»",
    });
    deleteButton.focus();
    await user.click(deleteButton);

    expect(card).toBeInTheDocument();
    expect(deleteButton).toHaveFocus();
    expect(screen.queryByText("Ricerca eliminata")).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeVisible();
  });
});
