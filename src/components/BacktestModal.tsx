import React, { useState, useMemo } from 'react';
import {
  X,
  RotateCcw,
  Sliders,
  TrendingUp,
  Activity,
  Award,
  ShieldAlert,
  Percent,
  DollarSign,
  BarChart2,
  List,
  Sparkles,
  Zap,
  Download,
  Clock
} from 'lucide-react';
import { CandleData, BacktestConfig, BacktestResult, MaType, BacktestDirection } from '../types';
import { backtestService, DEFAULT_BACKTEST_CONFIG, STRATEGY_PRESETS } from '../services/backtestService';

interface BacktestModalProps {
  isOpen: boolean;
  onClose: () => void;
  candles: CandleData[];
  ticker: string;
  interval: string;
  onSelectTrade?: (trade: { entryDate: string; exitDate: string; type: 'LONG' | 'SHORT' }) => void;
}

export const BacktestModal: React.FC<BacktestModalProps> = ({
  isOpen,
  onClose,
  candles,
  ticker,
  interval,
  onSelectTrade
}) => {
  const [config, setConfig] = useState<BacktestConfig>(DEFAULT_BACKTEST_CONFIG);
  const [selectedPreset, setSelectedPreset] = useState<string>('momentum_9_21');
  const [activeTab, setActiveTab] = useState<'overview' | 'trades' | 'equity'>('overview');
  const [tradeFilter, setTradeFilter] = useState<'ALL' | 'WIN' | 'LOSS'>('ALL');
  const [copied, setCopied] = useState(false);
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);

  const result: BacktestResult = useMemo(() => {
    return backtestService.runBacktest(candles, config, ticker, interval);
  }, [candles, config, ticker, interval]);

  if (!isOpen) return null;

  const handleApplyPreset = (presetId: string) => {
    setSelectedPreset(presetId);
    const preset = STRATEGY_PRESETS.find(p => p.id === presetId);
    if (preset) {
      setConfig(prev => ({
        ...prev,
        ...preset.config
      }));
    }
  };

  const handleReset = () => {
    setConfig(DEFAULT_BACKTEST_CONFIG);
    setSelectedPreset('');
  };

  const filteredTrades = result.trades.filter(t => {
    if (tradeFilter === 'WIN') return t.pnlDollars > 0;
    if (tradeFilter === 'LOSS') return t.pnlDollars < 0;
    return true;
  });

  const exportCsv = () => {
    if (result.trades.length === 0) return;
    const headers = 'ID,Tipo,Data Ingresso,Prezzo Ingresso,Data Uscita,Prezzo Uscita,Durata Barre,Motivo Uscita,P&L $,Rendimento %\n';
    const rows = result.trades.map(t =>
      `${t.id},${t.type},${t.entryDate},${t.entryPrice},${t.exitDate},${t.exitPrice},${t.durationBars},${t.exitReason},${t.pnlDollars},${t.returnPct}%`
    ).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Backtest_${ticker}_${config.fastType}${config.fastPeriod}_${config.slowType}${config.slowPeriod}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copySummary = () => {
    const text = `📊 BACKTESTING REPORT: ${result.ticker} [${result.interval.toUpperCase()}]
Strategia: Crossover ${config.fastType}(${config.fastPeriod}) / ${config.slowType}(${config.slowPeriod})
Direzione: ${config.direction === 'LONG_ONLY' ? 'Solo Long' : 'Long & Short'}
Periodo Storico: ${result.startDate} ➔ ${result.endDate} (${result.totalBars} candele)

RISULTATI CHIAVE:
• Capitale Iniziale: € ${result.initialCapital.toLocaleString('it-IT')}
• Capitale Finale: € ${result.finalCapital.toLocaleString('it-IT')}
• Rendimento Netto: ${result.netProfitPct >= 0 ? `+${result.netProfitPct}%` : `${result.netProfitPct}%`} (€ ${result.netProfit.toLocaleString('it-IT')})
• Rendimento Buy & Hold: ${result.benchmarkReturnPct >= 0 ? `+${result.benchmarkReturnPct}%` : `${result.benchmarkReturnPct}%`}
• Alpha vs Benchmark: ${result.alphaPct >= 0 ? `+${result.alphaPct}%` : `${result.alphaPct}%`}
• Win Rate: ${result.winRatePct}% (${result.winningTrades} Vinti / ${result.losingTrades} Persi)
• Profit Factor: ${result.profitFactor}
• Max Drawdown: -${result.maxDrawdownPct}% (-€ ${result.maxDrawdownDollars.toLocaleString('it-IT')})
• Sharpe Ratio: ${result.sharpeRatio}
• Sortino Ratio: ${result.sortinoRatio}
• Valore Atteso (Expectancy): € ${result.expectancyDollars} (${result.expectancyReturnPct}%)
• Recovery Factor: ${result.recoveryFactor}x
• Payoff Ratio: ${result.payoffRatio}x
• Numero Operazioni: ${result.totalTrades}
• Rendimento Medio Trade: ${result.avgTradeReturnPct}%`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const curve = result.equityCurve;
  const svgWidth = 800;
  const svgHeight = 220;
  const padding = { top: 20, right: 20, bottom: 30, left: 60 };

  const chartW = svgWidth - padding.left - padding.right;
  const chartH = svgHeight - padding.top - padding.bottom;

  let minVal = config.initialCapital;
  let maxVal = config.initialCapital;

  if (curve.length > 0) {
    const allVals = curve.flatMap(p => [p.equity, p.benchmarkEquity]);
    minVal = Math.min(...allVals) * 0.96;
    maxVal = Math.max(...allVals) * 1.04;
  }
  if (minVal === maxVal) {
    minVal -= 100;
    maxVal += 100;
  }

  const getX = (index: number) => padding.left + (index / Math.max(1, curve.length - 1)) * chartW;
  const getY = (val: number) => padding.top + chartH - ((val - minVal) / (maxVal - minVal)) * chartH;

  const strategyPath = curve.length > 0
    ? curve.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(p.equity).toFixed(1)}`).join(' ')
    : '';

  const benchmarkPath = curve.length > 0
    ? curve.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(p.benchmarkEquity).toFixed(1)}`).join(' ')
    : '';

  const initialY = getY(config.initialCapital);
  const hoveredPoint = hoveredPointIndex !== null && curve[hoveredPointIndex] ? curve[hoveredPointIndex] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 md:p-6 select-none animate-fadeIn">
      <div className="bg-[var(--bg-header)] border border-[var(--border-color)] rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden text-xs">
        {/* Header Superiore */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border-color)] bg-[var(--bg-card)]">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
              <Zap className="w-5 h-5 text-amber-300" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-[var(--text-main)] uppercase tracking-wide">
                  Laboratorio Backtesting: Crossover Medie Mobili
                </h2>
                <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20">
                  {ticker} • {interval.toUpperCase()}
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">
                Simula l'esecuzione quantitativa della strategia sullo storico di <strong className="text-[var(--text-main)]">{candles.length}</strong> candele
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={copySummary}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] hover:bg-[var(--border-color)] text-[var(--text-main)] font-semibold text-xs transition cursor-pointer"
              title="Copia report sintetico"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
              <span>{copied ? 'Copiato!' : 'Copia Sintesi'}</span>
            </button>

            <button
              onClick={exportCsv}
              disabled={result.trades.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] hover:bg-[var(--border-color)] text-[var(--text-main)] font-semibold text-xs transition disabled:opacity-50 cursor-pointer"
              title="Esporta storico esecuzioni in CSV"
            >
              <Download className="w-3.5 h-3.5 text-emerald-500" />
              <span className="hidden sm:inline">Esporta CSV</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Corpo Modale */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Presets Strategia Rapidi */}
          <div className="p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-blue-500" />
                <span>Strategie Preimpostate (Presets)</span>
              </span>
              <span className="text-[11px] text-[var(--text-muted)] hidden sm:inline">
                Seleziona una configurazione collaudata o personalizza i parametri sotto
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {STRATEGY_PRESETS.map(preset => {
                const isSelected = selectedPreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => handleApplyPreset(preset.id)}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-blue-600/10 border-blue-600 text-[var(--text-main)] shadow-xs ring-1 ring-blue-500'
                        : 'bg-[var(--bg-main)] border-[var(--border-color)] hover:border-blue-500/50 text-[var(--text-muted)] hover:text-[var(--text-main)]'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs text-[var(--text-main)] mb-1 flex items-center justify-between">
                        <span>{preset.name}</span>
                        {isSelected && <span className="text-blue-500 text-[10px]">● Attivo</span>}
                      </div>
                      <p className="text-[10px] leading-relaxed text-[var(--text-muted)]">
                        {preset.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Parametri di Configurazione Dettagliati */}
          <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] space-y-3.5">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2.5">
              <span className="font-bold text-xs uppercase tracking-wider text-[var(--text-main)] flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-indigo-500" />
                <span>Parametri Operativi del Crossover</span>
              </span>
              <button
                onClick={handleReset}
                className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-main)] flex items-center gap-1 transition cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reimposta default</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Media Veloce */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase text-[var(--text-muted)]">
                  Media Veloce:
                </label>
                <div className="flex gap-1">
                  <select
                    value={config.fastType}
                    onChange={e => {
                      setSelectedPreset('');
                      setConfig({ ...config, fastType: e.target.value as MaType });
                    }}
                    className="w-16 px-1.5 py-1 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] font-semibold text-xs outline-none"
                  >
                    <option value="EMA">EMA</option>
                    <option value="SMA">SMA</option>
                    <option value="WMA">WMA</option>
                  </select>
                  <input
                    type="number"
                    min="1"
                    max="200"
                    value={config.fastPeriod}
                    onChange={e => {
                      setSelectedPreset('');
                      setConfig({ ...config, fastPeriod: Math.max(1, parseInt(e.target.value) || 1) });
                    }}
                    className="w-full px-2 py-1 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] font-mono font-bold text-xs outline-none"
                  />
                </div>
              </div>

              {/* Media Lenta */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase text-[var(--text-muted)]">
                  Media Lenta:
                </label>
                <div className="flex gap-1">
                  <select
                    value={config.slowType}
                    onChange={e => {
                      setSelectedPreset('');
                      setConfig({ ...config, slowType: e.target.value as MaType });
                    }}
                    className="w-16 px-1.5 py-1 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] font-semibold text-xs outline-none"
                  >
                    <option value="EMA">EMA</option>
                    <option value="SMA">SMA</option>
                    <option value="WMA">WMA</option>
                  </select>
                  <input
                    type="number"
                    min="2"
                    max="500"
                    value={config.slowPeriod}
                    onChange={e => {
                      setSelectedPreset('');
                      setConfig({ ...config, slowPeriod: Math.max(2, parseInt(e.target.value) || 2) });
                    }}
                    className="w-full px-2 py-1 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] font-mono font-bold text-xs outline-none"
                  />
                </div>
              </div>

              {/* Direzione Posizioni */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase text-[var(--text-muted)]">
                  Modalità Operativa:
                </label>
                <select
                  value={config.direction}
                  onChange={e => {
                    setSelectedPreset('');
                    setConfig({ ...config, direction: e.target.value as BacktestDirection });
                  }}
                  className="w-full px-2 py-1 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] font-semibold text-xs outline-none"
                >
                  <option value="LONG_ONLY">🟢 Solo Long (Rialzo)</option>
                  <option value="LONG_AND_SHORT">⚔️ Long & Short</option>
                </select>
              </div>

              {/* Capitale Iniziale */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase text-[var(--text-muted)]">
                  Capitale Iniziale (€):
                </label>
                <input
                  type="number"
                  min="100"
                  step="1000"
                  value={config.initialCapital}
                  onChange={e => setConfig({ ...config, initialCapital: Math.max(100, parseInt(e.target.value) || 1000) })}
                  className="w-full px-2 py-1 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] font-mono font-bold text-xs outline-none"
                />
              </div>

              {/* Stop Loss % */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase text-[var(--text-muted)]">
                    Stop Loss:
                  </label>
                  <span className="font-mono text-[11px] font-bold text-rose-500">
                    {config.stopLossPct > 0 ? `${config.stopLossPct}%` : 'OFF'}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="15"
                  step="0.5"
                  value={config.stopLossPct}
                  onChange={e => {
                    setSelectedPreset('');
                    setConfig({ ...config, stopLossPct: parseFloat(e.target.value) || 0 });
                  }}
                  className="w-full accent-rose-500 cursor-pointer h-1.5 bg-[var(--input-bg)] rounded-lg appearance-none"
                />
              </div>

              {/* Take Profit % */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase text-[var(--text-muted)]">
                    Take Profit:
                  </label>
                  <span className="font-mono text-[11px] font-bold text-emerald-500">
                    {config.takeProfitPct > 0 ? `${config.takeProfitPct}%` : 'OFF'}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  step="1"
                  value={config.takeProfitPct}
                  onChange={e => {
                    setSelectedPreset('');
                    setConfig({ ...config, takeProfitPct: parseFloat(e.target.value) || 0 });
                  }}
                  className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-[var(--input-bg)] rounded-lg appearance-none"
                />
              </div>

              {/* Filtro di Regime */}
              <div className="space-y-1 col-span-2 sm:col-span-3 lg:col-span-6 pt-2 border-t border-[var(--border-color)]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      Filtro di Regime Trend:
                    </span>
                    <select
                      value={config.regimeFilter || 'NONE'}
                      onChange={e => {
                        setSelectedPreset('');
                        setConfig({ ...config, regimeFilter: e.target.value as any });
                      }}
                      className="px-2 py-1 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] font-semibold text-xs outline-none cursor-pointer"
                    >
                      <option value="NONE">Disattivo (Esegue tutti i crossover)</option>
                      <option value="ADX_TREND">🛡️ ADX Trend (&gt; {config.adxThreshold || 25}) + DI Direzionale</option>
                      <option value="SMA200_TREND">🏛️ Trend Istituzionale SMA 200</option>
                      <option value="MULTI_MA">📈 Allineamento Multiple MA (Prezzo &gt; SMA50 &gt; SMA200)</option>
                    </select>
                  </div>

                  {config.regimeFilter === 'ADX_TREND' && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-[var(--text-muted)]">Soglia ADX:</span>
                      <input
                        type="number"
                        min="15"
                        max="40"
                        value={config.adxThreshold || 25}
                        onChange={e => setConfig({ ...config, adxThreshold: parseInt(e.target.value) || 25 })}
                        className="w-14 px-1.5 py-0.5 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] font-mono text-center"
                      />
                    </div>
                  )}

                  {result.tradesFilteredOutByRegime !== undefined && result.tradesFilteredOutByRegime > 0 && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 font-bold">
                      ⚠️ {result.tradesFilteredOutByRegime} falsi segnali evitati dal filtro regime
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Dashboard Risultati & KPI */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            <div className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase text-[var(--text-muted)] flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-blue-500" />
                <span>Rendimento Netto</span>
              </span>
              <div className="mt-1">
                <div className={`text-base font-bold font-mono ${result.netProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {result.netProfitPct >= 0 ? `+${result.netProfitPct}%` : `${result.netProfitPct}%`}
                </div>
                <div className="text-[10px] text-[var(--text-muted)] font-mono">
                  {result.netProfit >= 0 ? `+€ ${result.netProfit.toLocaleString('it-IT')}` : `-€ ${Math.abs(result.netProfit).toLocaleString('it-IT')}`}
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase text-[var(--text-muted)] flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-amber-500" />
                <span>Alpha vs B&H</span>
              </span>
              <div className="mt-1">
                <div className={`text-base font-bold font-mono ${result.alphaPct >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {result.alphaPct >= 0 ? `+${result.alphaPct}%` : `${result.alphaPct}%`}
                </div>
                <div className="text-[10px] text-[var(--text-muted)]">
                  Buy & Hold: {result.benchmarkReturnPct >= 0 ? `+${result.benchmarkReturnPct}%` : `${result.benchmarkReturnPct}%`}
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase text-[var(--text-muted)] flex items-center gap-1">
                <Percent className="w-3.5 h-3.5 text-emerald-500" />
                <span>Win Rate</span>
              </span>
              <div className="mt-1">
                <div className="text-base font-bold font-mono text-[var(--text-main)]">
                  {result.winRatePct}%
                </div>
                <div className="text-[10px] text-[var(--text-muted)]">
                  <span className="text-emerald-500 font-bold">{result.winningTrades}W</span> / <span className="text-rose-500 font-bold">{result.losingTrades}L</span> ({result.totalTrades} tot)
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase text-[var(--text-muted)] flex items-center gap-1">
                <BarChart2 className="w-3.5 h-3.5 text-purple-500" />
                <span>Profit Factor</span>
              </span>
              <div className="mt-1">
                <div className={`text-base font-bold font-mono ${result.profitFactor >= 1.5 ? 'text-emerald-500' : result.profitFactor >= 1 ? 'text-amber-500' : 'text-rose-500'}`}>
                  {result.profitFactor > 0 ? result.profitFactor.toFixed(2) : '-'}
                </div>
                <div className="text-[10px] text-[var(--text-muted)]">
                  {result.profitFactor >= 1.5 ? '⭐ Molto Solido' : result.profitFactor >= 1 ? 'Profittevole' : 'In Perdita'}
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase text-[var(--text-muted)] flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                <span>Max Drawdown</span>
              </span>
              <div className="mt-1">
                <div className="text-base font-bold font-mono text-rose-500">
                  -{result.maxDrawdownPct}%
                </div>
                <div className="text-[10px] text-[var(--text-muted)] font-mono">
                  -€ {result.maxDrawdownDollars.toLocaleString('it-IT')}
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase text-[var(--text-muted)] flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-cyan-500" />
                <span>Sharpe / Durata</span>
              </span>
              <div className="mt-1">
                <div className="text-base font-bold font-mono text-[var(--text-main)]">
                  {result.sharpeRatio} <span className="text-[10px] text-[var(--text-muted)] font-normal">Sharpe</span>
                </div>
                <div className="text-[10px] text-[var(--text-muted)]">
                  Media: {result.avgTradeBars} barre/trade
                </div>
              </div>
            </div>
          </div>

          {/* Striscia Metriche Avanzate di Rischio/Rendimento */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]">
            <div className="flex items-center justify-between px-2 py-1 border-r border-[var(--border-color)] last:border-0">
              <span className="text-[11px] font-semibold text-[var(--text-muted)]">Sortino Ratio:</span>
              <span className="font-mono font-bold text-xs text-[var(--text-main)]">
                {result.sortinoRatio > 0 ? result.sortinoRatio.toFixed(2) : '-'}
              </span>
            </div>

            <div className="flex items-center justify-between px-2 py-1 border-r border-[var(--border-color)] last:border-0">
              <span className="text-[11px] font-semibold text-[var(--text-muted)]">Valore Atteso (Expectancy):</span>
              <span className={`font-mono font-bold text-xs ${result.expectancyDollars >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {result.expectancyDollars >= 0 ? `+€ ${result.expectancyDollars}` : `-€ ${Math.abs(result.expectancyDollars)}`} ({result.expectancyReturnPct >= 0 ? `+${result.expectancyReturnPct}%` : `${result.expectancyReturnPct}%`})
              </span>
            </div>

            <div className="flex items-center justify-between px-2 py-1 border-r border-[var(--border-color)] last:border-0">
              <span className="text-[11px] font-semibold text-[var(--text-muted)]">Recovery Factor:</span>
              <span className="font-mono font-bold text-xs text-blue-500">
                {result.recoveryFactor > 0 ? `${result.recoveryFactor}x` : '-'}
              </span>
            </div>

            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-[11px] font-semibold text-[var(--text-muted)]">Payoff Ratio (Win/Loss):</span>
              <span className="font-mono font-bold text-xs text-purple-500">
                {result.payoffRatio > 0 ? `${result.payoffRatio}x` : '-'}
              </span>
            </div>
          </div>

          {/* Curva Equity & Registro */}
          <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2.5">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    activeTab === 'overview'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-[var(--bg-main)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Curva Equity vs Benchmark</span>
                </button>

                <button
                  onClick={() => setActiveTab('trades')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    activeTab === 'trades'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-[var(--bg-main)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span>Registro Esecuzioni ({result.trades.length})</span>
                </button>
              </div>

              {activeTab === 'trades' && (
                <div className="flex items-center gap-1 bg-[var(--bg-main)] p-0.5 rounded-lg border border-[var(--border-color)]">
                  <button
                    onClick={() => setTradeFilter('ALL')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${tradeFilter === 'ALL' ? 'bg-blue-600 text-white' : 'text-[var(--text-muted)]'}`}
                  >
                    Tutti ({result.trades.length})
                  </button>
                  <button
                    onClick={() => setTradeFilter('WIN')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${tradeFilter === 'WIN' ? 'bg-emerald-600 text-white' : 'text-emerald-500'}`}
                  >
                    Vinti ({result.winningTrades})
                  </button>
                  <button
                    onClick={() => setTradeFilter('LOSS')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${tradeFilter === 'LOSS' ? 'bg-rose-600 text-white' : 'text-rose-500'}`}
                  >
                    Persi ({result.losingTrades})
                  </button>
                </div>
              )}
            </div>

            {/* TAB 1: CURVA EQUITY */}
            {activeTab === 'overview' && (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between text-[11px] text-[var(--text-muted)]">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-0.5 bg-blue-500 rounded-full" />
                      <strong className="text-[var(--text-main)] font-semibold">Strategia MA Crossover</strong>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-0.5 bg-amber-500 border-dashed rounded-full" />
                      <span>Benchmark Buy & Hold</span>
                    </span>
                  </div>

                  {hoveredPoint && (
                    <div className="font-mono text-[11px] flex items-center gap-3 bg-[var(--bg-main)] px-2.5 py-1 rounded-lg border border-[var(--border-color)]">
                      <span>Data: <strong className="text-[var(--text-main)]">{hoveredPoint.time}</strong></span>
                      <span>Equity: <strong className="text-blue-500">€ {hoveredPoint.equity.toLocaleString('it-IT')}</strong></span>
                      <span>B&H: <strong className="text-amber-500">€ {hoveredPoint.benchmarkEquity.toLocaleString('it-IT')}</strong></span>
                      <span>Drawdown: <strong className="text-rose-500">-{hoveredPoint.drawdownPct}%</strong></span>
                    </div>
                  )}
                </div>

                <div className="relative w-full overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] p-2">
                  <svg
                    viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                    className="w-full h-48 sm:h-56 select-none"
                    onMouseLeave={() => setHoveredPointIndex(null)}
                    onMouseMove={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const mouseX = e.clientX - rect.left;
                      const ratio = (mouseX - (padding.left / svgWidth) * rect.width) / ((chartW / svgWidth) * rect.width);
                      const idx = Math.round(ratio * (curve.length - 1));
                      if (idx >= 0 && idx < curve.length) {
                        setHoveredPointIndex(idx);
                      }
                    }}
                  >
                    {[0, 0.25, 0.5, 0.75, 1].map((p, idx) => {
                      const val = minVal + p * (maxVal - minVal);
                      const y = getY(val);
                      return (
                        <g key={idx}>
                          <line
                            x1={padding.left}
                            y1={y}
                            x2={svgWidth - padding.right}
                            y2={y}
                            stroke="currentColor"
                            className="text-[var(--border-color)]"
                            strokeDasharray="3 3"
                            strokeWidth="1"
                          />
                          <text
                            x={padding.left - 8}
                            y={y + 3}
                            textAnchor="end"
                            className="fill-[var(--text-muted)] text-[9px] font-mono"
                          >
                            € {Math.round(val).toLocaleString('it-IT')}
                          </text>
                        </g>
                      );
                    })}

                    <line
                      x1={padding.left}
                      y1={initialY}
                      x2={svgWidth - padding.right}
                      y2={initialY}
                      stroke="#888888"
                      strokeDasharray="4 4"
                      strokeWidth="1"
                      opacity="0.4"
                    />

                    {benchmarkPath && (
                      <path
                        d={benchmarkPath}
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="1.8"
                        strokeDasharray="4 3"
                        opacity="0.85"
                      />
                    )}

                    {strategyPath && (
                      <path
                        d={strategyPath}
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}

                    {hoveredPointIndex !== null && curve[hoveredPointIndex] && (
                      <g>
                        <line
                          x1={getX(hoveredPointIndex)}
                          y1={padding.top}
                          x2={getX(hoveredPointIndex)}
                          y2={svgHeight - padding.bottom}
                          stroke="#3b82f6"
                          strokeWidth="1"
                          strokeDasharray="2 2"
                        />
                        <circle
                          cx={getX(hoveredPointIndex)}
                          cy={getY(curve[hoveredPointIndex].equity)}
                          r="4"
                          className="fill-blue-500 stroke-white stroke-2"
                        />
                        <circle
                          cx={getX(hoveredPointIndex)}
                          cy={getY(curve[hoveredPointIndex].benchmarkEquity)}
                          r="3"
                          className="fill-amber-500 stroke-white stroke-1.5"
                        />
                      </g>
                    )}
                  </svg>
                </div>
              </div>
            )}

            {/* TAB 2: REGISTRO ESECUZIONI */}
            {activeTab === 'trades' && (
              <div className="overflow-x-auto max-h-72 border border-[var(--border-color)] rounded-xl">
                {filteredTrades.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[var(--text-muted)]">
                    Nessuna operazione registrata con i parametri correnti. Prova ad abbassare i periodi delle medie mobili.
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead className="bg-[var(--bg-main)] sticky top-0 border-b border-[var(--border-color)] text-[10px] uppercase font-bold text-[var(--text-muted)]">
                      <tr>
                        <th className="py-2 px-3">#</th>
                        <th className="py-2 px-3">Tipo</th>
                        <th className="py-2 px-3">Ingresso</th>
                        <th className="py-2 px-3">Prezzo In</th>
                        <th className="py-2 px-3">Uscita</th>
                        <th className="py-2 px-3">Prezzo Out</th>
                        <th className="py-2 px-3">Durata</th>
                        <th className="py-2 px-3">Motivo Uscita</th>
                        <th className="py-2 px-3 text-right">P&L ($)</th>
                        <th className="py-2 px-3 text-right">Rendimento %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-color)] font-mono">
                      {filteredTrades.map(trade => {
                        const isWin = trade.pnlDollars > 0;
                        return (
                          <tr
                            key={trade.id}
                            onClick={() => onSelectTrade?.({ entryDate: trade.entryDate, exitDate: trade.exitDate, type: trade.type as any })}
                            className={`hover:bg-blue-500/10 cursor-pointer transition select-none ${
                              isWin ? 'bg-emerald-500/5 hover:bg-emerald-500/10' : 'bg-rose-500/5 hover:bg-rose-500/10'
                            }`}
                            title="Clicca per evidenziare e centrare questa operazione sul grafico"
                          >
                            <td className="py-2 px-3 text-[var(--text-muted)]">{trade.id}</td>
                            <td className="py-2 px-3">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                trade.type === 'LONG'
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                              }`}>
                                {trade.type}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-[var(--text-main)] font-sans">{trade.entryDate}</td>
                            <td className="py-2 px-3 text-[var(--text-main)]">{trade.entryPrice.toFixed(2)}</td>
                            <td className="py-2 px-3 text-[var(--text-main)] font-sans">{trade.exitDate}</td>
                            <td className="py-2 px-3 text-[var(--text-main)]">{trade.exitPrice.toFixed(2)}</td>
                            <td className="py-2 px-3 text-[var(--text-muted)] font-sans">{trade.durationBars} barre</td>
                            <td className="py-2 px-3 font-sans">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                trade.exitReason === 'TAKE_PROFIT'
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold'
                                  : trade.exitReason === 'STOP_LOSS'
                                  ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 font-semibold'
                                  : 'bg-blue-500/10 text-blue-500'
                              }`}>
                                {trade.exitReason === 'CROSSOVER' ? 'Crossover Inverso' : trade.exitReason}
                              </span>
                            </td>
                            <td className={`py-2 px-3 text-right font-bold ${isWin ? 'text-emerald-500' : 'text-rose-500'}`}>
                              {trade.pnlDollars >= 0 ? `+€ ${trade.pnlDollars.toFixed(2)}` : `-€ ${Math.abs(trade.pnlDollars).toFixed(2)}`}
                            </td>
                            <td className={`py-2 px-3 text-right font-bold ${isWin ? 'text-emerald-500' : 'text-rose-500'}`}>
                              {trade.returnPct >= 0 ? `+${trade.returnPct}%` : `${trade.returnPct}%`}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[var(--bg-card)] border-t border-[var(--border-color)] flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            <span>
              La simulazione include commissioni ({config.feePct}%) e tiene conto di uscite per crossover o stop loss/take profit.
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition cursor-pointer shadow-xs"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};

function selectedPresetIdCheck(id: string, current: string) {
  return id === current;
}
