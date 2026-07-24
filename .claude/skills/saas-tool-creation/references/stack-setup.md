# Setup du stack par défaut

Snippets et commandes pour partir vite sur le stack standard décrit dans `SKILL.md`. Tout ceci est générique — pas de secrets, pas d'URL réelle, à adapter au projet.

## 1. Projet Next.js + TypeScript

```bash
npx create-next-app@latest mon-outil --typescript --tailwind --app --eslint
cd mon-outil
```

## 2. Base de données : Turso (libsql) + Drizzle ORM

```bash
npm install drizzle-orm @libsql/client
npm install -D drizzle-kit
```

`drizzle.config.ts` :
```ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'turso',
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  },
});
```

`src/lib/db/index.ts` :
```ts
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });
```

`src/lib/db/schema.ts` : définir les tables avec `sqliteTable` (voir la doc Drizzle). Convention : `id` en `text` (uuid généré côté app), `createdAt`/`updatedAt` en `text` (ISO string).

**Variante Postgres (Neon/Supabase DB)** : remplacer `@libsql/client` par `postgres` ou `@neondatabase/serverless`, et utiliser `drizzle-orm/postgres-js` (ou `neon-http`) + `pgTable` au lieu de `sqliteTable`. À réserver aux cas avec jointures complexes ou gros volumes — pour un outil interne classique, Turso suffit et est plus simple à opérer.

## 3. Auth : Supabase Auth

```bash
npm install @supabase/supabase-js @supabase/ssr
```

Trois clients à prévoir dans `src/lib/supabase/` :
- `client.ts` — client navigateur (`createBrowserClient`)
- `server.ts` — client serveur pour Server Components/Route Handlers (`createServerClient`), + un `createAdminClient` avec la service role key si besoin d'opérations admin
- `middleware.ts` — `updateSession` appelé depuis `middleware.ts` à la racine pour rafraîchir la session sur chaque requête

Pages minimales : `/login` (formulaire email/password ou lien magique) et `/auth/callback` (échange du code contre une session).

**Variante sans auth** : si l'outil est mono-utilisateur et protégé autrement (accès réseau, lien privé non indexé), ne pas installer Supabase Auth du tout — ça évite de la complexité inutile. Dans ce cas, protéger éventuellement les routes API sensibles par un simple header/token partagé plutôt que de faire du vrai contrôle d'accès.

## 4. UI : Tailwind + Radix + compléments

```bash
npm install @radix-ui/react-dialog @radix-ui/react-alert-dialog @radix-ui/react-select @radix-ui/react-slot
npm install class-variance-authority clsx tailwind-merge tailwindcss-animate
npm install lucide-react sonner next-themes
```

- `src/components/ui/` : wrapper chaque primitive Radix utilisée (button, dialog, alert-dialog, select) avec les classes Tailwind du design system du projet — même logique que shadcn/ui, sans forcément passer par leur CLI.
- `sonner` pour les toasts de feedback (succès/erreur d'action).
- `next-themes` pour le dark mode si le projet en a besoin.

## 5. Cron planifié sur Vercel

`vercel.json` :
```json
{
  "framework": "nextjs",
  "crons": [
    { "path": "/api/cron/run", "schedule": "0 8 * * *" }
  ]
}
```

`src/app/api/cron/run/route.ts` : ce handler va chercher en base ce qui est arrivé à échéance (jobs planifiés dont `nextRunAt <= now`) et lance leur traitement via l'orchestrateur — plutôt que de créer un endpoint de cron par type de tâche.

Vérifier le plan Vercel utilisé : la fréquence minimale des crons dépend du plan (Hobby = 1x/jour). Si un besoin de fréquence plus fine se présente sur un plan qui ne le permet pas, déclencher le job depuis un scénario Make.com (webhook programmé) plutôt que de changer de plan par défaut.
