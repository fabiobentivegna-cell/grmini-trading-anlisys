import React from 'react';
import { MovingAverageConfig } from '../types';

interface StatusBarProps {
  statusText: string;
  isError?: boolean;
  openPrice: number | string;
  highPrice: number | string;
  lowPrice: number | string;
  closePrice: number | string;
  barTime?: string | number;
  activeMAs: MovingAverageConfig[];
  maValues: Record<string, number | string>;
  atrValue?: number | string | null;
  atrPeriod?: number;
  atrColor?: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  statusText,
  isError,
  openPrice,
  highPrice,
  lowPrice,
  closePrice,
  barTime,
  activeMAs,
  maValues,
  atrValue,
  atrPeriod = 14,
  atrColor = '#26c6da'
}) => {
  const formattedBarTime = React.useMemo(() => {
    if (!barTime) return null;
    if (typeof barTime === 'number') {
      const d = new Date(barTime * 1000);
      return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    }
    return String(barTime);
  }, [barTime]);

  const atrPercent = React.useMemo(() => {
    if (atrValue === undefined || atrValue === null || typeof atrValue === 'string' && atrValue === '-') return null;
    const numAtr = typeof atrValue === 'number' ? atrValue : parseFloat(atrValue);
    const numClose = typeof closePrice === 'number' ? closePrice : parseFloat(String(closePrice));
    if (!isNaN(numAtr) && !isNaN(numClose) && numClose > 0) {
      return ((numAtr / numClose) * 100).toFixed(2);
    }
    return null;
  }, [atrValue, closePrice]);

  return (
    <div className="flex items-center gap-3 px-3 py-1 bg-[var(--bg-bar)] border-b border-[var(--border-color)] text-[11px] overflow-x-auto whitespace-nowrap select-none z-20">
      <div
        className={`font-semibold ${
          isError ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'
        }`}
      >
        {statusText}
      </div>

      <div className="h-3 w-px bg-[var(--border-color)]" />

      {formattedBarTime && (
        <>
          <div className="flex items-center gap-1 font-mono text-[var(--text-muted)]">
            <span>🕒 Ora Candela:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {formattedBarTime}
            </span>
          </div>
          <div className="h-3 w-px bg-[var(--border-color)]" />
        </>
      )}

      {/* OHLC Bar Data */}
      <div className="flex items-center gap-2 font-mono text-[var(--text-muted)]">
        <div>
          O: <span className="font-semibold text-[var(--text-main)]">{openPrice}</span>
        </div>
        <div>
          H: <span className="font-semibold text-[var(--text-main)]">{highPrice}</span>
        </div>
        <div>
          L: <span className="font-semibold text-[var(--text-main)]">{lowPrice}</span>
        </div>
        <div>
          C: <span className="font-semibold text-[var(--text-main)]">{closePrice}</span>
        </div>
      </div>

      <div className="h-3 w-px bg-[var(--border-color)]" />

      {/* Volatilità ATR (Average True Range) */}
      <div
        className="flex items-center gap-1.5 px-2 py-0.5 rounded font-mono text-[11px] bg-[var(--bg-card)] border border-[var(--border-color)]"
        title={`Average True Range (${atrPeriod} periodi): Misura la volatilità media assoluta e percentuale del mercato`}
      >
        <span className="font-bold" style={{ color: atrColor }}>
          ATR ({atrPeriod}):
        </span>
        <span className="font-bold text-[var(--text-main)]">
          {atrValue !== undefined && atrValue !== null ? atrValue : '-'}
        </span>
        {atrPercent && (
          <span className="text-[10px] text-amber-500/90 font-medium">
            (±{atrPercent}%)
          </span>
        )}
      </div>

      {activeMAs.length > 0 && (
        <>
          <div className="h-3 w-px bg-[var(--border-color)]" />
          <div className="flex items-center gap-2 font-mono">
            {activeMAs
              .filter(ma => ma.enabled)
              .map(ma => (
                <div key={ma.id} style={{ color: ma.color }}>
                  {ma.type}
                  {ma.period}:{' '}
                  <span className="font-bold">
                    {maValues[ma.id] !== undefined ? maValues[ma.id] : '-'}
                  </span>
                </div>
              ))}
          </div>
        </>
      )}
    </div>
  );
};
