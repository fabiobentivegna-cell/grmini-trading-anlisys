import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { IChartApi, ISeriesApi } from 'lightweight-charts';
import { Copy, Trash2, Palette, X, ArrowLeftRight, Check, Activity, Sparkles, Calculator, ShieldCheck, Zap } from 'lucide-react';
import { DrawingItem, DrawingToolType, FibLevel, CandleData, SmcAnalysisResult } from '../types';
import { smcService } from '../services/smcService';

export interface CandleFootprintInfo {
  index: number;
  logical: number;
  c0: CandleData;
  c1: CandleData | null;
  c2: CandleData | null;
  c3: CandleData | null;
}

interface DrawingCanvasProps {
  chart: IChartApi | null;
  series: ISeriesApi<any> | null;
  currentTool: DrawingToolType;
  onToolUsed: () => void;
  drawColor: string;
  drawWidth: number;
  isCrosshairActive: boolean;
  theme: 'dark' | 'light';
  drawings: DrawingItem[];
  onDrawingsChange: (drawings: DrawingItem[]) => void;
  candles?: CandleData[];
  smcEnabled?: boolean;
  smcShowBosChoch?: boolean;
  smcShowFvg?: boolean;
  smcShowOrderBlocks?: boolean;
  smcShowLiquiditySweeps?: boolean;
}

const DEFAULT_FIB_LEVELS: FibLevel[] = [
  { lvl: 0.0, color: '#2962ff' },
  { lvl: 0.236, color: '#787b86' },
  { lvl: 0.382, color: '#f23645' },
  { lvl: 0.500, color: '#089981' },
  { lvl: 0.618, color: '#ff9800' },
  { lvl: 0.786, color: '#ab47bc' },
  { lvl: 1.0, color: '#2962ff' }
];

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  chart,
  series,
  currentTool,
  onToolUsed,
  drawColor,
  drawWidth,
  isCrosshairActive,
  theme,
  drawings,
  onDrawingsChange,
  candles,
  smcEnabled = false,
  smcShowBosChoch = true,
  smcShowFvg = true,
  smcShowOrderBlocks = true,
  smcShowLiquiditySweeps = true
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedDrawing, setSelectedDrawing] = useState<DrawingItem | null>(null);
  const [hoveredDrawing, setHoveredDrawing] = useState<{ item: DrawingItem; part: string } | null>(null);
  const [drawingState, setDrawingState] = useState<DrawingItem | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number; active: boolean }>({ x: -100, y: -100, active: false });
  const [dragAction, setDragAction] = useState<{
    item: DrawingItem;
    part: string;
    startLogical: number;
    startPrice: number;
    startX: number;
    startY: number;
    initialItem: DrawingItem;
  } | null>(null);

  const [showFibPanel, setShowFibPanel] = useState(false);
  const [showPositionPanel, setShowPositionPanel] = useState(false);
  const [riskAmountInput, setRiskAmountInput] = useState<string>('100');
  const [accountEquityInput, setAccountEquityInput] = useState<string>('10000');
  const [editToolbarPos, setEditToolbarPos] = useState<{ top: number; left: number } | null>(null);
  const [isInteractive, setIsInteractive] = useState(false);
  const [manualPriceInput, setManualPriceInput] = useState<string>('');
  const [footprintData, setFootprintData] = useState<CandleFootprintInfo | null>(null);

  // Compute SMC Analysis when enabled
  const smcData = useMemo<SmcAnalysisResult | null>(() => {
    if (!smcEnabled || !candles || candles.length < 8) return null;
    return smcService.computeSmcAnalysis(candles, { swingPeriod: 5, fvgMinPct: 0.03 });
  }, [candles, smcEnabled]);

  const drawingsRef = useRef<DrawingItem[]>(drawings);
  drawingsRef.current = drawings;

  const selectedDrawingRef = useRef<DrawingItem | null>(selectedDrawing);
  selectedDrawingRef.current = selectedDrawing;

  const pixelToPrice = useCallback((y: number): number => {
    if (!series) return 0;
    try {
      return (series as any).coordinateToPrice(y) || 0;
    } catch {
      return 0;
    }
  }, [series]);

  const priceToPixel = useCallback((price: number): number | null => {
    if (!series) return null;
    try {
      return (series as any).priceToCoordinate(price);
    } catch {
      return null;
    }
  }, [series]);

  const pixelToLogical = useCallback((x: number): number => {
    if (!chart) return 0;
    try {
      return chart.timeScale().coordinateToLogical(x) || 0;
    } catch {
      return 0;
    }
  }, [chart]);

  const logicalToPixel = useCallback((logical: number): number | null => {
    if (!chart) return null;
    try {
      return chart.timeScale().logicalToCoordinate(logical as any);
    } catch {
      return null;
    }
  }, [chart]);

  const hitTest = useCallback((x: number, y: number) => {
    const list = drawingsRef.current;
    const TOL = 14;

    for (let i = list.length - 1; i >= 0; i--) {
      const item = list[i];
      const isSel = selectedDrawingRef.current?.id === item.id;

      if (item.type === 'horizontal' && item.price !== undefined) {
        const itemY = priceToPixel(item.price);
        if (itemY !== null) {
          if (isSel) {
            const canvas = canvasRef.current;
            const w = canvas ? canvas.width : 800;
            if (Math.hypot(x - 60, y - itemY) <= TOL ||
                Math.hypot(x - w / 2, y - itemY) <= TOL ||
                Math.hypot(x - (w - 60), y - itemY) <= TOL) {
              return { item, part: 'body' };
            }
          }
          if (Math.abs(y - itemY) <= TOL) {
            return { item, part: 'body' };
          }
        }
      } else if (item.type === 'trendline' && item.p1 && item.p2) {
        const x1 = logicalToPixel(item.p1.logical);
        const y1 = priceToPixel(item.p1.price);
        const x2 = logicalToPixel(item.p2.logical);
        const y2 = priceToPixel(item.p2.price);
        if (x1 !== null && y1 !== null && x2 !== null && y2 !== null) {
          if (Math.hypot(x - x1, y - y1) <= TOL + 2) return { item, part: 'p1' };
          if (Math.hypot(x - x2, y - y2) <= TOL + 2) return { item, part: 'p2' };
          if (isSel && Math.hypot(x - (x1 + x2) / 2, y - (y1 + y2) / 2) <= TOL) {
            return { item, part: 'body' };
          }
          const l2 = Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2);
          if (l2 > 0) {
            const t = Math.max(0, Math.min(1, ((x - x1) * (x2 - x1) + (y - y1) * (y2 - y1)) / l2));
            const dist = Math.hypot(x - (x1 + t * (x2 - x1)), y - (y1 + t * (y2 - y1)));
            if (dist <= TOL) return { item, part: 'body' };
          }
        }
      } else if (item.type === 'fibonacci' && item.p1 && item.p2) {
        const x1 = logicalToPixel(item.p1.logical);
        const y1 = priceToPixel(item.p1.price);
        const x2 = logicalToPixel(item.p2.logical);
        const y2 = priceToPixel(item.p2.price);
        if (x1 !== null && y1 !== null && x2 !== null && y2 !== null) {
          const minX = Math.min(x1, x2);
          const maxX = Math.max(x1, x2);
          const highPrice = Math.max(item.p1.price, item.p2.price);
          const lowPrice = Math.min(item.p1.price, item.p2.price);
          const diff = highPrice - lowPrice;
          const levels = item.levels || DEFAULT_FIB_LEVELS;

          if (Math.hypot(x - x1, y - y1) <= TOL + 2) return { item, part: 'p1' };
          if (Math.hypot(x - x2, y - y2) <= TOL + 2) return { item, part: 'p2' };
          if (isSel) {
            if (Math.hypot(x - minX, y - (y1 + y2) / 2) <= TOL) return { item, part: 'width_left' };
            if (Math.hypot(x - maxX, y - (y1 + y2) / 2) <= TOL) return { item, part: 'width_right' };
          }

          for (const f of levels) {
            const currentP = highPrice - diff * f.lvl;
            const currentY = priceToPixel(currentP);
            if (currentY !== null && x >= minX - 15 && x <= maxX + 15 && Math.abs(y - currentY) <= TOL) {
              return { item, part: 'body' };
            }
          }

          if (x >= minX - 10 && x <= maxX + 10 && y >= Math.min(y1, y2) - 10 && y <= Math.max(y1, y2) + 10) {
            return { item, part: 'body' };
          }
        }
      } else if ((item.type === 'long' || item.type === 'short') && item.p1 && item.p2) {
        const x1 = logicalToPixel(item.p1.logical);
        const y1 = priceToPixel(item.p1.price);
        const x2 = logicalToPixel(item.p2.logical);
        const y2 = priceToPixel(item.p2.price);
        if (x1 !== null && y1 !== null && x2 !== null && y2 !== null) {
          const entryPrice = item.p1.price;
          const targetPrice = item.p2.price;
          const targetDiff = Math.abs(targetPrice - entryPrice);
          const stopPrice = item.stopPrice ?? (item.type === 'long' ? entryPrice - targetDiff * 0.5 : entryPrice + targetDiff * 0.5);

          const entryY = priceToPixel(entryPrice) || y1;
          const targetY = priceToPixel(targetPrice) || y2;
          const stopY = priceToPixel(stopPrice) || y1;

          const minX = Math.min(x1, x2);
          const maxX = Math.max(x1, x2);
          const w = Math.max(maxX - minX, 90);
          const midX = minX + w / 2;

          if (Math.hypot(x - midX, y - targetY) <= TOL + 2) return { item, part: 'target' };
          if (Math.hypot(x - midX, y - stopY) <= TOL + 2) return { item, part: 'stop' };
          if (Math.hypot(x - midX, y - entryY) <= TOL + 2) return { item, part: 'entry' };
          if (Math.hypot(x - (minX + w), y - entryY) <= TOL + 2) return { item, part: 'width' };
          if (Math.hypot(x - minX, y - entryY) <= TOL + 2) return { item, part: 'left' };

          const minY = Math.min(entryY, targetY, stopY);
          const maxY = Math.max(entryY, targetY, stopY);
          if (x >= minX - 5 && x <= minX + w + 5 && y >= minY - 5 && y <= maxY + 5) {
            return { item, part: 'body' };
          }
        }
      } else if ((item.type === 'rectangle' || item.type === 'supply_demand' || item.type === 'measure') && item.p1 && item.p2) {
        const x1 = logicalToPixel(item.p1.logical);
        const y1 = priceToPixel(item.p1.price);
        const x2 = logicalToPixel(item.p2.logical);
        const y2 = priceToPixel(item.p2.price);
        if (x1 !== null && y1 !== null && x2 !== null && y2 !== null) {
          if (Math.hypot(x - x1, y - y1) <= TOL + 2) return { item, part: 'p1' };
          if (Math.hypot(x - x2, y - y2) <= TOL + 2) return { item, part: 'p2' };
          const minX = Math.min(x1, x2);
          const maxX = Math.max(x1, x2);
          const minY = Math.min(y1, y2);
          const maxY = Math.max(y1, y2);
          if (x >= minX - 6 && x <= maxX + 6 && y >= minY - 6 && y <= maxY + 6) {
            return { item, part: 'body' };
          }
        }
      } else if (item.type === 'harmonic' && item.points && item.points.length >= 2) {
        for (let ptIdx = 0; ptIdx < item.points.length; ptIdx++) {
          const pt = item.points[ptIdx];
          const px = logicalToPixel(pt.logical);
          const py = priceToPixel(pt.price);
          if (px !== null && py !== null && Math.hypot(x - px, y - py) <= TOL + 2) {
            return { item, part: `pt_${ptIdx}` };
          }
        }
        return { item, part: 'body' };
      }
    }
    return null;
  }, [priceToPixel, logicalToPixel]);

  const updateEditToolbarPosition = useCallback((item: DrawingItem) => {
    let topY = 20;
    let leftX = 80;
    if (item.type === 'horizontal' && item.price !== undefined) {
      const y = priceToPixel(item.price);
      if (y !== null) topY = Math.max(y - 45, 10);
      setManualPriceInput(item.price.toFixed(2));
    } else if (item.p1) {
      const y1 = priceToPixel(item.p1.price);
      const x1 = logicalToPixel(item.p1.logical);
      if (y1 !== null) topY = Math.max(y1 - 45, 10);
      if (x1 !== null) leftX = Math.min(Math.max(x1, 20), 450);
    }
    setEditToolbarPos({ top: topY, left: leftX });
  }, [priceToPixel, logicalToPixel]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // AUTOMATIC SMART MONEY CONCEPTS (SMC) RENDERING
    if (smcData && candles && candles.length > 0) {
      // 1. Fair Value Gaps (FVG) - 3-Candle Imbalance Zones
      if (smcShowFvg) {
        smcData.fairValueGaps.forEach(fvg => {
          const x1 = logicalToPixel(fvg.startIndex);
          const x2 = logicalToPixel(fvg.endIndex);
          const yTop = priceToPixel(fvg.topPrice);
          const yBottom = priceToPixel(fvg.bottomPrice);
          const yMid = priceToPixel(fvg.midPrice);

          if (x1 !== null && x2 !== null && yTop !== null && yBottom !== null) {
            const minX = Math.min(x1, x2);
            const maxX = Math.max(x1, x2);
            const w = Math.max(maxX - minX, 55);
            const minY = Math.min(yTop, yBottom);
            const maxY = Math.max(yTop, yBottom);
            const h = Math.max(maxY - minY, 3);

            const isBull = fvg.direction === 'BULLISH';
            const fvgColor = isBull ? '#10b981' : '#ef4444';
            const fvgFill = isBull ? 'rgba(16, 185, 129, 0.16)' : 'rgba(239, 68, 68, 0.16)';

            // Shaded imbalance area
            ctx.fillStyle = fvgFill;
            ctx.fillRect(minX, minY, w, h);

            // Dashed boundary
            ctx.strokeStyle = isBull ? 'rgba(16, 185, 129, 0.75)' : 'rgba(239, 68, 68, 0.75)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 3]);
            ctx.strokeRect(minX, minY, w, h);
            ctx.setLineDash([]);

            // 50% FVG Equilibrium Line
            if (yMid !== null && h > 10) {
              ctx.beginPath();
              ctx.setLineDash([2, 3]);
              ctx.strokeStyle = isBull ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)';
              ctx.moveTo(minX, yMid);
              ctx.lineTo(minX + w, yMid);
              ctx.stroke();
              ctx.setLineDash([]);
            }

            // Tag Badge
            ctx.fillStyle = theme === 'dark' ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.9)';
            ctx.fillRect(minX + 3, minY + 2, 86, 15);
            ctx.strokeStyle = fvgColor;
            ctx.lineWidth = 0.8;
            ctx.strokeRect(minX + 3, minY + 2, 86, 15);

            ctx.fillStyle = fvgColor;
            ctx.font = 'bold 8.5px sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${isBull ? '🟢 +FVG 3-Bar' : '🔴 -FVG 3-Bar'}`, minX + 6, minY + 10);
          }
        });
      }

      // 2. Order Blocks (OB) - Institutional Footprint Zones
      if (smcShowOrderBlocks) {
        smcData.orderBlocks.forEach(ob => {
          const x1 = logicalToPixel(ob.startIndex);
          const x2 = logicalToPixel(ob.endIndex);
          const yTop = priceToPixel(ob.topPrice);
          const yBottom = priceToPixel(ob.bottomPrice);

          if (x1 !== null && x2 !== null && yTop !== null && yBottom !== null) {
            const minX = Math.min(x1, x2);
            const maxX = Math.max(x1, x2);
            const w = Math.max(maxX - minX, 50);
            const minY = Math.min(yTop, yBottom);
            const maxY = Math.max(yTop, yBottom);
            const h = Math.max(maxY - minY, 4);
            const yMid = (minY + maxY) / 2;

            const isBull = ob.direction === 'BULLISH';
            const obColor = isBull ? '#3b82f6' : '#a855f7';
            const obFill = isBull ? 'rgba(59, 130, 246, 0.18)' : 'rgba(168, 85, 247, 0.18)';

            // Shaded Order Block area
            ctx.fillStyle = obFill;
            ctx.fillRect(minX, minY, w, h);

            ctx.strokeStyle = obColor;
            ctx.lineWidth = 1.2;
            ctx.strokeRect(minX, minY, w, h);

            // 50% Mean Threshold Dashed Line
            if (h > 12) {
              ctx.beginPath();
              ctx.setLineDash([3, 3]);
              ctx.strokeStyle = isBull ? 'rgba(96, 165, 250, 0.6)' : 'rgba(192, 132, 252, 0.6)';
              ctx.moveTo(minX, yMid);
              ctx.lineTo(minX + w, yMid);
              ctx.stroke();
              ctx.setLineDash([]);
            }

            // OB Label Badge
            ctx.fillStyle = theme === 'dark' ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.92)';
            ctx.fillRect(minX + 3, minY + 3, 90, 16);
            ctx.strokeStyle = obColor;
            ctx.lineWidth = 0.8;
            ctx.strokeRect(minX + 3, minY + 3, 90, 16);

            ctx.fillStyle = obColor;
            ctx.font = 'bold 8.5px sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${isBull ? '🔵 BULL OB (50%)' : '🟣 BEAR OB (50%)'}`, minX + 6, minY + 11);
          }
        });
      }

      // 3. BOS & CHoCH Structure Breaks
      if (smcShowBosChoch) {
        smcData.structureBreaks.forEach(sb => {
          const x1 = logicalToPixel(sb.startIndex);
          const x2 = logicalToPixel(sb.endIndex);
          const y = priceToPixel(sb.price);

          if (x1 !== null && x2 !== null && y !== null) {
            const minX = Math.min(x1, x2);
            const maxX = Math.max(x1, x2);
            const isBull = sb.direction === 'BULLISH';
            const isChoch = sb.type === 'CHoCH';
            const breakColor = isBull ? '#10b981' : '#ef4444';

            // Breakout horizontal line
            ctx.beginPath();
            ctx.strokeStyle = breakColor;
            ctx.lineWidth = isChoch ? 2.0 : 1.4;
            ctx.setLineDash(isChoch ? [4, 2] : [6, 4]);
            ctx.moveTo(minX, y);
            ctx.lineTo(maxX, y);
            ctx.stroke();
            ctx.setLineDash([]);

            // Pivot origin point marker
            ctx.beginPath();
            ctx.arc(minX, y, 3.5, 0, Math.PI * 2);
            ctx.fillStyle = breakColor;
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Structure Break Label Pill
            const midX = (minX + maxX) / 2;
            const badgeText = `${sb.type} ${isBull ? '▲ RIALZISTA' : '▼ RIBASSISTA'} (€${sb.price.toFixed(2)})`;
            ctx.font = 'bold 9px sans-serif';
            const textW = ctx.measureText(badgeText).width;
            const pillW = textW + 14;
            const pillH = 17;
            const pillX = Math.max(minX + 5, midX - pillW / 2);
            const pillY = y - pillH / 2;

            ctx.fillStyle = theme === 'dark' ? 'rgba(15, 23, 42, 0.92)' : 'rgba(255, 255, 255, 0.95)';
            ctx.fillRect(pillX, pillY, pillW, pillH);
            ctx.strokeStyle = breakColor;
            ctx.lineWidth = isChoch ? 1.4 : 1;
            ctx.strokeRect(pillX, pillY, pillW, pillH);

            ctx.fillStyle = breakColor;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(badgeText, pillX + pillW / 2, y);
          }
        });
      }

      // 4. Liquidity Sweeps (Wick Break & Fakeout)
      if (smcShowLiquiditySweeps) {
        smcData.liquiditySweeps.forEach(sw => {
          const x = logicalToPixel(sw.index);
          const yWick = priceToPixel(sw.wickPrice);
          const yLevel = priceToPixel(sw.levelPrice);

          if (x !== null && yWick !== null) {
            const isBear = sw.direction === 'BEARISH';
            const sweepColor = isBear ? '#ef4444' : '#10b981';

            // Line connecting swing level to wick peak
            if (yLevel !== null) {
              ctx.beginPath();
              ctx.strokeStyle = sweepColor;
              ctx.lineWidth = 1.2;
              ctx.setLineDash([2, 2]);
              ctx.moveTo(x, yLevel);
              ctx.lineTo(x, yWick);
              ctx.stroke();
              ctx.setLineDash([]);
            }

            // Sweep Pill Tag
            const sweepText = `⚡ SWEEP ${isBear ? 'MASSIMI' : 'MINIMI'}`;
            ctx.font = 'bold 8.5px sans-serif';
            const swW = ctx.measureText(sweepText).width + 10;
            const swY = isBear ? yWick - 14 : yWick + 4;

            ctx.fillStyle = theme === 'dark' ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.92)';
            ctx.fillRect(x - swW / 2, swY, swW, 15);
            ctx.strokeStyle = sweepColor;
            ctx.lineWidth = 1;
            ctx.strokeRect(x - swW / 2, swY, swW, 15);

            ctx.fillStyle = sweepColor;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(sweepText, x, swY + 7.5);
          }
        });
      }
    }

    const allItems = [...drawings];
    if (drawingState) allItems.push(drawingState);

    allItems.forEach(item => {
      const isSel = selectedDrawing?.id === item.id;
      const isHov = hoveredDrawing?.item.id === item.id;

      if (item.type === 'horizontal' && item.price !== undefined) {
        const y = priceToPixel(item.price);
        if (y !== null) {
          if (isSel || isHov) {
            ctx.beginPath();
            ctx.strokeStyle = isSel ? 'rgba(41, 98, 255, 0.4)' : 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = item.width + 6;
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
          }

          ctx.beginPath();
          ctx.strokeStyle = item.color;
          ctx.lineWidth = item.width;
          if (item.lineStyle === 'dashed') ctx.setLineDash([6, 6]);
          else if (item.lineStyle === 'dotted') ctx.setLineDash([2, 4]);
          else ctx.setLineDash([]);

          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.fillStyle = item.color;
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'right';
          ctx.fillText(` ${item.price.toFixed(2)} `, canvas.width - 15, y - 6);

          if (isSel) {
            drawHandle(ctx, 60, y, true);
            drawHandle(ctx, canvas.width / 2, y, true);
            drawHandle(ctx, canvas.width - 60, y, true);
          }
        }
      } else if (item.type === 'trendline' && item.p1 && item.p2) {
        const x1 = logicalToPixel(item.p1.logical);
        const y1 = priceToPixel(item.p1.price);
        const x2 = logicalToPixel(item.p2.logical);
        const y2 = priceToPixel(item.p2.price);
        if (x1 !== null && y1 !== null && x2 !== null && y2 !== null) {
          if (isSel || isHov) {
            ctx.beginPath();
            ctx.strokeStyle = isSel ? 'rgba(41, 98, 255, 0.4)' : 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = item.width + 6;
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
          }

          ctx.beginPath();
          ctx.strokeStyle = item.color;
          ctx.lineWidth = item.width;
          if (item.lineStyle === 'dashed') ctx.setLineDash([6, 6]);
          else if (item.lineStyle === 'dotted') ctx.setLineDash([2, 4]);
          else ctx.setLineDash([]);

          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
          ctx.setLineDash([]);

          if (isSel) {
            drawHandle(ctx, x1, y1, true);
            drawHandle(ctx, (x1 + x2) / 2, (y1 + y2) / 2, false);
            drawHandle(ctx, x2, y2, true);
          }
        }
      } else if (item.type === 'fibonacci' && item.p1 && item.p2) {
        const x1 = logicalToPixel(item.p1.logical);
        const y1 = priceToPixel(item.p1.price);
        const x2 = logicalToPixel(item.p2.logical);
        const y2 = priceToPixel(item.p2.price);
        if (x1 !== null && y1 !== null && x2 !== null && y2 !== null) {
          const minX = Math.min(x1, x2);
          const maxX = Math.max(x1, x2);
          const highPrice = Math.max(item.p1.price, item.p2.price);
          const lowPrice = Math.min(item.p1.price, item.p2.price);
          const diff = highPrice - lowPrice;
          const levels = item.levels || DEFAULT_FIB_LEVELS;

          ctx.beginPath();
          ctx.strokeStyle = 'rgba(120, 123, 134, 0.35)';
          ctx.setLineDash([3, 3]);
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
          ctx.setLineDash([]);

          levels.forEach(f => {
            const currentP = highPrice - diff * f.lvl;
            const currentY = priceToPixel(currentP);
            if (currentY !== null) {
              ctx.beginPath();
              ctx.strokeStyle = f.color || item.color;
              ctx.lineWidth = item.width;
              ctx.moveTo(minX, currentY);
              ctx.lineTo(maxX, currentY);
              ctx.stroke();

              ctx.fillStyle = f.color || item.color;
              ctx.font = 'bold 10px sans-serif';
              ctx.textAlign = 'right';
              ctx.fillText(`${(f.lvl * 100).toFixed(1)}% (${currentP.toFixed(2)})`, maxX - 6, currentY - 4);
            }
          });

          if (isSel) {
            drawHandle(ctx, x1, y1, true);
            drawHandle(ctx, x2, y2, true);
            drawHandle(ctx, minX, (y1 + y2) / 2, false);
            drawHandle(ctx, maxX, (y1 + y2) / 2, false);
          }
        }
      } else if ((item.type === 'long' || item.type === 'short') && item.p1 && item.p2) {
        const x1 = logicalToPixel(item.p1.logical);
        const y1 = priceToPixel(item.p1.price);
        const x2 = logicalToPixel(item.p2.logical);
        const y2 = priceToPixel(item.p2.price);
        if (x1 !== null && y1 !== null && x2 !== null && y2 !== null) {
          const entryPrice = item.p1.price;
          const targetPrice = item.p2.price;
          const targetDiff = Math.abs(targetPrice - entryPrice);
          const stopPrice = item.stopPrice ?? (item.type === 'long' ? entryPrice - targetDiff * 0.5 : entryPrice + targetDiff * 0.5);

          const entryY = priceToPixel(entryPrice) || y1;
          const targetY = priceToPixel(targetPrice) || y2;
          const stopY = priceToPixel(stopPrice) || y1;
          const minX = Math.min(x1, x2);
          const maxX = Math.max(x1, x2);
          const w = Math.max(maxX - minX, 100);

          const profitHeight = Math.abs(entryY - targetY);
          const lossHeight = Math.abs(entryY - stopY);
          const riskAmount = Math.abs(entryPrice - stopPrice);
          const rewardAmount = Math.abs(targetPrice - entryPrice);
          const rrRatio = riskAmount > 0 ? (rewardAmount / riskAmount).toFixed(2) : '1.00';

          ctx.fillStyle = 'rgba(8, 153, 129, 0.22)';
          ctx.fillRect(minX, Math.min(entryY, targetY), w, profitHeight);
          ctx.strokeStyle = '#089981';
          ctx.lineWidth = item.width;
          ctx.strokeRect(minX, Math.min(entryY, targetY), w, profitHeight);

          ctx.fillStyle = 'rgba(242, 54, 69, 0.22)';
          ctx.fillRect(minX, Math.min(entryY, stopY), w, lossHeight);
          ctx.strokeStyle = '#f23645';
          ctx.strokeRect(minX, Math.min(entryY, stopY), w, lossHeight);

          ctx.textAlign = 'right';
          ctx.fillStyle = '#089981';
          ctx.font = 'bold 10px sans-serif';
          ctx.fillText(`TARGET: ${targetPrice.toFixed(2)} (+${((rewardAmount / entryPrice) * 100).toFixed(2)}%)`, minX + w - 8, targetY + (item.type === 'long' ? 14 : -6));

          ctx.fillStyle = theme === 'dark' ? '#ffffff' : '#131722';
          ctx.fillText(`ENTRY: ${entryPrice.toFixed(2)} | R:R ${rrRatio}`, minX + w - 8, entryY - 4);

          ctx.fillStyle = '#f23645';
          ctx.fillText(`STOP: ${stopPrice.toFixed(2)} (-${((riskAmount / entryPrice) * 100).toFixed(2)}%)`, minX + w - 8, stopY + (item.type === 'long' ? -6 : 14));

          // Position Sizing Metrics
          const riskCap = item.positionRiskAmount ?? 100;
          const shares = riskAmount > 0 ? (riskCap / riskAmount) : 0;
          const totalVal = shares * entryPrice;
          const maxProfit = shares * rewardAmount;

          ctx.fillStyle = theme === 'dark' ? '#93c5fd' : '#1d4ed8';
          ctx.font = 'bold 9.5px monospace';
          ctx.fillText(`📊 POS: ${Math.floor(shares).toLocaleString('it-IT')} Quote (€${Math.round(totalVal).toLocaleString('it-IT')}) | Rischio: €${Math.round(riskCap)} | Prof: €${Math.round(maxProfit)}`, minX + w - 8, entryY + 12);

          if (isSel) {
            drawHandle(ctx, minX, entryY, false);
            drawHandle(ctx, minX + w, entryY, false);
            drawHandle(ctx, minX + w / 2, targetY, true);
            drawHandle(ctx, minX + w / 2, stopY, true);
            drawHandle(ctx, minX + w / 2, entryY, true);
          }
        }
      } else if (item.type === 'rectangle' && item.p1 && item.p2) {
        const x1 = logicalToPixel(item.p1.logical);
        const y1 = priceToPixel(item.p1.price);
        const x2 = logicalToPixel(item.p2.logical);
        const y2 = priceToPixel(item.p2.price);
        if (x1 !== null && y1 !== null && x2 !== null && y2 !== null) {
          const minX = Math.min(x1, x2);
          const maxX = Math.max(x1, x2);
          const minY = Math.min(y1, y2);
          const maxY = Math.max(y1, y2);
          const w = Math.max(maxX - minX, 4);
          const h = Math.max(maxY - minY, 4);

          ctx.fillStyle = item.fillColor || (theme === 'dark' ? 'rgba(245, 158, 11, 0.16)' : 'rgba(245, 158, 11, 0.12)');
          ctx.fillRect(minX, minY, w, h);
          ctx.strokeStyle = item.color || '#f59e0b';
          ctx.lineWidth = item.width || 2;
          ctx.strokeRect(minX, minY, w, h);

          const minP = Math.min(item.p1.price, item.p2.price);
          const maxP = Math.max(item.p1.price, item.p2.price);
          const medianP = (minP + maxP) / 2;
          const medianY = (minY + maxY) / 2;
          const dP = maxP - minP;
          const dPct = minP > 0 ? (dP / minP) * 100 : 0;
          const bars = Math.abs(item.p2.logical - item.p1.logical);

          // Median Line (Dashed equilibrium line)
          ctx.beginPath();
          ctx.setLineDash([5, 4]);
          ctx.strokeStyle = item.color || '#f59e0b';
          ctx.lineWidth = 1.2;
          ctx.moveTo(minX, medianY);
          ctx.lineTo(maxX, medianY);
          ctx.stroke();
          ctx.setLineDash([]);

          // Median Price Tag Pill
          ctx.fillStyle = theme === 'dark' ? 'rgba(15, 23, 42, 0.88)' : 'rgba(255, 255, 255, 0.92)';
          ctx.fillRect(minX + 4, medianY - 9, 88, 18);
          ctx.strokeStyle = item.color || '#f59e0b';
          ctx.lineWidth = 1;
          ctx.strokeRect(minX + 4, medianY - 9, 88, 18);

          ctx.fillStyle = item.color || '#f59e0b';
          ctx.font = 'bold 9px monospace';
          ctx.textAlign = 'left';
          ctx.fillText(`MED: ${medianP.toFixed(2)}`, minX + 8, medianY + 4);

          // Info badge header inside rectangle
          const badgeWidth = Math.min(w - 8, 220);
          if (badgeWidth > 80) {
            ctx.fillStyle = theme === 'dark' ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.95)';
            ctx.fillRect(minX + 3, minY + 3, badgeWidth, 20);
            ctx.strokeStyle = item.color || '#f59e0b';
            ctx.lineWidth = 1;
            ctx.strokeRect(minX + 3, minY + 3, badgeWidth, 20);

            ctx.fillStyle = item.color || '#f59e0b';
            ctx.font = 'bold 9.5px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(`SUPPLY/DEMAND | Δ${dP.toFixed(2)} (${dPct.toFixed(1)}%) ${bars}b`, minX + 7, minY + 16);
          }

          if (isSel) {
            drawHandle(ctx, x1, y1, true);
            drawHandle(ctx, x2, y2, true);
            drawHandle(ctx, x1, y2, false);
            drawHandle(ctx, x2, y1, false);
          }
        }
      } else if (item.type === 'supply_demand' && item.p1 && item.p2) {
        const x1 = logicalToPixel(item.p1.logical);
        const y1 = priceToPixel(item.p1.price);
        const x2 = logicalToPixel(item.p2.logical);
        const y2 = priceToPixel(item.p2.price);
        if (x1 !== null && y1 !== null && x2 !== null && y2 !== null) {
          const minX = Math.min(x1, x2);
          const maxX = Math.max(x1, x2);
          const minY = Math.min(y1, y2);
          const maxY = Math.max(y1, y2);
          const w = Math.max(maxX - minX, 6);
          const h = Math.max(maxY - minY, 6);

          const minP = Math.min(item.p1.price, item.p2.price);
          const maxP = Math.max(item.p1.price, item.p2.price);

          // Calcolo automatico del prezzo mediano di equilibrio (50% Equilibrium Zone)
          const medianP = Number(((minP + maxP) / 2).toFixed(2));
          const medianY = (minY + maxY) / 2;
          const dP = maxP - minP;
          const dPct = minP > 0 ? (dP / minP) * 100 : 0;
          const bars = Math.abs(item.p2.logical - item.p1.logical);

          // Determinazione tipo di zona (Supply = Resistenza/Venditori, Demand = Supporto/Compratori)
          const isSupply = item.zoneType === 'supply' ? true : item.zoneType === 'demand' ? false : (item.color === '#ef4444' || item.color === '#f43f5e');
          const zoneColor = item.color || (isSupply ? '#ef4444' : '#10b981');
          const zoneFill = item.fillColor || (isSupply ? 'rgba(239, 68, 68, 0.18)' : 'rgba(16, 185, 129, 0.18)');

          // Area rettangolare ombreggiata della zona istituzionale
          ctx.fillStyle = zoneFill;
          ctx.fillRect(minX, minY, w, h);
          ctx.strokeStyle = zoneColor;
          ctx.lineWidth = item.width || 2;
          ctx.strokeRect(minX, minY, w, h);

          // Linea Mediana di Equilibrio (50% Equilibrium Level)
          if (item.showMedianLine !== false) {
            ctx.beginPath();
            ctx.setLineDash([5, 4]);
            ctx.strokeStyle = theme === 'dark' ? '#ffffff' : '#0f172a';
            ctx.lineWidth = 1.4;
            ctx.moveTo(minX, medianY);
            ctx.lineTo(maxX, medianY);
            ctx.stroke();
            ctx.setLineDash([]);

            // Badge Pill Prezzo Mediano 50%
            const medText = `⚖️ 50% MEDIAN: ${medianP.toFixed(2)}`;
            ctx.font = 'bold 9.5px monospace';
            const medTextW = ctx.measureText(medText).width;
            const medPillW = medTextW + 16;
            const medPillH = 19;
            const medPillX = minX + 8;
            const medPillY = medianY - medPillH / 2;

            ctx.fillStyle = theme === 'dark' ? 'rgba(15, 23, 42, 0.94)' : 'rgba(255, 255, 255, 0.96)';
            ctx.fillRect(medPillX, medPillY, medPillW, medPillH);
            ctx.strokeStyle = zoneColor;
            ctx.lineWidth = 1.2;
            ctx.strokeRect(medPillX, medPillY, medPillW, medPillH);

            ctx.fillStyle = zoneColor;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(medText, medPillX + 8, medianY);
          }

          // Badge Header Order Flow Istituzionale
          const headerTitle = isSupply ? '🔴 SUPPLY ZONE (ORDER FLOW SELLERS)' : '🟢 DEMAND ZONE (ORDER FLOW BUYERS)';
          const subTitle = `Δ${dP.toFixed(2)} (${dPct.toFixed(1)}%) | ${bars} BARRE`;
          const badgeW = Math.min(w - 10, 290);
          if (badgeW > 90) {
            ctx.fillStyle = theme === 'dark' ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.97)';
            ctx.fillRect(minX + 4, minY + 4, badgeW, 22);
            ctx.strokeStyle = zoneColor;
            ctx.lineWidth = 1;
            ctx.strokeRect(minX + 4, minY + 4, badgeW, 22);

            ctx.fillStyle = zoneColor;
            ctx.font = 'bold 9px sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(`${headerTitle} | ${subTitle}`, minX + 8, minY + 9);
          }

          // Estremi di Prezzo (Top e Bottom)
          if (w > 120 && h > 45) {
            ctx.fillStyle = theme === 'dark' ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.9)';
            ctx.fillRect(maxX - 82, minY + 4, 78, 16);
            ctx.strokeStyle = zoneColor;
            ctx.lineWidth = 0.8;
            ctx.strokeRect(maxX - 82, minY + 4, 78, 16);
            ctx.fillStyle = zoneColor;
            ctx.font = 'bold 8.5px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`TOP: ${maxP.toFixed(2)}`, maxX - 43, minY + 12);

            ctx.fillStyle = theme === 'dark' ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.9)';
            ctx.fillRect(maxX - 82, maxY - 20, 78, 16);
            ctx.strokeStyle = zoneColor;
            ctx.lineWidth = 0.8;
            ctx.strokeRect(maxX - 82, maxY - 20, 78, 16);
            ctx.fillStyle = zoneColor;
            ctx.font = 'bold 8.5px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`BOT: ${minP.toFixed(2)}`, maxX - 43, maxY - 12);
          }

          if (isSel) {
            drawHandle(ctx, x1, y1, true);
            drawHandle(ctx, x2, y2, true);
            drawHandle(ctx, x1, y2, false);
            drawHandle(ctx, x2, y1, false);
            drawHandle(ctx, minX, medianY, false);
            drawHandle(ctx, maxX, medianY, false);
          }
        }
      } else if (item.type === 'measure' && item.p1 && item.p2) {
        const x1 = logicalToPixel(item.p1.logical);
        const y1 = priceToPixel(item.p1.price);
        const x2 = logicalToPixel(item.p2.logical);
        const y2 = priceToPixel(item.p2.price);
        if (x1 !== null && y1 !== null && x2 !== null && y2 !== null) {
          const minX = Math.min(x1, x2);
          const maxX = Math.max(x1, x2);
          const minY = Math.min(y1, y2);
          const maxY = Math.max(y1, y2);
          const w = Math.max(maxX - minX, 4);
          const h = Math.max(maxY - minY, 4);

          const isUp = item.p2.price >= item.p1.price;
          const diffP = item.p2.price - item.p1.price;
          const diffPct = item.p1.price > 0 ? (diffP / item.p1.price) * 100 : 0;
          const bars = item.p2.logical - item.p1.logical;

          // Shaded measure area
          ctx.fillStyle = isUp ? 'rgba(8, 153, 129, 0.16)' : 'rgba(242, 54, 69, 0.16)';
          ctx.fillRect(minX, minY, w, h);

          ctx.beginPath();
          ctx.setLineDash([4, 3]);
          ctx.strokeStyle = isUp ? '#089981' : '#f23645';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(minX, minY, w, h);
          ctx.setLineDash([]);

          // Diagonal arrow
          ctx.beginPath();
          ctx.strokeStyle = isUp ? '#089981' : '#f23645';
          ctx.lineWidth = 2;
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();

          // Tooltip Pill at end or center
          const pillX = x2 > x1 ? x2 + 10 : x2 - 170;
          const pillY = y2 - 12;

          ctx.fillStyle = isUp ? '#089981' : '#f23645';
          ctx.fillRect(pillX, pillY, 160, 24);

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 10px sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(
            `${isUp ? '▲ +' : '▼ '}${diffP.toFixed(2)} (${isUp ? '+' : ''}${diffPct.toFixed(2)}%) | ${Math.abs(bars)}b`,
            pillX + 8,
            pillY + 16
          );

          if (isSel) {
            drawHandle(ctx, x1, y1, true);
            drawHandle(ctx, x2, y2, true);
          }
        }
      } else if (item.type === 'harmonic' && item.points && item.points.length >= 2) {
        const pts = item.points;
        const coords = pts.map(p => ({
          x: logicalToPixel(p.logical),
          y: priceToPixel(p.price)
        }));

        const validCoords = coords.filter(c => c.x !== null && c.y !== null) as { x: number; y: number }[];

        if (validCoords.length >= 2) {
          // Lines connecting points
          ctx.beginPath();
          ctx.strokeStyle = item.color || '#a855f7';
          ctx.lineWidth = item.width || 2;
          ctx.moveTo(validCoords[0].x, validCoords[0].y);
          for (let k = 1; k < validCoords.length; k++) {
            ctx.lineTo(validCoords[k].x, validCoords[k].y);
          }
          ctx.stroke();

          // Connect X to B if at least 3 points
          if (validCoords.length >= 3) {
            ctx.beginPath();
            ctx.setLineDash([3, 3]);
            ctx.strokeStyle = 'rgba(168, 85, 247, 0.7)';
            ctx.moveTo(validCoords[0].x, validCoords[0].y);
            ctx.lineTo(validCoords[2].x, validCoords[2].y);
            ctx.stroke();
            ctx.setLineDash([]);

            // Triangle XAB fill
            ctx.beginPath();
            ctx.fillStyle = 'rgba(168, 85, 247, 0.14)';
            ctx.moveTo(validCoords[0].x, validCoords[0].y);
            ctx.lineTo(validCoords[1].x, validCoords[1].y);
            ctx.lineTo(validCoords[2].x, validCoords[2].y);
            ctx.closePath();
            ctx.fill();

            // Ratio AB / XA
            const dXA = Math.abs(pts[1].price - pts[0].price);
            const dAB = Math.abs(pts[2].price - pts[1].price);
            const rAB = dXA > 0 ? (dAB / dXA).toFixed(3) : '0';
            ctx.fillStyle = '#a855f7';
            ctx.font = 'bold 9px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`AB/XA: ${rAB}`, (validCoords[0].x + validCoords[2].x) / 2, (validCoords[0].y + validCoords[2].y) / 2 - 4);
          }

          // Connect B to D and X to D if 5 points
          if (validCoords.length >= 5) {
            ctx.beginPath();
            ctx.setLineDash([3, 3]);
            ctx.strokeStyle = 'rgba(59, 130, 246, 0.7)';
            ctx.moveTo(validCoords[2].x, validCoords[2].y);
            ctx.lineTo(validCoords[4].x, validCoords[4].y);
            ctx.moveTo(validCoords[0].x, validCoords[0].y);
            ctx.lineTo(validCoords[4].x, validCoords[4].y);
            ctx.stroke();
            ctx.setLineDash([]);

            // Triangle BCD fill
            ctx.beginPath();
            ctx.fillStyle = 'rgba(59, 130, 246, 0.14)';
            ctx.moveTo(validCoords[2].x, validCoords[2].y);
            ctx.lineTo(validCoords[3].x, validCoords[3].y);
            ctx.lineTo(validCoords[4].x, validCoords[4].y);
            ctx.closePath();
            ctx.fill();

            // Ratios
            const dBC = Math.abs(pts[3].price - pts[2].price);
            const dCD = Math.abs(pts[4].price - pts[3].price);
            const dXA = Math.abs(pts[1].price - pts[0].price);
            const dXD = Math.abs(pts[4].price - pts[0].price);

            const rCD = dBC > 0 ? (dCD / dBC).toFixed(3) : '0';
            const rXD = dXA > 0 ? (dXD / dXA).toFixed(3) : '0';

            ctx.fillStyle = '#3b82f6';
            ctx.font = 'bold 9px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`CD/BC: ${rCD}`, (validCoords[2].x + validCoords[4].x) / 2, (validCoords[2].y + validCoords[4].y) / 2 - 4);
            ctx.fillText(`XD/XA: ${rXD}`, (validCoords[0].x + validCoords[4].x) / 2, (validCoords[0].y + validCoords[4].y) / 2 + 12);
          }

          // Labels for points: X, A, B, C, D
          const labels = ['X', 'A', 'B', 'C', 'D'];
          validCoords.forEach((c, idx) => {
            ctx.beginPath();
            ctx.arc(c.x, c.y, 8, 0, Math.PI * 2);
            ctx.fillStyle = item.color || '#a855f7';
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 9px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(labels[idx] || '', c.x, c.y + 3);
          });
        }
      }
    });

    if (footprintData) {
      const cx = logicalToPixel(footprintData.logical);
      if (cx !== null && cx >= -40 && cx <= canvas.width + 40) {
        ctx.save();
        ctx.fillStyle = theme === 'dark' ? 'rgba(59, 130, 246, 0.12)' : 'rgba(59, 130, 246, 0.08)';
        ctx.fillRect(cx - 10, 0, 20, canvas.height);

        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(cx, 0);
        ctx.lineTo(cx, canvas.height);
        ctx.stroke();
        ctx.setLineDash([]);

        const cyClose = priceToPixel(footprintData.c0.close);
        if (cyClose !== null) {
          ctx.beginPath();
          ctx.arc(cx, cyClose, 4.5, 0, Math.PI * 2);
          ctx.fillStyle = footprintData.c0.close >= footprintData.c0.open ? '#10b981' : '#ef4444';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    if (isCrosshairActive && mousePos.active) {
      ctx.beginPath();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = theme === 'dark' ? 'rgba(209, 212, 220, 0.6)' : 'rgba(96, 98, 106, 0.6)';
      ctx.lineWidth = 1;
      ctx.moveTo(0, mousePos.y);
      ctx.lineTo(canvas.width, mousePos.y);
      ctx.moveTo(mousePos.x, 0);
      ctx.lineTo(mousePos.x, canvas.height);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [
    drawings,
    drawingState,
    selectedDrawing,
    hoveredDrawing,
    footprintData,
    isCrosshairActive,
    mousePos,
    theme,
    priceToPixel,
    logicalToPixel
  ]);

  const drawHandle = (ctx: CanvasRenderingContext2D, hx: number, hy: number, isMain: boolean) => {
    ctx.beginPath();
    ctx.arc(hx, hy, isMain ? 6 : 5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = isMain ? '#2962ff' : '#089981';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(hx, hy, isMain ? 8 : 7, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(41, 98, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();
  };

  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas && canvas.parentElement) {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
        redraw();
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [redraw]);

  useEffect(() => {
    if (!chart) return;
    const handleRangeChange = () => {
      redraw();
      if (selectedDrawing) updateEditToolbarPosition(selectedDrawing);
    };
    chart.timeScale().subscribeVisibleLogicalRangeChange(handleRangeChange);
    return () => {
      try {
        chart.timeScale().unsubscribeVisibleLogicalRangeChange(handleRangeChange);
      } catch {}
    };
  }, [chart, redraw, selectedDrawing, updateEditToolbarPosition]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
        setMousePos({ x, y, active: true });

        if (currentTool === 'cursor') {
          if (dragAction) {
            setIsInteractive(true);
            return;
          }
          const hit = hitTest(x, y);
          setHoveredDrawing(hit);

          if (hit || selectedDrawingRef.current) {
            setIsInteractive(true);
          } else {
            setIsInteractive(false);
          }
        } else {
          setIsInteractive(true);
        }
      } else {
        setMousePos(prev => ({ ...prev, active: false }));
        if (currentTool === 'cursor' && !dragAction && !selectedDrawingRef.current) {
          setHoveredDrawing(null);
          setIsInteractive(false);
        }
      }
    };

    const handleWindowMouseDown = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (x < 0 || x > rect.width || y < 0 || y > rect.height) return;

      const target = e.target as HTMLElement;
      if (target && target.closest('.pointer-events-auto')) return;

      if (currentTool === 'cursor') {
        const hit = hitTest(x, y);
        if (hit) {
          setIsInteractive(true);
          setSelectedDrawing(hit.item);
          updateEditToolbarPosition(hit.item);
          setFootprintData(null);

          const startLog = pixelToLogical(x);
          const startPr = pixelToPrice(y);

          setDragAction({
            item: hit.item,
            part: hit.part,
            startLogical: startLog,
            startPrice: startPr,
            startX: e.clientX,
            startY: e.clientY,
            initialItem: JSON.parse(JSON.stringify(hit.item))
          });

          e.stopPropagation();
        } else {
          if (selectedDrawingRef.current) {
            setSelectedDrawing(null);
            setEditToolbarPos(null);
            setShowFibPanel(false);
          }
          setIsInteractive(false);
          setHoveredDrawing(null);

          const startLog = pixelToLogical(x);
          const cIdx = Math.round(startLog);
          if (candles && candles.length > 0 && cIdx >= 0 && cIdx < candles.length && Math.abs(startLog - cIdx) <= 0.85) {
            const c0 = candles[cIdx];
            const c1 = cIdx > 0 ? candles[cIdx - 1] : null;
            const c2 = cIdx > 1 ? candles[cIdx - 2] : null;
            const c3 = cIdx > 2 ? candles[cIdx - 3] : null;
            setFootprintData({
              index: cIdx,
              logical: cIdx,
              c0,
              c1,
              c2,
              c3
            });
          }
        }
      }
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mousedown', handleWindowMouseDown, { capture: true });
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mousedown', handleWindowMouseDown, { capture: true });
    };
  }, [currentTool, dragAction, hitTest, pixelToLogical, pixelToPrice, updateEditToolbarPosition]);

  useEffect(() => {
    if (!dragAction) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const price = pixelToPrice(y);
      const logical = pixelToLogical(x);

      const dL = logical - dragAction.startLogical;
      const dP = price - dragAction.startPrice;
      const init = dragAction.initialItem;

      let updated = { ...dragAction.item };

      if (dragAction.part === 'body') {
        if (init.type === 'horizontal') {
          updated.price = init.price! + dP;
        } else if (init.p1 && init.p2) {
          updated.p1 = { logical: init.p1.logical + dL, price: init.p1.price + dP };
          updated.p2 = { logical: init.p2.logical + dL, price: init.p2.price + dP };
          if (init.stopPrice !== undefined) {
            updated.stopPrice = init.stopPrice + dP;
          }
        }
      } else if (dragAction.part === 'p1' && init.p1) {
        updated.p1 = { logical: init.p1.logical + dL, price: init.p1.price + dP };
      } else if (dragAction.part === 'p2' && init.p2) {
        updated.p2 = { logical: init.p2.logical + dL, price: init.p2.price + dP };
      } else if (dragAction.part === 'target' && init.p2) {
        updated.p2 = { ...init.p2, price: price };
      } else if (dragAction.part === 'stop') {
        updated.stopPrice = price;
      } else if (dragAction.part === 'entry' && init.p1) {
        updated.p1 = { ...init.p1, price: price };
        if (init.p2) updated.p2 = { ...init.p2, price: init.p2.price + dP };
        if (init.stopPrice !== undefined) updated.stopPrice = init.stopPrice + dP;
      } else if (dragAction.part === 'width' && init.p2) {
        updated.p2 = { ...init.p2, logical: logical };
      } else if (dragAction.part === 'left' && init.p1) {
        updated.p1 = { ...init.p1, logical: logical };
      } else if (dragAction.part === 'width_left' && init.p1) {
        updated.p1 = { ...init.p1, logical: logical };
      } else if (dragAction.part === 'width_right' && init.p2) {
        updated.p2 = { ...init.p2, logical: logical };
      }

      setSelectedDrawing(updated);
      onDrawingsChange(drawingsRef.current.map(d => (d.id === updated.id ? updated : d)));
      updateEditToolbarPosition(updated);
    };

    const handleGlobalMouseUp = () => {
      setDragAction(null);
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [dragAction, pixelToPrice, pixelToLogical, onDrawingsChange, updateEditToolbarPosition]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const price = pixelToPrice(y);
    const logical = pixelToLogical(x);

    if (currentTool === 'cursor') {
      const hit = hitTest(x, y);
      if (hit) {
        setSelectedDrawing(hit.item);
        updateEditToolbarPosition(hit.item);
        setFootprintData(null);
        setDragAction({
          item: hit.item,
          part: hit.part,
          startLogical: logical,
          startPrice: price,
          startX: e.clientX,
          startY: e.clientY,
          initialItem: JSON.parse(JSON.stringify(hit.item))
        });
      } else {
        setSelectedDrawing(null);
        setEditToolbarPos(null);
        setShowFibPanel(false);
        setIsInteractive(false);

        const cIdx = Math.round(logical);
        if (candles && candles.length > 0 && cIdx >= 0 && cIdx < candles.length && Math.abs(logical - cIdx) <= 0.85) {
          const c0 = candles[cIdx];
          const c1 = cIdx > 0 ? candles[cIdx - 1] : null;
          const c2 = cIdx > 1 ? candles[cIdx - 2] : null;
          const c3 = cIdx > 2 ? candles[cIdx - 3] : null;
          setFootprintData({
            index: cIdx,
            logical: cIdx,
            c0,
            c1,
            c2,
            c3
          });
        }
      }
      return;
    }

    const newId = `draw_${Date.now()}`;

    if (currentTool === 'horizontal') {
      const newHoriz: DrawingItem = {
        id: newId,
        type: 'horizontal',
        price,
        color: drawColor,
        width: drawWidth,
        lineStyle: 'solid'
      };
      const nextDrawings = [...drawings, newHoriz];
      onDrawingsChange(nextDrawings);
      setSelectedDrawing(newHoriz);
      updateEditToolbarPosition(newHoriz);
      onToolUsed();
    } else if (['trendline', 'fibonacci', 'long', 'short', 'rectangle', 'supply_demand', 'measure'].includes(currentTool)) {
      if (!drawingState) {
        const dP = price * 0.015;
        const initialStop = currentTool === 'long' ? price - dP * 0.5 : price + dP * 0.5;
        const isSD = currentTool === 'supply_demand';
        const initialColor = isSD ? '#10b981' : currentTool === 'rectangle' ? '#f59e0b' : currentTool === 'measure' ? '#089981' : drawColor;
        const initialFill = isSD ? 'rgba(16, 185, 129, 0.18)' : currentTool === 'rectangle' ? 'rgba(245, 158, 11, 0.16)' : undefined;

        setDrawingState({
          id: newId,
          type: currentTool as any,
          p1: { logical, price },
          p2: { logical: logical + (isSD || currentTool === 'rectangle' || currentTool === 'measure' ? 20 : 15), price: currentTool === 'long' ? price + dP : price - dP },
          stopPrice: initialStop,
          color: initialColor,
          fillColor: initialFill,
          width: drawWidth,
          lineStyle: 'solid',
          levels: JSON.parse(JSON.stringify(DEFAULT_FIB_LEVELS)),
          zoneType: isSD ? 'auto' : undefined,
          showMedianLine: isSD ? true : undefined,
          medianPrice: isSD ? price : undefined
        });
      } else {
        const p1Price = drawingState.p1?.price ?? price;
        const minP = Math.min(p1Price, price);
        const maxP = Math.max(p1Price, price);
        const calculatedMedian = Number(((minP + maxP) / 2).toFixed(2));

        const finalItem: DrawingItem = {
          ...drawingState,
          p2: { logical, price },
          medianPrice: drawingState.type === 'supply_demand' ? calculatedMedian : undefined
        };
        const nextDrawings = [...drawings, finalItem];
        onDrawingsChange(nextDrawings);
        setDrawingState(null);
        setSelectedDrawing(finalItem);
        updateEditToolbarPosition(finalItem);
        onToolUsed();
      }
    } else if (currentTool === 'harmonic') {
      if (!drawingState) {
        setDrawingState({
          id: newId,
          type: 'harmonic',
          color: '#a855f7',
          width: drawWidth,
          points: [{ logical, price }, { logical, price }]
        });
      } else {
        const currentPoints = drawingState.points ? [...drawingState.points] : [];
        currentPoints[currentPoints.length - 1] = { logical, price };
        if (currentPoints.length < 5) {
          currentPoints.push({ logical, price });
          setDrawingState({ ...drawingState, points: currentPoints });
        } else {
          const finalItem: DrawingItem = {
            ...drawingState,
            points: currentPoints
          };
          const nextDrawings = [...drawings, finalItem];
          onDrawingsChange(nextDrawings);
          setDrawingState(null);
          setSelectedDrawing(finalItem);
          updateEditToolbarPosition(finalItem);
          onToolUsed();
        }
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const price = pixelToPrice(y);
    const logical = pixelToLogical(x);

    setMousePos({ x, y, active: true });

    if (drawingState) {
      if (drawingState.type === 'harmonic' && drawingState.points && drawingState.points.length > 0) {
        const nextPts = [...drawingState.points];
        nextPts[nextPts.length - 1] = { logical, price };
        setDrawingState({
          ...drawingState,
          points: nextPts
        });
      } else {
        setDrawingState({
          ...drawingState,
          p2: { logical, price }
        });
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedDrawing) {
        onDrawingsChange(drawingsRef.current.filter(d => d.id !== selectedDrawing.id));
        setSelectedDrawing(null);
        setEditToolbarPos(null);
        setShowFibPanel(false);
      } else if (e.key === 'Escape') {
        if (drawingState) {
          setDrawingState(null);
        } else if (selectedDrawing) {
          setSelectedDrawing(null);
          setEditToolbarPos(null);
          setShowFibPanel(false);
        } else if (footprintData) {
          setFootprintData(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedDrawing, drawingState, footprintData, onDrawingsChange]);

  const cloneChannel = () => {
    if (!selectedDrawing || selectedDrawing.type !== 'trendline' || !selectedDrawing.p1 || !selectedDrawing.p2) return;
    const dP = Math.abs(selectedDrawing.p1.price - selectedDrawing.p2.price) * 0.4 || selectedDrawing.p1.price * 0.02;
    const cloned: DrawingItem = {
      id: `draw_${Date.now()}`,
      type: 'trendline',
      p1: { logical: selectedDrawing.p1.logical, price: selectedDrawing.p1.price + dP },
      p2: { logical: selectedDrawing.p2.logical, price: selectedDrawing.p2.price + dP },
      color: selectedDrawing.color,
      width: selectedDrawing.width,
      lineStyle: selectedDrawing.lineStyle
    };
    const nextDrawings = [...drawings, cloned];
    onDrawingsChange(nextDrawings);
    setSelectedDrawing(cloned);
    updateEditToolbarPosition(cloned);
  };

  const invertLongShort = () => {
    if (!selectedDrawing || (selectedDrawing.type !== 'long' && selectedDrawing.type !== 'short') || !selectedDrawing.p1 || !selectedDrawing.p2) return;
    const newType = selectedDrawing.type === 'long' ? 'short' : 'long';
    const entry = selectedDrawing.p1.price;
    const oldTargetDiff = selectedDrawing.p2.price - entry;
    const newTargetPrice = entry - oldTargetDiff;
    const newStopPrice = newType === 'long' ? entry - Math.abs(newTargetPrice - entry) * 0.5 : entry + Math.abs(newTargetPrice - entry) * 0.5;

    const updated: DrawingItem = {
      ...selectedDrawing,
      type: newType,
      p2: { ...selectedDrawing.p2, price: newTargetPrice },
      stopPrice: newStopPrice
    };
    setSelectedDrawing(updated);
    onDrawingsChange(drawings.map(d => (d.id === updated.id ? updated : d)));
  };

  const handleApplyManualPrice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDrawing || selectedDrawing.type !== 'horizontal') return;
    const p = parseFloat(manualPriceInput);
    if (!isNaN(p) && p > 0) {
      const updated = { ...selectedDrawing, price: p };
      setSelectedDrawing(updated);
      onDrawingsChange(drawings.map(d => (d.id === updated.id ? updated : d)));
      updateEditToolbarPosition(updated);
    }
  };

  let cursorStyle = 'cursor-default';
  if (currentTool !== 'cursor') {
    cursorStyle = 'cursor-crosshair';
  } else if (dragAction) {
    cursorStyle = 'cursor-grabbing';
  } else if (hoveredDrawing) {
    if (['target', 'stop', 'entry'].includes(hoveredDrawing.part) || hoveredDrawing.item.type === 'horizontal') {
      cursorStyle = 'cursor-ns-resize';
    } else if (['width', 'left', 'width_left', 'width_right'].includes(hoveredDrawing.part)) {
      cursorStyle = 'cursor-ew-resize';
    } else if (['p1', 'p2'].includes(hoveredDrawing.part)) {
      cursorStyle = 'cursor-crosshair';
    } else {
      cursorStyle = 'cursor-grab';
    }
  }

  return (
    <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        style={{
          pointerEvents: currentTool !== 'cursor' || isInteractive || dragAction || selectedDrawing ? 'auto' : 'none'
        }}
        className={`w-full h-full ${cursorStyle}`}
      />

      {/* Floating Toolbar */}
      {selectedDrawing && editToolbarPos && (
        <div
          style={{ top: editToolbarPos.top, left: editToolbarPos.left }}
          className="absolute pointer-events-auto flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-[var(--bg-header)]/95 backdrop-blur-md border border-[var(--border-color)] shadow-2xl z-30 text-xs animate-in fade-in duration-150"
        >
          <div className="flex items-center gap-1">
            <input
              type="color"
              value={selectedDrawing.color}
              onChange={e => {
                const updated = { ...selectedDrawing, color: e.target.value };
                setSelectedDrawing(updated);
                onDrawingsChange(drawings.map(d => (d.id === updated.id ? updated : d)));
              }}
              className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent"
              title="Colore elemento"
            />
          </div>

          <select
            value={selectedDrawing.width}
            onChange={e => {
              const updated = { ...selectedDrawing, width: parseInt(e.target.value) || 2 };
              setSelectedDrawing(updated);
              onDrawingsChange(drawings.map(d => (d.id === updated.id ? updated : d)));
            }}
            className="px-1.5 py-0.5 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] text-[11px] font-semibold"
            title="Spessore tratto"
          >
            <option value="1">1px</option>
            <option value="2">2px</option>
            <option value="3">3px</option>
            <option value="4">4px</option>
          </select>

          <select
            value={selectedDrawing.lineStyle || 'solid'}
            onChange={e => {
              const updated = { ...selectedDrawing, lineStyle: e.target.value as any };
              setSelectedDrawing(updated);
              onDrawingsChange(drawings.map(d => (d.id === updated.id ? updated : d)));
            }}
            className="px-1.5 py-0.5 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] text-[11px]"
            title="Stile linea"
          >
            <option value="solid">Solido</option>
            <option value="dashed">Tratteggiato</option>
            <option value="dotted">Puntinato</option>
          </select>

          {selectedDrawing.type === 'horizontal' && (
            <form onSubmit={handleApplyManualPrice} className="flex items-center gap-1 pl-1 border-l border-[var(--border-color)]">
              <input
                type="number"
                step="any"
                value={manualPriceInput}
                onChange={e => setManualPriceInput(e.target.value)}
                className="w-20 px-1.5 py-0.5 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] text-[11px] font-mono font-bold text-right outline-none"
                placeholder="Prezzo"
              />
              <button
                type="submit"
                className="p-1 rounded bg-blue-600 hover:bg-blue-700 text-white transition"
                title="Applica prezzo esatto"
              >
                <Check className="w-3 h-3" />
              </button>
            </form>
          )}

          {selectedDrawing.type === 'trendline' && (
            <button
              onClick={cloneChannel}
              className="flex items-center gap-1 px-2 py-0.5 rounded border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--border-color)] text-[var(--text-main)] text-[11px] font-semibold transition"
              title="Clona trendline per creare canale parallelo"
            >
              <Copy className="w-3 h-3 text-blue-500" />
              <span>Canale</span>
            </button>
          )}

          {(selectedDrawing.type === 'long' || selectedDrawing.type === 'short') && (
            <>
              <button
                onClick={invertLongShort}
                className="flex items-center gap-1 px-2 py-0.5 rounded border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--border-color)] text-[var(--text-main)] text-[11px] font-semibold transition cursor-pointer"
                title="Inverti operazione Long / Short"
              >
                <ArrowLeftRight className="w-3 h-3 text-emerald-500" />
                <span>{selectedDrawing.type === 'long' ? 'Inverti Short' : 'Inverti Long'}</span>
              </button>

              <button
                onClick={() => setShowPositionPanel(!showPositionPanel)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-bold transition cursor-pointer ${
                  showPositionPanel
                    ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                    : 'border-[var(--border-color)] bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'
                }`}
                title="Calcolatore Monetario di Rischio e Position Sizing"
              >
                <Calculator className="w-3 h-3 text-blue-400" />
                <span>Calcola Size (€)</span>
              </button>
            </>
          )}

          {selectedDrawing.type === 'fibonacci' && (
            <button
              onClick={() => setShowFibPanel(!showFibPanel)}
              className="flex items-center gap-1 px-2 py-0.5 rounded border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--border-color)] text-[var(--text-main)] text-[11px] font-semibold transition"
              title="Configura colori e percentuali Fibonacci"
            >
              <Palette className="w-3 h-3 text-purple-500" />
              <span>Livelli Fib</span>
            </button>
          )}

          {selectedDrawing.type === 'supply_demand' && (
            <div className="flex items-center gap-1 pl-1 border-l border-[var(--border-color)]">
              <button
                onClick={() => {
                  const updated: DrawingItem = {
                    ...selectedDrawing,
                    zoneType: 'supply',
                    color: '#ef4444',
                    fillColor: 'rgba(239, 68, 68, 0.18)'
                  };
                  setSelectedDrawing(updated);
                  onDrawingsChange(drawings.map(d => (d.id === updated.id ? updated : d)));
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                  selectedDrawing.zoneType === 'supply'
                    ? 'bg-rose-500 text-white shadow-sm'
                    : 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/20'
                }`}
                title="Imposta come Supply Zone (Venditori / Resistenza)"
              >
                🔴 Supply
              </button>

              <button
                onClick={() => {
                  const updated: DrawingItem = {
                    ...selectedDrawing,
                    zoneType: 'demand',
                    color: '#10b981',
                    fillColor: 'rgba(16, 185, 129, 0.18)'
                  };
                  setSelectedDrawing(updated);
                  onDrawingsChange(drawings.map(d => (d.id === updated.id ? updated : d)));
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                  selectedDrawing.zoneType === 'demand'
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
                }`}
                title="Imposta come Demand Zone (Compratori / Supporto)"
              >
                🟢 Demand
              </button>

              <button
                onClick={() => {
                  const updated: DrawingItem = {
                    ...selectedDrawing,
                    showMedianLine: selectedDrawing.showMedianLine === false ? true : false
                  };
                  setSelectedDrawing(updated);
                  onDrawingsChange(drawings.map(d => (d.id === updated.id ? updated : d)));
                }}
                className={`px-2 py-0.5 rounded border border-[var(--border-color)] text-[10px] font-semibold transition ${
                  selectedDrawing.showMedianLine !== false
                    ? 'bg-blue-600/15 border-blue-500 text-blue-500'
                    : 'bg-[var(--bg-card)] text-[var(--text-muted)]'
                }`}
                title="Attiva / Disattiva Linea Prezzo Mediano 50%"
              >
                ⚖️ Mediana 50%
              </button>

              {selectedDrawing.p1 && selectedDrawing.p2 && (
                <span className="px-1.5 py-0.5 rounded bg-[var(--bg-card)] text-[var(--text-main)] font-mono text-[10px] font-bold border border-[var(--border-color)]" title="Prezzo Mediano di Equilibrio">
                  Med: {((selectedDrawing.p1.price + selectedDrawing.p2.price) / 2).toFixed(2)}
                </span>
              )}
            </div>
          )}

          <button
            onClick={() => {
              onDrawingsChange(drawings.filter(d => d.id !== selectedDrawing.id));
              setSelectedDrawing(null);
              setEditToolbarPos(null);
              setShowFibPanel(false);
            }}
            className="p-1 rounded text-rose-500 hover:bg-rose-500/10 transition ml-1"
            title="Elimina elemento (Canc)"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              setSelectedDrawing(null);
              setEditToolbarPos(null);
              setShowFibPanel(false);
            }}
            className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--border-color)] transition"
            title="Chiudi selezione (Esc)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Persistent Candle Institutional Footprint Tooltip */}
      {footprintData && (() => {
        const c0 = footprintData.c0;
        const c1 = footprintData.c1;
        const c2 = footprintData.c2;
        const c3 = footprintData.c3;

        const canvasW = canvasRef.current?.width || 800;
        const canvasH = canvasRef.current?.height || 500;

        const rawX = logicalToPixel(footprintData.logical);
        const rawY = priceToPixel(c0.high);

        if (rawX === null || rawX < -100 || rawX > canvasW + 100) return null;

        const tooltipWidth = 345;
        const tooltipHeight = 415;

        let leftPos = rawX + 18;
        if (leftPos + tooltipWidth > canvasW - 10) {
          leftPos = Math.max(10, rawX - tooltipWidth - 18);
        }

        let topPos = rawY !== null ? Math.max(10, Math.min(canvasH - tooltipHeight - 10, rawY - 30)) : 40;

        const isBullish = c0.close >= c0.open;
        const deltaPrice = c0.close - c0.open;
        const deltaPct = c0.open > 0 ? (deltaPrice / c0.open) * 100 : 0;
        const totalRange = c0.high - c0.low;
        const rangePct = c0.low > 0 ? (totalRange / c0.low) * 100 : 0;

        const bodySize = Math.abs(c0.close - c0.open);
        const upperWick = c0.high - Math.max(c0.open, c0.close);
        const lowerWick = Math.min(c0.open, c0.close) - c0.low;
        const bodyPct = totalRange > 0 ? (bodySize / totalRange) * 100 : 100;
        const upperWickPct = totalRange > 0 ? (upperWick / totalRange) * 100 : 0;
        const lowerWickPct = totalRange > 0 ? (lowerWick / totalRange) * 100 : 0;

        // Relative vs C-1
        const dClosePct1 = c1 && c1.close > 0 ? ((c0.close - c1.close) / c1.close) * 100 : null;
        const dVolPct1 = c1 && c1.volume && c0.volume ? ((c0.volume - c1.volume) / c1.volume) * 100 : null;

        // Relative vs C-2
        const dClosePct2 = c2 && c2.close > 0 ? ((c0.close - c2.close) / c2.close) * 100 : null;
        const dVolPct2 = c2 && c2.volume && c0.volume ? ((c0.volume - c2.volume) / c2.volume) * 100 : null;

        // Relative vs C-3
        const dClosePct3 = c3 && c3.close > 0 ? ((c0.close - c3.close) / c3.close) * 100 : null;
        const dVolPct3 = c3 && c3.volume && c0.volume ? ((c0.volume - c3.volume) / c3.volume) * 100 : null;

        const validVols = [c1?.volume, c2?.volume, c3?.volume].filter((v): v is number => typeof v === 'number' && v > 0);
        const avg3Vol = validVols.length > 0 ? validVols.reduce((a, b) => a + b, 0) / validVols.length : 0;
        const rVol3 = avg3Vol > 0 && c0.volume ? (c0.volume / avg3Vol) : null;

        // Institutional footprint diagnosis
        let footprintLabel = 'Flusso Istituzionale Bilanciato';
        let footprintColor = '#3b82f6';
        let footprintDesc = 'Volumi e range in linea con la recente struttura dei prezzi.';

        if (upperWickPct > 42 && (rVol3 ? rVol3 > 1.15 : true)) {
          footprintLabel = 'Forte Assorbimento / Sweep Liquidità Massimi';
          footprintColor = '#ef4444';
          footprintDesc = `Wick superiore (${upperWickPct.toFixed(0)}%) con sweep di liquidità sui massimi e reazione dei venditori.`;
        } else if (lowerWickPct > 42 && (rVol3 ? rVol3 > 1.15 : true)) {
          footprintLabel = 'Forte Assorbimento / Difesa Minimi Compratori';
          footprintColor = '#10b981';
          footprintDesc = `Wick inferiore (${lowerWickPct.toFixed(0)}%) con massiccia difesa istituzionale del supporto.`;
        } else if (bodyPct > 68 && isBullish && (rVol3 ? rVol3 > 1.1 : true)) {
          footprintLabel = 'Espansione Rialzista Istituzionale (Imbalance)';
          footprintColor = '#10b981';
          footprintDesc = `Corpo compatto (${bodyPct.toFixed(0)}%) con dominanza aggressiva degli acquirenti a mercato.`;
        } else if (bodyPct > 68 && !isBullish && (rVol3 ? rVol3 > 1.1 : true)) {
          footprintLabel = 'Espansione Ribassista Istituzionale (Imbalance)';
          footprintColor = '#ef4444';
          footprintDesc = `Pressione venditrice dominante con estensione del range e corpo al ${bodyPct.toFixed(0)}%.`;
        } else if (bodyPct < 25) {
          footprintLabel = 'Compressione / Doji Order Flow';
          footprintColor = '#eab308';
          footprintDesc = 'Equilibrio temporaneo tra ordini limite e assorbimento della liquidità.';
        }

        const formatVol = (v?: number) => {
          if (!v) return 'N/D';
          if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
          if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
          return v.toLocaleString('it-IT');
        };

        const formatTime = (t: string | number) => {
          if (typeof t === 'number') {
            const d = new Date(t * 1000);
            return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', hour12: false });
          }
          return String(t);
        };

        return (
          <div
            style={{
              top: topPos,
              left: leftPos,
              width: `${tooltipWidth}px`
            }}
            className="absolute pointer-events-auto z-50 rounded-2xl bg-[var(--bg-header)]/95 backdrop-blur-xl border border-[var(--border-color)] shadow-2xl p-3.5 space-y-2.5 text-xs text-[var(--text-main)] select-none animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-lg bg-blue-500/15 flex items-center justify-center text-blue-500 font-bold">
                  <Activity className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-[11px] font-bold flex items-center gap-1.5">
                    <span>Footprint Candela #{footprintData.index + 1}</span>
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold ${isBullish ? 'bg-emerald-500/15 text-emerald-500' : 'bg-rose-500/15 text-rose-500'}`}>
                      {isBullish ? '▲ BULLISH' : '▼ BEARISH'}
                    </span>
                  </div>
                  <div className="text-[9.5px] text-[var(--text-muted)] font-mono">
                    {formatTime(c0.time)}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setFootprintData(null)}
                className="p-1 rounded-lg hover:bg-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition cursor-pointer"
                title="Chiudi analisi footprint (Esc)"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* OHLC Mini Grid */}
            <div className="grid grid-cols-4 gap-1 bg-[var(--bg-main)]/60 p-2 rounded-xl border border-[var(--border-color)] font-mono text-[10.5px]">
              <div className="flex flex-col">
                <span className="text-[8.5px] uppercase font-bold text-[var(--text-muted)]">Open</span>
                <span className="font-semibold">{c0.open.toFixed(2)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[8.5px] uppercase font-bold text-emerald-500">High</span>
                <span className="font-semibold text-emerald-500">{c0.high.toFixed(2)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[8.5px] uppercase font-bold text-rose-500">Low</span>
                <span className="font-semibold text-rose-500">{c0.low.toFixed(2)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[8.5px] uppercase font-bold text-[var(--text-muted)]">Close</span>
                <span className={`font-bold ${isBullish ? 'text-emerald-500' : 'text-rose-500'}`}>{c0.close.toFixed(2)}</span>
              </div>
            </div>

            {/* Vol & Range stats */}
            <div className="flex items-center justify-between text-[10.5px] px-1 font-mono">
              <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
                <span>Vol:</span>
                <strong className="text-[var(--text-main)] font-semibold">{formatVol(c0.volume)}</strong>
                {rVol3 !== null && (
                  <span className={`text-[9.5px] font-bold px-1 rounded ${rVol3 >= 1.2 ? 'bg-amber-500/15 text-amber-500' : 'text-[var(--text-muted)]'}`} title="Relative Volume vs ultime 3 candele">
                    {rVol3.toFixed(2)}x RVol
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 text-[var(--text-muted)]">
                <span>Δ C/O:</span>
                <strong className={isBullish ? 'text-emerald-500 font-bold' : 'text-rose-500 font-bold'}>
                  {deltaPrice >= 0 ? `+${deltaPrice.toFixed(2)}` : deltaPrice.toFixed(2)} ({deltaPct >= 0 ? `+${deltaPct.toFixed(2)}%` : `${deltaPct.toFixed(2)}%`})
                </strong>
              </div>
            </div>

            {/* Multi-Candle Comparative Matrix Table (vs Last 3 Candles) */}
            <div className="space-y-1 bg-[var(--bg-main)]/50 p-2 rounded-xl border border-[var(--border-color)]">
              <div className="flex items-center justify-between text-[9px] uppercase font-extrabold text-[var(--text-muted)] tracking-wider">
                <span>Variazioni Rel. vs Ultime 3 Candele</span>
                <span>Δ Close | Δ Volume</span>
              </div>

              {/* C-1 */}
              <div className="flex items-center justify-between py-1 border-b border-[var(--border-color)]/60 text-[10.5px] font-mono">
                <span className="text-[var(--text-muted)] font-sans font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  vs C-1 (-1 bar)
                </span>
                {c1 ? (
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${dClosePct1 !== null && dClosePct1 >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {dClosePct1 !== null ? (dClosePct1 >= 0 ? `+${dClosePct1.toFixed(2)}%` : `${dClosePct1.toFixed(2)}%`) : '--'}
                    </span>
                    {dVolPct1 !== null && (
                      <span className={`text-[9.5px] ${dVolPct1 >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        Vol {dVolPct1 >= 0 ? `+${dVolPct1.toFixed(1)}%` : `${dVolPct1.toFixed(1)}%`}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-[var(--text-muted)] text-[9.5px]">Nessun dato prec.</span>
                )}
              </div>

              {/* C-2 */}
              <div className="flex items-center justify-between py-1 border-b border-[var(--border-color)]/60 text-[10.5px] font-mono">
                <span className="text-[var(--text-muted)] font-sans font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  vs C-2 (-2 bar)
                </span>
                {c2 ? (
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${dClosePct2 !== null && dClosePct2 >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {dClosePct2 !== null ? (dClosePct2 >= 0 ? `+${dClosePct2.toFixed(2)}%` : `${dClosePct2.toFixed(2)}%`) : '--'}
                    </span>
                    {dVolPct2 !== null && (
                      <span className={`text-[9.5px] ${dVolPct2 >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        Vol {dVolPct2 >= 0 ? `+${dVolPct2.toFixed(1)}%` : `${dVolPct2.toFixed(1)}%`}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-[var(--text-muted)] text-[9.5px]">Nessun dato prec.</span>
                )}
              </div>

              {/* C-3 */}
              <div className="flex items-center justify-between py-1 text-[10.5px] font-mono">
                <span className="text-[var(--text-muted)] font-sans font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                  vs C-3 (-3 bar)
                </span>
                {c3 ? (
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${dClosePct3 !== null && dClosePct3 >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {dClosePct3 !== null ? (dClosePct3 >= 0 ? `+${dClosePct3.toFixed(2)}%` : `${dClosePct3.toFixed(2)}%`) : '--'}
                    </span>
                    {dVolPct3 !== null && (
                      <span className={`text-[9.5px] ${dVolPct3 >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        Vol {dVolPct3 >= 0 ? `+${dVolPct3.toFixed(1)}%` : `${dVolPct3.toFixed(1)}%`}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-[var(--text-muted)] text-[9.5px]">Nessun dato prec.</span>
                )}
              </div>
            </div>

            {/* Institutional Footprint Insight Card */}
            <div className="p-2 rounded-xl bg-linear-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 border border-blue-500/20 space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 font-bold text-[10.5px]" style={{ color: footprintColor }}>
                  <Sparkles className="w-3 h-3" />
                  <span>{footprintLabel}</span>
                </div>
                <span className="text-[9px] font-mono text-[var(--text-muted)]">
                  Corpo: {bodyPct.toFixed(0)}%
                </span>
              </div>
              <p className="text-[10px] text-[var(--text-muted)] leading-tight">
                {footprintDesc}
              </p>
            </div>

            <div className="text-center text-[9px] text-[var(--text-muted)] italic pt-0.5">
              💡 Clicca un'altra candela per analizzarla • Premi ESC per chiudere
            </div>
          </div>
        );
      })()}

      {/* Fibonacci Panel */}
      {showFibPanel && selectedDrawing && selectedDrawing.type === 'fibonacci' && editToolbarPos && (
        <div
          style={{ top: editToolbarPos.top + 45, left: editToolbarPos.left }}
          className="absolute pointer-events-auto w-60 p-3 rounded-xl bg-[var(--bg-header)]/95 backdrop-blur-md border border-[var(--border-color)] shadow-2xl z-40 text-xs space-y-2 animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between pb-1.5 border-b border-[var(--border-color)] font-bold text-[var(--text-main)]">
            <span>Colori Livelli Fibonacci</span>
            <button onClick={() => setShowFibPanel(false)} className="text-[var(--text-muted)] hover:text-[var(--text-main)]">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
            {(selectedDrawing.levels || DEFAULT_FIB_LEVELS).map((lvl, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <span className="font-mono text-[11px] text-[var(--text-muted)] font-medium">
                  Livello {(lvl.lvl * 100).toFixed(1)}%
                </span>
                <input
                  type="color"
                  value={lvl.color}
                  onChange={e => {
                    const updatedLevels = [...(selectedDrawing.levels || DEFAULT_FIB_LEVELS)];
                    updatedLevels[idx] = { ...updatedLevels[idx], color: e.target.value };
                    const updated = { ...selectedDrawing, levels: updatedLevels };
                    setSelectedDrawing(updated);
                    onDrawingsChange(drawings.map(d => (d.id === updated.id ? updated : d)));
                  }}
                  className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Position Sizing & Risk Management Calculator Panel */}
      {showPositionPanel && selectedDrawing && (selectedDrawing.type === 'long' || selectedDrawing.type === 'short') && selectedDrawing.p1 && selectedDrawing.p2 && editToolbarPos && (() => {
        const entryPrice = selectedDrawing.p1.price;
        const targetPrice = selectedDrawing.p2.price;
        const targetDiff = Math.abs(targetPrice - entryPrice);
        const stopPrice = selectedDrawing.stopPrice ?? (selectedDrawing.type === 'long' ? entryPrice - targetDiff * 0.5 : entryPrice + targetDiff * 0.5);

        const riskPerShare = Math.abs(entryPrice - stopPrice);
        const rewardPerShare = Math.abs(targetPrice - entryPrice);
        const parsedRiskAmount = parseFloat(riskAmountInput) || 100;

        const calculatedShares = riskPerShare > 0 ? (parsedRiskAmount / riskPerShare) : 0;
        const totalCapitalRequired = calculatedShares * entryPrice;
        const maxProfitAmount = calculatedShares * rewardPerShare;
        const maxLossAmount = parsedRiskAmount;
        const rrRatio = riskPerShare > 0 ? (rewardPerShare / riskPerShare).toFixed(2) : '1.00';

        return (
          <div
            style={{ top: editToolbarPos.top + 45, left: Math.max(10, Math.min(editToolbarPos.left - 40, (canvasRef.current?.width || 800) - 300)) }}
            className="absolute pointer-events-auto w-72 p-3.5 rounded-2xl bg-[var(--bg-header)]/95 backdrop-blur-xl border border-blue-500/30 shadow-2xl z-40 text-xs space-y-3 select-none animate-in fade-in zoom-in-95 duration-150 text-[var(--text-main)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-1.5 font-bold text-white">
                <Calculator className="w-4 h-4 text-blue-400" />
                <span>Calcolatore Rischio & Size</span>
              </div>
              <button onClick={() => setShowPositionPanel(false)} className="text-[var(--text-muted)] hover:text-white transition cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Risk Amount Inputs */}
            <div className="space-y-2">
              <div>
                <label className="block text-[10px] font-bold uppercase text-[var(--text-muted)] mb-1">
                  Capitale a Rischio (€ Massimo):
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1.5 font-mono text-xs text-[var(--text-muted)]">€</span>
                  <input
                    type="number"
                    min="1"
                    step="10"
                    value={riskAmountInput}
                    onChange={e => setRiskAmountInput(e.target.value)}
                    className="w-full pl-7 pr-2.5 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] text-white font-mono font-bold text-xs outline-none"
                    placeholder="100"
                  />
                </div>
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-1">
                {[50, 100, 250, 500, 1000].map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setRiskAmountInput(String(amt))}
                    className={`flex-1 py-0.5 rounded text-[10px] font-bold border transition cursor-pointer ${
                      riskAmountInput === String(amt)
                        ? 'bg-blue-600 text-white border-blue-500'
                        : 'bg-black/20 text-[var(--text-muted)] border-[var(--border-color)] hover:text-white'
                    }`}
                  >
                    {amt}€
                  </button>
                ))}
              </div>
            </div>

            {/* Output Calculation Breakdown Box */}
            <div className="p-2.5 rounded-xl bg-black/30 border border-[var(--border-color)] space-y-1.5 font-mono text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[var(--text-muted)] font-sans">Dimensione Posizione:</span>
                <strong className="text-blue-400 font-extrabold text-xs">{Math.floor(calculatedShares).toLocaleString('it-IT')} Quote</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[var(--text-muted)] font-sans">Controvalore Ordine:</span>
                <strong className="text-white">€ {Math.round(totalCapitalRequired).toLocaleString('it-IT')}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[var(--text-muted)] font-sans">Perdita Massima (SL):</span>
                <strong className="text-rose-400">- € {Math.round(maxLossAmount).toLocaleString('it-IT')}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[var(--text-muted)] font-sans">Profitto Atteso (TP):</span>
                <strong className="text-emerald-400">+ € {Math.round(maxProfitAmount).toLocaleString('it-IT')}</strong>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-[var(--border-color)]/60 text-[10px]">
                <span className="text-[var(--text-muted)] font-sans font-bold">Rapporto R:R:</span>
                <strong className="text-amber-400">1 : {rrRatio}</strong>
              </div>
            </div>

            {/* Apply Button */}
            <button
              onClick={() => {
                const updated: DrawingItem = {
                  ...selectedDrawing,
                  positionRiskAmount: parsedRiskAmount,
                  calculatedShares: Math.floor(calculatedShares),
                  calculatedTotalValue: Number(totalCapitalRequired.toFixed(2)),
                  calculatedMaxLoss: Number(maxLossAmount.toFixed(2)),
                  calculatedMaxProfit: Number(maxProfitAmount.toFixed(2))
                };
                setSelectedDrawing(updated);
                onDrawingsChange(drawings.map(d => (d.id === updated.id ? updated : d)));
                setShowPositionPanel(false);
              }}
              className="w-full py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition cursor-pointer shadow-md flex items-center justify-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Applica Taglia Posizione</span>
            </button>
          </div>
        );
      })()}
    </div>
  );
};
