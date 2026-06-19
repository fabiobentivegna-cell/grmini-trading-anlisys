import React, { useEffect, useRef } from "react";
import { Trade } from "../types";

interface JournalEquityChartProps {
  trades: Trade[];
}

export default function JournalEquityChart({ trades }: JournalEquityChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Fluid dimensions matching element wrapper
    const W = canvas.parentElement?.clientWidth || 290;
    const H = 84;
    canvas.width = W * window.devicePixelRatio;
    canvas.height = H * window.devicePixelRatio;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    const hLines = 3;

    // Setup background
    ctx.fillStyle = isDark ? "#161A1E" : "#ffffff";
    ctx.fillRect(0, 0, W, H);

    // Calculate closed list
    const closedTrades = trades
      .filter(t => t.status === "CLOSED" && typeof t.pnl === "number")
      .sort((a, b) => new Date(a.edate).getTime() - new Date(b.edate).getTime());

    if (closedTrades.length === 0) {
      // Draw grid lines
      ctx.strokeStyle = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.04)";
      ctx.lineWidth = 1;
      for (let i = 0; i < hLines; i++) {
        const y = (H / (hLines + 1)) * (i + 1);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
      ctx.fillStyle = isDark ? "#5a6278" : "#8a90a8";
      ctx.font = "italic 10px monospace";
      ctx.textAlign = "center";
      ctx.fillText("Nessun trade chiuso registrato", W / 2, H / 2 + 3);
      return;
    }

    // Accumulate curve points
    let currentEquity = 0;
    const points = [0];
    closedTrades.forEach(t => {
      currentEquity += t.pnl || 0;
      points.push(currentEquity);
    });

    // Min and Max to scale y axis
    const minVal = Math.min(...points);
    const maxVal = Math.max(...points);
    const range = maxVal - minVal || 1;

    // Helper coordinates scaler
    const getX = (index: number) => (index / (points.length - 1)) * (W - 12) + 6;
    const getY = (val: number) => H - 8 - ((val - minVal) / range) * (H - 16);

    // Draw horizontal grid lines
    ctx.strokeStyle = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.05)";
    ctx.lineWidth = 0.5;
    for (let i = 0; i < hLines; i++) {
      const y = getY(minVal + (range / (hLines - 1)) * i);
      ctx.beginPath();
      ctx.moveTo(4, y);
      ctx.lineTo(W - 4, y);
      ctx.stroke();
    }

    // Gradient fill area under the line
    const grad = ctx.createLinearGradient(0, 4, 0, H - 4);
    grad.addColorStop(0, isDark ? "rgba(0, 217, 126, 0.2)" : "rgba(0, 168, 94, 0.15)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.moveTo(getX(0), H);
    points.forEach((v, idx) => ctx.lineTo(getX(idx), getY(v)));
    ctx.lineTo(getX(points.length - 1), H);
    ctx.closePath();
    ctx.fill();

    // Bold stroke equity path
    ctx.strokeStyle = isDark ? "#00d97e" : "#00a85e";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    points.forEach((v, idx) => {
      if (idx === 0) ctx.moveTo(getX(idx), getY(v));
      else ctx.lineTo(getX(idx), getY(v));
    });
    ctx.stroke();

    // Mini dots at each trade intersection
    ctx.fillStyle = isDark ? "#ffd93d" : "#c77a00";
    points.forEach((v, idx) => {
      ctx.beginPath();
      ctx.arc(getX(idx), getY(v), 2.5, 0, 2 * Math.PI);
      ctx.fill();
    });

  }, [trades]);

  return (
    <div className="w-full bg-[var(--bg2)] rounded border border-[var(--border)] p-1 overflow-hidden relative">
      <canvas ref={canvasRef} className="block w-full h-[84px]" />
    </div>
  );
}
