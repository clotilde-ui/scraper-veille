'use client';

import { useState, useRef } from 'react';
import { X, Upload, ChevronRight, ChevronLeft, FileText, Globe, Search, Check } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { SCRAPE_TYPES } from '@/types';
import type { ScrapeType } from '@/types';

interface NewJobConfig {
  name: string;
  urls: string[];
  scrapeType: string; // JSON array of ScrapeType[]
  crawlDepth: number;
  keywords: { include: string[]; exclude: string[] };
}

interface ScraperNewJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (config: NewJobConfig) => void;
}

type Step = 1 | 2 | 3;

export function ScraperNewJobModal({ isOpen, onClose, onSubmit }: ScraperNewJobModalProps) {
  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState('');
  const [urlsText, setUrlsText] = useState('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [scrapeTypes, setScrapeTypes] = useState<ScrapeType[]>(['pdfs']);
  const [crawlDepth, setCrawlDepth] = useState(1);
  const [keywordsText, setKeywordsText] = useState('');
  const [excludeKeywordsText, setExcludeKeywordsText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parsedUrls = urlsText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && (line.startsWith('http://') || line.startsWith('https://')));

  const parsedKeywords = keywordsText
    .split(',')
    .map(k => k.trim())
    .filter(k => k.length > 0);

  const parsedExcludeKeywords = excludeKeywordsText
    .split(',')
    .map(k => k.trim())
    .filter(k => k.length > 0);

  const handleCsvUpload = async (file: File) => {
    setCsvFile(file);
    const text = await file.text();
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    // Détecter header (si la première ligne ne ressemble pas à une URL)
    const firstLine = lines[0] || '';
    const startIdx = (firstLine.startsWith('http://') || firstLine.startsWith('https://')) ? 0 : 1;

    const urls: string[] = [];
    for (let i = startIdx; i < lines.length; i++) {
      const line = lines[i];
      // Prendre la première colonne (CSV simple)
      const cols = line.split(',');
      const url = cols[0].replace(/^["']|["']$/g, '').trim();
      if (url.startsWith('http://') || url.startsWith('https://')) {
        urls.push(url);
      }
    }

    if (urls.length > 0) {
      setUrlsText(urls.join('\n'));
      if (!name) setName(file.name.replace(/\.\w+$/, ''));
    }
  };

  const toggleType = (t: ScrapeType) => {
    setScrapeTypes(prev =>
      prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
    );
  };

  const needsKeywords = scrapeTypes.includes('keywords');

  const handleSubmit = () => {
    if (parsedUrls.length === 0 || !name.trim()) return;
    onSubmit({
      name: name.trim(),
      urls: parsedUrls,
      scrapeType: JSON.stringify(scrapeTypes),
      crawlDepth,
      keywords: needsKeywords
        ? { include: parsedKeywords, exclude: parsedExcludeKeywords }
        : { include: [], exclude: [] },
    });
    // Reset
    setStep(1);
    setName('');
    setUrlsText('');
    setCsvFile(null);
    setScrapeTypes(['pdfs']);
    setCrawlDepth(1);
    setKeywordsText('');
    setExcludeKeywordsText('');
    onClose();
  };

  const canNext = (s: Step) => {
    if (s === 1) return parsedUrls.length > 0 && name.trim().length > 0;
    if (s === 2) {
      if (scrapeTypes.length === 0) return false;
      if (needsKeywords && parsedKeywords.length === 0) return false;
      return true;
    }
    return true;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="bg-white dark:bg-slate-800 border-none shadow-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 sm:rounded-2xl [&>button:last-child]:hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Nouveau scraping</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Étape {step}/3 — {step === 1 ? 'URLs' : step === 2 ? 'Configuration' : 'Confirmation'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-2 px-6 py-3 bg-slate-50 dark:bg-slate-900/50">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                s < step ? 'bg-emerald-500 text-white' :
                s === step ? 'bg-blue-500 text-white' :
                'bg-slate-200 dark:bg-slate-700 text-slate-500'
              }`}>
                {s < step ? <Check className="w-4 h-4" /> : s}
              </div>
              {s < 3 && <div className={`w-12 h-0.5 ${s < step ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`} />}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {step === 1 && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nom du job</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ex: Scraping sites concurrents"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Importer un fichier CSV
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handleCsvUpload(file);
                  }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-colors w-full justify-center"
                >
                  <Upload className="w-4 h-4" />
                  {csvFile ? csvFile.name : 'Choisir un fichier CSV'}
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  URLs (une par ligne)
                  <span className="text-slate-400 font-normal ml-2">{parsedUrls.length} URL{parsedUrls.length !== 1 ? 's' : ''} détectée{parsedUrls.length !== 1 ? 's' : ''}</span>
                </label>
                <textarea
                  value={urlsText}
                  onChange={e => setUrlsText(e.target.value)}
                  placeholder={"https://example.com\nhttps://example.org\nhttps://example.net"}
                  rows={8}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Type de scraping
                  <span className="text-slate-400 font-normal ml-2">sélection multiple</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {SCRAPE_TYPES.filter(t => t.value !== 'all').map(t => {
                    const selected = scrapeTypes.includes(t.value);
                    return (
                      <button
                        key={t.value}
                        onClick={() => toggleType(t.value)}
                        className={`flex items-start gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                          selected
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <div className={`p-1.5 rounded-lg ${t.bgColor}`}>
                            {t.value === 'links' && <Globe className={`w-4 h-4 ${t.color}`} />}
                            {t.value === 'pdfs' && <FileText className={`w-4 h-4 ${t.color}`} />}
                            {t.value === 'keywords' && <Search className={`w-4 h-4 ${t.color}`} />}
                          </div>
                          {selected && <Check className="w-3 h-3 text-blue-500" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">{t.label}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{t.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Profondeur de crawl
                </label>
                <div className="flex items-center gap-3">
                  {[1, 2, 3].map(d => (
                    <button
                      key={d}
                      onClick={() => setCrawlDepth(d)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        crawlDepth === d
                          ? 'bg-blue-500 text-white'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {crawlDepth === 1 ? 'Page directe uniquement' : `Suivre les liens jusqu'à ${crawlDepth} niveaux`}
                  </span>
                </div>
              </div>

              {needsKeywords && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Mots-clés à rechercher
                      <span className="text-slate-400 font-normal ml-2">{parsedKeywords.length} mot{parsedKeywords.length !== 1 ? 's' : ''}-clé{parsedKeywords.length !== 1 ? 's' : ''}</span>
                    </label>
                    <input
                      type="text"
                      value={keywordsText}
                      onChange={e => setKeywordsText(e.target.value)}
                      placeholder="Ex: tarif, contact, pdf, télécharger"
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Mots-clés à exclure
                      <span className="text-slate-400 font-normal ml-2">optionnel</span>
                    </label>
                    <input
                      type="text"
                      value={excludeKeywordsText}
                      onChange={e => setExcludeKeywordsText(e.target.value)}
                      placeholder="Ex: gratuit, archive, ancien"
                      className="w-full px-3 py-2 border border-red-200 dark:border-red-800 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-red-400 focus:border-red-400"
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="font-medium text-slate-900 dark:text-white">Récapitulatif</h3>

              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Nom</span>
                  <span className="font-medium text-slate-900 dark:text-white">{name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">URLs à scraper</span>
                  <span className="font-medium text-slate-900 dark:text-white">{parsedUrls.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Types</span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {scrapeTypes.map(v => SCRAPE_TYPES.find(t => t.value === v)?.label).join(', ')}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Profondeur</span>
                  <span className="font-medium text-slate-900 dark:text-white">{crawlDepth}</span>
                </div>
                {parsedKeywords.length > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Mots-clés</span>
                    <span className="font-medium text-slate-900 dark:text-white">{parsedKeywords.join(', ')}</span>
                  </div>
                )}
                {parsedExcludeKeywords.length > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Exclusions</span>
                    <span className="font-medium text-red-600 dark:text-red-400">{parsedExcludeKeywords.join(', ')}</span>
                  </div>
                )}
              </div>

              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 text-sm text-amber-700 dark:text-amber-400">
                Le scraping sera lancé automatiquement. Vous pourrez mettre en pause ou annuler à tout moment.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={() => step > 1 ? setStep((step - 1) as Step) : onClose()}
            className="flex items-center gap-1 px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            {step > 1 ? 'Retour' : 'Annuler'}
          </button>

          {step < 3 ? (
            <button
              onClick={() => setStep((step + 1) as Step)}
              disabled={!canNext(step)}
              className="flex items-center gap-1 px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Suivant
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="flex items-center gap-1 px-6 py-2 bg-emerald-500 text-white text-sm font-medium rounded-lg hover:bg-emerald-600 transition-colors"
            >
              <Globe className="w-4 h-4" />
              Lancer le scraping
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
