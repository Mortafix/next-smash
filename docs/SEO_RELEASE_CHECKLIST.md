# Checklist di rilascio brand e SEO

Questa checklist completa la pubblicazione del nuovo brand NextSmash. Non esegue né
autorizza il deploy sul server.

## Prima del deploy

- Eseguire `pnpm typecheck`, `pnpm test`, `pnpm lint`, `pnpm build` e
  `pnpm test:e2e`.
- Verificare che il diff contenga soltanto le modifiche previste per brand e SEO.
- Controllare il wordmark a 320, 768 e 1440 px e la leggibilità delle icone a 16 e
  32 px.

## Dopo il deploy

- Aprire `https://smash.moris.dev/tornei` e verificare titolo, favicon e canonical.
- Controllare che `/robots.txt`, `/sitemap.xml` e `/manifest.webmanifest`
  rispondano con stato 200.
- Verificare che la sitemap contenga soltanto `/tornei` e `/calendario`.
- Validare il JSON-LD con Google Rich Results Test o Schema Markup Validator.
- Controllare la social card con i debugger Open Graph delle piattaforme usate.
- Inviare la sitemap a Google Search Console quando la proprietà del dominio è
  disponibile.
