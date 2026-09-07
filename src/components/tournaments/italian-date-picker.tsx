"use client";

import { faChevronLeft, faChevronRight, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { type KeyboardEvent, type RefObject, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type ItalianDatePickerProps = {
  id: string;
  label: string;
  value: string;
  min?: string;
  max?: string;
  anchorRef: RefObject<HTMLDivElement | null>;
  triggerRef: RefObject<HTMLButtonElement | null>;
  onSelect: (value: string) => void;
  onDismiss: (restoreFocus?: boolean) => void;
};

const monthFormatter = new Intl.DateTimeFormat("it-IT", { month: "long", year: "numeric" });
const dayFormatter = new Intl.DateTimeFormat("it-IT", {
  weekday: "long", day: "numeric", month: "long", year: "numeric",
});
const weekdays = [
  ["lun", "lunedì"], ["mar", "martedì"], ["mer", "mercoledì"],
  ["gio", "giovedì"], ["ven", "venerdì"], ["sab", "sabato"], ["dom", "domenica"],
];

function isoDate(date: Date) {
  return [date.getFullYear().toString().padStart(4, "0"),
    String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

function dateFromIso(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function shiftMonth(date: Date, months: number) {
  const next = new Date(date.getFullYear(), date.getMonth() + months, 1, 12);
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0, 12).getDate();
  next.setDate(Math.min(date.getDate(), lastDay));
  return next;
}

export function ItalianDatePicker({
  id, label, value, min = "1000-01-01", max = "9999-12-31",
  anchorRef, triggerRef, onSelect, onDismiss,
}: ItalianDatePickerProps) {
  const titleId = useId();
  const monthId = useId();
  const helpId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const dayRefs = useRef(new Map<string, HTMLButtonElement>());
  const shouldFocusDay = useRef(true);
  const today = isoDate(new Date());
  const [focusedDate, setFocusedDate] = useState(() => {
    const initial = value || today;
    return initial < min ? min : initial > max ? max : initial;
  });
  const focused = dateFromIso(focusedDate);
  const firstOfMonth = new Date(focused.getFullYear(), focused.getMonth(), 1, 12);
  const gridStart = addDays(firstOfMonth, -((firstOfMonth.getDay() + 6) % 7));
  const days = Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));

  function inRange(date: string) {
    return date.length === 10 && date >= min && date <= max;
  }

  function canVisitMonth(offset: number) {
    const start = new Date(focused.getFullYear(), focused.getMonth() + offset, 1, 12);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 12);
    return start <= dateFromIso(max) && end >= dateFromIso(min);
  }

  function moveTo(date: Date, focusDay = true) {
    const next = date < dateFromIso(min) ? min : date > dateFromIso(max) ? max : isoDate(date);
    shouldFocusDay.current = focusDay;
    setFocusedDate(next);
  }

  function handleDayKeyDown(event: KeyboardEvent<HTMLButtonElement>, date: Date) {
    let next: Date;
    switch (event.key) {
      case "ArrowLeft": next = addDays(date, -1); break;
      case "ArrowRight": next = addDays(date, 1); break;
      case "ArrowUp": next = addDays(date, -7); break;
      case "ArrowDown": next = addDays(date, 7); break;
      case "Home": next = addDays(date, -((date.getDay() + 6) % 7)); break;
      case "End": next = addDays(date, 6 - ((date.getDay() + 6) % 7)); break;
      case "PageUp": next = shiftMonth(date, event.shiftKey ? -12 : -1); break;
      case "PageDown": next = shiftMonth(date, event.shiftKey ? 12 : 1); break;
      default: return;
    }
    event.preventDefault();
    moveTo(next);
  }

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    const anchor = anchorRef.current;
    if (!dialog || !anchor) return;

    function position() {
      if (!dialog || !anchor) return;
      const viewport = window.visualViewport;
      const leftEdge = (viewport?.offsetLeft ?? 0) + 8;
      const topEdge = (viewport?.offsetTop ?? 0) + 8;
      const rightEdge = leftEdge + (viewport?.width ?? window.innerWidth) - 16;
      const bottomEdge = topEdge + (viewport?.height ?? window.innerHeight) - 16;
      dialog.style.maxWidth = `${rightEdge - leftEdge}px`;
      dialog.style.maxHeight = `${bottomEdge - topEdge}px`;
      const field = anchor.getBoundingClientRect();
      const popup = dialog.getBoundingClientRect();
      const below = field.bottom + 8;
      const top = below + popup.height <= bottomEdge ? below : field.top - popup.height - 8;
      dialog.style.left = `${Math.max(leftEdge, Math.min(field.left, rightEdge - popup.width))}px`;
      dialog.style.top = `${Math.max(topEdge, Math.min(top, bottomEdge - popup.height))}px`;
    }

    position();
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    window.visualViewport?.addEventListener("resize", position);
    window.visualViewport?.addEventListener("scroll", position);
    return () => {
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
      window.visualViewport?.removeEventListener("resize", position);
      window.visualViewport?.removeEventListener("scroll", position);
    };
  }, [anchorRef]);

  useLayoutEffect(() => {
    if (shouldFocusDay.current) {
      dayRefs.current.get(focusedDate)?.focus({ preventScroll: true });
      shouldFocusDay.current = false;
    }
  }, [focusedDate]);

  useEffect(() => {
    function dismissOutside(event: Event) {
      const target = event.target;
      if (target instanceof Node && !dialogRef.current?.contains(target) && !anchorRef.current?.contains(target)) {
        onDismiss(false);
      }
    }
    document.addEventListener("pointerdown", dismissOutside);
    document.addEventListener("focusin", dismissOutside);
    return () => {
      document.removeEventListener("pointerdown", dismissOutside);
      document.removeEventListener("focusin", dismissOutside);
    };
  }, [anchorRef, onDismiss]);

  function handleDialogKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onDismiss(true);
    }
    if (event.key !== "Tab") return;
    const stops = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled):not([tabindex='-1'])"));
    const atStart = event.shiftKey && event.target === stops[0];
    const atEnd = !event.shiftKey && event.target === stops.at(-1);
    if (!atStart && !atEnd) return;

    // The portal is at the end of the document: resume the form's normal tab order.
    event.preventDefault();
    const trigger = triggerRef.current;
    if (atEnd && trigger) {
      const controls = Array.from(document.querySelectorAll<HTMLElement>("button, input, select, textarea, a[href], [tabindex]"))
        .filter((element) => element.tabIndex >= 0 && !element.matches(":disabled") && element.getClientRects().length > 0 && !dialogRef.current?.contains(element));
      const next = controls[controls.indexOf(trigger) + 1];
      onDismiss(false);
      (next ?? trigger).focus();
    } else {
      onDismiss(true);
    }
  }

  return createPortal(
    <div ref={dialogRef} className="ns-date-picker" id={id} role="dialog" lang="it-IT"
      aria-labelledby={titleId} aria-describedby={helpId} onKeyDown={handleDialogKeyDown}>
      <div className="ns-date-picker__header">
        <strong id={titleId}>{label === "Dal" ? "Data iniziale" : label === "Al" ? "Data finale" : label}</strong>
        <button className="ns-date-picker__icon" type="button" aria-label="Chiudi calendario" onClick={() => onDismiss(true)}>
          <FontAwesomeIcon icon={faXmark} aria-hidden="true" />
        </button>
      </div>
      <div className="ns-date-picker__navigation">
        <button className="ns-date-picker__icon" type="button" aria-label="Mese precedente"
          disabled={!canVisitMonth(-1)} onClick={() => moveTo(shiftMonth(focused, -1), false)}>
          <FontAwesomeIcon icon={faChevronLeft} aria-hidden="true" />
        </button>
        <h3 id={monthId} aria-live="polite">{monthFormatter.format(firstOfMonth)}</h3>
        <button className="ns-date-picker__icon" type="button" aria-label="Mese successivo"
          disabled={!canVisitMonth(1)} onClick={() => moveTo(shiftMonth(focused, 1), false)}>
          <FontAwesomeIcon icon={faChevronRight} aria-hidden="true" />
        </button>
      </div>
      <p className="ns-visually-hidden" id={helpId}>
        Usa le frecce per spostarti tra i giorni, Pagina su e Pagina giù per cambiare mese.
        Premi Invio per scegliere o Esc per chiudere.
      </p>
      <table className="ns-date-picker__grid" role="grid" aria-labelledby={monthId}>
        <thead><tr>{weekdays.map(([short, full]) => <th scope="col" key={full}><abbr title={full}>{short}</abbr></th>)}</tr></thead>
        <tbody>
          {Array.from({ length: 6 }, (_, row) => (
            <tr key={row}>
              {days.slice(row * 7, row * 7 + 7).map((date) => {
                const iso = isoDate(date);
                const selected = iso === value;
                return (
                  <td key={iso} aria-selected={selected}>
                    <button className="ns-date-picker__day" type="button"
                      ref={(node) => { if (node) dayRefs.current.set(iso, node); else dayRefs.current.delete(iso); }}
                      aria-label={dayFormatter.format(date)} aria-current={iso === today ? "date" : undefined}
                      data-selected={selected || undefined} data-outside-month={date.getMonth() !== focused.getMonth() || undefined}
                      tabIndex={iso === focusedDate ? 0 : -1} disabled={!inRange(iso)}
                      onKeyDown={(event) => handleDayKeyDown(event, date)} onClick={() => onSelect(iso)}>
                      {date.getDate()}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="ns-date-picker__actions">
        <button type="button" disabled={!inRange(today)} onClick={() => onSelect(today)}>Oggi</button>
        <button type="button" onClick={() => onSelect("")}>Svuota</button>
      </div>
    </div>,
    document.body,
  );
}
