import React from 'react';
import {
  MousePointer2,
  Crosshair,
  Minus,
  TrendingUp,
  Sliders,
  ArrowUpRight,
  ArrowDownRight,
  Square,
  Layers,
  Share2,
  Ruler,
  Undo2,
  Trash2,
  GitCompare
} from 'lucide-react';
import { DrawingToolType } from '../types';

interface DrawingToolbarProps {
  currentTool: DrawingToolType;
  onSelectTool: (tool: DrawingToolType) => void;
  isCrosshairActive: boolean;
  onToggleCrosshair: () => void;
  onUndo: () => void;
  onClearAll: () => void;
  onOpenOverlays?: () => void;
  activeOverlaysCount?: number;
}

export const DrawingToolbar: React.FC<DrawingToolbarProps> = ({
  currentTool,
  onSelectTool,
  isCrosshairActive,
  onToggleCrosshair,
  onUndo,
  onClearAll,
  onOpenOverlays,
  activeOverlaysCount = 0
}) => {
  return (
    <aside className="w-12 bg-[var(--bg-header)] border-r border-[var(--border-color)] flex flex-col items-center py-2 gap-1.5 z-20 select-none">
      {/* Cursore Navigazione */}
      <button
        onClick={() => onSelectTool('cursor')}
        className={`w-9 h-8.5 rounded flex items-center justify-center transition border ${
          currentTool === 'cursor'
            ? 'bg-blue-600/15 border-blue-600 text-blue-600'
            : 'border-transparent text-[var(--text-main)] hover:bg-[var(--bg-card)] hover:border-[var(--border-color)]'
        }`}
        title="Puntatore: Naviga, Seleziona, Sposta"
      >
        <MousePointer2 className="w-4 h-4" />
      </button>

      {/* Mirino Crosshair */}
      <button
        onClick={onToggleCrosshair}
        className={`w-9 h-8.5 rounded flex items-center justify-center transition border ${
          isCrosshairActive
            ? 'bg-blue-600/15 border-blue-600 text-blue-600'
            : 'border-transparent text-[var(--text-muted)] hover:bg-[var(--bg-card)] hover:border-[var(--border-color)]'
        }`}
        title="Attiva/Disattiva Mirino Crosshair"
      >
        <Crosshair className="w-4 h-4" />
      </button>

      {/* Sovrapponi & Correla */}
      {onOpenOverlays && (
        <button
          onClick={onOpenOverlays}
          className={`relative w-9 h-8.5 rounded flex items-center justify-center transition border ${
            activeOverlaysCount > 0
              ? 'bg-cyan-500/15 border-cyan-500 text-cyan-500 font-bold'
              : 'border-transparent text-[var(--text-main)] hover:bg-[var(--bg-card)] hover:border-[var(--border-color)]'
          }`}
          title="Confronta & Sovrapponi Titoli / Timeframe"
        >
          <GitCompare className="w-4 h-4" />
          {activeOverlaysCount > 0 && (
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-cyan-600 text-white text-[8px] font-bold flex items-center justify-center">
              {activeOverlaysCount}
            </span>
          )}
        </button>
      )}

      <div className="w-7 h-px bg-[var(--border-color)] my-1" />

      {/* Linea Orizzontale */}
      <button
        onClick={() => onSelectTool('horizontal')}
        className={`w-9 h-8.5 rounded flex items-center justify-center transition border ${
          currentTool === 'horizontal'
            ? 'bg-blue-600/15 border-blue-600 text-blue-600'
            : 'border-transparent text-[var(--text-main)] hover:bg-[var(--bg-card)] hover:border-[var(--border-color)]'
        }`}
        title="Supporto / Resistenza Orizzontale"
      >
        <Minus className="w-4 h-4" />
      </button>

      {/* Trendline */}
      <button
        onClick={() => onSelectTool('trendline')}
        className={`w-9 h-8.5 rounded flex items-center justify-center transition border ${
          currentTool === 'trendline'
            ? 'bg-blue-600/15 border-blue-600 text-blue-600'
            : 'border-transparent text-[var(--text-main)] hover:bg-[var(--bg-card)] hover:border-[var(--border-color)]'
        }`}
        title="Trendline & Canali Dinamici"
      >
        <TrendingUp className="w-4 h-4" />
      </button>

      {/* Ritracciamento Fibonacci */}
      <button
        onClick={() => onSelectTool('fibonacci')}
        className={`w-9 h-8.5 rounded flex items-center justify-center transition border ${
          currentTool === 'fibonacci'
            ? 'bg-blue-600/15 border-blue-600 text-blue-600'
            : 'border-transparent text-[var(--text-main)] hover:bg-[var(--bg-card)] hover:border-[var(--border-color)]'
        }`}
        title="Ritracciamento di Fibonacci con livelli personalizzati"
      >
        <Sliders className="w-4 h-4" />
      </button>

      {/* Rettangolo (Order Block / Supporto-Resistenza) */}
      <button
        onClick={() => onSelectTool('rectangle')}
        className={`w-9 h-8.5 rounded flex items-center justify-center transition border ${
          currentTool === 'rectangle'
            ? 'bg-amber-500/20 border-amber-500 text-amber-500'
            : 'border-transparent text-[var(--text-main)] hover:bg-[var(--bg-card)] hover:border-[var(--border-color)]'
        }`}
        title="Rettangolo: Zone di Supporto, Resistenza & Order Blocks"
      >
        <Square className="w-4 h-4" />
      </button>

      {/* Supply and Demand Zone (Institutional Order Flow & Median Equilibrium) */}
      <button
        onClick={() => onSelectTool('supply_demand')}
        className={`w-9 h-8.5 rounded flex items-center justify-center transition border ${
          currentTool === 'supply_demand'
            ? 'bg-emerald-500/25 border-emerald-500 text-emerald-400 font-bold'
            : 'border-transparent text-[var(--text-main)] hover:bg-[var(--bg-card)] hover:border-[var(--border-color)]'
        }`}
        title="Supply & Demand Zone: Calcolo Automatico Prezzo Mediano 50% & Order Flow Istituzionale"
      >
        <Layers className="w-4 h-4" />
      </button>

      {/* Pattern Armonico XABCD */}
      <button
        onClick={() => onSelectTool('harmonic')}
        className={`w-9 h-8.5 rounded flex items-center justify-center transition border ${
          currentTool === 'harmonic'
            ? 'bg-purple-500/20 border-purple-500 text-purple-500'
            : 'border-transparent text-[var(--text-main)] hover:bg-[var(--bg-card)] hover:border-[var(--border-color)]'
        }`}
        title="Pattern Armonico XABCD (Gartley, Bat, Butterfly, Crab con Ratios Fibonacci)"
      >
        <Share2 className="w-4 h-4" />
      </button>

      {/* Misuratore Percentuale / Prezzo-Tempo */}
      <button
        onClick={() => onSelectTool('measure')}
        className={`w-9 h-8.5 rounded flex items-center justify-center transition border ${
          currentTool === 'measure'
            ? 'bg-cyan-500/20 border-cyan-500 text-cyan-500'
            : 'border-transparent text-[var(--text-main)] hover:bg-[var(--bg-card)] hover:border-[var(--border-color)]'
        }`}
        title="Misuratore: Variazione % Prezzo, Δ Valore e Conteggio Barre Temporali"
      >
        <Ruler className="w-4 h-4" />
      </button>

      <div className="w-7 h-px bg-[var(--border-color)] my-1" />

      {/* Posizione Long */}
      <button
        onClick={() => onSelectTool('long')}
        className={`w-9 h-8.5 rounded flex items-center justify-center transition border ${
          currentTool === 'long'
            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500'
            : 'border-transparent text-[var(--text-main)] hover:bg-[var(--bg-card)] hover:border-[var(--border-color)]'
        }`}
        title="Posizione Long (Rapporto Rischio/Rendimento)"
      >
        <ArrowUpRight className="w-4 h-4 text-emerald-500" />
      </button>

      {/* Posizione Short */}
      <button
        onClick={() => onSelectTool('short')}
        className={`w-9 h-8.5 rounded flex items-center justify-center transition border ${
          currentTool === 'short'
            ? 'bg-rose-500/20 border-rose-500 text-rose-500'
            : 'border-transparent text-[var(--text-main)] hover:bg-[var(--bg-card)] hover:border-[var(--border-color)]'
        }`}
        title="Posizione Short (Rapporto Rischio/Rendimento)"
      >
        <ArrowDownRight className="w-4 h-4 text-rose-500" />
      </button>

      <div className="w-7 h-px bg-[var(--border-color)] my-1" />

      {/* Annulla */}
      <button
        onClick={onUndo}
        className="w-9 h-8.5 rounded flex items-center justify-center border border-transparent text-[var(--text-main)] hover:bg-[var(--bg-card)] hover:border-[var(--border-color)] transition"
        title="Annulla Ultimo Disegno"
      >
        <Undo2 className="w-4 h-4" />
      </button>

      {/* Cancella Tutto */}
      <button
        onClick={onClearAll}
        className="w-9 h-8.5 rounded flex items-center justify-center border border-transparent text-red-500 hover:bg-red-500/10 transition mt-auto"
        title="Cancella Tutti i Disegni"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </aside>
  );
};
