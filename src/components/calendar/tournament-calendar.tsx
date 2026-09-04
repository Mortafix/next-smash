"use client";

import {
  faArrowLeft,
  faArrowRight,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { ActiveFilterChips } from "@/components/tournaments/active-filter-chips";
import { FilterPanel } from "@/components/tournaments/filter-panel";
import { FreshnessBanner } from "@/components/tournaments/freshness-banner";
import { TournamentCard } from "@/components/tournaments/tournament-card";
import { useTournamentFilters } from "@/components/tournaments/use-tournament-filters";
import { filterTournaments } from "@/lib/tournaments/filters";
import type { TournamentSnapshot } from "@/lib/tournaments/types";

const monthFormatter = new Intl.DateTimeFormat("it-IT", {
  month: "long",
  year: "numeric",
});
const fullDateFormatter = new Intl.DateTimeFormat("it-IT", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});
const weekdayFormatter = new Intl.DateTimeFormat("it-IT", { weekday: "short" });
const fullWeekdayFormatter = new Intl.DateTimeFormat("it-IT", {
  weekday: "long",
});
const romeDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Rome",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const millisecondsPerDay = 86_400_000;

const weekdayLabels = Array.from({ length: 7 }, (_, index) => {
  const date = new Date(2026, 8, 7 + index, 12);
  return {
    full: fullWeekdayFormatter.format(date),
    short: weekdayFormatter.format(date),
  };
});

function isoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function currentRomeDate(now = new Date()) {
  const parts = Object.fromEntries(
    romeDateFormatter
      .formatToParts(now)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );

  return new Date(parts.year, parts.month - 1, parts.day, 12);
}

function dateFromIso(value: string) {
  return new Date(`${value}T12:00:00`);
}

function dateOrdinal(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / millisecondsPerDay);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 12);
}

function isSameMonth(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth()
  );
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function shiftDate(date: Date, monthDelta: number, yearDelta = 0) {
  const targetMonth = new Date(
    date.getFullYear() + yearDelta,
    date.getMonth() + monthDelta,
    1,
    12,
  );
  const finalDay = new Date(
    targetMonth.getFullYear(),
    targetMonth.getMonth() + 1,
    0,
    12,
  ).getDate();
  targetMonth.setDate(Math.min(date.getDate(), finalDay));
  return targetMonth;
}

function monthGrid(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1, 12);
  const leadingDays = (first.getDay() + 6) % 7;
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - leadingDays);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return date;
  });
}

type TournamentCalendarProps = {
  snapshot: TournamentSnapshot;
};

export function TournamentCalendar({ snapshot }: TournamentCalendarProps) {
  const [today, setToday] = useState(currentRomeDate);
  const [month, setMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1, 12),
  );
  const [selectedDate, setSelectedDate] = useState(() => isoDate(today));
  const [focusedDate, setFocusedDate] = useState(() => isoDate(today));
  const dayButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const pendingFocus = useRef<string | null>(null);
  const { filters, setFilters } = useTournamentFilters();
  const filtered = useMemo(
    () => filterTournaments(snapshot.tournaments, filters),
    [filters, snapshot.tournaments],
  );
  const days = useMemo(() => monthGrid(month), [month]);
  const weeks = useMemo(
    () => Array.from({ length: 6 }, (_, index) => days.slice(index * 7, index * 7 + 7)),
    [days],
  );
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

  const eventCounts = useMemo(() => {
    const firstDay = isoDate(days[0]);
    const firstOrdinal = dateOrdinal(firstDay);
    const finalOrdinal = firstOrdinal + days.length - 1;
    const changes = Array.from({ length: days.length + 1 }, () => 0);

    for (const tournament of filtered) {
      const tournamentStart = dateOrdinal(tournament.startDate);
      const tournamentEnd = dateOrdinal(tournament.endDate);
      const visibleStart = Math.max(firstOrdinal, tournamentStart);
      const visibleEnd = Math.min(finalOrdinal, tournamentEnd);
      if (visibleStart > visibleEnd) continue;

      changes[visibleStart - firstOrdinal] += 1;
      changes[visibleEnd - firstOrdinal + 1] -= 1;
    }

    const runningCounts = changes.slice(0, days.length).reduce<number[]>(
      (counts, change) => [
        ...counts,
        (counts.at(-1) ?? 0) + change,
      ],
      [],
    );

    return new Map(
      days.map((date, index) => {
        return [isoDate(date), runningCounts[index]] as const;
      }),
    );
  }, [days, filtered]);

  const selectedEvents = useMemo(
    () =>
      filtered.filter(
        (tournament) =>
          tournament.startDate <= selectedDate && tournament.endDate >= selectedDate,
      ),
    [filtered, selectedDate],
  );

  useEffect(() => {
    function refreshToday() {
      setToday((current) => {
        const next = currentRomeDate();
        return isoDate(current) === isoDate(next) ? current : next;
      });
    }

    refreshToday();
    const interval = window.setInterval(refreshToday, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  function keepDayVisible(element: HTMLButtonElement) {
    if (typeof element.scrollIntoView !== "function") return;
    element.scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  useEffect(() => {
    const value = pendingFocus.current;
    if (!value) return;

    const element = dayButtonRefs.current.get(value);
    if (!element) return;

    pendingFocus.current = null;
    element.focus({ preventScroll: true });
    keepDayVisible(element);
  }, [days, focusedDate]);

  function moveFocus(date: Date) {
    const value = isoDate(date);
    pendingFocus.current = value;
    setFocusedDate(value);
    if (!isSameMonth(date, month)) setMonth(startOfMonth(date));
  }

  function selectDate(date: Date) {
    const value = isoDate(date);
    const changesMonth = !isSameMonth(date, month);

    setSelectedDate(value);
    setFocusedDate(value);
    if (changesMonth) {
      pendingFocus.current = value;
      setMonth(startOfMonth(date));
    }
  }

  function handleDayKeyDown(
    event: ReactKeyboardEvent<HTMLButtonElement>,
    date: Date,
  ) {
    let destination: Date | null = null;

    switch (event.key) {
      case "ArrowLeft":
        destination = addDays(date, -1);
        break;
      case "ArrowRight":
        destination = addDays(date, 1);
        break;
      case "ArrowUp":
        destination = addDays(date, -7);
        break;
      case "ArrowDown":
        destination = addDays(date, 7);
        break;
      case "Home":
        destination = addDays(date, -((date.getDay() + 6) % 7));
        break;
      case "End":
        destination = addDays(date, 6 - ((date.getDay() + 6) % 7));
        break;
      case "PageUp":
        destination = event.shiftKey ? shiftDate(date, 0, -1) : shiftDate(date, -1);
        break;
      case "PageDown":
        destination = event.shiftKey ? shiftDate(date, 0, 1) : shiftDate(date, 1);
        break;
      default:
        return;
    }

    event.preventDefault();
    moveFocus(destination);
  }

  function changeMonth(delta: number) {
    const next = shiftDate(dateFromIso(focusedDate), delta);
    const value = isoDate(next);
    setMonth(startOfMonth(next));
    setSelectedDate(value);
    setFocusedDate(value);
  }

  function goToToday() {
    const now = currentRomeDate();
    const value = isoDate(now);
    setMonth(startOfMonth(now));
    setSelectedDate(value);
    setFocusedDate(value);
  }

  const selectedDateObject = dateFromIso(selectedDate);
  const selectedDateLabel = fullDateFormatter.format(selectedDateObject);
  const selectedEventLabel = `${selectedEvents.length} ${selectedEvents.length === 1 ? "torneo" : "tornei"}`;
  const previousMonthLabel = monthFormatter.format(shiftDate(month, -1));
  const nextMonthLabel = monthFormatter.format(shiftDate(month, 1));

  return (
    <div className="ns-page-stack">
      <header className="ns-page-heading">
        <div>
          <h1>Calendario tornei</h1>
          <p>Scegli un giorno e confronta subito i tornei disponibili.</p>
        </div>
      </header>

      <ActiveFilterChips filters={filters} onChange={setFilters} />

      <div className="ns-explorer-layout">
        <FilterPanel
          filters={filters}
          onChange={setFilters}
          regions={regions}
          provinces={provinces}
        />

        <section className="ns-calendar-section" aria-labelledby="calendar-month">
          <FreshnessBanner
            lastSuccessfulSync={snapshot.lastSuccessfulSync}
            setupRequired={snapshot.setupRequired}
            stale={snapshot.stale}
          />
          <div className="ns-calendar-toolbar" role="group" aria-label="Navigazione calendario">
            <button
              className="ns-icon-button"
              type="button"
              aria-label={`Mese precedente, ${previousMonthLabel}`}
              aria-controls="calendar-grid calendar-agenda"
              onClick={() => changeMonth(-1)}
            >
              <FontAwesomeIcon icon={faArrowLeft} aria-hidden="true" />
            </button>
            <div className="ns-calendar-toolbar__period">
              <h2 id="calendar-month" aria-live="polite" aria-atomic="true">
                {monthFormatter.format(month)}
              </h2>
              <span className="ns-calendar-toolbar__separator" aria-hidden="true" />
              <button
                className="ns-button ns-button--primary ns-today-button"
                type="button"
                aria-label={`Vai a oggi, ${fullDateFormatter.format(today)}`}
                aria-controls="calendar-grid calendar-agenda"
                onClick={goToToday}
              >
                Oggi
              </button>
            </div>
            <button
              className="ns-icon-button"
              type="button"
              aria-label={`Mese successivo, ${nextMonthLabel}`}
              aria-controls="calendar-grid calendar-agenda"
              onClick={() => changeMonth(1)}
            >
              <FontAwesomeIcon icon={faArrowRight} aria-hidden="true" />
            </button>
          </div>

          <p className="ns-visually-hidden" id="calendar-help">
            Usa le frecce per cambiare giorno, Home e Fine per muoverti nella
            settimana, Pagina su e Pagina giù per cambiare mese. Premi Invio o
            Spazio per scegliere la data.
          </p>

          <div className="ns-calendar-frame">
            <table
              className="ns-calendar"
              id="calendar-grid"
              role="grid"
              aria-labelledby="calendar-month"
              aria-describedby="calendar-help"
            >
              <thead>
                <tr>
                  {weekdayLabels.map((weekday) => (
                    <th key={weekday.full} scope="col" abbr={weekday.full}>
                      {weekday.short}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weeks.map((week) => (
                  <tr key={isoDate(week[0])}>
                    {week.map((date) => {
                      const value = isoDate(date);
                      const count = eventCounts.get(value) ?? 0;
                      const outside = !isSameMonth(date, month);
                      const selected = value === selectedDate;
                      const isToday = value === isoDate(today);
                      const label = `${fullDateFormatter.format(date)}, ${count} ${count === 1 ? "torneo" : "tornei"}${isToday ? ", oggi" : ""}`;

                      return (
                        <td
                          key={value}
                          role="gridcell"
                          aria-selected={selected || undefined}
                          data-outside={outside || undefined}
                        >
                          <button
                            className="ns-calendar-day"
                            type="button"
                            ref={(element) => {
                              if (element) dayButtonRefs.current.set(value, element);
                              else dayButtonRefs.current.delete(value);
                            }}
                            tabIndex={value === focusedDate ? 0 : -1}
                            aria-label={label}
                            aria-current={isToday ? "date" : undefined}
                            aria-controls="calendar-selection-status calendar-agenda"
                            data-date={value}
                            data-today={isToday || undefined}
                            onClick={() => selectDate(date)}
                            onFocus={(event) => {
                              setFocusedDate(value);
                              keepDayVisible(event.currentTarget);
                            }}
                            onKeyDown={(event) => handleDayKeyDown(event, date)}
                          >
                            <span className="ns-calendar-day__date" aria-hidden="true">
                              <span className="ns-calendar-day__number">
                                {date.getDate()}
                              </span>
                              {isToday ? (
                                <span className="ns-calendar-day__today">Oggi</span>
                              ) : null}
                            </span>
                            {count > 0 ? (
                              <strong className="ns-calendar-day__count" aria-hidden="true">
                                {count}
                              </strong>
                            ) : null}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p
            className="ns-visually-hidden"
            id="calendar-selection-status"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {selectedDateLabel}: {selectedEventLabel}.
          </p>

          <section
            className="ns-calendar-agenda"
            id="calendar-agenda"
            aria-labelledby="calendar-agenda-title"
          >
            <div className="ns-section-heading">
              <h2 id="calendar-agenda-title" tabIndex={-1}>
                {selectedDateLabel}
              </h2>
              <span aria-label={selectedEventLabel}>{selectedEvents.length}</span>
            </div>
            {selectedEvents.length > 0 ? (
              <ul className="ns-tournament-list ns-calendar-agenda__list">
                {selectedEvents.map((tournament) => (
                  <li key={tournament.id}>
                    <TournamentCard tournament={tournament} compact />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="ns-empty-state ns-empty-state--small">
                <h3>Nessun torneo</h3>
                <p>
                  Nessun torneo in questo giorno con i filtri selezionati.
                  Scegli un’altra data o modifica i filtri.
                </p>
              </div>
            )}
          </section>
        </section>
      </div>
    </div>
  );
}
