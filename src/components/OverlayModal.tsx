import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  GitCompare,
  TrendingUp,
  Percent,
  DollarSign,
  Activity,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';
import {
  OverlayConfig,
  OverlayCorrelationStats,
  OverlayLineStyle,
  OverlayScaleMode,
  OverlaySeriesType
} from '../types';
import { OVERLAY_PRESETS } from '../services/correlationOverlayService';

interface OverlayModalProps {
  isOpen: boolean;
  onClose: () => void;
  mainTicker: string;
  mainInterval: string;
  overlays: OverlayConfig[];
  correlationStats: Record<string, OverlayCorrelationStats>;
  onAddOverlay: (overlay: OverlayConfig) => void;
  onUpdateOverlay: (overlay: OverlayConfig) => void;
  onRemoveOverlay: (id: string) => void;
  onToggleOverlayVisibility: (id: string) => void;
}

const COLOR_PALETTE = [
  '#06b6d4', // Cyan
  '#a855f7', // Purple
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#ef4444', // Red
  '#ec4899', // Pink
  '#3b82f6', // Blue
  '#84cc16', // Lime
  '#eab308'  // Gold
];

export const OverlayModal: React.FC<OverlayModalProps> = ({
  isOpen,
  onClose,
  mainTicker,
  mainInterval,
  overlays,
  correlationStats,
  onAddOverlay,
  onUpdateOverlay,
  onRemoveOverlay,
  onToggleOverlayVisibility
}) => {
  const [activeTab, setActiveTab] = useState<'manage' | 'add'>('manage');
  const [customTicker, setCustomTicker] = useState('');
  const [customName, setCustomName] = useState('');
  const [selectedInterval, setSelectedInterval] = useState('same');
  const [selectedColor, setSelectedColor] = useState(COLOR_PALETTE[0]);
  const [selectedWidth, setSelectedWidth] = useState(2);
  const [selectedStyle, setSelectedStyle] = useState<OverlayLineStyle>('solid');
  const [selectedSeriesType, setSelectedSeriesType] = useState<OverlaySeriesType>('line');
  const [selectedScaleMode, setSelectedScaleMode] = useState<OverlayScaleMode>('percent');

  if (!isOpen) return null;

  const handleAddPreset = (preset: typeof OVERLAY_PRESETS[0]) => {
    // Pick an unused color from the palette if possible
    const usedColors = new Set(overlays.map(o => o.color.toLowerCase()));
    const availColor = COLOR_PALETTE.find(c => !usedColors.has(c.toLowerCase())) || preset.defaultColor;

    const newOverlay: OverlayConfig = {
      id: `overlay_${preset.ticker.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`,
      ticker: preset.ticker,
      name: preset.name,
      interval: 'same',
      color: availColor,
      lineWidth: 2,
      lineStyle: 'solid',
      seriesType: 'line',
      visible: true,
      scaleMode: 'percent'
    };

    onAddOverlay(newOverlay);
    setActiveTab('manage');
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTicker.trim()) return;

    const clean = customTicker.trim().toUpperCase();
    const newOverlay: OverlayConfig = {
      id: `overlay_${clean.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`,
      ticker: clean,
      name: customName.trim() || clean,
      interval: selectedInterval,
      color: selectedColor,
      lineWidth: selectedWidth,
      lineStyle: selectedStyle,
      seriesType: selectedSeriesType,
      visible: true,
      scaleMode: selectedScaleMode
    };

    onAddOverlay(newOverlay);
    setCustomTicker('');
    setCustomName('');
    setActiveTab('manage');
  };

  const getCorrelationBadge = (r: number) => {
    if (r >= 0.7) {
      return { bg: 'bg-emerald-500/15', text: 'text-emerald-500 dark:text-emerald-400', label: 'Forte Diretta' };
    }
    if (r >= 0.35) {
      return { bg: 'bg-blue-500/15', text: 'text-blue-500 dark:text-blue-400', label: 'Moderata Diretta' };
    }
    if (r <= -0.7) {
      return { bg: 'bg-rose-500/15', text: 'text-rose-500 dark:text-rose-400', label: 'Forte Inversa' };
    }
    if (r <= -0.35) {
      return { bg: 'bg-amber-500/15', text: 'text-amber-500 dark:text-amber-400', label: 'Moderata Inversa' };
    }
    return { bg: 'bg-neutral-500/15', text: 'text-neutral-500 dark:text-neutral-400', label: 'Scorrelato' };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden text-[var(--text-main)]">
        {/* Header Modale */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border-color)] bg-[var(--bg-header)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-500">
              <GitCompare className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold tracking-tight">Confronta & Sovrapponi Titoli</h2>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-600/15 text-blue-600 dark:text-blue-400 border border-blue-600/30">
                  Base: {mainTicker} ({mainInterval.toUpperCase()})
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">
                Sovrapponi performance storica di indici, azioni o timeframe differenti per analizzare le correlazioni
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--border-color)] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 px-5 py-2.5 border-b border-[var(--border-color)] bg-[var(--bg-main)]">
          <button
            onClick={() => setActiveTab('manage')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'manage'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--border-color)]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Serie Attive ({overlays.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('add')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'add'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--border-color)]'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Aggiungi Nuovo Confronto</span>
          </button>
        </div>

        {/* Corpo Modale */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {activeTab === 'manage' && (
            <div className="space-y-4">
              {overlays.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-cyan-500/10 text-cyan-500 flex items-center justify-center border border-cyan-500/20">
                    <Activity className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">Nessun titolo o timeframe sovrapposto</h3>
                    <p className="text-xs text-[var(--text-muted)] max-w-sm mt-1">
                      Aggiungi un benchmark come S&P 500, Nasdaq, Bitcoin, o lo stesso titolo su timeframe settimanale per calcolare la correlazione in tempo reale.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('add')}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Aggiungi Benchmark Rapido</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-medium">
                    <span>Titoli Sovrapposti e Analisi di Correlazione</span>
                    <span>{overlays.filter(o => o.visible).length} di {overlays.length} visibili</span>
                  </div>

                  {overlays.map(overlay => {
                    const stats = correlationStats[overlay.id];
                    const rPrice = stats?.correlationPrice ?? 0;
                    const badge = getCorrelationBadge(rPrice);

                    return (
                      <div
                        key={overlay.id}
                        className={`p-3.5 rounded-xl border transition-all ${
                          overlay.visible
                            ? 'bg-[var(--bg-main)] border-[var(--border-color)] shadow-xs'
                            : 'bg-[var(--bg-main)]/50 border-[var(--border-color)]/60 opacity-60'
                        }`}
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          {/* Identificativo e Badge Colore */}
                          <div className="flex items-center gap-2.5">
                            <input
                              type="color"
                              value={overlay.color}
                              onChange={(e) => onUpdateOverlay({ ...overlay, color: e.target.value })}
                              className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent"
                              title="Modifica colore linea"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm tracking-tight">{overlay.ticker}</span>
                                <span className="text-xs text-[var(--text-muted)] truncate max-w-[200px]">
                                  {overlay.name}
                                </span>
                                <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-[var(--border-color)] text-[var(--text-muted)]">
                                  {overlay.interval === 'same' ? `TF: ${mainInterval.toUpperCase()}` : `TF: ${overlay.interval.toUpperCase()}`}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Azioni Visibilità & Rimozione */}
                          <div className="flex items-center gap-1.5">
                            {/* Toggle Modalità Scala */}
                            <button
                              onClick={() =>
                                onUpdateOverlay({
                                  ...overlay,
                                  scaleMode: overlay.scaleMode === 'percent' ? 'price' : 'percent'
                                })
                              }
                              className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-bold border transition ${
                                overlay.scaleMode === 'percent'
                                  ? 'bg-blue-600/15 border-blue-600/40 text-blue-600 dark:text-blue-400'
                                  : 'bg-[var(--border-color)] border-transparent text-[var(--text-muted)]'
                              }`}
                              title={overlay.scaleMode === 'percent' ? 'Scala Rendimento %' : 'Doppio Asse Prezzo'}
                            >
                              {overlay.scaleMode === 'percent' ? <Percent className="w-3 h-3" /> : <DollarSign className="w-3 h-3" />}
                              <span>{overlay.scaleMode === 'percent' ? 'Rendimento %' : 'Prezzo (Asse SX)'}</span>
                            </button>

                            {/* Visibilità */}
                            <button
                              onClick={() => onToggleOverlayVisibility(overlay.id)}
                              className={`w-7 h-7 rounded flex items-center justify-center border transition ${
                                overlay.visible
                                  ? 'border-[var(--border-color)] hover:bg-[var(--border-color)] text-[var(--text-main)]'
                                  : 'border-transparent text-[var(--text-muted)] hover:bg-[var(--border-color)]'
                              }`}
                              title={overlay.visible ? 'Nascondi sovrapposizione' : 'Mostra sovrapposizione'}
                            >
                              {overlay.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                            </button>

                            {/* Rimuovi */}
                            <button
                              onClick={() => onRemoveOverlay(overlay.id)}
                              className="w-7 h-7 rounded flex items-center justify-center text-rose-500 hover:bg-rose-500/10 transition border border-transparent hover:border-rose-500/30"
                              title="Rimuovi dal grafico"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Scheda Metriche di Correlazione e Performance */}
                        {stats && stats.overlapBars > 0 && (
                          <div className="mt-3 pt-3 border-t border-[var(--border-color)]/70 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                            {/* Correlazione di Pearson */}
                            <div className="p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] flex flex-col justify-between">
                              <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">Correlazione Pearson (r)</span>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className={`text-base font-extrabold ${badge.text}`}>
                                  {rPrice >= 0 ? `+${rPrice.toFixed(2)}` : rPrice.toFixed(2)}
                                </span>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${badge.bg} ${badge.text}`}>
                                  {badge.label}
                                </span>
                              </div>
                            </div>

                            {/* Rendimento Titolo Base vs Overlay */}
                            <div className="p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] flex flex-col justify-between">
                              <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">Rendimento Sovrapposto</span>
                              <div className="flex items-center gap-1 mt-1">
                                <span
                                  className={`text-sm font-bold ${
                                    stats.overlayReturnPct >= 0
                                      ? 'text-emerald-500 dark:text-emerald-400'
                                      : 'text-rose-500 dark:text-rose-400'
                                  }`}
                                >
                                  {stats.overlayReturnPct >= 0 ? `+${stats.overlayReturnPct}%` : `${stats.overlayReturnPct}%`}
                                </span>
                                <span className="text-[10px] text-[var(--text-muted)]">
                                  (vs {mainTicker}: {stats.mainReturnPct >= 0 ? `+${stats.mainReturnPct}%` : `${stats.mainReturnPct}%`})
                                </span>
                              </div>
                            </div>

                            {/* Spread / Alpha */}
                            <div className="p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] flex flex-col justify-between">
                              <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">Spread Differenziale</span>
                              <span
                                className={`text-sm font-bold mt-1 ${
                                  stats.performanceSpread >= 0
                                    ? 'text-emerald-500 dark:text-emerald-400'
                                    : 'text-rose-500 dark:text-rose-400'
                                }`}
                              >
                                {stats.performanceSpread >= 0 ? `+${stats.performanceSpread}%` : `${stats.performanceSpread}%`}
                              </span>
                            </div>

                            {/* Beta e Barre */}
                            <div className="p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] flex flex-col justify-between">
                              <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">Beta e Campioni</span>
                              <div className="flex items-center justify-between text-xs mt-1">
                                <span>β: <strong className="text-cyan-500">{stats.beta}</strong></span>
                                <span className="text-[10px] text-[var(--text-muted)]">{stats.overlapBars} barre</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'add' && (
            <div className="space-y-6">
              {/* Presets Popolari in 1 Clic */}
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-main)]">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Benchmark & Titoli Suggeriti (1 Clic)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {OVERLAY_PRESETS.map(preset => {
                    const isAlreadyAdded = overlays.some(o => o.ticker === preset.ticker);
                    return (
                      <button
                        key={preset.ticker}
                        onClick={() => handleAddPreset(preset)}
                        disabled={isAlreadyAdded}
                        className={`p-2.5 rounded-lg border text-left transition flex flex-col justify-between gap-1.5 ${
                          isAlreadyAdded
                            ? 'bg-[var(--bg-main)] border-[var(--border-color)] opacity-50 cursor-not-allowed'
                            : 'bg-[var(--bg-card)] border-[var(--border-color)] hover:border-cyan-500 hover:shadow-xs'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-bold text-xs">{preset.ticker}</span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[var(--border-color)] text-[var(--text-muted)]">
                            {preset.category}
                          </span>
                        </div>
                        <span className="text-[11px] font-medium text-[var(--text-main)] truncate w-full">
                          {preset.name}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)] line-clamp-1">
                          {preset.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Form Inserimento Personalizzato */}
              <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] space-y-4">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-main)]">
                  <Plus className="w-3.5 h-3.5 text-blue-500" />
                  <span>Aggiungi Asset o Timeframe Personalizzato</span>
                </div>

                <form onSubmit={handleAddCustom} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold uppercase text-[var(--text-muted)] block mb-1">
                        Simbolo Ticker (es. NVDA, TSLA, GC=F, BTC-USD):
                      </label>
                      <input
                        type="text"
                        value={customTicker}
                        onChange={(e) => setCustomTicker(e.target.value)}
                        placeholder="es. NVDA o SPY"
                        className="w-full px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-main)] text-xs uppercase font-bold outline-none focus:border-blue-600"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-[var(--text-muted)] block mb-1">
                        Nome o Etichetta (Opzionale):
                      </label>
                      <input
                        type="text"
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        placeholder="es. NVIDIA Corp Benchmark"
                        className="w-full px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-main)] text-xs outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Timeframe */}
                    <div>
                      <label className="text-[10px] font-bold uppercase text-[var(--text-muted)] block mb-1">
                        Timeframe di Analisi:
                      </label>
                      <select
                        value={selectedInterval}
                        onChange={(e) => setSelectedInterval(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-main)] text-xs font-medium outline-none"
                      >
                        <option value="same">Sincronizzato col grafico ({mainInterval.toUpperCase()})</option>
                        <option value="1d">Giornaliero (1d)</option>
                        <option value="1wk">Settimanale (1wk)</option>
                        <option value="1h">Orario (1h)</option>
                        <option value="4h">4 Ore (4h)</option>
                        <option value="15m">15 Minuti (15m)</option>
                      </select>
                    </div>

                    {/* Modalità Scala */}
                    <div>
                      <label className="text-[10px] font-bold uppercase text-[var(--text-muted)] block mb-1">
                        Scala Visuale:
                      </label>
                      <select
                        value={selectedScaleMode}
                        onChange={(e) => setSelectedScaleMode(e.target.value as any)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-main)] text-xs font-medium outline-none"
                      >
                        <option value="percent">Rendimento % Relativo (Consigliato)</option>
                        <option value="price">Doppio Asse Prezzo (Asse Sinistro)</option>
                      </select>
                    </div>

                    {/* Stile Serie */}
                    <div>
                      <label className="text-[10px] font-bold uppercase text-[var(--text-muted)] block mb-1">
                        Stile Grafico:
                      </label>
                      <select
                        value={selectedSeriesType}
                        onChange={(e) => setSelectedSeriesType(e.target.value as any)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-main)] text-xs font-medium outline-none"
                      >
                        <option value="line">Linea Continua</option>
                        <option value="area">Area Sfumata (Gradient)</option>
                      </select>
                    </div>
                  </div>

                  {/* Personalizzazione Colore e Tratto */}
                  <div className="flex items-center gap-4 flex-wrap pt-1">
                    <div className="flex items-center gap-1.5">
                      <label className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Colore:</label>
                      <div className="flex items-center gap-1">
                        {COLOR_PALETTE.map(c => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setSelectedColor(c)}
                            style={{ backgroundColor: c }}
                            className={`w-5 h-5 rounded-full transition ${
                              selectedColor === c ? 'ring-2 ring-blue-500 scale-110' : 'opacity-80 hover:opacity-100'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <label className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Spessore:</label>
                      <select
                        value={selectedWidth}
                        onChange={(e) => setSelectedWidth(parseInt(e.target.value))}
                        className="px-2 py-1 rounded border border-[var(--border-color)] bg-[var(--bg-card)] text-xs"
                      >
                        <option value="1">1px</option>
                        <option value="2">2px</option>
                        <option value="3">3px</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <label className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Tratto:</label>
                      <select
                        value={selectedStyle}
                        onChange={(e) => setSelectedStyle(e.target.value as any)}
                        className="px-2 py-1 rounded border border-[var(--border-color)] bg-[var(--bg-card)] text-xs"
                      >
                        <option value="solid">Solido</option>
                        <option value="dashed">Tratteggiato</option>
                        <option value="dotted">Puntinato</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={!customTicker.trim()}
                      className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold transition shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Aggiungi al Grafico</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Box Informativo / Guida */}
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-900 dark:text-blue-300 flex items-start gap-2.5">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-500" />
                <div className="space-y-1">
                  <span className="font-bold">Come funziona la correlazione di performance:</span>
                  <p className="text-[11px] opacity-90">
                    Il coefficiente di Pearson <strong>r</strong> varia tra <strong>-1</strong> (movimento opposto / perfetto hedging) e <strong>+1</strong> (movimento perfettamente concorde).
                    In modalità <em>Rendimento %</em>, entrambi i titoli vengono normalizzati al valore di inizio periodo, permettendo di visualizzare chiaramente chi sta sovraperformando o sottoperformando.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--border-color)] bg-[var(--bg-header)] text-xs">
          <span className="text-[var(--text-muted)]">
            Correlazioni calcolate dinamicamente sui periodi sovrapposti
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[var(--border-color)] hover:bg-[var(--border-color)]/80 text-[var(--text-main)] font-semibold transition"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};
