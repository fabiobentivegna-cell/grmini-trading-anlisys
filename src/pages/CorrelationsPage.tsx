import React, { useState, useEffect } from 'react';
import { GitFork, RefreshCw, Info } from 'lucide-react';
import { CorrelationMatrixData } from '../types';
import { marketDataService } from '../services/marketDataService';

interface CorrelationsPageProps {
  ticker: string;
}

export const CorrelationsPage: React.FC<CorrelationsPageProps> = ({ ticker }) => {
  const [data, setData] = useState<CorrelationMatrixData | null>(null);
  const [days, setDays] = useState(90);
  const [loading, setLoading] = useState(false);

  const loadMatrix = async () => {
    setLoading(true);
    try {
      const res = await marketDataService.getCorrelationsMatrix(ticker, days);
      setData(res);
    } catch (e) {
      console.error('Errore matrice correlazioni:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatrix();
  }, [ticker, days]);

  const getCellBg = (val: number) => {
    if (val === 1.0) return 'bg-blue-600/10 text-blue-500 font-bold';
    if (val >= 0.6) return 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold';
    if (val <= -0.3) return 'bg-red-500/20 text-red-600 dark:text-red-400 font-bold';
    return 'text-[var(--text-main)]';
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[var(--bg-main)]">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header Banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <GitFork className="w-5 h-5 text-blue-500" />
              <h2 className="text-lg font-bold text-[var(--text-main)]">
                Matrice delle Correlazioni Multi-Asset (Pearson)
              </h2>
              <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-blue-500/15 border border-blue-500/30 text-blue-500">
                Target: {ticker} ({days} giorni)
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Misura statistica dell'interdipendenza tra titoli azionari, rendimenti decennali, materie prime e valute
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <label className="text-[var(--text-muted)] font-semibold">Orizzonte:</label>
            <select
              value={days}
              onChange={e => setDays(parseInt(e.target.value) || 90)}
              className="px-2.5 py-1 rounded-lg border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] font-semibold outline-none"
            >
              <option value={30}>30 Giorni (Breve Termine)</option>
              <option value={90}>90 Giorni (Medio Termine)</option>
              <option value={365}>365 Giorni (Lungo Termine)</option>
            </select>

            <button
              onClick={loadMatrix}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs transition shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Ricalcola</span>
            </button>
          </div>
        </div>

        {/* Matrice Card */}
        <div className="p-5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-xs space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-center border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)] uppercase text-[10px]">
                  <th className="py-3 px-4 text-left font-bold">Asset di Confronto</th>
                  {data?.assets.map((asset, idx) => (
                    <th key={idx} className="py-3 px-3 font-semibold">
                      {asset}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)] font-mono">
                {data?.matrix.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-[var(--bg-main)] transition">
                    <td className="py-3 px-4 text-left font-sans font-bold text-[var(--text-main)] whitespace-nowrap">
                      {row.asset}
                    </td>
                    {data.assets.map((colAsset, cIdx) => {
                      const val = row.values[colAsset];
                      return (
                        <td
                          key={cIdx}
                          className={`py-3 px-3 transition-colors ${
                            val !== undefined ? getCellBg(val) : ''
                          }`}
                        >
                          {val !== undefined ? (val >= 0 ? `+${val.toFixed(2)}` : val.toFixed(2)) : '-'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Guida Interpretazione */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-[var(--bg-main)] border border-[var(--border-color)] text-[11px] text-[var(--text-muted)] leading-relaxed">
            <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <div>
              <strong className="text-[var(--text-main)]">Guida all'interpretazione del coefficiente di Pearson (r):</strong>
              <div className="flex flex-wrap gap-4 mt-1 font-mono">
                <span className="text-emerald-500">r &gt; +0.60: Forte correlazione diretta (si muovono insieme)</span>
                <span className="text-blue-500">r ≈ 0.00: Asset incorrelati (ottima diversificazione di portafoglio)</span>
                <span className="text-red-500">r &lt; -0.30: Correlazione inversa / bene rifugio</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
