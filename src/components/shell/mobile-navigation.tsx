"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NavigationIcon } from "./navigation-icon";
import {
  isNavigationItemActive,
  navigationItems,
} from "./navigation-items";

export function MobileNavigation() {
  const pathname = usePathname();

  return (
    <nav className="mobile-nav" aria-label="Navigazione principale">
      <ul className="mobile-nav__list">
        {navigationItems.map((item) => {
          const isActive = isNavigationItemActive(pathname, item.href);

          return (
            <li className="mobile-nav__item" key={item.href}>
              <Link
                className="mobile-nav__link"
                href={item.href}
                aria-current={isActive ? "page" : undefined}
              >
                <NavigationIcon name={item.icon} />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
