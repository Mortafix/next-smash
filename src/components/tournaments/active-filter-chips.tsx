import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faBookmark,
  faCalendarDays,
  faFlag,
  faLocationDot,
  faMagnifyingGlass,
  faMapLocationDot,
  faMarsAndVenus,
  faRotateLeft,
  faSignal,
  faTrophy,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import {
  activeTournamentFilters,
  clearTournamentFilter,
  defaultTournamentFilters,
  type ActiveTournamentFilterKey,
  type TournamentFilters,
} from "@/lib/tournaments/filters";

type ActiveFilterChipsProps = {
  filters: TournamentFilters;
  onChange: (filters: TournamentFilters) => void;
  onSave?: () => void;
};

const filterIcons: Record<ActiveTournamentFilterKey, IconDefinition> = {
  query: faMagnifyingGlass,
  source: faTrophy,
  gender: faMarsAndVenus,
  rankCategory: faSignal,
  tpraLevel: faSignal,
  region: faMapLocationDot,
  provinceCode: faFlag,
  dateRange: faCalendarDays,
  origin: faLocationDot,
};

export function ActiveFilterChips({
  filters,
  onChange,
  onSave,
}: ActiveFilterChipsProps) {
  const activeFilters = activeTournamentFilters(filters);
  if (activeFilters.length === 0) return null;

  return (
    <div className="ns-active-filter-bar">
      <ul className="ns-active-filters" aria-label="Filtri attivi">
        {activeFilters.map(({ key, label }) => (
          <li key={key}>
            <button
              className="ns-active-filter-chip"
              type="button"
              title={`Rimuovi ${label}`}
              aria-label={`Rimuovi filtro: ${label}`}
              onClick={() => onChange(clearTournamentFilter(filters, key))}
            >
              <span className="ns-active-filter-chip__icon" aria-hidden="true">
                <FontAwesomeIcon icon={filterIcons[key]} />
              </span>
              <span className="ns-active-filter-chip__label">{label}</span>
              <span className="ns-active-filter-chip__remove" aria-hidden="true">
                <FontAwesomeIcon icon={faXmark} />
              </span>
            </button>
          </li>
        ))}
      </ul>
      <div
        className="ns-active-filter-actions"
        role="group"
        aria-label="Azioni sui filtri attivi"
      >
        {onSave ? (
          <button
            className="ns-active-filters__save"
            type="button"
            aria-label="Salva i filtri attivi"
            onClick={onSave}
          >
            <FontAwesomeIcon icon={faBookmark} aria-hidden="true" />
            <span>Salva</span>
          </button>
        ) : null}
        <button
          className="ns-active-filters__reset"
          type="button"
          onClick={() => onChange({ ...defaultTournamentFilters })}
        >
          <FontAwesomeIcon icon={faRotateLeft} aria-hidden="true" />
          <span>Azzera</span>
        </button>
      </div>
    </div>
  );
}
