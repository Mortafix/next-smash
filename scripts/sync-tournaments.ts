import "dotenv/config";

import {
  claimTournamentSync,
  runClaimedTournamentSync,
} from "../src/lib/tournaments/sync";

async function main() {
  const claim = claimTournamentSync({ force: true });

  if (claim.status === "running") {
    console.log(`Sincronizzazione ${claim.runId} già in corso.`);
    return;
  }
  if (claim.status !== "started") {
    throw new Error("Il database deve essere inizializzato prima della sincronizzazione.");
  }

  const batch = await runClaimedTournamentSync(claim.runId);
  const { results } = batch;

  for (const result of results) {
    if (result.ok) {
      console.log(
        `${result.source.toUpperCase()}: ${result.recordsStored} tornei salvati (${result.recordsSeen} letti).`,
      );
    } else {
      console.error(`${result.source.toUpperCase()}: ${result.error}`);
    }
  }

  if (batch.status === "failed") {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Errore sconosciuto");
  process.exitCode = 1;
});
