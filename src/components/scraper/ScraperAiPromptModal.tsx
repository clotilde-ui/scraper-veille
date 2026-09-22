'use client';

import { useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { DEFAULT_AI_INSTRUCTIONS } from '@/lib/aiPromptDefaults';

interface ScraperAiPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  initialPrompt: string | null;
  onSaved: (newPrompt: string | null) => void;
}

export function ScraperAiPromptModal({ isOpen, onClose, jobId, initialPrompt, onSaved }: ScraperAiPromptModalProps) {
  const [text, setText] = useState(initialPrompt?.trim() || DEFAULT_AI_INSTRUCTIONS);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const trimmed = text.trim();
      const aiPrompt = trimmed === '' ? null : trimmed;
      const res = await fetch(`/api/scraper/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiPrompt }),
      });
      if (!res.ok) {
        toast.error("Erreur lors de l'enregistrement du prompt");
        return;
      }
      onSaved(aiPrompt);
      toast.success('Prompt IA enregistré pour ce job');
      onClose();
    } catch {
      toast.error("Erreur lors de l'enregistrement du prompt");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="bg-white dark:bg-slate-800 border-none shadow-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 sm:rounded-2xl [&>button:last-child]:hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-500" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Prompt d&apos;analyse IA de ce job</h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Ces instructions guident l&apos;IA pour noter de 0 à 10 la pertinence de chaque correspondance de mots-clés de <strong>ce job uniquement</strong>. Le nom du projet, la source, les mots-clés et le contexte sont ajoutés automatiquement avant ce texte ; la consigne de réponse (un nombre de 0 à 10) est ajoutée après.
          </p>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={14}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 font-mono text-sm"
          />
          <button
            type="button"
            onClick={() => setText(DEFAULT_AI_INSTRUCTIONS)}
            className="text-sm text-violet-600 dark:text-violet-400 hover:underline"
          >
            Réinitialiser au texte par défaut
          </button>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-violet-500 text-white text-sm font-medium rounded-lg hover:bg-violet-600 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
