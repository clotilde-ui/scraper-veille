export interface AiModelOption {
  value: string;
  label: string;
}

// Sélection de modèles OpenRouter courants, adaptés à une tâche de notation
// simple (une note de 0 à 10) : rapides et économiques en priorité.
export const AI_MODEL_OPTIONS: AiModelOption[] = [
  { value: 'anthropic/claude-3.5-haiku', label: 'Claude Haiku 3.5 (rapide, économique)' },
  { value: 'anthropic/claude-sonnet-4.5', label: 'Claude Sonnet 4.5 (plus précis)' },
  { value: 'openai/gpt-4o-mini', label: 'GPT-4o mini' },
  { value: 'google/gemini-2.0-flash-001', label: 'Gemini 2.0 Flash' },
  { value: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B' },
];

export const DEFAULT_AI_MODEL = AI_MODEL_OPTIONS[0].value;
