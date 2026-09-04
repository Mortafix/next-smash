# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

NextSmash serve principalmente giocatori e giocatrici di padel agonistico in
Italia che cercano, spesso da smartphone, il prossimo torneo compatibile con il
proprio livello, la zona e le date disponibili.

## Product Purpose

NextSmash rende semplice trovare e confrontare i prossimi tornei individuali di
padel FITP e TPRA in Italia. Il prodotto ha successo quando una persona riesce a
individuare rapidamente un torneo pertinente, comprenderne date, categorie e
località e raggiungere il dettaglio ufficiale per la verifica finale.

## Positioning

NextSmash riunisce in un solo flusso consultabile tornei individuali FITP e TPRA
e li rende confrontabili tramite ricerca, filtri e ordinamento per distanza. I
siti ufficiali restano la fonte definitiva dei dettagli del torneo.

## Operating Context

L'esperienza è pubblica, mobile-first e non richiede un account. Le persone
consultano un elenco cronologico o un calendario mensile, restringono i risultati
per circuito, tipologia, livello, territorio e date, possono usare la posizione o
un comune come origine per stimare la distanza e possono salvare ricerche e filtri
nel proprio browser.

## Capabilities and Constraints

- L'interfaccia e i contenuti di prodotto sono in italiano.
- Sono inclusi tornei individuali di padel provenienti da FITP e TPRA.
- Il browser non interroga direttamente la fonte PUC: i dati sono sincronizzati
  lato server e l'ultimo snapshot valido resta disponibile in caso di errore.
- La freschezza dei dati deve essere comunicata con trasparenza, soprattutto quando
  lo snapshot potrebbe non essere aggiornato.
- Ogni torneo deve mantenere un collegamento riconoscibile al dettaglio ufficiale.
- Il prodotto non richiede account. Preferenze, ricerche salvate e posizione
  restano nel browser dell'utente.
- Le distanze sono stime basate sulla posizione o sul comune scelto e non devono
  essere presentate come misure esatte.
- L'esperienza deve restare mobile-first, accessibile e utilizzabile con dati reali,
  contenuti lunghi, stati vuoti, caricamento ed errore.

## Brand Commitments

Il nome del prodotto è NextSmash. L'identità esistente «Cemento & Campo» e il
tono diretto, energico e orientato al compito sono impegni da preservare. Il
prodotto non deve assumere l'aspetto o il linguaggio di un SaaS generico.

## Evidence on Hand

- Il repository contiene dati e metadati reali dei tornei sincronizzati dalle
  fonti FITP e TPRA.
- Le coordinate amministrative e la ricerca territoriale si basano sul dataset
  comunale ISTAT incluso in `src/data/`, con attribuzione documentata in
  `src/data/ATTRIBUTION.md`.
- L'architettura, la strategia di sincronizzazione e i limiti noti sono documentati
  in `docs/ARCHITECTURE.md`.
- Non sono disponibili testimonianze, clienti, benchmark o claim promozionali che
  il lavoro futuro possa inventare.

## Product Principles

1. Portare la persona dal bisogno al torneo pertinente con il minor attrito
   possibile.
2. Rendere FITP e TPRA confrontabili senza confondere aggregazione e fonte
   ufficiale.
3. Comunicare sempre provenienza, precisione e freschezza dei dati in modo onesto.
4. Conservare privacy e immediatezza evitando account e profilazione.
5. Progettare prima per l'uso da smartphone, senza sacrificare accessibilità o
   completezza sui viewport più ampi.

## Accessibility & Inclusion

NextSmash deve offrire struttura semantica, navigazione da tastiera, focus visibile,
contrasto adeguato, target touch utilizzabili e feedback che non dipendano soltanto
dal colore. Contenuti lunghi, dati mancanti e preferenze di riduzione del movimento
devono essere gestiti senza perdita di funzione.
