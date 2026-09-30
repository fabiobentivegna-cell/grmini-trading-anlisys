import React, { useState, useEffect } from 'react';
import { X, KeyRound, Check, Download } from 'lucide-react';
import { ApiKeysConfig } from '../types';
import { storageService } from '../services/storageService';

interface ApiHubModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApiHubModal: React.FC<ApiHubModalProps> = ({ isOpen, onClose }) => {
  const [keys, setKeys] = useState<ApiKeysConfig>(storageService.getApiKeys());
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setKeys(storageService.getApiKeys());
      setSavedSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (field: keyof ApiKeysConfig, value: string) => {
    setKeys(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    storageService.saveApiKeys(keys);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  const handleExportConfigJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(keys, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'config.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4">
      <div className="bg-[var(--bg-header)] border border-[var(--border-color)] rounded-xl shadow-2xl w-full max-w-lg overflow-hidden text-xs">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-2 font-bold text-sm text-[var(--text-main)] uppercase tracking-wide">
            <KeyRound className="w-4 h-4 text-amber-500" />
            <span>Gestione Chiavi API & Provider Finanziari</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <div className="p-4 space-y-3">
          <p className="text-[var(--text-muted)] text-[11px] leading-relaxed">
            Le chiavi API vengono salvate in modo sicuro nel tuo browser (localStorage) e possono essere esportate in un file <code className="px-1 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border-color)] text-blue-500">config.json</code> compatibile con la versione Desktop Python.
          </p>

          <div className="space-y-1">
            <label className="font-semibold text-[11px] text-[var(--text-muted)]">
              Google Gemini API Key (Analisi Sentiment & Audit Fondamentale AI):
            </label>
            <input
              type="password"
              value={keys.GEMINI_API_KEY}
              onChange={e => handleChange('GEMINI_API_KEY', e.target.value)}
              placeholder="AIzaSy..."
              className="w-full px-2.5 py-1.5 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] outline-none font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-[11px] text-[var(--text-muted)]">
              Alpha Vantage API Key:
            </label>
            <input
              type="password"
              value={keys.ALPHAVANTAGE_API_KEY}
              onChange={e => handleChange('ALPHAVANTAGE_API_KEY', e.target.value)}
              placeholder="O8X7..."
              className="w-full px-2.5 py-1.5 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] outline-none font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-[11px] text-[var(--text-muted)]">
              Finnhub API Key:
            </label>
            <input
              type="password"
              value={keys.FINNHUB_API_KEY}
              onChange={e => handleChange('FINNHUB_API_KEY', e.target.value)}
              placeholder="c9x..."
              className="w-full px-2.5 py-1.5 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] outline-none font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-[11px] text-[var(--text-muted)]">
              NewsAPI Key:
            </label>
            <input
              type="password"
              value={keys.NEWSAPI_KEY}
              onChange={e => handleChange('NEWSAPI_KEY', e.target.value)}
              placeholder="84bc..."
              className="w-full px-2.5 py-1.5 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] outline-none font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-[11px] text-[var(--text-muted)]">
              FRED API Key (St. Louis Federal Reserve Macro Data):
            </label>
            <input
              type="password"
              value={keys.FRED_API_KEY}
              onChange={e => handleChange('FRED_API_KEY', e.target.value)}
              placeholder="49a7..."
              className="w-full px-2.5 py-1.5 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] outline-none font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-[11px] text-[var(--text-muted)]">
              Twelve Data API Key:
            </label>
            <input
              type="password"
              value={keys.TWELVE_DATA_API_KEY}
              onChange={e => handleChange('TWELVE_DATA_API_KEY', e.target.value)}
              placeholder="1a2b..."
              className="w-full px-2.5 py-1.5 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] outline-none font-mono"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-3 border-t border-[var(--border-color)] bg-[var(--bg-card)]">
          <button
            onClick={handleExportConfigJson}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[var(--border-color)] hover:bg-[var(--border-color)] text-[var(--text-main)] font-medium transition"
            title="Scarica config.json per la versione Python"
          >
            <Download className="w-3.5 h-3.5 text-blue-500" />
            <span>Esporta config.json</span>
          </button>

          <div className="flex items-center gap-2">
            {savedSuccess && (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                <Check className="w-4 h-4" />
                <span>Salvate con successo!</span>
              </span>
            )}
            <button
              onClick={handleSave}
              className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold transition"
            >
              Salva Chiavi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
