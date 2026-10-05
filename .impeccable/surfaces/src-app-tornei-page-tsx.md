---
version: 1
slug: "src-app-tornei-page-tsx"
primary_target: "src/app/tornei/page.tsx"
related_targets: ["src/components/tournaments/tournament-explorer.tsx","src/components/tournaments/tournament-card.tsx","src/components/tournaments/tournament-detail-dialog.tsx","src/components/tournaments/filter-panel.tsx","src/components/calendar/tournament-calendar.tsx","src/app/profilo/page.tsx","src/components/preferences/preferences-manager.tsx","src/app/product.css"]
---

## Direction contract

THESIS: Il dettaglio sale dal tabellone senza perdere il contesto; rifiuta la pagina separata e il modal SaaS generico.

OWN-WORLD: Bianco Circolo, rotaia Giallo Pallina, struttura Blu Campo, bordi Inchiostro da 2px e ombra dura da 8px.

STORY: La persona apre il titolo, legge dati e iscritti, salva il torneo nel Profilo, scarica l'immagine o condivide il link e raggiunge la fonte ufficiale per iscriversi.

FIRST VIEWPORT: Dialogo centrato con testata compatta, data, fonte e stato; poi dettagli e blocco iscritti. Il footer usa download e condivisione Giallo Pallina con sole icone ed etichette accessibili, Salva Azzurro Tabellone e Iscriviti Blu Campo Pressato, sopra un overlay leggero.

FORM: Estensione locale Operate, unica direzione derivata dal brief; seed key local-extension-no-roll.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Local extension behavior

- Profilo sostituisce Preferenze e raccoglie tornei e ricerche salvati nel browser,
  senza account. Il salvataggio del torneo si trova soltanto nel dialogo; non è
  presente la sezione Filtri di partenza.
- Zona è una selezione singola tra Nord, Centro e Sud e isole: applica l'intero
  insieme di regioni corrispondente. La scelta manuale delle regioni riconosce una
  zona soltanto quando l'insieme è completo ed esatto.
- Dal calendario il dettaglio resta sulla stessa route e conserva mese, giorno,
  scroll e cronologia del browser; alla chiusura il focus torna al titolo aperto.
