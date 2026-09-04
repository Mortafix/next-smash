---
name: NextSmash
description: "Il tabellone digitale energico, pop e accessibile del padel agonistico italiano."
colors:
  canvas: "#f5f2e8"
  surface: "#fffef7"
  surface-blue: "#d7f1f7"
  ink: "#071923"
  text-muted: "#4d626d"
  border: "#071923"
  court: "#006b8f"
  court-hover: "#005b79"
  court-pressed: "#004d68"
  ball: "#e6ff2e"
  ball-hover: "#d7f200"
  ball-pressed: "#c2db00"
  ball-soft: "#f5ffc2"
  success: "#17663d"
  success-bg: "#e5f6ec"
  warning: "#874a00"
  warning-bg: "#fff1cf"
  danger: "#b42318"
  danger-bg: "#fde7e4"
  disabled-bg: "#e1e6e6"
  disabled-text: "#59676d"
  focus: "#004d68"
  focus-on-dark: "#e6ff2e"
typography:
  wordmark:
    fontFamily: '"Oswald", ui-sans-serif, system-ui, sans-serif'
    fontSize: "clamp(2rem, 9vw, 2.75rem)"
    fontWeight: 700
    lineHeight: 0.8
    letterSpacing: "-0.03em"
  display:
    fontFamily: '"Oswald", ui-sans-serif, system-ui, sans-serif'
    fontSize: "clamp(2.25rem, 10vw, 4.5rem)"
    fontWeight: 700
    lineHeight: 0.92
    letterSpacing: "-0.035em"
  headline:
    fontFamily: '"Oswald", ui-sans-serif, system-ui, sans-serif'
    fontSize: "clamp(1.35rem, 6vw, 2rem)"
    fontWeight: 700
    lineHeight: 1
  title:
    fontFamily: '"Oswald", ui-sans-serif, system-ui, sans-serif'
    fontSize: "clamp(1.25rem, 5vw, 1.65rem)"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  body:
    fontFamily: '"Source Sans 3", ui-sans-serif, system-ui, sans-serif'
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: '"Oswald", ui-sans-serif, system-ui, sans-serif'
    fontSize: "0.8125rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.045em"
  navigation:
    fontFamily: '"Oswald", ui-sans-serif, system-ui, sans-serif'
    fontSize: "0.875rem"
    fontWeight: 700
    lineHeight: 1
  caption:
    fontFamily: '"Source Sans 3", ui-sans-serif, system-ui, sans-serif'
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  card: "0.25rem"
  control: "0.5rem"
  pill: "9999px"
spacing:
  "1": "0.25rem"
  "2": "0.5rem"
  "3": "0.75rem"
  "4": "1rem"
  "6": "1.5rem"
  "8": "2rem"
  "12": "3rem"
  "16": "4rem"
components:
  button-primary:
    backgroundColor: "{colors.ball}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0.65rem 1rem"
    height: "2.75rem"
  button-secondary:
    backgroundColor: "{colors.court}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "0.65rem 1rem"
    height: "2.75rem"
  button-quiet:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0.65rem 1rem"
    height: "2.75rem"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0.65rem 0.75rem"
    height: "2.75rem"
  chip:
    backgroundColor: "{colors.ball-soft}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0.22rem 0.5rem"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "1rem"
  navigation-active:
    backgroundColor: "{colors.ball}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 1.5rem"
    height: "2.75rem"
  status-warning:
    backgroundColor: "{colors.warning-bg}"
    textColor: "{colors.warning}"
    rounded: "{rounded.control}"
    padding: "0.75rem 1rem"
---

# Design System: NextSmash

## Overview

**Creative North Star: "Il Tabellone del Circolo"**

Il Tabellone del Circolo traduce la chiarezza pubblica di un tabellone gare e
l'energia fisica del campo in un sistema digitale immediato. Blocchi netti,
tipografia condensata, date in evidenza e accenti da pallina da padel rendono
scansionabili anche elenchi densi senza perdere personalità.

Il sistema deve risultare energico, pop e accessibile: espressivo nei contrasti,
disciplinato nella griglia e tattile nelle interazioni. La sua identità rifiuta
l'estetica SaaS generica, le superfici indistinte e la decorazione che compete con
date, luogo, livello e azione ufficiale.

**Key Characteristics:**

- Contrasto deciso fra Blu Campo, Giallo Pallina, Inchiostro Profondo e superfici calde.
- Gerarchia condensata e maiuscola per orientamento, titoli, date e controlli.
- Bordi strutturali da 2px e ombre nette da 3–4px per una tattilità coerente.
- Layout mobile-first che passa dalla navigazione inferiore all'header desktop.
- Densità informativa alta ma leggibile, sostenuta da ritmo, raggruppamento e badge.

## Colors

La palette unisce la fisicità del campo a superfici calde e leggibili; ogni colore
ha un ruolo operativo riconoscibile.

### Primary

- **Blu Campo** (#006b8f): costruisce header, binari delle date, badge FITP e azioni secondarie ad alta enfasi.
- **Blu Campo Profondo** (#005b79): rende evidente lo stato hover senza cambiare famiglia cromatica.
- **Blu Campo Pressato** (#004d68): segnala pressione, focus e link operativi.

### Secondary

- **Giallo Pallina** (#e6ff2e): identifica azioni primarie, selezioni correnti e numeri che devono emergere.
- **Giallo Pallina Attivo** (#d7f200): conferma l'hover delle azioni primarie.
- **Giallo Pallina Pressato** (#c2db00): completa la progressione tattile dell'accento.
- **Alone Pallina** (#f5ffc2): sostiene chip, filtri e superfici selezionate a bassa intensità.

### Tertiary

- **Verde Conferma** (#17663d) e **Verde Spogliatoio** (#e5f6ec): comunicano disponibilità e stato positivo.
- **Ambra Avviso** (#874a00) e **Carta Ambra** (#fff1cf): comunicano dati obsoleti o attenzione richiesta.
- **Rosso Stop** (#b42318) e **Rosa Errore** (#fde7e4): comunicano errore o azione distruttiva.

### Neutral

- **Cemento Chiaro** (#f5f2e8): tela principale calda, mai bianco digitale neutro.
- **Bianco Circolo** (#fffef7): superficie dei controlli, delle card e dei dialoghi.
- **Azzurro Tabellone** (#d7f1f7): superficie informativa e risposta hover leggera.
- **Inchiostro Profondo** (#071923): testo principale, bordi e ombre; sostituisce il nero puro.
- **Ardesia Secondaria** (#4d626d): metadati e testo subordinato.
- **Cemento Disattivato** (#e1e6e6) e **Ardesia Disattivata** (#59676d): controlli e contenuti non disponibili.

**The Court-and-Ball Rule.** Blu Campo costruisce la struttura; Giallo Pallina
segnala priorità, selezione o avanzamento. Non usarli come decorazione casuale.

**The Truthful State Rule.** Successo, avviso ed errore combinano sempre tinta,
testo esplicito e, quando serve, una forma o un bordo: il colore non comunica mai
da solo.

## Typography

**Display Font:** Oswald 700, con ui-sans-serif, system-ui e sans-serif come fallback.  
**Body Font:** Source Sans 3, con ui-sans-serif, system-ui e sans-serif come fallback.

**Character:** La coppia oppone una voce condensata, atletica e perentoria a un
corpo familiare e neutro. La tipografia display crea energia senza compromettere
la velocità di lettura dei dati reali.

### Hierarchy

- **Wordmark** (700, clamp 2rem–2.72rem, line-height 0.8): firma `NEXT/SMASH` nell'header, inclinata di 6°; `NEXT` usa Bianco Circolo, mentre slash e `SMASH` usano Giallo Pallina.
- **Display** (700, clamp 2.25rem–4.5rem, line-height 0.92): titoli pagina brevi, maiuscoli e con tracking negativo.
- **Headline** (700, clamp 1.35rem–2rem, line-height 1): mesi, sezioni e intestazioni operative.
- **Title** (700, clamp 1.25rem–1.65rem, line-height 1.05): nomi dei tornei e titoli delle card, con wrapping aggressivo per i dati lunghi.
- **Body** (400, 1rem, line-height 1.5): descrizioni, valori e contenuto continuo; mantenere le introduzioni entro circa 44rem.
- **Label** (700, 0.8125rem, tracking 0.045em, maiuscolo): campi, eyebrow, badge e orientamento.
- **Navigation** (700, 0.8125rem–0.875rem, line-height 1, maiuscolo): destinazioni mobile e desktop; la crescita responsive migliora la scansione senza alterare la gerarchia.
- **Caption** (400, 0.75rem, line-height 1.5): metadati secondari e note brevi; la tagline del brand usa la stessa misura con Oswald 700.

**The Condensed Means Command Rule.** Il carattere condensato è riservato a
gerarchia, orientamento e azione; non deve invadere il corpo informativo.

**The Readability First Rule.** Nomi ufficiali, località e date possono essere
lunghi: vanno mandati a capo e contenuti, mai ridotti fino a diventare ambigui.

## Layout

Il sistema usa una scala di spaziatura a multipli di 4px, da 0.25rem a 4rem. Il
contenitore principale arriva a 73.75rem; i margini laterali passano da 1rem a
1.5rem e poi 2rem ai breakpoint stabiliti. Il contenuto operativo principale non
supera 47.5rem quando è affiancato ai filtri.

Le pagine nascono a colonna singola. A 40rem aumentano respiro e dimensione delle
card; a 48rem la navigazione inferiore lascia posto all'header desktop sticky; a
64rem elenco e calendario adottano una griglia con filtri sticky da 18rem e
contenuto fluido. I breakpoint sono guidati dal cambio di comportamento, non da
nomi di dispositivo.

**The Mobile Starts the Match Rule.** La funzione primaria deve essere completa
prima dei 48rem; il desktop può aggiungere persistenza e spazio, non funzioni
esclusive.

## Elevation & Depth

La profondità è strutturale e tattile. Le ombre sono dure, senza blur, e simulano
oggetti stampati o pulsanti appoggiati sul tabellone. Non servono a decorare ogni
superficie: marcano contenitori principali, azioni e sovrapposizioni.

### Shadow Vocabulary

- **Superficie strutturale** (4px 4px 0 Inchiostro Profondo): card, search bar, filtri e calendario.
- **Controllo sollevato** (3px 3px 0 Inchiostro Profondo): pulsanti e navigazione attiva.
- **Controllo premuto** (1px 1px 0 Inchiostro Profondo, traslazione 2px): feedback active.
- **Dialogo sovrapposto** (8px 8px 0 Inchiostro Profondo): unica elevazione massima.
- **Toast invertito** (4px 4px 0 Giallo Pallina): feedback temporaneo sopra l'app.

**The Physical Feedback Rule.** Un controllo con ombra deve perdere quota quando
viene premuto; con reduced motion la variazione resta cromatica o di ombra senza
traslazione.

## Shapes

La forma è quasi rettangolare e costruita da bordi visibili. Card e superfici
strutturali usano angoli appena smussati (0.25rem); controlli e input usano una
curvatura più confortevole (0.5rem); badge, contatori e chip usano la pillola
completa (9999px) o il cerchio. Il bordo standard è 2px in Inchiostro Profondo,
ridotto a 1px soltanto per separatori e micro-componenti.

**The Ink Holds the Form Rule.** La silhouette viene dal bordo scuro e dalla
geometria, non da gradienti, glow o vetro traslucido.

## Components

I componenti sono espressivi ma disciplinati: usano contrasti forti e feedback
fisico senza compromettere scansione, prevedibilità o accessibilità.

### Buttons

- **Shape:** controllo solido con bordo da 2px, raggio 0.5rem e altezza minima 2.75rem.
- **Primary:** Giallo Pallina su Inchiostro Profondo, padding 0.65rem 1rem e ombra sollevata.
- **Secondary:** Blu Campo con testo Bianco Circolo e la stessa grammatica tattile.
- **Quiet:** Bianco Circolo, senza ombra iniziale; Azzurro Tabellone in hover.
- **Danger:** Rosa Errore con testo Rosso Stop; non affidarsi soltanto al rosso per descrivere l'azione.
- **Hover / Focus / Active:** progressione cromatica, focus da 3px con offset e pressione 2px; nessuna traslazione con reduced motion.

### Chips

- **Style:** pillole compatte con bordo da 1px, corpo pesante e sfondo Alone Pallina.
- **State:** FITP usa Blu Campo, TPRA usa Giallo Pallina; successo, distanza e stato ricevono superfici semantiche distinte.

### Cards / Containers

- **Corner Style:** angolo quasi squadrato da 0.25rem.
- **Background:** Bianco Circolo per il contenuto, Azzurro Tabellone per aree informative.
- **Shadow Strategy:** ombra strutturale dura da 4px.
- **Border:** 2px in Inchiostro Profondo.
- **Internal Padding:** 1rem su mobile, 1.5rem quando lo spazio lo consente.

### Inputs / Fields

- **Style:** fondo Bianco Circolo, bordo da 2px, raggio 0.5rem e altezza minima 2.75rem.
- **Focus:** anello Blu Campo Pressato da 3px con offset 3px.
- **Error / Disabled:** testo esplicito con Rosso Stop oppure coppia Cemento/Ardesia Disattivata.

### Navigation

La navigazione usa etichette condensate e maiuscole. Desktop: link chiari su header
Blu Campo e tab attivo Giallo Pallina con ombra. Mobile: barra inferiore fissa con
tre destinazioni, icona più testo e stato corrente marcato da fondo giallo e barra
inset Blu Campo Pressato.

### Brand Signature

Il wordmark ufficiale è `NEXT/SMASH`: una riga condensata inclinata in avanti, con
slash giallo rinforzato da un'ombra Inchiostro Profondo e tagline maiuscola «Trova
il prossimo torneo». Nell'header il wordmark resta testuale e non viene affiancato
dal monogramma.

Il monogramma NS in `public/brand/logo.png` è la sorgente ufficiale per favicon,
Apple/PWA e anteprime social. Le versioni installabili usano Bianco Circolo come
fondo; le versioni browser mantengono la trasparenza. Non ridisegnare né deformare
il monogramma e non sostituire il wordmark testuale nell'header.

### Tournament Card

La card firma del sistema separa una rotaia data Blu Campo dal corpo Bianco
Circolo. Giorno Giallo Pallina, badge raggruppati, nome ufficiale dominante,
metadati subordinati e link ufficiale chiudono sempre la sequenza di scansione.

### Status, Dialogs and Feedback

Banner e messaggi usano superfici semantiche con testo esplicito. Il dialogo mantiene
la grammatica della card ma sale a 8px di ombra e oscura lo sfondo; i toast invertono
Inchiostro Profondo e Bianco Circolo con un contrappunto Giallo Pallina.

## Do's and Don'ts

### Do:

- **Do** usare i token semantici esistenti invece di valori isolati.
- **Do** mantenere Giallo Pallina raro e legato ad azione, selezione o conteggio prioritario.
- **Do** preservare bordi, ombre dure e feedback pressed come grammatica coerente.
- **Do** progettare con nomi di torneo, circoli e località lunghi e realmente variabili.
- **Do** accompagnare ogni stato cromatico con testo, struttura o icona comprensibile.
- **Do** mantenere target interattivi da almeno 2.75rem e focus sempre visibile.
- **Do** usare `NEXT/SMASH` nell'header e il monogramma solo per icone e condivisione.

### Don't:

- **Don't** trasformare NextSmash in un'interfaccia SaaS generica fatta di card morbide e gradienti.
- **Don't** introdurre nero puro, grigi neutri o nuovi accenti senza un ruolo semantico.
- **Don't** aggiungere ombre sfocate, glow, vetro traslucido o raggi eccessivi.
- **Don't** usare il carattere condensato per paragrafi o lunghi blocchi informativi.
- **Don't** nascondere funzioni essenziali dietro breakpoint desktop.
- **Don't** troncare dati ufficiali quando wrapping o ridistribuzione possono conservarli.
- **Don't** affiancare il monogramma al wordmark nell'header o deformarlo per riempire un formato.
