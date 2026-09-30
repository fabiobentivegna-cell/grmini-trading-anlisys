import React from 'react';
import { BellRing, X, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { PriceAlert } from '../types';

export interface AlertNotificationItem {
  id: string;
  alert: PriceAlert;
  currentPrice: number;
  timestamp: string;
}

interface PriceAlertToastProps {
  notifications: AlertNotificationItem[];
  onDismiss: (id: string) => void;
}

export const PriceAlertToast: React.FC<PriceAlertToastProps> = ({ notifications, onDismiss }) => {
  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-14 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none select-none">
      {notifications.map(item => {
        const isAbove = item.alert.condition === 'ABOVE';
        return (
          <div
            key={item.id}
            className="pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl bg-[var(--bg-header)] border-2 border-blue-500 shadow-2xl animate-in slide-in-from-top-3 duration-200 text-xs"
          >
            <div className={`p-2 rounded-lg shrink-0 ${isAbove ? 'bg-emerald-500/15 text-emerald-500' : 'bg-red-500/15 text-red-500'}`}>
              <BellRing className="w-5 h-5 animate-bounce" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="font-bold text-[var(--text-main)] text-sm flex items-center gap-1">
                  <span>{item.alert.ticker}</span>
                  {isAbove ? (
                    <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-red-500" />
                  )}
                </span>
                <span className="text-[10px] text-[var(--text-muted)] font-mono">
                  {item.timestamp}
                </span>
              </div>

              <p className="text-[var(--text-main)] mt-0.5 leading-snug">
                Il prezzo corrente <strong className="font-mono text-blue-500">{item.currentPrice.toFixed(2)}</strong> ha attraversato la soglia impostata a <strong className="font-mono">{item.alert.targetPrice.toFixed(2)}</strong> ({isAbove ? '≥' : '≤'}).
              </p>
            </div>

            <button
              onClick={() => onDismiss(item.id)}
              className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--border-color)] transition shrink-0"
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
