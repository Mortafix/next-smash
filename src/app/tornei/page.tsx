import type { Metadata } from "next";

import { TournamentExplorer } from "@/components/tournaments/tournament-explorer";
import {
  getTournamentById,
  getTournamentSnapshot,
} from "@/lib/tournaments/repository";
import { buildPageMetadata, siteConfig } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Tornei di padel FITP e TPRA in Italia",
  description: siteConfig.description,
  path: "/tornei",
});

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
