"use client";

import { faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export default function CalendarError({ reset }: { reset: () => void }) {
  return (
    <div className="ns-empty-state" role="alert">
      <span aria-hidden="true">
        <FontAwesomeIcon icon={faTriangleExclamation} />
      </span>
      <h1>Calendario non disponibile</h1>
      <p>Non riusciamo a leggere i tornei salvati in questo momento.</p>
      <button className="ns-button ns-button--primary" type="button" onClick={reset}>
        Riprova
      </button>
    </div>
  );
}
