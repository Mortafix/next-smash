import {
  faCalendarDays,
  faList,
  faUser,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import type { NavigationIconName } from "./navigation-items";

type NavigationIconProps = {
  name: NavigationIconName;
};

export function NavigationIcon({ name }: NavigationIconProps) {
  return (
    <FontAwesomeIcon
      className="mobile-nav__icon"
      icon={
        name === "calendar"
          ? faCalendarDays
          : name === "profile"
            ? faUser
            : faList
      }
      aria-hidden="true"
    />
  );
}
