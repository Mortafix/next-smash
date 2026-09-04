---
target: /tornei
total_score: 24
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:/Users/moris/Programming/Script/next-smash/src/components/tournaments/tournament-explorer.tsx"
target_fingerprint: "sha256:1c7e1dcd254c797792f4db68cfda53ec537c057c9a87a593b4e5d304c2669f2c"
target_path: /Users/moris/Programming/Script/next-smash/src/components/tournaments/tournament-explorer.tsx
timestamp: 2026-09-03T13-59-31Z
slug: src-components-tournaments-tournament-explorer-tsx
closed: true
---
### Design Health Score

| # | Euristica | Punteggio | Nodo principale |
|---|---|---:|---|
| 1 | Visibilità dello stato | 2/4 | Risultati e freschezza sono chiari; il salvataggio non ha esito visibile affidabile |
| 2 | Corrispondenza col mondo reale | 3/4 | Linguaggio padel forte; date ISO e abbreviazioni ufficiali rallentano la lettura |
| 3 | Controllo e libertà | 3/4 | Reset e annullamento funzionano; i chip non permettono rimozione diretta |
| 4 | Coerenza e standard | 3/4 | Sistema visivo coeso; conteggio e riepilogo filtri descrivono stati diversi |
| 5 | Prevenzione errori | 2/4 | Vincoli data corretti; un errore di persistenza può essere annunciato come successo |
| 6 | Riconoscimento, non memoria | 2/4 | Le opzioni sono etichettate; query e origine dei chip non restano sempre riconoscibili |
| 7 | Flessibilità ed efficienza | 2/4 | Weekend, distanza e ricerche salvate aiutano; mancano rimozione rapida e scansione mobile compatta |
| 8 | Design estetico e minimale | 3/4 | Identità eccellente; su mobile troppo spazio precede il primo torneo |
| 9 | Diagnosi e recupero errori | 2/4 | Errori di route/geolocalizzazione sono chiari; no-result e salvataggio hanno recupero debole |
| 10 | Aiuto e documentazione | 2/4 | Privacy e provenienza sono ben spiegate; fasce/livelli restano impliciti |
| **Totale** | | **24/40** | **Accettabile, con identità forte e lacune operative concrete** |

### Design Specificity Verdict

`/tornei` è chiaramente autoriale: Blu Campo, Giallo Pallina, bordi da tabellone, carattere atletico e rotaia data rendono NextSmash immediatamente riconoscibile. La parte debole è il flusso: dentro i filtri, “trova un torneo che posso giocare” diventa una pila di campi generica.

Il detector, eseguito una sola volta sui componenti tornei, ha restituito 0 finding. Questo non smentisce i problemi emersi nel browser: il detector non intercetta incoerenze semantiche fra conteggio e riepilogo, densità del primo viewport o affidabilità dell’esito di salvataggio. Nessun falso positivo nel risultato CLI; otto falsi target touch individuati da una query esplorativa appartenevano alla toolbar Impeccable già presente, non all’app.

Non è disponibile un overlay affidabile della critique: il browser ha bloccato la pre-verifica di iniezione mutabile, quindi il server overlay non è stato avviato. Le evidenze sostitutive sono screenshot e geometrie reali a 1440, 768, 390 e 320 px.

### Overall Impression

Identità forte e fiducia nei dati sono già distintive; la maggiore opportunità è ridurre il tempo fra intenzione e primo torneo pertinente, specialmente da smartphone.

### What's Working

- La card torneo è un componente firma riuscito: data, circuito, titolo, luogo e fonte ufficiale si scansionano con una grammatica visiva unica.
- La trasparenza dei dati è molto buona: freschezza, stime di distanza, persistenza locale e fonte ufficiale sono dichiarate senza claim inventati.
- Le fondamenta accessibili sono solide: controlli nativi, etichette, focus, target da almeno 44 px, riduzione del movimento e stati espliciti.

### Priority Issues

1. **[P1] Lo stato filtri mostrato può contraddire quello reale.** La query viene conteggiata ma omessa dal riepilogo; le due date valgono due nel badge ma diventano un solo chip. Nello stato osservato il badge mostrava 5 mentre i chip erano 4. **Fix:** introdurre un modello semantico unico, con query inclusa e chip rimovibili singolarmente. **Suggested command:** `$impeccable harden`.

2. **[P1] Su mobile il payoff arriva troppo tardi.** A 390×844 il primo torneo inizia sotto il viewport; a 320 px persino l’accesso ai filtri scende sotto la piega. Le card strette accumulano badge e titoli su molte righe. **Fix:** compattare l’intestazione operativa e trasformare la rotaia data in testata orizzontale sui viewport stretti. **Suggested command:** `$impeccable adapt`.

3. **[P1] Il salvataggio non produce un esito visibile e affidabile.** Il dialogo si chiude e cambia soltanto una live region nascosta; se `writePreferences()` fallisce, viene comunque annunciato successo. **Fix:** mantenere il fallimento nel dialogo con recupero e mostrare un feedback visibile con collegamento a Preferenze in caso di successo. **Suggested command:** `$impeccable harden`.

4. **[P2] Filtrare e recuperare da zero risultati costa troppo.** Il pannello mobile aperto misura circa 897 px; la rail desktop annida lo scroll; a 320 px le date mostrano soltanto `05/09/20` e `06/09/20`. **Fix:** raggruppare in “Quando”, “Categoria” e “Dove”, impilare le date sui layout stretti e aggiungere azioni allo stato vuoto. **Suggested command:** `$impeccable layout`.

5. **[P2] La fedeltà al dato ufficiale prevale sulla comprensione del giocatore.** Titoli ereditati, codici e molti badge rendono più lenta la risposta alle quattro domande decisive: quando, dove, circuito, livello. **Fix:** migliorare la gerarchia informativa senza alterare i dati ufficiali. **Suggested command:** `$impeccable clarify`.

### Cognitive Load

Moderato, 3 fallimenti su 8: chunking, numero di opzioni e memoria di lavoro. Nei casi più densi una card presenta 8–11 token visivi prima di luogo e azione.

### Persona Red Flags

- **Casey, mobile e distratta:** nessun torneo nel primo viewport, filtri lunghi e card che occupano quasi uno schermo.
- **Sam, tastiera/screen reader:** chip inerti, regione risultati senza vero heading, salvataggio fallito potenzialmente annunciato come riuscito.
- **Giulia, giocatrice agonistica:** la query può sparire dal riepilogo salvato; date ISO e codici rallentano il confronto; la spiegazione della distanza è lontana dal badge.

### Minor Observations

- Le date delle card sono localizzate ma quelle dei chip no.
- Sorgente, registrazione, stato, distanza e categorie hanno quasi lo stesso peso.
- Il banner stale è onesto ma domina troppo il mobile.
- Lo stato loading del comune e quello della geolocalizzazione sono accorpati.

### Questions to Consider

- Quanto deve arretrare l’hero per mostrare subito un torneo?
- Il titolo ufficiale deve restare protagonista o diventare la fonte secondaria di un riepilogo normalizzato?
- Il feedback di salvataggio deve chiudere l’azione o accompagnare direttamente a Preferenze?
