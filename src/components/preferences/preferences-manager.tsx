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
import {
  resetPreferences,
  type SavedSearch,
  type StoredPreferences,
  writePreferences,
} from "@/lib/preferences";
import {
  defaultTournamentFilters,
  describeFilters,
} from "@/lib/tournaments/filters";

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

function filtersMatch(
  first: SavedSearch["filters"],
  second: SavedSearch["filters"],
) {
  return JSON.stringify(first) === JSON.stringify(second);
}

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

export function PreferencesManager() {
  const router = useRouter();
  const preferencesState = usePreferencesStoreState();
  const preferences = preferencesState.preferences;
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

  const lastMatchesBase = filtersMatch(preferences.lastFilters, preferences.defaults);
  const baseIsClear = filtersMatch(preferences.defaults, defaultTournamentFilters);
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
      message: "I dati locali sono stati ripristinati ai valori iniziali.",
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
        <h1>Le mie ricerche</h1>
        <p className="ns-preferences__intro">
          Senza account: le ricerche e le basi salvate restano solo su questo
          dispositivo.
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
            <strong>Dati locali da ripristinare</strong>
            <span>
              Il contenuto salvato non è leggibile. Per evitare di sovrascriverlo,
              le modifiche restano bloccate finché non scegli di ripristinare i
              dati locali.
            </span>
            <span className="ns-action-row">
              <button
                className="ns-button ns-button--quiet"
                type="button"
                onClick={restoreLocalPreferences}
              >
                Ripristina dati locali
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
              ricarica la pagina. Finché resta disattivata, le preferenze non
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
                : "Preferenze aggiornate"}
            </strong>
            <span>{feedback.message}</span>
          </span>
        </div>
      ) : null}

      <section className="ns-preference-section" aria-labelledby="defaults-heading">
        <div className="ns-section-heading">
          <h2 id="defaults-heading">Filtri di partenza</h2>
        </div>
        <div className="ns-preference-section__body">
          <p>
            Salva una base e riaprila nell’elenco quando vuoi tornare alla tua
            ricerca abituale.
          </p>

          <div className="ns-preferences__filter-board">
            <div className="ns-preferences__filter-slot ns-preferences__filter-slot--base">
              <h3 className="ns-preferences__filter-label">Base salvata</h3>
              <FilterSummary
                search={preferences.defaults}
                label="Riepilogo della base salvata"
              />
              <button
                className="ns-button ns-button--secondary ns-preferences__slot-action"
                type="button"
                disabled={storageBlocked}
                onClick={() => applyFilters(preferences.defaults)}
              >
                Apri questa base
              </button>
            </div>

            <div className="ns-preferences__filter-slot ns-preferences__filter-slot--recent">
              <h3 className="ns-preferences__filter-label">Ultimi filtri usati</h3>
              <FilterSummary
                search={preferences.lastFilters}
                label="Riepilogo degli ultimi filtri usati"
              />
              <p className="ns-preferences__filter-state" id="recent-filter-state">
                {lastMatchesBase
                  ? "Coincidono già con la base salvata."
                  : "Sono diversi dalla base salvata."}
              </p>
              <button
                className="ns-button ns-button--primary ns-preferences__slot-action"
                type="button"
                disabled={lastMatchesBase || storageBlocked}
                aria-describedby="recent-filter-state"
                onClick={() =>
                  commit(
                    { ...preferences, defaults: preferences.lastFilters },
                    "Gli ultimi filtri sono ora la tua base salvata.",
                  )
                }
              >
                Salva gli ultimi come base
              </button>
            </div>
          </div>

          <div className="ns-preferences__utility-row">
            <p id="reset-filter-state">
              La base iniziale mostra tutti i tornei, senza filtri.
            </p>
            <button
              className="ns-button ns-button--quiet"
              type="button"
              disabled={baseIsClear || storageBlocked}
              aria-describedby="reset-filter-state"
              onClick={() =>
                commit(
                  { ...preferences, defaults: { ...defaultTournamentFilters } },
                  "La base è stata ripristinata su tutti i tornei.",
                )
              }
            >
              Ripristina tutti i tornei
            </button>
          </div>
        </div>
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
                          onClick={() => startRename(search)}
                        >
                          Rinomina
                        </button>
                        <button
                          className="ns-button ns-button--danger"
                          type="button"
                          disabled={deleted !== null}
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
    </div>
  );
}
