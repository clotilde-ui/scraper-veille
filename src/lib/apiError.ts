// Extrait un message d'erreur exploitable pour la réponse API, afin que
// l'utilisateur sache quoi corriger au lieu d'un "Erreur serveur" générique.
// Descend dans la chaîne `cause` : les erreurs Drizzle/libSQL enveloppent le
// message SQL brut (peu lisible) autour de la vraie cause (ex: "NOT NULL
// constraint failed: scrape_jobs.name"), qui est plus utile à afficher.
export function errorMessage(error: unknown, fallback: string): string {
  let current: unknown = error;
  let message = fallback;
  while (current instanceof Error) {
    if (current.message) message = current.message;
    current = current.cause;
  }
  return message;
}
