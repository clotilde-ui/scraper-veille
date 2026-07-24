# Intégrations externes fréquentes

## Google Sheets (export / sync)

Pattern habituel : pas d'API Google Sheets directe côté Next.js (ça demande OAuth ou un compte de service à gérer), mais un **webhook Make.com** qui reçoit les données et les pousse dans le Sheet. Ça évite de gérer des credentials Google dans l'app, et ça laisse la logique de mapping de colonnes côté Make (modifiable sans redéployer le code).

`src/lib/sendToSheets.ts` (squelette) :
```ts
export async function sendToSheets(webhookUrl: string, rows: Record<string, unknown>[]) {
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows }),
  });

  if (!res.ok) {
    throw new Error(`Envoi vers Google Sheets échoué: ${res.status}`);
  }
}
```

Côté Make : un scénario avec un module "Webhook" en trigger, puis un module Google Sheets "Add a Row" (ou "Update a Row" si on veut de l'upsert). L'URL du webhook Make est stockée en base par job/utilisateur (ex: colonne `googleSheetsWebhookUrl`), pas en dur dans le code — chaque utilisateur/job peut avoir sa propre destination.

Si le besoin est un export ponctuel plutôt qu'une sync continue, préférer un simple export CSV téléchargeable (`src/lib/export.ts`) — plus simple, pas de dépendance externe.

## Make.com (connecter l'outil à d'autres services)

Utiliser Make dès que l'outil doit parler à un service tiers pour lequel on ne veut pas coder d'intégration directe (Slack, CRM, autre API) — plus rapide à mettre en place et à faire évoluer qu'un client API custom, surtout si le volume est faible/moyen.

Deux sens de communication à distinguer :
- **App → Make** : l'app envoie un événement à un webhook Make (ex: nouveau résultat de scraping → notif Slack). Pattern identique à `sendToSheets` ci-dessus : un `fetch` POST vers l'URL du webhook.
- **Make → App** : Make appelle une route API de l'app pour déclencher une action (ex: un scénario planifié dans Make qui vient lancer un job). Dans ce cas, protéger la route par un secret partagé (header `Authorization` vérifié côté route), même si l'outil n'a pas d'auth utilisateur classique.

Pour la conception du scénario Make lui-même (modules, error handlers, structure du blueprint), passer par le skill `make-scenario-expert` plutôt que de tout refaire ici.

## Slack (notifications)

Le plus simple : un webhook entrant Slack (Incoming Webhook) appelé directement en `fetch` depuis l'app, sans passer par Make, si c'est la seule intégration nécessaire (pas besoin de la flexibilité de Make pour un simple message). Si Slack fait partie d'un flux plus large avec d'autres services, le faire passer par le même scénario Make que les autres intégrations plutôt que de multiplier les webhooks épars.

## Choisir entre intégration directe et Make.com

- Un seul service, appel simple (webhook entrant, pas de logique de mapping) → intégration directe (`fetch` dans `lib/`).
- Plusieurs services, logique de routage/mapping/transformation, ou destination amenée à changer souvent → Make.com.
- En cas de doute sur l'architecture d'automatisation à choisir (pas seulement Make), passer par le skill `architecte-automatisation`.
