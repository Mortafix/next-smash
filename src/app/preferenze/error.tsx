"use client";

import { faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export default function PreferencesError({ reset }: { reset: () => void }) {
  return (
    <div className="ns-empty-state" role="alert">
      <span aria-hidden="true">
        <FontAwesomeIcon icon={faTriangleExclamation} />
      </span>
      <h1>Preferenze non disponibili</h1>
      <p>
        Non riusciamo ad aprire le preferenze in questo momento. Riprova per
        recuperare le ricerche memorizzate nel browser.
      </p>
      <button className="ns-button ns-button--primary" type="button" onClick={reset}>
        Riprova
      </button>
    </div>
  );
}
