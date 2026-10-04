import React, { useState } from 'react';
import {
  GitCompare,
  Eye,
  EyeOff,
  X,
  ChevronDown,
  ChevronUp,
  Plus
} from 'lucide-react';
import { OverlayConfig, OverlayCorrelationStats } from '../types';

interface ChartOverlayLegendProps {
  overlays: OverlayConfig[];
  correlationStats: Record<string, OverlayCorrelationStats>;
  onToggleVisibility: (id: string) => void;
  onRemoveOverlay: (id: string) => void;
  onOpenModal: () => void;
}

export const ChartOverlayLegend: React.FC<ChartOverlayLegendProps> = ({
  overlays,
  correlationStats,
  onToggleVisibility,
  onRemoveOverlay,
  onOpenModal
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (overlays.length === 0) {
    return (
      <div className="absolute top-3 left-14 z-20 pointer-events-auto">
        <button
          onClick={onOpenModal}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--bg-card)]/90 backdrop-blur-xs border border-[var(--border-color)] hover:border-cyan-500 text-[var(--text-main)] hover:text-cyan-500 text-xs font-semibold shadow-md transition"
          title="Sovrapponi indici, titoli o timeframe differenti per visualizzare correlazioni"
        >
          <GitCompare className="w-3.5 h-3.5 text-cyan-500" />
          <span>+ Confronta & Correla</span>
        </button>
      </div>
    );
  }

  const getBadgeColor = (r: number) => {
    if (r >= 0.7) return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30';
    if (r >= 0.35) return 'text-blue-500 bg-blue-500/10 border-blue-500/30';
    if (r <= -0.7) return 'text-rose-500 bg-rose-500/10 border-rose-500/30';
    if (r <= -0.35) return 'text-amber-500 bg-amber-500/10 border-amber-500/30';
    return 'text-neutral-400 bg-neutral-500/10 border-neutral-500/30';
  };

  return (
    <div className="absolute top-2.5 left-14 z-20 pointer-events-auto max-w-md select-none">
      <div className="bg-[var(--bg-card)]/90 backdrop-blur-md border border-[var(--border-color)] rounded-xl shadow-lg overflow-hidden transition-all text-xs">
        {/* Header HUD */}
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--border-color)]/60 bg-[var(--bg-header)]/50 gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1.5 font-bold text-[11px] text-[var(--text-main)] hover:text-cyan-500 transition"
          >
            <GitCompare className="w-3.5 h-3.5 text-cyan-500" />
            <span>Correlazioni Sovrapposte ({overlays.length})</span>
            {isExpanded ? <ChevronUp className="w-3 h-3 text-[var(--text-muted)]" /> : <ChevronDown className="w-3 h-3 text-[var(--text-muted)]" />}
          </button>

          <div className="flex items-center gap-1">
            <button
              onClick={onOpenModal}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-[var(--border-color)] text-[10px] text-cyan-500 font-semibold transition"
              title="Aggiungi o configura titoli sovrapposti"
            >
              <Plus className="w-3 h-3" />
              <span>Aggiungi</span>
            </button>
          </div>
        </div>

        {/* Elenco Serie Sovrapposte */}
        {isExpanded && (
          <div className="p-1.5 space-y-1 max-h-48 overflow-y-auto">
            {overlays.map(overlay => {
              const stats = correlationStats[overlay.id];
              const r = stats?.correlationPrice ?? 0;
              const badgeStyle = getBadgeColor(r);

              return (
                <div
                  key={overlay.id}
                  className={`flex items-center justify-between gap-2 px-2 py-1 rounded-lg border transition ${
                    overlay.visible
                      ? 'bg-[var(--bg-main)]/70 border-[var(--border-color)]/50'
                      : 'opacity-50 border-transparent bg-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                      style={{ backgroundColor: overlay.color }}
                    />
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="font-bold text-[11px]">{overlay.ticker}</span>
                      <span className="text-[10px] text-[var(--text-muted)]">
                        {overlay.interval === 'same' ? '' : `[${overlay.interval}]`}
                      </span>
                    </div>

                    {stats && stats.overlapBars > 0 && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${badgeStyle}`}
                          title={`Correlazione Pearson r = ${r.toFixed(3)} (${stats.correlationLabel})`}
                        >
                          r: {r >= 0 ? `+${r.toFixed(2)}` : r.toFixed(2)}
                        </span>

                        <span
                          className={`text-[10px] font-bold font-mono ${
                            stats.overlayReturnPct >= 0
                              ? 'text-emerald-500 dark:text-emerald-400'
                              : 'text-rose-500 dark:text-rose-400'
                          }`}
                          title={`Rendimento nel periodo: ${stats.overlayReturnPct}%`}
                        >
                          {stats.overlayReturnPct >= 0 ? `+${stats.overlayReturnPct}%` : `${stats.overlayReturnPct}%`}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => onToggleVisibility(overlay.id)}
                      className="w-5 h-5 rounded flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--border-color)] transition"
                      title={overlay.visible ? 'Nascondi' : 'Mostra'}
                    >
                      {overlay.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3 text-rose-500" />}
                    </button>
                    <button
                      onClick={() => onRemoveOverlay(overlay.id)}
                      className="w-5 h-5 rounded flex items-center justify-center text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition"
                      title="Elimina sovrapposizione"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
