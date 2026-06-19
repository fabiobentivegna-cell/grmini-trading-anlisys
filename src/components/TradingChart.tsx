import React, { useEffect, useRef, useState } from "react";
import { createChart, CandlestickSeries, HistogramSeries, LineSeries } from "lightweight-charts";
import { 
  Play, 
  Pause, 
  RefreshCw, 
  Cpu, 
  CheckSquare,
  MousePointer,
  MoveHorizontal,
  TrendingUp,
  Sliders,
  ArrowUpRight,
  ArrowDownRight,
  Trash2,
  ExternalLink,
  Settings
} from "lucide-react";
import { Instrument } from "../types";
import { getTradingViewUrl } from "../utils/tradingViewHelper";

interface TradingChartProps {
  instrument: Instrument;
  timeframe: string;
  indicators: { [key: string]: { on: boolean; period?: number } };
  isDark: boolean;
}

interface Point {
  time: number;
  price: number;
}

interface HorizontalLine {
  id: string;
  price: number;
  color: string;
  width?: number;
  style?: "solid" | "dashed" | "dotted";
}

interface Trendline {
  id: string;
  p1: Point;
  p2: Point;
  color: string;
  width?: number;
  style?: "solid" | "dashed" | "dotted";
}

interface Fibonacci {
  id: string;
  p1: Point;
  p2: Point;
  color?: string;
  width?: number;
  style?: "solid" | "dashed" | "dotted";
}

interface Position {
  id: string;
  type: "long" | "short";
  entry: Point;
  tp: number;
  sl: number;
}

interface SvgDrawings {
  horizontalLines: (HorizontalLine & { y: number })[];
  trendlines: (Trendline & { x1: number; y1: number; x2: number; y2: number })[];
  fibonaccis: (Fibonacci & {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    levels: { label: string; price: number; y: number; color: string }[];
  })[];
  positions: (Position & {
    xEntry: number;
    yEntry: number;
    yTp: number;
    ySl: number;
    xEnd: number;
    tpPct: string;
    slPct: string;
    riskReward: string;
  })[];
}

export default function TradingChart({ instrument, timeframe, indicators, isDark }: TradingChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const rsiContainerRef = useRef<HTMLDivElement>(null);
  const macdContainerRef = useRef<HTMLDivElement>(null);

  const chartInstance = useRef<any>(null);
  const rsiChartInstance = useRef<any>(null);
  const macdChartInstance = useRef<any>(null);

  const candlestickSeriesRef = useRef<any>(null);

  // AI assessment indicators
  const [aiAnalysis, setAiAnalysis] = useState<string>("");
  const [loadingAi, setLoadingAi] = useState<boolean>(false);
  const [aiType, setAiType] = useState<'strategy' | 'levels' | 'patterns'>('strategy');

  // Indicator customization settings state
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [indicatorSettings, setIndicatorSettings] = useState({
    ema: { period: 20, color: isDark ? "#00FF88" : "#00a85e" },
    ema2: { period: 50, color: isDark ? "#FF4D6A" : "#e0283e" },
    sma200: { period: 200, color: isDark ? "#FF9F43" : "#c77a00" },
    bb: { period: 20, mult: 2, basisColor: "rgba(77, 158, 255, 0.35)", bandsColor: "rgba(77, 158, 255, 0.7)" },
    rsi: { period: 14, color: "#a855f7" },
    macd: { fast: 12, slow: 26, signal: 9, macdColor: "#2563eb", signalColor: "#16a34a" }
  });

  // Keep settings synchronized with theme changes initially if not modified
  useEffect(() => {
    setIndicatorSettings(prev => ({
      ...prev,
      ema: { ...prev.ema, color: isDark ? "#00FF88" : "#00a85e" },
      ema2: { ...prev.ema2, color: isDark ? "#FF4D6A" : "#e0283e" },
      sma200: { ...prev.sma200, color: isDark ? "#FF9F43" : "#c77a00" }
    }));
  }, [isDark]);

  // Drawing tools customization settings state
  const [showDrawingStyles, setShowDrawingStyles] = useState<boolean>(false);
  const [selectedDrawing, setSelectedDrawing] = useState<{ id: string; type: "horizontal" | "trendline" | "fib" } | null>(null);
  const [drawingConfig, setDrawingConfig] = useState({
    color: "#3b82f6",
    width: 2,
    style: "solid" as "solid" | "dashed" | "dotted"
  });

  // Helper helper to update specific selected drawing values in real-time
  const updateSelectedDrawingStyle = (color: string, width: number, style: "solid" | "dashed" | "dotted") => {
    if (!selectedDrawing) return;
    setDrawings(prev => {
      const next = { ...prev };
      if (selectedDrawing.type === "horizontal") {
        next.horizontalLines = next.horizontalLines.map(hl => hl.id === selectedDrawing.id ? { ...hl, color, width, style } : hl);
      } else if (selectedDrawing.type === "trendline") {
        next.trendlines = next.trendlines.map(tl => tl.id === selectedDrawing.id ? { ...tl, color, width, style } : tl);
      } else if (selectedDrawing.type === "fib") {
        next.fibonaccis = next.fibonaccis.map(fib => fib.id === selectedDrawing.id ? { ...fib, color, width, style } : fib);
      }
      return next;
    });
  };

  // Drawing tools state
  const [activeTool, setActiveTool] = useState<"cursor" | "horizontal" | "trendline" | "fib" | "long" | "short">("cursor");
  const [activeStep, setActiveStep] = useState<{ type: "trendline" | "fib"; p1: Point } | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ time: number; price: number; x: number; y: number } | null>(null);

  // Retain custom drawings in state by ticker to survive component updates
  const [drawings, setDrawings] = useState<{
    horizontalLines: HorizontalLine[];
    trendlines: Trendline[];
    fibonaccis: Fibonacci[];
    positions: Position[];
  }>({
    horizontalLines: [],
    trendlines: [],
    fibonaccis: [],
    positions: []
  });

  // SVG translated coordinate states for pixel rendering
  const [svgCoords, setSvgCoords] = useState<SvgDrawings>({
    horizontalLines: [],
    trendlines: [],
    fibonaccis: [],
    positions: []
  });

  // Reset or initialize drawings when selecting a new active instrument symbol
  useEffect(() => {
    setDrawings({
      horizontalLines: [],
      trendlines: [],
      fibonaccis: [],
      positions: []
    });
    setActiveStep(null);
    setActiveTool("cursor");
    setAiAnalysis("");
  }, [instrument.sym]);

  // Translate Timeframe value to seconds point-interval
  const getSecondsForTimeframe = (tf: string) => {
    const t = tf.toLowerCase();
    if (t === "5m") return 300;
    if (t === "15m") return 900;
    if (t === "30m") return 1800;
    if (t === "1h") return 3600;
    if (t === "4h") return 14400;
    if (t === "1d") return 86400;
    if (t === "1w" || t === "sett.") return 604800;
    if (t === "1m" || t === "mens.") return 2592000;
    return 3600;
  };

  // Generate historical data based on instrument price and selected timeframe
  const generateChartData = (basePrice: number, points = 120) => {
    const data = [];
    const intervalSeconds = getSecondsForTimeframe(timeframe);
    const startTimestamp = Math.floor(Date.now() / 1000) - points * intervalSeconds;
    
    let currentPrice = basePrice * 0.95;
    const volatility = basePrice > 1000 ? 15 : basePrice > 100 ? 2 : basePrice > 10 ? 0.2 : 0.004;

    for (let i = 0; i < points; i++) {
      const time = startTimestamp + i * intervalSeconds;
      const open = currentPrice;
      const change = (Math.random() - 0.49) * volatility;
      const close = currentPrice + change;
      const high = Math.max(open, close) + Math.random() * (volatility * 0.5);
      const low = Math.min(open, close) - Math.random() * (volatility * 0.5);
      
      data.push({
        time,
        open,
        high,
        low,
        close,
        volume: Math.floor(Math.random() * 5000 + 500)
      });
      currentPrice = close;
    }
    return data;
  };

  // Synchronize pixel coordinate state of drawings
  const updateDrawingCoordinates = () => {
    if (!chartInstance.current || !candlestickSeriesRef.current || !chartContainerRef.current) return;
    const chart = chartInstance.current;
    const series = candlestickSeriesRef.current;
    const timeScale = chart.timeScale();
    const width = chartContainerRef.current.clientWidth || 0;

    const newCoords: SvgDrawings = {
      horizontalLines: [],
      trendlines: [],
      fibonaccis: [],
      positions: []
    };

    // Horizontal Lines translation
    drawings.horizontalLines.forEach(hl => {
      const y = series.priceToCoordinate(hl.price);
      if (y !== null && y >= 0) {
        newCoords.horizontalLines.push({ ...hl, y });
      }
    });

    // Trendlines translation
    drawings.trendlines.forEach(tl => {
      const x1 = timeScale.timeToCoordinate(tl.p1.time);
      const y1 = series.priceToCoordinate(tl.p1.price);
      const x2 = timeScale.timeToCoordinate(tl.p2.time);
      const y2 = series.priceToCoordinate(tl.p2.price);
      if (x1 !== null && y1 !== null && x2 !== null && y2 !== null) {
        newCoords.trendlines.push({ ...tl, x1, y1, x2, y2 });
      }
    });

    // Fibonacci translation
    drawings.fibonaccis.forEach(fib => {
      const x1 = timeScale.timeToCoordinate(fib.p1.time);
      const y1 = series.priceToCoordinate(fib.p1.price);
      const x2 = timeScale.timeToCoordinate(fib.p2.time);
      const y2 = series.priceToCoordinate(fib.p2.price);

      if (x1 !== null && y1 !== null && x2 !== null && y2 !== null) {
        const dy = fib.p1.price - fib.p2.price;
        const levels = [
          { lvl: 0.0, label: "0.0% (Alto)", color: "#ef4444" },
          { lvl: 0.236, label: "23.6%", color: "#f97316" },
          { lvl: 0.382, label: "38.2%", color: "#eab308" },
          { lvl: 0.5, label: "50.0%", color: "#22c55e" },
          { lvl: 0.618, label: "61.8% (Golden Line)", color: "#06b6d4" },
          { lvl: 0.786, label: "78.6%", color: "#3b82f6" },
          { lvl: 1.0, label: "100.0% (Basso)", color: "#a855f7" }
        ].map(item => {
          const val = fib.p2.price + item.lvl * dy;
          const y = series.priceToCoordinate(val);
          return {
            label: `${item.label}: €${val.toFixed(2)}`,
            price: val,
            y: y || 0,
            color: fib.color || item.color
          };
        }).filter(l => l.y !== null);

        newCoords.fibonaccis.push({ ...fib, x1, y1, x2, y2, levels });
      }
    });

    // Positions translation
    drawings.positions.forEach(pos => {
      const xEntry = timeScale.timeToCoordinate(pos.entry.time);
      const yEntry = series.priceToCoordinate(pos.entry.price);
      const yTp = series.priceToCoordinate(pos.tp);
      const ySl = series.priceToCoordinate(pos.sl);

      if (xEntry !== null && yEntry !== null && yTp !== null && ySl !== null) {
        const entryPrice = pos.entry.price;
        const tpPct = (((pos.tp - entryPrice) / entryPrice) * 100).toFixed(1) + "%";
        const slPct = (((pos.sl - entryPrice) / entryPrice) * 100).toFixed(1) + "%";

        const tpDist = Math.abs(pos.tp - entryPrice);
        const slDist = Math.abs(pos.sl - entryPrice);
        const rr = slDist > 0 ? (tpDist / slDist).toFixed(2) : "1.0";

        const xEnd = Math.min(width - 15, xEntry + 180);

        newCoords.positions.push({
          ...pos,
          xEntry,
          yEntry,
          yTp,
          ySl,
          xEnd,
          tpPct,
          slPct,
          riskReward: rr
        });
      }
    });

    setSvgCoords(newCoords);
  };

  // Re-run conversion whenever drawings or active states update
  useEffect(() => {
    updateDrawingCoordinates();
  }, [drawings, activeStep, hoverPosition, timeframe]);

  // Main compilation effect for mounting and synchronizing multiple lightweight charts
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Dispose old charts safely
    if (chartInstance.current) {
      try {
        chartInstance.current.remove();
      } catch (e) {}
      chartInstance.current = null;
    }
    if (rsiChartInstance.current) {
      try {
        rsiChartInstance.current.remove();
      } catch (e) {}
      rsiChartInstance.current = null;
    }
    if (macdChartInstance.current) {
      try {
        macdChartInstance.current.remove();
      } catch (e) {}
      macdChartInstance.current = null;
    }
    candlestickSeriesRef.current = null;

    const containerWidth = chartContainerRef.current.clientWidth;
    const containerHeight = chartContainerRef.current.clientHeight || 280;

    const themeOptions = {
      layout: {
        background: { color: isDark ? "#111318" : "#ffffff" },
        textColor: isDark ? "#9097A2" : "#4f5664",
      },
      grid: {
        vertLines: { color: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)" },
        horzLines: { color: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)" },
      },
      rightPriceScale: {
        borderColor: isDark ? "#2B2F36" : "#cfd4db",
      },
      timeScale: {
        borderColor: isDark ? "#2B2F36" : "#cfd4db",
        timeVisible: true,
      }
    };

    // 1. Create Main Price Chart
    const chart = createChart(chartContainerRef.current, {
      width: containerWidth,
      height: containerHeight,
      ...themeOptions
    }) as any;
    chartInstance.current = chart;

    // Create Candlesticks
    const candleUpColor = isDark ? "#00FF88" : "#00a85e";
    const candleDownColor = isDark ? "#FF4444" : "#df2c3e";
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: candleUpColor,
      downColor: candleDownColor,
      borderUpColor: candleUpColor,
      borderDownColor: candleDownColor,
      wickUpColor: candleUpColor,
      wickDownColor: candleDownColor,
    });
    candlestickSeriesRef.current = candlestickSeries;

    // Set mockup candle historical data
    const historyData = generateChartData(instrument.price);
    candlestickSeries.setData(historyData.map(d => ({
      time: d.time,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close
    })));

    // Create volume sub-histogram overlay inside main price chart
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "", // overlay scale
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.8, // takes only bottom 20%
        bottom: 0,
      },
    });
    volumeSeries.setData(historyData.map(d => ({
      time: d.time,
      value: d.volume,
      color: d.close >= d.open ? (isDark ? "rgba(0, 217, 126, 0.2)" : "rgba(0, 168, 94, 0.17)") : (isDark ? "rgba(255, 77, 106, 0.2)" : "rgba(224, 40, 62, 0.17)")
    })));

    // EMA Short (1)
    if (indicators.ema?.on) {
      const period = indicatorSettings.ema.period;
      const emaSeries = chart.addSeries(LineSeries, {
        color: indicatorSettings.ema.color,
        lineWidth: 1.5,
      });
      const emaValues = calculateEMA(historyData.map(d => d.close), period);
      emaSeries.setData(historyData.map((d, index) => ({ time: d.time, value: emaValues[index] })));
    }

    // EMA Mid (2)
    if (indicators.ema2?.on) {
      const period = indicatorSettings.ema2.period;
      const emaMidSeries = chart.addSeries(LineSeries, {
        color: indicatorSettings.ema2.color,
        lineWidth: 1.5,
      });
      const emaMidValues = calculateEMA(historyData.map(d => d.close), period);
      emaMidSeries.setData(historyData.map((d, index) => ({ time: d.time, value: emaMidValues[index] })));
    }

    // SMA Long (200)
    if (indicators.sma200?.on) {
      const period = indicatorSettings.sma200.period;
      const smaSeries = chart.addSeries(LineSeries, {
        color: indicatorSettings.sma200.color,
        lineWidth: 2,
      });
      const smaValues = calculateSMA(historyData.map(d => d.close), period);
      smaSeries.setData(historyData.map((d, index) => ({ time: d.time, value: smaValues[index] })));
    }

    // Bollinger Bands
    if (indicators.bb?.on) {
      const bbBasisLine = chart.addSeries(LineSeries, {
        color: indicatorSettings.bb.basisColor,
        lineWidth: 1.2,
        lineStyle: 1, // dashed style
      });
      const bbUpperLine = chart.addSeries(LineSeries, {
        color: indicatorSettings.bb.bandsColor,
        lineWidth: 1.2,
      });
      const bbLowerLine = chart.addSeries(LineSeries, {
        color: indicatorSettings.bb.bandsColor,
        lineWidth: 1.2,
      });

      const bbData = calculateBollingerBands(
        historyData.map(d => d.close), 
        indicatorSettings.bb.period, 
        indicatorSettings.bb.mult
      );
      bbBasisLine.setData(historyData.map((d, idx) => ({ time: d.time, value: bbData.basis[idx] })));
      bbUpperLine.setData(historyData.map((d, idx) => ({ time: d.time, value: bbData.upper[idx] })));
      bbLowerLine.setData(historyData.map((d, idx) => ({ time: d.time, value: bbData.lower[idx] })));
    }

    // 2. Auxiliary Chart: RSI pane
    if (indicators.rsi?.on && rsiContainerRef.current) {
      const rsiChart = createChart(rsiContainerRef.current, {
        width: containerWidth,
        height: 85,
        ...themeOptions,
        grid: {
          vertLines: { visible: false },
          horzLines: { color: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)" },
        },
        timeScale: {
          visible: false, // hide auxiliary chart horizontal scale
        }
      }) as any;
      rsiChartInstance.current = rsiChart;

      const rsiLineSeries = rsiChart.addSeries(LineSeries, {
        color: indicatorSettings.rsi.color,
        lineWidth: 1.5,
      });

      const rsiValues = calculateRSIValues(historyData.map(d => d.close), indicatorSettings.rsi.period);
      rsiLineSeries.setData(historyData.map((d, index) => ({
        time: d.time,
        value: rsiValues[index]
      })));

      // Add RSI Overbought and Oversold threshold guidelines
      rsiLineSeries.createPriceLine({
        price: 70,
        color: "rgba(239, 68, 68, 0.4)",
        lineWidth: 1,
        lineStyle: 1,
        title: "Ipercomprato (70)",
      });
      rsiLineSeries.createPriceLine({
        price: 30,
        color: "rgba(34, 197, 94, 0.4)",
        lineWidth: 1,
        lineStyle: 1,
        title: "Ipervenduto (30)",
      });
      rsiLineSeries.createPriceLine({
        price: 50,
        color: "rgba(144, 151, 162, 0.15)",
        lineWidth: 1,
        lineStyle: 1,
      });
    }

    // 3. Auxiliary Chart: MACD pane
    if (indicators.macd?.on && macdContainerRef.current) {
      const macdChart = createChart(macdContainerRef.current, {
        width: containerWidth,
        height: 85,
        ...themeOptions,
        grid: {
          vertLines: { visible: false },
          horzLines: { color: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)" },
        },
        timeScale: {
          visible: false,
        }
      }) as any;
      macdChartInstance.current = macdChart;

      const macdSeries = macdChart.addSeries(LineSeries, {
        color: indicatorSettings.macd.macdColor,
        lineWidth: 1.5,
        title: "MACD Line"
      });

      const signalSeries = macdChart.addSeries(LineSeries, {
        color: indicatorSettings.macd.signalColor,
        lineWidth: 1.2,
        title: "Segnale"
      });

      const histogramSeries = macdChart.addSeries(HistogramSeries, {
        priceFormat: { type: "price" },
        priceScaleId: ""
      });

      const macdOutputs = calculateMACDOutputs(
        historyData.map(d => d.close),
        indicatorSettings.macd.fast,
        indicatorSettings.macd.slow,
        indicatorSettings.macd.signal
      );
      
      macdSeries.setData(historyData.map((d, index) => ({
        time: d.time,
        value: macdOutputs.macd[index]
      })));

      signalSeries.setData(historyData.map((d, index) => ({
        time: d.time,
        value: macdOutputs.signal[index]
      })));

      histogramSeries.setData(historyData.map((d, index) => {
        const value = macdOutputs.macd[index] - macdOutputs.signal[index];
        return {
          time: d.time,
          value,
          color: value >= 0 ? "rgba(34, 197, 94, 0.45)" : "rgba(239, 68, 68, 0.45)"
        };
      }));
    }

    // Align and lock zooming and panning timescales across charts
    const priceScale = chart.timeScale();
    const rsiScale = rsiChartInstance.current?.timeScale();
    const macdScale = macdChartInstance.current?.timeScale();

    if (rsiScale) {
      priceScale.subscribeVisibleLogicalRangeChange((range: any) => {
        if (range) rsiScale.setVisibleLogicalRange(range);
      });
      rsiScale.subscribeVisibleLogicalRangeChange((range: any) => {
        if (range) priceScale.setVisibleLogicalRange(range);
      });
    }

    if (macdScale) {
      priceScale.subscribeVisibleLogicalRangeChange((range: any) => {
        if (range) macdScale.setVisibleLogicalRange(range);
      });
      macdScale.subscribeVisibleLogicalRangeChange((range: any) => {
        if (range) priceScale.setVisibleLogicalRange(range);
      });
    }

    // Subscribe to pan/zoom events to re-align SVG drawings overlay
    priceScale.subscribeVisibleLogicalRangeChange(() => {
      updateDrawingCoordinates();
    });
    priceScale.subscribeVisibleTimeRangeChange(() => {
      updateDrawingCoordinates();
    });

    // Subscribe crosshair move to capture hover position for pre-clicks or drawings helper
    chart.subscribeCrosshairMove((param: any) => {
      if (!param.point || !param.time || !candlestickSeriesRef.current) {
        setHoverPosition(null);
        return;
      }
      const price = candlestickSeriesRef.current.coordinateToPrice(param.point.y);
      if (price) {
        setHoverPosition({ time: param.time as number, price, x: param.point.x, y: param.point.y });
      }
    });

    // Handle clicks for active drawing steps on price candle chart
    chart.subscribeClick((param: any) => {
      if (activeTool === "cursor") return;
      if (!param.point || !param.time || !candlestickSeries) return;

      const price = candlestickSeries.coordinateToPrice(param.point.y);
      if (!price) return;

      const clickedPoint = { time: param.time as number, price };

      if (activeTool === "horizontal") {
        setDrawings(prev => ({
          ...prev,
          horizontalLines: [...prev.horizontalLines, {
            id: Math.random().toString(),
            price,
            color: drawingConfig.color,
            width: drawingConfig.width,
            style: drawingConfig.style
          }]
        }));
        setActiveTool("cursor");
      } else if (activeTool === "trendline") {
        if (!activeStep) {
          setActiveStep({ type: "trendline", p1: clickedPoint });
        } else {
          setDrawings(prev => ({
            ...prev,
            trendlines: [...prev.trendlines, {
              id: Math.random().toString(),
              p1: activeStep.p1,
              p2: clickedPoint,
              color: drawingConfig.color,
              width: drawingConfig.width,
              style: drawingConfig.style
            }]
          }));
          setActiveStep(null);
          setActiveTool("cursor");
        }
      } else if (activeTool === "fib") {
        if (!activeStep) {
          setActiveStep({ type: "fib", p1: clickedPoint });
        } else {
          setDrawings(prev => ({
            ...prev,
            fibonaccis: [...prev.fibonaccis, {
              id: Math.random().toString(),
              p1: activeStep.p1,
              p2: clickedPoint,
              color: drawingConfig.color,
              width: drawingConfig.width,
              style: drawingConfig.style
            }]
          }));
          setActiveStep(null);
          setActiveTool("cursor");
        }
      } else if (activeTool === "long") {
        setDrawings(prev => ({
          ...prev,
          positions: [...prev.positions, {
            id: Math.random().toString(),
            type: "long",
            entry: clickedPoint,
            tp: price * 1.08, // Default 8% take profit
            sl: price * 0.96  // Default 4% stop loss
          }]
        }));
        setActiveTool("cursor");
      } else if (activeTool === "short") {
        setDrawings(prev => ({
          ...prev,
          positions: [...prev.positions, {
            id: Math.random().toString(),
            type: "short",
            entry: clickedPoint,
            tp: price * 0.92, // Default 8% take profit
            sl: price * 1.04  // Default 4% stop loss
          }]
        }));
        setActiveTool("cursor");
      }
    });

    // Simulative live market updates stream
    let localPrice = instrument.price;
    let intervalId = setInterval(() => {
      if (!candlestickSeriesRef.current || historyData.length === 0) return;
      const lastTick = historyData[historyData.length - 1];
      
      // Calculate micro-tick price variation depending on market volatility
      const isForex = instrument.market === "forex";
      const isCrypto = instrument.market === "crypto";
      const isCommodities = instrument.market === "commodities";
      
      const wave = (Math.random() - 0.495) * (isCrypto ? 0.0015 : isForex ? 0.00015 : isCommodities ? 0.0004 : 0.0005);
      localPrice = localPrice * (1 + wave);
      localPrice = +(localPrice.toFixed(isForex ? 4 : 2));

      lastTick.close = localPrice;
      lastTick.high = Math.max(lastTick.high, localPrice);
      lastTick.low = Math.min(lastTick.low, localPrice);

      candlestickSeriesRef.current.update({
        time: lastTick.time,
        open: lastTick.open,
        high: lastTick.high,
        low: lastTick.low,
        close: lastTick.close
      });
    }, 1000);

    // Coordinate translation triggers on resize
    const handleResize = () => {
      if (chartInstance.current && chartContainerRef.current) {
        const width = chartContainerRef.current.clientWidth;
        chartInstance.current.resize(width, containerHeight);
        if (rsiChartInstance.current && rsiContainerRef.current) {
          rsiChartInstance.current.resize(width, 85);
        }
        if (macdChartInstance.current && macdContainerRef.current) {
          macdChartInstance.current.resize(width, 85);
        }
        updateDrawingCoordinates();
      }
    };

    window.addEventListener("resize", handleResize);
    // Force coordinates alignment once fully loaded
    const timeoutId = setTimeout(() => {
      updateDrawingCoordinates();
    }, 120);

    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
      window.removeEventListener("resize", handleResize);
      if (chartInstance.current) {
        try {
          chartInstance.current.remove();
        } catch (e) {}
        chartInstance.current = null;
      }
      if (rsiChartInstance.current) {
        try {
          rsiChartInstance.current.remove();
        } catch (e) {}
        rsiChartInstance.current = null;
      }
      if (macdChartInstance.current) {
        try {
          macdChartInstance.current.remove();
        } catch (e) {}
        macdChartInstance.current = null;
      }
      candlestickSeriesRef.current = null;
    };
  }, [instrument, indicators, isDark, timeframe, activeTool, indicatorSettings]);

  // Indicator math helpers
  const calculateEMA = (values: number[], period: number) => {
    const k = 2 / (period + 1);
    let ema = values[0];
    const data = [ema];
    for (let i = 1; i < values.length; i++) {
      ema = values[i] * k + ema * (1 - k);
      data.push(ema);
    }
    return data;
  };

  const calculateSMA = (values: number[], period: number) => {
    const data = [];
    for (let i = 0; i < values.length; i++) {
      if (i < period - 1) {
        data.push(values[i]);
        continue;
      }
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += values[i - j];
      }
      data.push(sum / period);
    }
    return data;
  };

  const calculateBollingerBands = (values: number[], period: number, multiplier: number) => {
    const basis = [];
    const upper = [];
    const lower = [];

    for (let i = 0; i < values.length; i++) {
      if (i < period - 1) {
        basis.push(values[i]);
        upper.push(values[i]);
        lower.push(values[i]);
        continue;
      }
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += values[i - j];
      }
      const mean = sum / period;

      let varSum = 0;
      for (let j = 0; j < period; j++) {
        varSum += Math.pow(values[i - j] - mean, 2);
      }
      const stdDev = Math.sqrt(varSum / period);

      basis.push(mean);
      upper.push(mean + multiplier * stdDev);
      lower.push(mean - multiplier * stdDev);
    }
    return { basis, upper, lower };
  };

  const calculateRSIValues = (values: number[], period: number = 14) => {
    const rsi = [];
    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i++) {
      const diff = values[i] - values[i - 1];
      if (diff > 0) gains += diff;
      else losses -= diff;
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;
    
    for (let i = 0; i < period; i++) {
      rsi.push(50);
    }

    for (let i = period; i < values.length; i++) {
      const diff = values[i] - values[i - 1];
      const gain = diff > 0 ? diff : 0;
      const loss = diff < 0 ? -diff : 0;

      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;

      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      const r_val = avgLoss === 0 ? 100 : 100 - (100 / (1 + rs));
      rsi.push(r_val);
    }
    return rsi;
  };

  const calculateMACDOutputs = (values: number[], fast: number = 12, slow: number = 26, signalPeriod: number = 9) => {
    const emaFast = calculateEMA(values, fast);
    const emaSlow = calculateEMA(values, slow);
    const macd = values.map((v, i) => emaFast[i] - emaSlow[i]);
    const signal = calculateEMA(macd, signalPeriod);
    return { macd, signal };
  };

  // Perform Gemini AI Analysis
  const requestAiAnalysis = async (targetType?: 'strategy' | 'levels' | 'patterns') => {
    const activeType = targetType || aiType;
    setAiType(activeType);
    setLoadingAi(true);
    setAiAnalysis("");
    try {
      const activeInds = Object.keys(indicators)
        .filter(k => indicators[k].on)
        .map(k => k.toUpperCase());

      const res = await fetch("/api/ai-technical", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sym: instrument.sym,
          name: instrument.name,
          market: instrument.market,
          price: instrument.price,
          chgPct: instrument.chgPct,
          timeframe: timeframe,
          indicators: activeInds,
          analysisType: activeType
        })
      });
      const data = await res.json();
      setAiAnalysis(data.analysis || "Nessuna analisi ricevuta.");
    } catch (e) {
      setAiAnalysis("Siamo spiacenti, si è verificato un errore durante la consultazione del modello AI di TradeDESK.");
    } finally {
      setLoadingAi(false);
    }
  };

  // Preset tools definitions
  const drawingTools = [
    { key: "cursor" as const, label: "Cursore", icon: MousePointer, desc: "Seleziona ed esamina gli elementi" },
    { key: "horizontal" as const, label: "Linea Orizzontale", icon: MoveHorizontal, desc: "Clicca sul grafico per inserire una linea ed etichetta di prezzo" },
    { key: "trendline" as const, label: "Trendline Direzionale", icon: TrendingUp, desc: "Fai click sul punto di partenza e trascina fino al punto finale" },
    { key: "fib" as const, label: "Ritracciamento Fibonacci", icon: Sliders, desc: "Fai click su due estremi (Massimo/Minimo) per tracciare i rapporti aurei" },
    { key: "long" as const, label: "Posizione Long", icon: ArrowUpRight, desc: "Clicca per simulare operazione d'acquisto con target (verde) e stop loss (rosso)" },
    { key: "short" as const, label: "Posizione Short", icon: ArrowDownRight, desc: "Clicca per simulare operazione allo scoperto/vendita con target e stop loss" }
  ];

  return (
    <div className="flex flex-col h-full bg-[var(--bg3)] rounded border border-[var(--border)] p-2">
      
      {/* Dynamic Sub-toolbar next to Chart Layout */}
      <div className="flex flex-col md:flex-row gap-2 relative">
        
        {/* TradingView-style Left Drawing Toolbar */}
        <div className="flex flex-row md:flex-col gap-1 bg-[var(--bg2)] p-1.5 rounded border border-[var(--border)] justify-center md:justify-start items-center">
          {drawingTools.map((tool) => {
            const Icon = tool.icon;
            const isSelected = activeTool === tool.key;
            return (
              <button
                key={tool.key}
                onClick={() => {
                  setActiveTool(tool.key);
                  setActiveStep(null);
                }}
                className={`p-2 rounded transition-all hover:scale-105 relative group ${
                  isSelected 
                    ? "bg-[var(--green)] text-black font-extrabold shadow" 
                    : "text-[var(--text2)] hover:bg-[var(--bg3)] hover:text-white"
                }`}
                title={tool.desc}
              >
                <Icon className="w-3.5 h-3.5" />
                
                {/* Active multi-click step notification badge */}
                {activeStep && activeStep.type === tool.key && (
                  <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping" />
                )}

                {/* Left hover tooltip */}
                <span className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-[#090a0f] text-white text-[8px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition duration-150 pointer-events-none whitespace-nowrap z-50 shadow border border-white/5">
                  {tool.label}
                </span>
              </button>
            );
          })}

          <div className="md:h-px md:w-full w-px h-6 bg-[var(--border)] my-1 md:my-1.5" />

          {/* Wipe out all drawings */}
          <button
            onClick={() => {
              setDrawings({ horizontalLines: [], trendlines: [], fibonaccis: [], positions: [] });
              setSelectedDrawing(null);
              setActiveStep(null);
              setActiveTool("cursor");
            }}
            className="p-2 rounded transition-all hover:scale-105 text-[var(--red)] hover:bg-[var(--red)]/10"
            title="Svuota tutti i disegni dal grafico attuale"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          {/* Style customizable config button */}
          <button
            onClick={() => {
              setShowDrawingStyles(!showDrawingStyles);
              setShowSettings(false);
            }}
            className={`p-2 rounded transition-all hover:scale-105 relative border ${
              showDrawingStyles 
                ? "bg-amber-500/15 border-amber-500/35 text-amber-500" 
                : "border-transparent text-[var(--text2)] hover:bg-[var(--bg3)] hover:text-white"
            }`}
            title="Scegli Colori/Spessori Disegno o Elimina Selezionato"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>

          {/* Indicators configure button */}
          <button
            onClick={() => {
              setShowSettings(!showSettings);
              setShowDrawingStyles(false);
            }}
            className={`p-2 rounded transition-all hover:scale-105 relative border ${
              showSettings 
                ? "bg-[var(--green)]/15 border-[var(--green)]/35 text-[var(--green)]" 
                : "border-transparent text-[var(--text2)] hover:bg-[var(--bg3)] hover:text-white"
            }`}
            title="Personalizza Parametri Indicatori e Oscillatori"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* --- Style Overlays Popovers with absolute floating layout --- */}
        {showDrawingStyles && (
          <div className="absolute left-14 top-1 z-[99] bg-[var(--bg2)]/95 border border-[var(--border)] p-3 rounded-lg shadow-xl w-56 text-xs text-[var(--text1)] backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-1 mb-2">
              <span className="font-extrabold uppercase tracking-wider text-amber-500">🎨 Stile Disegni</span>
              <button onClick={() => setShowDrawingStyles(false)} className="text-[var(--text3)] hover:text-white font-bold font-mono">X</button>
            </div>

            {selectedDrawing ? (
              <div className="mb-2.5 p-1.5 bg-amber-500/10 border border-amber-500/20 rounded text-[9px] text-amber-400 font-mono text-center flex items-center justify-between">
                <span>Disegno selezionato</span>
                <button 
                  onClick={() => {
                    const id = selectedDrawing.id;
                    setDrawings(prev => ({
                      horizontalLines: prev.horizontalLines.filter(h => h.id !== id),
                      trendlines: prev.trendlines.filter(t => t.id !== id),
                      fibonaccis: prev.fibonaccis.filter(f => f.id !== id),
                      positions: prev.positions.filter(p => p.id !== id),
                    }));
                    setSelectedDrawing(null);
                  }}
                  className="underline text-[var(--red)] font-black hover:text-red-400 ml-1"
                >
                  Rimuovi
                </button>
              </div>
            ) : (
              <div className="mb-2 text-[10px] text-[var(--text3)] text-center leading-normal">
                Clicca su un disegno nel grafico con il <strong className="text-white font-bold">Cursore</strong> per selezionarlo e modificarlo.
              </div>
            )}

            <div className="flex flex-col gap-2">
              <div>
                <span className="text-[9px] text-[var(--text3)] uppercase font-bold block mb-1">Colore Linea</span>
                <div className="flex flex-wrap gap-1 max-w-[200px]">
                  {["#3b82f6", "#22c55e", "#ef4444", "#eab308", "#a855f7", "#ffffff", "#000000"].map(c => (
                    <button
                      key={c}
                      onClick={() => {
                        setDrawingConfig(prev => {
                          const next = { ...prev, color: c };
                          updateSelectedDrawingStyle(c, next.width, next.style);
                          return next;
                        });
                      }}
                      className={`w-4 h-4 rounded-full border border-slate-700/50 transition-all ${drawingConfig.color === c ? "scale-125 ring-1 ring-amber-500" : "hover:scale-110"}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <input 
                    type="color" 
                    value={drawingConfig.color}
                    onChange={(e) => {
                      const c = e.target.value;
                      setDrawingConfig(prev => {
                        const next = { ...prev, color: c };
                        updateSelectedDrawingStyle(c, next.width, next.style);
                        return next;
                      });
                    }}
                    className="w-4 h-4 p-0 bg-transparent border-0 cursor-pointer text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-1">
                <label className="flex flex-col text-[9px] text-[var(--text3)] uppercase font-bold">
                  Spessore
                  <select
                    value={drawingConfig.width}
                    onChange={(e) => {
                      const w = parseInt(e.target.value);
                      setDrawingConfig(prev => {
                        const next = { ...prev, width: w };
                        updateSelectedDrawingStyle(next.color, w, next.style);
                        return next;
                      });
                    }}
                    className="bg-[var(--bg3)] text-[10px] font-mono rounded border border-[var(--border)] px-1 py-1 mt-0.5 text-white focus:outline-none"
                  >
                    <option value={1}>1px</option>
                    <option value={2}>2px</option>
                    <option value={3}>3px</option>
                    <option value={4}>4px</option>
                  </select>
                </label>

                <label className="flex flex-col text-[9px] text-[var(--text3)] uppercase font-bold">
                  Stile Linea
                  <select
                    value={drawingConfig.style}
                    onChange={(e) => {
                      const s = e.target.value as any;
                      setDrawingConfig(prev => {
                        const next = { ...prev, style: s };
                        updateSelectedDrawingStyle(next.color, next.width, s);
                        return next;
                      });
                    }}
                    className="bg-[var(--bg3)] text-[10px] font-mono rounded border border-[var(--border)] px-1 py-1 mt-0.5 text-white focus:outline-none"
                  >
                    <option value="solid">Continuo</option>
                    <option value="dashed">Tratteggiato</option>
                    <option value="dotted">Puntinato</option>
                  </select>
                </label>
              </div>
            </div>
          </div>
        )}

        {showSettings && (
          <div className="absolute left-14 top-1 z-[99] bg-[var(--bg2)]/95 border border-[var(--border)] p-3.5 rounded-lg shadow-xl w-72 text-xs text-[var(--text1)] backdrop-blur-md max-h-[380px] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2 mb-2.5">
              <span className="font-extrabold uppercase tracking-wider text-[var(--green)] flex items-center gap-1">⚙️ Imposta Indicatori</span>
              <button onClick={() => setShowSettings(false)} className="text-[var(--text3)] hover:text-white font-bold font-mono">X</button>
            </div>
            
            {/* EMA/SMA Settings */}
            <div className="flex flex-col gap-3 py-1">
              <div className="border-b border-[var(--border)]/40 pb-2">
                <span className="font-bold text-[var(--text2)] block mb-1.5 text-[10px] uppercase tracking-wide">EMA 1 (Breve)</span>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex flex-col text-[8.5px] text-[var(--text3)] uppercase font-bold">
                    Periodo
                    <input 
                      type="number" 
                      min={1}
                      max={500}
                      value={indicatorSettings.ema.period} 
                      onChange={(e) => {
                        const val = Math.max(1, parseInt(e.target.value) || 1);
                        setIndicatorSettings(prev => ({
                          ...prev,
                          ema: { ...prev.ema, period: val }
                        }));
                      }}
                      className="bg-[var(--bg3)] text-white border border-[var(--border)] rounded px-1.5 py-0.5 mt-0.5 font-mono text-xs focus:outline-none"
                    />
                  </label>
                  <label className="flex flex-col text-[8.5px] text-[var(--text3)] uppercase font-bold">
                    Colore
                    <input 
                      type="color" 
                      value={indicatorSettings.ema.color} 
                      onChange={(e) => {
                        const c = e.target.value;
                        setIndicatorSettings(prev => ({
                          ...prev,
                          ema: { ...prev.ema, color: c }
                        }));
                      }}
                      className="bg-transparent border-0 rounded w-full h-6 mt-0.5 cursor-pointer"
                    />
                  </label>
                </div>
              </div>

              <div className="border-b border-[var(--border)]/40 pb-2">
                <span className="font-bold text-[var(--text2)] block mb-1.5 text-[10px] uppercase tracking-wide">EMA 2 (Media)</span>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex flex-col text-[8.5px] text-[var(--text3)] uppercase font-bold">
                    Periodo
                    <input 
                      type="number" 
                      min={1}
                      max={500}
                      value={indicatorSettings.ema2.period} 
                      onChange={(e) => {
                        const val = Math.max(1, parseInt(e.target.value) || 1);
                        setIndicatorSettings(prev => ({
                          ...prev,
                          ema2: { ...prev.ema2, period: val }
                        }));
                      }}
                      className="bg-[var(--bg3)] text-white border border-[var(--border)] rounded px-1.5 py-0.5 mt-0.5 font-mono text-xs focus:outline-none"
                    />
                  </label>
                  <label className="flex flex-col text-[8.5px] text-[var(--text3)] uppercase font-bold">
                    Colore
                    <input 
                      type="color" 
                      value={indicatorSettings.ema2.color} 
                      onChange={(e) => {
                        const c = e.target.value;
                        setIndicatorSettings(prev => ({
                          ...prev,
                          ema2: { ...prev.ema2, color: c }
                        }));
                      }}
                      className="bg-transparent border-0 rounded w-full h-6 mt-0.5 cursor-pointer"
                    />
                  </label>
                </div>
              </div>

              <div className="border-b border-[var(--border)]/40 pb-2">
                <span className="font-bold text-[var(--text2)] block mb-1.5 text-[10px] uppercase tracking-wide">SMA 200 (Lunga)</span>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex flex-col text-[8.5px] text-[var(--text3)] uppercase font-bold">
                    Periodo
                    <input 
                      type="number" 
                      min={1}
                      max={1000}
                      value={indicatorSettings.sma200.period} 
                      onChange={(e) => {
                        const val = Math.max(1, parseInt(e.target.value) || 1);
                        setIndicatorSettings(prev => ({
                          ...prev,
                          sma200: { ...prev.sma200, period: val }
                        }));
                      }}
                      className="bg-[var(--bg3)] text-white border border-[var(--border)] rounded px-1.5 py-0.5 mt-0.5 font-mono text-xs focus:outline-none"
                    />
                  </label>
                  <label className="flex flex-col text-[8.5px] text-[var(--text3)] uppercase font-bold">
                    Colore
                    <input 
                      type="color" 
                      value={indicatorSettings.sma200.color} 
                      onChange={(e) => {
                        const c = e.target.value;
                        setIndicatorSettings(prev => ({
                          ...prev,
                          sma200: { ...prev.sma200, color: c }
                        }));
                      }}
                      className="bg-transparent border-0 rounded w-full h-6 mt-0.5 cursor-pointer"
                    />
                  </label>
                </div>
              </div>

              {/* Bollinger Bands Settings */}
              <div className="border-b border-[var(--border)]/40 pb-2">
                <span className="font-bold text-[var(--text2)] block mb-1.5 text-[10px] uppercase tracking-wide">Bande di Bollinger</span>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <label className="flex flex-col text-[8.5px] text-[var(--text3)] uppercase font-bold">
                    Periodo
                    <input 
                      type="number" 
                      min={1}
                      max={200}
                      value={indicatorSettings.bb.period} 
                      onChange={(e) => {
                        const val = Math.max(1, parseInt(e.target.value) || 1);
                        setIndicatorSettings(prev => ({
                          ...prev,
                          bb: { ...prev.bb, period: val }
                        }));
                      }}
                      className="bg-[var(--bg3)] text-white border border-[var(--border)] rounded px-1.5 py-0.5 mt-0.5 font-mono text-xs focus:outline-none"
                    />
                  </label>
                  <label className="flex flex-col text-[8.5px] text-[var(--text3)] uppercase font-bold">
                    Moltiplicatore
                    <input 
                      type="number" 
                      step="0.1"
                      min={0.1}
                      max={10}
                      value={indicatorSettings.bb.mult} 
                      onChange={(e) => {
                        const val = Math.max(0.1, parseFloat(e.target.value) || 1);
                        setIndicatorSettings(prev => ({
                          ...prev,
                          bb: { ...prev.bb, mult: val }
                        }));
                      }}
                      className="bg-[var(--bg3)] text-white border border-[var(--border)] rounded px-1.5 py-0.5 mt-0.5 font-mono text-xs focus:outline-none"
                    />
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex flex-col text-[8.5px] text-[var(--text3)] uppercase font-bold">
                    Base
                    <input 
                      type="color" 
                      value={indicatorSettings.bb.basisColor} 
                      onChange={(e) => {
                        const c = e.target.value;
                        setIndicatorSettings(prev => ({
                          ...prev,
                          bb: { ...prev.bb, basisColor: c }
                        }));
                      }}
                      className="bg-transparent border-0 rounded w-full h-6 mt-0.5 cursor-pointer"
                    />
                  </label>
                  <label className="flex flex-col text-[8.5px] text-[var(--text3)] uppercase font-bold">
                    Bande Esterne
                    <input 
                      type="color" 
                      value={indicatorSettings.bb.bandsColor} 
                      onChange={(e) => {
                        const c = e.target.value;
                        setIndicatorSettings(prev => ({
                          ...prev,
                          bb: { ...prev.bb, bandsColor: c }
                        }));
                      }}
                      className="bg-transparent border-0 rounded w-full h-6 mt-0.5 cursor-pointer"
                    />
                  </label>
                </div>
              </div>

              {/* RSI Settings */}
              <div className="border-b border-[var(--border)]/40 pb-2">
                <span className="font-bold text-[var(--text2)] block mb-1.5 text-[10px] uppercase tracking-wide">RSI (Oscillatore)</span>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex flex-col text-[8.5px] text-[var(--text3)] uppercase font-bold">
                    Periodo
                    <input 
                      type="number" 
                      min={1}
                      max={100}
                      value={indicatorSettings.rsi.period} 
                      onChange={(e) => {
                        const val = Math.max(1, parseInt(e.target.value) || 1);
                        setIndicatorSettings(prev => ({
                          ...prev,
                          rsi: { ...prev.rsi, period: val }
                        }));
                      }}
                      className="bg-[var(--bg3)] text-white border border-[var(--border)] rounded px-1.5 py-0.5 mt-0.5 font-mono text-xs focus:outline-none"
                    />
                  </label>
                  <label className="flex flex-col text-[8.5px] text-[var(--text3)] uppercase font-bold">
                    Colore Linea
                    <input 
                      type="color" 
                      value={indicatorSettings.rsi.color} 
                      onChange={(e) => {
                        const c = e.target.value;
                        setIndicatorSettings(prev => ({
                          ...prev,
                          rsi: { ...prev.rsi, color: c }
                        }));
                      }}
                      className="bg-transparent border-0 rounded w-full h-6 mt-0.5 cursor-pointer"
                    />
                  </label>
                </div>
              </div>

              {/* MACD Settings */}
              <div>
                <span className="font-bold text-[var(--text2)] block mb-1.5 text-[10px] uppercase tracking-wide">MACD (Momento)</span>
                <div className="grid grid-cols-3 gap-1.5 mb-2">
                  <label className="flex flex-col text-[7.5px] text-[var(--text3)] uppercase font-bold">
                    Rapido
                    <input 
                      type="number" 
                      min={1}
                      max={100}
                      value={indicatorSettings.macd.fast} 
                      onChange={(e) => {
                        const val = Math.max(1, parseInt(e.target.value) || 1);
                        setIndicatorSettings(prev => ({
                          ...prev,
                          macd: { ...prev.macd, fast: val }
                        }));
                      }}
                      className="bg-[var(--bg3)] text-[10px] text-white border border-[var(--border)] rounded px-1 py-0.5 mt-0.5 font-mono focus:outline-none"
                    />
                  </label>
                  <label className="flex flex-col text-[7.5px] text-[var(--text3)] uppercase font-bold">
                    Lento
                    <input 
                      type="number" 
                      min={1}
                      max={200}
                      value={indicatorSettings.macd.slow} 
                      onChange={(e) => {
                        const val = Math.max(1, parseInt(e.target.value) || 1);
                        setIndicatorSettings(prev => ({
                          ...prev,
                          macd: { ...prev.macd, slow: val }
                        }));
                      }}
                      className="bg-[var(--bg3)] text-[10px] text-white border border-[var(--border)] rounded px-1 py-0.5 mt-0.5 font-mono focus:outline-none"
                    />
                  </label>
                  <label className="flex flex-col text-[7.5px] text-[var(--text3)] uppercase font-bold">
                    Segnale
                    <input 
                      type="number" 
                      min={1}
                      max={100}
                      value={indicatorSettings.macd.signal} 
                      onChange={(e) => {
                        const val = Math.max(1, parseInt(e.target.value) || 1);
                        setIndicatorSettings(prev => ({
                          ...prev,
                          macd: { ...prev.macd, signal: val }
                        }));
                      }}
                      className="bg-[var(--bg3)] text-[10px] text-white border border-[var(--border)] rounded px-1 py-0.5 mt-0.5 font-mono focus:outline-none"
                    />
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex flex-col text-[8.5px] text-[var(--text3)] uppercase font-bold">
                    Colore MACD
                    <input 
                      type="color" 
                      value={indicatorSettings.macd.macdColor} 
                      onChange={(e) => {
                        const c = e.target.value;
                        setIndicatorSettings(prev => ({
                          ...prev,
                          macd: { ...prev.macd, macdColor: c }
                        }));
                      }}
                      className="bg-transparent border-0 rounded w-full h-6 mt-0.5 cursor-pointer"
                    />
                  </label>
                  <label className="flex flex-col text-[8.5px] text-[var(--text3)] uppercase font-bold">
                    Colore Segnale
                    <input 
                      type="color" 
                      value={indicatorSettings.macd.signalColor} 
                      onChange={(e) => {
                        const c = e.target.value;
                        setIndicatorSettings(prev => ({
                          ...prev,
                          macd: { ...prev.macd, signalColor: c }
                        }));
                      }}
                      className="bg-transparent border-0 rounded w-full h-6 mt-0.5 cursor-pointer"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Core Screen Pane */}
        <div className="flex-1 flex flex-col gap-2 relative min-w-0">
          
          {/* Active Tool Step Guidance Box */}
          {activeTool !== "cursor" && (
            <div className="absolute top-2 left-2 z-40 bg-[var(--bg2)]/95 border border-amber-500/35 text-amber-400 px-2.5 py-1 rounded text-[9px] font-mono flex items-center gap-1.5 animate-pulse shadow-md">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              {activeTool === "horizontal" && "Clicca sul grafico per posizionare la linea orizzontale di prezzo."}
              {activeTool === "trendline" && (!activeStep ? "Fai click per posizionare il punto START della trendline." : "Muovi il cursore e fai click per posizionare il punto END.")}
              {activeTool === "fib" && (!activeStep ? "Fai click per posizionare l'ESTREMO 1." : "Muovi il cursore e fai click per definire l'ESTREMO 2.")}
              {activeTool === "long" && "Fai click per posizionare il setup d'acquisto (Long)."}
              {activeTool === "short" && "Fai click per posizionare il setup di vendita (Short)."}
            </div>
          )}

          {/* Primary Candlestick Chart Area wrapper */}
          <div ref={chartContainerRef} className="w-full h-[280px] relative z-10 rounded overflow-hidden">
            
            {/* SVG drawing overlays mapped perfectly on top of chart container dimensions */}
            <svg 
              className="absolute inset-0 w-full h-full pointer-events-none select-none z-20"
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
            >
              {/* Dynamic Step cursor tracker dashed guidelines */}
              {activeStep && hoverPosition && (
                <line
                  x1={chartInstance.current?.timeScale().timeToCoordinate(activeStep.p1.time) || 0}
                  y1={candlestickSeriesRef.current?.priceToCoordinate(activeStep.p1.price) || 0}
                  x2={hoverPosition.x}
                  y2={hoverPosition.y}
                  stroke="#fbbf24"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
              )}

              {/* Render Horizontal Lines */}
              {svgCoords.horizontalLines.map((hl) => {
                const isSelected = selectedDrawing?.id === hl.id;
                return (
                  <g key={hl.id} style={{ pointerEvents: 'auto' }}>
                    <line
                      x1={0}
                      x2="100%"
                      y1={hl.y}
                      y2={hl.y}
                      stroke={isSelected ? "#f59e0b" : hl.color}
                      strokeWidth={isSelected ? (hl.width || 1.5) + 1.5 : (hl.width || 1.5)}
                      strokeDasharray={hl.style === "dashed" ? "5 4" : hl.style === "dotted" ? "1.5 3" : "none"}
                      className="cursor-pointer hover:stroke-amber-400 transition"
                      title="Clicca per selezionare / personalizzare questa linea"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDrawing({ id: hl.id, type: "horizontal" });
                        setDrawingConfig({
                          color: hl.color,
                          width: hl.width || 1.5,
                          style: hl.style || "solid"
                        });
                        setShowDrawingStyles(true);
                      }}
                    />
                    <rect
                      x={2}
                      y={hl.y - 14}
                      width={90}
                      height={12}
                      fill={isSelected ? "rgba(245,158,11,0.9)" : (isDark ? "rgba(17,19,24,0.85)" : "rgba(255,255,255,0.85)")}
                      rx={2}
                    />
                    <text
                      x={5}
                      y={hl.y - 5}
                      fill={isSelected ? "#000000" : (isDark ? "#38bdf8" : "#2563eb")}
                      className="text-[7.5px] font-mono font-black fill-current"
                    >
                      Orizz: €{hl.price.toFixed(2)}
                    </text>
                  </g>
                );
              })}

              {/* Render Trendlines */}
              {svgCoords.trendlines.map((tl) => {
                const isSelected = selectedDrawing?.id === tl.id;
                return (
                  <g key={tl.id} style={{ pointerEvents: 'auto' }}>
                    {/* Thick hot-zone for easy click targeting */}
                    <line
                      x1={tl.x1}
                      y1={tl.y1}
                      x2={tl.x2}
                      y2={tl.y2}
                      stroke="transparent"
                      strokeWidth={10}
                      className="cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDrawing({ id: tl.id, type: "trendline" });
                        setDrawingConfig({
                          color: tl.color,
                          width: tl.width || 2,
                          style: tl.style || "solid"
                        });
                        setShowDrawingStyles(true);
                      }}
                    />
                    <line
                      x1={tl.x1}
                      y1={tl.y1}
                      x2={tl.x2}
                      y2={tl.y2}
                      stroke={isSelected ? "#f59e0b" : tl.color}
                      strokeWidth={isSelected ? (tl.width || 2) + 1.5 : (tl.width || 2)}
                      strokeDasharray={tl.style === "dashed" ? "5 4" : tl.style === "dotted" ? "1.5 3" : "none"}
                      className="cursor-pointer hover:stroke-amber-400 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDrawing({ id: tl.id, type: "trendline" });
                        setDrawingConfig({
                          color: tl.color,
                          width: tl.width || 2,
                          style: tl.style || "solid"
                        });
                        setShowDrawingStyles(true);
                      }}
                    />
                    <circle cx={tl.x1} cy={tl.y1} r={isSelected ? 5 : 3.5} fill={isSelected ? "#f59e0b" : "#3b82f6"} />
                    <circle cx={tl.x2} cy={tl.y2} r={isSelected ? 5 : 3.5} fill={isSelected ? "#f59e0b" : "#3b82f6"} />
                  </g>
                );
              })}

              {/* Render Fibonacci Levels */}
              {svgCoords.fibonaccis.map((fib) => {
                const isSelected = selectedDrawing?.id === fib.id;
                return (
                  <g key={fib.id} style={{ pointerEvents: 'auto' }}>
                    <line
                      x1={fib.x1}
                      y1={fib.y1}
                      x2={fib.x2}
                      y2={fib.y2}
                      stroke={isSelected ? "#f59e0b" : "rgba(234, 179, 8, 0.5)"}
                      strokeWidth={isSelected ? (fib.width || 3) + 1 : (fib.width || 3)}
                      strokeDasharray={fib.style === "dashed" ? "5 4" : fib.style === "dotted" ? "1.5 3" : "none"}
                      className="cursor-pointer hover:stroke-amber-400 transition"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDrawing({ id: fib.id, type: "fib" });
                        setDrawingConfig({
                          color: fib.color || "#eab308",
                          width: fib.width || 3,
                          style: fib.style || "solid"
                        });
                        setShowDrawingStyles(true);
                      }}
                    />
                    {fib.levels.map((lvl, idx) => (
                      <g key={idx}>
                        <line
                          x1={Math.min(fib.x1, fib.x2)}
                          x2={Math.max(fib.x1, fib.x2)}
                          y1={lvl.y}
                          y2={lvl.y}
                          stroke={lvl.color}
                          strokeWidth={1.2}
                          strokeDasharray={idx === 0 || idx === 6 ? "none" : "3 2"}
                        />
                        <text
                          x={Math.max(fib.x1, fib.x2) + 4}
                          y={lvl.y + 3}
                          fill={lvl.color}
                          className="text-[7.5px] font-mono font-bold fill-current"
                        >
                          {lvl.label}
                        </text>
                      </g>
                    ))}
                  </g>
                );
              })}

              {/* Render Trades Positions (Long/Short boxes) */}
              {svgCoords.positions.map((pos) => {
                const isLong = pos.type === "long";
                const w = pos.xEnd - pos.xEntry;
                
                const tpTop = isLong ? pos.yTp : pos.yEntry;
                const tpHeight = Math.abs(pos.yTp - pos.yEntry);

                const slTop = isLong ? pos.yEntry : pos.ySl;
                const slHeight = Math.abs(pos.ySl - pos.yEntry);

                return (
                  <g key={pos.id} style={{ pointerEvents: 'auto' }}>
                    {/* Position Area clicking remover */}
                    <rect
                      x={pos.xEntry}
                      y={Math.min(pos.yTp, pos.ySl)}
                      width={w}
                      height={tpHeight + slHeight}
                      fill="transparent"
                      className="cursor-pointer hover:fill-red-500/5 transition"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDrawings(prev => ({
                          ...prev,
                          positions: prev.positions.filter(item => item.id !== pos.id)
                        }));
                      }}
                      title="Clicca per rimuovere questa posizione"
                    />

                    {/* Take Profit Zone (Green translucency) */}
                    <rect
                      x={pos.xEntry}
                      y={tpTop}
                      width={w}
                      height={tpHeight}
                      fill="rgba(0, 255, 136, 0.22)"
                      stroke="rgba(0, 255, 136, 0.5)"
                      strokeWidth={1}
                    />

                    {/* Stop Loss Zone (Red translucency) */}
                    <rect
                      x={pos.xEntry}
                      y={slTop}
                      width={w}
                      height={slHeight}
                      fill="rgba(255, 68, 68, 0.22)"
                      stroke="rgba(255, 68, 68, 0.5)"
                      strokeWidth={1}
                    />

                    {/* Mid Entry Point line */}
                    <line
                      x1={pos.xEntry}
                      x2={pos.xEnd}
                      y1={pos.yEntry}
                      y2={pos.yEntry}
                      stroke={isDark ? "#ffffff" : "#000000"}
                      strokeWidth={1.5}
                    />

                    {/* Indicators Overlays Text labels */}
                    <rect
                      x={pos.xEntry + 4}
                      y={pos.yEntry - 18}
                      width={80}
                      height={36}
                      fill={isDark ? "rgba(17,19,24,0.95)" : "rgba(255,255,255,0.95)"}
                      rx={2}
                      className="stroke-neutral-500/20"
                    />
                    <g className="text-[7.5px] font-mono font-bold fill-current" style={{ fill: isDark ? '#fff' : '#000' }}>
                      <text x={pos.xEntry + 8} y={pos.yEntry - 10} className="fill-[var(--green)]">
                        TARGET: +{pos.tpPct}
                      </text>
                      <text x={pos.xEntry + 8} y={pos.yEntry - 1} className="fill-[var(--red)]">
                        STOP: {pos.slPct}
                      </text>
                      <text x={pos.xEntry + 8} y={pos.yEntry + 8}>
                        ⚖️ ratio: {pos.riskReward}
                      </text>
                    </g>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Connected Volume / Oscillators Panel Row 1: RSI */}
          {indicators.rsi?.on && (
            <div className="flex flex-col gap-0.5">
              <span className="text-[8.5px] font-mono font-black text-purple-400 uppercase tracking-wide">
                🟣 Oscillatore RSI (14) — Bande Ipercomprato/Ipervenduto
              </span>
              <div ref={rsiContainerRef} className="w-full h-[85px] relative z-10 border border-purple-500/10 rounded overflow-hidden" />
            </div>
          )}

          {/* Connected Volume / Oscillators Panel Row 2: MACD */}
          {indicators.macd?.on && (
            <div className="flex flex-col gap-0.5">
              <span className="text-[8.5px] font-mono font-black text-blue-400 uppercase tracking-wide">
                🔵 Oscillatore MACD (12, 26, 9) — Momentum di Mercato
              </span>
              <div ref={macdContainerRef} className="w-full h-[85px] relative z-10 border border-blue-500/10 rounded overflow-hidden" />
            </div>
          )}

        </div>
      </div>

      {/* AI Advice pane */}
      <div className="mt-3 pt-3 border-t border-[var(--border)] flex flex-col gap-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border)]/40 pb-2">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[var(--green)] animate-pulse" />
            <span className="font-sans font-bold text-xs uppercase tracking-wider text-[var(--text1)]">
              Consulenza Analisi AI Grafico
            </span>
          </div>
          
          {/* Multi-Type Segmented Control */}
          <div className="flex bg-[var(--bg2)] p-0.5 rounded border border-[var(--border)] text-[9px] font-mono">
            <button
              onClick={() => requestAiAnalysis('strategy')}
              disabled={loadingAi}
              className={`px-2 py-0.5 rounded transition ${aiType === 'strategy' ? "bg-[var(--green)] text-black font-extrabold" : "text-[var(--text3)] hover:text-white"}`}
              title="Consigli Strategici, Prezzi Ingressi e Uscite"
            >
              💡 Ingressi &amp; Target
            </button>
            <button
              onClick={() => requestAiAnalysis('levels')}
              disabled={loadingAi}
              className={`px-2 py-0.5 rounded transition ${aiType === 'levels' ? "bg-[var(--green)] text-black font-extrabold" : "text-[var(--text3)] hover:text-white"}`}
              title="Mappa di Supporti, Resistenze e Pivot Point"
            >
              🎯 Livelli S/R
            </button>
            <button
              onClick={() => requestAiAnalysis('patterns')}
              disabled={loadingAi}
              className={`px-2 py-0.5 rounded transition ${aiType === 'patterns' ? "bg-[var(--green)] text-black font-extrabold" : "text-[var(--text3)] hover:text-white"}`}
              title="Pattern di Candele, Canali e Trend"
            >
              📈 Trend &amp; Pattern
            </button>
          </div>
        </div>

        {aiAnalysis ? (
          <div className="p-3 bg-[var(--bg2)] border border-[var(--border)] rounded text-[var(--text2)] text-xs font-sans leading-relaxed max-h-[160px] overflow-y-auto whitespace-pre-line scrollbar-thin shadow-inner">
            {aiAnalysis}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-4 text-center">
            <p className="text-[var(--text3)] text-[10.5px] italic mb-1.5">
              Nessuna tesi caricata per {instrument.sym}. Seleziona una specialità di analisi sopra per avviare il motore AI.
            </p>
            <button
              onClick={() => requestAiAnalysis(aiType)}
              disabled={loadingAi}
              className="flex items-center gap-1.5 bg-[var(--green)] text-black font-extrabold text-[10px] px-3.5 py-1.5 rounded transition duration-200 hover:scale-105"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingAi ? "animate-spin" : ""}`} />
              {loadingAi ? "Elaborazione..." : `Genera Analisi con AI`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
