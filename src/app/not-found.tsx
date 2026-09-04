import { faCompass } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="ns-empty-state">
      <span aria-hidden="true">
        <FontAwesomeIcon icon={faCompass} />
      </span>
      <h1>Pagina fuori campo</h1>
      <p>
        Questo indirizzo non porta a una pagina di NextSmash. Torna all’elenco e
        riparti dai prossimi tornei.
      </p>
      <Link className="ns-button ns-button--primary ns-not-found__action" href="/tornei">
        Vai ai tornei
      </Link>
    </div>
  );
}
