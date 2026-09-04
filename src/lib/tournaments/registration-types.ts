import type { TournamentSource } from "@/lib/tournaments/types";

export type TournamentRegistrationEntry = {
  label: string;
  registeredPlayers: number;
  registeredPairs: number | null;
  capacityPlayers: number | null;
  capacityPairs: number | null;
  reservePlayers: number;
  reservePairs: number | null;
};

export type TournamentRegistrationSummary = {
  source: TournamentSource;
  entries: TournamentRegistrationEntry[];
  fetchedAt: string;
};
