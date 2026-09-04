import type {
  Tournament,
  TournamentGender,
  TournamentSource,
} from "@/lib/tournaments/types";

export type TournamentOrigin = {
  label: string;
  latitude: number;
  longitude: number;
};

export type TournamentSort = "date" | "distance";

export type ActiveTournamentFilterKey =
  | "query"
  | "source"
  | "gender"
  | "rankCategory"
  | "tpraLevel"
  | "region"
  | "provinceCode"
  | "dateRange"
  | "origin";

export type ActiveTournamentFilter = {
  key: ActiveTournamentFilterKey;
  label: string;
};

export type TournamentFilters = {
  query: string;
  source: TournamentSource | "all";
  gender: TournamentGender | "all";
  rankCategory: "all" | "1" | "2" | "3" | "4";
  tpraLevel: "all" | "entry" | "expert";
  region: string;
  provinceCode: string;
  dateFrom: string;
  dateTo: string;
  sort: TournamentSort;
  origin: TournamentOrigin | null;
};

export const defaultTournamentFilters: TournamentFilters = {
  query: "",
  source: "all",
  gender: "all",
  rankCategory: "all",
  tpraLevel: "all",
  region: "",
  provinceCode: "",
  dateFrom: "",
  dateTo: "",
  sort: "date",
  origin: null,
};

export type TournamentWithDistance = Tournament & {
  distanceKm: number | null;
};

function normalizedSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("it")
    .trim();
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function distanceInKilometres(
  from: Pick<TournamentOrigin, "latitude" | "longitude">,
  to: { latitude: number; longitude: number },
) {
  const earthRadiusKm = 6_371;
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const startLatitude = toRadians(from.latitude);
  const endLatitude = toRadians(to.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(startLatitude) *
      Math.cos(endLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function filterTournaments(
  tournaments: Tournament[],
  filters: TournamentFilters,
): TournamentWithDistance[] {
  const query = normalizedSearch(filters.query);

  const matches = tournaments.filter((tournament) => {
    if (filters.source !== "all" && tournament.source !== filters.source) {
      return false;
    }
    if (filters.gender !== "all" && !tournament.genders.includes(filters.gender)) {
      return false;
    }
    if (
      filters.rankCategory !== "all" &&
      (tournament.source !== "fitp" ||
        !tournament.rankCategories.includes(filters.rankCategory))
    ) {
      return false;
    }
    if (
      filters.tpraLevel !== "all" &&
      (tournament.source !== "tpra" || tournament.tpraLevel !== filters.tpraLevel)
    ) {
      return false;
    }
    if (filters.region && tournament.region !== filters.region) return false;
    if (
      filters.provinceCode &&
      tournament.provinceCode !== filters.provinceCode
    ) {
      return false;
    }
    if (filters.dateFrom && tournament.endDate < filters.dateFrom) return false;
    if (filters.dateTo && tournament.startDate > filters.dateTo) return false;

    if (query) {
      const haystack = normalizedSearch(
        [
          tournament.title,
          tournament.venueName,
          tournament.city,
          tournament.province,
        ]
          .filter(Boolean)
          .join(" "),
      );
      if (!haystack.includes(query)) return false;
    }

    return true;
  });

  const withDistance = matches.map<TournamentWithDistance>((tournament) => ({
    ...tournament,
    distanceKm:
      filters.origin &&
      tournament.latitude !== null &&
      tournament.longitude !== null
        ? distanceInKilometres(filters.origin, {
            latitude: tournament.latitude,
            longitude: tournament.longitude,
          })
        : null,
  }));

  return withDistance.sort((left, right) => {
    if (filters.sort === "distance" && filters.origin) {
      if (left.distanceKm === null && right.distanceKm !== null) return 1;
      if (left.distanceKm !== null && right.distanceKm === null) return -1;
      if (left.distanceKm !== null && right.distanceKm !== null) {
        const distanceDifference = left.distanceKm - right.distanceKm;
        if (distanceDifference !== 0) return distanceDifference;
      }
    }

    return (
      left.startDate.localeCompare(right.startDate) ||
      left.title.localeCompare(right.title, "it")
    );
  });
}

function localIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function weekendRange(reference = new Date()) {
  const saturday = new Date(reference);
  saturday.setHours(12, 0, 0, 0);
  const daysUntilSaturday = (6 - saturday.getDay() + 7) % 7;
  saturday.setDate(saturday.getDate() + daysUntilSaturday);
  const sunday = new Date(saturday);
  sunday.setDate(saturday.getDate() + 1);

  return { dateFrom: localIsoDate(saturday), dateTo: localIsoDate(sunday) };
}

export function activeFilterCount(filters: TournamentFilters) {
  return activeTournamentFilters(filters).length;
}

const chipDateFormatter = new Intl.DateTimeFormat("it-IT", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function formattedFilterDate(value: string) {
  return chipDateFormatter.format(new Date(`${value}T12:00:00`));
}

function dateRangeLabel(dateFrom: string, dateTo: string) {
  if (dateFrom && dateTo) {
    return `Dal ${formattedFilterDate(dateFrom)} al ${formattedFilterDate(dateTo)}`;
  }
  if (dateFrom) return `Dal ${formattedFilterDate(dateFrom)}`;
  return `Fino al ${formattedFilterDate(dateTo)}`;
}

export function activeTournamentFilters(
  filters: TournamentFilters,
): ActiveTournamentFilter[] {
  const parts: ActiveTournamentFilter[] = [];
  const query = filters.query.trim();
  if (query) parts.push({ key: "query", label: `Cerca “${query}”` });
  if (filters.source !== "all") {
    parts.push({
      key: "source",
      label: filters.source === "fitp" ? "Solo FITP" : "Solo TPRA",
    });
  }
  if (filters.gender === "male") {
    parts.push({ key: "gender", label: "Doppio maschile" });
  }
  if (filters.gender === "female") {
    parts.push({ key: "gender", label: "Doppio femminile" });
  }
  if (filters.gender === "mixed") {
    parts.push({ key: "gender", label: "Misto" });
  }
  if (filters.rankCategory !== "all") {
    parts.push({
      key: "rankCategory",
      label: `${filters.rankCategory}ª fascia FITP`,
    });
  }
  if (filters.tpraLevel !== "all") {
    parts.push({
      key: "tpraLevel",
      label: `${filters.tpraLevel.toUpperCase()} TPRA`,
    });
  }
  if (filters.region) parts.push({ key: "region", label: filters.region });
  if (filters.provinceCode) {
    parts.push({
      key: "provinceCode",
      label: `Provincia ${filters.provinceCode}`,
    });
  }
  if (filters.dateFrom || filters.dateTo) {
    parts.push({
      key: "dateRange",
      label: dateRangeLabel(filters.dateFrom, filters.dateTo),
    });
  }
  if (filters.origin) {
    parts.push({
      key: "origin",
      label:
        filters.origin.label === "La mia posizione"
          ? "Vicino a me"
          : `Vicino a ${filters.origin.label}`,
    });
  }
  return parts;
}

export function clearTournamentFilter(
  filters: TournamentFilters,
  key: ActiveTournamentFilterKey,
): TournamentFilters {
  switch (key) {
    case "query":
      return { ...filters, query: "" };
    case "source":
      return {
        ...filters,
        source: "all",
        rankCategory: "all",
        tpraLevel: "all",
      };
    case "gender":
      return { ...filters, gender: "all" };
    case "rankCategory":
      return { ...filters, rankCategory: "all" };
    case "tpraLevel":
      return { ...filters, tpraLevel: "all" };
    case "region":
      return { ...filters, region: "", provinceCode: "" };
    case "provinceCode":
      return { ...filters, provinceCode: "" };
    case "dateRange":
      return { ...filters, dateFrom: "", dateTo: "" };
    case "origin":
      return { ...filters, origin: null, sort: "date" };
  }
}

export function describeFilters(filters: TournamentFilters) {
  const parts = activeTournamentFilters(filters).map(({ label }) => label);
  return parts.length > 0 ? parts : ["Tutti i tornei in programma"];
}
