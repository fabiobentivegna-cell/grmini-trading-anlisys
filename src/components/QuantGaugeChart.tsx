import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface QuantGaugeChartProps {
  score: number; // 0 to 100
  signal: string;
  momentumActivated?: boolean;
  theme?: 'dark' | 'light';
  width?: number;
  height?: number;
}

export const QuantGaugeChart: React.FC<QuantGaugeChartProps> = ({
  score,
  signal,
  momentumActivated = false,
  theme = 'dark',
  width = 300,
  height = 200
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const w = width;
    const h = height;
    const margin = { top: 15, right: 20, bottom: 25, left: 20 };
    const innerWidth = w - margin.left - margin.right;
    const innerHeight = h - margin.top - margin.bottom;

    const radius = Math.min(innerWidth / 2, innerHeight) - 10;
    const centerX = w / 2;
    const centerY = h - 30;

    const g = svg
      .append('g')
      .attr('transform', `translate(${centerX}, ${centerY})`);

    // Angles in radians: -120 degrees to +120 degrees
    const startAngle = -Math.PI * 0.65;
    const endAngle = Math.PI * 0.65;

    const scale = d3
      .scaleLinear()
      .domain([0, 100])
      .range([startAngle, endAngle])
      .clamp(true);

    // Color bands: [0-40: Sell/Strong Sell], [40-74: Hold/Neutral], [75-100: Buy/Strong Buy]
    const zones = [
      { from: 0, to: 40, color: '#f43f5e', label: 'SELL (<40)' },
      { from: 40, to: 74, color: '#f59e0b', label: 'HOLD (40-74)' },
      { from: 74, to: 100, color: '#10b981', label: 'BUY (>=75)' }
    ];

    const arcGenerator = d3
      .arc()
      .innerRadius(radius - 22)
      .outerRadius(radius)
      .cornerRadius(4);

    // Background track
    const bgArc = d3
      .arc()
      .innerRadius(radius - 22)
      .outerRadius(radius)
      .startAngle(startAngle)
      .endAngle(endAngle)
      .cornerRadius(4);

    g.append('path')
      .attr('d', bgArc as any)
      .attr('fill', theme === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)');

    // Colored Arc Segments
    zones.forEach(zone => {
      const segmentArc = d3
        .arc()
        .innerRadius(radius - 20)
        .outerRadius(radius - 2)
        .startAngle(scale(zone.from))
        .endAngle(scale(zone.to))
        .cornerRadius(2);

      g.append('path')
        .attr('d', segmentArc as any)
        .attr('fill', zone.color)
        .attr('opacity', 0.85);
    });

    // Active Value Glow Arc (fill from startAngle to current score)
    const currentAngle = scale(score);
    const activeColor = score >= 75 ? '#10b981' : score >= 40 ? '#f59e0b' : '#f43f5e';

    const valueArc = d3
      .arc()
      .innerRadius(radius - 25)
      .outerRadius(radius + 3)
      .startAngle(startAngle)
      .endAngle(currentAngle)
      .cornerRadius(3);

    // Glow filter
    const defs = svg.append('defs');
    const filter = defs.append('filter').attr('id', 'gauge-glow');
    filter
      .append('feGaussianBlur')
      .attr('stdDeviation', '4')
      .attr('result', 'coloredBlur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    g.append('path')
      .attr('d', valueArc as any)
      .attr('fill', activeColor)
      .attr('opacity', 0.4)
      .attr('filter', 'url(#gauge-glow)');

    // Ticks and Labels
    const ticks = [0, 25, 40, 50, 75, 100];
    ticks.forEach(t => {
      const angle = scale(t) - Math.PI / 2;
      const x1 = Math.cos(angle) * (radius - 24);
      const y1 = Math.sin(angle) * (radius - 24);
      const x2 = Math.cos(angle) * (radius - 6);
      const y2 = Math.sin(angle) * (radius - 6);

      g.append('line')
        .attr('x1', x1)
        .attr('y1', y1)
        .attr('x2', x2)
        .attr('y2', y2)
        .attr('stroke', theme === 'dark' ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.35)')
        .attr('stroke-width', t === 40 || t === 75 ? 2.5 : 1.5);

      const labelRadius = radius - 35;
      const lx = Math.cos(angle) * labelRadius;
      const ly = Math.sin(angle) * labelRadius;

      g.append('text')
        .attr('x', lx)
        .attr('y', ly + 3)
        .attr('text-anchor', 'middle')
        .attr('font-size', '9px')
        .attr('font-weight', 'bold')
        .attr('fill', theme === 'dark' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)')
        .text(t);
    });

    // Needle pointer
    const needleAngle = scale(score) - Math.PI / 2;
    const needleLength = radius - 15;
    const needleWidth = 5;

    // Needle path polygon
    const nx = Math.cos(needleAngle) * needleLength;
    const ny = Math.sin(needleAngle) * needleLength;
    const nLeftX = Math.cos(needleAngle - Math.PI / 2) * needleWidth;
    const nLeftY = Math.sin(needleAngle - Math.PI / 2) * needleWidth;
    const nRightX = Math.cos(needleAngle + Math.PI / 2) * needleWidth;
    const nRightY = Math.sin(needleAngle + Math.PI / 2) * needleWidth;

    const needlePath = `M ${nLeftX} ${nLeftY} L ${nx} ${ny} L ${nRightX} ${nRightY} Z`;

    g.append('path')
      .attr('d', needlePath)
      .attr('fill', activeColor)
      .attr('filter', 'url(#gauge-glow)');

    // Pivot Circle
    g.append('circle')
      .attr('r', 11)
      .attr('fill', theme === 'dark' ? '#1e293b' : '#ffffff')
      .attr('stroke', activeColor)
      .attr('stroke-width', 3);

    g.append('circle')
      .attr('r', 4.5)
      .attr('fill', activeColor);

    // Score readout text
    g.append('text')
      .attr('y', 22)
      .attr('text-anchor', 'middle')
      .attr('font-size', '20px')
      .attr('font-weight', '900')
      .attr('fill', activeColor)
      .text(`${Math.round(score)}`);

    g.append('text')
      .attr('y', 33)
      .attr('text-anchor', 'middle')
      .attr('font-size', '9px')
      .attr('font-weight', '700')
      .attr('fill', theme === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)')
      .text('/ 100');
  }, [score, signal, theme, width, height]);

  return (
    <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm">
      <div className="w-full flex items-center justify-between pb-1 border-b border-[var(--border-color)]">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          Smart Quant Score
        </span>
        {momentumActivated && (
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-black uppercase">
            ⚡ Momentum
          </span>
        )}
      </div>

      <svg
        ref={svgRef}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible select-none my-1"
      />

      <div className="text-center space-y-1">
        <div
          className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border shadow-sm ${
            score >= 75
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
              : score >= 40
              ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
              : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
          }`}
        >
          {signal}
        </div>
        <p className="text-[10px] text-[var(--text-muted)]">
          {score >= 75
            ? 'Score ≥ 75: Attivazione Smart Quant Momentum'
            : score >= 40
            ? 'Score 40-74: Regime Neutrale / Consolidamento'
            : 'Score < 40: Pressione Ribassista Elevata'}
        </p>
      </div>
    </div>
  );
};
