import Link from "next/link";

import { BrandWordmark } from "./brand-wordmark";
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
          <BrandWordmark />
        </Link>
        <DesktopNavigation />
      </div>
    </header>
  );
}
