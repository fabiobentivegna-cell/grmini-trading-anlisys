import React from 'react';
import { BellRing, X, ArrowUpRight, ArrowDownRight, Sparkles, AlertTriangle } from 'lucide-react';

export interface AlertNotificationItem {
  id: string;
  alert: {
    ticker: string;
    targetPrice?: number;
    targetScore?: number;
    condition?: 'ABOVE' | 'BELOW';
    type?: 'price' | 'sentiment' | 'divergence';
    divergenceType?: 'BEARISH_DIVERGENCE' | 'BULLISH_DIVERGENCE';
    priceChangePct?: number;
    sentimentChange?: number;
    description?: string;
    tradingImplication?: string;
    severity?: 'HIGH' | 'MEDIUM' | 'LOW';
    [key: string]: any;
  };
  currentPrice: number;
  timestamp: string;
  onInspect?: () => void;
}

interface PriceAlertToastProps {
  notifications: AlertNotificationItem[];
  onDismiss: (id: string) => void;
  onInspectDivergence?: (item: AlertNotificationItem) => void;
}

export const PriceAlertToast: React.FC<PriceAlertToastProps> = ({ notifications, onDismiss, onInspectDivergence }) => {
  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-14 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none select-none">
      {notifications.map(item => {
        const isDivergence = item.alert.type === 'divergence' || item.alert.divergenceType !== undefined;
        const isSentiment = !isDivergence && (item.alert.type === 'sentiment' || item.alert.targetScore !== undefined);
        const isAbove = item.alert.condition === 'ABOVE';
        const targetVal = isSentiment ? (item.alert.targetScore ?? 0) : (item.alert.targetPrice ?? 0);
        const isBearishDiv = item.alert.divergenceType === 'BEARISH_DIVERGENCE';

        return (
          <div
            key={item.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl bg-[var(--bg-header)] border-2 shadow-2xl animate-in slide-in-from-top-3 duration-200 text-xs ${
              isDivergence
                ? isBearishDiv
                  ? 'border-rose-500 shadow-rose-950/30'
                  : 'border-emerald-500 shadow-emerald-950/30'
                : 'border-blue-500'
            }`}
          >
            <div className={`p-2 rounded-lg shrink-0 ${
              isDivergence
                ? isBearishDiv
                  ? 'bg-rose-500/15 text-rose-500'
                  : 'bg-emerald-500/15 text-emerald-500'
                : isAbove
                ? 'bg-emerald-500/15 text-emerald-500'
                : 'bg-red-500/15 text-red-500'
            }`}>
              {isDivergence ? (
                isBearishDiv ? <AlertTriangle className="w-5 h-5 animate-pulse text-rose-500" /> : <Sparkles className="w-5 h-5 animate-pulse text-emerald-500" />
              ) : isSentiment ? (
                <Sparkles className="w-5 h-5 animate-pulse text-amber-500" />
              ) : (
                <BellRing className="w-5 h-5 animate-bounce" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="font-bold text-[var(--text-main)] text-sm flex items-center gap-1">
                  <span>{item.alert.ticker}</span>
                  {isDivergence ? (
                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold uppercase ${
                      isBearishDiv ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      {isBearishDiv ? 'DIVERGENZA BEARISH' : 'DIVERGENZA BULLISH'}
                    </span>
                  ) : (
                    <>
                      {isAbove ? (
                        <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4 text-red-500" />
                      )}
                      {isSentiment && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-400 font-bold ml-1">
                          SENTIMENT
                        </span>
                      )}
                    </>
                  )}
                </span>
                <span className="text-[10px] text-[var(--text-muted)] font-mono">
                  {item.timestamp}
                </span>
              </div>

              <p className="text-[var(--text-main)] mt-0.5 leading-snug">
                {isDivergence ? (
                  <>
                    {item.alert.description || (
                      isBearishDiv
                        ? 'Prezzo sui massimi con forte contrazione del Sentiment AI.'
                        : 'Prezzo sui minimi con forte rialzo del Sentiment AI.'
                    )}
                  </>
                ) : isSentiment ? (
                  <>
                    Il sentiment aggregato <strong className={`font-mono ${item.currentPrice >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{item.currentPrice >= 0 ? `+${item.currentPrice.toFixed(2)}` : item.currentPrice.toFixed(2)}</strong> ha attraversato la soglia impostata a <strong className="font-mono">{targetVal >= 0 ? `+${targetVal.toFixed(2)}` : targetVal.toFixed(2)}</strong> ({isAbove ? '≥' : '≤'}).
                  </>
                ) : (
                  <>
                    Il prezzo corrente <strong className="font-mono text-blue-500">{item.currentPrice.toFixed(2)}</strong> ha attraversato la soglia impostata a <strong className="font-mono">{targetVal.toFixed(2)}</strong> ({isAbove ? '≥' : '≤'}).
                  </>
                )}
              </p>

              {isDivergence && (
                <div className="mt-2 flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (onInspectDivergence) onInspectDivergence(item);
                      onDismiss(item.id);
                    }}
                    className={`px-2 py-1 rounded text-[10px] font-bold text-white transition cursor-pointer shadow-xs ${
                      isBearishDiv ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                  >
                    Dettagli & Strategia
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => onDismiss(item.id)}
              className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--border-color)] transition shrink-0 cursor-pointer"
              title="Chiudi avviso"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
