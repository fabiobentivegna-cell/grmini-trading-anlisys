import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  IPriceLine,
  CrosshairMode,
  ColorType,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  AreaSeries,
  LineStyle,
  createSeriesMarkers
} from 'lightweight-charts';
import { DrawingToolbar } from '../components/DrawingToolbar';
import { DrawingCanvas } from '../components/DrawingCanvas';
import { SentimentChartOverlay } from '../components/SentimentChartOverlay';
import { OverlayModal } from '../components/OverlayModal';
import { BacktestModal } from '../components/BacktestModal';
import { DivergenceModal } from '../components/DivergenceModal';
import { ChartOverlayLegend } from '../components/ChartOverlayLegend';
import { MultiTimeframeHub } from '../components/MultiTimeframeHub';
import { ProboAnalysisModal } from '../components/ProboAnalysisModal';
import {
  CandleData,
  DrawingItem,
  DrawingToolType,
  IndicatorConfig,
  OverlayConfig,
  OverlayCorrelationStats,
  OverlayLineStyle,
  PriceAlert,
  SentimentDivergenceAlert
} from '../types';
import { computeTechnicalIndicators } from '../services/technicalIndicators';
import { correlationOverlayService } from '../services/correlationOverlayService';
import { sentimentOverlayService } from '../services/sentimentOverlayService';
import { divergenceService } from '../services/divergenceService';
import { storageService } from '../services/storageService';

interface ChartPageProps {
  ticker: string;
  interval: string;
  chartType: 'candlestick' | 'line' | 'heikin_ashi';
  theme: 'dark' | 'light';
  indicatorConfig: IndicatorConfig;
  rawCandles: CandleData[];
  alerts?: PriceAlert[];
  onBarHover?: (bar: { open: number; high: number; low: number; close: number; time?: any }) => void;
  onMaHover?: (maValues: Record<string, number | string>) => void;
  onAtrHover?: (atrValue: number | string | null) => void;
  scrollToRealTimeTrigger?: number;
  drawColor: string;
  drawWidth: number;
  overlays: OverlayConfig[];
  onOverlaysChange: (overlays: OverlayConfig[]) => void;
  isOverlayModalOpen: boolean;
  onOpenOverlayModal: () => void;
  onCloseOverlayModal: () => void;
  isBacktestOpen?: boolean;
  onOpenBacktest?: () => void;
  onCloseBacktest?: () => void;
  onUpdateIndicatorConfig?: (config: IndicatorConfig) => void;
}

export const ChartPage: React.FC<ChartPageProps> = ({
  ticker,
  interval,
  chartType,
  theme,
  indicatorConfig,
  rawCandles,
  alerts = [],
  onBarHover,
  onMaHover,
  onAtrHover,
  scrollToRealTimeTrigger,
  drawColor,
  drawWidth,
  overlays,
  onOverlaysChange,
  isOverlayModalOpen,
  onOpenOverlayModal,
  onCloseOverlayModal,
  isBacktestOpen = false,
  onOpenBacktest,
  onCloseBacktest,
  onUpdateIndicatorConfig
}) => {
  const [internalBacktestOpen, setInternalBacktestOpen] = useState(false);
  const [isDivergenceModalOpen, setIsDivergenceModalOpen] = useState(false);
  const [isProboModalOpen, setIsProboModalOpen] = useState(false);
  const [activeDivergence, setActiveDivergence] = useState<SentimentDivergenceAlert | null>(null);
  const [divergenceMonitoring, setDivergenceMonitoring] = useState<boolean>(() =>
    divergenceService.isMonitoringEnabled()
  );
  const [divergenceSensitivity, setDivergenceSensitivity] = useState<'HIGH' | 'MEDIUM' | 'LOW'>(() =>
    divergenceService.getSensitivity()
  );

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const oscillatorsContainerRef = useRef<HTMLDivElement>(null);

  const captureChartScreenshot = useCallback(async (): Promise<string | null> => {
    try {
      const container = chartContainerRef.current;
      if (!container) return null;
      const canvases = container.querySelectorAll('canvas');
      if (canvases.length === 0) return null;

      const firstCanvas = canvases[0];
      const width = firstCanvas.width;
      const height = firstCanvas.height;

      const mergedCanvas = document.createElement('canvas');
      mergedCanvas.width = width;
      mergedCanvas.height = height;
      const ctx = mergedCanvas.getContext('2d');
      if (!ctx) return null;

      // Fill Background
      ctx.fillStyle = theme === 'dark' ? '#131722' : '#ffffff';
      ctx.fillRect(0, 0, width, height);

      // Draw all canvas layers
      canvases.forEach(c => {
        try {
          ctx.drawImage(c, 0, 0);
        } catch {}
      });

      return mergedCanvas.toDataURL('image/png');
    } catch (e) {
      console.warn('Screenshot capture fallback:', e);
      return null;
    }
  }, [theme]);

  const mainChartRef = useRef<IChartApi | null>(null);
  const primarySeriesRef = useRef<ISeriesApi<any> | null>(null);
  const [chartInstance, setChartInstance] = useState<IChartApi | null>(null);
  const [seriesInstance, setSeriesInstance] = useState<ISeriesApi<any> | null>(null);

  const dynamicMaSeriesMap = useRef<Record<string, ISeriesApi<any>>>({});
  const bbUpperSeriesRef = useRef<ISeriesApi<any> | null>(null);
  const bbLowerSeriesRef = useRef<ISeriesApi<any> | null>(null);
  const sarSeriesRef = useRef<ISeriesApi<any> | null>(null);
  const supertrendSeriesRef = useRef<ISeriesApi<any> | null>(null);
  const atrTslSeriesRef = useRef<ISeriesApi<any> | null>(null);

  const ichimokuSeriesRef = useRef<{
    tenkan: ISeriesApi<any> | null;
    kijun: ISeriesApi<any> | null;
    senkouA: ISeriesApi<any> | null;
    senkouB: ISeriesApi<any> | null;
    chikou: ISeriesApi<any> | null;
  }>({ tenkan: null, kijun: null, senkouA: null, senkouB: null, chikou: null });

  const keltnerSeriesRef = useRef<{
    upper: ISeriesApi<any> | null;
    middle: ISeriesApi<any> | null;
    lower: ISeriesApi<any> | null;
  }>({ upper: null, middle: null, lower: null });

  const vwapSeriesRef = useRef<{
    vwap: ISeriesApi<any> | null;
    upper1: ISeriesApi<any> | null;
    lower1: ISeriesApi<any> | null;
    upper2: ISeriesApi<any> | null;
    lower2: ISeriesApi<any> | null;
  }>({ vwap: null, upper1: null, lower1: null, upper2: null, lower2: null });

  const pivotSeriesRef = useRef<Record<string, ISeriesApi<any>>>({});

  const overlaySeriesMap = useRef<Record<string, ISeriesApi<any>>>({});
  const [correlationStats, setCorrelationStats] = useState<Record<string, OverlayCorrelationStats>>({});

  const subChartsRef = useRef<Record<string, { chart: IChartApi; series: any; panel: HTMLDivElement; observer?: ResizeObserver }>>({});

  const priceLinesRef = useRef<{ rsi: any[]; stoch: any[] }>({ rsi: [], stoch: [] });
  const alertPriceLinesRef = useRef<IPriceLine[]>([]);

  const [currentTool, setCurrentTool] = useState<DrawingToolType>('cursor');
  const [isCrosshairActive, setIsCrosshairActive] = useState(true);
  const [drawings, setDrawings] = useState<DrawingItem[]>(() => storageService.getDrawings(ticker, interval));

  const currentChartTypeRef = useRef<string>('');
  const hasInitialFitted = useRef<boolean>(false);
  const prevTickerRef = useRef(ticker);
  const prevIntervalRef = useRef(interval);

  const onBarHoverRef = useRef(onBarHover);
  onBarHoverRef.current = onBarHover;

  const onMaHoverRef = useRef(onMaHover);
  onMaHoverRef.current = onMaHover;

  const onAtrHoverRef = useRef(onAtrHover);
  onAtrHoverRef.current = onAtrHover;

  const atrMapRef = useRef<Map<string | number, number>>(new Map());

  const indicatorConfigRef = useRef(indicatorConfig);
  indicatorConfigRef.current = indicatorConfig;

  // Splitter state
  const [mainHeight, setMainHeight] = useState<number | null>(null);
  const isResizingRef = useRef(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);

  const isSyncingRange = useRef(false);

  // Timezone and Clock states
  const [chartTimezone, setChartTimezone] = useState<string>(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Rome';
    } catch {
      return 'Europe/Rome';
    }
  });
  const [showTzMenu, setShowTzMenu] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isMtfHubOpen, setIsMtfHubOpen] = useState<boolean>(false);

  // Zero-Delay mode
  const [zeroDelayMode, setZeroDelayMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('zenith_zero_delay_mode');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const handleToggleZeroDelay = () => {
    setZeroDelayMode(prev => {
      const next = !prev;
      try {
        localStorage.setItem('zenith_zero_delay_mode', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const intervalSeconds = React.useMemo(() => {
    switch (interval) {
      case '1m': return 60;
      case '5m': return 300;
      case '15m': return 900;
      case '30m': return 1800;
      case '1h': return 3600;
      case '4h': return 14400;
      default: return 86400;
    }
  }, [interval]);

  const { processedCandles, originalLagMinutes } = React.useMemo(() => {
    if (rawCandles.length === 0) {
      return { processedCandles: rawCandles, originalLagMinutes: 0, isLagDetected: false };
    }

    const isIntraday = ['1m', '5m', '15m', '30m', '1h', '4h'].includes(interval);
    const lastRaw = rawCandles[rawCandles.length - 1];

    if (!isIntraday || typeof lastRaw.time !== 'number') {
      return { processedCandles: rawCandles, originalLagMinutes: 0, isLagDetected: false };
    }

    const currentEpoch = Math.floor(Date.now() / 1000);
    const targetLastBarTime = currentEpoch - (currentEpoch % intervalSeconds);
    const lagSeconds = targetLastBarTime - lastRaw.time;
    const lagMins = Math.round(lagSeconds / 60);
    const hasLag = lagSeconds > intervalSeconds * 1.5;

    if (zeroDelayMode && hasLag && lagSeconds > 0) {
      const shifted = rawCandles.map(c => {
        if (typeof c.time === 'number') {
          return { ...c, time: c.time + lagSeconds };
        }
        return c;
      });
      return { processedCandles: shifted, originalLagMinutes: lagMins, isLagDetected: true };
    }

    return { processedCandles: rawCandles, originalLagMinutes: Math.max(0, lagMins), isLagDetected: hasLag };
  }, [rawCandles, interval, intervalSeconds, zeroDelayMode]);

  // AI Sentiment Score Mapping per Candle
  const sentimentMap = React.useMemo(() => {
    return sentimentOverlayService.generateSentimentMap(processedCandles, ticker);
  }, [processedCandles, ticker]);

  // Historical Divergence Points for rendering on Chart
  const divergencePoints = React.useMemo(() => {
    return divergenceService.detectHistoricalDivergences(processedCandles, sentimentMap, ticker);
  }, [processedCandles, sentimentMap, ticker]);

  // Check for active divergence on latest candles
  useEffect(() => {
    if (divergenceMonitoring && processedCandles.length > 10) {
      const detected = divergenceService.detectActiveDivergence(
        processedCandles,
        sentimentMap,
        ticker,
        divergenceSensitivity
      );
      if (detected) {
        setActiveDivergence(detected);
        divergenceService.saveAlertToHistory(detected);
      }
    }
  }, [processedCandles, sentimentMap, ticker, divergenceMonitoring, divergenceSensitivity]);

  const lastCandle = processedCandles.length > 0 ? processedCandles[processedCandles.length - 1] : null;
  const lastCandleFormatted = React.useMemo(() => {
    if (!lastCandle) return null;
    if (typeof lastCandle.time === 'number') {
      const d = new Date(lastCandle.time * 1000);
      return {
        timeExact: d.toLocaleTimeString('it-IT', { timeZone: chartTimezone, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
        timeShort: d.toLocaleTimeString('it-IT', { timeZone: chartTimezone, hour: '2-digit', minute: '2-digit', hour12: false }),
        date: d.toLocaleDateString('it-IT', { timeZone: chartTimezone, day: '2-digit', month: '2-digit', year: 'numeric' }),
        rawDate: d
      };
    } else if (typeof lastCandle.time === 'string') {
      return {
        timeExact: '--:--',
        timeShort: '--:--',
        date: lastCandle.time,
        rawDate: new Date(lastCandle.time)
      };
    }
    return null;
  }, [lastCandle, chartTimezone]);

  useEffect(() => {
    setDrawings(storageService.getDrawings(ticker, interval));
  }, [ticker, interval]);

  useEffect(() => {
    if (prevTickerRef.current !== ticker || prevIntervalRef.current !== interval) {
      prevTickerRef.current = ticker;
      prevIntervalRef.current = interval;
      hasInitialFitted.current = false;
    }
  }, [ticker, interval]);

  useEffect(() => {
    if (mainChartRef.current && scrollToRealTimeTrigger) {
      mainChartRef.current.timeScale().scrollToRealTime();
      Object.values(subChartsRef.current).forEach(({ chart: subChart }) => {
        try {
          subChart.timeScale().scrollToRealTime();
        } catch {}
      });
    }
  }, [scrollToRealTimeTrigger]);

  const handleDrawingsChange = (updated: DrawingItem[]) => {
    setDrawings(updated);
    storageService.saveDrawings(ticker, interval, updated);
  };

  const [highlightedTrade, setHighlightedTrade] = useState<{ entryDate: string; exitDate: string; type: 'LONG' | 'SHORT' } | null>(null);
  const markersRef = useRef<any>(null);

  // Clear highlight on ticker/interval change
  useEffect(() => {
    setHighlightedTrade(null);
  }, [ticker, interval]);

  // Set markers for entry/exit when a trade is selected
  useEffect(() => {
    const series = seriesInstance || primarySeriesRef.current;
    if (!series) return;

    // Clean up previous markers primitive if it exists
    if (markersRef.current) {
      try {
        (series as any).detachPrimitive(markersRef.current);
      } catch (err) {
        console.warn('Errore durante la rimozione del marker primitivo:', err);
      }
      markersRef.current = null;
    }

    if (!highlightedTrade) return;

    const markers: any[] = [];

    const entryCandle = processedCandles.find(c => {
      const cTimeStr = typeof c.time === 'string'
        ? c.time
        : new Date(Number(c.time) * 1000).toISOString().slice(0, 10);
      return cTimeStr === highlightedTrade.entryDate;
    });

    const exitCandle = processedCandles.find(c => {
      const cTimeStr = typeof c.time === 'string'
        ? c.time
        : new Date(Number(c.time) * 1000).toISOString().slice(0, 10);
      return cTimeStr === highlightedTrade.exitDate;
    });

    if (entryCandle) {
      markers.push({
        time: entryCandle.time,
        position: highlightedTrade.type === 'LONG' ? 'belowBar' : 'aboveBar',
        color: highlightedTrade.type === 'LONG' ? '#10b981' : '#ef4444',
        shape: highlightedTrade.type === 'LONG' ? 'arrowUp' : 'arrowDown',
        text: highlightedTrade.type === 'LONG' ? 'IN LONG' : 'IN SHORT'
      });
    }

    if (exitCandle) {
      markers.push({
        time: exitCandle.time,
        position: highlightedTrade.type === 'LONG' ? 'aboveBar' : 'belowBar',
        color: highlightedTrade.type === 'LONG' ? '#ef4444' : '#10b981',
        shape: highlightedTrade.type === 'LONG' ? 'arrowDown' : 'arrowUp',
        text: highlightedTrade.type === 'LONG' ? 'OUT LONG' : 'OUT SHORT'
      });
    }

    if (markers.length > 0) {
      try {
        markersRef.current = createSeriesMarkers(series, markers);
      } catch (err) {
        console.error('Errore durante la creazione dei marker con createSeriesMarkers:', err);
      }
    }
  }, [highlightedTrade, seriesInstance, processedCandles]);

  const handleSelectTrade = useCallback((trade: { entryDate: string; exitDate: string; type: 'LONG' | 'SHORT' }) => {
    setHighlightedTrade(trade);

    const chart = chartInstance || mainChartRef.current;
    if (!chart) return;

    const entryIdx = processedCandles.findIndex(c => {
      const cTimeStr = typeof c.time === 'string'
        ? c.time
        : new Date(Number(c.time) * 1000).toISOString().slice(0, 10);
      return cTimeStr === trade.entryDate;
    });

    if (entryIdx !== -1) {
      const startIdx = Math.max(0, entryIdx - 20);
      const endIdx = Math.min(processedCandles.length - 1, entryIdx + 20);

      const fromTime = processedCandles[startIdx].time;
      const toTime = processedCandles[endIdx].time;

      chart.timeScale().setVisibleRange({
        from: fromTime as any,
        to: toTime as any
      });
    }
  }, [chartInstance, processedCandles]);

  const getThemeColors = useCallback(() => {
    return theme === 'dark'
      ? { bg: '#131722', text: '#d1d4dc', grid: '#1e222d', border: '#2a2e39' }
      : { bg: '#ffffff', text: '#131722', grid: '#f0f3fa', border: '#e0e3eb' };
  }, [theme]);

  const getTickMarkFormatter = useCallback((tz: string) => {
    return (timeVal: any, tickMarkType: any) => {
      if (typeof timeVal === 'string') {
        const parts = timeVal.split('-');
        if (parts.length === 3) {
          const [y, m, d] = parts;
          if (tickMarkType === 0) return y;
          if (tickMarkType === 1) {
            const dt = new Date(Number(y), Number(m) - 1, Number(d));
            return dt.toLocaleDateString('it-IT', { month: 'short' });
          }
          return d;
        }
        return timeVal;
      }
      if (typeof timeVal === 'number') {
        const date = new Date(timeVal * 1000);
        if (tickMarkType === 3) {
          return date.toLocaleTimeString('it-IT', {
            timeZone: tz,
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          });
        }
        if (tickMarkType === 4) {
          return date.toLocaleTimeString('it-IT', {
            timeZone: tz,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
          });
        }
        if (tickMarkType === 2) {
          return date.toLocaleDateString('it-IT', {
            timeZone: tz,
            day: 'numeric',
            month: 'short'
          });
        }
        if (tickMarkType === 1) {
          return date.toLocaleDateString('it-IT', {
            timeZone: tz,
            month: 'short'
          });
        }
        if (tickMarkType === 0) {
          return date.toLocaleDateString('it-IT', {
            timeZone: tz,
            year: 'numeric'
          });
        }
      }
      return '';
    };
  }, []);

  // Initialize main chart
  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return;

    const colors = getThemeColors();
    const isIntraday = ['1m', '5m', '15m', '30m', '1h', '4h'].includes(interval);

    const chart = createChart(container, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: colors.bg },
        textColor: colors.text
      },
      localization: {
        locale: 'it-IT',
        dateFormat: 'dd/MM/yyyy',
        timeFormatter: (timeVal: any) => {
          if (typeof timeVal === 'number') {
            const date = new Date(timeVal * 1000);
            return date.toLocaleTimeString('it-IT', {
              timeZone: chartTimezone,
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false
            });
          }
          return String(timeVal);
        }
      },
      grid: {
        vertLines: { color: colors.grid },
        horzLines: { color: colors.grid }
      },
      crosshair: {
        mode: CrosshairMode.Normal
      },
      rightPriceScale: {
        borderColor: colors.border,
        minimumWidth: 80
      },
      leftPriceScale: {
        visible: false,
        borderColor: colors.border,
        minimumWidth: 75,
        autoScale: true,
        scaleMargins: { top: 0.1, bottom: 0.1 }
      },
      timeScale: {
        borderColor: colors.border,
        timeVisible: isIntraday,
        secondsVisible: false,
        rightOffset: 12,
        barSpacing: 8,
        minBarSpacing: 2,
        tickMarkFormatter: getTickMarkFormatter(chartTimezone)
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true
      }
    });

    mainChartRef.current = chart;
    setChartInstance(chart);

    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          chart.applyOptions({ width, height });
        }
      }
    });
    resizeObserver.observe(container);

    bbUpperSeriesRef.current = chart.addSeries(LineSeries, {
      color: '#ab47bc',
      lineWidth: 1,
      title: 'BB Upper',
      priceLineVisible: false
    });
    bbLowerSeriesRef.current = chart.addSeries(LineSeries, {
      color: '#ab47bc',
      lineWidth: 1,
      title: 'BB Lower',
      priceLineVisible: false
    });
    sarSeriesRef.current = chart.addSeries(LineSeries, {
      color: '#089981',
      lineWidth: 1,
      lineStyle: 2,
      title: 'SAR',
      priceLineVisible: false
    });
    supertrendSeriesRef.current = chart.addSeries(LineSeries, {
      color: '#26a69a',
      lineWidth: 2,
      title: 'Supertrend',
      priceLineVisible: false
    });
    atrTslSeriesRef.current = chart.addSeries(LineSeries, {
      color: '#ff9800',
      lineWidth: 2,
      lineStyle: 1,
      title: 'ATR TSL',
      priceLineVisible: false
    });

    // Ichimoku Cloud Lines
    ichimokuSeriesRef.current = {
      tenkan: chart.addSeries(LineSeries, { color: '#2563eb', lineWidth: 2, title: 'Tenkan', priceLineVisible: false }),
      kijun: chart.addSeries(LineSeries, { color: '#dc2626', lineWidth: 2, title: 'Kijun', priceLineVisible: false }),
      senkouA: chart.addSeries(LineSeries, { color: '#059669', lineWidth: 1, lineStyle: 1, title: 'Senkou A', priceLineVisible: false }),
      senkouB: chart.addSeries(LineSeries, { color: '#e11d48', lineWidth: 1, lineStyle: 1, title: 'Senkou B', priceLineVisible: false }),
      chikou: chart.addSeries(LineSeries, { color: '#9333ea', lineWidth: 1, lineStyle: 2, title: 'Chikou', priceLineVisible: false })
    };

    // Keltner Channels
    keltnerSeriesRef.current = {
      upper: chart.addSeries(LineSeries, { color: '#06b6d4', lineWidth: 1, title: 'Keltner Up', priceLineVisible: false }),
      middle: chart.addSeries(LineSeries, { color: '#0891b2', lineWidth: 1, lineStyle: 2, title: 'Keltner Mid', priceLineVisible: false }),
      lower: chart.addSeries(LineSeries, { color: '#06b6d4', lineWidth: 1, title: 'Keltner Low', priceLineVisible: false })
    };

    // VWAP & Bands
    vwapSeriesRef.current = {
      vwap: chart.addSeries(LineSeries, { color: '#ea580c', lineWidth: 2, title: 'VWAP', priceLineVisible: false }),
      upper1: chart.addSeries(LineSeries, { color: '#f97316', lineWidth: 1, lineStyle: 2, title: 'VWAP +1σ', priceLineVisible: false }),
      lower1: chart.addSeries(LineSeries, { color: '#f97316', lineWidth: 1, lineStyle: 2, title: 'VWAP -1σ', priceLineVisible: false }),
      upper2: chart.addSeries(LineSeries, { color: '#fb923c', lineWidth: 1, lineStyle: 1, title: 'VWAP +2σ', priceLineVisible: false }),
      lower2: chart.addSeries(LineSeries, { color: '#fb923c', lineWidth: 1, lineStyle: 1, title: 'VWAP -2σ', priceLineVisible: false })
    };

    // Pivot Points
    const pivotColors: Record<string, string> = {
      p: '#eab308',
      r1: '#f87171',
      r2: '#ef4444',
      r3: '#b91c1c',
      s1: '#34d399',
      s2: '#10b981',
      s3: '#047857'
    };
    Object.entries(pivotColors).forEach(([lvlKey, col]) => {
      pivotSeriesRef.current[lvlKey] = chart.addSeries(LineSeries, {
        color: col,
        lineWidth: lvlKey === 'p' ? 2 : 1,
        lineStyle: lvlKey === 'p' ? 0 : 2,
        title: lvlKey.toUpperCase(),
        priceLineVisible: false
      });
    });

    chart.subscribeCrosshairMove(param => {
      if (!param.time || !primarySeriesRef.current) return;
      const data = param.seriesData.get(primarySeriesRef.current) as any;
      if (data && onBarHoverRef.current) {
        if (data.open !== undefined) {
          onBarHoverRef.current({
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close,
            time: param.time
          });
        } else if (data.value !== undefined) {
          onBarHoverRef.current({
            open: data.value,
            high: data.value,
            low: data.value,
            close: data.value,
            time: param.time
          });
        }
      }

      if (onMaHoverRef.current) {
        const maVals: Record<string, number | string> = {};
        indicatorConfigRef.current.movingAverages.forEach(ma => {
          const s = dynamicMaSeriesMap.current[ma.id];
          if (s && param.seriesData.has(s)) {
            const pt = param.seriesData.get(s) as any;
            if (pt && pt.value !== undefined) {
              maVals[ma.id] = Number(pt.value).toFixed(2);
            }
          }
        });
        onMaHoverRef.current(maVals);
      }

      if (onAtrHoverRef.current) {
        if (param.time && atrMapRef.current.has(param.time as any)) {
          const val = atrMapRef.current.get(param.time as any)!;
          const decimals = ticker.includes('=X') ? 4 : ticker.includes('^TNX') ? 3 : 2;
          onAtrHoverRef.current(Number(val.toFixed(decimals)));
        } else {
          const arr = Array.from(atrMapRef.current.values());
          if (arr.length > 0) {
            const decimals = ticker.includes('=X') ? 4 : ticker.includes('^TNX') ? 3 : 2;
            onAtrHoverRef.current(Number(arr[arr.length - 1].toFixed(decimals)));
          }
        }
      }
    });

    chart.timeScale().subscribeVisibleLogicalRangeChange(range => {
      if (!range || isSyncingRange.current) return;
      isSyncingRange.current = true;
      Object.values(subChartsRef.current).forEach(({ chart: subChart }) => {
        try {
          subChart.timeScale().setVisibleLogicalRange(range);
        } catch {}
      });
      isSyncingRange.current = false;
    });

    const handleResize = () => {
      if (chart && container) {
        chart.applyOptions({
          width: container.clientWidth,
          height: container.clientHeight
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      Object.values(overlaySeriesMap.current).forEach(series => {
        try {
          chart.removeSeries(series);
        } catch {}
      });
      overlaySeriesMap.current = {};
      chart.remove();
      mainChartRef.current = null;
      primarySeriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    const isIntraday = ['1m', '5m', '15m', '30m', '1h', '4h'].includes(interval);
    if (mainChartRef.current) {
      mainChartRef.current.timeScale().applyOptions({ timeVisible: isIntraday });
    }
    Object.values(subChartsRef.current).forEach(({ chart }) => {
      chart.timeScale().applyOptions({ timeVisible: isIntraday });
    });
  }, [interval]);

  useEffect(() => {
    const colors = getThemeColors();
    if (mainChartRef.current) {
      mainChartRef.current.applyOptions({
        layout: {
          background: { type: ColorType.Solid, color: colors.bg },
          textColor: colors.text
        },
        grid: {
          vertLines: { color: colors.grid },
          horzLines: { color: colors.grid }
        },
        rightPriceScale: { borderColor: colors.border },
        leftPriceScale: { borderColor: colors.border },
        timeScale: { borderColor: colors.border }
      });
    }

    Object.values(subChartsRef.current).forEach(({ chart: subChart }) => {
      subChart.applyOptions({
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
    });
  }, [theme, getThemeColors]);

  useEffect(() => {
    if (mainChartRef.current) {
      mainChartRef.current.applyOptions({
        localization: {
          timeFormatter: (timeVal: any) => {
            if (typeof timeVal === 'number') {
              const date = new Date(timeVal * 1000);
              return date.toLocaleTimeString('it-IT', {
                timeZone: chartTimezone,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
              });
            }
            return String(timeVal);
          }
        },
        timeScale: {
          tickMarkFormatter: getTickMarkFormatter(chartTimezone)
        }
      });
    }

    Object.values(subChartsRef.current).forEach(({ chart: subChart }) => {
      try {
        subChart.applyOptions({
          localization: {
            timeFormatter: (timeVal: any) => {
              if (typeof timeVal === 'number') {
                const date = new Date(timeVal * 1000);
                return date.toLocaleTimeString('it-IT', {
                  timeZone: chartTimezone,
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: false
                });
              }
              return String(timeVal);
            }
          },
          timeScale: {
            tickMarkFormatter: getTickMarkFormatter(chartTimezone)
          }
        });
      } catch {}
    });
  }, [chartTimezone, getTickMarkFormatter]);

  // Manage Oscillator Panels
  useEffect(() => {
    const chart = mainChartRef.current;
    const oscContainer = oscillatorsContainerRef.current;
    if (!chart || !oscContainer) return;

    const colors = getThemeColors();
    const activeOscs = {
      rsi: indicatorConfig.rsiEnabled,
      macd: indicatorConfig.macdEnabled,
      stoch: indicatorConfig.stochEnabled,
      adx: indicatorConfig.adxEnabled,
      atr: indicatorConfig.atrEnabled,
      stochRsi: indicatorConfig.stochRsiEnabled
    };

    Object.entries(activeOscs).forEach(([key, isEnabled]) => {
      if (isEnabled && !subChartsRef.current[key]) {
        const panel = document.createElement('div');
        panel.className = 'relative w-full h-[135px] min-h-[90px] border-b border-[var(--border-color)] overflow-hidden';
        panel.id = `osc-panel-${key}`;

        const header = document.createElement('div');
        header.className = 'absolute top-1 left-2 z-10 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--border-color)]/50 backdrop-blur-xs text-[var(--text-main)]';
        header.textContent = key.toUpperCase();
        panel.appendChild(header);

        oscContainer.appendChild(panel);

        const isIntraday = ['1m', '5m', '15m', '30m', '1h', '4h'].includes(interval);

        const subChart = createChart(panel, {
          autoSize: true,
          layout: {
            background: { type: ColorType.Solid, color: colors.bg },
            textColor: colors.text
          },
          grid: {
            vertLines: { color: colors.grid },
            horzLines: { color: colors.grid }
          },
          crosshair: { mode: CrosshairMode.Normal },
          rightPriceScale: {
            borderColor: colors.border,
            autoScale: true,
            scaleMargins: { top: 0.1, bottom: 0.1 },
            minimumWidth: 80
          },
          timeScale: {
            borderColor: colors.border,
            timeVisible: isIntraday,
            secondsVisible: false,
            rightOffset: 12,
            barSpacing: 8,
            minBarSpacing: 2
          },
          handleScroll: { mouseWheel: false, pressedMouseMove: false },
          handleScale: {
            axisPressedMouseMove: { price: true, time: false },
            mouseWheel: false,
            pinch: false
          }
        });

        const panelObserver = new ResizeObserver(entries => {
          for (const entry of entries) {
            const { width, height } = entry.contentRect;
            if (width > 0 && height > 0) {
              subChart.applyOptions({ width, height });
            }
          }
        });
        panelObserver.observe(panel);

        let seriesObj: any = {};
        if (key === 'rsi') {
          seriesObj.line = subChart.addSeries(LineSeries, {
            color: indicatorConfig.rsiColor,
            lineWidth: indicatorConfig.rsiWidth as any,
            title: 'RSI',
            priceLineVisible: false
          });
        } else if (key === 'macd') {
          seriesObj.line = subChart.addSeries(LineSeries, {
            color: indicatorConfig.macdColor,
            lineWidth: 2,
            title: 'MACD',
            priceLineVisible: false
          });
          seriesObj.signal = subChart.addSeries(LineSeries, {
            color: indicatorConfig.macdSigColor,
            lineWidth: 2,
            title: 'Signal',
            priceLineVisible: false
          });
          seriesObj.hist = subChart.addSeries(HistogramSeries, {
            title: 'Hist',
            priceLineVisible: false
          });
        } else if (key === 'stoch') {
          seriesObj.k = subChart.addSeries(LineSeries, {
            color: indicatorConfig.stochKColor,
            lineWidth: 2,
            title: '%K',
            priceLineVisible: false
          });
          seriesObj.d = subChart.addSeries(LineSeries, {
            color: indicatorConfig.stochDColor,
            lineWidth: 2,
            title: '%D',
            priceLineVisible: false
          });
        } else if (key === 'adx') {
          seriesObj.adx = subChart.addSeries(LineSeries, {
            color: indicatorConfig.adxColor,
            lineWidth: 2,
            title: 'ADX',
            priceLineVisible: false
          });
          seriesObj.plusDi = subChart.addSeries(LineSeries, {
            color: indicatorConfig.plusDiColor,
            lineWidth: 1,
            title: '+DI',
            priceLineVisible: false
          });
          seriesObj.minusDi = subChart.addSeries(LineSeries, {
            color: indicatorConfig.minusDiColor,
            lineWidth: 1,
            title: '-DI',
            priceLineVisible: false
          });
        } else if (key === 'atr') {
          seriesObj.line = subChart.addSeries(LineSeries, {
            color: indicatorConfig.atrColor,
            lineWidth: indicatorConfig.atrWidth as any,
            title: 'ATR',
            priceLineVisible: false
          });
        } else if (key === 'stochRsi') {
          seriesObj.k = subChart.addSeries(LineSeries, {
            color: '#2563eb',
            lineWidth: 2,
            title: '%K',
            priceLineVisible: false
          });
          seriesObj.d = subChart.addSeries(LineSeries, {
            color: '#f97316',
            lineWidth: 2,
            title: '%D',
            priceLineVisible: false
          });
        }

        subChart.timeScale().subscribeVisibleLogicalRangeChange(range => {
          if (!range || isSyncingRange.current || !mainChartRef.current) return;
          isSyncingRange.current = true;
          try {
            mainChartRef.current.timeScale().setVisibleLogicalRange(range);
          } catch {}
          Object.values(subChartsRef.current).forEach(({ chart: otherChart }) => {
            if (otherChart !== subChart) {
              try {
                otherChart.timeScale().setVisibleLogicalRange(range);
              } catch {}
            }
          });
          isSyncingRange.current = false;
        });

        try {
          const curRange = chart.timeScale().getVisibleLogicalRange();
          if (curRange) {
            subChart.timeScale().setVisibleLogicalRange(curRange);
          }
        } catch {}

        subChartsRef.current[key] = { chart: subChart, series: seriesObj, panel, observer: panelObserver };
      } else if (!isEnabled && subChartsRef.current[key]) {
        if (subChartsRef.current[key].observer) {
          subChartsRef.current[key].observer!.disconnect();
        }
        subChartsRef.current[key].chart.remove();
        subChartsRef.current[key].panel.remove();
        delete subChartsRef.current[key];
      }
    });
  }, [
    indicatorConfig.rsiEnabled,
    indicatorConfig.macdEnabled,
    indicatorConfig.stochEnabled,
    indicatorConfig.adxEnabled,
    indicatorConfig.atrEnabled,
    indicatorConfig.stochRsiEnabled,
    getThemeColors
  ]);

  // Update Data and Indicators
  useEffect(() => {
    const chart = mainChartRef.current;
    if (!chart || processedCandles.length === 0) return;

    const calculated = computeTechnicalIndicators(processedCandles, indicatorConfig);

    if (!primarySeriesRef.current || currentChartTypeRef.current !== chartType) {
      if (primarySeriesRef.current) {
        chart.removeSeries(primarySeriesRef.current);
        primarySeriesRef.current = null;
      }
      currentChartTypeRef.current = chartType;

      if (chartType === 'line') {
        primarySeriesRef.current = chart.addSeries(LineSeries, {
          color: '#2962ff',
          lineWidth: 2,
          priceLineVisible: false
        });
      } else if (chartType === 'heikin_ashi') {
        primarySeriesRef.current = chart.addSeries(CandlestickSeries, {
          upColor: '#089981',
          downColor: '#f23645',
          borderVisible: false,
          wickUpColor: '#089981',
          wickDownColor: '#f23645',
          priceLineVisible: false
        });
      } else {
        primarySeriesRef.current = chart.addSeries(CandlestickSeries, {
          upColor: '#089981',
          downColor: '#f23645',
          borderVisible: false,
          wickUpColor: '#089981',
          wickDownColor: '#f23645',
          priceLineVisible: false
        });
      }
    }

    if (chartType === 'line') {
      primarySeriesRef.current.setData(calculated.lineData as any);
    } else if (chartType === 'heikin_ashi') {
      primarySeriesRef.current.setData(calculated.haCandles as any);
    } else {
      primarySeriesRef.current.setData(calculated.candles as any);
    }

    setSeriesInstance(primarySeriesRef.current);

    if (!hasInitialFitted.current && calculated.candles.length > 0) {
      hasInitialFitted.current = true;
      requestAnimationFrame(() => {
        if (mainChartRef.current) {
          mainChartRef.current.timeScale().fitContent();
        }
      });
    }

    // Dynamic Moving Averages
    indicatorConfig.movingAverages.forEach(ma => {
      if (ma.enabled) {
        if (!dynamicMaSeriesMap.current[ma.id]) {
          dynamicMaSeriesMap.current[ma.id] = chart.addSeries(LineSeries, {
            color: ma.color,
            lineWidth: ma.width as any,
            title: `${ma.type} ${ma.period}`,
            priceLineVisible: false
          });
        } else {
          dynamicMaSeriesMap.current[ma.id].applyOptions({
            color: ma.color,
            lineWidth: ma.width as any,
            title: `${ma.type} ${ma.period}`
          });
        }
        dynamicMaSeriesMap.current[ma.id].setData((calculated.dynamicMas[ma.id] || []) as any);
      } else {
        if (dynamicMaSeriesMap.current[ma.id]) {
          dynamicMaSeriesMap.current[ma.id].setData([]);
        }
      }
    });

    Object.keys(dynamicMaSeriesMap.current).forEach(id => {
      if (!indicatorConfig.movingAverages.some(m => m.id === id)) {
        chart.removeSeries(dynamicMaSeriesMap.current[id]);
        delete dynamicMaSeriesMap.current[id];
      }
    });

    // Overlays
    if (bbUpperSeriesRef.current && bbLowerSeriesRef.current) {
      bbUpperSeriesRef.current.setData(indicatorConfig.bbEnabled ? (calculated.overlays.bbUpper as any) : []);
      bbLowerSeriesRef.current.setData(indicatorConfig.bbEnabled ? (calculated.overlays.bbLower as any) : []);
    }
    if (sarSeriesRef.current) {
      sarSeriesRef.current.setData(indicatorConfig.sarEnabled ? (calculated.overlays.sar as any) : []);
    }
    if (supertrendSeriesRef.current) {
      supertrendSeriesRef.current.setData(indicatorConfig.supertrendEnabled ? (calculated.overlays.supertrend as any) : []);
    }
    if (atrTslSeriesRef.current) {
      atrTslSeriesRef.current.applyOptions({ color: indicatorConfig.atrTslColor });
      atrTslSeriesRef.current.setData(indicatorConfig.atrTslEnabled ? (calculated.overlays.atrTsl as any) : []);
    }

    // Ichimoku Cloud Lines
    const ichRef = ichimokuSeriesRef.current;
    if (ichRef.tenkan && ichRef.kijun && ichRef.senkouA && ichRef.senkouB && ichRef.chikou) {
      const ich = calculated.overlays.ichimoku;
      const en = !!indicatorConfig.ichimokuEnabled;
      ichRef.tenkan.setData(en && ich ? (ich.tenkan as any) : []);
      ichRef.kijun.setData(en && ich ? (ich.kijun as any) : []);
      ichRef.senkouA.setData(en && ich ? (ich.senkouA as any) : []);
      ichRef.senkouB.setData(en && ich ? (ich.senkouB as any) : []);
      ichRef.chikou.setData(en && ich ? (ich.chikou as any) : []);
    }

    // Keltner Channels
    const kcRef = keltnerSeriesRef.current;
    if (kcRef.upper && kcRef.middle && kcRef.lower) {
      const kc = calculated.overlays.keltner;
      const en = !!indicatorConfig.keltnerEnabled;
      kcRef.upper.setData(en && kc ? (kc.upper as any) : []);
      kcRef.middle.setData(en && kc ? (kc.middle as any) : []);
      kcRef.lower.setData(en && kc ? (kc.lower as any) : []);
    }

    // VWAP & Bands
    const vwRef = vwapSeriesRef.current;
    if (vwRef.vwap && vwRef.upper1 && vwRef.lower1 && vwRef.upper2 && vwRef.lower2) {
      const vw = calculated.overlays.vwap;
      const en = !!indicatorConfig.vwapEnabled;
      vwRef.vwap.setData(en && vw ? (vw.vwap as any) : []);
      vwRef.upper1.setData(en && vw ? (vw.upper1 as any) : []);
      vwRef.lower1.setData(en && vw ? (vw.lower1 as any) : []);
      vwRef.upper2.setData(en && vw ? (vw.upper2 as any) : []);
      vwRef.lower2.setData(en && vw ? (vw.lower2 as any) : []);
    }

    // Pivots
    const piv = calculated.overlays.pivots;
    const pivEn = !!indicatorConfig.pivotEnabled;
    Object.keys(pivotSeriesRef.current).forEach(lvl => {
      const s = pivotSeriesRef.current[lvl];
      if (s) {
        s.setData(pivEn && piv && (piv as any)[lvl] ? ((piv as any)[lvl] as any) : []);
      }
    });

    // Oscillators Data
    const sc = subChartsRef.current;
    if (sc['rsi'] && sc['rsi'].series.line) {
      sc['rsi'].series.line.applyOptions({
        color: indicatorConfig.rsiColor,
        lineWidth: indicatorConfig.rsiWidth as any
      });
      sc['rsi'].series.line.setData(calculated.oscillators.rsi as any);

      priceLinesRef.current.rsi.forEach(pl => sc['rsi'].series.line.removePriceLine(pl));
      priceLinesRef.current.rsi = [
        sc['rsi'].series.line.createPriceLine({
          price: indicatorConfig.rsiOverbought,
          color: indicatorConfig.rsiOverboughtColor,
          lineWidth: 1,
          lineStyle: 0,
          title: `OB ${indicatorConfig.rsiOverbought}`
        }),
        sc['rsi'].series.line.createPriceLine({
          price: indicatorConfig.rsiMid,
          color: indicatorConfig.rsiMidColor,
          lineWidth: 1,
          lineStyle: 2,
          title: `MID ${indicatorConfig.rsiMid}`
        }),
        sc['rsi'].series.line.createPriceLine({
          price: indicatorConfig.rsiOversold,
          color: indicatorConfig.rsiOversoldColor,
          lineWidth: 1,
          lineStyle: 0,
          title: `OS ${indicatorConfig.rsiOversold}`
        })
      ];
    }

    if (sc['macd']) {
      sc['macd'].series.line.applyOptions({ color: indicatorConfig.macdColor });
      sc['macd'].series.signal.applyOptions({ color: indicatorConfig.macdSigColor });
      sc['macd'].series.line.setData(calculated.oscillators.macd.line as any);
      sc['macd'].series.signal.setData(calculated.oscillators.macd.signal as any);
      sc['macd'].series.hist.setData(calculated.oscillators.macd.hist as any);
    }

    if (sc['stoch']) {
      sc['stoch'].series.k.applyOptions({ color: indicatorConfig.stochKColor });
      sc['stoch'].series.d.applyOptions({ color: indicatorConfig.stochDColor });
      sc['stoch'].series.k.setData(calculated.oscillators.stoch.k as any);
      sc['stoch'].series.d.setData(calculated.oscillators.stoch.d as any);

      priceLinesRef.current.stoch.forEach(pl => sc['stoch'].series.k.removePriceLine(pl));
      priceLinesRef.current.stoch = [
        sc['stoch'].series.k.createPriceLine({
          price: indicatorConfig.stochOverbought,
          color: indicatorConfig.stochOverboughtColor,
          lineWidth: 1,
          lineStyle: 0,
          title: `OB ${indicatorConfig.stochOverbought}`
        }),
        sc['stoch'].series.k.createPriceLine({
          price: indicatorConfig.stochOversold,
          color: indicatorConfig.stochOversoldColor,
          lineWidth: 1,
          lineStyle: 0,
          title: `OS ${indicatorConfig.stochOversold}`
        })
      ];
    }

    if (sc['adx']) {
      sc['adx'].series.adx.applyOptions({ color: indicatorConfig.adxColor });
      sc['adx'].series.plusDi.applyOptions({ color: indicatorConfig.plusDiColor });
      sc['adx'].series.minusDi.applyOptions({ color: indicatorConfig.minusDiColor });
      sc['adx'].series.adx.setData(calculated.oscillators.adx.adx as any);
      sc['adx'].series.plusDi.setData(calculated.oscillators.adx.plusDi as any);
      sc['adx'].series.minusDi.setData(calculated.oscillators.adx.minusDi as any);
    }

    if (sc['atr']) {
      sc['atr'].series.line.applyOptions({
        color: indicatorConfig.atrColor,
        lineWidth: indicatorConfig.atrWidth as any
      });
      sc['atr'].series.line.setData(calculated.oscillators.atr as any);
    }

    if (sc['stochRsi'] && calculated.oscillators.stochRsi) {
      sc['stochRsi'].series.k.setData(calculated.oscillators.stochRsi.k as any);
      sc['stochRsi'].series.d.setData(calculated.oscillators.stochRsi.d as any);
    }

    const newAtrMap = new Map<string | number, number>();
    const atrSeries = calculated.oscillators.atr;
    atrSeries.forEach(pt => {
      if (typeof pt.value === 'number' && !isNaN(pt.value)) {
        newAtrMap.set(pt.time, pt.value);
      }
    });
    atrMapRef.current = newAtrMap;

    if (onAtrHoverRef.current && atrSeries.length > 0) {
      const validPoints = atrSeries.filter(pt => typeof pt.value === 'number' && !isNaN(pt.value));
      if (validPoints.length > 0) {
        const latestVal = validPoints[validPoints.length - 1].value;
        const decimals = ticker.includes('=X') ? 4 : ticker.includes('^TNX') ? 3 : 2;
        onAtrHoverRef.current(Number(latestVal.toFixed(decimals)));
      }
    }
  }, [processedCandles, indicatorConfig, chartType, ticker]);

  const getLineStyleEnum = (style: OverlayLineStyle) => {
    if (style === 'dashed') return LineStyle.Dashed;
    if (style === 'dotted') return LineStyle.Dotted;
    return LineStyle.Solid;
  };

  useEffect(() => {
    const chart = mainChartRef.current;
    if (!chart || !rawCandles.length) return;

    let isMounted = true;
    const colors = getThemeColors();

    const updateOverlays = async () => {
      const newStats: Record<string, OverlayCorrelationStats> = {};
      const activeOverlayIds = new Set(overlays.filter(o => o.visible).map(o => o.id));

      Object.keys(overlaySeriesMap.current).forEach(id => {
        if (!activeOverlayIds.has(id)) {
          try {
            chart.removeSeries(overlaySeriesMap.current[id]);
          } catch {}
          delete overlaySeriesMap.current[id];
        }
      });

      let hasAnyVisibleOverlay = false;

      for (const overlay of overlays) {
        if (!overlay.visible) continue;
        hasAnyVisibleOverlay = true;

        const targetInterval = overlay.interval === 'same' ? interval : overlay.interval;
        const overlayCandles = await correlationOverlayService.fetchOverlayCandles(overlay.ticker, targetInterval);
        if (!isMounted) return;

        const { alignedData } = correlationOverlayService.alignOverlayData(rawCandles, overlayCandles, overlay.scaleMode);
        const stats = correlationOverlayService.calculateCorrelationStats(overlay, ticker, rawCandles, overlayCandles);
        newStats[overlay.id] = stats;

        let series = overlaySeriesMap.current[overlay.id];
        const lineStyleEnum = getLineStyleEnum(overlay.lineStyle);

        if (!series) {
          if (overlay.seriesType === 'area') {
            series = chart.addSeries(AreaSeries, {
              priceScaleId: 'left',
              lineColor: overlay.color,
              topColor: overlay.color + '40',
              bottomColor: overlay.color + '00',
              lineWidth: overlay.lineWidth as any,
              lineStyle: lineStyleEnum,
              priceFormat: overlay.scaleMode === 'percent'
                ? { type: 'custom', formatter: (v: number) => (v >= 0 ? `+${v.toFixed(2)}%` : `${v.toFixed(2)}%`) }
                : { type: 'price', precision: 2, minMove: 0.01 }
            });
          } else {
            series = chart.addSeries(LineSeries, {
              priceScaleId: 'left',
              color: overlay.color,
              lineWidth: overlay.lineWidth as any,
              lineStyle: lineStyleEnum,
              priceFormat: overlay.scaleMode === 'percent'
                ? { type: 'custom', formatter: (v: number) => (v >= 0 ? `+${v.toFixed(2)}%` : `${v.toFixed(2)}%`) }
                : { type: 'price', precision: 2, minMove: 0.01 }
            });
          }
          overlaySeriesMap.current[overlay.id] = series;
        } else {
          if (overlay.seriesType === 'area') {
            series.applyOptions({
              lineColor: overlay.color,
              topColor: overlay.color + '40',
              bottomColor: overlay.color + '00',
              lineWidth: overlay.lineWidth as any,
              lineStyle: lineStyleEnum,
              priceFormat: overlay.scaleMode === 'percent'
                ? { type: 'custom', formatter: (v: number) => (v >= 0 ? `+${v.toFixed(2)}%` : `${v.toFixed(2)}%`) }
                : { type: 'price', precision: 2, minMove: 0.01 }
            });
          } else {
            series.applyOptions({
              color: overlay.color,
              lineWidth: overlay.lineWidth as any,
              lineStyle: lineStyleEnum,
              priceFormat: overlay.scaleMode === 'percent'
                ? { type: 'custom', formatter: (v: number) => (v >= 0 ? `+${v.toFixed(2)}%` : `${v.toFixed(2)}%`) }
                : { type: 'price', precision: 2, minMove: 0.01 }
            });
          }
        }

        series.setData(alignedData as any);
      }

      chart.applyOptions({
        leftPriceScale: {
          visible: hasAnyVisibleOverlay,
          borderColor: colors.border,
          minimumWidth: 75,
          autoScale: true,
          scaleMargins: { top: 0.1, bottom: 0.1 }
        }
      });

      if (isMounted) {
        setCorrelationStats(newStats);
      }
    };

    updateOverlays();

    return () => {
      isMounted = false;
    };
  }, [rawCandles, overlays, interval, ticker, getThemeColors]);

  // Price alerts lines on chart
  useEffect(() => {
    const series = primarySeriesRef.current;
    if (!series) return;

    if (alertPriceLinesRef.current.length > 0) {
      alertPriceLinesRef.current.forEach(pl => {
        try {
          series.removePriceLine(pl);
        } catch {}
      });
      alertPriceLinesRef.current = [];
    }

    if (!alerts || alerts.length === 0) return;
    const currentTickerClean = ticker.trim().toUpperCase();
    const relevantAlerts = alerts.filter(
      a => a.ticker.trim().toUpperCase() === currentTickerClean && a.active
    );

    relevantAlerts.forEach(alert => {
      try {
        const isAbove = alert.condition === 'ABOVE';
        const isTriggered = alert.triggered;

        const lineColor = isTriggered
          ? '#9ca3af'
          : isAbove
          ? '#10b981'
          : '#f43f5e';

        const symbolCondition = isAbove ? '≥' : '≤';
        const titleText = isTriggered
          ? `🔔 ESEGUITO ${symbolCondition} ${alert.targetPrice}`
          : `🔔 ALERT ${symbolCondition} ${alert.targetPrice}`;

        const priceLine = series.createPriceLine({
          price: alert.targetPrice,
          color: lineColor,
          lineWidth: 2,
          lineStyle: isTriggered ? LineStyle.Dotted : LineStyle.Dashed,
          axisLabelVisible: true,
          title: titleText
        });

        alertPriceLinesRef.current.push(priceLine);
      } catch (err) {
        console.warn('Errore creazione price line per allarme:', err);
      }
    });

    return () => {
      if (alertPriceLinesRef.current.length > 0 && primarySeriesRef.current) {
        alertPriceLinesRef.current.forEach(pl => {
          try {
            primarySeriesRef.current?.removePriceLine(pl);
          } catch {}
        });
        alertPriceLinesRef.current = [];
      }
    };
  }, [alerts, ticker, seriesInstance]);

  const handleAddOverlay = (newOverlay: OverlayConfig) => {
    const updated = [...overlays, newOverlay];
    onOverlaysChange(updated);
  };

  const handleUpdateOverlay = (updatedOverlay: OverlayConfig) => {
    const updated = overlays.map(o => (o.id === updatedOverlay.id ? updatedOverlay : o));
    onOverlaysChange(updated);
  };

  const handleRemoveOverlay = (id: string) => {
    const updated = overlays.filter(o => o.id !== id);
    onOverlaysChange(updated);
    if (overlaySeriesMap.current[id] && mainChartRef.current) {
      try {
        mainChartRef.current.removeSeries(overlaySeriesMap.current[id]);
      } catch {}
      delete overlaySeriesMap.current[id];
    }
  };

  const handleToggleOverlayVisibility = (id: string) => {
    const updated = overlays.map(o => (o.id === id ? { ...o, visible: !o.visible } : o));
    onOverlaysChange(updated);
  };

  const handleSplitterMouseDown = (e: React.MouseEvent) => {
    isResizingRef.current = true;
    startYRef.current = e.clientY;
    const wrapper = chartContainerRef.current?.parentElement;
    startHeightRef.current = wrapper ? wrapper.clientHeight : 400;
    document.body.style.cursor = 'row-resize';
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return;
      const dy = e.clientY - startYRef.current;
      const newHeight = Math.max(startHeightRef.current + dy, 180);
      setMainHeight(newHeight);
      if (mainChartRef.current && chartContainerRef.current) {
        mainChartRef.current.applyOptions({
          height: newHeight
        });
      }
    };

    const handleMouseUp = () => {
      if (isResizingRef.current) {
        isResizingRef.current = false;
        document.body.style.cursor = 'default';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return (
    <div className="flex-1 flex overflow-hidden relative w-full h-full">
      <DrawingToolbar
        currentTool={currentTool}
        onSelectTool={setCurrentTool}
        isCrosshairActive={isCrosshairActive}
        onToggleCrosshair={() => setIsCrosshairActive(!isCrosshairActive)}
        onUndo={() => {
          if (drawings.length > 0) {
            const next = drawings.slice(0, -1);
            handleDrawingsChange(next);
          }
        }}
        onClearAll={() => handleDrawingsChange([])}
        onOpenOverlays={onOpenOverlayModal}
        activeOverlaysCount={overlays.filter(o => o.visible).length}
      />

      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <div
          style={{ height: mainHeight ? `${mainHeight}px` : undefined }}
          className={`${mainHeight ? '' : 'flex-1'} min-h-[280px] w-full relative overflow-hidden`}
        >
          <div ref={chartContainerRef} className="w-full h-full absolute inset-0" />

          <ChartOverlayLegend
            overlays={overlays}
            correlationStats={correlationStats}
            onToggleVisibility={handleToggleOverlayVisibility}
            onRemoveOverlay={handleRemoveOverlay}
            onOpenModal={onOpenOverlayModal}
          />

          {lastCandleFormatted && (
            <div className="absolute top-2 right-3 z-30 flex flex-col items-end gap-1 pointer-events-auto select-none">
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-[var(--bg-card)]/95 backdrop-blur-md border border-[var(--border-color)] shadow-md text-[11px] font-mono text-[var(--text-main)]">
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Ultima Candela:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                    {lastCandleFormatted.timeExact}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)]">
                    ({lastCandleFormatted.date})
                  </span>
                </div>

                <div className="h-3 w-px bg-[var(--border-color)]" />

                <div className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                  <span>Ora Locale:</span>
                  <span className="font-semibold text-[var(--text-main)]">
                    {currentTime.toLocaleTimeString('it-IT', { timeZone: chartTimezone, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                  </span>
                </div>

                <div className="h-3 w-px bg-[var(--border-color)]" />

                {/* Backtest Button */}
                <button
                  onClick={onOpenBacktest ? onOpenBacktest : () => setInternalBacktestOpen(true)}
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-linear-to-r from-blue-600/15 to-indigo-600/15 hover:from-blue-600/25 hover:to-indigo-600/25 border border-blue-500/40 text-blue-600 dark:text-blue-400 transition cursor-pointer shadow-xs"
                  title="Laboratorio Backtesting Crossover Medie Mobili [Tasto: B]"
                >
                  <span>⚡</span>
                  <span>Backtest MA</span>
                </button>

                <div className="h-3 w-px bg-[var(--border-color)]" />

                {/* Probo AI Analysis Button */}
                <button
                  onClick={() => setIsProboModalOpen(true)}
                  className="flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-black bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white border border-blue-400/50 transition cursor-pointer shadow-sm shadow-blue-500/20"
                  title="Avvia Analisi AI Metodologia Giacomo Probo (Confluenza 5 Tecniche, Stocastico 10-6-3, Bollinger 5/1.8, Scaling Out 50%)"
                >
                  <span className="text-amber-300">📘</span>
                  <span>Analisi Probo AI</span>
                </button>

                <div className="h-3 w-px bg-[var(--border-color)]" />

                {/* Divergenze Button */}
                <button
                  onClick={() => setIsDivergenceModalOpen(true)}
                  className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold border transition cursor-pointer shadow-xs ${
                    activeDivergence
                      ? activeDivergence.type === 'BEARISH_DIVERGENCE'
                        ? 'bg-rose-500/20 border-rose-500 text-rose-600 dark:text-rose-400'
                        : 'bg-emerald-500/20 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                      : 'bg-[var(--bg-main)] border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                  title="Analisi Divergenze Prezzo vs Sentiment AI"
                >
                  <span>🔍</span>
                  <span>{activeDivergence ? (activeDivergence.type === 'BEARISH_DIVERGENCE' ? 'Div. Bearish!' : 'Div. Bullish!') : 'Divergenze'}</span>
                </button>

                <div className="h-3 w-px bg-[var(--border-color)]" />

                {/* Toggle Overlay Sentiment AI */}
                <button
                  onClick={() => {
                    if (onUpdateIndicatorConfig) {
                      onUpdateIndicatorConfig({
                        ...indicatorConfig,
                        sentimentOverlayEnabled: !indicatorConfig.sentimentOverlayEnabled
                      });
                    }
                  }}
                  className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold border transition-all cursor-pointer shadow-xs ${
                    indicatorConfig.sentimentOverlayEnabled
                      ? 'bg-purple-600/20 border-purple-500/60 text-purple-600 dark:text-purple-300 ring-1 ring-purple-500/40'
                      : 'bg-[var(--bg-main)] border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                  title="Attiva/Disattiva Overlay Sentiment AI a barre sullo sfondo del grafico"
                >
                  <span>🧠</span>
                  <span>{indicatorConfig.sentimentOverlayEnabled ? 'AI Sentiment ON' : 'AI Sentiment'}</span>
                </button>

                <div className="h-3 w-px bg-[var(--border-color)]" />

                {/* SMC Market Structure Auto */}
                <button
                  onClick={() => {
                    if (onUpdateIndicatorConfig) {
                      onUpdateIndicatorConfig({
                        ...indicatorConfig,
                        smcEnabled: !indicatorConfig.smcEnabled
                      });
                    }
                  }}
                  className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold border transition-all cursor-pointer shadow-xs ${
                    indicatorConfig.smcEnabled
                      ? 'bg-blue-600/20 border-blue-500/60 text-blue-600 dark:text-blue-300 ring-1 ring-blue-500/40'
                      : 'bg-[var(--bg-main)] border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                  title="Attiva/Disattiva Smart Money Concepts (BOS, CHoCH, Fair Value Gaps, Order Blocks, Liquidity Sweeps)"
                >
                  <span>🏛️</span>
                  <span>{indicatorConfig.smcEnabled ? 'SMC Structure ON' : 'SMC Structure'}</span>
                </button>

                <div className="h-3 w-px bg-[var(--border-color)]" />

                {/* MTF Confluence Hub Button */}
                <button
                  onClick={() => setIsMtfHubOpen(!isMtfHubOpen)}
                  className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold border transition-all cursor-pointer shadow-xs ${
                    isMtfHubOpen
                      ? 'bg-indigo-600/20 border-indigo-500/60 text-indigo-600 dark:text-indigo-300 ring-1 ring-indigo-500/40'
                      : 'bg-[var(--bg-main)] border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                  title="Visualizza Matrice di Confluenza a 4 Timeframe (Daily, 4h, 1h, 15m)"
                >
                  <span>🌐</span>
                  <span>{isMtfHubOpen ? 'MTF Hub ON' : 'MTF Confluence'}</span>
                </button>

                <div className="h-3 w-px bg-[var(--border-color)]" />

                {/* Toggle Zero Delay */}
                <button
                  onClick={handleToggleZeroDelay}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border transition-all cursor-pointer ${
                    zeroDelayMode
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25'
                      : 'bg-[var(--bg-main)] border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                  title={
                    zeroDelayMode
                      ? `Zero Delay ATTIVO: I dati sono sincronizzati all'orologio attuale (differita di ${originalLagMinutes}m compensata). Clicca per disattivare.`
                      : `Zero Delay DISATTIVATO: Mostra timestamp feed borsa con ~${originalLagMinutes}m di differita. Clicca per sincronizzare in tempo reale.`
                  }
                >
                  <span>⚡</span>
                  <span>{zeroDelayMode ? 'Zero Delay ON' : `Differita ${originalLagMinutes}m`}</span>
                </button>

                <div className="h-3 w-px bg-[var(--border-color)]" />

                <div className="relative">
                  <button
                    onClick={() => setShowTzMenu(!showTzMenu)}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--bg-main)] hover:bg-blue-500/10 hover:text-blue-500 border border-[var(--border-color)] transition-colors cursor-pointer"
                    title="Cambia Fuso Orario Grafico"
                  >
                    <span>🌐</span>
                    <span>{chartTimezone === 'Europe/Rome' ? 'Roma (UTC+2)' : chartTimezone === 'UTC' ? 'UTC' : chartTimezone.split('/')[1] || chartTimezone}</span>
                    <span className="text-[8px]">▼</span>
                  </button>

                  {showTzMenu && (
                    <div className="absolute right-0 top-full mt-1 w-48 py-1 rounded-md bg-[var(--bg-card)] border border-[var(--border-color)] shadow-xl z-50 text-[11px]">
                      <div className="px-2 py-1 text-[9px] uppercase font-bold text-[var(--text-muted)] border-b border-[var(--border-color)]">
                        Fuso Orario Grafico
                      </div>
                      {[
                        { id: 'Europe/Rome', label: 'Roma / Italia (UTC+2)', flag: '🇮🇹' },
                        { id: 'UTC', label: 'UTC (Tempo Universale)', flag: '🌐' },
                        { id: 'America/New_York', label: 'New York / US (UTC-4)', flag: '🇺🇸' },
                        { id: 'Europe/London', label: 'Londra / UK (UTC+1)', flag: '🇬🇧' },
                        { id: 'Asia/Tokyo', label: 'Tokyo / JP (UTC+9)', flag: '🇯🇵' }
                      ].map(tz => (
                        <button
                          key={tz.id}
                          onClick={() => {
                            setChartTimezone(tz.id);
                            setShowTzMenu(false);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 flex items-center justify-between hover:bg-blue-600 hover:text-white transition-colors cursor-pointer ${
                            chartTimezone === tz.id ? 'font-bold text-blue-500 dark:text-blue-400 bg-blue-500/10' : 'text-[var(--text-main)]'
                          }`}
                        >
                          <span>{tz.flag} {tz.label}</span>
                          {chartTimezone === tz.id && <span>✓</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Floating Sentiment Legend Badge */}
          {indicatorConfig.sentimentOverlayEnabled && (
            <div className="absolute top-12 left-3 z-30 flex items-center gap-2 px-2.5 py-1 rounded-md bg-[var(--bg-card)]/90 backdrop-blur-md border border-purple-500/40 shadow-lg text-[10px] font-semibold text-[var(--text-main)] pointer-events-auto select-none animate-fadeIn">
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                </span>
                <span className="font-bold text-purple-600 dark:text-purple-400">Overlay Sentiment AI Attivo</span>
              </div>
              <div className="h-3 w-px bg-[var(--border-color)]" />
              <div className="flex items-center gap-1 text-[9px] font-mono">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500/70 border border-emerald-400" title="Bullish" />
                <span>Rialzista</span>
                <span className="w-2.5 h-2.5 rounded-xs bg-rose-500/70 border border-rose-400 ml-1" title="Bearish" />
                <span>Ribassista</span>
              </div>
            </div>
          )}

          {/* Sentiment Overlay Canvas with Historical Divergences */}
          <SentimentChartOverlay
            chart={chartInstance || mainChartRef.current}
            series={seriesInstance || primarySeriesRef.current}
            enabled={!!indicatorConfig.sentimentOverlayEnabled}
            opacity={indicatorConfig.sentimentOverlayOpacity ?? 0.25}
            candles={processedCandles}
            sentimentMap={sentimentMap}
            divergencePoints={divergencePoints}
          />

          <DrawingCanvas
            chart={chartInstance || mainChartRef.current}
            series={seriesInstance || primarySeriesRef.current}
            currentTool={currentTool}
            onToolUsed={() => setCurrentTool('cursor')}
            drawColor={drawColor}
            drawWidth={drawWidth}
            isCrosshairActive={isCrosshairActive}
            theme={theme}
            drawings={drawings}
            onDrawingsChange={handleDrawingsChange}
            candles={processedCandles}
            smcEnabled={!!indicatorConfig.smcEnabled}
            smcShowBosChoch={indicatorConfig.smcShowBosChoch ?? true}
            smcShowFvg={indicatorConfig.smcShowFvg ?? true}
            smcShowOrderBlocks={indicatorConfig.smcShowOrderBlocks ?? true}
            smcShowLiquiditySweeps={indicatorConfig.smcShowLiquiditySweeps ?? true}
          />

          {/* Floating Multi-Timeframe Confluence Hub Widget */}
          {isMtfHubOpen && (
            <div className="absolute top-12 right-3 z-40">
              <MultiTimeframeHub
                ticker={ticker}
                currentInterval={interval}
                candles={processedCandles}
                onClose={() => setIsMtfHubOpen(false)}
              />
            </div>
          )}
        </div>

        {/* Resizer Splitter */}
        <div
          onMouseDown={handleSplitterMouseDown}
          className="h-1.5 bg-[var(--border-color)] hover:bg-blue-600 transition-colors cursor-row-resize z-20"
          title="Trascina su/giù per ridimensionare il grafico principale"
        />

        {/* Contenitore Oscillatori */}
        <div
          ref={oscillatorsContainerRef}
          className="flex flex-col w-full overflow-y-auto bg-[var(--bg-main)] max-h-[45vh]"
        />
      </div>

      <OverlayModal
        isOpen={isOverlayModalOpen}
        onClose={onCloseOverlayModal}
        mainTicker={ticker}
        mainInterval={interval}
        overlays={overlays}
        correlationStats={correlationStats}
        onAddOverlay={handleAddOverlay}
        onUpdateOverlay={handleUpdateOverlay}
        onRemoveOverlay={handleRemoveOverlay}
        onToggleOverlayVisibility={handleToggleOverlayVisibility}
      />

      <BacktestModal
        isOpen={isBacktestOpen || internalBacktestOpen}
        onClose={onCloseBacktest || (() => setInternalBacktestOpen(false))}
        candles={rawCandles}
        ticker={ticker}
        interval={interval}
        onSelectTrade={handleSelectTrade}
      />

      <DivergenceModal
        isOpen={isDivergenceModalOpen}
        onClose={() => setIsDivergenceModalOpen(false)}
        alert={activeDivergence}
        monitoringEnabled={divergenceMonitoring}
        onToggleMonitoring={(enabled) => {
          setDivergenceMonitoring(enabled);
          divergenceService.setMonitoringEnabled(enabled);
        }}
        sensitivity={divergenceSensitivity}
        onChangeSensitivity={(s) => {
          setDivergenceSensitivity(s);
          divergenceService.setSensitivity(s);
        }}
        onOpenChart={() => {
          setIsDivergenceModalOpen(false);
          if (mainChartRef.current) {
            mainChartRef.current.timeScale().scrollToRealTime();
          }
        }}
      />

      <ProboAnalysisModal
        isOpen={isProboModalOpen}
        onClose={() => setIsProboModalOpen(false)}
        ticker={ticker}
        timeframe={interval}
        currentPrice={rawCandles.length > 0 ? rawCandles[rawCandles.length - 1].close : 34500}
        candles={rawCandles}
        onApplyProboPreset={(config) => {
          if (onUpdateIndicatorConfig) {
            onUpdateIndicatorConfig(config);
          }
        }}
        onCaptureChartScreenshot={captureChartScreenshot}
      />
    </div>
  );
};
