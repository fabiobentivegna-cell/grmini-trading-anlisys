import React from 'react';
import { X, Command, Keyboard, Navigation, Sliders, Sparkles } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  key: string;
  altKey?: string;
  description: string;
  category: 'navigation' | 'panels' | 'general';
}

const SHORTCUTS: ShortcutItem[] = [
  // Navigation
  { key: 'C', altKey: '1', description: 'Vai al Grafico Interattivo', category: 'navigation' },
  { key: 'N', altKey: '2', description: 'Vai a NewsAI & Analisi Sentiment', category: 'navigation' },
  { key: 'F', altKey: '3', description: 'Vai ad Analisi Fondamentale & Fair Value', category: 'navigation' },
  { key: 'E', altKey: '4', description: 'Vai al Calendario Economico Globale', category: 'navigation' },
  { key: 'M', altKey: '5', description: 'Vai alla Matrice delle Correlazioni', category: 'navigation' },
  { key: 'I', altKey: '6', description: 'Vai ad Inflazione & Dati Macroeconomici', category: 'navigation' },
  { key: 'S', altKey: '7', description: 'Vai a Stock Screener & Modelli Quantitativi', category: 'navigation' },
  { key: 'H', altKey: '8', description: 'Vai ad Heatmap di Mercato & Settori', category: 'navigation' },

  // Panels & Tools
  { key: 'B', description: 'Apri Laboratorio Backtesting Medie Mobili', category: 'panels' },
  { key: 'W', description: 'Mostra / Nascondi la Watchlist laterale', category: 'panels' },
  { key: 'A', description: 'Apri gestione Allarmi di Prezzo & Notifiche', category: 'panels' },
  { key: 'T', altKey: 'K', description: 'Apri pannello Indicatori Tecnici & Medie Mobili', category: 'panels' },
  { key: 'O', description: 'Apri finestra Benchmark & Overlays sovrapposti', category: 'panels' },
  { key: 'P', altKey: 'U', description: 'Apri API Hub & Configurazione Chiavi', category: 'panels' },

  // General
  { key: 'D', description: 'Alterna tema Chiaro / Scuro', category: 'general' },
  { key: '?', altKey: 'H', description: 'Mostra questa guida scorciatoie da tastiera', category: 'general' },
  { key: 'Esc', description: 'Chiudi qualsiasi finestra modale o pannello aperto', category: 'general' }
];

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-[var(--bg-header)] border border-[var(--border-color)] rounded-xl shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden text-xs">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-card)]">
          <div className="flex items-center gap-2 font-bold text-sm text-[var(--text-main)] uppercase tracking-wide">
            <Keyboard className="w-4.5 h-4.5 text-blue-500" />
            <span>Scorciatoie da Tastiera (Hotkeys)</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-[var(--text-main)] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-500 shrink-0" />
            <span>
              Premi i singoli tasti sulla tastiera per navigare rapidamente tra i moduli o aprire finestre senza usare il mouse.
            </span>
          </div>

          <div className="space-y-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5 text-blue-500" />
              <span>Navigazione Moduli Principali</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SHORTCUTS.filter(s => s.category === 'navigation').map(item => (
                <div
                  key={item.key}
                  className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)]"
                >
                  <span className="text-xs text-[var(--text-main)]">{item.description}</span>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <kbd className="px-2 py-0.5 rounded bg-[var(--input-bg)] border border-[var(--border-color)] font-mono text-[11px] font-bold text-blue-500 shadow-xs">
                      {item.key}
                    </kbd>
                    {item.altKey && (
                      <>
                        <span className="text-[10px] text-[var(--text-muted)]">/</span>
                        <kbd className="px-1.5 py-0.5 rounded bg-[var(--input-bg)] border border-[var(--border-color)] font-mono text-[10px] text-[var(--text-muted)]">
                          {item.altKey}
                        </kbd>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-amber-500" />
              <span>Pannelli & Strumenti Rapidi</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SHORTCUTS.filter(s => s.category === 'panels').map(item => (
                <div
                  key={item.key}
                  className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)]"
                >
                  <span className="text-xs text-[var(--text-main)]">{item.description}</span>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <kbd className="px-2 py-0.5 rounded bg-[var(--input-bg)] border border-[var(--border-color)] font-mono text-[11px] font-bold text-amber-500 shadow-xs">
                      {item.key}
                    </kbd>
                    {item.altKey && (
                      <>
                        <span className="text-[10px] text-[var(--text-muted)]">/</span>
                        <kbd className="px-1.5 py-0.5 rounded bg-[var(--input-bg)] border border-[var(--border-color)] font-mono text-[10px] text-[var(--text-muted)]">
                          {item.altKey}
                        </kbd>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
              <Command className="w-3.5 h-3.5 text-purple-500" />
              <span>Controlli Generali & Finestre</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SHORTCUTS.filter(s => s.category === 'general').map(item => (
                <div
                  key={item.key}
                  className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)]"
                >
                  <span className="text-xs text-[var(--text-main)]">{item.description}</span>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <kbd className="px-2 py-0.5 rounded bg-[var(--input-bg)] border border-[var(--border-color)] font-mono text-[11px] font-bold text-purple-500 shadow-xs">
                      {item.key}
                    </kbd>
                    {item.altKey && (
                      <>
                        <span className="text-[10px] text-[var(--text-muted)]">/</span>
                        <kbd className="px-1.5 py-0.5 rounded bg-[var(--input-bg)] border border-[var(--border-color)] font-mono text-[10px] text-[var(--text-muted)]">
                          {item.altKey}
                        </kbd>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-[var(--bg-card)] border-t border-[var(--border-color)] flex items-center justify-between">
          <span className="text-[10px] text-[var(--text-muted)]">
            💡 Suggerimento: Premi <kbd className="px-1 rounded bg-[var(--input-bg)] border border-[var(--border-color)] font-mono">?</kbd> in qualsiasi momento per riaprire questo pannello.
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition cursor-pointer"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};
