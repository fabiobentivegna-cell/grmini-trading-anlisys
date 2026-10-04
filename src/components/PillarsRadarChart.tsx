import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { Layers, CheckSquare, Square, Info, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Sparkles } from 'lucide-react';

export interface PillarData {
  key: string;
  label: string;
  shortLabel: string;
  assetScore: number; // 0 to 100
  sectorScore: number; // 0 to 100
  commentary?: string;
  color?: string;
}

export interface PillarsRadarChartProps {
  pillars: {
    macro?: { score: number; label: string; commentary: string };
    fundamental?: { score: number; label: string; commentary: string };
    technical?: { score: number; label: string; commentary: string };
    seasonality?: { score: number; label: string; commentary: string };
    analyst_consensus?: { score: number; label: string; commentary: string };
  };
  sectorPillars?: {
    macro?: number;
    fundamental?: number;
    technical?: number;
    seasonality?: number;
    analyst_consensus?: number;
  };
  ticker?: string;
  sectorName?: string;
  theme?: 'dark' | 'light';
  width?: number;
  height?: number;
}

export const PillarsRadarChart: React.FC<PillarsRadarChartProps> = ({
  pillars,
  sectorPillars,
  ticker = 'Asset Selezionato',
  sectorName = 'Media Settore',
  theme = 'dark',
  width = 380,
  height = 300
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Dynamic Layer Toggles
  const [showAsset, setShowAsset] = useState<boolean>(true);
  const [showSector, setShowSector] = useState<boolean>(true);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  // Default realistic sector averages if not provided
  const defaultSector = useMemo(() => ({
    macro: sectorPillars?.macro ?? 64,
    fundamental: sectorPillars?.fundamental ?? 62,
    technical: sectorPillars?.technical ?? 58,
    seasonality: sectorPillars?.seasonality ?? 56,
    analyst_consensus: sectorPillars?.analyst_consensus ?? 65
  }), [sectorPillars]);

  const data: PillarData[] = useMemo(() => [
    {
      key: 'macro',
      label: 'Macroeconomico & Ciclo',
      shortLabel: 'Macro',
      assetScore: Math.min(100, Math.max(0, pillars.macro?.score ?? 70)),
      sectorScore: defaultSector.macro,
      commentary: pillars.macro?.commentary || 'Regime economico, liquidità e ciclo monetario',
      color: '#3b82f6'
    },
    {
      key: 'fundamental',
      label: 'Fondamentale & Fair Value',
      shortLabel: 'Fondamentale',
      assetScore: Math.min(100, Math.max(0, pillars.fundamental?.score ?? 80)),
      sectorScore: defaultSector.fundamental,
      commentary: pillars.fundamental?.commentary || 'Solidità di bilancio, margini e multipli',
      color: '#10b981'
    },
    {
      key: 'technical',
      label: 'Tecnico & Volatilità',
      shortLabel: 'Tecnico',
      assetScore: Math.min(100, Math.max(0, pillars.technical?.score ?? 75)),
      sectorScore: defaultSector.technical,
      commentary: pillars.technical?.commentary || 'Trend, oscillatori e struttura volumetrica',
      color: '#8b5cf6'
    },
    {
      key: 'seasonality',
      label: 'Stagionalità & Frattali',
      shortLabel: 'Stagionalità',
      assetScore: Math.min(100, Math.max(0, pillars.seasonality?.score ?? 70)),
      sectorScore: defaultSector.seasonality,
      commentary: pillars.seasonality?.commentary || 'Ricorsività storiche e rendimento medio periodale',
      color: '#f59e0b'
    },
    {
      key: 'analyst_consensus',
      label: 'Consenso Analisti & Target',
      shortLabel: 'Consenso',
      assetScore: Math.min(100, Math.max(0, pillars.analyst_consensus?.score ?? 78)),
      sectorScore: defaultSector.analyst_consensus,
      commentary: pillars.analyst_consensus?.commentary || 'Target price medio e rating delle case d\'affari',
      color: '#06b6d4'
    }
  ], [pillars, defaultSector]);

  const assetAvg = Math.round(data.reduce((acc, curr) => acc + curr.assetScore, 0) / data.length);
  const sectorAvg = Math.round(data.reduce((acc, curr) => acc + curr.sectorScore, 0) / data.length);
  const spread = assetAvg - sectorAvg;

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const w = width;
    const h = height;
    const margin = { top: 40, right: 55, bottom: 40, left: 55 };
    const innerWidth = w - margin.left - margin.right;
    const innerHeight = h - margin.top - margin.bottom;

    const radius = Math.min(innerWidth, innerHeight) / 2;
    const centerX = w / 2;
    const centerY = h / 2;

    const defs = svg.append('defs');

    // Gradient for Asset Area
    const assetGrad = defs
      .append('radialGradient')
      .attr('id', 'radar-asset-grad')
      .attr('cx', '50%')
      .attr('cy', '50%')
      .attr('r', '50%');

    assetGrad.append('stop').attr('offset', '0%').attr('stop-color', '#3b82f6').attr('stop-opacity', 0.65);
    assetGrad.append('stop').attr('offset', '100%').attr('stop-color', '#8b5cf6').attr('stop-opacity', 0.25);

    // Gradient for Sector Benchmark Area
    const sectorGrad = defs
      .append('radialGradient')
      .attr('id', 'radar-sector-grad')
      .attr('cx', '50%')
      .attr('cy', '50%')
      .attr('r', '50%');

    sectorGrad.append('stop').attr('offset', '0%').attr('stop-color', '#f59e0b').attr('stop-opacity', 0.35);
    sectorGrad.append('stop').attr('offset', '100%').attr('stop-color', '#d97706').attr('stop-opacity', 0.10);

    // Glow filter
    const filter = defs.append('filter').attr('id', 'radar-glow');
    filter.append('feGaussianBlur').attr('stdDeviation', '2.5').attr('result', 'coloredBlur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    const g = svg
      .append('g')
      .attr('transform', `translate(${centerX}, ${centerY})`);

    const totalAxes = data.length; // 5
    const angleSlice = (Math.PI * 2) / totalAxes;

    // Radius scale (0 - 100)
    const rScale = d3.scaleLinear().domain([0, 100]).range([0, radius]);

    // Concentric Web Grid Levels (20, 40, 60, 80, 100)
    const levels = [20, 40, 60, 80, 100];

    levels.forEach(level => {
      const levelRadius = rScale(level);
      const levelPoints: [number, number][] = [];

      for (let i = 0; i < totalAxes; i++) {
        const angle = i * angleSlice - Math.PI / 2;
        const x = Math.cos(angle) * levelRadius;
        const y = Math.sin(angle) * levelRadius;
        levelPoints.push([x, y]);
      }

      // Draw level polygon
      const polygonPath = levelPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ') + ' Z';

      g.append('path')
        .attr('d', polygonPath)
        .attr('fill', level === 100 ? (theme === 'dark' ? 'rgba(59, 130, 246, 0.03)' : 'rgba(59, 130, 246, 0.02)') : 'none')
        .attr('stroke', theme === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)')
        .attr('stroke-width', level === 100 ? 1.5 : 1)
        .attr('stroke-dasharray', level === 100 ? 'none' : '2,2');

      // Level text label (e.g. 20, 40, 60, 80, 100)
      g.append('text')
        .attr('x', 4)
        .attr('y', -levelRadius + 3)
        .attr('font-size', '8px')
        .attr('font-weight', '600')
        .attr('fill', theme === 'dark' ? 'rgba(255, 255, 255, 0.35)' : 'rgba(0, 0, 0, 0.35)')
        .text(level);
    });

    // Radial Axis Lines & Labels
    data.forEach((d, i) => {
      const angle = i * angleSlice - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;

      const isHovered = hoveredKey === d.key;

      // Axis line
      g.append('line')
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('x2', x)
        .attr('y2', y)
        .attr('stroke', isHovered ? '#60a5fa' : theme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)')
        .attr('stroke-width', isHovered ? 2 : 1.2);

      // Interactive Label positioning
      const labelDist = radius + 22;
      const lx = Math.cos(angle) * labelDist;
      const ly = Math.sin(angle) * labelDist;

      const labelGroup = g.append('g')
        .attr('transform', `translate(${lx}, ${ly})`)
        .attr('class', 'cursor-pointer')
        .on('mouseenter', () => setHoveredKey(d.key))
        .on('mouseleave', () => setHoveredKey(null));

      // Pillar Short Title
      labelGroup
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', ly > 10 ? '10px' : ly < -10 ? '-6px' : '3px')
        .attr('font-size', isHovered ? '11px' : '10px')
        .attr('font-weight', 'bold')
        .attr('fill', isHovered ? '#60a5fa' : theme === 'dark' ? '#e2e8f0' : '#1e293b')
        .text(d.shortLabel);

      // Score Comparison Badge text: [Asset vs Settore]
      const delta = d.assetScore - d.sectorScore;
      const deltaSign = delta > 0 ? `+${delta}` : `${delta}`;

      labelGroup
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', ly > 10 ? '22px' : ly < -10 ? '6px' : '15px')
        .attr('font-size', '8.5px')
        .attr('font-weight', '800')
        .attr('fill', isHovered ? '#38bdf8' : d.assetScore >= d.sectorScore ? '#10b981' : '#f59e0b')
        .text(`${d.assetScore} vs ${d.sectorScore} (${deltaSign})`);
    });

    // 1. Sector Average Polygon (Rendered First / Lower Layer)
    if (showSector) {
      const sectorPoints: [number, number][] = data.map((d, i) => {
        const angle = i * angleSlice - Math.PI / 2;
        const r = rScale(d.sectorScore);
        return [Math.cos(angle) * r, Math.sin(angle) * r];
      });

      const sectorPath = sectorPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ') + ' Z';

      g.append('path')
        .attr('d', sectorPath)
        .attr('fill', 'url(#radar-sector-grad)')
        .attr('stroke', '#f59e0b')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '4,3')
        .attr('opacity', 0.85);

      // Sector Vertex Dots
      sectorPoints.forEach(p => {
        g.append('circle')
          .attr('cx', p[0])
          .attr('cy', p[1])
          .attr('r', 3)
          .attr('fill', '#f59e0b')
          .attr('stroke', theme === 'dark' ? '#0f172a' : '#ffffff')
          .attr('stroke-width', 1.5);
      });
    }

    // 2. Asset Polygon (Rendered Second / Upper Layer with Glow)
    if (showAsset) {
      const assetPoints: [number, number][] = data.map((d, i) => {
        const angle = i * angleSlice - Math.PI / 2;
        const r = rScale(d.assetScore);
        return [Math.cos(angle) * r, Math.sin(angle) * r];
      });

      const assetPath = assetPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ') + ' Z';

      g.append('path')
        .attr('d', assetPath)
        .attr('fill', 'url(#radar-asset-grad)')
        .attr('stroke', '#3b82f6')
        .attr('stroke-width', 2.5)
        .attr('filter', 'url(#radar-glow)')
        .attr('opacity', 0.95);

      // Asset Vertex Circles
      assetPoints.forEach((p, i) => {
        const d = data[i];
        const isHovered = hoveredKey === d.key;
        const ptGroup = g.append('g')
          .attr('transform', `translate(${p[0]}, ${p[1]})`)
          .attr('class', 'cursor-pointer')
          .on('mouseenter', () => setHoveredKey(d.key))
          .on('mouseleave', () => setHoveredKey(null));

        // Outer glow circle
        ptGroup
          .append('circle')
          .attr('r', isHovered ? 7 : 5)
          .attr('fill', theme === 'dark' ? '#0f172a' : '#ffffff')
          .attr('stroke', isHovered ? '#60a5fa' : '#3b82f6')
          .attr('stroke-width', isHovered ? 3 : 2);

        // Inner dot
        ptGroup
          .append('circle')
          .attr('r', isHovered ? 3.5 : 2.5)
          .attr('fill', d.assetScore >= d.sectorScore ? '#10b981' : '#3b82f6');
      });
    }

    // Center Origin Dot
    g.append('circle')
      .attr('r', 3)
      .attr('fill', theme === 'dark' ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.3)');

  }, [data, theme, width, height, showAsset, showSector, hoveredKey]);

  const activePillar = data.find(d => d.key === hoveredKey);

  return (
    <div className="w-full flex flex-col items-center justify-center p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm space-y-3">
      {/* Header & Dynamic Layer Control Bar */}
      <div className="w-full flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-purple-500/15 text-purple-400 border border-purple-500/30">
            <Layers className="w-4 h-4" />
          </span>
          <div>
            <div className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
              <span>Radar Quant 5 Pilastri</span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30">
                vs Settore
              </span>
            </div>
            <p className="text-[10px] text-[var(--text-muted)]">
              Confronto algoritmico tra {ticker} e {sectorName}
            </p>
          </div>
        </div>

        {/* Dynamic Comparison Checkbox Toggles */}
        <div className="flex items-center gap-2 text-[11px] font-bold">
          <button
            onClick={() => setShowAsset(!showAsset)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border transition cursor-pointer ${
              showAsset
                ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 shadow-xs'
                : 'bg-black/20 text-[var(--text-muted)] border-[var(--border-color)] opacity-60'
            }`}
            title="Mostra/Nascondi Asset"
          >
            {showAsset ? <CheckSquare className="w-3.5 h-3.5 text-blue-400" /> : <Square className="w-3.5 h-3.5" />}
            <span className="truncate max-w-[90px]">{ticker}</span>
            <span className="font-mono text-[10px] text-blue-400">{assetAvg}</span>
          </button>

          <button
            onClick={() => setShowSector(!showSector)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border transition cursor-pointer ${
              showSector
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-xs'
                : 'bg-black/20 text-[var(--text-muted)] border-[var(--border-color)] opacity-60'
            }`}
            title="Mostra/Nascondi Media Settore"
          >
            {showSector ? <CheckSquare className="w-3.5 h-3.5 text-amber-400" /> : <Square className="w-3.5 h-3.5" />}
            <span className="truncate max-w-[90px]">Settore</span>
            <span className="font-mono text-[10px] text-amber-400">{sectorAvg}</span>
          </button>
        </div>
      </div>

      {/* D3 SVG Canvas Container */}
      <div className="relative w-full flex items-center justify-center">
        <svg
          ref={svgRef}
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="overflow-visible select-none max-w-full"
        />

        {/* Dynamic Summary Float Badge */}
        <div className="absolute top-1 right-1 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-xl border border-[var(--border-color)] text-right space-y-0.5">
          <div className="text-[9px] uppercase font-bold text-[var(--text-muted)]">Spread vs Settore</div>
          <div className={`text-xs font-black flex items-center justify-end gap-1 ${spread >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {spread >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            <span>{spread >= 0 ? `+${spread}` : spread} pts</span>
          </div>
        </div>
      </div>

      {/* Interactive Tooltip / Detail Card on Pillar Hover */}
      {activePillar ? (
        <div className="w-full p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-xs space-y-1 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <div className="font-bold text-white flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>{activePillar.label}</span>
            </div>
            <div className="font-mono text-[11px] font-bold space-x-2">
              <span className="text-blue-400">{ticker}: {activePillar.assetScore}</span>
              <span className="text-slate-400">|</span>
              <span className="text-amber-400">Settore: {activePillar.sectorScore}</span>
              <span className="text-slate-400">|</span>
              <span className={activePillar.assetScore >= activePillar.sectorScore ? 'text-emerald-400' : 'text-rose-400'}>
                Δ {activePillar.assetScore - activePillar.sectorScore >= 0 ? `+${activePillar.assetScore - activePillar.sectorScore}` : activePillar.assetScore - activePillar.sectorScore}
              </span>
            </div>
          </div>
          <p className="text-[10.5px] text-slate-300 leading-tight">
            {activePillar.commentary}
          </p>
        </div>
      ) : (
        <div className="text-center text-[10px] text-[var(--text-muted)] italic">
          💡 Passa il mouse sopra un asse per esplorare il confronto e la diagnosi del singolo pilastro
        </div>
      )}

      {/* 5 Pillars Comparison Mini Cards Grid */}
      <div className="w-full grid grid-cols-2 sm:grid-cols-5 gap-1.5 pt-2 border-t border-[var(--border-color)]">
        {data.map(p => {
          const delta = p.assetScore - p.sectorScore;
          const isOutperforming = delta > 0;
          return (
            <div
              key={p.key}
              onMouseEnter={() => setHoveredKey(p.key)}
              onMouseLeave={() => setHoveredKey(null)}
              className={`p-2 rounded-xl border transition text-center space-y-1 cursor-pointer ${
                hoveredKey === p.key
                  ? 'bg-blue-500/15 border-blue-500/50 shadow-sm'
                  : 'bg-black/20 border-[var(--border-color)] hover:border-slate-500'
              }`}
            >
              <span className="text-[9.5px] text-[var(--text-muted)] uppercase block truncate font-bold">
                {p.shortLabel}
              </span>
              <div className="flex items-center justify-center gap-1 font-mono text-[11px] font-extrabold">
                <span className="text-blue-400">{p.assetScore}</span>
                <span className="text-[9px] text-[var(--text-muted)]">/</span>
                <span className="text-amber-400 text-[10px]">{p.sectorScore}</span>
              </div>
              <div className={`text-[9px] font-bold px-1 py-0.2 rounded flex items-center justify-center gap-0.5 ${
                isOutperforming ? 'bg-emerald-500/15 text-emerald-400' : delta === 0 ? 'bg-blue-500/15 text-blue-400' : 'bg-rose-500/15 text-rose-400'
              }`}>
                {isOutperforming ? <ArrowUpRight className="w-2.5 h-2.5" /> : delta < 0 ? <ArrowDownRight className="w-2.5 h-2.5" /> : null}
                <span>{delta >= 0 ? `+${delta}` : delta}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
