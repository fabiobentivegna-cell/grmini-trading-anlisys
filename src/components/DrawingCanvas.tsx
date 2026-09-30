import React, { useRef, useEffect, useState, useCallback } from 'react';
import { IChartApi, ISeriesApi } from 'lightweight-charts';
import { Copy, Trash2, Palette, X, ArrowLeftRight, Check, Move } from 'lucide-react';
import { DrawingItem, DrawingToolType, FibLevel } from '../types';

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
  onDrawingsChange
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
  const [editToolbarPos, setEditToolbarPos] = useState<{ top: number; left: number } | null>(null);
  const [isInteractive, setIsInteractive] = useState(false);
  const [manualPriceInput, setManualPriceInput] = useState<string>('');

  // Keep references to drawings in ref for async event handlers
  const drawingsRef = useRef<DrawingItem[]>(drawings);
  drawingsRef.current = drawings;

  const selectedDrawingRef = useRef<DrawingItem | null>(selectedDrawing);
  selectedDrawingRef.current = selectedDrawing;

  // Conversion helpers
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

  // Robust Hit testing with 14px tolerance
  const hitTest = useCallback((x: number, y: number) => {
    const list = drawingsRef.current;
    const TOL = 14;

    for (let i = list.length - 1; i >= 0; i--) {
      const item = list[i];
      const isSel = selectedDrawingRef.current?.id === item.id;

      if (item.type === 'horizontal' && item.price !== undefined) {
        const itemY = priceToPixel(item.price);
        if (itemY !== null) {
          // Check handles if selected
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
          // Distance to line segment
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

          // Check if hovering any of the Fibonacci horizontal levels
          for (const f of levels) {
            const currentP = highPrice - diff * f.lvl;
            const currentY = priceToPixel(currentP);
            if (currentY !== null && x >= minX - 15 && x <= maxX + 15 && Math.abs(y - currentY) <= TOL) {
              return { item, part: 'body' };
            }
          }

          // Check diagonal bounding area
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

          // Check interactive handles when selected or hovering
          if (Math.hypot(x - midX, y - targetY) <= TOL + 2) return { item, part: 'target' };
          if (Math.hypot(x - midX, y - stopY) <= TOL + 2) return { item, part: 'stop' };
          if (Math.hypot(x - midX, y - entryY) <= TOL + 2) return { item, part: 'entry' };
          if (Math.hypot(x - (minX + w), y - entryY) <= TOL + 2) return { item, part: 'width' };
          if (Math.hypot(x - minX, y - entryY) <= TOL + 2) return { item, part: 'left' };

          // Check inside bounding boxes
          const minY = Math.min(entryY, targetY, stopY);
          const maxY = Math.max(entryY, targetY, stopY);
          if (x >= minX - 5 && x <= minX + w + 5 && y >= minY - 5 && y <= maxY + 5) {
            return { item, part: 'body' };
          }
        }
      }
    }
    return null;
  }, [priceToPixel, logicalToPixel]);

  // Update floating edit toolbar coordinates
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

  // Redraw canvas content
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const allItems = [...drawings];
    if (drawingState) allItems.push(drawingState);

    allItems.forEach(item => {
      const isSel = selectedDrawing?.id === item.id;
      const isHov = hoveredDrawing?.item.id === item.id;

      if (item.type === 'horizontal' && item.price !== undefined) {
        const y = priceToPixel(item.price);
        if (y !== null) {
          // Glow if hovered or selected
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

          // Price badge on right
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

          // Diagonal guide
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

          // Profit Box
          ctx.fillStyle = 'rgba(8, 153, 129, 0.22)';
          ctx.fillRect(minX, Math.min(entryY, targetY), w, profitHeight);
          ctx.strokeStyle = '#089981';
          ctx.lineWidth = item.width;
          ctx.strokeRect(minX, Math.min(entryY, targetY), w, profitHeight);

          // Loss Box
          ctx.fillStyle = 'rgba(242, 54, 69, 0.22)';
          ctx.fillRect(minX, Math.min(entryY, stopY), w, lossHeight);
          ctx.strokeStyle = '#f23645';
          ctx.strokeRect(minX, Math.min(entryY, stopY), w, lossHeight);

          // Labels
          ctx.textAlign = 'right';
          ctx.fillStyle = '#089981';
          ctx.font = 'bold 10px sans-serif';
          ctx.fillText(`TARGET: ${targetPrice.toFixed(2)} (+${((rewardAmount / entryPrice) * 100).toFixed(2)}%)`, minX + w - 8, targetY + (item.type === 'long' ? 14 : -6));

          ctx.fillStyle = theme === 'dark' ? '#ffffff' : '#131722';
          ctx.fillText(`ENTRY: ${entryPrice.toFixed(2)} | R:R ${rrRatio}`, minX + w - 8, entryY - 4);

          ctx.fillStyle = '#f23645';
          ctx.fillText(`STOP: ${stopPrice.toFixed(2)} (-${((riskAmount / entryPrice) * 100).toFixed(2)}%)`, minX + w - 8, stopY + (item.type === 'long' ? -6 : 14));

          if (isSel) {
            drawHandle(ctx, minX, entryY, false);
            drawHandle(ctx, minX + w, entryY, false);
            drawHandle(ctx, minX + w / 2, targetY, true);
            drawHandle(ctx, minX + w / 2, stopY, true);
            drawHandle(ctx, minX + w / 2, entryY, true);
          }
        }
      }
    });

    // Crosshair line
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

    // Subtle outer halo
    ctx.beginPath();
    ctx.arc(hx, hy, isMain ? 8 : 7, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(41, 98, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();
  };

  // Sync canvas dimensions
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

  // Redraw when chart scrolls/scales
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

  // Window mousemove and mousedown (capture phase) to guarantee 100% reliable detection and selection
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

      // Only check if click is within the chart canvas bounds
      if (x < 0 || x > rect.width || y < 0 || y > rect.height) return;

      // Don't intercept clicks on floating edit toolbars or interactive popups
      const target = e.target as HTMLElement;
      if (target && target.closest('.pointer-events-auto')) return;

      if (currentTool === 'cursor') {
        const hit = hitTest(x, y);
        if (hit) {
          // Drawing clicked! Select it immediately and prepare drag action
          setIsInteractive(true);
          setSelectedDrawing(hit.item);
          updateEditToolbarPosition(hit.item);

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

          // Stop event propagation so TradingView does NOT start panning the chart
          e.stopPropagation();
        } else {
          // Clicked on empty space: deselect any active drawing
          if (selectedDrawingRef.current) {
            setSelectedDrawing(null);
            setEditToolbarPos(null);
            setShowFibPanel(false);
          }
          setIsInteractive(false);
          setHoveredDrawing(null);
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

  // Global mouse handlers when dragging so mouse movement outside canvas is never lost
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
        // Adjust Target price only
        updated.p2 = { ...init.p2, price: price };
      } else if (dragAction.part === 'stop') {
        // Adjust Stop price only
        updated.stopPrice = price;
      } else if (dragAction.part === 'entry' && init.p1) {
        // Move entry and shift target/stop
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

  // Canvas Mouse Down
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
        // Clicked outside any drawing: deselect
        setSelectedDrawing(null);
        setEditToolbarPos(null);
        setShowFibPanel(false);
        setIsInteractive(false);
      }
      return;
    }

    // Creating new drawing
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
    } else if (['trendline', 'fibonacci', 'long', 'short'].includes(currentTool)) {
      if (!drawingState) {
        const dP = price * 0.015;
        const initialStop = currentTool === 'long' ? price - dP * 0.5 : price + dP * 0.5;

        setDrawingState({
          id: newId,
          type: currentTool as any,
          p1: { logical, price },
          p2: { logical: logical + 15, price: currentTool === 'long' ? price + dP : price - dP },
          stopPrice: initialStop,
          color: drawColor,
          width: drawWidth,
          lineStyle: 'solid',
          levels: JSON.parse(JSON.stringify(DEFAULT_FIB_LEVELS))
        });
      } else {
        const finalItem: DrawingItem = {
          ...drawingState,
          p2: { logical, price }
        };
        const nextDrawings = [...drawings, finalItem];
        onDrawingsChange(nextDrawings);
        setDrawingState(null);
        setSelectedDrawing(finalItem);
        updateEditToolbarPosition(finalItem);
        onToolUsed();
      }
    }
  };

  // Canvas Mouse Move (during creation)
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
      setDrawingState({
        ...drawingState,
        p2: { logical, price }
      });
    }
  };

  // Keyboard shortcut to delete or cancel
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
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedDrawing, drawingState, onDrawingsChange]);

  // Clone trendline into a parallel channel
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

  // Toggle Long <-> Short position
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

  // Apply manual price input for horizontal line
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

  // Determine dynamic cursor style
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

      {/* Floating Interactive Toolbar for Selected Drawing */}
      {selectedDrawing && editToolbarPos && (
        <div
          style={{ top: editToolbarPos.top, left: editToolbarPos.left }}
          className="absolute pointer-events-auto flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-[var(--bg-header)]/95 backdrop-blur-md border border-[var(--border-color)] shadow-2xl z-30 text-xs animate-in fade-in duration-150"
        >
          {/* Colore Tratto */}
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

          {/* Spessore Linea */}
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

          {/* Stile Tratto */}
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

          {/* Prezzo Manuale per Linea Orizzontale */}
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

          {/* Clona Canale per Trendline */}
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

          {/* Inverti Long <-> Short */}
          {(selectedDrawing.type === 'long' || selectedDrawing.type === 'short') && (
            <button
              onClick={invertLongShort}
              className="flex items-center gap-1 px-2 py-0.5 rounded border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--border-color)] text-[var(--text-main)] text-[11px] font-semibold transition"
              title="Inverti operazione Long / Short"
            >
              <ArrowLeftRight className="w-3 h-3 text-emerald-500" />
              <span>{selectedDrawing.type === 'long' ? 'Inverti Short' : 'Inverti Long'}</span>
            </button>
          )}

          {/* Configura Livelli Fibonacci */}
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

          {/* Elimina Disegno */}
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

          {/* Deseleziona / Chiudi Toolbar */}
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

      {/* Pannello Livelli Fibonacci */}
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
    </div>
  );
};
