import React, { useState } from 'react';
import {
  Star,
  X,
  Plus,
  Trash2,
  RefreshCw,
  Search,
  TrendingUp,
  TrendingDown,
  RotateCcw
} from 'lucide-react';
import { WatchlistItem } from '../types';

interface WatchlistPanelProps {
  isOpen: boolean;
  onClose: () => void;
  items: WatchlistItem[];
  currentTicker: string;
  onSelectTicker: (ticker: string) => void;
  onAddTicker: (ticker: string) => void;
  onRemoveTicker: (ticker: string) => void;
  onResetDefault: () => void;
  onRefreshQuotes: () => void;
  isRefreshing: boolean;
}

export const WatchlistPanel: React.FC<WatchlistPanelProps> = ({
  isOpen,
  onClose,
  items,
  currentTicker,
  onSelectTicker,
  onAddTicker,
  onRemoveTicker,
  onResetDefault,
  onRefreshQuotes,
  isRefreshing
}) => {
  const [newTickerInput, setNewTickerInput] = useState('');
  const [searchFilter, setSearchFilter] = useState('');

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const val = newTickerInput.trim().toUpperCase();
    if (val) {
      onAddTicker(val);
      setNewTickerInput('');
    }
  };

  const isCurrentTickerInWatchlist = items.some(
    i => i.symbol.toUpperCase() === currentTicker.toUpperCase()
  );

  const filteredItems = items.filter(
    item =>
      item.symbol.toLowerCase().includes(searchFilter.toLowerCase()) ||
      item.name.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <aside className="w-80 md:w-88 h-full bg-[var(--bg-header)] border-l border-[var(--border-color)] flex flex-col z-30 shadow-2xl transition-all select-none animate-in slide-in-from-right duration-200">
      {/* Top Header */}
      <div className="flex items-center justify-between px-3.5 py-3 border-b border-[var(--border-color)] bg-[var(--bg-card)]">
        <div className="flex items-center gap-2">
          <Star className="w-4.5 h-4.5 text-amber-500 fill-amber-500" />
          <h3 className="font-bold text-sm text-[var(--text-main)] uppercase tracking-wide">
            Watchlist
          </h3>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-500 border border-blue-500/30">
            {items.length}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onRefreshQuotes}
            disabled={isRefreshing}
            className="p-1.5 rounded hover:bg-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition"
            title="Aggiorna quotazioni in tempo reale"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-500' : ''}`} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition"
            title="Chiudi pannello watchlist"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Add & Active Asset Suggestion */}
      <div className="p-3 border-b border-[var(--border-color)] space-y-2 bg-[var(--bg-header)]">
        <form onSubmit={handleAdd} className="flex items-center gap-1.5">
          <input
            type="text"
            placeholder="Aggiungi Ticker (es. UCG.MI, TSLA)"
            value={newTickerInput}
            onChange={e => setNewTickerInput(e.target.value)}
            className="flex-1 uppercase font-mono text-xs px-2.5 py-1.5 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] outline-none"
          />
          <button
            type="submit"
            className="px-2.5 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition flex items-center justify-center shrink-0"
            title="Aggiungi alla Watchlist"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </form>

        {!isCurrentTickerInWatchlist && currentTicker && (
          <button
            onClick={() => onAddTicker(currentTicker)}
            className="w-full flex items-center justify-center gap-1.5 py-1 px-2 rounded border border-dashed border-blue-500/40 hover:border-blue-500 bg-blue-500/5 hover:bg-blue-500/10 text-blue-500 text-[11px] font-semibold transition"
          >
            <Plus className="w-3 h-3" />
            <span>Aggiungi asset attivo: <strong>{currentTicker}</strong></span>
          </button>
        )}

        {/* Search Filter */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Filtra lista..."
            value={searchFilter}
            onChange={e => setSearchFilter(e.target.value)}
            className="w-full text-xs pl-8 pr-2.5 py-1 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] outline-none"
          />
        </div>
      </div>

      {/* Watchlist Items List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredItems.length > 0 ? (
          filteredItems.map(item => {
            const isSelected = item.symbol.toUpperCase() === currentTicker.toUpperCase();
            const isPositive = item.changePct >= 0;

            return (
              <div
                key={item.symbol}
                onClick={() => onSelectTicker(item.symbol)}
                className={`group flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition ${
                  isSelected
                    ? 'bg-blue-500/10 border-blue-500/60 shadow-xs'
                    : 'bg-[var(--bg-card)] border-[var(--border-color)] hover:bg-[var(--bg-main)] hover:border-blue-500/30'
                }`}
              >
                {/* Left: Symbol & Name */}
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-xs text-[var(--text-main)] group-hover:text-blue-500 transition">
                      {item.symbol}
                    </span>
                    {isSelected && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    )}
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)] truncate max-w-[130px]">
                    {item.name}
                  </div>
                </div>

                {/* Right: Price, Change %, Remove */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <div className="font-mono font-bold text-xs text-[var(--text-main)]">
                      {item.price > 0 ? item.price.toFixed(item.symbol.includes('=X') ? 4 : 2) : '-'}
                    </div>
                    <div
                      className={`flex items-center justify-end gap-0.5 text-[10px] font-mono font-semibold ${
                        isPositive ? 'text-emerald-500' : 'text-red-500'
                      }`}
                    >
                      {isPositive ? (
                        <TrendingUp className="w-2.5 h-2.5" />
                      ) : (
                        <TrendingDown className="w-2.5 h-2.5" />
                      )}
                      <span>
                        {isPositive ? `+${item.changePct.toFixed(2)}%` : `${item.changePct.toFixed(2)}%`}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onRemoveTicker(item.symbol);
                    }}
                    className="p-1 rounded text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 transition opacity-0 group-hover:opacity-100"
                    title="Rimuovi dalla watchlist"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-6 text-center text-xs text-[var(--text-muted)]">
            Nessun asset trovato nella Watchlist.
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-2.5 border-t border-[var(--border-color)] bg-[var(--bg-card)] flex items-center justify-between text-[11px]">
        <button
          onClick={onResetDefault}
          className="flex items-center gap-1 px-2 py-1 rounded text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--border-color)] transition font-medium"
          title="Ripristina la lista predefinita"
        >
          <RotateCcw className="w-3 h-3 text-blue-500" />
          <span>Ripristina Default</span>
        </button>

        <span className="text-[10px] text-[var(--text-muted)]">
          {items.length} preferiti salvati
        </span>
      </div>
    </aside>
  );
};
