import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TournamentCard } from "@/components/tournaments/tournament-card";
import type { TournamentWithDistance } from "@/lib/tournaments/filters";

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

afterEach(cleanup);

describe("TournamentCard", () => {
  it("usa il titolo come deep-link e intercetta solo l'apertura locale semplice", () => {
    const onOpenDetails = vi.fn();
    render(
      <TournamentCard
        tournament={tournament()}
        onOpenDetails={onOpenDetails}
      />,
    );

    const titleLink = screen.getByRole("link", {
      name: "Open Corbetta Sport Center",
    });
    expect(titleLink).toHaveAttribute(
      "href",
      "/tornei?torneo=fitp%3A1073",
    );
    expect(titleLink).toHaveAttribute("aria-haspopup", "dialog");

    titleLink.addEventListener("click", (event) => event.preventDefault(), {
      capture: true,
      once: true,
    });
    fireEvent.click(titleLink, { ctrlKey: true });
    expect(onOpenDetails).not.toHaveBeenCalled();

    fireEvent.click(titleLink);
    expect(onOpenDetails).toHaveBeenCalledWith("fitp:1073", titleLink);
  });

  it("mostra un unico intervallo grande nello stesso mese", () => {
    const { container } = render(<TournamentCard tournament={tournament()} />);

    expect(
      screen.getByRole("group", {
        name: "Periodo del torneo: 2 settembre 2026 – 6 settembre 2026",
      }),
    ).toBeInTheDocument();
    expect(container.querySelector(".ns-date-rail__segments")).toHaveTextContent(
      "02SET–06SET",
    );
    expect(container.querySelectorAll(".ns-date-rail__segment")).toHaveLength(2);
    expect(container.querySelector(".ns-date-rail__year")).toHaveTextContent("2026");
    expect(container.querySelector(".ns-tournament-card__date")).not.toBeInTheDocument();
  });

  it("mostra un solo giorno quando inizio e fine coincidono", () => {
    const { container } = render(
      <TournamentCard
        tournament={tournament({ startDate: "2026-09-02", endDate: "2026-09-02" })}
      />,
    );

    expect(
      screen.getByRole("group", { name: "Periodo del torneo: 2 settembre 2026" }),
    ).toBeInTheDocument();
    expect(container.querySelector(".ns-date-rail__segments")).toHaveTextContent("02SET");
    expect(container.querySelectorAll(".ns-date-rail__segment")).toHaveLength(1);
  });

  it("mantiene espliciti mesi e anni diversi", () => {
    const { container } = render(
      <TournamentCard
        tournament={tournament({ startDate: "2026-12-30", endDate: "2027-01-03" })}
      />,
    );

    expect(
      screen.getByRole("group", {
        name: "Periodo del torneo: 30 dicembre 2026 – 3 gennaio 2027",
      }),
    ).toBeInTheDocument();
    expect(container.querySelector(".ns-date-rail__segments")).toHaveTextContent(
      "30DIC–03GEN",
    );
    expect(container.querySelector(".ns-date-rail__year")).toHaveTextContent("2026–2027");
  });

  it("usa icone accessibili per le categorie e il misto bicolore", () => {
    render(<TournamentCard tournament={tournament()} />);

    expect(screen.getByRole("img", { name: "Doppio femminile" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Doppio maschile" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Doppio misto" })).toHaveClass(
      "ns-tournament-card__category-icon--mixed",
    );
    expect(
      screen
        .getByRole("img", { name: "Doppio misto" })
        .querySelectorAll('[class*="category-symbol--mixed-"]'),
    ).toHaveLength(2);
    expect(
      screen
        .getByRole("img", { name: "Doppio misto" })
        .querySelectorAll('svg[data-icon="venus-mars"]'),
    ).toHaveLength(2);
    expect(screen.queryByText("Doppio F.")).not.toBeInTheDocument();
    expect(screen.queryByText("Doppio M.")).not.toBeInTheDocument();
    expect(screen.queryByText("Misto")).not.toBeInTheDocument();
  });

  it("raggruppa le fasce senza inventare intervalli mancanti", () => {
    const { rerender } = render(
      <TournamentCard tournament={tournament({ rankCategories: ["4", "1", "2", "4"] })} />,
    );

    expect(screen.getByText("1ª · 2ª · 4ª")).toHaveAccessibleName(
      "Fasce FITP: 1ª · 2ª · 4ª",
    );
    expect(screen.queryByText(/fascia/i)).not.toBeInTheDocument();

    rerender(<TournamentCard tournament={tournament()} />);
    expect(screen.getByText("1ª–4ª")).toHaveAccessibleName("Fasce FITP: 1ª–4ª");
  });

  it("mostra il livello TPRA nello stesso gruppo informativo", () => {
    render(
      <TournamentCard
        tournament={tournament({
          source: "tpra",
          rankCategories: [],
          tpraLevel: "expert",
        })}
      />,
    );

    expect(screen.getByText("EXPERT")).toHaveAccessibleName("Livello TPRA: EXPERT");
    expect(screen.queryByText(/livello/i)).not.toBeInTheDocument();
    const sourceMark = screen.getByRole("img", { name: "Fonte: TPRA" });
    expect(sourceMark).toHaveClass("ns-source-mark--tpra");
    expect(sourceMark.querySelector("img")).toHaveAttribute(
      "src",
      "/brands/tpra-negative.svg",
    );
  });

  it("mostra solo lo stato utile, la distanza pulita e un collegamento accessibile", () => {
    render(<TournamentCard tournament={tournament()} />);

    expect(screen.queryByText("Iscrizione online")).not.toBeInTheDocument();
    expect(screen.getByText("In corso")).toHaveClass("ns-state-badge");
    expect(screen.getByText("12 KM")).toHaveAccessibleName(
      "Distanza stimata: 12 chilometri",
    );
    expect(screen.queryByText(/≈/)).not.toBeInTheDocument();
    const sourceMark = screen.getByRole("img", { name: "Fonte: FITP" });
    expect(sourceMark.querySelector("img")).toHaveAttribute(
      "src",
      "/brands/fitp-negative.svg",
    );

    const link = screen.getByRole("link", {
      name: "Iscriviti a Open Corbetta Sport Center sul sito FITP (si apre in una nuova scheda)",
    });
    expect(within(link).getByText("Iscriviti")).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "https://example.test/tournament/1073");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});
