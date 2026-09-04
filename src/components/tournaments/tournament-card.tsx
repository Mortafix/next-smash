import {
  faArrowUpRightFromSquare,
  faCircleInfo,
  faLocationDot,
  faMarsDouble,
  faMedal,
  faUsers,
  faVenusMars,
  faVenusDouble,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Image from "next/image";
import Link from "next/link";
import type { MouseEvent } from "react";

import type { TournamentWithDistance } from "@/lib/tournaments/filters";
import type { TournamentGender } from "@/lib/tournaments/types";

type TournamentCardProps = {
  tournament: TournamentWithDistance;
  compact?: boolean;
  onOpenDetails?: (
    tournamentId: string,
    trigger: HTMLAnchorElement,
  ) => void;
};

type DateRailParts =
  | {
      variant: "single";
      startDay: string;
      startMonth: string;
      year: string;
    }
  | {
      variant: "range";
      startDay: string;
      startMonth: string;
      endDay: string;
      endMonth: string;
      year: string;
    };

const dayFormatter = new Intl.DateTimeFormat("it-IT", { day: "2-digit" });
const monthFormatter = new Intl.DateTimeFormat("it-IT", { month: "short" });
const dateFormatter = new Intl.DateTimeFormat("it-IT", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const visibleGenderOrder = ["female", "male", "mixed", "open"] as const;

const genderLabels: Record<(typeof visibleGenderOrder)[number], string> = {
  female: "Doppio femminile",
  male: "Doppio maschile",
  mixed: "Doppio misto",
  open: "Categoria open",
};

const sourceLogos = {
  fitp: {
    label: "FITP",
    src: "/brands/fitp-negative.svg",
    width: 82,
    height: 40,
  },
  tpra: {
    label: "TPRA",
    src: "/brands/tpra-negative.svg",
    width: 104,
    height: 24,
  },
} as const;

function localDate(value: string) {
  return new Date(`${value}T12:00:00`);
}

function tournamentDateLabel(startDate: string, endDate: string) {
  const start = dateFormatter.format(localDate(startDate));
  if (startDate === endDate) return start;
  return `${start} – ${dateFormatter.format(localDate(endDate))}`;
}

function dateRailParts(startDate: string, endDate: string): DateRailParts {
  const start = localDate(startDate);
  const end = localDate(endDate);
  const startMonth = monthFormatter
    .format(start)
    .replace(".", "")
    .toLocaleUpperCase("it-IT");
  const endMonth = monthFormatter
    .format(end)
    .replace(".", "")
    .toLocaleUpperCase("it-IT");
  const startYear = start.getFullYear();
  const endYear = end.getFullYear();
  if (startDate === endDate) {
    return {
      variant: "single",
      startDay: dayFormatter.format(start),
      startMonth,
      year: String(startYear),
    };
  }

  return {
    variant: "range",
    startDay: dayFormatter.format(start),
    startMonth,
    endDay: dayFormatter.format(end),
    endMonth,
    year: startYear === endYear ? String(startYear) : `${startYear}–${endYear}`,
  };
}

function rankCategoryLabel(rankCategories: string[]) {
  const ranks = [...new Set(rankCategories.map((rank) => rank.trim()).filter(Boolean))];
  if (ranks.length === 0) return null;

  const numericRanks = ranks.map(Number);
  if (numericRanks.every((rank) => Number.isInteger(rank) && rank > 0)) {
    numericRanks.sort((a, b) => a - b);
    const isConsecutive = numericRanks.every(
      (rank, index) => index === 0 || rank === numericRanks[index - 1] + 1,
    );

    if (numericRanks.length === 1) return `${numericRanks[0]}ª`;
    if (isConsecutive) {
      return `${numericRanks[0]}ª–${numericRanks[numericRanks.length - 1]}ª`;
    }
    return numericRanks.map((rank) => `${rank}ª`).join(" · ");
  }

  return ranks.join(" · ");
}

function visibleGenders(genders: TournamentGender[]) {
  return visibleGenderOrder.filter((gender) => genders.includes(gender));
}

function CategoryIcon({ gender }: { gender: (typeof visibleGenderOrder)[number] }) {
  const label = genderLabels[gender];

  return (
    <span
      className={`ns-tournament-card__category-icon ns-tournament-card__category-icon--${gender}`}
      role="img"
      aria-label={label}
      title={label}
    >
      {gender === "female" ? (
        <FontAwesomeIcon icon={faVenusDouble} aria-hidden="true" />
      ) : null}
      {gender === "male" ? (
        <FontAwesomeIcon icon={faMarsDouble} aria-hidden="true" />
      ) : null}
      {gender === "mixed" ? (
        <>
          <FontAwesomeIcon
            className="ns-tournament-card__category-symbol--mixed-left"
            icon={faVenusMars}
            aria-hidden="true"
          />
          <FontAwesomeIcon
            className="ns-tournament-card__category-symbol--mixed-right"
            icon={faVenusMars}
            aria-hidden="true"
          />
        </>
      ) : null}
      {gender === "open" ? (
        <FontAwesomeIcon icon={faUsers} aria-hidden="true" />
      ) : null}
    </span>
  );
}

function DateRail({ startDate, endDate }: { startDate: string; endDate: string }) {
  const parts = dateRailParts(startDate, endDate);
  const fullLabel = tournamentDateLabel(startDate, endDate);

  return (
    <div
      className={`ns-date-rail ns-date-rail--${parts.variant}`}
      role="group"
      aria-label={`Periodo del torneo: ${fullLabel}`}
    >
      <div className="ns-date-rail__visual" aria-hidden="true">
        <div className="ns-date-rail__segments">
          <span className="ns-date-rail__segment">
            <strong>{parts.startDay}</strong>
            <span className="ns-date-rail__month">{parts.startMonth}</span>
          </span>
          {parts.variant === "range" ? (
            <>
              <span className="ns-date-rail__divider">–</span>
              <span className="ns-date-rail__segment">
                <strong>{parts.endDay}</strong>
                <span className="ns-date-rail__month">{parts.endMonth}</span>
              </span>
            </>
          ) : null}
        </div>
        <span className="ns-date-rail__year">{parts.year}</span>
      </div>
    </div>
  );
}

function tournamentDetailsHref(tournamentId: string) {
  return `/tornei?torneo=${encodeURIComponent(tournamentId)}`;
}

export function TournamentCard({
  tournament,
  compact = false,
  onOpenDetails,
}: TournamentCardProps) {
  const genders = visibleGenders(tournament.genders);
  const rankLabel = rankCategoryLabel(tournament.rankCategories);
  const tpraLevel = tournament.tpraLevel?.trim().toLocaleUpperCase("it-IT") ?? null;
  const hasClassification = genders.length > 0 || rankLabel !== null || tpraLevel !== null;
  const sourceLogo = sourceLogos[tournament.source];

  function handleTitleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (
      !onOpenDetails ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    event.preventDefault();
    onOpenDetails(tournament.id, event.currentTarget);
  }

  return (
    <article className={`ns-tournament-card${compact ? " ns-tournament-card--compact" : ""}`}>
      <DateRail startDate={tournament.startDate} endDate={tournament.endDate} />

      <div className="ns-tournament-card__body">
        <div className="ns-card-kicker">
          <span
            className={`ns-source-mark ns-source-mark--${tournament.source}`}
            role="img"
            aria-label={`Fonte: ${sourceLogo.label}`}
          >
            <Image
              src={sourceLogo.src}
              alt=""
              width={sourceLogo.width}
              height={sourceLogo.height}
              unoptimized
            />
          </span>

          {tournament.sourceStatus ? (
            <div className="ns-tournament-card__states">
              <span className="ns-state-badge">{tournament.sourceStatus}</span>
            </div>
          ) : null}

          {tournament.distanceKm !== null ? (
            <span
              className="ns-distance-badge"
              aria-label={`Distanza stimata: ${Math.round(tournament.distanceKm)} chilometri`}
              title="Stima dal centro del comune"
            >
              {Math.round(tournament.distanceKm)}&nbsp;KM
            </span>
          ) : null}
        </div>

        <div className="ns-tournament-card__headline">
          <h3 className="ns-tournament-card__title">
            <Link
              className="ns-tournament-card__title-link"
              href={tournamentDetailsHref(tournament.id)}
              aria-haspopup="dialog"
              onClick={handleTitleClick}
            >
              <span>{tournament.title}</span>
              <FontAwesomeIcon
                className="ns-tournament-card__title-cue"
                icon={faCircleInfo}
                aria-hidden="true"
              />
            </Link>
          </h3>

          {hasClassification ? (
            <div className="ns-tournament-card__classification">
              {genders.length > 0 ? (
                <ul className="ns-tournament-card__categories" aria-label="Categorie del torneo">
                  {genders.map((gender) => (
                    <li key={gender}>
                      <CategoryIcon gender={gender} />
                    </li>
                  ))}
                </ul>
              ) : null}

              {rankLabel ? (
                <span
                  className="ns-tournament-card__rank"
                  aria-label={`Fasce FITP: ${rankLabel}`}
                  title={`Fasce FITP: ${rankLabel}`}
                >
                  <FontAwesomeIcon icon={faMedal} aria-hidden="true" />
                  {rankLabel}
                </span>
              ) : null}

              {tpraLevel ? (
                <span
                  className="ns-tournament-card__rank"
                  aria-label={`Livello TPRA: ${tpraLevel}`}
                  title={`Livello TPRA: ${tpraLevel}`}
                >
                  <FontAwesomeIcon icon={faMedal} aria-hidden="true" />
                  {tpraLevel}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="ns-tournament-card__footer">
          <p className="ns-tournament-card__place">
            <span className="ns-tournament-card__place-icon" aria-hidden="true">
              <FontAwesomeIcon icon={faLocationDot} />
            </span>
            <span className="ns-tournament-card__place-copy">
              <strong>{tournament.venueName ?? "Circolo non indicato"}</strong>
              <span>
                {[tournament.city, tournament.provinceCode].filter(Boolean).join(" · ") ||
                  "Località non indicata"}
              </span>
            </span>
          </p>

          <a
            className="ns-card-link"
            href={tournament.officialUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Iscriviti a ${tournament.title} sul sito ${sourceLogo.label} (si apre in una nuova scheda)`}
          >
            Iscriviti
            <FontAwesomeIcon icon={faArrowUpRightFromSquare} aria-hidden="true" />
          </a>
        </div>
      </div>
    </article>
  );
}
