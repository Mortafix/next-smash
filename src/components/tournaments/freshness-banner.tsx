"use client";

import {
  faArrowsRotate,
  faCircleCheck,
  faClock,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type { TournamentSnapshot } from "@/lib/tournaments/types";

type FreshnessBannerProps = Pick<
  TournamentSnapshot,
  "lastSuccessfulSync" | "setupRequired" | "stale"
>;

type RefreshPhase = "idle" | "updating" | "success" | "error";

const formatter = new Intl.DateTimeFormat("it-IT", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Rome",
});
const timeFormatter = new Intl.DateTimeFormat("it-IT", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Rome",
});
const successDurationMilliseconds = 3_500;

function pollDelayMilliseconds(attempt: number) {
  const backoff = Math.min(1_500 * 2 ** Math.min(attempt, 2), 6_000);
  return backoff + Math.round(Math.random() * 500);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function futureRetryAt(value: unknown) {
  if (typeof value !== "string") return null;

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && timestamp > Date.now() ? value : null;
}

async function responsePayload(response: Response) {
  const payload: unknown = await response.json().catch(() => null);
  if (!isRecord(payload) || typeof payload.status !== "string") {
    throw new Error("Risposta di aggiornamento non valida");
  }
  return payload;
}

export function FreshnessBanner({
  lastSuccessfulSync,
  setupRequired,
  stale,
}: FreshnessBannerProps) {
  const { refresh } = useRouter();
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [phase, setPhase] = useState<RefreshPhase>(() =>
    stale && !setupRequired ? "updating" : "idle",
  );
  const [retryAt, setRetryAt] = useState<string | null>(null);

  useEffect(() => {
    if (!stale || setupRequired) return;

    const controller = new AbortController();
    let pollTimer: number | undefined;

    function finishWithError(
      retryAtValue?: unknown,
      refreshVisibleData = false,
    ) {
      if (controller.signal.aborted) return;
      setRetryAt(futureRetryAt(retryAtValue));
      setPhase("error");
      if (refreshVisibleData) refresh();
    }

    function finishSuccessfully() {
      if (controller.signal.aborted) return;
      setPhase("success");
      refresh();
    }

    async function poll(runId: number, attempt = 0): Promise<void> {
      try {
        const response = await fetch(
          `/api/tournaments/refresh?runId=${encodeURIComponent(runId)}`,
          { cache: "no-store", signal: controller.signal },
        );
        const payload = await responsePayload(response);

        if (!response.ok) throw new Error("Stato non disponibile");
        if (payload.status === "success") {
          finishSuccessfully();
          return;
        }
        if (payload.status === "failed") {
          // Una fonte può essere stata pubblicata correttamente anche se il batch
          // complessivo è fallito: rendiamo subito visibile quel dato valido.
          finishWithError(payload.retryAt, true);
          return;
        }
        if (payload.status !== "running") {
          throw new Error("Stato di aggiornamento non valido");
        }

        pollTimer = window.setTimeout(
          () => void poll(runId, attempt + 1),
          pollDelayMilliseconds(attempt),
        );
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        finishWithError();
      }
    }

    async function startRefresh() {
      setPhase("updating");

      try {
        const response = await fetch("/api/tournaments/refresh", {
          method: "POST",
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = await responsePayload(response);

        if (payload.status === "fresh") {
          finishSuccessfully();
          return;
        }
        if (
          payload.status === "running" &&
          typeof payload.runId === "number" &&
          Number.isSafeInteger(payload.runId)
        ) {
          await poll(payload.runId);
          return;
        }
        if (payload.status === "cooldown") {
          finishWithError(payload.retryAt);
          return;
        }
        if (!response.ok) throw new Error("Aggiornamento non disponibile");
        throw new Error("Risposta di aggiornamento non valida");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        finishWithError();
      }
    }

    void startRefresh();

    return () => {
      controller.abort();
      if (pollTimer !== undefined) window.clearTimeout(pollTimer);
    };
  }, [refresh, retryAttempt, setupRequired, stale]);

  useEffect(() => {
    if (!retryAt) return;

    const delay = Math.max(0, Date.parse(retryAt) - Date.now());
    const timer = window.setTimeout(() => setRetryAt(null), delay);
    return () => window.clearTimeout(timer);
  }, [retryAt]);

  useEffect(() => {
    if (phase !== "success") return;

    const timer = window.setTimeout(
      () => setPhase("idle"),
      successDurationMilliseconds,
    );
    return () => window.clearTimeout(timer);
  }, [phase]);

  if (setupRequired) {
    return (
      <div
        className="ns-status-banner ns-status-banner--warning"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <FontAwesomeIcon
          className="ns-status-banner__icon"
          icon={faTriangleExclamation}
          aria-hidden="true"
        />
        <span className="ns-status-banner__copy">
          <strong>Tornei momentaneamente non disponibili</strong>
          <span>Il servizio dati non è ancora pronto. Riprova più tardi.</span>
        </span>
      </div>
    );
  }

  const formatted = lastSuccessfulSync
    ? formatter.format(new Date(lastSuccessfulSync))
    : null;

  if (phase === "updating") {
    return (
      <div
        className="ns-status-banner ns-status-banner--info ns-status-banner--updating"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        aria-busy="true"
      >
        <FontAwesomeIcon
          className="ns-status-banner__icon"
          icon={faArrowsRotate}
          aria-hidden="true"
        />
        <span className="ns-status-banner__copy">
          <strong>
            {formatted ? "Aggiornamento tornei in corso" : "Sto preparando i tornei"}
          </strong>
          <span>
            {formatted
              ? `Puoi continuare a consultare l’ultimo elenco, aggiornato il ${formatted}.`
              : "Il primo aggiornamento può richiedere qualche istante."}
          </span>
          {retryAttempt > 0 ? (
            <button
              className="ns-button ns-button--quiet ns-status-banner__action"
              type="button"
              aria-disabled="true"
            >
              Aggiornamento in corso
            </button>
          ) : null}
        </span>
      </div>
    );
  }

  if (phase === "success") {
    return (
      <div
        className="ns-status-banner ns-status-banner--success"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <FontAwesomeIcon
          className="ns-status-banner__icon"
          icon={faCircleCheck}
          aria-hidden="true"
        />
        <span className="ns-status-banner__copy">
          <strong>Tornei aggiornati</strong>
          <span>L’elenco contiene ora i dati più recenti.</span>
        </span>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div
        className="ns-status-banner ns-status-banner--warning"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <FontAwesomeIcon
          className="ns-status-banner__icon"
          icon={faTriangleExclamation}
          aria-hidden="true"
        />
        <span className="ns-status-banner__copy">
          <strong>Aggiornamento non riuscito</strong>
          <span>
            {formatted
              ? `Continui a vedere l’ultimo elenco valido del ${formatted}.`
              : "Non ci sono ancora dati da mostrare. Puoi riprovare tra poco."}
          </span>
          {retryAt ? (
            <span>
              Potrai riprovare alle {timeFormatter.format(new Date(retryAt))}.
            </span>
          ) : null}
          <button
            className="ns-button ns-button--quiet ns-status-banner__action"
            type="button"
            aria-disabled={retryAt ? "true" : undefined}
            onClick={() => {
              if (retryAt) return;
              setRetryAttempt((attempt) => attempt + 1);
            }}
          >
            Riprova
          </button>
        </span>
      </div>
    );
  }

  if (!lastSuccessfulSync || !formatted) return null;

  return (
    <p className="ns-freshness">
      <FontAwesomeIcon icon={faClock} aria-hidden="true" />
      <span>
        Ultimo aggiornamento: <time dateTime={lastSuccessfulSync}>{formatted}</time>
      </span>
    </p>
  );
}
