# NextSmash

Portale pubblico, mobile-first e senza account per trovare rapidamente i tornei
individuali di padel FITP e TPRA in Italia.

## Funzioni disponibili

- elenco cronologico con ricerca e filtri per circuito, tipologia, fascia/livello,
  regione, provincia e intervallo date;
- ordinamento per distanza, usando la posizione del browser oppure il centro del
  comune scelto;
- calendario mensile con agenda giornaliera;
- filtri predefiniti e ricerche salvate in `localStorage`;
- contatore aggregato delle visite, senza identificatori personali;
- aggiornamento automatico all’apertura quando i dati hanno più di 12 ore, con
  conservazione dell’ultimo snapshot valido in caso di errore.

## Stack

- Next.js 16, React 19 e TypeScript;
- Tailwind CSS 4 più CSS custom per il design “Cemento & Campo”;
- SQLite, better-sqlite3 e Drizzle ORM;
- Zod per validare le risposte esterne;
- Vitest, Testing Library e Playwright.

Richiede Node.js 22 o successivo e pnpm 11 (la versione è fissata in
`package.json`).

## Avvio locale

```bash
corepack enable
pnpm install
cp .env.example .env
pnpm db:migrate
pnpm sync:tournaments
pnpm dev
```

Apri [http://localhost:3000](http://localhost:3000). Il dataset comunale ISTAT è
già incluso: non è necessario rigenerarlo per avviare l’app.

## Variabili d’ambiente

| Variabile | Default | Uso |
| --- | --- | --- |
| `DATABASE_PATH` | `.data/next-smash.sqlite` | File SQLite persistente |
| `PUC_API_URL` | endpoint interno PUC indicato in `.env.example` | Fonte tornei server-side |
| `SYNC_HORIZON_DAYS` | `400` | Orizzonte futuro conservato |
| `TOURNAMENT_REFRESH_AFTER_HOURS` | `12` | Età massima dei dati prima del refresh automatico |

Nessuna variabile è esposta al browser e nel repository non sono richiesti segreti.

## Comandi di qualità e manutenzione

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm exec playwright install chromium
pnpm test:e2e
pnpm build
pnpm db:generate
pnpm db:migrate
pnpm sync:tournaments
pnpm data:update:municipalities
```

`data:update:municipalities` scarica l’anagrafica e i confini ufficiali ISTAT,
ricalcola i punti rappresentativi e aggiorna manifest e checksum. Serve solo quando
ISTAT pubblica una nuova versione.

## Struttura

- `src/app`: pagine, route API e stili;
- `src/components`: shell, elenco, calendario e preferenze;
- `src/lib/tournaments`: adapter PUC, filtri, repository e sincronizzazione;
- `src/lib/locations`: normalizzazione e ricerca comunale;
- `src/db`: schema e client SQLite;
- `scripts`: sincronizzazione e aggiornamento dati ISTAT;
- `drizzle`: migrazioni versionate;
- `docs`: architettura e guida Linode.

## Dati e attribuzione

PUC/FITP e TPRA restano le fonti ufficiali dei tornei; ogni card rimanda al dettaglio
originale. Le coordinate amministrative derivano da dati ISTAT CC BY 4.0. Fonti,
checksum e override sono in
[`src/data/municipalities.manifest.json`](src/data/municipalities.manifest.json) e
l’attribuzione completa è in [`src/data/ATTRIBUTION.md`](src/data/ATTRIBUTION.md).

Per architettura e limiti noti vedi [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
Per il server personale vedi [`docs/DEPLOY_LINODE.md`](docs/DEPLOY_LINODE.md).
