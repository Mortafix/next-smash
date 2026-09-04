"use client";

import {
  faArrowUpRightFromSquare,
  faCalendarDays,
  faCheck,
  faLocationDot,
  faMarsDouble,
  faMedal,
  faShareNodes,
  faUsers,
  faVenusDouble,
  faVenusMars,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Image from "next/image";
import {
  type MouseEvent as ReactMouseEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import type { TournamentWithDistance } from "@/lib/tournaments/filters";
import type {
  TournamentRegistrationEntry,
  TournamentRegistrationSummary,
} from "@/lib/tournaments/registration-types";
import type { TournamentGender } from "@/lib/tournaments/types";

type TournamentDetailDialogProps = {
  tournament: TournamentWithDistance | null;
  onClose: () => void;
};

type RegistrationState =
  | { status: "idle" }
  | { status: "loading"; tournamentId: string }
  | {
      status: "success";
      tournamentId: string;
      summary: TournamentRegistrationSummary;
    }
  | { status: "error"; tournamentId: string };

type CopyResult = {
  tournamentId: string;
  status: "success" | "error";
  url: string;
};

const dateFormatter = new Intl.DateTimeFormat("it-IT", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const updateFormatter = new Intl.DateTimeFormat("it-IT", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
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

function rankCategoryLabel(rankCategories: string[]) {
  const ranks = [...new Set(rankCategories.map((rank) => rank.trim()).filter(Boolean))];
  if (ranks.length === 0) return null;

  const numericRanks = ranks.map(Number);
  if (numericRanks.every((rank) => Number.isInteger(rank) && rank > 0)) {
    numericRanks.sort((left, right) => left - right);
    const consecutive = numericRanks.every(
      (rank, index) => index === 0 || rank === numericRanks[index - 1] + 1,
    );

    if (numericRanks.length === 1) return `${numericRanks[0]}ª`;
    if (consecutive) {
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

function isCount(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0;
}

function isNullableCount(value: unknown): value is number | null {
  return value === null || isCount(value);
}

function isRegistrationEntry(value: unknown): value is TournamentRegistrationEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.label === "string" &&
    isCount(entry.registeredPlayers) &&
    isNullableCount(entry.registeredPairs) &&
    isNullableCount(entry.capacityPlayers) &&
    isNullableCount(entry.capacityPairs) &&
    isCount(entry.reservePlayers) &&
    isNullableCount(entry.reservePairs)
  );
}

function isRegistrationSummary(value: unknown): value is TournamentRegistrationSummary {
  if (!value || typeof value !== "object") return false;
  const summary = value as Record<string, unknown>;
  return (
    (summary.source === "fitp" || summary.source === "tpra") &&
    typeof summary.fetchedAt === "string" &&
    Array.isArray(summary.entries) &&
    summary.entries.every(isRegistrationEntry)
  );
}

function canonicalTournamentUrl(tournamentId: string) {
  const query = new URLSearchParams({ torneo: tournamentId });
  const relativeUrl = `/tornei?${query.toString()}`;
  if (typeof window === "undefined") return relativeUrl;
  return new URL(relativeUrl, window.location.origin).toString();
}

function countLabel(count: number, singular: string, plural: string) {
  return count === 1 ? singular : plural;
}

function RegistrationEntry({ entry }: { entry: TournamentRegistrationEntry }) {
  const registeredPairs = entry.registeredPairs;

  return (
    <div className="ns-tournament-detail-dialog__registration-entry">
      <dt>{entry.label.trim() || "Iscrizioni"}</dt>
      {registeredPairs !== null ? (
        <dd>
          <strong>{registeredPairs}</strong>
          <span>
            {countLabel(registeredPairs, "coppia", "coppie")}
            {entry.capacityPairs !== null ? ` su ${entry.capacityPairs}` : ""}
          </span>
          {entry.reservePairs !== null && entry.reservePairs > 0 ? (
            <span className="ns-tournament-detail-dialog__registration-reserve">
              {entry.reservePairs} in riserva
            </span>
          ) : null}
        </dd>
      ) : (
        <dd className="ns-tournament-detail-dialog__registration-empty">
          Non disponibile
        </dd>
      )}
    </div>
  );
}

function formattedUpdate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : updateFormatter.format(date);
}

export function TournamentDetailDialog({
  tournament,
  onClose,
}: TournamentDetailDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();
  const registrationsTitleId = useId();
  const [registrationAttempt, setRegistrationAttempt] = useState(0);
  const [registrationState, setRegistrationState] = useState<RegistrationState>({
    status: "idle",
  });
  const [copyResult, setCopyResult] = useState<CopyResult | null>(null);
  const isOpen = tournament !== null;
  const tournamentId = tournament?.id ?? null;
  const tournamentSource = tournament?.source ?? null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      returnFocusRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
      return;
    }

    if (!isOpen) {
      if (dialog.open) dialog.close();
      const returnFocus = returnFocusRef.current;
      returnFocusRef.current = null;
      if (returnFocus?.isConnected) {
        window.queueMicrotask(() => returnFocus.focus({ preventScroll: true }));
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const root = document.documentElement;
    const body = document.body;
    const previousRootOverflow = root.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyPaddingInlineEnd = body.style.paddingInlineEnd;
    const scrollbarWidth =
      root.clientWidth > 0 ? Math.max(0, window.innerWidth - root.clientWidth) : 0;
    const bodyPaddingInlineEnd =
      Number.parseFloat(window.getComputedStyle(body).paddingInlineEnd) || 0;

    root.style.overflow = "hidden";
    body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      body.style.paddingInlineEnd = `${bodyPaddingInlineEnd + scrollbarWidth}px`;
    }

    return () => {
      root.style.overflow = previousRootOverflow;
      body.style.overflow = previousBodyOverflow;
      body.style.paddingInlineEnd = previousBodyPaddingInlineEnd;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!tournamentId || !tournamentSource) return;

    const selectedTournamentId = tournamentId;
    const selectedTournamentSource = tournamentSource;
    const controller = new AbortController();

    async function loadRegistrations() {
      try {
        const response = await fetch(
          `/api/tournaments/${encodeURIComponent(selectedTournamentId)}/registrations`,
          {
            cache: "no-store",
            headers: { Accept: "application/json" },
            signal: controller.signal,
          },
        );
        if (!response.ok) throw new Error("Registration request failed");

        const value: unknown = await response.json();
        if (!isRegistrationSummary(value) || value.source !== selectedTournamentSource) {
          throw new Error("Invalid registration response");
        }

        setRegistrationState({
          status: "success",
          tournamentId: selectedTournamentId,
          summary: value,
        });
      } catch {
        if (controller.signal.aborted) return;
        setRegistrationState({
          status: "error",
          tournamentId: selectedTournamentId,
        });
      }
    }

    void loadRegistrations();
    return () => controller.abort();
  }, [registrationAttempt, tournamentId, tournamentSource]);

  const visibleRegistrationState = useMemo<RegistrationState>(() => {
    if (!tournamentId) return { status: "idle" };
    if (
      registrationState.status !== "idle" &&
      registrationState.tournamentId === tournamentId
    ) {
      return registrationState;
    }
    return { status: "loading", tournamentId };
  }, [registrationState, tournamentId]);

  function requestClose() {
    dialogRef.current?.close();
    onClose();
  }

  function retryRegistrations() {
    if (!tournamentId) return;
    setRegistrationState({ status: "loading", tournamentId });
    setRegistrationAttempt((attempt) => attempt + 1);
  }

  function handleDialogClick(event: ReactMouseEvent<HTMLDialogElement>) {
    if (event.target !== event.currentTarget) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const outside =
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom;
    if (outside) requestClose();
  }

  async function shareTournament() {
    if (!tournament) return;
    const url = canonicalTournamentUrl(tournament.id);

    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(url);
      setCopyResult({ tournamentId: tournament.id, status: "success", url });
    } catch {
      setCopyResult({ tournamentId: tournament.id, status: "error", url });
    }
  }

  const genders = tournament ? visibleGenders(tournament.genders) : [];
  const rankLabel = tournament ? rankCategoryLabel(tournament.rankCategories) : null;
  const tpraLevel = tournament?.tpraLevel?.trim().toLocaleUpperCase("it-IT") ?? null;
  const sourceLogo = tournament ? sourceLogos[tournament.source] : null;
  const registrationUpdate =
    visibleRegistrationState.status === "success"
      ? formattedUpdate(visibleRegistrationState.summary.fetchedAt)
      : null;
  const visibleCopyResult =
    copyResult?.tournamentId === tournamentId ? copyResult : null;

  return (
    <dialog
      className="ns-dialog ns-tournament-detail-dialog"
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      onClick={handleDialogClick}
    >
      {tournament && sourceLogo ? (
        <>
          <header className="ns-tournament-detail-dialog__header">
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

            <div className="ns-tournament-detail-dialog__header-meta">
              {tournament.sourceStatus ? (
                <span className="ns-state-badge">{tournament.sourceStatus}</span>
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

            <button
              className="ns-icon-button"
              type="button"
              aria-label={`Chiudi dettagli di ${tournament.title}`}
              autoFocus
              onClick={requestClose}
            >
              <FontAwesomeIcon icon={faXmark} aria-hidden="true" />
            </button>
          </header>

          <div className="ns-tournament-detail-dialog__scroll">
            <div
              className="ns-tournament-detail-dialog__date"
              role="group"
              aria-label={`Periodo del torneo: ${tournamentDateLabel(
                tournament.startDate,
                tournament.endDate,
              )}`}
            >
              <FontAwesomeIcon icon={faCalendarDays} aria-hidden="true" />
              <strong>
                {tournamentDateLabel(tournament.startDate, tournament.endDate)}
              </strong>
            </div>

            <div className="ns-tournament-detail-dialog__content">
              <div className="ns-tournament-detail-dialog__headline">
                <h2 id={titleId}>{tournament.title}</h2>
                <p className="ns-visually-hidden" id={descriptionId}>
                  Dettagli, luogo, categorie e iscrizioni del torneo.
                </p>

                {genders.length > 0 || rankLabel || tpraLevel ? (
                  <div className="ns-tournament-card__classification">
                    {genders.length > 0 ? (
                      <ul
                        className="ns-tournament-card__categories"
                        aria-label="Categorie del torneo"
                      >
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

              <section
                className="ns-tournament-detail-dialog__place"
                aria-labelledby={`${titleId}-place`}
              >
                <h3 className="ns-visually-hidden" id={`${titleId}-place`}>
                  Dove si gioca
                </h3>
                <p className="ns-tournament-card__place">
                  <span className="ns-tournament-card__place-icon" aria-hidden="true">
                    <FontAwesomeIcon icon={faLocationDot} />
                  </span>
                  <span className="ns-tournament-card__place-copy">
                    <strong>{tournament.venueName ?? "Circolo non indicato"}</strong>
                    <span>
                      {[tournament.city, tournament.provinceCode]
                        .filter(Boolean)
                        .join(" · ") || "Località non indicata"}
                    </span>
                  </span>
                </p>
              </section>

              <section
                className="ns-tournament-detail-dialog__registrations"
                aria-labelledby={registrationsTitleId}
              >
                <h3 id={registrationsTitleId}>
                  <FontAwesomeIcon icon={faUsers} aria-hidden="true" />
                  Iscritti
                </h3>

                {visibleRegistrationState.status === "loading" ? (
                  <p
                    className="ns-tournament-detail-dialog__registration-status"
                    role="status"
                  >
                    Caricamento delle coppie iscritte…
                  </p>
                ) : null}

                {visibleRegistrationState.status === "error" ? (
                  <div
                    className="ns-tournament-detail-dialog__registration-status ns-tournament-detail-dialog__registration-status--error"
                    role="alert"
                  >
                    <p>
                      Non riusciamo a caricare il numero di coppie iscritte. Riprova
                      oppure verifica sul sito ufficiale.
                    </p>
                    <button
                      className="ns-button ns-button--quiet"
                      type="button"
                      onClick={retryRegistrations}
                    >
                      Riprova
                    </button>
                  </div>
                ) : null}

                {visibleRegistrationState.status === "success" ? (
                  visibleRegistrationState.summary.entries.length > 0 ? (
                    <dl className="ns-tournament-detail-dialog__registration-list">
                      {visibleRegistrationState.summary.entries.map((entry, index) => (
                        <RegistrationEntry
                          key={`${entry.label}-${index}`}
                          entry={entry}
                        />
                      ))}
                    </dl>
                  ) : (
                    <p className="ns-tournament-detail-dialog__registration-status">
                      Il numero di coppie iscritte non è disponibile. Verifica sul sito
                      ufficiale.
                    </p>
                  )
                ) : null}

                {visibleRegistrationState.status === "success" && registrationUpdate ? (
                  <p className="ns-tournament-detail-dialog__registration-update">
                    Aggiornato il{" "}
                    <time dateTime={visibleRegistrationState.summary.fetchedAt}>
                      {registrationUpdate}
                    </time>
                  </p>
                ) : null}
              </section>
            </div>
          </div>

          <footer className="ns-tournament-detail-dialog__footer">
            <div className="ns-tournament-detail-dialog__actions">
              <button
                className="ns-button ns-button--primary"
                type="button"
                onClick={() => void shareTournament()}
              >
                <FontAwesomeIcon
                  className="ns-button__icon"
                  icon={visibleCopyResult?.status === "success" ? faCheck : faShareNodes}
                  aria-hidden="true"
                />
                {visibleCopyResult?.status === "success" ? "Link copiato" : "Condividi"}
              </button>
              <a
                className="ns-button ns-button--secondary ns-tournament-detail-dialog__official-link"
                href={tournament.officialUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Iscriviti a ${tournament.title} sul sito ${sourceLogo.label} (si apre in una nuova scheda)`}
              >
                Iscriviti
                <FontAwesomeIcon
                  className="ns-button__icon"
                  icon={faArrowUpRightFromSquare}
                  aria-hidden="true"
                />
              </a>
            </div>

            {visibleCopyResult?.status === "error" ? (
              <div className="ns-tournament-detail-dialog__share-error" role="alert">
                <label htmlFor={`${titleId}-share-url`}>
                  Copia non riuscita. Seleziona e copia manualmente questo link.
                </label>
                <input
                  className="ns-input"
                  id={`${titleId}-share-url`}
                  value={visibleCopyResult.url}
                  readOnly
                  onFocus={(event) => event.currentTarget.select()}
                />
              </div>
            ) : null}

            <p className="ns-visually-hidden" aria-live="polite" aria-atomic="true">
              {visibleCopyResult?.status === "success"
                ? "Link del torneo copiato negli appunti."
                : ""}
            </p>
          </footer>
        </>
      ) : null}
    </dialog>
  );
}
