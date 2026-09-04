import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TournamentDetailDialog } from "@/components/tournaments/tournament-detail-dialog";
import type { TournamentWithDistance } from "@/lib/tournaments/filters";
import type { TournamentRegistrationSummary } from "@/lib/tournaments/registration-types";

const fetchMock = vi.fn();
const writeText = vi.fn();

function tournament(
  overrides: Partial<TournamentWithDistance> = {},
): TournamentWithDistance {
  return {
    id: "fitp:1073",
    source: "fitp",
    sourceId: "1073",
    title: "Open Corbetta Sport Center",
    startDate: "2026-09-02",
    endDate: "2026-09-06",
    venueName: "Corbetta Sport Center SSD ARL",
    city: "Corbetta",
    province: "Milano",
    provinceCode: "MI",
    region: "Lombardia",
    latitude: 45.466,
    longitude: 8.918,
    locationPrecision: "municipality",
    genders: ["female", "male", "mixed"],
    competitionTypes: ["Doppio F.", "Doppio M.", "Misto"],
    rankCategories: ["1", "2", "3", "4"],
    ageCategories: ["NOR"],
    tpraLevel: null,
    registrationOnline: true,
    officialUrl: "https://example.test/tournament/1073",
    sourceStatus: "In corso",
    distanceKm: 12.4,
    ...overrides,
  };
}

function registrationSummary(
  overrides: Partial<TournamentRegistrationSummary> = {},
): TournamentRegistrationSummary {
  return {
    source: "fitp",
    fetchedAt: "2026-09-04T10:30:00.000Z",
    entries: [
      {
        label: "Doppio maschile",
        registeredPlayers: 0,
        registeredPairs: 0,
        capacityPlayers: 32,
        capacityPairs: 16,
        reservePlayers: 0,
        reservePairs: 0,
      },
      {
        label: "Doppio femminile",
        registeredPlayers: 20,
        registeredPairs: 10,
        capacityPlayers: null,
        capacityPairs: null,
        reservePlayers: 2,
        reservePairs: 1,
      },
    ],
    ...overrides,
  };
}

function successfulResponse(summary = registrationSummary()) {
  return {
    ok: true,
    json: async () => summary,
  } as Response;
}

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(successfulResponse());
  writeText.mockReset();
  writeText.mockResolvedValue(undefined);
  vi.stubGlobal("fetch", fetchMock);

  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.setAttribute("open", "");
      this.querySelector<HTMLElement>("[autofocus]")?.focus();
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.removeAttribute("open");
      this.dispatchEvent(new Event("close"));
    },
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  document.documentElement.style.overflow = "";
  document.body.style.overflow = "";
  document.body.style.paddingInlineEnd = "";
});

describe("TournamentDetailDialog", () => {
  it("mostra i dettagli della card e mantiene separati i conteggi, incluso lo zero", async () => {
    render(<TournamentDetailDialog tournament={tournament()} onClose={vi.fn()} />);

    const dialog = screen.getByRole("dialog", {
      name: "Open Corbetta Sport Center",
    });
    expect(dialog).toHaveAttribute("open");
    expect(
      within(dialog).getByRole("group", {
        name: "Periodo del torneo: 2 settembre 2026 – 6 settembre 2026",
      }),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole("img", { name: "Fonte: FITP" })).toBeInTheDocument();
    expect(within(dialog).getByText("In corso")).toBeInTheDocument();
    expect(within(dialog).getByText("12 KM")).toHaveAccessibleName(
      "Distanza stimata: 12 chilometri",
    );
    expect(within(dialog).getByRole("img", { name: "Doppio femminile" })).toBeInTheDocument();
    expect(within(dialog).getByText("1ª–4ª")).toHaveAccessibleName(
      "Fasce FITP: 1ª–4ª",
    );
    expect(within(dialog).getByText("Corbetta Sport Center SSD ARL")).toBeInTheDocument();
    expect(within(dialog).getByText("Corbetta · MI")).toBeInTheDocument();
    expect(
      within(dialog).getByRole("link", {
        name: /Iscriviti a Open Corbetta Sport Center sul sito FITP/,
      }),
    ).toHaveAttribute("target", "_blank");
    expect(
      within(dialog).getByText("Caricamento delle coppie iscritte…"),
    ).toBeInTheDocument();

    const men = await within(dialog).findByText("Doppio maschile");
    const menEntry = men.closest(".ns-tournament-detail-dialog__registration-entry");
    expect(menEntry).not.toBeNull();
    expect(within(menEntry as HTMLElement).getByText("0")).toBeInTheDocument();
    expect(within(menEntry as HTMLElement).getByText("coppie su 16")).toBeInTheDocument();
    expect(
      within(menEntry as HTMLElement).queryByText(/Giocatori iscritti/i),
    ).not.toBeInTheDocument();
    expect(
      within(menEntry as HTMLElement).queryByText(/in riserva/i),
    ).not.toBeInTheDocument();
    const women = within(dialog).getByText("Doppio femminile");
    const womenEntry = women.closest(".ns-tournament-detail-dialog__registration-entry");
    expect(womenEntry).not.toBeNull();
    expect(within(womenEntry as HTMLElement).getByText("10")).toBeInTheDocument();
    expect(within(womenEntry as HTMLElement).getByText("coppie")).toBeInTheDocument();
    expect(within(womenEntry as HTMLElement).getByText("1 in riserva")).toBeInTheDocument();
    expect(within(dialog).getByText(/Aggiornato il/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/tournaments/fitp%3A1073/registrations",
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  it("mostra un errore recuperabile quando il caricamento fallisce", async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({}) } as Response);
    const user = userEvent.setup();
    render(<TournamentDetailDialog tournament={tournament()} onClose={vi.fn()} />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "Non riusciamo a caricare il numero di coppie iscritte",
    );

    fetchMock.mockResolvedValue(successfulResponse(registrationSummary({ entries: [] })));
    await user.click(within(alert).getByRole("button", { name: "Riprova" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(
      await screen.findByText(/Il numero di coppie iscritte non è disponibile/),
    ).toBeInTheDocument();
  });

  it("copia il solo link canonico e conferma l'azione nel dialog", async () => {
    render(<TournamentDetailDialog tournament={tournament()} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Condividi" }));

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(
        "http://localhost/tornei?torneo=fitp%3A1073",
      ),
    );
    expect(screen.getByRole("button", { name: "Link copiato" })).toBeInTheDocument();
    expect(screen.getByText("Link del torneo copiato negli appunti.")).toBeInTheDocument();
  });

  it("offre il link selezionabile quando la clipboard non è disponibile", async () => {
    writeText.mockRejectedValue(new Error("denied"));
    render(<TournamentDetailDialog tournament={tournament()} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Condividi" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Copia non riuscita");
    expect(within(alert).getByRole("textbox")).toHaveValue(
      "http://localhost/tornei?torneo=fitp%3A1073",
    );
  });

  it("inoltra Escape e click fuori dal rettangolo senza richiamare onClose alla chiusura controllata", () => {
    const onClose = vi.fn();
    vi.spyOn(document.documentElement, "clientWidth", "get").mockReturnValue(1009);
    vi.spyOn(window, "innerWidth", "get").mockReturnValue(1024);
    document.body.style.paddingInlineEnd = "2px";
    const { rerender } = render(
      <TournamentDetailDialog tournament={tournament()} onClose={onClose} />,
    );
    const dialog = screen.getByRole("dialog");
    const cancelEvent = new Event("cancel", { cancelable: true });

    expect(document.documentElement.style.overflow).toBe("hidden");
    expect(document.body.style.overflow).toBe("hidden");
    expect(document.body.style.paddingInlineEnd).toBe("17px");

    fireEvent(dialog, cancelEvent);
    expect(cancelEvent.defaultPrevented).toBe(true);
    expect(onClose).toHaveBeenCalledTimes(1);

    rerender(<TournamentDetailDialog tournament={null} onClose={onClose} />);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(dialog).not.toHaveAttribute("open");
    expect(document.documentElement.style.overflow).toBe("");
    expect(document.body.style.overflow).toBe("");
    expect(document.body.style.paddingInlineEnd).toBe("2px");
  });

  it("chiude soltanto quando il click sul backdrop è realmente fuori dal dialog", () => {
    const onClose = vi.fn();
    render(<TournamentDetailDialog tournament={tournament()} onClose={onClose} />);
    const dialog = screen.getByRole("dialog");
    vi.spyOn(dialog, "getBoundingClientRect").mockReturnValue({
      bottom: 500,
      height: 400,
      left: 100,
      right: 600,
      top: 100,
      width: 500,
      x: 100,
      y: 100,
      toJSON: () => ({}),
    });

    fireEvent.click(dialog, { clientX: 200, clientY: 200 });
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(dialog, { clientX: 20, clientY: 20 });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
