"use client";

import { faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export default function ProfileError({ reset }: { reset: () => void }) {
  return (
    <div className="ns-empty-state" role="alert">
      <span aria-hidden="true"><FontAwesomeIcon icon={faTriangleExclamation} /></span>
      <h1>Profilo non disponibile</h1>
      <p>Non riusciamo ad aprire il profilo in questo momento. Riprova per recuperare i tornei e le ricerche salvati nel browser.</p>
      <button className="ns-button ns-button--primary" type="button" onClick={reset}>Riprova</button>
    </div>
  );
}
