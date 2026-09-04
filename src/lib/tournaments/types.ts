export const tournamentSources = ["fitp", "tpra"] as const;
export type TournamentSource = (typeof tournamentSources)[number];

export const tournamentGenders = [
  "male",
  "female",
  "mixed",
  "open",
  "unknown",
] as const;
export type TournamentGender = (typeof tournamentGenders)[number];

export type Tournament = {
  id: string;
  source: TournamentSource;
  sourceId: string;
  title: string;
  startDate: string;
  endDate: string;
  venueName: string | null;
  city: string | null;
  province: string | null;
  provinceCode: string | null;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
  locationPrecision: "municipality" | "unknown";
  genders: TournamentGender[];
  competitionTypes: string[];
  rankCategories: string[];
  ageCategories: string[];
  tpraLevel: string | null;
  registrationOnline: boolean;
  officialUrl: string;
  sourceStatus: string | null;
};

export type TournamentSnapshot = {
  tournaments: Tournament[];
  lastSuccessfulSync: string | null;
  stale: boolean;
  setupRequired: boolean;
};
