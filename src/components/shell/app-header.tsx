import Link from "next/link";

import { DesktopNavigation } from "./desktop-navigation";

export function AppHeader() {
  return (
    <header className="app-header">
      <div className="shell-container app-header__inner">
        <Link
          className="brand-link"
          href="/tornei"
          aria-label="NextSmash, vai all’elenco dei tornei"
        >
          <span className="brand-link__wordmark">NextSmash</span>
          <span className="brand-link__tagline">Trova il prossimo torneo</span>
        </Link>
        <DesktopNavigation />
      </div>
    </header>
  );
}
