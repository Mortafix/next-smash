import type { Metadata } from "next";

import { PreferencesManager } from "@/components/preferences/preferences-manager";
import { getTournamentSnapshot } from "@/lib/tournaments/repository";
import { buildPageMetadata } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Profilo",
  description: "Ritrova i tornei e gestisci le ricerche salvate in questo browser.",
  path: "/profilo",
  index: false,
});

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ torneo?: string | string[] }>;
}) {
  const [snapshot, { torneo }] = await Promise.all([
    // Local collections remain usable if the current tournament source is unavailable.
    getTournamentSnapshot().catch(() => null),
    searchParams,
  ]);
  const tournamentId = Array.isArray(torneo) ? (torneo[0] ?? null) : (torneo ?? null);

  return (
    <PreferencesManager
      currentTournaments={snapshot?.tournaments ?? []}
      initialTournamentId={tournamentId}
    />
  );
}
