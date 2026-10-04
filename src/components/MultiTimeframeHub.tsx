import React, { useState, useEffect } from 'react';
import { Layers, X, ChevronDown, ChevronUp, Activity, CheckCircle2, AlertCircle, TrendingUp, TrendingDown, Zap, RefreshCw } from 'lucide-react';
import { CandleData, MultiTimeframeConfluence } from '../types';
import { multiTimeframeService } from '../services/multiTimeframeService';

interface MultiTimeframeHubProps {
  ticker: string;
  currentInterval: string;
  candles: CandleData[];
  onClose?: () => void;
}

export const MultiTimeframeHub: React.FC<MultiTimeframeHubProps> = ({
  ticker,
  currentInterval,
  candles,
  onClose
}) => {
  const [confluence, setConfluence] = useState<MultiTimeframeConfluence | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  const loadConfluence = async () => {
    setLoading(true);
    try {
      const data = await multiTimeframeService.getConfluenceSummary(ticker, candles, currentInterval);
      setConfluence(data);
    } catch (e) {
      console.error('Error loading multi-timeframe confluence:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfluence();
  }, [ticker, currentInterval, candles.length]);

  if (!confluence) return null;

  const getAlignmentBadge = (align: string) => {
    switch (align) {
      case 'STRONG_BULLISH':
        return { label: '🟢 4/4 RIALZISTA FORTE', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' };
      case 'BULLISH':
        return { label: '🟢 3/4 RIALZISTA (BUY BIAS)', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' };
      case 'STRONG_BEARISH':
        return { label: '🔴 4/4 RIBASSISTA FORTE', color: 'bg-rose-500/20 text-rose-400 border-rose-500/40' };
      case 'BEARISH':
        return { label: '🔴 3/4 RIBASSISTA (SELL BIAS)', color: 'bg-rose-500/15 text-rose-300 border-rose-500/30' };
      default:
        return { label: '🟡 CONFLUENZA MISTA (ATTENDI)', color: 'bg-amber-500/15 text-amber-300 border-amber-500/30' };
    }
  };

  const alignInfo = getAlignmentBadge(confluence.overallAlignment);

  return (
    <div className="rounded-2xl bg-[var(--bg-header)]/95 backdrop-blur-xl border border-blue-500/30 shadow-2xl overflow-hidden text-xs text-[var(--text-main)] w-80 md:w-96 select-none animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-gradient-to-r from-blue-900/40 to-indigo-900/40 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-400/30">
            <Layers className="w-3.5 h-3.5" />
          </span>
          <div>
            <div className="font-black text-[11px] uppercase tracking-wider text-white flex items-center gap-1.5">
              <span>Multi-Timeframe Confluence</span>
              <span className="text-[9px] font-mono text-blue-300">({ticker})</span>
            </div>
            <div className="text-[9.5px] text-[var(--text-muted)]">
              Allineamento 4 Timeframe (15m, 1h, 4h, 1d)
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={loadConfluence}
            className="p-1 rounded-lg hover:bg-white/10 text-[var(--text-muted)] hover:text-white transition cursor-pointer"
            title="Ricalcola Confluenza"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin text-blue-400' : ''}`} />
          </button>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 rounded-lg hover:bg-white/10 text-[var(--text-muted)] hover:text-white transition cursor-pointer"
            title={isMinimized ? 'Espandi' : 'Minimizza'}
          >
            {isMinimized ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-white/10 text-[var(--text-muted)] hover:text-white transition cursor-pointer"
              title="Chiudi widget"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Alignment Score Banner */}
      <div className="px-3.5 py-2 bg-[var(--bg-main)]/60 flex items-center justify-between border-b border-[var(--border-color)]">
        <div className={`px-2 py-0.5 rounded-lg border font-black text-[10px] tracking-wide flex items-center gap-1 ${alignInfo.color}`}>
          <Zap className="w-3 h-3" />
          <span>{alignInfo.label}</span>
        </div>
        <div className="text-[10px] font-mono text-[var(--text-muted)]">
          Score: <strong className="text-white font-extrabold">{confluence.confluenceScore}/100</strong>
        </div>
      </div>

      {/* Timeframe Matrix Rows */}
      {!isMinimized && (
        <div className="p-2 space-y-1.5">
          <div className="grid grid-cols-12 gap-1 text-[9px] uppercase font-bold text-[var(--text-muted)] px-2 pb-0.5 border-b border-[var(--border-color)]/60">
            <span className="col-span-3">TF</span>
            <span className="col-span-3 text-center">Trend EMA</span>
            <span className="col-span-3 text-center">RSI (14)</span>
            <span className="col-span-3 text-right">Supertrend / MACD</span>
          </div>

          {confluence.items.map(item => {
            const isBull = item.trend === 'BULLISH';
            const isBear = item.trend === 'BEARISH';
            return (
              <div
                key={item.interval}
                className="grid grid-cols-12 gap-1 items-center px-2 py-1.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)]/80 text-[10.5px] hover:border-blue-500/40 transition"
              >
                {/* Timeframe Label */}
                <div className="col-span-3 flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${isBull ? 'bg-emerald-500' : isBear ? 'bg-rose-500' : 'bg-amber-500'}`} />
                  <span className="font-extrabold text-[11px] font-mono text-white">{item.interval.toUpperCase()}</span>
                </div>

                {/* Trend EMA 50 / 200 */}
                <div className="col-span-3 text-center">
                  <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold ${
                    item.priceAboveEma50 && item.priceAboveEma200
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : !item.priceAboveEma50 && !item.priceAboveEma200
                      ? 'bg-rose-500/15 text-rose-400'
                      : 'bg-amber-500/15 text-amber-400'
                  }`}>
                    {item.priceAboveEma50 && item.priceAboveEma200 ? 'SOPRA EMA' : !item.priceAboveEma50 && !item.priceAboveEma200 ? 'SOTTO EMA' : 'CROSS EMA'}
                  </span>
                </div>

                {/* RSI (14) */}
                <div className="col-span-3 text-center font-mono">
                  <span className={`font-bold ${
                    item.rsi >= 70 ? 'text-rose-400' : item.rsi <= 30 ? 'text-emerald-400' : 'text-blue-300'
                  }`}>
                    {item.rsi.toFixed(0)}
                  </span>
                  <span className="text-[8.5px] text-[var(--text-muted)] block">
                    {item.rsi >= 70 ? 'IPERCOMPR.' : item.rsi <= 30 ? 'IPERVEND.' : 'NEUTRO'}
                  </span>
                </div>

                {/* Supertrend & MACD */}
                <div className="col-span-3 text-right flex items-center justify-end gap-1">
                  <span className={`px-1 py-0.2 rounded text-[9px] font-bold ${
                    item.supertrend === 'BULLISH' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
                  }`}>
                    ST: {item.supertrend === 'BULLISH' ? '▲' : '▼'}
                  </span>
                  <span className={`px-1 py-0.2 rounded text-[9px] font-bold ${
                    item.macd === 'BULLISH' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
                  }`}>
                    M: {item.macd === 'BULLISH' ? '▲' : '▼'}
                  </span>
                </div>
              </div>
            );
          })}

          <div className="text-center text-[9px] text-[var(--text-muted)] pt-1 italic">
            💡 Verifica l'allineamento dei trend prima di eseguire ordini
          </div>
        </div>
      )}
    </div>
  );
};
