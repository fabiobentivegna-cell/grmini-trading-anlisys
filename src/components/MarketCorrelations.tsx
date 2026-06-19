import React, { useState, useMemo } from "react";
import { Instrument } from "../types";
import { 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight, 
  HelpCircle, 
  Layers, 
  LineChart, 
  Compass, 
  Briefcase,
  GitCommit,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";

interface MarketCorrelationsProps {
  activeInstrument: Instrument;
  allInstruments: Instrument[];
  isDark: boolean;
}

// Definition of reference benchmark assets
interface ReferenceAsset {
  sym: string;
  name: string;
  category: "Azionario" | "Forex" | "Commodities" | "Crypto" | "Bonds";
  baseCorrelations: { [market: string]: number }; // base correlation per market category or asset type
}

const REFERENCE_BENCHMARKS: ReferenceAsset[] = [
  { 
    sym: "SPX", 
    name: "S&P 500 Index", 
    category: "Azionario", 
    baseCorrelations: { italia: 0.65, usa: 0.88, forex: -0.20, commodities: 0.35, crypto: 0.55 } 
  },
  { 
    sym: "QQQ", 
    name: "Nasdaq 100 Index", 
    category: "Azionario", 
    baseCorrelations: { italia: 0.50, usa: 0.92, forex: -0.25, commodities: 0.20, crypto: 0.65 } 
  },
  { 
    sym: "FTSEMIB", 
    name: "FTSE MIB Index", 
    category: "Azionario", 
    baseCorrelations: { italia: 0.95, usa: 0.60, forex: 0.15, commodities: 0.30, crypto: 0.30 } 
  },
  { 
    sym: "DXY", 
    name: "US Dollar Index", 
    category: "Forex", 
    baseCorrelations: { italia: -0.35, usa: -0.40, forex: -0.90, commodities: -0.60, crypto: -0.45 } 
  },
  { 
    sym: "GOLD", 
    name: "Gold Spot (XAU/USD)", 
    category: "Commodities", 
    baseCorrelations: { italia: -0.10, usa: -0.15, forex: 0.35, commodities: 0.70, crypto: 0.25 } 
  },
  { 
    sym: "BRENT", 
    name: "Brent Crude Oil", 
    category: "Commodities", 
    baseCorrelations: { italia: 0.30, usa: 0.25, forex: 0.10, commodities: 0.80, crypto: 0.15 } 
  },
  { 
    sym: "BTC", 
    name: "Bitcoin (BTC/USD)", 
    category: "Crypto", 
    baseCorrelations: { italia: 0.25, usa: 0.60, forex: -0.30, commodities: 0.15, crypto: 0.98 } 
  },
  { 
    sym: "US10Y", 
    name: "US 10-Yr Treasury Yield", 
    category: "Bonds", 
    baseCorrelations: { italia: 0.35, usa: -0.25, forex: 0.40, commodities: -0.15, crypto: -0.35 } 
  }
];

export default function MarketCorrelations({ activeInstrument, allInstruments, isDark }: MarketCorrelationsProps) {
  const [timeframe, setTimeframe] = useState<"30d" | "90d" | "1y">("90d");
  const [selectedBenchmarkSym, setSelectedBenchmarkSym] = useState<string>("SPX");

  // Determine a unique stable hash based on symbol name to make simulated data unique, repeatable and continuous
  const symbolHash = useMemo(() => {
    let hash = 0;
    const str = activeInstrument.sym;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash);
  }, [activeInstrument.sym]);

  // Generate realistic correlation coefficients for each reference asset
  const correlations = useMemo(() => {
    return REFERENCE_BENCHMARKS.map((benchmark) => {
      // 1. Base value from benchmark rules
      let baseCorr = benchmark.baseCorrelations[activeInstrument.market] || 0.2;

      // Adjust based on specific sector or asset characteristic
      const sym = activeInstrument.sym.toUpperCase();
      const isTech = ["AAPL", "AMD", "AVGO", "NVDA", "MSFT", "STM", "ADBE", "CRM"].includes(sym);
      const isBank = ["ISP", "UCG", "BAMI", "BPE", "MB", "BAC", "JPM"].includes(sym);
      const isEnergy = ["ENI", "TEN", "SPM", "ERG", "CVX", "XOM"].includes(sym);
      const isCrypto = activeInstrument.market === "crypto";
      const isForex = activeInstrument.market === "forex";

      if (benchmark.sym === "QQQ" && isTech) {
        baseCorr = Math.min(0.97, baseCorr + 0.15);
      }
      if (benchmark.sym === "SPX" && isTech) {
        baseCorr = Math.min(0.95, baseCorr + 0.10);
      }
      if (benchmark.sym === "BRENT" && isEnergy) {
        baseCorr = Math.min(0.92, baseCorr + 0.50);
      }
      if (benchmark.sym === "US10Y" && isBank) {
        // Banks correlate positively with yields
        baseCorr = Math.min(0.70, baseCorr + 0.25);
      }
      if (benchmark.sym === "US10Y" && isTech) {
        // Tech correlates negatively with high interest rates
        baseCorr = Math.max(-0.65, baseCorr - 0.20);
      }
      if (benchmark.sym === "BTC" && isCrypto) {
        baseCorr = Math.min(0.99, baseCorr + 0.25);
      }
      if (isForex && benchmark.category === "Forex") {
        baseCorr = baseCorr * 0.95;
      }

      // 2. Add stable minor variance depending on selected Timeframe and asset symbol hash
      const tfModifier = timeframe === "30d" ? 0.08 : timeframe === "90d" ? 0.0 : -0.06;
      const uniqueOffset = ((symbolHash % 17) - 8) / 100; // -0.08 to +0.08
      
      let finalCorr = baseCorr + tfModifier + uniqueOffset;
      // Clamp to strict financial boundaries [-0.99, 0.99]
      finalCorr = Math.max(-0.98, Math.min(0.98, finalCorr));

      // Forex self or inverse checks
      if (activeInstrument.sym === benchmark.sym) {
        finalCorr = 1.0;
      }

      // Calculate Beta based on correlation and simulated volatility ratio
      const baseVolatilityRatio = 1.0 + ((symbolHash % 9) - 4) / 10; // 0.6 to 1.4
      const beta = parseFloat((finalCorr * baseVolatilityRatio).toFixed(2));

      return {
        ...benchmark,
        coefficient: parseFloat(finalCorr.toFixed(2)),
        beta: beta === 0 ? 0.1 : beta
      };
    });
  }, [activeInstrument, timeframe, symbolHash]);

  const activeCorrelation = useMemo(() => {
    return correlations.find(c => c.sym === selectedBenchmarkSym) || correlations[0];
  }, [correlations, selectedBenchmarkSym]);

  // Generate simulated historical rolling correlation data points for the visual line chart
  const historicalPoints = useMemo(() => {
    const pointsCount = timeframe === "30d" ? 30 : timeframe === "90d" ? 45 : 60;
    const points: Array<{ label: string; value: number }> = [];
    const baseValue = activeCorrelation.coefficient;
    
    for (let i = 0; i < pointsCount; i++) {
      // Create a smooth rolling wave representing changes in historical correlation
      const wave = Math.sin((i / pointsCount) * Math.PI * 2.5 + (symbolHash % 5)) * 0.12;
      const randomNoise = (Math.sin(i * 123 + symbolHash) * 0.03);
      let pointVal = baseValue + wave + randomNoise;
      pointVal = Math.max(-0.99, Math.min(0.99, pointVal));
      
      let label = "";
      if (timeframe === "30d") label = `T-${30 - i}d`;
      else if (timeframe === "90d") label = `W-${Math.ceil((45 - i) / 5)}`;
      else label = `M-${Math.ceil((60 - i) / 5)}`;

      points.push({ label, value: parseFloat(pointVal.toFixed(2)) });
    }
    return points;
  }, [activeCorrelation, timeframe, symbolHash]);

  // Generate simulated scatter plot coordinates of daily returns for activeInstrument vs selected benchmark
  const scatterData = useMemo(() => {
    const count = 35;
    const points: Array<{ x: number; y: number }> = [];
    const corr = activeCorrelation.coefficient;
    const beta = activeCorrelation.beta;
    
    for (let i = 0; i < count; i++) {
      // Standard normal distribution approximation using Central Limit Theorem for benchmark returns
      let x = 0;
      for (let j = 0; j < 6; j++) {
        x += Math.cos(i * 15 + j * 97 + symbolHash) / 3;
      }
      x = x * 1.5; // Benchmark return in % (approx -3% to +3%)

      // Active asset return calculated using Beta and residual idiosyncratic noise
      let residual = 0;
      for (let j = 0; j < 6; j++) {
        residual += Math.sin(i * 47 + j * 113 + symbolHash * 2) / 3;
      }
      
      // Higher correlation means lower residual noise
      const noiseMultiplier = Math.sqrt(1 - corr * corr) * 1.2;
      const y = beta * x + residual * noiseMultiplier;

      points.push({ 
        x: parseFloat(x.toFixed(2)), 
        y: parseFloat(y.toFixed(2)) 
      });
    }
    return points;
  }, [activeCorrelation, symbolHash]);

  // Categorize correlation strength helper
  const getCorrelationCategory = (r: number) => {
    const absR = Math.abs(r);
    if (absR >= 0.75) return { text: r > 0 ? "Forte Correlazione Diretta" : "Forte Correlazione Inversa", color: r > 0 ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" : "text-sky-400 bg-sky-400/10 border-sky-400/20" };
    if (absR >= 0.4) return { text: r > 0 ? "Correlazione Positiva Moderata" : "Correlazione Negativa Moderata", color: r > 0 ? "text-teal-400 bg-teal-400/10 border-teal-400/20" : "text-sky-500 bg-sky-500/10 border-sky-500/20" };
    if (absR >= 0.15) return { text: r > 0 ? "Correlazione Positiva Debole" : "Correlazione Negativa Debole", color: "text-amber-500 bg-amber-500/10 border-amber-500/20" };
    return { text: "Assenza di Correlazione (Scostamento Neutro)", color: "text-neutral-400 bg-neutral-400/10 border-neutral-400/20" };
  };

  const currentCategory = getCorrelationCategory(activeCorrelation.coefficient);

  // Quick advice description helper
  const getCorrelationAdviceLabel = (corr: number, name: string) => {
    if (corr >= 0.70) {
      return `Il titolo si muove in stretta sintonia con ${name}. Nelle strategie di portafoglio, l'abbinamento di entrambi i titoli amplifica il rischio sistemico senza dare benefici significativi di diversificazione.`;
    }
    if (corr <= -0.60) {
      return `È presente una robusta correlazione contraria rispetto a ${name}. Questo asset rappresenta uno strumento eccellente per scopi di copertura naturale (hedging) o diversificazione del rischio complessivo.`;
    }
    if (Math.abs(corr) < 0.25) {
      return `Il comportamento del titolo è slegato e indipendente da ${name}. Ottimo ingrediente di asset allocation per de-correlare l'andamento del conto o ridurre il prelievo medio di capitale (Drawdown).`;
    }
    return `Esiste un legame di intensità moderata con ${name}. Le variazioni di mercato del saggio di riferimento influenzano parzialmente l'andamento del titolo, ma prevalgono le dinamiche idiosincratiche e aziendali.`;
  };

  return (
    <div id="market_correlations_section" className={`p-4 rounded-lg border flex flex-col gap-4 ${isDark ? "bg-[#111318] border-[#ffffff12]" : "bg-white border-[#e2e5ec]"}`}>
      
      {/* SECTION HEADER */}
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-2 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Compass className="w-4.5 h-4.5 text-[var(--green)]" />
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-[var(--text1)]">
            🌐 Matrice di Correlazione e Interazione Intermarket
          </h3>
        </div>
        
        {/* Timeframe switch button */}
        <div className="flex bg-[var(--bg2)] rounded border border-[var(--border)] p-0.5" id="corr_timeframe_selector">
          {(["30d", "90d", "1y"] as const).map((tf) => (
            <button
              key={tf}
              id={`corr_tf_btn_${tf}`}
              onClick={() => setTimeframe(tf)}
              className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition duration-200 ${
                timeframe === tf ? "bg-[var(--green)] text-black" : "text-[var(--text2)] hover:text-white"
              }`}
            >
              {tf === "30d" ? "30 Giorni" : tf === "90d" ? "90 Giorni" : "1 Anno"}
            </button>
          ))}
        </div>
      </div>

      <p className="text-[11px] text-[var(--text3)] leading-relaxed">
        Analisi statistica delle relazioni inter-asset tra <strong>{activeInstrument.sym} ({activeInstrument.name})</strong> e i principali mercati globali di riferimento. La correlazione misura l'intensità del legame lineare dei rendimenti giornalieri.
      </p>

      {/* BENCHMARKS GRID & VISUAL HEATMAP */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {correlations.map((b) => {
          const isSelected = selectedBenchmarkSym === b.sym;
          
          // Compute color blocks based on correlation coefficient
          let bgColor = "hover:bg-[var(--bg2)]";
          let badgeColor = "text-neutral-400 bg-neutral-500/10";
          
          if (b.coefficient >= 0.7) {
            bgColor = isSelected ? "bg-emerald-950/20 border-emerald-500/50" : "hover:bg-emerald-500/5 border-emerald-500/10";
            badgeColor = "text-emerald-400 bg-emerald-500/10";
          } else if (b.coefficient >= 0.3) {
            bgColor = isSelected ? "bg-teal-950/20 border-teal-500/50" : "hover:bg-teal-500/5 border-teal-500/10";
            badgeColor = "text-teal-400 bg-teal-500/10";
          } else if (b.coefficient <= -0.6) {
            bgColor = isSelected ? "bg-indigo-950/20 border-indigo-500/50" : "hover:bg-indigo-500/5 border-indigo-500/10";
            badgeColor = "text-indigo-400 bg-indigo-500/10";
          } else if (b.coefficient <= -0.2) {
            bgColor = isSelected ? "bg-sky-950/20 border-sky-400/50" : "hover:bg-sky-400/5 border-sky-400/10";
            badgeColor = "text-sky-400 bg-sky-400/10";
          } else {
            bgColor = isSelected ? "bg-neutral-800/35 border-[var(--border)]" : "hover:bg-[var(--bg2)] border-transparent";
            badgeColor = "text-neutral-400 bg-neutral-500/10";
          }

          return (
            <div
              key={b.sym}
              id={`corr_card_${b.sym}`}
              onClick={() => setSelectedBenchmarkSym(b.sym)}
              className={`p-3 rounded-lg border cursor-pointer transition flex flex-col justify-between gap-1.5 ${bgColor} ${
                isSelected ? "ring-1 ring-[var(--green)] shadow-md" : "border-[var(--border)]"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase tracking-wider text-[var(--text3)] font-mono font-medium">{b.category}</span>
                  <span className="text-xs font-sans font-black text-[var(--text1)]">{b.sym}</span>
                </div>
                <span className={`text-[10px] font-mono font-extrabold px-1.5 py-0.5 rounded ${badgeColor}`}>
                  {b.coefficient >= 0 ? "+" : ""}{b.coefficient}
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-[var(--text3)] leading-none mt-1">
                <span className="truncate">{b.name}</span>
                <span className="font-mono font-semibold shrink-0">Beta: {b.beta}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* FOCUS AREA: SELECTED REFERENCE DETAILED SCATTER & ADVANCED ANALYSIS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 border-t border-[var(--border)] pt-4 mt-2">
        
        {/* LEFT COLUMN: SCATTER PLOT & BETA REGRESSION */}
        <div className="lg:col-span-4 flex flex-col gap-3">
          <div className="flex items-center gap-1.5 pb-1">
            <LineChart className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--text2)]">Scatter Plot del Rischio &amp; Beta</span>
          </div>

          <div className="relative h-44 w-full bg-[var(--bg2)] border border-[var(--border)] rounded-lg p-3 flex flex-col items-center justify-center">
            {/* Scatter diagram visualization using simple vector SVG */}
            <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible">
              {/* Grid Lines */}
              <line x1="0" y1="100" x2="200" y2="100" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
              <line x1="100" y1="0" x2="100" y2="200" stroke="rgba(255,255,255,0.07)" strokeWidth="1" strokeDasharray="2,2" />
              
              <text x="180" y="112" className="text-[7px] fill-[var(--text3)] font-mono text-right" textAnchor="end">R_bench</text>
              <text x="106" y="14" className="text-[7px] fill-[var(--text3)] font-mono">R_asset</text>

              {/* Regression/Beta line */}
              {(() => {
                const b = activeCorrelation.beta;
                // Line function y = b * x
                // Let's draw it centered (100, 100)
                const startX = 20;
                const startY = 100 + (100 - startX) * b * 0.7; // scaled down to stay in box
                const endX = 180;
                const endY = 100 - (endX - 100) * b * 0.7;
                return (
                  <line 
                    x1={startX} 
                    y1={startY} 
                    x2={endX} 
                    y2={endY} 
                    stroke="rgba(168, 85, 247, 0.65)" 
                    strokeWidth="1.5" 
                    id="regression_beta_line"
                  />
                );
              })()}

              {/* Scatter Point Markers */}
              {scatterData.map((pt, index) => {
                // Map coordinates from variance range roughly to box inside 200x200
                const mappedX = 100 + pt.x * 24;
                const mappedY = 100 - pt.y * 24;
                return (
                  <circle
                    key={index}
                    cx={Math.max(10, Math.min(190, mappedX))}
                    cy={Math.max(10, Math.min(190, mappedY))}
                    r="2.5"
                    fill="rgba(59, 130, 246, 0.65)"
                    stroke={isDark ? "#111318" : "#ffffff"}
                    strokeWidth="0.5"
                  />
                );
              })}
            </svg>
            <div className="absolute bottom-2 left-2 flex gap-2 text-[8px] font-mono text-[var(--text3)]">
              <span>🔵 Rendimenti Quotidiani</span>
              <span className="text-purple-400">─ Linea di Regressione (Beta: {activeCorrelation.beta})</span>
            </div>
          </div>

          <div className="bg-[var(--bg2)] rounded border border-[var(--border)] p-2.5 flex items-center justify-between text-[10px] font-mono leading-none">
            <span className="text-[var(--text3)]">Varianza Relativa:</span>
            <span className="font-bold text-[var(--text1)]">{Math.abs(Math.round(activeCorrelation.coefficient * 100))}% Spiegata</span>
          </div>
        </div>

        {/* MIDDLE COLUMN: ROLLING CORRELATION TREND */}
        <div className="lg:col-span-4 flex flex-col gap-3">
          <div className="flex items-center gap-1.5 pb-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--text2)]">Grafico Storico Rolling</span>
          </div>

          <div className="relative h-44 w-full bg-[var(--bg2)] border border-[var(--border)] rounded-lg p-3 flex flex-col items-center justify-center">
            {/* Custom SVG line chart of rolling correlation trend */}
            <svg viewBox="0 0 200 120" className="w-full h-full overflow-visible">
              {/* Central axis line representing zero correlation */}
              <line x1="0" y1="60" x2="200" y2="60" stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="3,3" />
              
              {/* Upper threshold (+0.5) and lower threshold (-0.5) */}
              <line x1="0" y1="30" x2="200" y2="30" stroke="rgba(16, 185, 129, 0.08)" strokeWidth="0.75" />
              <line x1="0" y1="90" x2="200" y2="90" stroke="rgba(239, 68, 68, 0.08)" strokeWidth="0.75" />

              {/* Dynamic spline path */}
              {(() => {
                const points = historicalPoints;
                const widthStep = 200 / (points.length - 1);
                
                const pointsString = points.map((p, idx) => {
                  const x = idx * widthStep;
                  // Correlation coefficient -1 to +1 mapped to height 120 (0 representing +1.0, 120 representing -1.0)
                  const y = 60 - p.value * 50; 
                  return `${x},${y}`;
                }).join(" ");

                return (
                  <>
                    <polyline
                      fill="none"
                      stroke="url(#rolling-gradient)"
                      strokeWidth="1.8"
                      points={pointsString}
                    />
                    {/* Pulsing indicator at current value */}
                    <circle
                      cx={200}
                      cy={60 - points[points.length - 1].value * 50}
                      r="4"
                      className="fill-emerald-400 stroke-[var(--bg2)] stroke-2 animate-pulse"
                    />
                  </>
                );
              })()}

              <defs>
                <linearGradient id="rolling-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.4" />
                  <stop offset="50%" stopColor="#c084fc" stopOpacity="0.75" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="1" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute top-2 right-2 text-[8px] font-mono text-[var(--green)]">
              Valore attuale: {activeCorrelation.coefficient}
            </div>
            <div className="absolute bottom-2 left-2 flex justify-between w-[92%] text-[7px] font-mono text-[var(--text3)]">
              <span>{historicalPoints[0]?.label}</span>
              <span>Cronologia Coefficiente Rolling</span>
              <span>Oggi</span>
            </div>
          </div>

          <div className="bg-[var(--bg2)] rounded border border-[var(--border)] p-2.5 flex items-center justify-between text-[10px] font-mono leading-none">
            <span className="text-[var(--text3)]">Stabilità Trend:</span>
            <span className="font-bold text-[var(--green)]">Elevata (Inclinazione {activeCorrelation.coefficient > 0 ? "Alzante" : "Calante"})</span>
          </div>
        </div>

        {/* RIGHT COLUMN: CORRELATION INSIGHTS & HEDGING STRATEGY */}
        <div className="lg:col-span-4 flex flex-col gap-2.5 justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5 pb-1">
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--text2)]">Metriche Avanzate &amp; Advisory</span>
            </div>

            {/* Strength Badge */}
            <div className={`p-2.5 rounded border text-xs font-sans flex flex-col gap-1 ${currentCategory.color}`}>
              <div className="flex items-center justify-between flex-wrap gap-1">
                <span className="font-extrabold uppercase text-[9px] tracking-wider">Coefficiente di Pearson:</span>
                <span className="font-mono font-black">{activeCorrelation.coefficient}</span>
              </div>
              <span className="text-xs font-bold leading-tight mt-0.5">{currentCategory.text}</span>
            </div>

            {/* Written Advice Panel */}
            <p className="text-[10.5px] text-[var(--text2)] leading-relaxed italic bg-[var(--bg2)]/50 p-2.5 rounded border border-[var(--border)]">
              {getCorrelationAdviceLabel(activeCorrelation.coefficient, activeCorrelation.name)}
            </p>
          </div>

          {/* Portfolio Beta Hedging Simulator */}
          <div className="mt-1 p-2.5 rounded bg-purple-500/5 border border-purple-500/15 flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-[10px] font-extrabold uppercase text-[var(--text1)] tracking-wider">Hedging &amp; Risk Manager</span>
            </div>
            
            <p className="text-[9.5px] text-[var(--text3)] leading-snug">
              Per isolare il rischio idiosincratico e vaccinare un investimento di <strong>€10.000</strong> su <strong>{activeInstrument.sym}</strong> dalle oscillazioni di <strong>{activeCorrelation.sym}</strong>:
            </p>

            <div className="flex items-center justify-between text-[10px] font-mono bg-[var(--bg3)] px-2 py-1.5 rounded border border-[var(--border)]">
              <span className="text-[var(--text3)]">Direzione Copertura:</span>
              <span className={`font-black ${activeCorrelation.beta > 0 ? "text-purple-400" : "text-amber-500"}`}>
                {activeCorrelation.beta > 0 ? `SHRT / VENDI ${activeCorrelation.sym}` : `LONG / COMPRA ${activeCorrelation.sym}`}
              </span>
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono bg-[var(--bg3)] px-2 py-1.5 rounded border border-[var(--border)]">
              <span className="text-[var(--text3)]">Controvalore Copertura:</span>
              <span className="font-black text-white">
                €{Math.abs(Math.round(10000 * activeCorrelation.beta)).toLocaleString("it-IT")}
              </span>
            </div>
          </div>
          
        </div>

      </div>

    </div>
  );
}
