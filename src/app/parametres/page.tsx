'use client';

import { useState, useEffect, useCallback } from 'react';
import { KeyRound, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AI_MODEL_OPTIONS, DEFAULT_AI_MODEL } from '@/lib/aiModels';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [aiModel, setAiModel] = useState(DEFAULT_AI_MODEL);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setHasApiKey(Boolean(data.hasApiKey));
        setAiModel(data.aiModel || DEFAULT_AI_MODEL);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKeyInput, aiModel }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Erreur lors de la sauvegarde des paramètres', { duration: 10000 });
        return;
      }
      const data = await res.json();
      setHasApiKey(Boolean(data.hasApiKey));
      setApiKeyInput('');
      toast.success('Paramètres enregistrés');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde des paramètres', { duration: 10000 });
    } finally {
      setSaving(false);
    }
  };

  const handleClearKey = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clearApiKey: true, aiModel }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Erreur lors de la suppression de la clé', { duration: 10000 });
        return;
      }
      setHasApiKey(false);
      setApiKeyInput('');
      toast.success('Clé API retirée');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la suppression de la clé', { duration: 10000 });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500 dark:text-slate-400">
        Chargement des paramètres...
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Paramètres</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Configure la connexion à OpenRouter pour activer l&apos;analyse IA des résultats de scraping.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-violet-500" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Analyse IA (OpenRouter)</h2>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Clé API OpenRouter
            {hasApiKey && <span className="ml-2 text-xs font-normal text-emerald-600 dark:text-emerald-400">Configurée</span>}
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                value={apiKeyInput}
                onChange={e => setApiKeyInput(e.target.value)}
                placeholder={hasApiKey ? 'Laisser vide pour conserver la clé actuelle' : 'sk-or-v1-...'}
                className="w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              />
            </div>
            {hasApiKey && (
              <button
                onClick={handleClearKey}
                disabled={saving}
                className="px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                Retirer la clé
              </button>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Trouvable sur <span className="font-mono">openrouter.ai/keys</span>. La clé est stockée côté serveur et n&apos;est jamais renvoyée au navigateur.
          </p>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Modèle IA</label>
          <Select value={aiModel} onValueChange={setAiModel}>
            <SelectTrigger className="w-full text-sm">
              <SelectValue placeholder="Choisir un modèle" />
            </SelectTrigger>
            <SelectContent>
              {AI_MODEL_OPTIONS.map(m => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Utilisé pour noter de 0 à 10 la pertinence de chaque correspondance de mots-clés.
          </p>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Sauvegarde...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}
