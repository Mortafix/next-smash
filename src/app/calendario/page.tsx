import type { Metadata } from "next";

import { TournamentCalendar } from "@/components/calendar/tournament-calendar";
import { buildPageMetadata } from "@/lib/site";
import { getTournamentSnapshot } from "@/lib/tournaments/repository";

export const metadata: Metadata = buildPageMetadata({
  title: "Calendario tornei di padel FITP e TPRA",
  description:
    "Consulta il calendario mensile dei prossimi tornei individuali di padel FITP e TPRA in Italia.",
  path: "/calendario",
});

export default async function CalendarPage() {
  const snapshot = await getTournamentSnapshot();
  return <TournamentCalendar snapshot={snapshot} />;
}
