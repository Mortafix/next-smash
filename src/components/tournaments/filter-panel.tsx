"use client";

import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faBookmark,
  faCalendarWeek,
  faCheck,
  faChevronDown,
  faMarsDouble,
  faSliders,
  faUsers,
  faVenusDouble,
  faVenusMars,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import { type Dispatch, type SetStateAction, useId, useState } from "react";

import { LocationControl } from "@/components/tournaments/location-control";
import { ItalianDateInput } from "@/components/tournaments/italian-date-input";
import type { CurrentPositionController } from "@/components/tournaments/use-current-position";
import { usePreferencesStore } from "@/hooks/use-preferences-store";
import {
  activeFilterCount,
  activeTournamentFilters,
  weekendRange,
  type TournamentFilters,
} from "@/lib/tournaments/filters";

type ZoneOption = { value: string; label: string; region: string };

type FilterPanelProps = {
  filters: TournamentFilters;
  locationController?: CurrentPositionController;
  onChange: Dispatch<SetStateAction<TournamentFilters>>;
  regions: string[];
  provinces: ZoneOption[];
};

type ChoiceOption<Value extends string> = {
  value: Value;
  label: string;
  icon?: IconDefinition;
};

type ChoiceGroupProps<Value extends string> = {
  label: string;
  name: string;
  value: Value;
  options: ChoiceOption<Value>[];
  onChange: (value: Value) => void;
};

function ChoiceGroup<Value extends string>({
  label,
  name,
  value,
  options,
  onChange,
}: ChoiceGroupProps<Value>) {
  return (
    <fieldset className="ns-choice-group">
      <legend className="ns-field-label">{label}</legend>
      <div className="ns-choice-chips">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <label
              className="ns-choice-chip"
              data-selected={selected || undefined}
              key={option.value}
            >
              <input
                className="ns-visually-hidden"
                type="radio"
                name={name}
                value={option.value}
                checked={selected}
                onChange={() => onChange(option.value)}
              />
              {option.icon ? (
                <FontAwesomeIcon icon={option.icon} aria-hidden="true" />
              ) : null}
              <span>{option.label}</span>
              {selected ? (
                <FontAwesomeIcon
                  className="ns-choice-chip__check"
                  icon={faCheck}
                  aria-hidden="true"
                />
              ) : null}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function ExpanderBadge({
  count,
  label,
  accessibleLabel,
}: {
  count: number;
  label: string;
  accessibleLabel: string;
}) {
  return (
    <span
      className="ns-expander-badge"
      data-empty={count === 0 || undefined}
      aria-label={accessibleLabel}
    >
      <strong aria-hidden="true">{count}</strong>
      <span aria-hidden="true">{label}</span>
    </span>
  );
}

function savedFilterSummary(filters: TournamentFilters) {
  const labels = activeTournamentFilters(filters).map(({ label }) => label);
  if (labels.length === 0) return "Tutti i tornei";
  const visible = labels.slice(0, 2).join(" · ");
  return labels.length > 2 ? `${visible} · +${labels.length - 2}` : visible;
}

export function FilterPanel({
  filters,
  locationController,
  onChange,
  regions,
  provinces,
}: FilterPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [savedExpanded, setSavedExpanded] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const contentId = useId();
  const savedContentId = useId();
  const categoryTitleId = useId();
  const fieldNamePrefix = useId();
  const preferences = usePreferencesStore();
  const count = activeFilterCount(filters);
  const visibleProvinces = filters.region
    ? provinces.filter((province) => province.region === filters.region)
    : [];
  const weekend = weekendRange();
  const weekendSelected =
    filters.dateFrom === weekend.dateFrom && filters.dateTo === weekend.dateTo;

  function patch(values: Partial<TournamentFilters>) {
    onChange((current) => ({ ...current, ...values }));
  }

  function applySavedFilters(name: string, savedFilters: TournamentFilters) {
    onChange({
      ...savedFilters,
      provinceCode: savedFilters.region ? savedFilters.provinceCode : "",
    });
    setAnnouncement(`Filtri «${name}» attivati.`);
    setSavedExpanded(false);
  }

  return (
    <aside className="ns-filter-sidebar" aria-label="Strumenti di filtro">
      <section
        className="ns-filter-expander ns-filters"
        data-expanded={expanded || undefined}
      >
        <h2 className="ns-filter-expander__heading">
          <button
            className="ns-filter-expander__toggle"
            type="button"
            aria-expanded={expanded}
            aria-controls={contentId}
            onClick={() => setExpanded((current) => !current)}
          >
            <span className="ns-filter-expander__label">
              <FontAwesomeIcon icon={faSliders} aria-hidden="true" />
              <span>Filtri</span>
            </span>
            <span className="ns-filter-expander__meta">
              <ExpanderBadge
                count={count}
                label="attivi"
                accessibleLabel={`${count} ${count === 1 ? "filtro attivo" : "filtri attivi"}`}
              />
              <FontAwesomeIcon
                className="ns-filter-expander__chevron"
                icon={faChevronDown}
                aria-hidden="true"
              />
            </span>
          </button>
        </h2>

        <div className="ns-filter-expander__content" id={contentId} hidden={!expanded}>
          <div className="ns-filter-fields">
            <fieldset className="ns-filter-group">
              <legend>Quando</legend>
              <label
                className="ns-choice-chip ns-choice-chip--standalone"
                data-selected={weekendSelected || undefined}
              >
                <input
                  className="ns-visually-hidden"
                  type="checkbox"
                  checked={weekendSelected}
                  onChange={() =>
                    patch(
                      weekendSelected
                        ? { dateFrom: "", dateTo: "" }
                        : weekend,
                    )
                  }
                />
                <FontAwesomeIcon icon={faCalendarWeek} aria-hidden="true" />
                <span>Questo weekend</span>
                {weekendSelected ? (
                  <FontAwesomeIcon
                    className="ns-choice-chip__check"
                    icon={faCheck}
                    aria-hidden="true"
                  />
                ) : null}
              </label>

              <div className="ns-field-grid ns-field-grid--dates">
                <ItalianDateInput
                  label="Dal"
                  value={filters.dateFrom}
                  max={filters.dateTo || undefined}
                  onChange={(dateFrom) => patch({ dateFrom })}
                />
                <ItalianDateInput
                  label="Al"
                  value={filters.dateTo}
                  min={filters.dateFrom || undefined}
                  onChange={(dateTo) => patch({ dateTo })}
                />
              </div>
            </fieldset>

            <section
              className="ns-filter-group ns-filter-group--choices"
              aria-labelledby={categoryTitleId}
            >
              <h3 className="ns-filter-group__title" id={categoryTitleId}>
                Categoria
              </h3>
              <ChoiceGroup
                label="Circuito"
                name={`${fieldNamePrefix}-source`}
                value={filters.source}
                options={[
                  { value: "all", label: "Tutti" },
                  { value: "fitp", label: "FITP" },
                  { value: "tpra", label: "TPRA" },
                ]}
                onChange={(source) =>
                  patch({ source, rankCategory: "all", tpraLevel: "all" })
                }
              />

              <ChoiceGroup
                label="Tipologia"
                name={`${fieldNamePrefix}-gender`}
                value={filters.gender}
                options={[
                  { value: "all", label: "Tutte", icon: faUsers },
                  { value: "male", label: "Maschile", icon: faMarsDouble },
                  { value: "female", label: "Femminile", icon: faVenusDouble },
                  { value: "mixed", label: "Misto", icon: faVenusMars },
                ]}
                onChange={(gender) => patch({ gender })}
              />

              {filters.source !== "tpra" ? (
                <ChoiceGroup
                  label="Fascia FITP"
                  name={`${fieldNamePrefix}-rank`}
                  value={filters.rankCategory}
                  options={[
                    { value: "all", label: "Tutte" },
                    { value: "1", label: "1ª" },
                    { value: "2", label: "2ª" },
                    { value: "3", label: "3ª" },
                    { value: "4", label: "4ª" },
                  ]}
                  onChange={(rankCategory) =>
                    patch({
                      rankCategory,
                      source: rankCategory === "all" ? filters.source : "fitp",
                    })
                  }
                />
              ) : null}

              {filters.source !== "fitp" ? (
                <ChoiceGroup
                  label="Livello TPRA"
                  name={`${fieldNamePrefix}-tpra`}
                  value={filters.tpraLevel}
                  options={[
                    { value: "all", label: "Tutti" },
                    { value: "entry", label: "Entry" },
                    { value: "expert", label: "Expert" },
                  ]}
                  onChange={(tpraLevel) =>
                    patch({
                      tpraLevel,
                      source: tpraLevel === "all" ? filters.source : "tpra",
                    })
                  }
                />
              ) : null}
            </section>

            <fieldset className="ns-filter-group">
              <legend>Dove</legend>
              <label className="ns-field">
                <span className="ns-field-label">Regione</span>
                <select
                  className="ns-select"
                  value={filters.region}
                  onChange={(event) =>
                    patch({ region: event.target.value, provinceCode: "" })
                  }
                >
                  <option value="">Tutta Italia</option>
                  {regions.map((region) => (
                    <option key={region} value={region}>
                      {region}
                    </option>
                  ))}
                </select>
              </label>

              {filters.region ? (
                <label className="ns-field">
                  <span className="ns-field-label">Provincia</span>
                  <select
                    className="ns-select"
                    value={filters.provinceCode}
                    onChange={(event) => patch({ provinceCode: event.target.value })}
                  >
                    <option value="">Tutte le province</option>
                    {visibleProvinces.map((province) => (
                      <option key={province.value} value={province.value}>
                        {province.label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <LocationControl
                controller={locationController}
                origin={filters.origin}
                onChange={(origin) => patch({ origin, sort: origin ? "distance" : "date" })}
              />
            </fieldset>

            <div className="ns-filter-actions">
              <button
                className="ns-button ns-button--primary ns-button--full ns-filter-apply"
                type="button"
                onClick={() => setExpanded(false)}
              >
                Mostra i risultati
              </button>
            </div>
          </div>
        </div>
      </section>

      <section
        className="ns-filter-expander ns-saved-filters"
        data-expanded={savedExpanded || undefined}
      >
        <h2 className="ns-filter-expander__heading">
          <button
            className="ns-filter-expander__toggle"
            type="button"
            aria-expanded={savedExpanded}
            aria-controls={savedContentId}
            onClick={() => setSavedExpanded((current) => !current)}
          >
            <span className="ns-filter-expander__label">
              <FontAwesomeIcon icon={faBookmark} aria-hidden="true" />
              <span>Ricerche</span>
            </span>
            <span className="ns-filter-expander__meta">
              <ExpanderBadge
                count={preferences.savedSearches.length}
                label="salvate"
                accessibleLabel={`${preferences.savedSearches.length} ${preferences.savedSearches.length === 1 ? "ricerca salvata" : "ricerche salvate"}`}
              />
              <FontAwesomeIcon
                className="ns-filter-expander__chevron"
                icon={faChevronDown}
                aria-hidden="true"
              />
            </span>
          </button>
        </h2>

        <div
          className="ns-filter-expander__content"
          id={savedContentId}
          hidden={!savedExpanded}
        >
          {preferences.savedSearches.length > 0 ? (
            <ul className="ns-quick-filter-list">
              {preferences.savedSearches.map((search) => (
                <li key={search.id}>
                  <button
                    type="button"
                    title={`Attiva ${search.name}`}
                    onClick={() => applySavedFilters(search.name, search.filters)}
                  >
                    <span className="ns-quick-filter-list__icon" aria-hidden="true">
                      <FontAwesomeIcon icon={faBookmark} />
                    </span>
                    <span className="ns-quick-filter-list__copy">
                      <strong>{search.name}</strong>
                      <span>{savedFilterSummary(search.filters)}</span>
                    </span>
                    <span className="ns-quick-filter-list__count" aria-hidden="true">
                      {activeFilterCount(search.filters)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="ns-saved-filters__empty">
              <p>Nessuna ricerca salvata.</p>
              <Link href="/preferenze">Gestisci le ricerche salvate</Link>
            </div>
          )}
        </div>
      </section>

      <p className="ns-visually-hidden" aria-live="polite">
        {announcement}
      </p>
    </aside>
  );
}
