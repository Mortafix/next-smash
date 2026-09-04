import { after, NextResponse } from "next/server";

import {
  claimTournamentSync,
  failClaimedTournamentSync,
  getTournamentSyncRun,
  runClaimedTournamentSync,
} from "@/lib/tournaments/sync";

export const maxDuration = 600;

const noStoreHeaders = { "cache-control": "no-store" };

export async function POST() {
  try {
    const claim = claimTournamentSync();

    if (claim.status === "started") {
      after(async () => {
        try {
          const result = await runClaimedTournamentSync(claim.runId);
          if (result.status === "failed") {
            console.error(
              `Aggiornamento tornei ${claim.runId} non completato:`,
              result.results
                .filter((source) => !source.ok)
                .map((source) => `${source.source}: ${source.error}`)
                .join("; "),
            );
          }
        } catch (error) {
          failClaimedTournamentSync(claim.runId, error);
          console.error(
            `Aggiornamento tornei ${claim.runId} interrotto:`,
            error,
          );
        }
      });
    }

    if (claim.status === "started" || claim.status === "running") {
      return NextResponse.json(
        { status: "running", runId: claim.runId },
        { status: 202, headers: noStoreHeaders },
      );
    }

    if (claim.status === "fresh") {
      return NextResponse.json(
        {
          status: "fresh",
          lastSuccessfulSync: claim.lastSuccessfulSync,
        },
        { headers: noStoreHeaders },
      );
    }

    if (claim.status === "cooldown") {
      return NextResponse.json(
        { status: "cooldown", retryAt: claim.retryAt },
        { headers: noStoreHeaders },
      );
    }

    return NextResponse.json(
      {
        status: "setup-required",
        message: "Il servizio dati non è ancora pronto.",
      },
      { status: 503, headers: noStoreHeaders },
    );
  } catch (error) {
    console.error("Impossibile avviare l’aggiornamento tornei:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "L’aggiornamento non può essere avviato in questo momento.",
      },
      { status: 503, headers: noStoreHeaders },
    );
  }
}

export async function GET(request: Request) {
  const value = new URL(request.url).searchParams.get("runId");
  const runId = value ? Number(value) : Number.NaN;

  if (!Number.isSafeInteger(runId) || runId <= 0) {
    return NextResponse.json(
      { status: "error", message: "Identificativo non valido." },
      { status: 400, headers: noStoreHeaders },
    );
  }

  try {
    const run = getTournamentSyncRun(runId);
    if (!run) {
      return NextResponse.json(
        { status: "error", message: "Aggiornamento non trovato." },
        { status: 404, headers: noStoreHeaders },
      );
    }

    return NextResponse.json(run, { headers: noStoreHeaders });
  } catch (error) {
    console.error(`Impossibile leggere l’aggiornamento tornei ${runId}:`, error);
    return NextResponse.json(
      { status: "error", message: "Stato non disponibile." },
      { status: 503, headers: noStoreHeaders },
    );
  }
}
