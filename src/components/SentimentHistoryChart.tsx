import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  AreaSeries,
  CrosshairMode,
  ColorType
} from 'lightweight-charts';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Layers,
  Activity,
  Award,
  Sparkles,
  Info
} from 'lucide-react';
import { SentimentHistoryPoint, SentimentHistoryResponse } from '../types';

interface SentimentHistoryChartProps {
  data: SentimentHistoryResponse | null;
  isLoading: boolean;
  ticker: string;
}

export const SentimentHistoryChart: React.FC<SentimentHistoryChartProps> = ({
  data,
  isLoading,
  ticker
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<any> | null>(null);

  const [timeframe, setTimeframe] = useState<'30d' | '14d' | '7d'>('30d');
  const [metricMode, setMetricMode] = useState<'score' | 'bullish_pct'>('score');
  const [hoveredPoint, setHoveredPoint] = useState<SentimentHistoryPoint | null>(null);

  const filteredPoints = useMemo(() => {
    if (!data || !data.points || data.points.length === 0) return [];
    const pts = data.points;
    if (timeframe === '7d') return pts.slice(-7);
    if (timeframe === '14d') return pts.slice(-14);
    return pts;
  }, [data, timeframe]);

  const pointsMap = useMemo(() => {
    const map = new Map<string, SentimentHistoryPoint>();
    filteredPoints.forEach(p => map.set(p.time, p));
    return map;
  }, [filteredPoints]);

  const latestPoint = filteredPoints.length > 0 ? filteredPoints[filteredPoints.length - 1] : null;
  const activePoint = hoveredPoint || latestPoint;

  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return;

    const isDark = document.body.classList.contains('dark-theme') || !document.body.classList.contains('light-theme');
    const bgColor = isDark ? '#131722' : '#ffffff';
    const textColor = isDark ? '#9ca3af' : '#4b5563';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)';
    const borderColor = isDark ? '#2a2e39' : '#e5e7eb';

    if (chartInstanceRef.current) {
      chartInstanceRef.current.remove();
      chartInstanceRef.current = null;
    }

    const chart = createChart(container, {
      width: container.clientWidth || 600,
      height: 280,
      layout: {
        background: { type: ColorType.Solid, color: bgColor },
        textColor: textColor,
        fontSize: 11
      },
      grid: {
        vertLines: { color: gridColor },
        horzLines: { color: gridColor }
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: isDark ? 'rgba(59, 130, 246, 0.5)' : 'rgba(59, 130, 246, 0.4)',
          width: 1,
          style: 1
        },
        horzLine: {
          color: isDark ? 'rgba(59, 130, 246, 0.5)' : 'rgba(59, 130, 246, 0.4)',
          width: 1,
          style: 1
        }
      },
      rightPriceScale: {
        borderColor: borderColor,
        autoScale: true,
        scaleMargins: {
          top: 0.15,
          bottom: 0.15
        }
      },
      timeScale: {
        borderColor: borderColor,
        timeVisible: false,
        secondsVisible: false,
        fixLeftEdge: true,
        fixRightEdge: true
      },
      handleScroll: false,
      handleScale: false
    });

    chartInstanceRef.current = chart;

    const isScore = metricMode === 'score';
    const series = chart.addSeries(AreaSeries, {
      lineColor: isScore ? '#3b82f6' : '#10b981',
      topColor: isScore ? 'rgba(59, 130, 246, 0.38)' : 'rgba(16, 185, 129, 0.38)',
      bottomColor: isScore ? 'rgba(59, 130, 246, 0.02)' : 'rgba(16, 185, 129, 0.02)',
      lineWidth: 2,
      priceFormat: {
        type: 'custom',
        formatter: (price: number) => {
          if (isScore) {
            return price > 0 ? `+${price.toFixed(2)}` : price.toFixed(2);
          }
          return `${price.toFixed(0)}%`;
        }
      }
    });

    seriesRef.current = series;

    const chartData = filteredPoints.map(p => ({
      time: p.time,
      value: isScore ? p.score : p.bullish_score
    }));

    series.setData(chartData);

    if (isScore) {
      series.createPriceLine({
        price: 0.0,
        color: isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.25)',
        lineWidth: 1,
        lineStyle: 2,
        title: 'Neutrale (0.00)'
      });
      series.createPriceLine({
        price: 0.5,
        color: 'rgba(16, 185, 129, 0.35)',
        lineWidth: 1,
        lineStyle: 3,
        title: '+0.50 Rialzista'
      });
      series.createPriceLine({
        price: -0.5,
        color: 'rgba(239, 68, 68, 0.35)',
        lineWidth: 1,
        lineStyle: 3,
        title: '-0.50 Ribassista'
      });
    } else {
      series.createPriceLine({
        price: 50,
        color: isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.25)',
        lineWidth: 1,
        lineStyle: 2,
        title: '50% Equilibrato'
      });
    }

    chart.timeScale().fitContent();

    chart.subscribeCrosshairMove(param => {
      if (param.time && typeof param.time === 'string' && pointsMap.has(param.time)) {
        setHoveredPoint(pointsMap.get(param.time) || null);
      } else {
        setHoveredPoint(null);
      }
    });

    const resizeObserver = new ResizeObserver(entries => {
      if (entries.length === 0 || !entries[0].contentRect) return;
      const { width } = entries[0].contentRect;
      if (chart && width > 0) {
        chart.applyOptions({ width });
        chart.timeScale().fitContent();
      }
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      if (chartInstanceRef.current) {
        chartInstanceRef.current.remove();
        chartInstanceRef.current = null;
      }
    };
  }, [filteredPoints, metricMode, pointsMap]);

  const getScoreColor = (score: number) => {
    if (score >= 0.35) return 'text-emerald-500';
    if (score >= 0.1) return 'text-emerald-400';
    if (score <= -0.35) return 'text-rose-500';
    if (score <= -0.1) return 'text-rose-400';
    return 'text-amber-500';
  };

  const getScoreBg = (score: number) => {
    if (score >= 0.35) return 'bg-emerald-500/10 border-emerald-500/30';
    if (score >= 0.1) return 'bg-emerald-500/10 border-emerald-500/20';
    if (score <= -0.35) return 'bg-rose-500/10 border-rose-500/30';
    if (score <= -0.1) return 'bg-rose-500/10 border-rose-500/20';
    return 'bg-amber-500/10 border-amber-500/30';
  };

  return (
    <div className="p-5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-color)] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-[var(--text-main)] flex items-center gap-2">
              <span>Storico Sentiment LLM (Ultimi 30 Giorni)</span>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-[var(--input-bg)] text-[var(--text-main)] border border-[var(--border-color)]">
                {ticker}
              </span>
            </h3>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
              Evoluzione del sentiment quantitativo aggregato elaborato da Gemini AI
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] p-0.5 text-xs">
            <button
              onClick={() => setMetricMode('score')}
              className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                metricMode === 'score'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              Punteggio [-1.0 .. +1.0]
            </button>
            <button
              onClick={() => setMetricMode('bullish_pct')}
              className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                metricMode === 'bullish_pct'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              % Bullish
            </button>
          </div>

          <div className="flex rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] p-0.5 text-xs">
            {(['7d', '14d', '30d'] as const).map(tf => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2.5 py-1 rounded-md font-semibold uppercase transition cursor-pointer ${
                  timeframe === tf
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      </div>

      {data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-[var(--bg-main)] border border-[var(--border-color)] flex flex-col justify-between">
            <div className="text-[11px] font-semibold text-[var(--text-muted)] flex items-center justify-between">
              <span>Media Sentiment (30d)</span>
              <Layers className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className={`text-base font-bold font-mono ${getScoreColor(data.average_score_30d)}`}>
                {data.average_score_30d > 0 ? `+${data.average_score_30d.toFixed(2)}` : data.average_score_30d.toFixed(2)}
              </span>
              <span className="text-[10px] text-[var(--text-muted)]">
                ({Math.round(((data.average_score_30d + 1) / 2) * 100)}% Bullish)
              </span>
            </div>
            <div className="mt-1 text-[10px] font-bold text-[var(--text-main)] truncate">
              {data.dominant_sentiment}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[var(--bg-main)] border border-[var(--border-color)] flex flex-col justify-between">
            <div className="text-[11px] font-semibold text-[var(--text-muted)] flex items-center justify-between">
              <span>Variazione Trend (30d)</span>
              {data.trend_30d_pct >= 0 ? (
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
              )}
            </div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span
                className={`text-base font-bold font-mono ${
                  data.trend_30d_pct >= 0 ? 'text-emerald-500' : 'text-rose-500'
                }`}
              >
                {data.trend_30d_pct >= 0 ? `+${data.trend_30d_pct.toFixed(1)}%` : `${data.trend_30d_pct.toFixed(1)}%`}
              </span>
              <span className="text-[10px] text-[var(--text-muted)]">vs inizio periodo</span>
            </div>
            <div className="mt-1 text-[10px] text-[var(--text-muted)]">
              {data.trend_30d_pct >= 0 ? 'Miglioramento graduale' : 'Deterioramento relativo'}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[var(--bg-main)] border border-[var(--border-color)] flex flex-col justify-between">
            <div className="text-[11px] font-semibold text-[var(--text-muted)] flex items-center justify-between">
              <span>Picco Rialzista</span>
              <Award className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-base font-bold font-mono text-emerald-500">
                +{data.peak_bullish_score.toFixed(2)}
              </span>
              <span className="text-[10px] text-[var(--text-muted)] font-mono">
                {data.peak_bullish_date}
              </span>
            </div>
            <div className="mt-1 text-[10px] text-[var(--text-muted)]">
              Massimo picco di ottimismo
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[var(--bg-main)] border border-[var(--border-color)] flex flex-col justify-between">
            <div className="text-[11px] font-semibold text-[var(--text-muted)] flex items-center justify-between">
              <span>Volume Notizie 30d</span>
              <Sparkles className="w-3.5 h-3.5 text-purple-500" />
            </div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-base font-bold font-mono text-[var(--text-main)]">
                {data.total_news_volume}
              </span>
              <span className="text-[10px] text-[var(--text-muted)]">articoli</span>
            </div>
            <div className="mt-1 text-[10px] text-[var(--text-muted)]">
              ~{Math.round(data.total_news_volume / 30)} articoli / giorno
            </div>
          </div>
        </div>
      )}

      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--bg-card)]/70 backdrop-blur-xs rounded-lg">
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-500">
              <Sparkles className="w-4 h-4 animate-spin" />
              <span>Caricamento storico sentiment 30 giorni...</span>
            </div>
          </div>
        )}

        <div
          ref={chartContainerRef}
          className="w-full h-[280px] rounded-lg overflow-hidden border border-[var(--border-color)]"
        />

        {activePoint && (
          <div className="mt-3 p-3 rounded-lg bg-[var(--bg-main)] border border-[var(--border-color)] flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <span className="font-bold text-[var(--text-main)] font-mono">
                {activePoint.time}
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getScoreBg(activePoint.score)} ${getScoreColor(activePoint.score)}`}>
                {activePoint.label}
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono">
              <div>
                Punteggio:{' '}
                <span className={`font-bold ${getScoreColor(activePoint.score)}`}>
                  {activePoint.score > 0 ? `+${activePoint.score.toFixed(2)}` : activePoint.score.toFixed(2)}
                </span>
              </div>
              <div className="text-emerald-500">
                Bullish: <span className="font-bold">{activePoint.bullish_score}%</span>
              </div>
              <div className="text-rose-500">
                Bearish: <span className="font-bold">{activePoint.bearish_score}%</span>
              </div>
              <div className="text-[var(--text-muted)]">
                Notizie: <span className="font-bold text-[var(--text-main)]">{activePoint.news_volume}</span>
              </div>
            </div>

            {activePoint.headline && (
              <div className="w-full text-[11px] text-[var(--text-muted)] truncate flex items-center gap-1.5 pt-1 border-t border-[var(--border-color)]/60">
                <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span className="text-[var(--text-main)] italic">"{activePoint.headline}"</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
