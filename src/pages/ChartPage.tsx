import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CrosshairMode,
  ColorType,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  AreaSeries,
  LineStyle
} from 'lightweight-charts';
import { DrawingToolbar } from '../components/DrawingToolbar';
import { DrawingCanvas } from '../components/DrawingCanvas';
import { OverlayModal } from '../components/OverlayModal';
import { ChartOverlayLegend } from '../components/ChartOverlayLegend';
import {
  CandleData,
  DrawingItem,
  DrawingToolType,
  IndicatorConfig,
  OverlayConfig,
  OverlayCorrelationStats,
  OverlayLineStyle
} from '../types';
import { computeTechnicalIndicators } from '../services/technicalIndicators';
import { correlationOverlayService } from '../services/correlationOverlayService';
import { storageService } from '../services/storageService';

interface ChartPageProps {
  ticker: string;
  interval: string;
  chartType: 'candlestick' | 'line' | 'heikin_ashi';
  theme: 'dark' | 'light';
  indicatorConfig: IndicatorConfig;
  rawCandles: CandleData[];
  onBarHover?: (bar: { open: number; high: number; low: number; close: number }) => void;
  onMaHover?: (maValues: Record<string, number | string>) => void;
  scrollToRealTimeTrigger?: number;
  drawColor: string;
  drawWidth: number;
  overlays: OverlayConfig[];
  onOverlaysChange: (overlays: OverlayConfig[]) => void;
  isOverlayModalOpen: boolean;
  onOpenOverlayModal: () => void;
  onCloseOverlayModal: () => void;
}

export const ChartPage: React.FC<ChartPageProps> = ({
  ticker,
  interval,
  chartType,
  theme,
  indicatorConfig,
  rawCandles,
  onBarHover,
  onMaHover,
  scrollToRealTimeTrigger,
  drawColor,
  drawWidth,
  overlays,
  onOverlaysChange,
  isOverlayModalOpen,
  onOpenOverlayModal,
  onCloseOverlayModal
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const oscillatorsContainerRef = useRef<HTMLDivElement>(null);

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

  const overlaySeriesMap = useRef<Record<string, ISeriesApi<any>>>({});
  const [correlationStats, setCorrelationStats] = useState<Record<string, OverlayCorrelationStats>>({});

  const subChartsRef = useRef<Record<string, { chart: IChartApi; series: any; panel: HTMLDivElement; observer?: ResizeObserver }>>({});

  const priceLinesRef = useRef<{ rsi: any[]; stoch: any[] }>({ rsi: [], stoch: [] });

  const [currentTool, setCurrentTool] = useState<DrawingToolType>('cursor');
  const [isCrosshairActive, setIsCrosshairActive] = useState(true);
  const [drawings, setDrawings] = useState<DrawingItem[]>(() => storageService.getDrawings(ticker));

  const currentChartTypeRef = useRef<string>('');
  const hasInitialFitted = useRef<boolean>(false);
  const prevTickerRef = useRef(ticker);
  const prevIntervalRef = useRef(interval);

  const onBarHoverRef = useRef(onBarHover);
  onBarHoverRef.current = onBarHover;

  const onMaHoverRef = useRef(onMaHover);
  onMaHoverRef.current = onMaHover;

  const indicatorConfigRef = useRef(indicatorConfig);
  indicatorConfigRef.current = indicatorConfig;

  // Splitter state
  const [mainHeight, setMainHeight] = useState<number | null>(null);
  const isResizingRef = useRef(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);

  const isSyncingRange = useRef(false);

  // Sync drawings to storage per ticker
  useEffect(() => {
    setDrawings(storageService.getDrawings(ticker));
  }, [ticker]);

  // Track ticker / interval change to re-fit content on new asset load
  useEffect(() => {
    if (prevTickerRef.current !== ticker || prevIntervalRef.current !== interval) {
      prevTickerRef.current = ticker;
      prevIntervalRef.current = interval;
      hasInitialFitted.current = false;
    }
  }, [ticker, interval]);

  // Scroll to real time trigger
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
    storageService.saveDrawings(ticker, updated);
  };

  const getThemeColors = useCallback(() => {
    return theme === 'dark'
      ? { bg: '#131722', text: '#d1d4dc', grid: '#1e222d', border: '#2a2e39' }
      : { bg: '#ffffff', text: '#131722', grid: '#f0f3fa', border: '#e0e3eb' };
  }, [theme]);

  // Initialize main chart (Mounts ONCE - never destroyed on hover or data updates)
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
        minBarSpacing: 2
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

    // Guaranteed responsive resizing with ResizeObserver
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          chart.applyOptions({ width, height });
        }
      }
    });
    resizeObserver.observe(container);

    // Series overlays
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

    // Crosshair move subscription using ref callbacks
    chart.subscribeCrosshairMove(param => {
      if (!param.time || !primarySeriesRef.current) return;
      const data = param.seriesData.get(primarySeriesRef.current) as any;
      if (data && onBarHoverRef.current) {
        if (data.open !== undefined) {
          onBarHoverRef.current({
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close
          });
        } else if (data.value !== undefined) {
          onBarHoverRef.current({
            open: data.value,
            high: data.value,
            low: data.value,
            close: data.value
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
    });

    // Logical range change for synchronizing oscillator sub-charts
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
  }, []); // Mounts once and stays mounted!

  // Update timeVisible when interval changes without destroying the chart
  useEffect(() => {
    const isIntraday = ['1m', '5m', '15m', '30m', '1h', '4h'].includes(interval);
    if (mainChartRef.current) {
      mainChartRef.current.timeScale().applyOptions({ timeVisible: isIntraday });
    }
    Object.values(subChartsRef.current).forEach(({ chart }) => {
      chart.timeScale().applyOptions({ timeVisible: isIntraday });
    });
  }, [interval]);

  // Update theme colors
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
      atr: indicatorConfig.atrEnabled
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
        }

        // Bidirectional time-scale synchronization
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

        // Sync initial range from main chart if available
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
    getThemeColors
  ]);

  // Update Data and Indicators
  useEffect(() => {
    const chart = mainChartRef.current;
    if (!chart || rawCandles.length === 0) return;

    const calculated = computeTechnicalIndicators(rawCandles, indicatorConfig);

    // Primary Series switch (candlestick / line / heikin_ashi) - only recreate when type changes
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

    // Auto-fit content on initial data load so candles are fully visible and centered
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

    // Remove deleted MA series
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

    // Oscillators Data
    const sc = subChartsRef.current;
    if (sc['rsi'] && sc['rsi'].series.line) {
      sc['rsi'].series.line.applyOptions({
        color: indicatorConfig.rsiColor,
        lineWidth: indicatorConfig.rsiWidth as any
      });
      sc['rsi'].series.line.setData(calculated.oscillators.rsi as any);

      // Price lines OB/OS
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
  }, [rawCandles, indicatorConfig, chartType]);

  const getLineStyleEnum = (style: OverlayLineStyle) => {
    if (style === 'dashed') return LineStyle.Dashed;
    if (style === 'dotted') return LineStyle.Dotted;
    return LineStyle.Solid;
  };

  // Synchronize and render overlaid benchmark & secondary series
  useEffect(() => {
    const chart = mainChartRef.current;
    if (!chart || !rawCandles.length) return;

    let isMounted = true;
    const colors = getThemeColors();

    const updateOverlays = async () => {
      const newStats: Record<string, OverlayCorrelationStats> = {};
      const activeOverlayIds = new Set(overlays.filter(o => o.visible).map(o => o.id));

      // Remove any series that are no longer active/visible
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

      // Configure leftPriceScale visibility and styling
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

  // Splitter mouse handlers
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
      {/* Barra Laterale Strumenti di Disegno */}
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

      {/* Area Grafico & Oscillatori */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <div
          style={{ height: mainHeight ? `${mainHeight}px` : undefined }}
          className={`${mainHeight ? '' : 'flex-1'} min-h-[280px] w-full relative overflow-hidden`}
        >
          <div ref={chartContainerRef} className="w-full h-full absolute inset-0" />

          {/* Floating Legend & Correlazioni HUD */}
          <ChartOverlayLegend
            overlays={overlays}
            correlationStats={correlationStats}
            onToggleVisibility={handleToggleOverlayVisibility}
            onRemoveOverlay={handleRemoveOverlay}
            onOpenModal={onOpenOverlayModal}
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
          />
        </div>

        {/* Resizer Splitter */}
        <div
          onMouseDown={handleSplitterMouseDown}
          className="h-1.5 bg-[var(--border-color)] hover:bg-blue-600 transition-colors cursor-row-resize z-20"
          title="Trascina su/giù per ridimensionare il grafico principale"
        />

        {/* Contenitore Oscillatori Separati */}
        <div
          ref={oscillatorsContainerRef}
          className="flex flex-col w-full overflow-y-auto bg-[var(--bg-main)] max-h-[45vh]"
        />
      </div>

      {/* Modale Gestione Sovrapposizioni & Correlazioni */}
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
    </div>
  );
};

