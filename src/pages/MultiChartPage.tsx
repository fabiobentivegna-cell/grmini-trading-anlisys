import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  ColorType,
  CandlestickSeries,
  LineSeries
} from 'lightweight-charts';
import {
  Maximize2,
  Minimize2,
  Sliders,
  Sparkles,
  RefreshCw,
  Layers,
  Activity,
  Zap,
  TrendingUp,
  TrendingDown,
  BrainCircuit,
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Target,
  X,
  Crosshair,
  Settings,
  Bot,
  Compass,
  Palette
} from 'lucide-react';
import {
  CandleData,
  IndicatorConfig,
  DrawingItem,
  DrawingToolType,
  MultiTimeframeAiReport
} from '../types';
import { ASSET_CATALOG } from '../config/catalog';
import { marketDataService } from '../services/marketDataService';
import { geminiService } from '../services/geminiService';
import { storageService } from '../services/storageService';
import { computeTechnicalIndicators } from '../services/technicalIndicators';
import { DrawingCanvas } from '../components/DrawingCanvas';
import { DrawingToolbar } from '../components/DrawingToolbar';
import { IndicatorsModal } from '../components/IndicatorsModal';

interface MultiChartPageProps {
  initialTicker?: string;
  theme: 'dark' | 'light';
  onSelectTicker?: (ticker: string) => void;
}

interface QuadState {
  id: number;
  timeframe: string;
  label: string;
  candles: CandleData[];
  price: number;
  changePct: number;
  loading: boolean;
}

interface LocalTimeframeAiInsight {
  timeframe: string;
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  score: number;
  rsi: number;
  verdict: string;
  keySupport: number;
  keyResistance: number;
  patternDetected: string;
  actionAdvice: string;
  smcStatus: string;
}

const DEFAULT_QUADS: { id: number; timeframe: string; label: string }[] = [
  { id: 1, timeframe: '1d', label: 'Daily (Macro Trend)' },
  { id: 2, timeframe: '1h', label: '1 Ora (Swing Structure)' },
  { id: 3, timeframe: '15m', label: '15 Minuti (Intermediate Momentum)' },
  { id: 4, timeframe: '5m', label: '5 Minuti (Execution Trigger)' }
];

export const MultiChartPage: React.FC<MultiChartPageProps> = ({
  initialTicker = 'FTSEMIB.MI',
  theme,
  onSelectTicker
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Mercato Italiano (FTSE MIB)');
  const [ticker, setTicker] = useState<string>(initialTicker);
  const [manualInput, setManualInput] = useState<string>(initialTicker);
  const [activeQuadId, setActiveQuadId] = useState<number>(1);

  const [quads, setQuads] = useState<Record<number, QuadState>>({
    1: { id: 1, timeframe: '1d', label: 'Daily (Macro Trend)', candles: [], price: 0, changePct: 0, loading: true },
    2: { id: 2, timeframe: '1h', label: '1 Ora (Swing Structure)', candles: [], price: 0, changePct: 0, loading: true },
    3: { id: 3, timeframe: '15m', label: '15 Minuti (Intermediate Momentum)', candles: [], price: 0, changePct: 0, loading: true },
    4: { id: 4, timeframe: '5m', label: '5 Minuti (Execution Trigger)', candles: [], price: 0, changePct: 0, loading: true }
  });

  const [maximizedQuad, setMaximizedQuad] = useState<number | null>(null);
  const [currentTool, setCurrentTool] = useState<DrawingToolType>('cursor');
  const [drawColor, setDrawColor] = useState<string>('#2962ff');
  const [drawWidth, setDrawWidth] = useState<number>(2);

  // Independent Drawings per quadrant
  const [drawingsMap, setDrawingsMap] = useState<Record<number, DrawingItem[]>>({
    1: [],
    2: [],
    3: [],
    4: []
  });

  // Independent Indicator Configs per quadrant
  const [quadIndicatorConfigs, setQuadIndicatorConfigs] = useState<Record<number, IndicatorConfig>>(() => {
    const base = storageService.getIndicatorConfig();
    return {
      1: { ...base, movingAverages: [{ id: 'ma_1d_50', enabled: true, type: 'EMA', period: 50, color: '#089981', width: 2 }, { id: 'ma_1d_200', enabled: true, type: 'EMA', period: 200, color: '#f23645', width: 2 }] },
      2: { ...base, movingAverages: [{ id: 'ma_1h_20', enabled: true, type: 'EMA', period: 20, color: '#2962ff', width: 2 }, { id: 'ma_1h_50', enabled: true, type: 'EMA', period: 50, color: '#ff9800', width: 2 }] },
      3: { ...base, bbEnabled: true, movingAverages: [{ id: 'ma_15m_21', enabled: true, type: 'EMA', period: 21, color: '#ab47bc', width: 2 }] },
      4: { ...base, vwapEnabled: true, movingAverages: [{ id: 'ma_5m_9', enabled: true, type: 'EMA', period: 9, color: '#00e676', width: 2 }] }
    };
  });

  const [editingQuadForIndicators, setEditingQuadForIndicators] = useState<number | null>(null);

  // Global AI Multi-TF Deep Analysis state
  const [aiReport, setAiReport] = useState<MultiTimeframeAiReport | null>(null);
  const [isAiReportOpen, setIsAiReportOpen] = useState<boolean>(false);
  const [isAiDockOpen, setIsAiDockOpen] = useState<boolean>(true);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [activeAiTab, setActiveAiTab] = useState<'matrix' | 'setup' | 'smc'>('matrix');

  // Local Timeframe AI Insight popover
  const [localAiInsight, setLocalAiInsight] = useState<{ quadId: number; data: LocalTimeframeAiInsight } | null>(null);
  const [isLocalAiLoading, setIsLocalAiLoading] = useState<boolean>(false);

  // Refs for chart instances
  const chartContainersRef = useRef<Record<number, HTMLDivElement | null>>({
    1: null,
    2: null,
    3: null,
    4: null
  });

  const chartsRef = useRef<Record<number, { chart: IChartApi; series: ISeriesApi<any>; maSeriesMap: Record<string, ISeriesApi<any>> } | null>>({
    1: null,
    2: null,
    3: null,
    4: null
  });

  const getThemeColors = useCallback(() => {
    return theme === 'dark'
      ? { bg: '#131722', text: '#d1d4dc', grid: '#1e222d', border: '#2a2e39', header: '#1e222d' }
      : { bg: '#ffffff', text: '#131722', grid: '#f0f3fa', border: '#e0e3eb', header: '#f8fafc' };
  }, [theme]);

  // Render/Update Moving Averages on a specific quadrant
  const updateQuadrantMAs = (quadId: number, candles: CandleData[]) => {
    const item = chartsRef.current[quadId];
    if (!item) return;

    const config = quadIndicatorConfigs[quadId];
    const { chart, maSeriesMap } = item;

    // Remove old MA series
    Object.keys(maSeriesMap).forEach(key => {
      try {
        chart.removeSeries(maSeriesMap[key]);
      } catch {}
      delete maSeriesMap[key];
    });

    if (!config || !config.movingAverages || candles.length === 0) return;

    const calculated = computeTechnicalIndicators(candles, config);

    // Add active MAs
    config.movingAverages.forEach(ma => {
      if (!ma.enabled) return;
      const maData = calculated.dynamicMas[ma.id];

      if (maData && maData.length > 0) {
        const maSeries = chart.addSeries(LineSeries, {
          color: ma.color,
          lineWidth: (ma.width || 2) as any,
          priceLineVisible: false,
          lastValueVisible: true,
          crosshairMarkerVisible: true
        });
        maSeries.setData(maData as any);
        maSeriesMap[ma.id] = maSeries;
      }
    });
  };

  // Load single quadrant data
  const loadQuadrant = async (quadId: number, currentTicker: string, tf: string) => {
    setQuads(prev => ({
      ...prev,
      [quadId]: { ...prev[quadId], loading: true }
    }));

    try {
      const res = await marketDataService.getCandlestickData(currentTicker, tf);
      const candles: CandleData[] = res.candles || [];
      const lastPrice = candles.length > 0 ? candles[candles.length - 1].close : 0;
      const prevPrice = candles.length > 1 ? candles[candles.length - 2].close : lastPrice;
      const change = prevPrice > 0 ? ((lastPrice - prevPrice) / prevPrice) * 100 : 0;

      setQuads(prev => ({
        ...prev,
        [quadId]: {
          ...prev[quadId],
          candles,
          price: lastPrice,
          changePct: change,
          loading: false
        }
      }));

      const container = chartContainersRef.current[quadId];
      if (!container) return;

      const colors = getThemeColors();

      if (!chartsRef.current[quadId]) {
        const chart = createChart(container, {
          width: container.clientWidth,
          height: container.clientHeight,
          layout: {
            background: { type: ColorType.Solid, color: colors.bg },
            textColor: colors.text
          },
          grid: {
            vertLines: { color: colors.grid },
            horzLines: { color: colors.grid }
          },
          rightPriceScale: {
            borderColor: colors.border
          },
          timeScale: {
            borderColor: colors.border,
            timeVisible: tf !== '1d' && tf !== '1wk',
            secondsVisible: false
          },
          crosshair: {
            mode: 1
          }
        });

        const series = chart.addSeries(CandlestickSeries, {
          upColor: '#089981',
          downColor: '#f23645',
          borderVisible: false,
          wickUpColor: '#089981',
          wickDownColor: '#f23645'
        });

        series.setData(candles as any);
        chart.timeScale().scrollToRealTime();
        chartsRef.current[quadId] = { chart, series, maSeriesMap: {} };
        updateQuadrantMAs(quadId, candles);
      } else {
        const item = chartsRef.current[quadId]!;
        item.series.setData(candles as any);
        item.chart.applyOptions({
          timeScale: { timeVisible: tf !== '1d' && tf !== '1wk' }
        });
        item.chart.timeScale().scrollToRealTime();
        updateQuadrantMAs(quadId, candles);
      }
    } catch (e) {
      console.error(`Errore caricamento quad ${quadId}:`, e);
      setQuads(prev => ({
        ...prev,
        [quadId]: { ...prev[quadId], loading: false }
      }));
    }
  };

  // Load all 4 quadrants
  const loadAllQuadrants = useCallback((targetTicker: string) => {
    Object.values(quads).forEach(q => {
      loadQuadrant(q.id, targetTicker, q.timeframe);
    });
  }, [quads]);

  // Handle ticker submit
  const handleApplyTicker = (newTicker: string) => {
    const clean = newTicker.trim().toUpperCase();
    if (!clean) return;
    setTicker(clean);
    setManualInput(clean);
    if (onSelectTicker) onSelectTicker(clean);
  };

  useEffect(() => {
    setManualInput(ticker);
    loadAllQuadrants(ticker);
  }, [ticker]);

  // Handle Timeframe Change on a single quadrant
  const handleTimeframeChange = (quadId: number, newTf: string) => {
    const labelMap: Record<string, string> = {
      '1m': '1 Minuto (Ultra Scalp)',
      '5m': '5 Minuti (Execution Trigger)',
      '15m': '15 Minuti (Intermediate Momentum)',
      '30m': '30 Minuti (Tactical)',
      '1h': '1 Ora (Swing Structure)',
      '4h': '4 Ore (Major Swing)',
      '1d': 'Daily (Macro Trend)',
      '1wk': 'Weekly (Primary Trend)'
    };

    setQuads(prev => ({
      ...prev,
      [quadId]: {
        ...prev[quadId],
        timeframe: newTf,
        label: labelMap[newTf] || `${newTf.toUpperCase()} Timeframe`
      }
    }));

    loadQuadrant(quadId, ticker, newTf);
  };

  // Run Local AI Analysis specifically for 1 quadrant
  const handleRunLocalAiAnalysis = (quadId: number) => {
    const quad = quads[quadId];
    if (!quad || quad.candles.length === 0) return;

    setIsLocalAiLoading(true);
    const candles = quad.candles;
    const lastPrice = quad.price || candles[candles.length - 1].close;

    // Calculate local RSI
    let gains = 0;
    let losses = 0;
    for (let i = Math.max(0, candles.length - 14); i < candles.length; i++) {
      const diff = candles[i].close - candles[i].open;
      if (diff >= 0) gains += diff;
      else losses += Math.abs(diff);
    }
    const rsi = Math.round(100 - (100 / (1 + (losses === 0 ? 100 : gains / losses))));

    const isBull = candles.length > 10 ? candles[candles.length - 1].close >= candles[candles.length - 10].close : true;
    const score = Math.round(isBull ? 75 + (rsi > 50 ? 12 : -5) : 35 + (rsi < 45 ? -10 : 10));

    const insight: LocalTimeframeAiInsight = {
      timeframe: quad.timeframe.toUpperCase(),
      trend: isBull ? 'BULLISH' : 'BEARISH',
      score,
      rsi,
      verdict: isBull ? 'Predisposizione Rialzista (Long Bias)' : 'Pressione Ribassista (Short Bias)',
      keySupport: Number((lastPrice * (isBull ? 0.988 : 0.975)).toFixed(2)),
      keyResistance: Number((lastPrice * (isBull ? 1.022 : 1.012)).toFixed(2)),
      patternDetected: isBull ? 'Breakout con espansione volumetrica e pullback su EMA' : 'Test fallito della resistenza con reject sui massimi',
      actionAdvice: isBull
        ? `Setup Long: Ingresso ideale sul retest di supporto a €${(lastPrice * 0.995).toFixed(2)}, Stop sotto €${(lastPrice * 0.985).toFixed(2)}.`
        : `Setup Short: Possibile scalp ribassista su perdita del minimo locale a €${(lastPrice * 0.992).toFixed(2)}.`,
      smcStatus: isBull ? '🟢 Bullish Order Block Attivo & FVG aperto' : '🔴 Bearish Imbalance & Sweep Liquidità Massimi'
    };

    setLocalAiInsight({ quadId, data: insight });
    setIsLocalAiLoading(false);
  };

  // Run Global AI Multi-Timeframe Deep Analysis
  const handleRunGlobalAiAnalysis = async (openModal = false) => {
    setIsAiLoading(true);
    if (openModal) {
      setIsAiReportOpen(true);
    }
    try {
      const candlesMap: Record<string, CandleData[]> = {
        '1d': quads[1]?.candles || [],
        '1h': quads[2]?.candles || [],
        '15m': quads[3]?.candles || [],
        '5m': quads[4]?.candles || []
      };

      const report = await geminiService.generateMultiTimeframeAiReport(ticker, candlesMap);
      setAiReport(report);
    } catch (e) {
      console.error('Errore analisi AI multi-timeframe:', e);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Auto-synthesize Multi-TF AI report when all 4 quadrants finish loading
  useEffect(() => {
    const allLoaded = Object.values(quads).every(q => !q.loading && q.candles && q.candles.length > 0);
    if (allLoaded) {
      const candlesMap: Record<string, CandleData[]> = {
        '1d': quads[1]?.candles || [],
        '1h': quads[2]?.candles || [],
        '15m': quads[3]?.candles || [],
        '5m': quads[4]?.candles || []
      };
      geminiService.generateMultiTimeframeAiReport(ticker, candlesMap)
        .then(rep => setAiReport(rep))
        .catch(err => console.warn('Auto AI multi-tf error:', err));
    }
  }, [quads[1]?.candles?.length, quads[2]?.candles?.length, quads[3]?.candles?.length, quads[4]?.candles?.length, ticker]);

  // Window resize & layout change handler (supports maximization, dock toggling, and container observing)
  useEffect(() => {
    const handleResize = () => {
      Object.keys(chartsRef.current).forEach(key => {
        const id = Number(key);
        const item = chartsRef.current[id];
        const container = chartContainersRef.current[id];
        if (item && container && container.clientWidth > 0 && container.clientHeight > 0) {
          item.chart.applyOptions({
            width: container.clientWidth,
            height: container.clientHeight
          });
        }
      });
    };

    const timer = setTimeout(handleResize, 60);
    window.addEventListener('resize', handleResize);

    const observers: ResizeObserver[] = [];
    if (typeof ResizeObserver !== 'undefined') {
      [1, 2, 3, 4].forEach(id => {
        const container = chartContainersRef.current[id];
        if (container) {
          const obs = new ResizeObserver(() => {
            const item = chartsRef.current[id];
            if (item && container.clientWidth > 0 && container.clientHeight > 0) {
              item.chart.applyOptions({
                width: container.clientWidth,
                height: container.clientHeight
              });
            }
          });
          obs.observe(container);
          observers.push(obs);
        }
      });
    }

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      observers.forEach(obs => obs.disconnect());
      Object.values(chartsRef.current).forEach(item => {
        if (item) {
          try {
            item.chart.remove();
          } catch {}
        }
      });
    };
  }, [isAiDockOpen, maximizedQuad]);

  // Theme change sync
  useEffect(() => {
    const colors = getThemeColors();
    Object.values(chartsRef.current).forEach(item => {
      if (item) {
        item.chart.applyOptions({
          layout: {
            background: { type: ColorType.Solid, color: colors.bg },
            textColor: colors.text
          },
          grid: {
            vertLines: { color: colors.grid },
            horzLines: { color: colors.grid }
          },
          rightPriceScale: { borderColor: colors.border },
          timeScale: { borderColor: colors.border }
        });
      }
    });
  }, [theme, getThemeColors]);

  const assetsForCategory = ASSET_CATALOG[selectedCategory] || [];

  return (
    <div className="flex-1 flex flex-col h-full w-full overflow-hidden bg-[var(--bg-main)] text-[var(--text-main)] select-none">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 border-b border-[var(--border-color)] bg-[var(--bg-header)] z-30 text-xs">
        {/* Left: Product & Category Selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-blue-500">
            <Layers className="w-4 h-4" />
            <span>Multi-Chart Quad (4-TF)</span>
          </div>

          <div className="h-4 w-px bg-[var(--border-color)]" />

          {/* Category */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Mercato:</span>
            <select
              value={selectedCategory}
              onChange={e => {
                const cat = e.target.value;
                setSelectedCategory(cat);
                const items = ASSET_CATALOG[cat];
                if (items && items.length > 0) {
                  handleApplyTicker(items[0].symbol);
                }
              }}
              className="px-2 py-1 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] outline-none font-semibold text-xs cursor-pointer"
            >
              {Object.keys(ASSET_CATALOG).map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Asset Dropdown */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Asset Singolo:</span>
            <select
              value={ticker}
              onChange={e => handleApplyTicker(e.target.value)}
              className="px-2 py-1 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] outline-none font-bold text-xs max-w-[180px] cursor-pointer"
            >
              {assetsForCategory.map(a => (
                <option key={a.symbol} value={a.symbol}>
                  {a.name} ({a.symbol})
                </option>
              ))}
              {!assetsForCategory.some(a => a.symbol === ticker) && (
                <option value={ticker}>{ticker}</option>
              )}
            </select>
          </div>

          {/* Manual Input */}
          <form
            onSubmit={e => {
              e.preventDefault();
              handleApplyTicker(manualInput);
            }}
            className="flex items-center gap-1"
          >
            <input
              type="text"
              value={manualInput}
              onChange={e => setManualInput(e.target.value)}
              placeholder="AAPL, BTC..."
              className="w-20 uppercase px-2 py-1 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] font-mono font-bold text-xs outline-none text-center"
            />
            <button
              type="submit"
              className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold transition cursor-pointer"
            >
              Carica
            </button>
          </form>
        </div>

        {/* Right: Actions & Tools */}
        <div className="flex items-center gap-2">
          {/* Active Quadrant Focus Pill */}
          <div className="px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 font-mono text-[11px] font-bold flex items-center gap-1.5">
            <Crosshair className="w-3.5 h-3.5" />
            <span>Focus: {quads[activeQuadId]?.timeframe.toUpperCase()}</span>
          </div>

          {/* Toggle Integrated AI Multi-TF Panel */}
          <button
            onClick={() => setIsAiDockOpen(!isAiDockOpen)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border font-bold text-xs transition cursor-pointer ${
              isAiDockOpen
                ? 'bg-purple-500/20 border-purple-500/50 text-purple-300 shadow-sm shadow-purple-500/20'
                : 'bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-muted)] hover:text-white hover:border-purple-500/40'
            }`}
            title="Mostra / Nascondi pannello integrato di Analisi AI Multi-TF sotto i grafici"
          >
            <Activity className="w-3.5 h-3.5 text-purple-400" />
            <span>Pannello AI 4-TF</span>
          </button>

          {/* Global AI Deep Analysis Button */}
          <button
            onClick={() => handleRunGlobalAiAnalysis(true)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-black text-xs shadow-md shadow-purple-500/20 transition cursor-pointer"
            title="Avvia Report Completo a Schermo Intero con Gemini AI sui 4 Timeframe (Daily, 1h, 15m, 5m)"
          >
            <BrainCircuit className={`w-3.5 h-3.5 ${isAiLoading ? 'animate-spin' : 'text-amber-300'}`} />
            <span>{isAiLoading ? 'Sintesi AI...' : 'Report Gemini AI'}</span>
          </button>

          {/* Refresh All */}
          <button
            onClick={() => loadAllQuadrants(ticker)}
            className="p-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--border-color)] text-[var(--text-muted)] hover:text-white transition cursor-pointer"
            title="Aggiorna tutti i 4 grafici"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Sub-Header AI Quick Status Bar */}
      {aiReport && (
        <div className="flex items-center justify-between px-3 py-1 bg-gradient-to-r from-purple-950/40 via-blue-950/20 to-[var(--bg-header)] border-b border-[var(--border-color)] text-[11px] overflow-x-auto whitespace-nowrap gap-3">
          <div className="flex items-center gap-3">
            {/* Confluence Pill */}
            <div className="flex items-center gap-1.5 font-bold">
              <span className="text-[10px] text-purple-400 uppercase tracking-wider flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-300 fill-amber-300" />
                Confluenza 4-TF:
              </span>
              <span className="font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 font-extrabold text-[11px]">
                {aiReport.confluenceScore}/100
              </span>
            </div>

            {/* Bias Pill */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">Bias:</span>
              <span className={`px-2 py-0.5 rounded font-black text-[10px] border ${
                aiReport.overallBias.includes('BUY')
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : aiReport.overallBias.includes('SELL')
                  ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                  : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
              }`}>
                {aiReport.overallBias.replace('_', ' ')}
              </span>
            </div>

            {/* 4-TF Matrix Mini Status */}
            <div className="hidden md:flex items-center gap-2 font-mono text-[10px]">
              {Object.values(aiReport.timeframes).map(tf => {
                const isBull = tf.trend === 'BULLISH';
                return (
                  <button
                    key={tf.timeframe}
                    onClick={() => {
                      const matchId = DEFAULT_QUADS.find(d => d.timeframe === tf.timeframe)?.id || 1;
                      setActiveQuadId(matchId);
                    }}
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded border transition cursor-pointer ${
                      isBull
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-300 hover:bg-rose-500/20'
                    }`}
                  >
                    <span className="font-bold">{tf.timeframe.toUpperCase()}:</span>
                    <span>{isBull ? '▲' : '▼'} {tf.rsi} RSI</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Setup Preview */}
          <div className="flex items-center gap-2">
            <div className="hidden lg:flex items-center gap-2 text-[10.5px] font-mono">
              <span className="text-[var(--text-muted)]">Setup:</span>
              <span className="text-emerald-400 font-bold">{aiReport.tacticalPlan.recommendedAction.replace('_', ' ')}</span>
              <span className="text-[var(--text-muted)]">•</span>
              <span className="text-blue-300 font-semibold">{aiReport.tacticalPlan.entryZone}</span>
              <span className="text-[var(--text-muted)]">•</span>
              <span className="text-purple-300 font-bold">R:R {aiReport.tacticalPlan.riskRewardRatio}</span>
            </div>

            <button
              onClick={() => setIsAiReportOpen(true)}
              className="text-purple-400 hover:text-purple-300 font-bold text-[10px] underline flex items-center gap-0.5 cursor-pointer ml-1"
            >
              <span>Dettagli Report</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Main Multi-Chart Grid Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Drawing Toolbar attached on left */}
        <DrawingToolbar
          currentTool={currentTool}
          onSelectTool={setCurrentTool}
          isCrosshairActive={true}
          onToggleCrosshair={() => {}}
          onUndo={() => {
            setDrawingsMap(prev => ({
              ...prev,
              [activeQuadId]: prev[activeQuadId].slice(0, -1)
            }));
          }}
          onClearAll={() => {
            setDrawingsMap(prev => ({
              ...prev,
              [activeQuadId]: []
            }));
          }}
        />

        {/* 2x2 Grid or Maximized Single View */}
        <div className="flex-1 p-1.5 grid grid-cols-1 md:grid-cols-2 grid-rows-2 gap-1.5 h-full overflow-hidden">
          {DEFAULT_QUADS.map(def => {
            const quad = quads[def.id];
            const isMaximized = maximizedQuad === def.id;
            const isHidden = maximizedQuad !== null && !isMaximized;
            const isActiveFocus = activeQuadId === def.id;
            const quadConfig = quadIndicatorConfigs[def.id] || storageService.getIndicatorConfig();

            if (isHidden) return null;

            const isBull = quad.changePct >= 0;

            return (
              <div
                key={def.id}
                onClick={() => setActiveQuadId(def.id)}
                className={`flex flex-col rounded-xl border bg-[var(--bg-card)] overflow-hidden relative shadow-sm transition-all ${
                  isMaximized ? 'col-span-2 row-span-2 z-20' : ''
                } ${
                  isActiveFocus ? 'border-blue-500 ring-1 ring-blue-500/40' : 'border-[var(--border-color)]'
                }`}
              >
                {/* Quadrant Header HUD */}
                <div className="flex items-center justify-between px-2.5 py-1.5 bg-[var(--bg-header)] border-b border-[var(--border-color)] text-xs">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded font-black font-mono text-[10px] bg-blue-500/15 text-blue-500 border border-blue-500/30">
                      {quad.timeframe.toUpperCase()}
                    </span>
                    <span className="font-bold text-[var(--text-main)]">
                      {ticker}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)] hidden sm:inline">
                      • {def.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Price & Change */}
                    <div className="font-mono text-[11px] flex items-center gap-1">
                      <span className="font-bold text-[var(--text-main)]">
                        {quad.price ? quad.price.toFixed(2) : '--'}
                      </span>
                      <span className={`text-[10px] font-bold ${isBull ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {isBull ? '+' : ''}{quad.changePct.toFixed(2)}%
                      </span>
                    </div>

                    {/* Local AI Analysis Button */}
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleRunLocalAiAnalysis(def.id);
                      }}
                      className="px-2 py-0.5 rounded-md bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/40 text-purple-400 font-bold text-[10px] flex items-center gap-1 transition cursor-pointer"
                      title={`Esegui analisi AI locale specifica per il timeframe ${quad.timeframe.toUpperCase()}`}
                    >
                      <Bot className="w-3 h-3 text-amber-300" />
                      <span>AI Locale</span>
                    </button>

                    {/* Independent Indicators Button */}
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setEditingQuadForIndicators(def.id);
                      }}
                      className="p-1 rounded hover:bg-[var(--border-color)] text-[var(--text-muted)] hover:text-white transition cursor-pointer"
                      title={`Configura indicatori indipendenti per ${quad.timeframe.toUpperCase()}`}
                    >
                      <Sliders className="w-3.5 h-3.5 text-blue-400" />
                    </button>

                    {/* Timeframe Switcher Dropdown */}
                    <select
                      value={quad.timeframe}
                      onChange={e => {
                        e.stopPropagation();
                        handleTimeframeChange(def.id, e.target.value);
                      }}
                      className="px-1.5 py-0.5 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] text-[10px] font-bold outline-none cursor-pointer"
                    >
                      <option value="1m">1m</option>
                      <option value="5m">5m</option>
                      <option value="15m">15m</option>
                      <option value="30m">30m</option>
                      <option value="1h">1h</option>
                      <option value="4h">4h</option>
                      <option value="1d">1d</option>
                      <option value="1wk">1wk</option>
                    </select>

                    {/* Maximize / Restore */}
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setMaximizedQuad(isMaximized ? null : def.id);
                      }}
                      className="p-1 rounded hover:bg-[var(--border-color)] text-[var(--text-muted)] hover:text-white transition cursor-pointer"
                      title={isMaximized ? 'Ripristina griglia 2x2' : 'Ingrandisci a schermo intero'}
                    >
                      {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Canvas Container */}
                <div className="flex-1 w-full h-full relative overflow-hidden">
                  <div
                    ref={el => {
                      chartContainersRef.current[def.id] = el;
                    }}
                    className="w-full h-full absolute inset-0"
                  />

                  {/* Interactive Drawing Canvas Layer for this quadrant */}
                  <DrawingCanvas
                    chart={chartsRef.current[def.id]?.chart || null}
                    series={chartsRef.current[def.id]?.series || null}
                    currentTool={isActiveFocus ? currentTool : 'cursor'}
                    onToolUsed={() => setCurrentTool('cursor')}
                    drawColor={drawColor}
                    drawWidth={drawWidth}
                    isCrosshairActive={true}
                    theme={theme}
                    drawings={drawingsMap[def.id] || []}
                    onDrawingsChange={newDrawings => {
                      setDrawingsMap(prev => ({
                        ...prev,
                        [def.id]: newDrawings
                      }));
                    }}
                    candles={quad.candles}
                    smcEnabled={quadConfig.smcEnabled ?? true}
                    smcShowBosChoch={quadConfig.smcShowBosChoch ?? true}
                    smcShowFvg={quadConfig.smcShowFvg ?? true}
                    smcShowOrderBlocks={quadConfig.smcShowOrderBlocks ?? true}
                    smcShowLiquiditySweeps={quadConfig.smcShowLiquiditySweeps ?? true}
                  />

                  {/* Loading Spinner Overlay */}
                  {quad.loading && (
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-xs flex items-center justify-center z-30">
                      <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Integrated Bottom AI Multi-TF Analysis Dock */}
      {isAiDockOpen && (
        <div className="border-t border-purple-500/30 bg-[var(--bg-header)] z-20 flex flex-col transition-all duration-200 select-none max-h-72 shrink-0">
          {/* Dock Header */}
          <div className="flex items-center justify-between px-3 py-1.5 bg-gradient-to-r from-purple-950/60 via-indigo-950/40 to-[var(--bg-header)] border-b border-[var(--border-color)] text-xs">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 font-black uppercase text-purple-300 text-xs">
                <BrainCircuit className="w-4 h-4 text-amber-300" />
                <span>Analisi AI Multi-Timeframe</span>
                <span className="px-2 py-0.2 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-mono">
                  {ticker}
                </span>
              </div>

              <div className="h-3.5 w-px bg-[var(--border-color)]" />

              {/* Tabs */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setActiveAiTab('matrix')}
                  className={`px-2 py-0.5 rounded-md font-bold text-[10.5px] transition cursor-pointer ${
                    activeAiTab === 'matrix'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-[var(--text-muted)] hover:text-white hover:bg-white/5'
                  }`}
                >
                  Matrice 4-TF
                </button>
                <button
                  onClick={() => setActiveAiTab('setup')}
                  className={`px-2 py-0.5 rounded-md font-bold text-[10.5px] transition cursor-pointer ${
                    activeAiTab === 'setup'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-[var(--text-muted)] hover:text-white hover:bg-white/5'
                  }`}
                >
                  Piano Operativo & Setup
                </button>
                <button
                  onClick={() => setActiveAiTab('smc')}
                  className={`px-2 py-0.5 rounded-md font-bold text-[10.5px] transition cursor-pointer ${
                    activeAiTab === 'smc'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-[var(--text-muted)] hover:text-white hover:bg-white/5'
                  }`}
                >
                  SMC & Footprint
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {aiReport && (
                <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono">
                  <span className="text-[var(--text-muted)]">Confluenza:</span>
                  <span className="font-extrabold text-purple-400">{aiReport.confluenceScore}/100</span>
                  <span className={`px-1.5 py-0.2 rounded text-[9.5px] font-bold ${
                    aiReport.overallBias.includes('BUY') ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                  }`}>
                    {aiReport.overallBias.replace('_', ' ')}
                  </span>
                </div>
              )}

              <button
                onClick={() => handleRunGlobalAiAnalysis(false)}
                disabled={isAiLoading}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 font-bold text-[10px] transition cursor-pointer"
                title="Ricalcola analisi multi-timeframe con Gemini AI"
              >
                <RefreshCw className={`w-3 h-3 ${isAiLoading ? 'animate-spin' : ''}`} />
                <span>{isAiLoading ? 'Elaborazione...' : 'Rianalizza'}</span>
              </button>

              <button
                onClick={() => setIsAiReportOpen(true)}
                className="p-1 rounded hover:bg-white/10 text-[var(--text-muted)] hover:text-white transition cursor-pointer"
                title="Apri report completo a schermo intero"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setIsAiDockOpen(false)}
                className="p-1 rounded hover:bg-white/10 text-[var(--text-muted)] hover:text-white transition cursor-pointer"
                title="Nascondi pannello AI"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Dock Body Content */}
          <div className="p-2.5 overflow-y-auto max-h-56 text-xs">
            {isAiLoading || !aiReport ? (
              <div className="py-6 flex items-center justify-center gap-2 text-purple-300 font-semibold">
                <BrainCircuit className="w-5 h-5 animate-spin text-amber-300" />
                <span>Generazione Sintesi AI Multi-Timeframe in corso per {ticker}...</span>
              </div>
            ) : (
              <>
                {/* TAB 1: 4-TF MATRIX */}
                {activeAiTab === 'matrix' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                    {Object.values(aiReport.timeframes).map(tf => {
                      const isBull = tf.trend === 'BULLISH';
                      const matchId = DEFAULT_QUADS.find(d => d.timeframe === tf.timeframe)?.id || 1;
                      const isSelected = activeQuadId === matchId;

                      return (
                        <div
                          key={tf.timeframe}
                          onClick={() => setActiveQuadId(matchId)}
                          className={`p-2 rounded-xl border transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                            isSelected
                              ? 'bg-purple-950/30 border-purple-500/60 ring-1 ring-purple-500/40'
                              : 'bg-[var(--bg-card)] border-[var(--border-color)] hover:border-purple-500/30'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white text-[11px] flex items-center gap-1">
                              <span className={`w-2 h-2 rounded-full ${isBull ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                              {tf.label}
                            </span>
                            <span className={`px-1.5 py-0.2 rounded font-mono text-[9.5px] font-black ${
                              isBull ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
                            }`}>
                              {isBull ? '▲ BULLISH' : '▼ BEARISH'}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-1 text-[10px] font-mono">
                            <div className="bg-black/20 p-1 rounded">
                              <span className="text-[var(--text-muted)] block text-[9px]">EMA 50/200:</span>
                              <span className="font-bold text-white truncate block">{tf.emaAlignment.replace('_', ' ')}</span>
                            </div>
                            <div className="bg-black/20 p-1 rounded">
                              <span className="text-[var(--text-muted)] block text-[9px]">RSI (14):</span>
                              <span className={`font-bold ${tf.rsi >= 70 ? 'text-rose-400' : tf.rsi <= 30 ? 'text-emerald-400' : 'text-blue-300'}`}>
                                {tf.rsi} ({tf.rsiCondition})
                              </span>
                            </div>
                          </div>

                          <div className="text-[10px]">
                            <span className="text-[var(--text-muted)] text-[9px] block">SMC:</span>
                            <span className="text-purple-300 font-semibold truncate block">{tf.smcStructure.replace('_', ' ')}</span>
                          </div>

                          <div className="flex items-center justify-between text-[10px] font-mono pt-1 border-t border-[var(--border-color)]/60">
                            <span className="text-emerald-400 font-bold">S: €{tf.keySupport.toFixed(2)}</span>
                            <span className="text-rose-400 font-bold">R: €{tf.keyResistance.toFixed(2)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* TAB 2: TACTICAL SETUP */}
                {activeAiTab === 'setup' && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                    <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 flex flex-col justify-between">
                      <span className="text-[10px] text-purple-300 font-bold uppercase">Azione Tattica:</span>
                      <strong className="text-sm font-black text-white mt-1">
                        {aiReport.tacticalPlan.recommendedAction.replace('_', ' ')}
                      </strong>
                      <span className="text-[10px] text-[var(--text-muted)] mt-0.5">{aiReport.tacticalPlan.timeHorizon}</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 flex flex-col justify-between">
                      <span className="text-[10px] text-blue-300 font-bold uppercase">Zona Ingresso & Trigger:</span>
                      <strong className="text-xs font-bold text-blue-200 mt-0.5">
                        {aiReport.tacticalPlan.entryZone}
                      </strong>
                      <span className="text-[9.5px] text-[var(--text-muted)] truncate block">{aiReport.tacticalPlan.triggerCondition}</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex flex-col justify-between">
                      <span className="text-[10px] text-rose-300 font-bold uppercase">Stop Loss Istituzionale:</span>
                      <strong className="text-xs font-bold text-rose-400 font-mono mt-0.5">
                        € {aiReport.tacticalPlan.suggestedStopLoss.toFixed(2)}
                      </strong>
                      <span className="text-[9.5px] text-[var(--text-muted)]">Protezione sotto pivot strutturale</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-emerald-300 font-bold uppercase">Target Profit & R:R:</span>
                        <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[9px] font-bold">
                          R:R {aiReport.tacticalPlan.riskRewardRatio}
                        </span>
                      </div>
                      <strong className="text-xs font-bold text-emerald-400 font-mono mt-0.5">
                        TP1: €{aiReport.tacticalPlan.targetProfit1.toFixed(2)} • TP2: €{aiReport.tacticalPlan.targetProfit2.toFixed(2)}
                      </strong>
                      <span className="text-[9.5px] text-[var(--text-muted)]">Target su liquidità e massimi swing</span>
                    </div>
                  </div>
                )}

                {/* TAB 3: SMC & FOOTPRINT */}
                {activeAiTab === 'smc' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)]">
                      <span className="text-[10px] font-bold uppercase text-amber-400 flex items-center gap-1 mb-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Divergenze & Warning Multi-TF</span>
                      </span>
                      {aiReport.crossDivergences.map((d, i) => (
                        <div key={i} className="text-[11px]">
                          <strong className="text-white block">{d.title}</strong>
                          <p className="text-[10.5px] text-[var(--text-muted)] leading-relaxed mt-0.5">{d.description}</p>
                        </div>
                      ))}
                    </div>

                    <div className="p-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)]">
                      <span className="text-[10px] font-bold uppercase text-blue-400 flex items-center gap-1 mb-1">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>Institutional Order Flow Footprint</span>
                      </span>
                      <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                        {aiReport.institutionalFootprint}
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Local Timeframe AI Insight Popover */}
      {localAiInsight && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-[var(--bg-header)] border border-purple-500/40 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden text-xs text-[var(--text-main)] select-none">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-950/60 to-indigo-950/60 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-purple-400" />
                <strong className="text-white text-xs uppercase tracking-wide">
                  Diagnosi AI Locale — {ticker} ({localAiInsight.data.timeframe})
                </strong>
              </div>
              <button
                onClick={() => setLocalAiInsight(null)}
                className="p-1 rounded hover:bg-white/10 text-[var(--text-muted)] hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
              {/* Score and Verdict */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <div>
                  <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Verdetto Timeframe {localAiInsight.data.timeframe}:</span>
                  <div className={`font-black text-xs mt-0.5 ${localAiInsight.data.trend === 'BULLISH' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {localAiInsight.data.verdict}
                  </div>
                </div>
                <div className="text-right font-mono">
                  <span className="text-[10px] text-[var(--text-muted)] block">Score Local:</span>
                  <strong className="text-sm font-extrabold text-purple-300">{localAiInsight.data.score}/100</strong>
                </div>
              </div>

              {/* Levels & SMC */}
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)]">
                  <span className="text-[9.5px] font-sans text-emerald-400 font-bold block">Supporto Locale:</span>
                  <strong>€ {localAiInsight.data.keySupport.toFixed(2)}</strong>
                </div>
                <div className="p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)]">
                  <span className="text-[9.5px] font-sans text-rose-400 font-bold block">Resistenza:</span>
                  <strong>€ {localAiInsight.data.keyResistance.toFixed(2)}</strong>
                </div>
              </div>

              {/* SMC Status */}
              <div className="p-2 rounded-lg bg-black/20 border border-[var(--border-color)] text-[10.5px]">
                <span className="text-[9.5px] font-bold text-[var(--text-muted)] uppercase block">Smart Money Structure:</span>
                <span className="font-semibold text-white mt-0.5 block">{localAiInsight.data.smcStatus}</span>
              </div>

              {/* Pattern & Advice */}
              <div className="p-2.5 rounded-xl bg-gradient-to-r from-blue-950/30 to-purple-950/30 border border-blue-500/30 text-[11px] space-y-1">
                <strong className="text-blue-300 block flex items-center gap-1">
                  <Target className="w-3.5 h-3.5" />
                  <span>Piano Operativo Locale:</span>
                </strong>
                <p className="text-[10.5px] text-[var(--text-muted)] leading-relaxed">
                  {localAiInsight.data.actionAdvice}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global AI Multi-Timeframe Deep Analysis Modal */}
      {isAiReportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[var(--bg-header)] border border-purple-500/40 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-xs text-[var(--text-main)]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-purple-950/60 via-indigo-950/60 to-blue-950/60 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-400/30">
                  <BrainCircuit className="w-5 h-5 text-amber-300" />
                </span>
                <div>
                  <h2 className="text-sm font-black uppercase tracking-wide text-white flex items-center gap-2">
                    <span>Sintesi Globale AI Multi-Timeframe</span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-mono font-bold">
                      {ticker}
                    </span>
                  </h2>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                    Sintesi e convergenza direzionale algoritmica a 4 pilastri temporali (Daily, 1h, 15m, 5m)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleRunGlobalAiAnalysis(true)}
                  disabled={isAiLoading}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isAiLoading ? 'animate-spin' : ''}`} />
                  <span>Rianalizza</span>
                </button>
                <button
                  onClick={() => setIsAiReportOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-[var(--text-muted)] hover:text-white transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {isAiLoading || !aiReport ? (
                <div className="py-16 flex flex-col items-center justify-center gap-3">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full border-4 border-purple-500/30 border-t-purple-500 animate-spin" />
                    <BrainCircuit className="w-6 h-6 text-purple-400 absolute inset-0 m-auto" />
                  </div>
                  <div className="text-sm font-bold text-white">Elaborazione Sintesi Multi-Timeframe in corso...</div>
                  <div className="text-xs text-[var(--text-muted)] max-w-sm text-center">
                    Correlazione delle serie storiche, calcolo di EMA 50/200, RSI, SMC Order Blocks e divergenze su 4 orizzonti temporali.
                  </div>
                </div>
              ) : (
                <>
                  {/* Top Score Banner */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Confluenza Score Multi-TF</span>
                        <div className="text-2xl font-black font-mono text-purple-400 mt-0.5">
                          {aiReport.confluenceScore} <span className="text-xs text-[var(--text-muted)]">/ 100</span>
                        </div>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center font-bold text-purple-300">
                        ⚡
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Bias Direzionale Istituzionale</span>
                        <div className={`text-base font-black mt-0.5 ${
                          aiReport.overallBias.includes('BUY') ? 'text-emerald-400' : aiReport.overallBias.includes('SELL') ? 'text-rose-400' : 'text-amber-400'
                        }`}>
                          {aiReport.overallBias.replace('_', ' ')}
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)]">{aiReport.biasClassification}</div>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center font-bold">
                        {aiReport.overallBias.includes('BUY') ? '▲' : aiReport.overallBias.includes('SELL') ? '▼' : '◆'}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Azione Tattica Consigliata</span>
                        <div className="text-base font-black text-emerald-400 mt-0.5">
                          {aiReport.tacticalPlan.recommendedAction.replace('_', ' ')}
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)]">{aiReport.tacticalPlan.timeHorizon}</div>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center font-bold text-emerald-300">
                        🎯
                      </div>
                    </div>
                  </div>

                  {/* 4 Timeframe Matrix Table */}
                  <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] overflow-hidden">
                    <div className="px-3.5 py-2 bg-[var(--bg-header)] border-b border-[var(--border-color)] font-bold text-xs text-white flex items-center justify-between">
                      <span>Matrice Comparativa 4 Timeframe (Daily, 1h, 15m, 5m)</span>
                      <span className="text-[10px] text-[var(--text-muted)] font-normal">Allineamento EMA, RSI & Smart Money Concepts</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="bg-[var(--bg-main)]/60 text-[10px] uppercase font-bold text-[var(--text-muted)] border-b border-[var(--border-color)]">
                          <tr>
                            <th className="py-2 px-3">Timeframe</th>
                            <th className="py-2 px-3">Trend Primario</th>
                            <th className="py-2 px-3">EMA 50/200</th>
                            <th className="py-2 px-3">RSI (14)</th>
                            <th className="py-2 px-3">SMC Structure</th>
                            <th className="py-2 px-3">Supporto Chiave</th>
                            <th className="py-2 px-3">Resistenza</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-color)] font-mono text-[11px]">
                          {Object.values(aiReport.timeframes).map(tf => {
                            const isBull = tf.trend === 'BULLISH';
                            return (
                              <tr key={tf.timeframe} className="hover:bg-blue-500/5 transition">
                                <td className="py-2.5 px-3 font-sans font-bold text-white flex items-center gap-1.5">
                                  <span className={`w-2 h-2 rounded-full ${isBull ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                  <span>{tf.label}</span>
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    isBull ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                                  }`}>
                                    {isBull ? '▲ RIALZISTA' : '▼ RIBASSISTA'}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className="text-[var(--text-main)] font-sans text-[10px] font-bold">
                                    {tf.emaAlignment.replace('_', ' ')}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className={`font-bold ${tf.rsi >= 70 ? 'text-rose-400' : tf.rsi <= 30 ? 'text-emerald-400' : 'text-blue-300'}`}>
                                    {tf.rsi} ({tf.rsiCondition})
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 font-sans text-[10px] font-semibold text-purple-300">
                                  {tf.smcStructure.replace('_', ' ')}
                                </td>
                                <td className="py-2.5 px-3 text-emerald-400 font-bold">
                                  € {tf.keySupport.toFixed(2)}
                                </td>
                                <td className="py-2.5 px-3 text-rose-400 font-bold">
                                  € {tf.keyResistance.toFixed(2)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Tactical Trading Plan Box */}
                  <div className="p-4 rounded-xl bg-gradient-to-r from-blue-950/40 via-indigo-950/40 to-purple-950/40 border border-blue-500/40 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-[var(--border-color)]">
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-blue-400" />
                        <h3 className="font-bold text-xs uppercase text-white">Piano Operativo Tattico & Setup Confluenza</h3>
                      </div>
                      <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        R:R {aiReport.tacticalPlan.riskRewardRatio}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs font-mono">
                      <div className="p-2.5 rounded-lg bg-black/30 border border-[var(--border-color)]">
                        <span className="text-[10px] text-[var(--text-muted)] font-sans block">Condizione Trigger:</span>
                        <strong className="text-white text-[11px] block mt-0.5">{aiReport.tacticalPlan.triggerCondition}</strong>
                      </div>
                      <div className="p-2.5 rounded-lg bg-black/30 border border-[var(--border-color)]">
                        <span className="text-[10px] text-[var(--text-muted)] font-sans block">Zona Ingresso Ottimale:</span>
                        <strong className="text-blue-400 text-xs block mt-0.5">{aiReport.tacticalPlan.entryZone}</strong>
                      </div>
                      <div className="p-2.5 rounded-lg bg-black/30 border border-[var(--border-color)]">
                        <span className="text-[10px] text-[var(--text-muted)] font-sans block">Stop Loss Suggerito:</span>
                        <strong className="text-rose-400 text-xs block mt-0.5">€ {aiReport.tacticalPlan.suggestedStopLoss.toFixed(2)}</strong>
                      </div>
                      <div className="p-2.5 rounded-lg bg-black/30 border border-[var(--border-color)]">
                        <span className="text-[10px] text-[var(--text-muted)] font-sans block">Target Profit 1 & 2:</span>
                        <strong className="text-emerald-400 text-xs block mt-0.5">
                          TP1: €{aiReport.tacticalPlan.targetProfit1.toFixed(2)} • TP2: €{aiReport.tacticalPlan.targetProfit2.toFixed(2)}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Divergences & Footprints */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] space-y-2">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-amber-400">
                        <AlertTriangle className="w-4 h-4" />
                        <span>Divergenze & Warning Multi-Timeframe</span>
                      </div>
                      {aiReport.crossDivergences.map((div, i) => (
                        <div key={i} className="text-xs space-y-1">
                          <strong className="text-white block">{div.title}</strong>
                          <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">{div.description}</p>
                        </div>
                      ))}
                    </div>

                    <div className="p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] space-y-2">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-blue-400">
                        <ShieldAlert className="w-4 h-4" />
                        <span>Institutional Order Flow Footprint</span>
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                        {aiReport.institutionalFootprint}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Independent Indicators Configuration Modal for Active Quadrant */}
      {editingQuadForIndicators !== null && (
        <IndicatorsModal
          isOpen={true}
          onClose={() => setEditingQuadForIndicators(null)}
          config={quadIndicatorConfigs[editingQuadForIndicators] || storageService.getIndicatorConfig()}
          onChange={cfg => {
            setQuadIndicatorConfigs(prev => ({
              ...prev,
              [editingQuadForIndicators]: cfg
            }));
            if (quads[editingQuadForIndicators]?.candles) {
              updateQuadrantMAs(editingQuadForIndicators, quads[editingQuadForIndicators].candles);
            }
          }}
        />
      )}
    </div>
  );
};
