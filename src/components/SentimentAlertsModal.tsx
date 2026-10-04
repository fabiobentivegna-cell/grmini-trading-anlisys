import React, { useState, useEffect } from 'react';
import {
  X,
  Bell,
  Plus,
  Trash2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Volume2,
  TrendingUp,
  TrendingDown,
  Sliders,
  Filter
} from 'lucide-react';
import { SentimentAlert } from '../types';

interface SentimentAlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTicker: string;
  currentSentimentScore?: number;
  alerts: SentimentAlert[];
  onAddAlert: (alert: Omit<SentimentAlert, 'id' | 'createdAt' | 'triggered'>) => void;
  onRemoveAlert: (id: string) => void;
  onToggleAlert: (id: string) => void;
  onResetAlert: (id: string) => void;
  onClearAllAlerts: () => void;
  onTestNotification: () => void;
  notificationPermission: NotificationPermission | 'unsupported';
  onRequestPermission: () => void;
}

export const SentimentAlertsModal: React.FC<SentimentAlertsModalProps> = ({
  isOpen,
  onClose,
  currentTicker,
  currentSentimentScore = 0,
  alerts,
  onAddAlert,
  onRemoveAlert,
  onToggleAlert,
  onResetAlert,
  onClearAllAlerts,
  onTestNotification,
  notificationPermission,
  onRequestPermission
}) => {
  const [tickerInput, setTickerInput] = useState(currentTicker);
  const [condition, setCondition] = useState<'ABOVE' | 'BELOW'>('ABOVE');
  const [targetScore, setTargetScore] = useState<number>(0.50);
  const [filterCurrentOnly, setFilterCurrentOnly] = useState(false);

  useEffect(() => {
    setTickerInput(currentTicker);
  }, [currentTicker, isOpen]);

  if (!isOpen) return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tickerInput.trim()) return;

    onAddAlert({
      ticker: tickerInput.trim().toUpperCase(),
      targetScore: Number(targetScore.toFixed(2)),
      condition,
      active: true
    });
  };

  const setPreset = (score: number, cond: 'ABOVE' | 'BELOW') => {
    setTargetScore(score);
    setCondition(cond);
  };

  const displayedAlerts = filterCurrentOnly
    ? alerts.filter(a => a.ticker.toUpperCase() === currentTicker.toUpperCase())
    : alerts;

  const activeCount = alerts.filter(a => a.active && !a.triggered).length;
  const triggeredCount = alerts.filter(a => a.triggered).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-[var(--bg-header)] border border-[var(--border-color)] rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden text-xs">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-card)]">
          <div className="flex items-center gap-2 font-bold text-sm text-[var(--text-main)] uppercase tracking-wide">
            <span className="p-1.5 rounded-lg bg-linear-to-r from-blue-600 to-indigo-600 text-white shadow-xs">
              <Sparkles className="w-4 h-4" />
            </span>
            <span>Allarmi di Sentiment Gemini AI & Push</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Permission Status Banner */}
          <div className="p-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[11px] text-[var(--text-muted)] flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-blue-500" />
                <span>Notifiche Push Browser & Desktop:</span>
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                  notificationPermission === 'granted'
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                    : notificationPermission === 'denied'
                    ? 'bg-red-500/15 border-red-500 text-red-600 dark:text-red-400'
                    : 'bg-amber-500/15 border-amber-500 text-amber-600 dark:text-amber-400'
                }`}
              >
                {notificationPermission === 'granted'
                  ? 'ABILITATE'
                  : notificationPermission === 'denied'
                  ? 'BLOCCATE'
                  : 'IN ATTESA DI PERMESSO'}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1 border-t border-[var(--border-color)]">
              <p className="text-[10px] text-[var(--text-muted)] leading-tight">
                {notificationPermission === 'granted'
                  ? 'Riceverai avvisi visivi e sonori quando l\'analisi del sentiment delle notizie supera o scende sotto la soglia definita.'
                  : 'Abilita le notifiche del browser per ricevere gli alert anche a finestra ridotta.'}
              </p>

              <div className="flex items-center gap-1.5 shrink-0">
                {notificationPermission !== 'granted' && notificationPermission !== 'unsupported' && (
                  <button
                    onClick={onRequestPermission}
                    className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[10px] transition cursor-pointer"
                  >
                    Abilita Notifiche
                  </button>
                )}
                <button
                  onClick={onTestNotification}
                  className="flex items-center gap-1 px-2 py-1 rounded border border-[var(--border-color)] hover:bg-[var(--border-color)] text-[var(--text-main)] text-[10px] font-semibold transition cursor-pointer"
                  title="Invia una notifica di prova"
                >
                  <Volume2 className="w-3 h-3 text-purple-500" />
                  <span>Test Push</span>
                </button>
              </div>
            </div>
          </div>

          {/* Form Crea Alert Sentiment */}
          <form onSubmit={handleCreate} className="p-3.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2">
              <span className="font-bold text-xs uppercase tracking-wider text-[var(--text-main)] flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-blue-500" />
                <span>Imposta Nuovo Alert di Sentiment</span>
              </span>
              <span className="text-[11px] text-[var(--text-muted)] font-mono">
                Sentiment attuale {currentTicker}: <strong className={`${currentSentimentScore >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {currentSentimentScore >= 0 ? `+${currentSentimentScore.toFixed(2)}` : currentSentimentScore.toFixed(2)}
                </strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[10px] font-bold uppercase text-[var(--text-muted)] mb-1">
                  Ticker:
                </label>
                <input
                  type="text"
                  value={tickerInput}
                  onChange={e => setTickerInput(e.target.value)}
                  className="w-full uppercase font-mono font-bold px-2.5 py-1.5 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] outline-none"
                  placeholder="Es: FTSEMIB.MI"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[var(--text-muted)] mb-1">
                  Condizione:
                </label>
                <select
                  value={condition}
                  onChange={e => setCondition(e.target.value as 'ABOVE' | 'BELOW')}
                  className="w-full px-2.5 py-1.5 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] text-xs font-semibold outline-none"
                >
                  <option value="ABOVE">🟢 Sale Sopra (≥ Supera Soglia)</option>
                  <option value="BELOW">🔴 Scende Sotto (≤ Sotto Soglia)</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold uppercase text-[var(--text-muted)]">
                    Soglia Score:
                  </label>
                  <span className={`font-mono font-bold text-xs ${targetScore >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {targetScore >= 0 ? `+${targetScore.toFixed(2)}` : targetScore.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min="-1.00"
                  max="1.00"
                  step="0.05"
                  value={targetScore}
                  onChange={e => setTargetScore(parseFloat(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer h-2 bg-[var(--input-bg)] rounded-lg appearance-none"
                />
              </div>
            </div>

            {/* Quick Presets */}
            <div>
              <span className="block text-[10px] font-bold uppercase text-[var(--text-muted)] mb-1.5">
                Scorciatoie Preimpostate (Presets):
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={() => setPreset(0.50, 'ABOVE')}
                  className={`px-2 py-1 rounded border text-[10px] font-semibold text-left transition cursor-pointer ${
                    targetScore === 0.50 && condition === 'ABOVE'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold'
                      : 'border-[var(--border-color)] hover:bg-[var(--border-color)] text-[var(--text-muted)]'
                  }`}
                >
                  🟢 Bullish (≥ +0.50)
                </button>
                <button
                  type="button"
                  onClick={() => setPreset(0.80, 'ABOVE')}
                  className={`px-2 py-1 rounded border text-[10px] font-semibold text-left transition cursor-pointer ${
                    targetScore === 0.80 && condition === 'ABOVE'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold'
                      : 'border-[var(--border-color)] hover:bg-[var(--border-color)] text-[var(--text-muted)]'
                  }`}
                >
                  💎 Euforia (≥ +0.80)
                </button>
                <button
                  type="button"
                  onClick={() => setPreset(-0.30, 'BELOW')}
                  className={`px-2 py-1 rounded border text-[10px] font-semibold text-left transition cursor-pointer ${
                    targetScore === -0.30 && condition === 'BELOW'
                      ? 'bg-rose-500/20 border-rose-500 text-rose-600 dark:text-rose-400 font-bold'
                      : 'border-[var(--border-color)] hover:bg-[var(--border-color)] text-[var(--text-muted)]'
                  }`}
                >
                  ⚠️ Warning (≤ -0.30)
                </button>
                <button
                  type="button"
                  onClick={() => setPreset(-0.70, 'BELOW')}
                  className={`px-2 py-1 rounded border text-[10px] font-semibold text-left transition cursor-pointer ${
                    targetScore === -0.70 && condition === 'BELOW'
                      ? 'bg-rose-500/20 border-rose-500 text-rose-600 dark:text-rose-400 font-bold'
                      : 'border-[var(--border-color)] hover:bg-[var(--border-color)] text-[var(--text-muted)]'
                  }`}
                >
                  🩸 Panico (≤ -0.70)
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Aggiungi Alert di Sentiment</span>
            </button>
          </form>

          {/* Lista Allarmi */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs uppercase tracking-wider text-[var(--text-main)]">
                  Allarmi Configurati ({displayedAlerts.length})
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-500 font-bold">
                  {activeCount} attivi
                </span>
                {triggeredCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-500 font-bold">
                    {triggeredCount} scattati
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFilterCurrentOnly(!filterCurrentOnly)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border transition cursor-pointer ${
                    filterCurrentOnly
                      ? 'bg-blue-500/15 border-blue-500 text-blue-500'
                      : 'border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  <Filter className="w-3 h-3" />
                  <span>Solo {currentTicker}</span>
                </button>

                {alerts.length > 0 && (
                  <button
                    onClick={onClearAllAlerts}
                    className="text-[10px] text-rose-500 hover:underline cursor-pointer"
                  >
                    Elimina tutti
                  </button>
                )}
              </div>
            </div>

            {displayedAlerts.length === 0 ? (
              <div className="text-center py-6 text-xs text-[var(--text-muted)] border border-dashed border-[var(--border-color)] rounded-lg">
                Nessun alert di sentiment configurato per questo ticker. Impostane uno sopra per ricevere notifiche push!
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {displayedAlerts.map(alert => {
                  const isAbove = alert.condition === 'ABOVE';
                  const isScorePositive = alert.targetScore >= 0;

                  return (
                    <div
                      key={alert.id}
                      className={`p-2.5 rounded-lg border flex items-center justify-between transition ${
                        alert.triggered
                          ? 'bg-amber-500/5 border-amber-500/30'
                          : alert.active
                          ? 'bg-[var(--bg-card)] border-[var(--border-color)]'
                          : 'bg-[var(--bg-main)] border-[var(--border-color)] opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`p-1.5 rounded ${
                            alert.triggered
                              ? 'bg-amber-500/15 text-amber-500'
                              : isAbove
                              ? 'bg-emerald-500/15 text-emerald-500'
                              : 'bg-rose-500/15 text-rose-500'
                          }`}
                        >
                          {isAbove ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-[var(--text-main)]">{alert.ticker}</span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${
                                isAbove
                                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
                              }`}
                            >
                              Sentiment {isAbove ? '≥' : '≤'} {isScorePositive ? `+${alert.targetScore.toFixed(2)}` : alert.targetScore.toFixed(2)}
                            </span>
                            {alert.triggered ? (
                              <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[9px] font-bold flex items-center gap-1">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                <span>SCATTATO</span>
                              </span>
                            ) : alert.active ? (
                              <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold">
                                ATTIVO
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded bg-gray-500/20 text-gray-400 text-[9px] font-bold">
                                IN PAUSA
                              </span>
                            )}
                          </div>

                          <div className="text-[10px] text-[var(--text-muted)] mt-0.5 flex items-center gap-2">
                            <span>Creato il: {new Date(alert.createdAt).toLocaleDateString('it-IT')}</span>
                            {alert.triggered && alert.lastTriggeredScore !== undefined && (
                              <span className="font-medium text-amber-500">
                                • Rilevato score: {alert.lastTriggeredScore >= 0 ? `+${alert.lastTriggeredScore.toFixed(2)}` : alert.lastTriggeredScore.toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {alert.triggered && (
                          <button
                            onClick={() => onResetAlert(alert.id)}
                            className="p-1 rounded hover:bg-[var(--border-color)] text-amber-500 transition cursor-pointer"
                            title="Reimposta e riattiva alert"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => onToggleAlert(alert.id)}
                          className={`px-2 py-1 rounded text-[10px] font-semibold border transition cursor-pointer ${
                            alert.active
                              ? 'border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10'
                              : 'border-[var(--border-color)] text-[var(--text-muted)] hover:bg-[var(--border-color)]'
                          }`}
                        >
                          {alert.active ? 'Attivo' : 'Pausa'}
                        </button>
                        <button
                          onClick={() => onRemoveAlert(alert.id)}
                          className="p-1 rounded hover:bg-rose-500/10 text-rose-500 transition cursor-pointer"
                          title="Elimina allarme"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-[var(--bg-card)] border-t border-[var(--border-color)] flex items-center justify-between">
          <span className="text-[10px] text-[var(--text-muted)]">
            💡 Gemini AI controlla in background il flusso informativo e fa scattare l'alert in tempo reale.
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition cursor-pointer"
          >
            Fatto
          </button>
        </div>
      </div>
    </div>
  );
};
