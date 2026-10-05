export const navigationItems = [
  { href: "/tornei", label: "Tornei", icon: "list" },
  { href: "/calendario", label: "Calendario", icon: "calendar" },
  { href: "/profilo", label: "Profilo", icon: "profile" },
] as const;

export type NavigationIconName = (typeof navigationItems)[number]["icon"];

export function isNavigationItemActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
