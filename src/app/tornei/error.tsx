"use client";

import { faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export default function TournamentsError({ reset }: { reset: () => void }) {
  return (
    <div className="ns-empty-state" role="alert">
      <span aria-hidden="true">
        <FontAwesomeIcon icon={faTriangleExclamation} />
      </span>
      <h1>Non riusciamo a caricare i tornei</h1>
      <p>I dati salvati non sono disponibili in questo momento.</p>
      <button className="ns-button ns-button--primary" type="button" onClick={reset}>
        Riprova
      </button>
    </div>
  );
}
