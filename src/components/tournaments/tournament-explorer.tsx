"use client";

import {
  faArrowDown,
  faCalendarDays,
  faCheck,
  faLocationArrow,
  faMagnifyingGlass,
  faSliders,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  type Dispatch,
  type SetStateAction,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { ActiveFilterChips } from "@/components/tournaments/active-filter-chips";
import { FilterPanel } from "@/components/tournaments/filter-panel";
import { FreshnessBanner } from "@/components/tournaments/freshness-banner";
import { TournamentCard } from "@/components/tournaments/tournament-card";
import { TournamentDetailDialog } from "@/components/tournaments/tournament-detail-dialog";
import { useCurrentPositionController } from "@/components/tournaments/use-current-position";
import { useTournamentFilters } from "@/components/tournaments/use-tournament-filters";
import {
  newSavedSearch,
  readPreferences,
  writePreferences,
} from "@/lib/preferences";
import {
  activeFilterCount,
  defaultTournamentFilters,
  describeFilters,
  distanceInKilometres,
  filterTournaments,
  type TournamentFilters,
  type TournamentWithDistance,
} from "@/lib/tournaments/filters";
import type { Tournament, TournamentSnapshot } from "@/lib/tournaments/types";

type TournamentExplorerProps = {
  snapshot: TournamentSnapshot;
  initialTournament?: Tournament | null;
};

const pageSize = 24;

export function TournamentExplorer({
  snapshot,
  initialTournament = null,
}: TournamentExplorerProps) {
  const searchParams = useSearchParams();
  const selectedTournamentId = searchParams.get("torneo");
  const {
    filters: persistedFilters,
    setFilters: setPersistedFilters,
  } = useTournamentFilters();
  const [deepLinkFilters, setDeepLinkFilters] = useState<TournamentFilters | null>(
    () =>
      selectedTournamentId
        ? { ...defaultTournamentFilters }
        : null,
  );
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const [saveName, setSaveName] = useState("");
  const [saveError, setSaveError] = useState("");
  const [savedSearchName, setSavedSearchName] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const saveDialog = useRef<HTMLDialogElement>(null);
  const distanceRequestId = useRef(0);
  const tournamentTrigger = useRef<HTMLAnchorElement | null>(null);
  const locallyOpenedTournament = useRef(false);
  const tournamentClosePending = useRef(false);
  const tournamentWasOpen = useRef(false);
  const locationController = useCurrentPositionController();
  const filters = deepLinkFilters ?? persistedFilters;

  const setFilters: Dispatch<SetStateAction<TournamentFilters>> = (action) => {
    if (deepLinkFilters !== null) {
      const next =
        typeof action === "function" ? action(deepLinkFilters) : action;
      setDeepLinkFilters(null);
      setPersistedFilters(next);
      return;
    }

    setPersistedFilters(action);
  };

  const regions = useMemo(
    () =>
      [...new Set(snapshot.tournaments.map((item) => item.region).filter(Boolean))]
        .filter((region): region is string => typeof region === "string")
        .sort((left, right) => left.localeCompare(right, "it")),
    [snapshot.tournaments],
  );
  const provinces = useMemo(() => {
    const values = new Map<string, { value: string; label: string; region: string }>();
    for (const tournament of snapshot.tournaments) {
      if (!tournament.provinceCode) continue;
      values.set(tournament.provinceCode, {
        value: tournament.provinceCode,
        label: tournament.province
          ? `${tournament.province} (${tournament.provinceCode})`
          : tournament.provinceCode,
        region: tournament.region ?? "",
      });
    }
    return [...values.values()].sort((left, right) =>
      left.label.localeCompare(right.label, "it"),
    );
  }, [snapshot.tournaments]);
  const filtered = useMemo(
    () => filterTournaments(snapshot.tournaments, filters),
    [filters, snapshot.tournaments],
  );
  const selectedTournament = useMemo<TournamentWithDistance | null>(() => {
    if (!selectedTournamentId) return null;

    const tournament =
      snapshot.tournaments.find((item) => item.id === selectedTournamentId) ??
      (initialTournament?.id === selectedTournamentId
        ? initialTournament
        : null);
    if (!tournament) return null;

    const distanceKm =
      filters.origin &&
      tournament.latitude !== null &&
      tournament.longitude !== null
        ? distanceInKilometres(filters.origin, {
            latitude: tournament.latitude,
            longitude: tournament.longitude,
          })
        : null;

    return { ...tournament, distanceKm };
  }, [filters.origin, initialTournament, selectedTournamentId, snapshot.tournaments]);
  const filterCount = activeFilterCount(filters);

  useEffect(() => {
    tournamentClosePending.current = false;

    if (selectedTournament) {
      tournamentWasOpen.current = true;
      return;
    }

    if (selectedTournamentId || !tournamentWasOpen.current) return;
    tournamentWasOpen.current = false;

    const frame = window.requestAnimationFrame(() => {
      if (tournamentTrigger.current?.isConnected) {
        tournamentTrigger.current.focus();
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [selectedTournament, selectedTournamentId]);

  function openTournamentDetails(
    tournamentId: string,
    trigger: HTMLAnchorElement,
  ) {
    const params = new URLSearchParams();
    params.set("torneo", tournamentId);
    tournamentTrigger.current = trigger;
    locallyOpenedTournament.current = true;
    tournamentClosePending.current = false;
    window.history.pushState(null, "", `/tornei?${params.toString()}`);
  }

  function closeTournamentDetails() {
    if (!selectedTournamentId || tournamentClosePending.current) return;
    tournamentClosePending.current = true;

    if (locallyOpenedTournament.current) {
      window.history.back();
      return;
    }

    window.history.replaceState(null, "", "/tornei");
  }

  function saveSearch() {
    const name = saveName.trim();
    if (!name) return;
    const preferences = readPreferences();
    const savedSearch = newSavedSearch(name, filters);
    const saved = writePreferences({
      ...preferences,
      savedSearches: [...preferences.savedSearches, savedSearch],
    });
    if (!saved) {
      setSaveError(
        "Non siamo riusciti a salvare la ricerca in questo browser. Libera spazio o controlla le impostazioni di privacy, poi riprova.",
      );
      return;
    }
    setAnnouncement(`Ricerca «${name}» salvata.`);
    setSavedSearchName(name);
    setSaveError("");
    setSaveName("");
    saveDialog.current?.close();
  }

  function openSaveDialog() {
    setSaveError("");
    saveDialog.current?.showModal();
  }

  function selectDateSort() {
    distanceRequestId.current += 1;
    setFilters((current) => ({ ...current, sort: "date" }));
  }

  async function selectDistanceSort() {
    const requestId = distanceRequestId.current + 1;
    distanceRequestId.current = requestId;

    if (filters.origin) {
      setFilters((current) => ({ ...current, sort: "distance" }));
      return;
    }

    const origin = await locationController.request("sort");
    if (distanceRequestId.current !== requestId) return;
    if (!origin) return;

    setFilters((current) => ({ ...current, origin, sort: "distance" }));
  }

  return (
    <div className="ns-page-stack ns-page-stack--explorer">
      <header className="ns-page-heading ns-page-heading--explorer">
        <div>
          <h1>Tornei in programma</h1>
          <p>
            Trova il prossimo torneo FITP o TPRA per data, livello e distanza.
          </p>
        </div>
      </header>

      <div className="ns-search-bar">
        <label className="ns-field ns-search-field">
          <span className="ns-field-label ns-search-label">
            Cerca torneo, circolo o città
          </span>
          <span className="ns-search-control">
            <FontAwesomeIcon icon={faMagnifyingGlass} aria-hidden="true" />
            <input
              className="ns-input ns-input--search"
              type="search"
              value={filters.query}
              onChange={(event) =>
                setFilters((current) => ({ ...current, query: event.target.value }))
              }
              placeholder="Es. Roma o weekend expert"
            />
          </span>
        </label>
      </div>

      {filterCount > 0 ? (
        <ActiveFilterChips
          filters={filters}
          onChange={setFilters}
          onSave={openSaveDialog}
        />
      ) : null}

      <div className="ns-explorer-layout">
        <FilterPanel
          filters={filters}
          locationController={locationController}
          onChange={setFilters}
          regions={regions}
          provinces={provinces}
        />

        <section className="ns-results" aria-labelledby="results-heading">
          <FreshnessBanner
            lastSuccessfulSync={snapshot.lastSuccessfulSync}
            setupRequired={snapshot.setupRequired}
            stale={snapshot.stale}
          />
          <div className="ns-results-toolbar">
            <div className="ns-results-summary">
              <h2 id="results-heading">Prossimi match</h2>
              <p aria-live="polite">
                <strong>{filtered.length}</strong>{" "}
                {filtered.length === 1 ? "torneo trovato" : "tornei trovati"}
              </p>
            </div>
            <div className="ns-results-actions">
              <fieldset className="ns-sort-control">
                <legend className="ns-visually-hidden">Ordina i tornei</legend>
                <div className="ns-sort-options">
                  <label
                    className="ns-choice-chip ns-sort-option"
                    data-selected={filters.sort === "date" || undefined}
                  >
                    <input
                      className="ns-visually-hidden"
                      type="radio"
                      name="tournament-sort"
                      value="date"
                      checked={filters.sort === "date"}
                      onChange={selectDateSort}
                    />
                    <FontAwesomeIcon icon={faCalendarDays} aria-hidden="true" />
                    <span className="ns-sort-option__label">Data</span>
                    {filters.sort === "date" ? (
                      <FontAwesomeIcon
                        className="ns-choice-chip__check ns-sort-option__check"
                        icon={faCheck}
                        aria-hidden="true"
                      />
                    ) : null}
                  </label>

                  <label
                    className="ns-choice-chip ns-sort-option"
                    data-selected={filters.sort === "distance" || undefined}
                    data-loading={
                      locationController.status === "loading" &&
                      locationController.requestSource === "sort"
                        ? ""
                        : undefined
                    }
                    aria-busy={
                      locationController.status === "loading" &&
                      locationController.requestSource === "sort"
                    }
                  >
                    <input
                      className="ns-visually-hidden"
                      type="radio"
                      name="tournament-sort"
                      value="distance"
                      checked={filters.sort === "distance"}
                      disabled={locationController.status === "loading"}
                      onChange={() => void selectDistanceSort()}
                    />
                    <FontAwesomeIcon icon={faLocationArrow} aria-hidden="true" />
                    <span className="ns-sort-option__label">Distanza</span>
                    {filters.sort === "distance" ? (
                      <FontAwesomeIcon
                        className="ns-choice-chip__check ns-sort-option__check"
                        icon={faCheck}
                        aria-hidden="true"
                      />
                    ) : null}
                  </label>
                </div>
                {locationController.status === "loading" &&
                locationController.requestSource === "sort" ? (
                  <span className="ns-visually-hidden" role="status">
                    Ricerca della posizione in corso.
                  </span>
                ) : null}
              </fieldset>
            </div>
          </div>

          {locationController.status === "error" &&
          locationController.requestSource === "sort" ? (
            <p className="ns-sort-error" role="alert">
              {locationController.message}
            </p>
          ) : null}

          {filtered.length > 0 ? (
            <>
              <div className="ns-tournament-list">
                {filtered.slice(0, visibleCount).map((tournament) => (
                  <TournamentCard
                    key={tournament.id}
                    tournament={tournament}
                    onOpenDetails={openTournamentDetails}
                  />
                ))}
              </div>
              {visibleCount < filtered.length ? (
                <button
                  className="ns-button ns-button--secondary ns-load-more"
                  type="button"
                  onClick={() => setVisibleCount((count) => count + pageSize)}
                >
                  <FontAwesomeIcon
                    className="ns-button__icon"
                    icon={faArrowDown}
                    aria-hidden="true"
                  />
                  Mostra altri {Math.min(pageSize, filtered.length - visibleCount)} tornei
                </button>
              ) : null}
            </>
          ) : (
            <div className="ns-empty-state">
              <span aria-hidden="true">
                <FontAwesomeIcon icon={faMagnifyingGlass} />
              </span>
              <h2>Nessun torneo trovato</h2>
              <p>
                Prova ad ampliare il periodo o la zona, oppure azzera uno dei filtri.
              </p>
              {filterCount > 0 ? (
                <p className="ns-empty-state__hint">
                  Rimuovi i filtri dai chip in alto per ampliare i risultati.
                </p>
              ) : null}
            </div>
          )}
        </section>
      </div>

      <TournamentDetailDialog
        tournament={selectedTournament}
        onClose={closeTournamentDetails}
      />

      <dialog
        className="ns-dialog"
        ref={saveDialog}
        aria-labelledby="save-search-title"
        onClose={() => setSaveError("")}
      >
        <form
          method="dialog"
          onSubmit={(event) => {
            event.preventDefault();
            saveSearch();
          }}
        >
          <div className="ns-dialog__heading">
            <div>
              <h2 id="save-search-title">Salva questa ricerca</h2>
              <p className="ns-dialog__hint">Resta solo su questo dispositivo.</p>
            </div>
            <button
              className="ns-icon-button"
              type="button"
              aria-label="Chiudi"
              onClick={() => saveDialog.current?.close()}
            >
              <FontAwesomeIcon icon={faXmark} aria-hidden="true" />
            </button>
          </div>
          <label className="ns-field">
            <span className="ns-field-label">Nome ricerca</span>
            <input
              className="ns-input"
              value={saveName}
              onChange={(event) => setSaveName(event.target.value)}
              placeholder="Weekend Lombardia"
              autoFocus
              required
              maxLength={60}
            />
          </label>
          <div className="ns-dialog__summary">
            <span className="ns-dialog__summary-icon" aria-hidden="true">
              <FontAwesomeIcon icon={faSliders} />
            </span>
            <span className="ns-dialog__summary-copy">
              <strong>Filtri da salvare</strong>
              <span>{describeFilters(filters).join(" · ")}</span>
            </span>
          </div>
          {saveError ? (
            <p className="ns-field-message ns-field-message--error" role="alert">
              {saveError}
            </p>
          ) : null}
          <div className="ns-dialog__actions">
            <button
              className="ns-button ns-button--quiet"
              type="button"
              onClick={() => saveDialog.current?.close()}
            >
              Annulla
            </button>
            <button
              className="ns-button ns-button--primary"
              type="submit"
              disabled={!saveName.trim()}
            >
              Salva
            </button>
          </div>
        </form>
      </dialog>
      <p className="ns-visually-hidden" aria-live="polite">
        {announcement}
      </p>
      {savedSearchName ? (
        <div className="ns-toast" role="status">
          <span className="ns-toast__message">
            <strong>Ricerca salvata</strong>
            <span>«{savedSearchName}» è pronta nelle Preferenze.</span>
          </span>
          <span className="ns-toast__actions">
            <Link href="/preferenze" onClick={() => setSavedSearchName("")}>
              Vai alle Preferenze
            </Link>
            <button
              type="button"
              aria-label="Chiudi notifica"
              onClick={() => setSavedSearchName("")}
            >
              <FontAwesomeIcon icon={faXmark} aria-hidden="true" />
            </button>
          </span>
        </div>
      ) : null}
    </div>
  );
}
