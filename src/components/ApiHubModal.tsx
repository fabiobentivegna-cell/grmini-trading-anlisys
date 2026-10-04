import React, { useState, useEffect, useRef } from 'react';
import { X, KeyRound, Check, Download, Upload, FileCode, Sparkles, Activity } from 'lucide-react';
import { ApiKeysConfig } from '../types';
import { storageService } from '../services/storageService';

interface ApiHubModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApiHubModal: React.FC<ApiHubModalProps> = ({ isOpen, onClose }) => {
  const [keys, setKeys] = useState<ApiKeysConfig>(storageService.getApiKeys());
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [pasteMode, setPasteMode] = useState(false);
  const [rawJsonText, setRawJsonText] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'form' | 'json'>('form');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const localKeys = storageService.getApiKeys();
      setKeys(localKeys);
      setSavedSuccess(false);
      setJsonError(null);

      fetch('/api/config')
        .then(res => res.json())
        .then(data => {
          if (data.status === 'success' && data.keys) {
            setKeys(prev => {
              const merged = { ...prev, ...data.keys };
              storageService.saveApiKeys(merged);
              return merged;
            });
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (field: keyof ApiKeysConfig, value: string) => {
    setKeys(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    storageService.saveApiKeys(keys);

    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(keys)
      });
    } catch (e) {
      console.warn('Backend config sync warning:', e);
    }

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  const parseAndApplyJson = (jsonObj: any) => {
    const updated: ApiKeysConfig = { ...keys };
    let foundCount = 0;

    for (const [k, v] of Object.entries(jsonObj)) {
      if (typeof v !== 'string' && typeof v !== 'number') continue;
      const val = String(v).trim();
      const cleanK = k.toUpperCase().replace(/[-_.]/g, '');

      if (cleanK.includes('GEMINI')) {
        updated.GEMINI_API_KEY = val;
        foundCount++;
      } else if (cleanK.includes('ALPHAVANTAGE') || cleanK === 'ALPHA' || cleanK === 'AV') {
        updated.ALPHAVANTAGE_API_KEY = val;
        foundCount++;
      } else if (cleanK.includes('FINNHUB')) {
        updated.FINNHUB_API_KEY = val;
        foundCount++;
      } else if (cleanK.includes('NEWSAPI') || cleanK === 'NEWS') {
        updated.NEWSAPI_KEY = val;
        foundCount++;
      } else if (cleanK.includes('TWELVEDATA') || cleanK.includes('TWELVE') || cleanK === 'TD') {
        updated.TWELVE_DATA_API_KEY = val;
        foundCount++;
      } else if (cleanK.includes('FRED')) {
        updated.FRED_API_KEY = val;
        foundCount++;
      }
    }

    setKeys(updated);
    storageService.saveApiKeys(updated);

    fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    }).catch(() => {});

    return foundCount;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        parseAndApplyJson(parsed);
        setJsonError(null);
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 2000);
      } catch (err: any) {
        setJsonError(`Errore nel formato JSON: ${err.message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleApplyPastedJson = () => {
    if (!rawJsonText.trim()) return;
    try {
      const parsed = JSON.parse(rawJsonText);
      parseAndApplyJson(parsed);
      setJsonError(null);
      setRawJsonText('');
      setActiveTab('form');
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    } catch (err: any) {
      setJsonError(`JSON non valido: ${err.message}`);
    }
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

  const isGeminiConnected = !!keys.GEMINI_API_KEY && keys.GEMINI_API_KEY.trim() !== '';
  const isTwelveDataConnected = !!keys.TWELVE_DATA_API_KEY && keys.TWELVE_DATA_API_KEY.trim() !== '';
  const isFinnhubConnected = !!keys.FINNHUB_API_KEY && keys.FINNHUB_API_KEY.trim() !== '';
  const isAlphaConnected = !!keys.ALPHAVANTAGE_API_KEY && keys.ALPHAVANTAGE_API_KEY.trim() !== '';
  const isNewsApiConnected = !!keys.NEWSAPI_KEY && keys.NEWSAPI_KEY.trim() !== '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-xs p-4">
      <div className="bg-[var(--bg-header)] border border-[var(--border-color)] rounded-xl shadow-2xl w-full max-w-lg overflow-hidden text-xs flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-2 font-bold text-sm text-[var(--text-main)] uppercase tracking-wide">
            <KeyRound className="w-4 h-4 text-amber-500" />
            <span>Gestione Chiavi API & config.json</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Provider Status Ribbon */}
        <div className="flex items-center gap-1.5 px-4 py-2 bg-[var(--bg-card)] border-b border-[var(--border-color)] overflow-x-auto text-[10px] select-none">
          <span className="text-[var(--text-muted)] font-semibold uppercase">Feed:</span>
          <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 border border-emerald-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Binance Live (0s)
          </span>
          <span className={`px-1.5 py-0.5 rounded font-bold flex items-center gap-1 border ${
            isTwelveDataConnected
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
              : 'bg-[var(--bg-main)] text-[var(--text-muted)] border-[var(--border-color)]'
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${isTwelveDataConnected ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
            TwelveData {isTwelveDataConnected ? 'Attivo' : ''}
          </span>
          <span className={`px-1.5 py-0.5 rounded font-bold flex items-center gap-1 border ${
            isGeminiConnected
              ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
              : 'bg-[var(--bg-main)] text-[var(--text-muted)] border-[var(--border-color)]'
          }`}>
            <Sparkles className="w-2.5 h-2.5" />
            Gemini AI {isGeminiConnected ? 'Attivo' : ''}
          </span>
          <span className={`px-1.5 py-0.5 rounded font-bold flex items-center gap-1 border ${
            isFinnhubConnected
              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
              : 'bg-[var(--bg-main)] text-[var(--text-muted)] border-[var(--border-color)]'
          }`}>
            Finnhub {isFinnhubConnected ? 'Attivo' : ''}
          </span>
        </div>

        {/* Tab switcher & Import Bar */}
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <div className="flex items-center gap-1 bg-[var(--bg-card)] p-0.5 rounded-lg border border-[var(--border-color)]">
            <button
              onClick={() => setActiveTab('form')}
              className={`px-2.5 py-1 rounded-md font-semibold text-[11px] transition cursor-pointer ${
                activeTab === 'form'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              Campi Singoli
            </button>
            <button
              onClick={() => setActiveTab('json')}
              className={`px-2.5 py-1 rounded-md font-semibold text-[11px] transition cursor-pointer flex items-center gap-1 ${
                activeTab === 'json'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Incolla config.json</span>
            </button>
          </div>

          <div>
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-[var(--border-color)] hover:bg-blue-500/10 hover:border-blue-500/40 text-blue-500 font-semibold transition cursor-pointer"
              title="Seleziona il tuo file config.json dal computer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Carica file config.json</span>
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-4 space-y-3 overflow-y-auto flex-1">
          {jsonError && (
            <div className="p-2 rounded bg-red-500/10 border border-red-500/30 text-red-500 font-medium text-[11px]">
              {jsonError}
            </div>
          )}

          {activeTab === 'form' ? (
            <>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-[11px] text-[var(--text-muted)] flex items-center gap-1">
                    <span>Google Gemini API Key</span>
                    <span className="text-[10px] text-purple-500 font-bold">(Sentiment & Audit AI)</span>
                  </label>
                  {isGeminiConnected && <span className="text-[10px] text-emerald-500 font-bold">✓ Connesso</span>}
                </div>
                <input
                  type="password"
                  value={keys.GEMINI_API_KEY}
                  onChange={e => handleChange('GEMINI_API_KEY', e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full px-2.5 py-1.5 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] outline-none font-mono"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-[11px] text-[var(--text-muted)]">
                    Twelve Data API Key (Forex & Dati Real-Time):
                  </label>
                  {isTwelveDataConnected && <span className="text-[10px] text-emerald-500 font-bold">✓ Connesso</span>}
                </div>
                <input
                  type="password"
                  value={keys.TWELVE_DATA_API_KEY}
                  onChange={e => handleChange('TWELVE_DATA_API_KEY', e.target.value)}
                  placeholder="1a2b3c..."
                  className="w-full px-2.5 py-1.5 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] outline-none font-mono"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-[11px] text-[var(--text-muted)]">
                    Alpha Vantage API Key:
                  </label>
                  {isAlphaConnected && <span className="text-[10px] text-emerald-500 font-bold">✓ Connesso</span>}
                </div>
                <input
                  type="password"
                  value={keys.ALPHAVANTAGE_API_KEY}
                  onChange={e => handleChange('ALPHAVANTAGE_API_KEY', e.target.value)}
                  placeholder="O8X7..."
                  className="w-full px-2.5 py-1.5 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] outline-none font-mono"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-[11px] text-[var(--text-muted)]">
                    Finnhub API Key (Azioni USA):
                  </label>
                  {isFinnhubConnected && <span className="text-[10px] text-emerald-500 font-bold">✓ Connesso</span>}
                </div>
                <input
                  type="password"
                  value={keys.FINNHUB_API_KEY}
                  onChange={e => handleChange('FINNHUB_API_KEY', e.target.value)}
                  placeholder="c9x..."
                  className="w-full px-2.5 py-1.5 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] outline-none font-mono"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-[11px] text-[var(--text-muted)]">
                    NewsAPI Key (Ultime Notizie Finanziarie):
                  </label>
                  {isNewsApiConnected && <span className="text-[10px] text-emerald-500 font-bold">✓ Connesso</span>}
                </div>
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
                  FRED API Key (St. Louis Fed Macro):
                </label>
                <input
                  type="password"
                  value={keys.FRED_API_KEY}
                  onChange={e => handleChange('FRED_API_KEY', e.target.value)}
                  placeholder="49a7..."
                  className="w-full px-2.5 py-1.5 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] outline-none font-mono"
                />
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <p className="text-[var(--text-muted)] text-[11px]">
                Incolla qui il contenuto testuale del tuo file <code className="px-1 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border-color)] text-blue-500">config.json</code>:
              </p>
              <textarea
                value={rawJsonText}
                onChange={e => setRawJsonText(e.target.value)}
                placeholder={'{\n  "GEMINI_API_KEY": "AIzaSy...",\n  "TWELVE_DATA_API_KEY": "...",\n  "ALPHAVANTAGE_API_KEY": "...",\n  "FINNHUB_API_KEY": "...",\n  "NEWSAPI_KEY": "..."\n}'}
                rows={9}
                className="w-full p-2.5 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] font-mono text-[11px] outline-none leading-relaxed"
              />
              <button
                onClick={handleApplyPastedJson}
                disabled={!rawJsonText.trim()}
                className="w-full py-2 rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Estrai & Applica Chiavi dal JSON</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-3 border-t border-[var(--border-color)] bg-[var(--bg-card)]">
          <button
            onClick={handleExportConfigJson}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[var(--border-color)] hover:bg-[var(--border-color)] text-[var(--text-main)] font-medium transition cursor-pointer"
            title="Scarica config.json"
          >
            <Download className="w-3.5 h-3.5 text-blue-500" />
            <span>Esporta config.json</span>
          </button>

          <div className="flex items-center gap-2">
            {savedSuccess && (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                <Check className="w-4 h-4" />
                <span>Salvate & Sincronizzate!</span>
              </span>
            )}
            <button
              onClick={handleSave}
              className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold transition cursor-pointer"
            >
              Salva Configurazione
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
