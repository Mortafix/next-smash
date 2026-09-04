import type { Metadata } from "next";

import { TournamentCalendar } from "@/components/calendar/tournament-calendar";
import { getTournamentSnapshot } from "@/lib/tournaments/repository";

export const metadata: Metadata = {
  title: "Calendario",
  description: "Calendario mensile dei tornei individuali di padel FITP e TPRA.",
};

export default async function CalendarPage() {
  const snapshot = await getTournamentSnapshot();
  return <TournamentCalendar snapshot={snapshot} />;
}

