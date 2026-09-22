// Instructions par defaut de l'analyse IA (barème de notation /10). Ce texte
// peut etre remplace par job via le champ `ai_prompt` — voir aiScore.ts.
export const DEFAULT_AI_INSTRUCTIONS = `En te basant SURTOUT sur le "Contexte" ci-dessus, attribue une note de 0 à 10 évaluant à quel point ce résultat correspond réellement au sujet recherché (et non une simple coïncidence de mots ou un contenu hors-sujet).

Barème :
- 9-10 : correspondance très pertinente et claire par rapport au sujet recherché
- 6-8 : pertinent, à confirmer
- 3-5 : incertain, signal faible ou ambigu
- 0-2 : faux positif (coïncidence de mots, contenu sans rapport avec le sujet)`;
