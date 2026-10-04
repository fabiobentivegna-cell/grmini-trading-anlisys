import React from 'react';
import {
  X,
  AlertTriangle,
  TrendingUp,
  Sparkles,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  Bell
} from 'lucide-react';
import { SentimentDivergenceAlert } from '../types';

interface DivergenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  alert: SentimentDivergenceAlert | null;
  monitoringEnabled: boolean;
  onToggleMonitoring: (enabled: boolean) => void;
  sensitivity: 'HIGH' | 'MEDIUM' | 'LOW';
  onChangeSensitivity: (s: 'HIGH' | 'MEDIUM' | 'LOW') => void;
  onOpenChart?: (alert: SentimentDivergenceAlert) => void;
}

export const DivergenceModal: React.FC<DivergenceModalProps> = ({
  isOpen,
  onClose,
  alert,
  monitoringEnabled,
  onToggleMonitoring,
  sensitivity,
  onChangeSensitivity,
  onOpenChart
}) => {
  if (!isOpen || !alert) return null;

  const isBearish = alert.type === 'BEARISH_DIVERGENCE';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-[var(--bg-header)] border border-[var(--border-color)] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden text-xs flex flex-col">
        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)] ${
          isBearish ? 'bg-rose-500/10' : 'bg-emerald-500/10'
        }`}>
          <div className="flex items-center gap-2.5">
            <span className={`p-2 rounded-xl text-white shadow-md ${
              isBearish ? 'bg-rose-600' : 'bg-emerald-600'
            }`}>
              {isBearish ? <AlertTriangle className="w-5 h-5 animate-pulse" /> : <Sparkles className="w-5 h-5 animate-pulse" />}
            </span>
            <div>
              <div className="flex items-center gap-2 font-bold text-sm text-[var(--text-main)] uppercase">
                <span>{isBearish ? 'Divergenza Ribassista (Bearish)' : 'Divergenza Rialzista (Bullish)'}</span>
                <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                  alert.severity === 'HIGH' ? 'bg-rose-600 text-white' : 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                }`}>
                  {alert.severity} SEVERITY
                </span>
              </div>
              <span className="text-[10px] text-[var(--text-muted)] font-mono">
                Asset: {alert.ticker} • Rilevato alle: {alert.timestamp}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto max-h-[75vh]">
          {/* Card Metriche Divergenza */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] flex flex-col justify-between">
              <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] flex items-center gap-1">
                {isBearish ? <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" /> : <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" />}
                <span>Movimento Prezzo</span>
              </span>
              <div className="mt-2">
                <div className="text-base font-bold font-mono text-[var(--text-main)]">
                  {alert.currentPrice.toFixed(2)}
                </div>
                <div className={`text-xs font-bold font-mono ${alert.priceChangePct >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {alert.priceChangePct >= 0 ? `+${alert.priceChangePct}%` : `${alert.priceChangePct}%`} nel periodo
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] flex flex-col justify-between">
              <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] flex items-center gap-1">
                {alert.sentimentChange >= 0 ? <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" /> : <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" />}
                <span>Sentiment AI Gemini</span>
              </span>
              <div className="mt-2">
                <div className={`text-base font-bold font-mono ${alert.currentSentiment >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {alert.currentSentiment >= 0 ? `+${alert.currentSentiment.toFixed(2)}` : alert.currentSentiment.toFixed(2)}
                </div>
                <div className={`text-xs font-bold font-mono ${alert.sentimentChange >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {alert.sentimentChange >= 0 ? `+${alert.sentimentChange}` : `${alert.sentimentChange}`} pt variazione
                </div>
              </div>
            </div>
          </div>

          {/* Spiegazione Analitica AI */}
          <div className="p-3 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] space-y-1.5">
            <span className="font-bold text-[11px] text-[var(--text-main)] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
              <span>Diagnosi di Divergenza Quantitativa</span>
            </span>
            <p className="text-[11px] text-[var(--text-main)] leading-relaxed">
              {alert.description}
            </p>
          </div>

          {/* Implicazione Operativa & Risk Management */}
          <div className={`p-3 rounded-xl border space-y-1.5 ${
            isBearish ? 'bg-rose-500/5 border-rose-500/30' : 'bg-emerald-500/5 border-emerald-500/30'
          }`}>
            <span className={`font-bold text-[11px] flex items-center gap-1.5 ${
              isBearish ? 'text-rose-500' : 'text-emerald-500'
            }`}>
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Implicazione Operativa Consigliata</span>
            </span>
            <p className="text-[11px] text-[var(--text-main)] leading-relaxed">
              {alert.tradingImplication}
            </p>
          </div>

          {/* Controlli Monitoraggio & Sensibilità */}
          <div className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-blue-500" />
                <span className="font-bold text-[11px] text-[var(--text-main)]">
                  Monitoraggio Automatico Divergenze
                </span>
              </div>
              <input
                type="checkbox"
                checked={monitoringEnabled}
                onChange={e => onToggleMonitoring(e.target.checked)}
                className="cursor-pointer h-4 w-4 accent-blue-600"
              />
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[var(--text-muted)]">Soglia Sensibilità:</span>
              <div className="flex items-center gap-1">
                {(['HIGH', 'MEDIUM', 'LOW'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => onChangeSensitivity(s)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                      sensitivity === s
                        ? 'bg-blue-600 text-white'
                        : 'bg-[var(--bg-main)] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-color)]'
                    }`}
                  >
                    {s === 'HIGH' ? 'Alta (1.2%)' : s === 'MEDIUM' ? 'Media (2.0%)' : 'Bassa (3.5%)'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="p-3 border-t border-[var(--border-color)] bg-[var(--bg-card)] flex items-center justify-end gap-2">
          {onOpenChart && (
            <button
              onClick={() => {
                onOpenChart(alert);
                onClose();
              }}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Esamina sul Grafico</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] hover:bg-[var(--border-color)] text-[var(--text-main)] font-semibold text-xs transition cursor-pointer"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};
