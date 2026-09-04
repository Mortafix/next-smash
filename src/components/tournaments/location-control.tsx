"use client";

import {
  faCircleCheck,
  faLocationDot,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import {
  type CurrentPositionController,
  useCurrentPositionController,
} from "@/components/tournaments/use-current-position";
import type { TournamentOrigin } from "@/lib/tournaments/filters";

type LocationControlProps = {
  controller?: CurrentPositionController;
  origin: TournamentOrigin | null;
  onChange: (origin: TournamentOrigin | null) => void;
};

export function LocationControl({
  controller,
  origin,
  onChange,
}: LocationControlProps) {
  const internalController = useCurrentPositionController();
  const activeController = controller ?? internalController;
  const showFilterRequestState =
    controller === undefined || activeController.requestSource === "filters";

  async function requestCurrentPosition() {
    const nextOrigin = await activeController.request("filters");
    if (nextOrigin) onChange(nextOrigin);
  }

  if (origin) {
    const selectedLabel =
      origin.label === "La mia posizione"
        ? "Vicino a me"
        : `Vicino a ${origin.label}`;

    return (
      <div className="ns-location-selected">
        <span className="ns-location-selected__state">
          <FontAwesomeIcon icon={faCircleCheck} aria-hidden="true" />
          <strong>{selectedLabel}</strong>
        </span>
        <button
          className="ns-location-selected__remove"
          type="button"
          aria-label={`Rimuovi ${selectedLabel}`}
          title="Rimuovi"
          onClick={() => onChange(null)}
        >
          <FontAwesomeIcon icon={faXmark} aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <div className="ns-location-control">
      <button
        className="ns-button ns-button--secondary ns-button--full"
        type="button"
        onClick={() => void requestCurrentPosition()}
        disabled={activeController.status === "loading"}
      >
        <FontAwesomeIcon
          className="ns-button__icon"
          icon={faLocationDot}
          aria-hidden="true"
        />
        {activeController.status === "loading" && showFilterRequestState
          ? "Ricerca posizione…"
          : "Usa la mia posizione"}
      </button>
      {activeController.status === "error" && showFilterRequestState ? (
        <p className="ns-field-message ns-field-message--error" role="alert">
          {activeController.message}
        </p>
      ) : null}
    </div>
  );
}
