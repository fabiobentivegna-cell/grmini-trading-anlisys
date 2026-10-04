import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronDown,
  ArrowRight,
  Bell,
  Star,
  GitCompare,
  Keyboard,
  Zap,
  SlidersHorizontal,
  KeyRound,
  Sun,
  Moon
} from 'lucide-react';
import { PageId, WebSocketStatus } from '../types';
import { PAGES_CONFIG, getPageConfig } from '../config/pages';
import { ASSET_CATALOG } from '../config/catalog';

interface HeaderProps {
  activePage: PageId;
  onSelectPage: (id: PageId) => void;
  category: string;
  onCategoryChange: (cat: string) => void;
  ticker: string;
  onTickerChange: (ticker: string) => void;
  interval: string;
  onIntervalChange: (tf: string) => void;
  chartType: 'candlestick' | 'line' | 'heikin_ashi';
  onChartTypeChange: (type: 'candlestick' | 'line' | 'heikin_ashi') => void;
  liveRefreshSeconds: number;
  onToggleLiveRefresh: () => void;
  wsStatus?: WebSocketStatus;
  onScrollToRealTime: () => void;
  onOpenIndicators: () => void;
  onOpenOverlays?: () => void;
  activeOverlaysCount?: number;
  onOpenBacktest?: () => void;
  onOpenApiHub: () => void;
  onOpenAlerts: () => void;
  activeAlertsCount: number;
  onToggleWatchlist: () => void;
  isWatchlistOpen: boolean;
  watchlistCount: number;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onOpenShortcuts?: () => void;
  drawColor: string;
  onDrawColorChange: (c: string) => void;
  drawWidth: number;
  onDrawWidthChange: (w: number) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activePage,
  onSelectPage,
  category,
  onCategoryChange,
  ticker,
  onTickerChange,
  interval,
  onIntervalChange,
  chartType,
  onChartTypeChange,
  liveRefreshSeconds,
  onToggleLiveRefresh,
  wsStatus,
  onScrollToRealTime,
  onOpenIndicators,
  onOpenOverlays,
  activeOverlaysCount = 0,
  onOpenBacktest,
  onOpenApiHub,
  onOpenAlerts,
  activeAlertsCount,
  onToggleWatchlist,
  isWatchlistOpen,
  watchlistCount,
  theme,
  onToggleTheme,
  onOpenShortcuts,
  drawColor,
  onDrawColorChange,
  drawWidth,
  onDrawWidthChange
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [manualInput, setManualInput] = useState(ticker);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentPage = getPageConfig(activePage);

  useEffect(() => {
    setManualInput(ticker);
  }, [ticker]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      onTickerChange(manualInput.trim().toUpperCase());
    }
  };

  const assetsForCategory = ASSET_CATALOG[category] || [];

  return (
    <header className="relative z-50 flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 border-b border-[var(--border-color)] bg-[var(--bg-header)] select-none text-xs">
      {/* Gruppo Sinistra: Menu Navigazione Viste & Selezione Asset */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative z-50" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition shadow-sm cursor-pointer"
          >
            <span>{currentPage.navTitle}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {dropdownOpen && (
            <div className="absolute top-full left-0 mt-1.5 min-w-[240px] rounded-xl border border-[var(--border-color)] bg-[var(--bg-header)] shadow-2xl z-[100] overflow-hidden py-1 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border-color)] bg-[var(--bg-main)]/50">
                Sezioni della Piattaforma
              </div>
              <div className="max-h-[75vh] overflow-y-auto py-1">
                {PAGES_CONFIG.map(page => {
                  const isActive = page.id === activePage;
                  return (
                    <button
                      key={page.id}
                      onClick={() => {
                        onSelectPage(page.id);
                        setDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-left font-medium transition cursor-pointer text-xs ${
                        isActive
                          ? 'bg-blue-600/15 text-blue-500 font-bold border-l-2 border-blue-600'
                          : 'text-[var(--text-main)] hover:bg-[var(--bg-card)]'
                      }`}
                    >
                      <span className="flex items-center gap-2">{page.navTitle}</span>
                      {isActive && <div className="w-2 h-2 rounded-full bg-blue-600 shadow-sm" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Mercato */}
        <div className="flex items-center gap-1.5">
          <label className="text-[11px] font-bold uppercase text-[var(--text-muted)]">Mercato:</label>
          <select
            value={category}
            onChange={(e) => {
              const newCat = e.target.value;
              onCategoryChange(newCat);
              const items = ASSET_CATALOG[newCat];
              if (items && items.length > 0) {
                onTickerChange(items[0].symbol);
              }
            }}
            className="px-2 py-1 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] outline-none"
          >
            {Object.keys(ASSET_CATALOG).map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Strumento */}
        <div className="flex items-center gap-1.5">
          <label className="text-[11px] font-bold uppercase text-[var(--text-muted)]">Strumento:</label>
          <select
            value={ticker}
            onChange={(e) => onTickerChange(e.target.value)}
            className="px-2 py-1 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] outline-none max-w-[170px]"
          >
            {assetsForCategory.map(a => (
              <option key={a.symbol} value={a.symbol}>
                {a.name} ({a.symbol})
              </option>
            ))}
            {!assetsForCategory.some(a => a.symbol === ticker) && (
              <option value={ticker}>{ticker}</option>
            )}
          </select>
        </div>

        {/* Input Manuale Ticker */}
        <form onSubmit={handleManualSubmit} className="flex items-center gap-1">
          <input
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder="AAPL"
            className="w-20 uppercase px-2 py-1 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] outline-none text-center font-bold"
          />
          <button
            type="submit"
            className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium transition cursor-pointer"
          >
            Carica
          </button>
        </form>
      </div>

      {/* Gruppo Centro: Controlli Grafico */}
      {activePage === 'chart' && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onOpenIndicators}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--border-color)] text-[var(--text-main)] font-semibold transition cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-blue-500" />
            <span>Indicatori</span>
          </button>

          {onOpenOverlays && (
            <button
              onClick={onOpenOverlays}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded border transition font-semibold cursor-pointer ${
                activeOverlaysCount > 0
                  ? 'bg-cyan-500/15 border-cyan-500 text-cyan-600 dark:text-cyan-400 font-bold'
                  : 'border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--border-color)] text-[var(--text-main)]'
              }`}
              title="Sovrapponi indici, titoli o timeframe differenti"
            >
              <GitCompare className="w-3.5 h-3.5 text-cyan-500" />
              <span>Confronta</span>
              {activeOverlaysCount > 0 && (
                <span className="flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-cyan-600 text-white text-[9px] font-bold">
                  {activeOverlaysCount}
                </span>
              )}
            </button>
          )}

          {onOpenBacktest && (
            <button
              onClick={onOpenBacktest}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-blue-500/40 bg-linear-to-r from-blue-600/10 to-indigo-600/10 hover:from-blue-600/20 hover:to-indigo-600/20 text-blue-600 dark:text-blue-400 font-bold transition shadow-xs cursor-pointer"
              title="Laboratorio Backtesting Crossover Medie Mobili [Tasto: B]"
            >
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Backtest</span>
            </button>
          )}

          <div className="flex items-center gap-1">
            <label className="text-[11px] font-bold uppercase text-[var(--text-muted)]">Stile:</label>
            <select
              value={chartType}
              onChange={(e) => onChartTypeChange(e.target.value as any)}
              className="px-2 py-1 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] outline-none font-semibold"
            >
              <option value="candlestick">Candele Giapponesi</option>
              <option value="line">Linee</option>
              <option value="heikin_ashi">Heikin-Ashi</option>
            </select>
          </div>

          <div className="flex items-center gap-0.5 bg-[var(--input-bg)] border border-[var(--border-color)] rounded p-0.5">
            {(['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1wk'] as const).map(tf => {
              const label = tf === '1d' ? 'Daily' : tf === '1wk' ? 'Weekly' : tf.toUpperCase();
              const isSelected = interval === tf;
              return (
                <button
                  key={tf}
                  onClick={() => onIntervalChange(tf)}
                  className={`px-1.5 py-0.5 text-[11px] font-bold rounded transition cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <button
            onClick={onScrollToRealTime}
            className="flex items-center gap-1 px-2 py-1 rounded border border-[var(--border-color)] hover:bg-[var(--border-color)] text-[var(--text-main)] font-semibold transition text-[11px] cursor-pointer"
            title="Scorri alla barra corrente in tempo reale"
          >
            <ArrowRight className="w-3 h-3 text-blue-500" />
            <span>Ora</span>
          </button>

          {/* Badge WebSocket Live */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-[11px] font-bold transition select-none ${
              wsStatus?.connected
                ? 'bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400'
            }`}
            title={wsStatus?.connected ? `Connesso via ${wsStatus.provider} su ${wsStatus.ticker}` : 'Connessione streaming in corso...'}
          >
            <span className={`w-2 h-2 rounded-full ${wsStatus?.connected ? 'bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500/50' : 'bg-amber-500'}`} />
            <span>{wsStatus?.connected ? '⚡ WS LIVE (0s)' : 'WS: CONNETTO...'}</span>
          </div>

          <div className="flex items-center gap-1 pl-2 border-l border-[var(--border-color)]">
            <label className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Tratto:</label>
            <input
              type="color"
              value={drawColor}
              onChange={(e) => onDrawColorChange(e.target.value)}
              className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent"
              title="Colore disegno"
            />
            <select
              value={drawWidth}
              onChange={(e) => onDrawWidthChange(parseInt(e.target.value) || 2)}
              className="px-1.5 py-0.5 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] text-[11px]"
            >
              <option value="1">1px</option>
              <option value="2">2px</option>
              <option value="3">3px</option>
              <option value="4">4px</option>
            </select>
          </div>
        </div>
      )}

      {/* Gruppo Destra */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleWatchlist}
          className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded border transition font-medium cursor-pointer ${
            isWatchlistOpen
              ? 'bg-amber-500/15 border-amber-500 text-amber-600 dark:text-amber-400 font-bold'
              : 'border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--border-color)] text-[var(--text-main)]'
          }`}
          title="Watchlist Preferiti [Tasto: W]"
        >
          <Star className={`w-3.5 h-3.5 ${isWatchlistOpen ? 'text-amber-500 fill-amber-500' : 'text-amber-500'}`} />
          <span>Watchlist</span>
          {watchlistCount > 0 && (
            <span className="flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-amber-500 text-white text-[9px] font-bold">
              {watchlistCount}
            </span>
          )}
        </button>

        <button
          onClick={onOpenAlerts}
          className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--border-color)] text-[var(--text-main)] font-medium transition cursor-pointer"
          title="Allarmi di Prezzo & Notifiche [Tasto: A]"
        >
          <Bell className="w-3.5 h-3.5 text-blue-500" />
          <span>Allarmi</span>
          {activeAlertsCount > 0 && (
            <span className="flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-blue-600 text-white text-[9px] font-bold">
              {activeAlertsCount}
            </span>
          )}
        </button>

        <button
          onClick={onOpenApiHub}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--border-color)] text-[var(--text-main)] font-medium transition cursor-pointer"
          title="Configurazione API & Servizi [Tasto: P]"
        >
          <KeyRound className="w-3.5 h-3.5 text-amber-500" />
          <span>API Hub</span>
        </button>

        {onOpenShortcuts && (
          <button
            onClick={onOpenShortcuts}
            className="flex items-center gap-1 px-2 py-1.5 rounded border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--border-color)] text-[var(--text-main)] font-medium transition cursor-pointer"
            title="Guida Scorciatoie da Tastiera [Tasto: ?]"
          >
            <Keyboard className="w-3.5 h-3.5 text-blue-500" />
            <span className="hidden lg:inline text-[11px]">Tasti</span>
          </button>
        )}

        <button
          onClick={onToggleTheme}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--border-color)] text-[var(--text-main)] font-medium transition cursor-pointer"
          title="Cambia tema Chiaro / Scuro [Tasto: D]"
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span>Chiaro</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-blue-500" />
              <span>Scuro</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
