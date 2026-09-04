import type { Metadata } from "next";

import { TournamentExplorer } from "@/components/tournaments/tournament-explorer";
import {
  getTournamentById,
  getTournamentSnapshot,
} from "@/lib/tournaments/repository";

export const metadata: Metadata = {
  title: "Tornei",
  description:
    "Consulta e filtra i prossimi tornei individuali di padel FITP e TPRA in Italia.",
};

type TournamentsPageProps = {
  searchParams: Promise<{
    torneo?: string | string[];
  }>;
};

export default async function TournamentsPage({
  searchParams,
}: TournamentsPageProps) {
  const snapshotPromise = getTournamentSnapshot();
  const { torneo } = await searchParams;
  const tournamentId = Array.isArray(torneo) ? (torneo[0] ?? null) : (torneo ?? null);
  const [snapshot, initialTournament] = await Promise.all([
    snapshotPromise,
    tournamentId ? getTournamentById(tournamentId) : Promise.resolve(null),
  ]);

  return (
    <TournamentExplorer
      snapshot={snapshot}
      initialTournament={initialTournament}
    />
  );
}
