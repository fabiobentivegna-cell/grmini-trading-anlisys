import React, { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, ColorType, CandlestickSeries } from 'lightweight-charts';
import { LayoutGrid, RefreshCw } from 'lucide-react';
import { MACRO_PRESETS } from '../config/catalog';
import { marketDataService } from '../services/marketDataService';
import { CandleData } from '../types';

interface QuadConfig {
  ticker: string;
  interval: string;
  price: number;
}

interface InflationPageProps {
  theme: 'dark' | 'light';
}

export const InflationPage: React.FC<InflationPageProps> = ({ theme }) => {
  const [configs, setConfigs] = useState<Record<number, QuadConfig>>({
    1: { ticker: '^IXIC', interval: '1d', price: 0 },
    2: { ticker: '^VIX', interval: '1d', price: 0 },
    3: { ticker: '^TNX', interval: '1d', price: 0 },
    4: { ticker: 'BZ=F', interval: '1d', price: 0 }
  });

  const [customInputs, setCustomInputs] = useState<Record<number, string>>({
    1: '',
    2: '',
    3: '',
    4: ''
  });

  const chartContainersRef = useRef<Record<number, HTMLDivElement | null>>({
    1: null,
    2: null,
    3: null,
    4: null
  });

  const chartsRef = useRef<Record<number, { chart: IChartApi; series: ISeriesApi<any> } | null>>({
    1: null,
    2: null,
    3: null,
    4: null
  });

  const getThemeColors = () => {
    return theme === 'dark'
      ? { bg: '#1e222d', text: '#d1d4dc', grid: '#2a2e39', border: '#2a2e39' }
      : { bg: '#ffffff', text: '#131722', grid: '#f0f3fa', border: '#e0e3eb' };
  };

  const loadQuadChart = async (id: number, ticker: string, interval: string) => {
    const container = chartContainersRef.current[id];
    if (!container) return;

    try {
      const res = await marketDataService.getCandlestickData(ticker, interval);
      const candles: CandleData[] = res.candles;
      const lastPrice = candles.length > 0 ? candles[candles.length - 1].close : 0;

      setConfigs(prev => ({
        ...prev,
        [id]: { ...prev[id], ticker, interval, price: lastPrice }
      }));

      // If chart doesn't exist, create it
      if (!chartsRef.current[id]) {
        const colors = getThemeColors();
        const chart = createChart(container, {
          layout: {
            background: { type: ColorType.Solid, color: colors.bg },
            textColor: colors.text
          },
          grid: {
            vertLines: { color: colors.grid },
            horzLines: { color: colors.grid }
          },
          rightPriceScale: { borderColor: colors.border },
          timeScale: {
            borderColor: colors.border,
            timeVisible: res.is_intraday
          }
        });

        const series = chart.addSeries(CandlestickSeries, {
          upColor: '#089981',
          downColor: '#f23645',
          borderVisible: false,
          wickUpColor: '#089981',
          wickDownColor: '#f23645',
          priceLineVisible: false
        });

        series.setData(candles as any);
        chart.timeScale().scrollToRealTime();
        chartsRef.current[id] = { chart, series };
      } else {
        const item = chartsRef.current[id]!;
        item.series.setData(candles as any);
        item.chart.applyOptions({
          timeScale: { timeVisible: res.is_intraday }
        });
        item.chart.timeScale().scrollToRealTime();
      }
    } catch (e) {
      console.error(`Errore caricamento quad ${id}:`, e);
    }
  };

  // Mount charts
  useEffect(() => {
    for (let id = 1; id <= 4; id++) {
      const cfg = configs[id];
      loadQuadChart(id, cfg.ticker, cfg.interval);
    }

    const handleResize = () => {
      for (let id = 1; id <= 4; id++) {
        const item = chartsRef.current[id];
        const container = chartContainersRef.current[id];
        if (item && container) {
          item.chart.applyOptions({
            width: container.clientWidth,
            height: container.clientHeight
          });
        }
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      for (let id = 1; id <= 4; id++) {
        if (chartsRef.current[id]) {
          chartsRef.current[id]!.chart.remove();
          chartsRef.current[id] = null;
        }
      }
    };
  }, []);

  // Update theme on all 4 charts
  useEffect(() => {
    const colors = getThemeColors();
    for (let id = 1; id <= 4; id++) {
      const item = chartsRef.current[id];
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
    }
  }, [theme]);

  const handlePresetSelect = (id: number, ticker: string) => {
    loadQuadChart(id, ticker, configs[id].interval);
  };

  const handleTimeframeSelect = (id: number, interval: string) => {
    loadQuadChart(id, configs[id].ticker, interval);
  };

  const handleCustomSubmit = (id: number, e: React.FormEvent) => {
    e.preventDefault();
    const val = customInputs[id]?.trim().toUpperCase();
    if (val) {
      loadQuadChart(id, val, configs[id].interval);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-2 gap-2 bg-[var(--bg-main)] overflow-hidden h-full">
      <div className="grid grid-cols-1 md:grid-cols-2 grid-rows-2 gap-2 flex-1 h-full min-h-0">
        {[1, 2, 3, 4].map(id => {
          const cfg = configs[id];
          return (
            <div
              key={id}
              className="flex flex-col rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] overflow-hidden shadow-xs"
            >
              {/* Header Quadrante */}
              <div className="flex flex-wrap items-center justify-between gap-1.5 px-3 py-1.5 bg-[var(--bg-header)] border-b border-[var(--border-color)] text-xs">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <select
                    value={cfg.ticker}
                    onChange={e => handlePresetSelect(id, e.target.value)}
                    className="px-2 py-0.5 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] font-semibold text-[11px] outline-none max-w-[190px]"
                  >
                    {MACRO_PRESETS.map(p => (
                      <option key={p.symbol} value={p.symbol}>
                        {p.name}
                      </option>
                    ))}
                    {!MACRO_PRESETS.some(p => p.symbol === cfg.ticker) && (
                      <option value={cfg.ticker}>{cfg.ticker}</option>
                    )}
                  </select>

                  <form onSubmit={e => handleCustomSubmit(id, e)} className="flex items-center gap-1">
                    <input
                      type="text"
                      placeholder="Ticker"
                      value={customInputs[id]}
                      onChange={e => setCustomInputs(prev => ({ ...prev, [id]: e.target.value }))}
                      className="w-16 uppercase px-1.5 py-0.5 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] text-[11px] text-center"
                    />
                    <button
                      type="submit"
                      className="px-1.5 py-0.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[10px]"
                    >
                      Carica
                    </button>
                  </form>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={cfg.interval}
                    onChange={e => handleTimeframeSelect(id, e.target.value)}
                    className="px-1.5 py-0.5 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] text-[11px] font-semibold outline-none"
                  >
                    <option value="1m">M1</option>
                    <option value="5m">M5</option>
                    <option value="15m">M15</option>
                    <option value="1h">H1</option>
                    <option value="4h">H4</option>
                    <option value="1d">Daily</option>
                    <option value="1wk">Weekly</option>
                  </select>

                  <span className="font-mono font-bold text-blue-500 text-xs">
                    {cfg.price > 0 ? (cfg.ticker.includes('=X') ? cfg.price.toFixed(4) : cfg.price.toFixed(2)) : '-'}
                  </span>
                </div>
              </div>

              {/* Chart Container */}
              <div
                ref={el => {
                  chartContainersRef.current[id] = el;
                }}
                className="flex-1 w-full h-full min-h-[160px]"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
