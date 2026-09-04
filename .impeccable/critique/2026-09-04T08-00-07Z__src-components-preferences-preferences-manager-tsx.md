---
target: /preferenze
total_score: 21
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:/Users/moris/Programming/Script/next-smash/src/components/preferences/preferences-manager.tsx"
target_fingerprint: "sha256:4260d4cecfd3d28e6e7c75478afbd07a15999a12b96b012372b23239198b0166"
target_path: /Users/moris/Programming/Script/next-smash/src/components/preferences/preferences-manager.tsx
timestamp: 2026-09-04T08-00-07Z
slug: src-components-preferences-preferences-manager-tsx
closed: true
---
Method: dual-agent (A: `/root/preferenze_design` · B: `/root/preferenze_evidence`)

## Design Health Score

| # | Euristica | Punteggio | Problema chiave |
|---|---|---:|---|
| 1 | Visibilità dello stato | 2/4 | Quasi tutti i salvataggi hanno solo feedback invisibile. |
| 2 | Corrispondenza col mondo reale | 3/4 | Il linguaggio è chiaro, ma “ultimi filtri” resta astratto. |
| 3 | Controllo e libertà | 2/4 | Undo e annullamento esistono, ma focus e fallimenti non sono gestiti in sicurezza. |
| 4 | Coerenza e standard | 3/4 | Sistema visivo coerente; il toast non usa però il markup previsto dagli stili. |
| 5 | Prevenzione degli errori | 1/4 | Sovrascrittura cieca e transizioni di successo dopo scritture fallite. |
| 6 | Riconoscimento anziché memoria | 2/4 | I predefiniti sono visibili, i filtri che li sostituiranno no. |
| 7 | Flessibilità ed efficienza | 2/4 | Le ricerche salvate aiutano, ma la gestione da tastiera è incompleta. |
| 8 | Estetica e minimalismo | 3/4 | Composizione distinta e contenuta anche su mobile. |
| 9 | Recupero dagli errori | 1/4 | Il fallimento può restare invisibile e contraddetto dalla UI. |
| 10 | Aiuto e documentazione | 2/4 | Privacy e stato vuoto sono spiegati; le relazioni fra i tre tipi di filtro no. |
| **Totale** | | **21/40** | **Accettabile, con lacune transazionali e di accessibilità.** |

## Specificità del design

La pagina è chiaramente autoriale e riconoscibile come NextSmash: palette, tipografia, ombre fisiche e linguaggio sportivo lavorano insieme. Il limite non è l’identità visiva, ma la logica operativa della sezione predefiniti, ancora troppo simile a una settings card generica. Il `+` dello stato vuoto suggerisce inoltre una creazione in pagina che in realtà porta altrove.

Il detector deterministico ha restituito **0 rilievi** su `src/components/preferences`; nessun falso positivo. Non è stato possibile iniettare un overlay mutabile affidabile nel browser, quindi la verifica ha usato AX tree, sorgente, screenshot e misure desktop/390/320. Nessun overflow di pagina; pulsanti da 49 px e navigazione mobile da 64 px.

## Impressione complessiva

La pagina comunica carattere, ordine e privacy. La maggiore opportunità è far sì che ogni azione dica chiaramente cosa cambierà e mostri soltanto stati realmente persistiti.

## Cosa funziona

- Privacy esplicitata subito e con copy concreto.
- Due blocchi facilmente scansionabili e stato vuoto con una via d’uscita utile.
- Responsive robusto, focus visibile e target touch adeguati.

## Priority Issues

1. **[P1] La UI può mostrare un falso successo**

   - **Perché conta:** `applyFilters`, rinomina ed eliminazione proseguono anche quando la scrittura fallisce; l’utente può lasciare la pagina o perdere l’edit credendo che i dati siano stati salvati.
   - **Fix:** far restituire l’esito a `commit`, eseguire navigazione/chiusura/toast solo dopo successo, mantenere l’input in caso d’errore e mostrare un messaggio visibile e azionabile.
   - **Comando suggerito:** `$impeccable harden`

2. **[P1] Rinomina ed eliminazione interrompono il percorso della tastiera**

   - **Perché conta:** il controllo focalizzato viene sostituito o rimosso senza una destinazione successiva; l’azione Undo è mescolata al live status.
   - **Fix:** gestire ref e ripristino del focus, spostarlo al prossimo elemento logico dopo l’eliminazione, separare messaggio live e pulsante e dare alle azioni nomi accessibili specifici.
   - **Comando suggerito:** `$impeccable polish`

## Persona red flags

- **Jordan, primo utilizzo:** non vede cosa contengano gli “ultimi filtri”, non distingue subito default/ultimi/ricerche salvate e il `+` promette un’azione che cambia pagina.
- **Sam, tastiera/screen reader/low vision:** il contatore viene esposto come semplice “0”; il feedback solo invisibile non aiuta chi usa la vista; il focus può perdersi dopo rinomina o eliminazione.
- **Riley, stress tester:** bloccando `localStorage`, l’app può navigare o annunciare un’eliminazione non avvenuta; un nome fatto solo di spazi fallisce senza spiegazione.

## Osservazioni minori

- Mostrare un’anteprima degli ultimi filtri e disabilitare il no-op.
- Rendere espliciti “Ripristina tutti i tornei” e “Apri con questi filtri”.
- Usare un `h3` nello stato vuoto e un’etichetta completa per il contatore.
- Correggere la struttura del toast e validare il valore dopo `trim()`.
- Separare visivamente azioni di configurazione e navigazione su mobile.

## Domande da considerare

- La pagina deve essere soprattutto un editor dei predefiniti o un cruscotto di scorciatoie?
- Un valore chiamato “ultimi filtri” può essere affidabile se non viene mostrato?
- Ogni modifica alle preferenze dovrebbe lasciare una conferma visibile e reversibile?

Questions skipped: 2 Priority Issues found; user already authorized this surface and scope is clear.
