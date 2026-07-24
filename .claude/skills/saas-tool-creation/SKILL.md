---
name: saas-tool-creation
description: Accélère la création d'un nouvel outil SaaS interne / outil métier avec Claude Code (Next.js + Vercel), en appliquant le stack et la méthode habituels de Clotilde/Sonate Group. Utiliser ce skill dès qu'on démarre un nouveau projet d'outil interne, un dashboard métier, un outil de scraping/automatisation avec interface, ou tout "mini-SaaS" pour un client ou pour Sonate — même si l'utilisatrice ne dit pas explicitement "utilise le skill". Se déclenche sur des phrases comme "je veux créer un outil pour...", "on va faire un nouveau projet Next.js pour...", "un dashboard pour suivre...", "un outil interne qui fait...". Pousse systématiquement les questions de découverte (besoin métier, utilisateurs, données, intégrations) avant d'écrire du code, puis scaffold l'architecture par défaut (Next.js/Vercel/Turso+Drizzle/Supabase Auth/Radix+Tailwind) avec ses variantes documentées.
---

# Créer un outil SaaS interne à la Clotilde/Sonate

Ce skill capture la méthode et le stack utilisés pour construire les outils internes de Sonate Group (ex: `scraper-veille`, un outil de scraping planifié avec export Google Sheets). Le but : ne plus repartir de zéro à chaque nouvel outil — ni sur les questions à poser, ni sur l'architecture de départ.

Deux choses à faire, dans l'ordre : **1) poser les bonnes questions avant de coder**, **2) scaffolder avec le stack par défaut, sauf raison explicite de s'en écarter**.

## 1. Découverte — à faire AVANT d'écrire la moindre ligne de code

Ne pas foncer sur l'implémentation dès que la demande arrive. Même une demande qui semble simple ("fais-moi un outil qui scrape X et l'envoie dans un Sheet") cache des décisions structurantes (auth ou pas, cron ou pas, combien d'utilisateurs) qui coûtent cher à changer après coup. Poser ces questions, quitte à les regrouper en 3-4 questions max si le besoin est déjà clair dans la conversation :

### A. Besoin métier & utilisateurs cibles
- Qui va utiliser l'outil ? (Clotilde seule, l'équipe Sonate, un client final, un mix)
- Quel problème concret ça résout, et à quelle fréquence l'outil sera utilisé (quotidien, ponctuel, en tâche de fond) ?
- Combien d'utilisateurs simultanés potentiels ? (ça tranche vite la question de l'auth multi-utilisateurs vs outil mono-utilisateur)

### B. Données & intégrations
- D'où viennent les données : scraping web, formulaire, API tierce, upload de fichier, saisie manuelle ?
- Faut-il une authentification ? Si oui, mono-utilisateur (un simple accès protégé) ou multi-utilisateurs avec comptes ?
- Quelles connexions externes sont nécessaires : Google Sheets, Make.com, Slack, un CRM, une autre API ? (voir `references/integrations.md`)
- Faut-il des tâches planifiées (cron) ou tout se déclenche à la demande ?
- Faut-il exporter les données, et sous quel format (CSV, Google Sheets, PDF) ?

Ne pas s'arrêter là si une réponse a des implications fortes (ex: "multi-utilisateurs avec rôles différents" ou "des millions de lignes") — creuser un peu plus, mais sans transformer ça en questionnaire interminable. L'objectif est de trancher le stack et l'architecture, pas de produire un cahier des charges.

## 2. Stack par défaut

Par défaut, sauf raison explicite de s'en écarter (contrainte client, stack imposée, besoin très spécifique) :

| Brique | Défaut | Variante si... |
|---|---|---|
| Framework | Next.js (App Router) + TypeScript | — (rarement de raison de changer) |
| Hébergement | Vercel | Si besoin de jobs très longs (>5min) ou de gros compute, envisager un service séparé (Railway, VM) appelé depuis Next.js |
| Base de données | Turso (libsql) + Drizzle ORM | Si besoin relationnel plus lourd (jointures complexes, gros volumes) → Postgres (Neon ou Supabase DB) + Drizzle |
| Auth | Supabase Auth (email/password ou magic link) | Si outil mono-utilisateur interne protégé autrement (VPN, accès réseau restreint) → pas d'auth du tout |
| UI | Tailwind CSS + Radix UI (primitives type shadcn) + lucide-react (icônes) + sonner (toasts) + next-themes (dark mode) | Quasi jamais de raison de changer, c'est le kit standard |
| Tâches planifiées | Route `/api/cron/run` + `vercel.json` (Vercel Cron) | Si fréquence < 1x/jour nécessaire sur un plan Vercel qui ne le permet pas → déclencher via Make.com/webhook externe à la place |

Détail des commandes d'installation et des fichiers de config type : voir `references/stack-setup.md`.

## 3. Architecture par défaut du projet

Structure de dossiers à répliquer (basée sur `scraper-veille`) :

```
src/
├── app/
│   ├── api/
│   │   ├── auth/                  # login/logout si auth activée
│   │   ├── cron/run/route.ts      # point d'entrée appelé par Vercel Cron
│   │   └── <feature>/             # routes API métier (jobs, résultats, urls...)
│   ├── login/, auth/callback/      # pages d'auth si activée
│   ├── layout.tsx, page.tsx
│   └── globals.css
├── components/
│   ├── ui/                        # primitives Radix/shadcn-like (button, dialog, select...)
│   ├── AppShell.tsx                # layout applicatif (nav, header)
│   ├── ConfirmDialog.tsx           # confirmation générique avant action destructive
│   └── <feature>/                 # composants métier (ex: scraper/, dashboard/...)
├── contexts/
│   ├── ConfirmDialogContext.tsx    # pour déclencher une confirmation depuis n'importe où
│   └── SupabaseAuthContext.tsx     # si auth activée
├── hooks/
│   └── use<Feature><Entity>.ts     # logique data côté client (ex: useSupabaseScrapeJobs.ts)
├── lib/
│   ├── db/
│   │   ├── schema.ts               # schéma Drizzle
│   │   └── index.ts                 # client Drizzle + connexion
│   ├── supabase/                   # client.ts, server.ts, middleware.ts (si auth)
│   ├── activityLogger.ts           # log des actions importantes (audit léger)
│   ├── serverOrchestrator.ts        # orchestration des tâches longues côté serveur
│   └── export.ts                    # génération d'exports (CSV, etc.)
└── types/
    └── index.ts
```

Points d'architecture à ne pas oublier, même sur un petit outil :
- **`ConfirmDialogContext`** : toute action destructive (suppression, reset) passe par une confirmation générique, pas une popup ad hoc à chaque fois.
- **`activityLogger`** : même un outil interne simple bénéficie d'un log minimal des actions (qui a fait quoi, quand) — ça évite les "c'est qui qui a supprimé ça ?" plus tard.
- **`serverOrchestrator`** : dès qu'une tâche dépasse quelques secondes (scraping, traitement en masse), la logique d'exécution/suivi de progression vit côté serveur dans un orchestrateur dédié, pas éparpillée dans les routes API.
- **Route de cron dédiée** (`/api/cron/run`) qui va chercher ce qu'il y a à faire (jobs planifiés arrivés à échéance) plutôt que plusieurs endpoints de cron séparés.

## 4. Intégrations externes

Google Sheets (export/sync) et Make.com (connecter l'outil à d'autres services) sont les intégrations les plus fréquentes. Patterns et snippets prêts à réutiliser : voir `references/integrations.md`.

## 5. Checklist de démarrage rapide

1. Poser les questions de la section 1 (découverte).
2. Trancher le stack (section 2) — noter explicitement les écarts par rapport au défaut et pourquoi.
3. Scaffolder l'arborescence (section 3).
4. Mettre en place le stack de base en suivant `references/stack-setup.md` (DB, auth si besoin, UI kit).
5. Brancher les intégrations nécessaires via `references/integrations.md`.
6. Construire la feature métier au centre (le scraping, le dashboard, le formulaire...) — c'est la seule partie vraiment spécifique à ce projet, tout le reste est réutilisable.
7. Déployer sur Vercel, vérifier le cron si applicable.
