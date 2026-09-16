# Factoring Finans – tilbudsquiz

Next.js-app (App Router, TypeScript, Tailwind) som samler inn leads for Factoring Finans
gjennom en 11-stegs quiz. Hvert svar lagres progressivt til Supabase (`leads`-tabellen),
nøkkelt på en `session_id` lagret i besøkendes nettleser, slik at man kan gå tilbake og
endre svar underveis uten å miste fremgang.

## Kom i gang lokalt

```bash
npm install
npm run dev
```

Åpne [http://localhost:3000](http://localhost:3000).

## Miljøvariabler

Appen trenger følgende i `.env.local` (server-only, brukes aldri i klienten siden RLS er
avslått på `leads`-tabellen):

```
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## Struktur

- `src/lib/quiz-config.ts` — alle spørsmål, valg og forgreningslogikk
- `src/components/QuizFunnel.tsx` — quiz-flyten (state, lagring, tilbake-navigasjon)
- `src/app/api/lead/route.ts` — server-rute som upserter svar til Supabase
