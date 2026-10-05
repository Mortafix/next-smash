"use client";

import {
  faBookmark,
  faCircleCheck,
  faTriangleExclamation,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { usePreferencesStoreState } from "@/hooks/use-preferences-store";
import { useSavedTournamentsStoreState } from "@/hooks/use-saved-tournaments-store";
import { TournamentCard } from "@/components/tournaments/tournament-card";
import { TournamentDetailDialog } from "@/components/tournaments/tournament-detail-dialog";
import {
  resetPreferences,
  type SavedSearch,
  type StoredPreferences,
  writePreferences,
} from "@/lib/preferences";
import {
  describeFilters,
  type TournamentWithDistance,
} from "@/lib/tournaments/filters";
import { resetSavedTournaments, resolveSavedTournaments } from "@/lib/saved-tournaments";
import type { Tournament } from "@/lib/tournaments/types";

type Feedback = {
  kind: "success" | "error";
  message: string;
} | null;

type FocusTarget =
  | { kind: "rename" | "use"; searchId: string }
  | { kind: "undo" | "saved-heading" }
  | null;

const storageErrorMessage =
  "Non riesco a salvare su questo dispositivo. Controlla le impostazioni del browser e riprova: nessuna modifica è stata applicata.";

function savedSearchCountLabel(count: number) {
  return count === 1 ? "1 ricerca salvata" : `${count} ricerche salvate`;
}

function FilterSummary({
  search,
  label,
}: {
  search: SavedSearch["filters"];
  label: string;
}) {
  return (
    <ul className="ns-tag-list" aria-label={label}>
      {describeFilters(search).map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export function PreferencesManager({
  currentTournaments = [],
  initialTournamentId = null,
}: {
  currentTournaments?: Tournament[];
  initialTournamentId?: string | null;
}) {
  const router = useRouter();
  const preferencesState = usePreferencesStoreState();
  const preferences = preferencesState.preferences;
  const tournamentsState = useSavedTournamentsStoreState();
  const savedTournaments = resolveSavedTournaments(
    tournamentsState.tournaments,
    currentTournaments,
  );
  const [openedTournament, setOpenedTournament] = useState<TournamentWithDistance | null>(null);
  const [dismissedInitialTournamentId, setDismissedInitialTournamentId] = useState<string | null>(null);
  const [initialTournamentSnapshot, setInitialTournamentSnapshot] = useState<Tournament | null>(null);
  const initialTournament =
    initialTournamentId && initialTournamentId !== dismissedInitialTournamentId
      ? savedTournaments.find((item) => item.id === initialTournamentId) ?? null
      : null;
  if (initialTournament && initialTournamentSnapshot !== initialTournament) {
    setInitialTournamentSnapshot(initialTournament);
  }
  const retainedInitialTournament = initialTournament ??
    (initialTournamentSnapshot?.id === initialTournamentId &&
    initialTournamentId !== dismissedInitialTournamentId ? initialTournamentSnapshot : null);
  const selectedTournament = openedTournament ??
    (retainedInitialTournament ? { ...retainedInitialTournament, distanceKm: null } : null);
  const tournamentTriggerRef = useRef<HTMLAnchorElement | null>(null);
  const savedTournamentsHeadingRef = useRef<HTMLHeadingElement>(null);
  const [tournamentRecoveryError, setTournamentRecoveryError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [renameError, setRenameError] = useState("");
  const [deleted, setDeleted] = useState<{ search: SavedSearch; index: number } | null>(
    null,
  );
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [recoveryError, setRecoveryError] = useState("");
  const [focusTarget, setFocusTarget] = useState<FocusTarget>(null);
  const renameButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const useButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const renameInputRef = useRef<HTMLInputElement>(null);
  const undoButtonRef = useRef<HTMLButtonElement>(null);
  const savedHeadingRef = useRef<HTMLHeadingElement>(null);

  const countLabel = savedSearchCountLabel(preferences.savedSearches.length);
  const storageBlocked =
    preferencesState.status === "corrupt" ||
    preferencesState.status === "unavailable";

  useEffect(() => {
    if (!focusTarget) return;

    const frame = window.requestAnimationFrame(() => {
      const target =
        focusTarget.kind === "rename"
          ? renameButtonRefs.current.get(focusTarget.searchId)
          : focusTarget.kind === "use"
            ? useButtonRefs.current.get(focusTarget.searchId)
            : focusTarget.kind === "undo"
              ? undoButtonRef.current
              : savedHeadingRef.current;

      if (target) {
        target.focus();
        setFocusTarget(null);
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [deleted, editingId, focusTarget, preferences.savedSearches]);

  function commit(next: StoredPreferences, successMessage?: string) {
    setFeedback(null);

    if (storageBlocked) return false;

    if (!writePreferences(next)) {
      setFeedback({ kind: "error", message: storageErrorMessage });
      return false;
    }

    if (successMessage) {
      setFeedback({ kind: "success", message: successMessage });
    }
    return true;
  }

  function openTournament(tournamentId: string, trigger: HTMLAnchorElement) {
    const tournament = savedTournaments.find((item) => item.id === tournamentId);
    if (!tournament) return;
    tournamentTriggerRef.current = trigger;
    setOpenedTournament({ ...tournament, distanceKm: null });
    const url = new URL(window.location.href);
    url.searchParams.set("torneo", tournamentId);
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }

  function closeTournament() {
    setOpenedTournament(null);
    setDismissedInitialTournamentId(initialTournamentId);
    const url = new URL(window.location.href);
    url.searchParams.delete("torneo");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    window.requestAnimationFrame(() => {
      const trigger = tournamentTriggerRef.current;
      if (trigger?.isConnected) trigger.focus();
      else savedTournamentsHeadingRef.current?.focus();
      tournamentTriggerRef.current = null;
    });
  }

  function restoreLocalTournaments() {
    setTournamentRecoveryError("");
    if (!resetSavedTournaments()) setTournamentRecoveryError(storageErrorMessage);
  }

  function restoreLocalPreferences() {
    setFeedback(null);
    setRecoveryError("");

    if (!resetPreferences()) {
      setRecoveryError(storageErrorMessage);
      return;
    }

    setEditingId(null);
    setEditingName("");
    setRenameError("");
    setDeleted(null);
    setFeedback({
      kind: "success",
      message: "I dati delle ricerche sono stati ripristinati ai valori iniziali.",
    });
    setFocusTarget({ kind: "saved-heading" });
  }

  function applyFilters(filters: SavedSearch["filters"]) {
    const next = { ...preferences, lastFilters: filters };
    if (commit(next)) router.push("/tornei");
  }

  function removeSearch(search: SavedSearch, index: number) {
    const next = {
      ...preferences,
      savedSearches: preferences.savedSearches.filter((item) => item.id !== search.id),
    };

    if (!commit(next)) return;

    setDeleted({ search, index });
    setFocusTarget({ kind: "undo" });
  }

  function undoDelete() {
    if (!deleted) return;

    const savedSearches = [...preferences.savedSearches];
    savedSearches.splice(deleted.index, 0, deleted.search);

    if (
      !commit(
        { ...preferences, savedSearches },
        `Ricerca «${deleted.search.name}» ripristinata.`,
      )
    ) {
      undoButtonRef.current?.focus();
      return;
    }

    const restoredId = deleted.search.id;
    setDeleted(null);
    setFocusTarget({ kind: "use", searchId: restoredId });
  }

  function dismissDelete() {
    if (!deleted) return;

    const nextSearch =
      preferences.savedSearches[deleted.index] ??
      preferences.savedSearches[deleted.index - 1];

    setDeleted(null);
    setFocusTarget(
      nextSearch
        ? { kind: "use", searchId: nextSearch.id }
        : { kind: "saved-heading" },
    );
  }

  function startRename(search: SavedSearch) {
    setFeedback(null);
    setRenameError("");
    setEditingId(search.id);
    setEditingName(search.name);
  }

  function cancelRename(searchId: string) {
    setRenameError("");
    setEditingId(null);
    setEditingName("");
    setFocusTarget({ kind: "rename", searchId });
  }

  function renameSearch(search: SavedSearch) {
    const name = editingName.trim();

    if (!name) {
      setRenameError("Inserisci almeno un carattere per il nome della ricerca.");
      renameInputRef.current?.focus();
      return;
    }

    if (name === search.name) {
      cancelRename(search.id);
      return;
    }

    const next = {
      ...preferences,
      savedSearches: preferences.savedSearches.map((item) =>
        item.id === search.id ? { ...item, name } : item,
      ),
    };

    if (!commit(next, `Ricerca rinominata «${name}».`)) {
      renameInputRef.current?.focus();
      return;
    }

    setRenameError("");
    setEditingId(null);
    setEditingName("");
    setFocusTarget({ kind: "rename", searchId: search.id });
  }

  return (
    <div className="ns-page-stack ns-preferences">
      <header>
        <h1>Profilo</h1>
        <p className="ns-preferences__intro">
          I tuoi tornei e le tue ricerche restano salvati in questo browser.
        </p>
      </header>

      {preferencesState.status === "corrupt" ? (
        <div
          className="ns-preferences__feedback ns-preferences__feedback--error"
          role="alert"
          aria-atomic="true"
        >
          <FontAwesomeIcon icon={faTriangleExclamation} aria-hidden="true" />
          <span>
            <strong>Ricerche salvate da ripristinare</strong>
            <span>
              Le ricerche salvate non sono leggibili. Per evitare di sovrascriverle,
              le modifiche restano bloccate finché non scegli di ripristinare i
              dati locali.
            </span>
            <span className="ns-action-row">
              <button
                className="ns-button ns-button--quiet"
                type="button"
                onClick={restoreLocalPreferences}
              >
                Ripristina ricerche salvate
              </button>
            </span>
            {recoveryError ? <span>{recoveryError}</span> : null}
          </span>
        </div>
      ) : preferencesState.status === "unavailable" ? (
        <div
          className="ns-preferences__feedback ns-preferences__feedback--error"
          role="alert"
          aria-atomic="true"
        >
          <FontAwesomeIcon icon={faTriangleExclamation} aria-hidden="true" />
          <span>
            <strong>Archiviazione locale non disponibile</strong>
            <span>
              Abilita l’archiviazione locale nelle impostazioni del browser, poi
              ricarica la pagina. Finché resta disattivata, le ricerche non
              possono essere lette o salvate.
            </span>
          </span>
        </div>
      ) : null}

      {feedback ? (
        <div
          className={`ns-preferences__feedback ns-preferences__feedback--${feedback.kind}`}
          role={feedback.kind === "error" ? "alert" : "status"}
          aria-atomic="true"
        >
          <FontAwesomeIcon
            icon={feedback.kind === "error" ? faTriangleExclamation : faCircleCheck}
            aria-hidden="true"
          />
          <span>
            <strong>
              {feedback.kind === "error"
                ? "Salvataggio non riuscito"
                : "Ricerche aggiornate"}
            </strong>
            <span>{feedback.message}</span>
          </span>
        </div>
      ) : null}

      <section aria-labelledby="saved-tournaments-heading">
        <div className="ns-saved-heading">
          <h2 id="saved-tournaments-heading" ref={savedTournamentsHeadingRef} tabIndex={-1}>
            Tornei salvati
          </h2>
          <span
            className="ns-preferences__saved-count"
            aria-label={savedTournaments.length === 1 ? "1 torneo salvato" : `${savedTournaments.length} tornei salvati`}
          >
            {savedTournaments.length}
          </span>
        </div>

        {tournamentsState.status === "corrupt" ? (
          <div className="ns-preferences__feedback ns-preferences__feedback--error" role="alert">
            <FontAwesomeIcon icon={faTriangleExclamation} aria-hidden="true" />
            <span>
              <strong>Tornei salvati da ripristinare</strong>
              <span>I tornei salvati non sono leggibili. Ripristina questa raccolta per ricominciare a salvare tornei; le ricerche salvate restano disponibili.</span>
              <span className="ns-action-row">
                <button className="ns-button ns-button--quiet" type="button" onClick={restoreLocalTournaments}>
                  Ripristina tornei salvati
                </button>
              </span>
              {tournamentRecoveryError ? <span>{tournamentRecoveryError}</span> : null}
            </span>
          </div>
        ) : tournamentsState.status === "unavailable" ? (
          <div className="ns-preferences__feedback ns-preferences__feedback--error" role="alert">
            <FontAwesomeIcon icon={faTriangleExclamation} aria-hidden="true" />
            <span>
              <strong>Tornei salvati non disponibili</strong>
              <span>Abilita l’archiviazione locale nelle impostazioni del browser, poi ricarica la pagina per ritrovare i tornei salvati.</span>
            </span>
          </div>
        ) : savedTournaments.length === 0 ? (
          <div className="ns-empty-state">
            <FontAwesomeIcon className="ns-preferences__empty-icon" icon={faBookmark} aria-hidden="true" />
            <h3>Nessun torneo salvato</h3>
            <p>Apri i dettagli di un torneo e scegli “Salva” per ritrovarlo qui.</p>
            <button className="ns-button ns-button--primary" type="button" onClick={() => router.push("/tornei")}>
              Trova un torneo
            </button>
          </div>
        ) : (
          <div className="ns-tournament-list">
            {savedTournaments.map((tournament) => (
              <TournamentCard
                key={tournament.id}
                tournament={{ ...tournament, distanceKm: null }}
                detailsHref={`/profilo?torneo=${encodeURIComponent(tournament.id)}`}
                onOpenDetails={openTournament}
              />
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="saved-heading">
        <div className="ns-saved-heading">
          <h2 id="saved-heading" ref={savedHeadingRef} tabIndex={-1}>
            Ricerche salvate
          </h2>
          <span className="ns-preferences__saved-count" aria-label={countLabel}>
            {preferences.savedSearches.length}
          </span>
        </div>

        {preferences.savedSearches.length === 0 ? (
          <div className="ns-empty-state">
            <FontAwesomeIcon
              className="ns-preferences__empty-icon"
              icon={faBookmark}
              aria-hidden="true"
            />
            <h3>Nessuna ricerca salvata</h3>
            <p>
              Filtra l’elenco e scegli “Salva ricerca” per ritrovarla qui in un
              attimo.
            </p>
            <button
              className="ns-button ns-button--primary"
              type="button"
              onClick={() => router.push("/tornei")}
            >
              Crea la prima ricerca
            </button>
          </div>
        ) : (
          <ul className="ns-saved-list">
            {preferences.savedSearches.map((search, index) => (
              <li key={search.id}>
                <article className="ns-saved-card">
                  {editingId === search.id ? (
                    <form
                      className="ns-rename-form"
                      onSubmit={(event) => {
                        event.preventDefault();
                        renameSearch(search);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Escape") {
                          event.preventDefault();
                          cancelRename(search.id);
                        }
                      }}
                    >
                      <label className="ns-field">
                        <span className="ns-field-label">Nome ricerca</span>
                        <input
                          ref={renameInputRef}
                          className="ns-input"
                          value={editingName}
                          onChange={(event) => {
                            setEditingName(event.target.value);
                            if (renameError) setRenameError("");
                          }}
                          aria-invalid={renameError ? "true" : undefined}
                          aria-describedby={renameError ? "rename-error" : undefined}
                          maxLength={60}
                          autoFocus
                        />
                      </label>
                      {renameError ? (
                        <p className="ns-preferences__field-error" id="rename-error">
                          {renameError}
                        </p>
                      ) : null}
                      <div className="ns-action-row">
                        <button className="ns-button ns-button--primary" type="submit">
                          Salva nome
                        </button>
                        <button
                          className="ns-button ns-button--quiet"
                          type="button"
                          onClick={() => cancelRename(search.id)}
                        >
                          Annulla
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <h3>{search.name}</h3>
                      <FilterSummary
                        search={search.filters}
                        label={`Filtri della ricerca «${search.name}»`}
                      />
                      <div className="ns-action-row">
                        <button
                          ref={(node) => {
                            if (node) useButtonRefs.current.set(search.id, node);
                            else useButtonRefs.current.delete(search.id);
                          }}
                          className="ns-button ns-button--primary"
                          type="button"
                          aria-label={`Usa la ricerca «${search.name}»`}
                          disabled={storageBlocked}
                          onClick={() => applyFilters(search.filters)}
                        >
                          Usa questa ricerca
                        </button>
                        <button
                          ref={(node) => {
                            if (node) renameButtonRefs.current.set(search.id, node);
                            else renameButtonRefs.current.delete(search.id);
                          }}
                          className="ns-button ns-button--quiet"
                          type="button"
                          aria-label={`Rinomina la ricerca «${search.name}»`}
                          disabled={storageBlocked}
                          onClick={() => startRename(search)}
                        >
                          Rinomina
                        </button>
                        <button
                          className="ns-button ns-button--danger"
                          type="button"
                          disabled={deleted !== null || storageBlocked}
                          aria-label={`Elimina la ricerca «${search.name}»`}
                          onClick={() => removeSearch(search, index)}
                        >
                          Elimina
                        </button>
                      </div>
                    </>
                  )}
                </article>
              </li>
            ))}
          </ul>
        )}
      </section>

      {deleted ? (
        <div className="ns-toast ns-preferences__toast">
          <span className="ns-toast__message" role="status" aria-live="polite">
            <strong>Ricerca eliminata</strong>
            <span>«{deleted.search.name}» è stata rimossa.</span>
          </span>
          <span className="ns-toast__actions">
            <button
              ref={undoButtonRef}
              className="ns-preferences__undo-button"
              type="button"
              aria-label={`Annulla eliminazione di «${deleted.search.name}»`}
              onClick={undoDelete}
            >
              Annulla
            </button>
            <button type="button" aria-label="Chiudi notifica" onClick={dismissDelete}>
              <FontAwesomeIcon icon={faXmark} aria-hidden="true" />
            </button>
          </span>
        </div>
      ) : null}
      <TournamentDetailDialog tournament={selectedTournament} onClose={closeTournament} />
    </div>
  );
}
