import React, { useRef, useEffect, useCallback } from 'react';
import { IChartApi, ISeriesApi } from 'lightweight-charts';
import { CandleData, DivergencePoint } from '../types';
import { CandleSentimentInfo, sentimentOverlayService } from '../services/sentimentOverlayService';

interface SentimentChartOverlayProps {
  chart: IChartApi | null;
  series: ISeriesApi<any> | null;
  enabled: boolean;
  opacity?: number;
  candles: CandleData[];
  sentimentMap: Map<string | number, CandleSentimentInfo>;
  divergencePoints?: DivergencePoint[];
  spotlightCandle?: {
    time: string | number;
    price?: number;
    type?: string;
    title?: string;
    priceChangePct?: number;
    sentimentChange?: number;
  } | null;
}

export const SentimentChartOverlay: React.FC<SentimentChartOverlayProps> = ({
  chart,
  series,
  enabled,
  opacity = 0.22,
  candles,
  sentimentMap,
  divergencePoints = [],
  spotlightCandle = null
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const drawOverlay = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !chart) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if ((!enabled && !spotlightCandle) || !candles || candles.length === 0) return;

    const timeScale = chart.timeScale();
    const visibleRange = timeScale.getVisibleLogicalRange();
    if (!visibleRange) return;

    const coords: { x: number; candle: CandleData }[] = [];
    for (let i = 0; i < candles.length; i++) {
      const c = candles[i];
      const x = timeScale.timeToCoordinate(c.time as any);
      if (x !== null && x >= -50 && x <= canvas.width + 50) {
        coords.push({ x, candle: c });
      }
    }

    let avgBarWidth = 10;
    if (coords.length > 1) {
      let totalSpacing = 0;
      for (let i = 1; i < coords.length; i++) {
        totalSpacing += Math.abs(coords[i].x - coords[i - 1].x);
      }
      avgBarWidth = Math.max(2, totalSpacing / (coords.length - 1));
    }

    const halfWidth = avgBarWidth / 2;

    // 1. Render vertical color-coded sentiment background bands
    if (enabled && coords.length > 0) {
      coords.forEach(({ x, candle }) => {
        const sentiment = sentimentMap.get(candle.time);
        if (!sentiment) return;

        const fillColor = sentimentOverlayService.getOverlayRgba(sentiment.score, opacity);

        ctx.fillStyle = fillColor;
        ctx.fillRect(x - halfWidth, 0, avgBarWidth, canvas.height);

        if (Math.abs(sentiment.score) >= 0.65) {
          ctx.fillStyle = sentiment.score > 0 ? '#10b981' : '#ef4444';
          ctx.fillRect(x - halfWidth, 0, avgBarWidth, 3);
        }
      });
    }

    // 2. Render Historical Divergence Markers & Badges on Chart
    if (series && divergencePoints.length > 0) {
      divergencePoints.forEach(dp => {
        const x = timeScale.timeToCoordinate(dp.time as any);
        if (x === null || x < -20 || x > canvas.width + 20) return;

        let y: number | null = null;
        try {
          y = (series as any).priceToCoordinate(dp.price);
        } catch {
          y = null;
        }

        if (y === null) return;

        const isBearish = dp.type === 'BEARISH';
        const badgeY = isBearish ? Math.max(30, y - 28) : Math.min(canvas.height - 30, y + 28);
        const badgeColor = isBearish ? '#ef4444' : '#10b981';
        const text = isBearish ? '▼ DIV BEARISH' : '▲ DIV BULLISH';
        const detailText = dp.description || (isBearish ? 'Prezzo Max / Sent Min' : 'Prezzo Min / Sent Max');

        ctx.save();

        // Connecting dashed line with dot on price
        ctx.beginPath();
        ctx.setLineDash([2, 2]);
        ctx.strokeStyle = badgeColor;
        ctx.lineWidth = 1.4;
        ctx.moveTo(x, y);
        ctx.lineTo(x, badgeY + (isBearish ? 10 : -10));
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = badgeColor;
        ctx.fill();

        // Badge pill
        ctx.font = 'bold 9.5px monospace';
        const mainWidth = ctx.measureText(text).width;
        ctx.font = '8px sans-serif';
        const detailWidth = ctx.measureText(detailText).width;
        const pillW = Math.max(mainWidth, detailWidth) + 14;
        const pillH = 24;
        const pillX = x - pillW / 2;
        const pillY = badgeY - pillH / 2;

        ctx.setLineDash([]);
        ctx.shadowColor = badgeColor;
        ctx.shadowBlur = 6;
        ctx.fillStyle = isBearish ? 'rgba(220, 38, 38, 0.95)' : 'rgba(16, 185, 129, 0.95)';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;

        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(pillX, pillY, pillW, pillH, 5);
        } else {
          ctx.rect(pillX, pillY, pillW, pillH);
        }
        ctx.fill();
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(text, x, pillY + 3);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = '8px sans-serif';
        ctx.fillText(detailText, x, pillY + 13);

        ctx.restore();
      });
    }

    // 3. Render Spotlight Reference Candle Indicator
    if (spotlightCandle && spotlightCandle.time) {
      const x = timeScale.timeToCoordinate(spotlightCandle.time as any);
      if (x !== null && x >= -60 && x <= canvas.width + 60) {
        // Find candle price
        let candlePrice = spotlightCandle.price;
        if (!candlePrice) {
          const match = candles.find(c => String(c.time) === String(spotlightCandle.time));
          candlePrice = match ? match.close : undefined;
        }

        let y: number | null = null;
        if (series && candlePrice !== undefined) {
          try {
            y = (series as any).priceToCoordinate(candlePrice);
          } catch {}
        }
        if (y === null) y = canvas.height / 2;

        const isBearish = String(spotlightCandle.type || '').toUpperCase().includes('BEAR');
        const themeColor = isBearish ? '#ef4444' : '#10b981';

        ctx.save();

        // 1. Vertical glowing spotlight beam through the reference candle
        const beamGrad = ctx.createLinearGradient(x - 25, 0, x + 25, 0);
        beamGrad.addColorStop(0, 'rgba(59, 130, 246, 0)');
        beamGrad.addColorStop(0.5, isBearish ? 'rgba(239, 68, 68, 0.18)' : 'rgba(16, 185, 129, 0.18)');
        beamGrad.addColorStop(1, 'rgba(59, 130, 246, 0)');
        ctx.fillStyle = beamGrad;
        ctx.fillRect(x - 25, 0, 50, canvas.height);

        // Vertical laser dashed line
        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = themeColor;
        ctx.lineWidth = 1.5;
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
        ctx.setLineDash([]);

        // 2. Concentric Pulsing Radar Rings around candle coordinate (x, y)
        [10, 22, 36].forEach((radius, idx) => {
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.strokeStyle = themeColor;
          ctx.lineWidth = idx === 0 ? 2 : 1;
          if (idx === 2) ctx.setLineDash([3, 3]);
          ctx.stroke();
          ctx.setLineDash([]);
        });

        // Center target bullseye dot
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = themeColor;
        ctx.lineWidth = 2;
        ctx.stroke();

        // 3. Floating Spotlight Callout Box with Arrow
        const calloutY = isBearish ? Math.max(45, y - 60) : Math.min(canvas.height - 45, y + 60);
        const cardTitle = `🎯 CANDELA DI RIFERIMENTO (${isBearish ? 'MASSIMO RELATIVO' : 'MINIMO RELATIVO'})`;
        const cardSub = `Data: ${String(spotlightCandle.time)} • Prezzo: ${candlePrice ? candlePrice.toFixed(2) : '-'}`;
        const cardPnl = spotlightCandle.priceChangePct !== undefined
          ? `Δ Prezzo: ${spotlightCandle.priceChangePct >= 0 ? '+' : ''}${spotlightCandle.priceChangePct}% | Sent: ${spotlightCandle.sentimentChange ?? ''} pt`
          : '';

        ctx.font = 'bold 10px monospace';
        const wTitle = ctx.measureText(cardTitle).width;
        ctx.font = '9px sans-serif';
        const wSub = ctx.measureText(cardSub).width;
        const boxW = Math.max(wTitle, wSub) + 24;
        const boxH = cardPnl ? 42 : 32;
        const boxX = Math.max(10, Math.min(canvas.width - boxW - 10, x - boxW / 2));
        const boxY = calloutY - boxH / 2;

        // Shadow & Background
        ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
        ctx.shadowBlur = 10;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.96)';
        ctx.strokeStyle = themeColor;
        ctx.lineWidth = 1.5;

        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(boxX, boxY, boxW, boxH, 6);
        } else {
          ctx.rect(boxX, boxY, boxW, boxH);
        }
        ctx.fill();
        ctx.stroke();

        // Pointer Arrow connecting box to the bullseye
        ctx.beginPath();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.96)';
        ctx.strokeStyle = themeColor;
        ctx.lineWidth = 1.5;
        if (isBearish) {
          ctx.moveTo(x - 6, boxY + boxH);
          ctx.lineTo(x, boxY + boxH + 8);
          ctx.lineTo(x + 6, boxY + boxH);
        } else {
          ctx.moveTo(x - 6, boxY);
          ctx.lineTo(x, boxY - 8);
          ctx.lineTo(x + 6, boxY);
        }
        ctx.fill();
        ctx.stroke();

        ctx.shadowBlur = 0;
        // Text inside card
        ctx.fillStyle = themeColor;
        ctx.font = 'bold 9.5px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(cardTitle, boxX + 10, boxY + 6);

        ctx.fillStyle = '#ffffff';
        ctx.font = '9px sans-serif';
        ctx.fillText(cardSub, boxX + 10, boxY + 18);

        if (cardPnl) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
          ctx.font = '8.5px monospace';
          ctx.fillText(cardPnl, boxX + 10, boxY + 29);
        }

        ctx.restore();
      }
    }
  }, [chart, series, enabled, opacity, candles, sentimentMap, divergencePoints, spotlightCandle]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !chart) return;

    const updateSize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
        drawOverlay();
      }
    };

    updateSize();

    const timeScale = chart.timeScale();
    timeScale.subscribeVisibleLogicalRangeChange(drawOverlay);
    timeScale.subscribeVisibleTimeRangeChange(drawOverlay);

    const resizeObserver = new ResizeObserver(updateSize);
    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    return () => {
      try {
        timeScale.unsubscribeVisibleLogicalRangeChange(drawOverlay);
        timeScale.unsubscribeVisibleTimeRangeChange(drawOverlay);
      } catch {}
      resizeObserver.disconnect();
    };
  }, [chart, drawOverlay]);

  useEffect(() => {
    drawOverlay();
  }, [drawOverlay]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-10"
      style={{ width: '100%', height: '100%' }}
    />
  );
};
