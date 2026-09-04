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
    filters: { ...defaultTournamentFilters, region },
    createdAt: "2026-09-04T08:00:00.000Z",
  };
}

function seedPreferences(preferences: StoredPreferences) {
  values.set(preferencesStorageKey, JSON.stringify(preferences));
}

function storedPreferences() {
  return parsePreferences(values.get(preferencesStorageKey) ?? null);
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
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("PreferencesManager", () => {
  it("blocca le modifiche su dati corrotti e offre il ripristino esplicito", async () => {
    const user = userEvent.setup();
    values.set(preferencesStorageKey, "non-json");

    render(<PreferencesManager />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Dati locali da ripristinare",
    );
    expect(
      screen.getByRole("button", { name: "Apri questa base" }),
    ).toBeDisabled();
    expect(values.get(preferencesStorageKey)).toBe("non-json");
    expect(storageWrites).toHaveLength(0);

    await user.click(
      screen.getByRole("button", { name: "Ripristina dati locali" }),
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
      screen.getByRole("button", { name: "Ripristina dati locali" }),
    );

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("nessuna modifica è stata applicata");
    expect(values.get(preferencesStorageKey)).toBe("non-json");
    expect(
      screen.getByRole("button", { name: "Ripristina dati locali" }),
    ).toBeEnabled();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("spiega come riabilitare lo storage quando non è disponibile", async () => {
    storageReadsShouldFail = true;

    render(<PreferencesManager />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Archiviazione locale non disponibile");
    expect(alert).toHaveTextContent(
      "Abilita l’archiviazione locale nelle impostazioni del browser",
    );
    expect(
      screen.getByRole("button", { name: "Apri questa base" }),
    ).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: "Ripristina dati locali" }),
    ).not.toBeInTheDocument();
    expect(storageWrites).toHaveLength(0);
  });

  it("confronta la base con gli ultimi filtri e non salva i no-op", async () => {
    const user = userEvent.setup();
    const preferences = emptyPreferences();
    preferences.lastFilters = {
      ...defaultTournamentFilters,
      region: "Lombardia",
    };
    seedPreferences(preferences);

    render(<PreferencesManager />);

    expect(
      screen.getByRole("list", { name: "Riepilogo della base salvata" }),
    ).toHaveTextContent("Tutti i tornei");
    expect(
      screen.getByRole("list", { name: "Riepilogo degli ultimi filtri usati" }),
    ).toHaveTextContent("Lombardia");

    const saveButton = screen.getByRole("button", {
      name: "Salva gli ultimi come base",
    });
    expect(saveButton).toBeEnabled();
    await user.click(saveButton);

    expect(storedPreferences().defaults.region).toBe("Lombardia");
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Gli ultimi filtri sono ora la tua base salvata.",
    );
    expect(saveButton).toBeDisabled();

    const writesAfterSave = storageWrites.length;
    await user.click(saveButton);
    expect(storageWrites).toHaveLength(writesAfterSave);
  });

  it("non apre l’elenco quando il browser rifiuta la scrittura", async () => {
    const user = userEvent.setup();
    const preferences = emptyPreferences();
    preferences.defaults = { ...defaultTournamentFilters, region: "Lazio" };
    seedPreferences(preferences);
    render(<PreferencesManager />);
    storageShouldFail = true;

    await user.click(screen.getByRole("button", { name: "Apri questa base" }));

    expect(routerPush).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "nessuna modifica è stata applicata",
    );
    expect(storedPreferences().lastFilters.region).toBe("");
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
