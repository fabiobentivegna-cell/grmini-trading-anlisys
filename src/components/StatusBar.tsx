import React from 'react';
import { MovingAverageConfig } from '../types';

interface StatusBarProps {
  statusText: string;
  isError?: boolean;
  openPrice: number | string;
  highPrice: number | string;
  lowPrice: number | string;
  closePrice: number | string;
  activeMAs: MovingAverageConfig[];
  maValues: Record<string, number | string>;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  statusText,
  isError,
  openPrice,
  highPrice,
  lowPrice,
  closePrice,
  activeMAs,
  maValues
}) => {
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
