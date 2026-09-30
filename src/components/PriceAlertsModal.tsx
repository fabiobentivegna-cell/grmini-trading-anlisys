import React, { useState, useEffect } from 'react';
import {
  X,
  Bell,
  BellRing,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Volume2
} from 'lucide-react';
import { PriceAlert } from '../types';

interface PriceAlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTicker: string;
  currentPrice: number;
  alerts: PriceAlert[];
  onAddAlert: (alert: Omit<PriceAlert, 'id' | 'createdAt' | 'triggered'>) => void;
  onRemoveAlert: (id: string) => void;
  onToggleAlert: (id: string) => void;
  onResetAlert: (id: string) => void;
  onClearAllAlerts: () => void;
  onTestNotification: () => void;
  notificationPermission: NotificationPermission | 'unsupported';
  onRequestPermission: () => void;
}

export const PriceAlertsModal: React.FC<PriceAlertsModalProps> = ({
  isOpen,
  onClose,
  currentTicker,
  currentPrice,
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
  const [targetPrice, setTargetPrice] = useState<string>(
    currentPrice > 0 ? (currentPrice * 1.02).toFixed(2) : '100.00'
  );

  useEffect(() => {
    setTickerInput(currentTicker);
    if (currentPrice > 0) {
      setTargetPrice((currentPrice * 1.02).toFixed(2));
    }
  }, [currentTicker, currentPrice, isOpen]);

  if (!isOpen) return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const priceVal = parseFloat(targetPrice);
    if (isNaN(priceVal) || priceVal <= 0 || !tickerInput.trim()) return;

    onAddAlert({
      ticker: tickerInput.trim().toUpperCase(),
      targetPrice: priceVal,
      condition,
      active: true
    });
  };

  const applyOffset = (pct: number) => {
    const base = currentPrice > 0 ? currentPrice : parseFloat(targetPrice) || 100;
    const calculated = base * (1 + pct / 100);
    setTargetPrice(calculated.toFixed(2));
    setCondition(pct >= 0 ? 'ABOVE' : 'BELOW');
  };

  const activeAlerts = alerts.filter(a => a.active && !a.triggered);
  const triggeredAlerts = alerts.filter(a => a.triggered);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4">
      <div className="bg-[var(--bg-header)] border border-[var(--border-color)] rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden text-xs">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-2 font-bold text-sm text-[var(--text-main)] uppercase tracking-wide">
            <BellRing className="w-4.5 h-4.5 text-blue-500" />
            <span>Allarmi di Prezzo & Notifiche Browser</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Permission Status Banner */}
          <div className="p-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[11px] text-[var(--text-muted)] flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-blue-500" />
                <span>Stato Notifiche Browser:</span>
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
                  ? 'BLOCCATE DAL BROWSER'
                  : notificationPermission === 'unsupported'
                  ? 'NON SUPPORTATE'
                  : 'IN ATTESA DI PERMESSO'}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1 border-t border-[var(--border-color)]">
              <p className="text-[10px] text-[var(--text-muted)] leading-tight">
                {notificationPermission === 'granted'
                  ? 'Le notifiche di sistema appariranno anche se riduci a icona la finestra.'
                  : 'Abilita i permessi del browser per ricevere gli avvisi acustici e visivi.'}
              </p>

              <div className="flex items-center gap-1.5 shrink-0">
                {notificationPermission !== 'granted' && notificationPermission !== 'unsupported' && (
                  <button
                    onClick={onRequestPermission}
                    className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[10px] transition"
                  >
                    Richiedi Permesso
                  </button>
                )}
                <button
                  onClick={onTestNotification}
                  className="flex items-center gap-1 px-2 py-1 rounded border border-[var(--border-color)] hover:bg-[var(--border-color)] text-[var(--text-main)] text-[10px] font-semibold transition"
                  title="Invia una notifica di prova"
                >
                  <Volume2 className="w-3 h-3 text-purple-500" />
                  <span>Test Notifica</span>
                </button>
              </div>
            </div>
          </div>

          {/* Form Crea Allerta */}
          <form onSubmit={handleCreate} className="p-3.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2">
              <span className="font-bold text-xs uppercase tracking-wider text-[var(--text-main)]">
                Imposta Nuovo Allarme
              </span>
              {currentPrice > 0 && (
                <span className="text-[11px] text-[var(--text-muted)] font-mono">
                  Prezzo attuale: <strong className="text-blue-500">{currentPrice.toFixed(2)}</strong>
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-bold uppercase text-[var(--text-muted)] mb-1">
                  Ticker:
                </label>
                <input
                  type="text"
                  value={tickerInput}
                  onChange={e => setTickerInput(e.target.value)}
                  className="w-full uppercase font-mono font-bold px-2 py-1.5 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] outline-none"
                  placeholder="AAPL"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[var(--text-muted)] mb-1">
                  Condizione:
                </label>
                <select
                  value={condition}
                  onChange={e => setCondition(e.target.value as any)}
                  className="w-full px-2 py-1.5 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] outline-none font-semibold text-xs"
                >
                  <option value="ABOVE">Supera verso l'alto (≥)</option>
                  <option value="BELOW">Scende al di sotto (≤)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[var(--text-muted)] mb-1">
                  Prezzo Soglia:
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={targetPrice}
                  onChange={e => setTargetPrice(e.target.value)}
                  className="w-full font-mono font-bold px-2 py-1.5 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] outline-none"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            {/* Quick Offset Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[10px] text-[var(--text-muted)] font-semibold">Offset rapido:</span>
              <button
                type="button"
                onClick={() => applyOffset(1)}
                className="px-2 py-0.5 rounded bg-[var(--input-bg)] hover:bg-[var(--border-color)] border border-[var(--border-color)] font-mono text-[10px] font-bold text-emerald-500"
              >
                +1%
              </button>
              <button
                type="button"
                onClick={() => applyOffset(2)}
                className="px-2 py-0.5 rounded bg-[var(--input-bg)] hover:bg-[var(--border-color)] border border-[var(--border-color)] font-mono text-[10px] font-bold text-emerald-500"
              >
                +2%
              </button>
              <button
                type="button"
                onClick={() => applyOffset(5)}
                className="px-2 py-0.5 rounded bg-[var(--input-bg)] hover:bg-[var(--border-color)] border border-[var(--border-color)] font-mono text-[10px] font-bold text-emerald-500"
              >
                +5%
              </button>
              <button
                type="button"
                onClick={() => applyOffset(-1)}
                className="px-2 py-0.5 rounded bg-[var(--input-bg)] hover:bg-[var(--border-color)] border border-[var(--border-color)] font-mono text-[10px] font-bold text-red-500"
              >
                -1%
              </button>
              <button
                type="button"
                onClick={() => applyOffset(-2)}
                className="px-2 py-0.5 rounded bg-[var(--input-bg)] hover:bg-[var(--border-color)] border border-[var(--border-color)] font-mono text-[10px] font-bold text-red-500"
              >
                -2%
              </button>
              <button
                type="button"
                onClick={() => applyOffset(-5)}
                className="px-2 py-0.5 rounded bg-[var(--input-bg)] hover:bg-[var(--border-color)] border border-[var(--border-color)] font-mono text-[10px] font-bold text-red-500"
              >
                -5%
              </button>

              <button
                type="submit"
                className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold transition shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Attiva Allarme</span>
              </button>
            </div>
          </form>

          {/* Lista Allarmi Attivi */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold uppercase text-[11px] text-[var(--text-muted)]">
                Allarmi Attivi ({activeAlerts.length})
              </span>
              {alerts.length > 0 && (
                <button
                  onClick={onClearAllAlerts}
                  className="text-[10px] text-red-500 hover:underline"
                >
                  Cancella tutti
                </button>
              )}
            </div>

            {activeAlerts.length > 0 ? (
              <div className="space-y-1.5">
                {activeAlerts.map(alert => (
                  <div
                    key={alert.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)]"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                      <div>
                        <div className="font-mono font-bold text-[var(--text-main)] text-xs">
                          {alert.ticker}
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)]">
                          Creato il: {alert.createdAt}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                          alert.condition === 'ABOVE'
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                            : 'bg-red-500/10 text-red-500 border-red-500/30'
                        }`}
                      >
                        {alert.condition === 'ABOVE' ? '≥' : '≤'} {alert.targetPrice.toFixed(2)}
                      </span>

                      <button
                        onClick={() => onRemoveAlert(alert.id)}
                        className="p-1 rounded text-red-500 hover:bg-red-500/10 transition"
                        title="Elimina allarme"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center rounded-lg border border-dashed border-[var(--border-color)] text-[var(--text-muted)]">
                Nessun allarme attivo al momento.
              </div>
            )}
          </div>

          {/* Lista Allarmi Scattati (Triggered) */}
          {triggeredAlerts.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-[var(--border-color)]">
              <span className="font-bold uppercase text-[11px] text-[var(--text-muted)] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Allarmi Scattati di Recente ({triggeredAlerts.length})</span>
              </span>

              <div className="space-y-1.5">
                {triggeredAlerts.map(alert => (
                  <div
                    key={alert.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20"
                  >
                    <div>
                      <div className="font-mono font-bold text-[var(--text-main)] text-xs flex items-center gap-2">
                        <span>{alert.ticker}</span>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                          Soglia {alert.condition === 'ABOVE' ? '≥' : '≤'} {alert.targetPrice.toFixed(2)} Raggiunta!
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onResetAlert(alert.id)}
                        className="flex items-center gap-1 px-2 py-0.5 rounded border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--border-color)] text-[10px] font-semibold text-[var(--text-main)] transition"
                        title="Riattiva questo allarme"
                      >
                        <RotateCcw className="w-3 h-3 text-blue-500" />
                        <span>Riattiva</span>
                      </button>
                      <button
                        onClick={() => onRemoveAlert(alert.id)}
                        className="p-1 rounded text-red-500 hover:bg-red-500/10 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-3 border-t border-[var(--border-color)] bg-[var(--bg-card)]">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold transition text-xs"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};
