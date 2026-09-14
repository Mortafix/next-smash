# Architettura NextSmash

## Flusso applicativo

```text
PUC FITP/TPRA ── sync server-side ──> SQLite ── Server Component ──> UI React
       │                                   │                          │
       └─ validazione + snapshot sicuro    └─ visite aggregate        └─ filtri browser

ISTAT XLSX + confini ── generatore offline ──> municipalities.json
                                                 │
                                                 └─ regioni e distanze stimate
```

L’app pubblica non chiama PUC dal browser: l’endpoint rifiuta origini esterne ed è
privo di contratto pubblico. Il processo pianificato aggiorna SQLite; le pagine
continuano a mostrare l’ultimo snapshot valido se la fonte non risponde.

## Protezione dal limite PUC

La paginazione PUC satura empiricamente `rowstoskip` a 100. NextSmash non la usa:

1. legge il totale nazionale della singola fonte;
2. se supera 100, acquisisce e somma le 20 regioni;
3. una regione oltre 100 viene suddivisa con gli identificativi provinciali FITP;
4. una provincia oltre 100 viene percorsa per data di inizio crescente: conserva
   solo i risultati precedenti all’ultima data della pagina e riparte da quella
   stessa data inclusa, così recupera tutti i tornei sul confine;
5. ogni pagina deve contenere il numero dichiarato, fino al cap di 100;
6. i totali degli shard devono ricostruire quello del padre, anche a ogni
   avanzamento per data; gli identificativi finali devono essere tutti unici;
7. pagine incomplete, totali mutati, date non ordinate o filtri ignorati
   interrompono la pubblicazione dello snapshot. Se i primi 100 risultati di una
   provincia ancora satura iniziano tutti nello stesso giorno, l’adapter si ferma
   con un errore esplicito senza saltare quella data.

L’adapter mantiene sempre `data_fine: null`: in PUC quel filtro riguarda la fine
effettiva del torneo e potrebbe escludere gli eventi che attraversano il confine
di una finestra. La continuazione usa soltanto il limite inferiore `data_inizio`.
Una risposta vuota viene ritentata: al livello nazionale o durante una continuazione
è un errore; nei territori viene trattata come zero e accettata soltanto se la somma
complessiva ricostruisce il totale del padre.

Il 14 settembre 2026 la provincia FITP 201 (Torino, regione 1) dichiarava 102 tornei
TPRA dal 14 agosto: 100 nella prima pagina. Ripartendo dal 13 ottobre, ultima data
restituita, PUC ha fornito 3 tornei: uno già sul confine e i 2 mancanti. I 99
precedenti più i 3 della continuazione ricostruiscono il totale di 102.

## Modello dati

`tournaments` contiene la chiave stabile della fonte, date ISO, circuito, gare,
fasce/livelli, località, punto comunale, URL ufficiale, checksum e metadati di
sincronizzazione. Le liste multiple sono JSON testuale perché il volume corrente è
ridotto e i filtri sono eseguiti nel browser.

`sync_runs` registra esito, tempi e conteggi per FITP e TPRA. Ogni fonte viene
pubblicata in una transazione separata: il fallimento di TPRA non rende obsoleti i
dati FITP e viceversa.

`page_views` conserva solo conteggi per giorno e percorso. Non memorizza IP, cookie,
user agent o identificatori.

## Località

Il generatore versionato combina l’anagrafica comunale corrente con i confini
generalizzati ISTAT 2026. Usa il centro di massa quando cade nel poligono; altrimenti
sceglie un punto interno. Le fusioni territoriali avvenute dopo lo snapshot dei
confini sono override espliciti e verificati.

Il matching avviene sempre su nome normalizzato più provincia. Niente fuzzy matching
automatico: una località dubbia resta senza coordinate. Nel controllo sui 529 tornei
del 3 settembre 2026, 527 sono stati risolti automaticamente e gli ultimi due tramite
alias provinciali sardi documentati.

## Rendering e stato browser

Le pagine elenco e calendario sono renderizzate a richiesta e ricevono lo snapshot
da SQLite. Se lo snapshot completo ha più di 12 ore, il browser richiede un refresh
server-side non bloccante: una run `all` impedisce lavori concorrenti, la UI continua
a mostrare l’ultimo elenco valido e aggiorna il Server Component alla conclusione.
Un lease recupera le run interrotte e un breve cooldown evita raffiche di tentativi
dopo un errore. Filtri, origine scelta e set salvati restano in `localStorage`; un
external store React mantiene coerenti pagine e navigazioni senza account. Il server
non riceve questi set, salvo le query temporanee necessarie all’autocomplete dei
comuni.

## Decisioni differite

- Newsletter: fuori dalla v1; richiederebbe email, double opt-in, cancellazione e un
  provider di invio.
- API PUC: adapter isolato per poter sostituire l’endpoint interno se cambiasse.
- Multiistanza: non necessaria su un singolo Linode; SQLite presuppone un solo processo
  applicativo che scrive sul disco persistente.
