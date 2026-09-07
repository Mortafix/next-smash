"use client";

import { faCalendarDays } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useId, useRef, useState } from "react";

import { ItalianDatePicker } from "@/components/tournaments/italian-date-picker";

type ItalianDateInputProps = {
  label: string;
  value: string;
  min?: string;
  max?: string;
  onChange: (value: string) => void;
};

function formatIsoDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : "";
}

function parseItalianDate(value: string) {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value.trim());
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (year < 1000 || month < 1 || month > 12 || day < 1) return null;

  const lastDayOfMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day > lastDayOfMonth) return null;

  return [
    String(year).padStart(4, "0"),
    String(month).padStart(2, "0"),
    String(day).padStart(2, "0"),
  ].join("-");
}

function normalizeDraft(value: string) {
  const sanitized = value.replace(/[^\d/]/g, "");
  if (sanitized.includes("/")) {
    const parts = sanitized.split("/");
    if (parts.length === 2 && parts[0].length === 2 && parts[1].length > 2) {
      return `${parts[0]}/${parts[1].slice(0, 2)}/${parts[1].slice(2, 6)}`;
    }
    return sanitized.slice(0, 10);
  }

  const digits = sanitized.slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function ItalianDateInput({
  label,
  value,
  min,
  max,
  onChange,
}: ItalianDateInputProps) {
  const inputId = useId();
  const errorId = useId();
  const pickerId = useId();
  const anchorRef = useRef<HTMLDivElement>(null);
  const pickerButtonRef = useRef<HTMLButtonElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draft, setDraft] = useState(() => formatIsoDate(value));
  const [editing, setEditing] = useState(false);
  const [validation, setValidation] = useState<{
    sourceValue: string;
    message: string;
  } | null>(null);
  const error = validation?.sourceValue === value ? validation.message : "";
  const displayedValue = editing || error ? draft : formatIsoDate(value);

  function showError(message: string) {
    setEditing(false);
    setValidation({ sourceValue: value, message });
  }

  function commitDraft() {
    const trimmed = draft.trim();
    if (!trimmed) {
      setDraft("");
      setEditing(false);
      setValidation(null);
      onChange("");
      return;
    }

    const isoDate = parseItalianDate(trimmed);
    if (!isoDate) {
      showError("Inserisci una data valida nel formato GG/MM/AAAA.");
      return;
    }

    if (min && isoDate < min) {
      showError(`Inserisci una data uguale o successiva al ${formatIsoDate(min)}.`);
      return;
    }

    if (max && isoDate > max) {
      showError(`Inserisci una data uguale o precedente al ${formatIsoDate(max)}.`);
      return;
    }

    setDraft(formatIsoDate(isoDate));
    setEditing(false);
    setValidation(null);
    onChange(isoDate);
  }

  function closePicker(restoreFocus = false) {
    setPickerOpen(false);
    if (restoreFocus) pickerButtonRef.current?.focus();
  }

  return (
    <div className="ns-field">
      <label className="ns-field-label" htmlFor={inputId}>
        {label}
      </label>
      <div className="ns-date-input" ref={anchorRef}>
        <input
          className="ns-input ns-date-input__text"
          id={inputId}
          type="text"
          lang="it-IT"
          inputMode="numeric"
          autoComplete="off"
          spellCheck={false}
          placeholder="gg/mm/aaaa"
          value={displayedValue}
          maxLength={10}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error ? errorId : undefined}
          onFocus={() => {
            setDraft(error ? draft : formatIsoDate(value));
            setEditing(true);
            setValidation(null);
          }}
          onChange={(event) => {
            setDraft(normalizeDraft(event.target.value));
            if (error) setValidation(null);
          }}
          onBlur={commitDraft}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              event.currentTarget.blur();
              setPickerOpen(true);
            }
            if (event.key === "Enter") {
              event.preventDefault();
              event.currentTarget.blur();
            }
            if (event.key === "Escape") {
              setDraft(formatIsoDate(value));
              setEditing(true);
              setValidation(null);
            }
          }}
        />
        <button
          ref={pickerButtonRef}
          className="ns-date-input__picker"
          type="button"
          aria-label={`Apri calendario per ${label}`}
          aria-haspopup="dialog"
          aria-expanded={pickerOpen}
          aria-controls={pickerOpen ? pickerId : undefined}
          onClick={() => setPickerOpen((current) => !current)}
        >
          <FontAwesomeIcon icon={faCalendarDays} aria-hidden="true" />
        </button>
        {pickerOpen ? (
          <ItalianDatePicker
            id={pickerId}
            label={label}
            value={value}
            min={min}
            max={max}
            anchorRef={anchorRef}
            triggerRef={pickerButtonRef}
            onDismiss={closePicker}
            onSelect={(date) => {
              setDraft(formatIsoDate(date));
              setEditing(false);
              setValidation(null);
              onChange(date);
              closePicker(true);
            }}
          />
        ) : null}
      </div>
      {error ? (
        <p className="ns-field-message ns-field-message--error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
