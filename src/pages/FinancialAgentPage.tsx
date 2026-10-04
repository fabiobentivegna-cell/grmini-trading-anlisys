import React, { useState, useEffect } from 'react';
import {
  BrainCircuit,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  AlertTriangle,
  Compass,
  Gauge,
  Activity,
  Layers,
  Sparkles,
  BarChart3,
  Calendar,
  Send,
  Download,
  Copy,
  Check,
  RefreshCw,
  Info,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Zap,
  Users,
  PieChart,
  BookOpen,
  Camera,
  Upload,
  Sliders,
  CheckCircle2,
  ShieldAlert
} from 'lucide-react';
import { CandleData, FinancialIntelligenceReport, ProboAnalysisReport as ProboAnalysisReportType } from '../types';
import { geminiService } from '../services/geminiService';
import { QuantGaugeChart } from '../components/QuantGaugeChart';
import { PillarsRadarChart } from '../components/PillarsRadarChart';
import { ProboAnalysisReport } from '../components/ProboAnalysisReport';

interface FinancialAgentPageProps {
  ticker: string;
  category?: string;
  candles?: CandleData[];
  theme: 'dark' | 'light';
  onSelectTicker?: (t: string) => void;
}

export const FinancialAgentPage: React.FC<FinancialAgentPageProps> = ({
  ticker,
  category = 'Mercato Azionario',
  candles = [],
  theme,
  onSelectTicker
}) => {
  const [report, setReport] = useState<FinancialIntelligenceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [customPrompt, setCustomPrompt] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'quant' | 'investingpro' | 'forecaster' | 'flows' | 'probo'>('all');

  // Giacomo Probo AI Analysis State
  const [proboReport, setProboReport] = useState<ProboAnalysisReportType | null>(null);
  const [proboLoading, setProboLoading] = useState(false);
  const [proboScreenshot, setProboScreenshot] = useState<string | null>(null);
  const [proboNotes, setProboNotes] = useState('');
  const [proboTimeframe, setProboTimeframe] = useState<'1d' | '1h' | '15m' | '5m'>('1d');
  const [proboCopied, setProboCopied] = useState(false);

  const fetchAnalysis = async (promptOverride?: string) => {
    setLoading(true);
    try {
      const currentClose = candles.length > 0 ? candles[candles.length - 1].close : 34500;
      const res = await geminiService.generateFinancialAgentReport({
        ticker,
        currentPrice: currentClose,
        candles,
        customQuery: promptOverride
      });
      setReport(res);
    } catch (err) {
      console.error('Error generating financial intelligence report:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProboAnalysis = async (screenshotOverride?: string) => {
    setProboLoading(true);
    try {
      const currentClose = candles.length > 0 ? candles[candles.length - 1].close : 34500;
      const res = await geminiService.analizzaGraficoConProbo({
        ticker,
        timeframe: proboTimeframe,
        currentPrice: currentClose,
        candles,
        imageBase64: screenshotOverride !== undefined ? screenshotOverride : (proboScreenshot || undefined),
        customNotes: proboNotes || undefined
      });
      setProboReport(res);
    } catch (err) {
      console.error('Errore analisi Giacomo Probo AI:', err);
    } finally {
      setProboLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
    fetchProboAnalysis();
  }, [ticker]);

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPrompt.trim()) return;
    fetchAnalysis(customPrompt);
  };

  const handleCaptureChartSnapshot = () => {
    try {
      // Find all canvas elements on page
      const canvases = document.querySelectorAll('canvas');
      if (canvases.length > 0) {
        const firstCanvas = canvases[0];
        const width = firstCanvas.width || 800;
        const height = firstCanvas.height || 500;
        const mergedCanvas = document.createElement('canvas');
        mergedCanvas.width = width;
        mergedCanvas.height = height;
        const ctx = mergedCanvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = theme === 'dark' ? '#131722' : '#ffffff';
          ctx.fillRect(0, 0, width, height);
          canvases.forEach(c => {
            try {
              ctx.drawImage(c, 0, 0);
            } catch {}
          });
          const b64 = mergedCanvas.toDataURL('image/png');
          setProboScreenshot(b64);
          fetchProboAnalysis(b64);
          return;
        }
      }

      // If no canvas on current page, render a synthetic snapshot of candle data
      const simCanvas = document.createElement('canvas');
      simCanvas.width = 800;
      simCanvas.height = 450;
      const ctx = simCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#131722';
        ctx.fillRect(0, 0, 800, 450);
        ctx.strokeStyle = '#2962ff';
        ctx.lineWidth = 2;
        ctx.strokeRect(10, 10, 780, 430);
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px sans-serif';
        ctx.fillText(`Zenith Terminal Snapshot: ${ticker} [${proboTimeframe.toUpperCase()}]`, 25, 35);
        ctx.fillStyle = '#787b86';
        ctx.fillText(`Stocastico 10-6-3 | Bollinger 5/1.8 | Heiken Ashi | Volume Profile`, 25, 60);

        // Draw simple candlesticks
        const arr = candles.slice(-40);
        if (arr.length > 0) {
          const minP = Math.min(...arr.map(c => c.low));
          const maxP = Math.max(...arr.map(c => c.high));
          const range = maxP - minP || 1;
          const barW = Math.max(4, Math.floor(700 / arr.length) - 2);

          arr.forEach((c, i) => {
            const x = 30 + i * (barW + 3);
            const isUp = c.close >= c.open;
            const yOpen = 400 - ((c.open - minP) / range) * 300;
            const yClose = 400 - ((c.close - minP) / range) * 300;
            const yHigh = 400 - ((c.high - minP) / range) * 300;
            const yLow = 400 - ((c.low - minP) / range) * 300;

            ctx.strokeStyle = isUp ? '#089981' : '#f23645';
            ctx.fillStyle = isUp ? '#089981' : '#f23645';

            // Wick
            ctx.beginPath();
            ctx.moveTo(x + barW / 2, yHigh);
            ctx.lineTo(x + barW / 2, yLow);
            ctx.stroke();

            // Body
            const topY = Math.min(yOpen, yClose);
            const bodyH = Math.max(2, Math.abs(yClose - yOpen));
            ctx.fillRect(x, topY, barW, bodyH);
          });
        }

        const b64 = simCanvas.toDataURL('image/png');
        setProboScreenshot(b64);
        fetchProboAnalysis(b64);
      }
    } catch (err) {
      console.warn('Errore cattura screenshot grafico:', err);
      fetchProboAnalysis();
    }
  };

  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const b64 = reader.result as string;
      setProboScreenshot(b64);
      fetchProboAnalysis(b64);
    };
    reader.readAsDataURL(file);
  };

  const handleCopySummary = () => {
    if (!report) return;
    const text = `=== FINANCIAL INTELLIGENCE REPORT: ${report.ticker} ===
Prezzo Corrente: ${report.current_price} ${report.currency}
Smart Quant Score: ${report.smart_quant.score}/100 [${report.smart_quant.signal}]
Fair Value Aggregato: ${report.fair_value.aggregated_fair_value} (${report.fair_value.upside_downside_pct > 0 ? '+' : ''}${report.fair_value.upside_downside_pct}%)
Salute Finanziaria: ${report.financial_health.overall_score}/100 (${report.financial_health.rating_stars}⭐)
Market Mood Meter: ${report.market_mood.score}/100 [${report.market_mood.state}]
Timing Ottimale: ${report.market_mood.entry_timing.action} (Entry: ${report.market_mood.entry_timing.optimal_entry}, TP: ${report.market_mood.entry_timing.take_profit}, SL: ${report.market_mood.entry_timing.stop_loss})
${report.executive_summary}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCopyProboSummary = () => {
    if (!proboReport) return;
    const text = `=== REPORT ANALISI AI GIACOMO PROBO: ${proboReport.ticker} [${proboReport.timeframe}] ===
Verdetto Operativo: ${proboReport.operationVerdict} | Size: ${proboReport.sizeManagement.recommendedSize}
Confluenza 5 Tecniche: ${proboReport.confluence.totalConfirmedCount}/5
Setup Operativo:
- Prezzo Ingresso: €${proboReport.tacticalSetup.entryPrice}
- Stop Loss: €${proboReport.tacticalSetup.stopLossPrice} (${proboReport.tacticalSetup.stopLossPlacementReason})
- Take Profit 1 (50% Scaling Out & Stop a Breakeven): €${proboReport.tacticalSetup.takeProfit1}
- Take Profit 2: €${proboReport.tacticalSetup.takeProfit2}
- Rapporto Rischio/Rendimento: 1:${proboReport.tacticalSetup.riskRewardRatio}
Stocastico Lento: ${proboReport.confluence.oscillators.slowStochastic.kValue}/${proboReport.confluence.oscillators.slowStochastic.dValue} (${proboReport.confluence.oscillators.slowStochastic.zone})
Bande di Bollinger: ${proboReport.confluence.oscillators.bollingerBands.pricePosition}
Sintesi: ${proboReport.executiveSummary}`;
    navigator.clipboard.writeText(text);
    setProboCopied(true);
    setTimeout(() => setProboCopied(false), 2500);
  };

  const handleExportJson = () => {
    if (!report) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(report, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `financial-agent-${report.ticker}-${new Date().toISOString().split('T')[0]}.json`);
    dlAnchor.click();
  };

  const handleExportProboJson = () => {
    if (!proboReport) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(proboReport, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `probo-analysis-${proboReport.ticker}-${proboReport.timeframe}-${new Date().toISOString().split('T')[0]}.json`);
    dlAnchor.click();
  };

  const getSignalBadgeColor = (signal: string) => {
    switch (signal) {
      case 'STRONG BUY':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-emerald-500/10';
      case 'BUY':
        return 'bg-green-500/20 text-green-400 border-green-500/40';
      case 'HOLD / NEUTRAL':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
      case 'SELL':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/40';
      case 'STRONG SELL':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/50';
      default:
        return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
    }
  };

  const getMoodColor = (mood: string) => {
    switch (mood) {
      case 'IPERVENDUTO ESTREMO':
        return 'text-indigo-400 bg-indigo-500/15 border-indigo-500/30';
      case 'IPERVENDUTO':
        return 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30';
      case 'NEUTRALE':
        return 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30';
      case 'IPERCOMPRATO':
        return 'text-amber-400 bg-amber-500/15 border-amber-500/30';
      case 'IPERCOMPRATO ESTREMO':
        return 'text-rose-400 bg-rose-500/15 border-rose-500/30';
      default:
        return 'text-slate-400 bg-slate-500/15 border-slate-500/30';
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[var(--bg-main)] text-[var(--text-main)] p-4 md:p-6 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-purple-900/40 border border-blue-700/30 shadow-lg backdrop-blur-md">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="p-2 rounded-xl bg-blue-600 text-white shadow-md">
              <BrainCircuit className="w-5 h-5" />
            </span>
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              Financial Intelligence Agent
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                PRO QUANT ENGINE
              </span>
            </h1>
          </div>
          <p className="text-xs md:text-sm text-slate-300 max-w-3xl leading-relaxed">
            Sintesi quantitativa avanzata che fonde la metodologia di tre piattaforme leader:{' '}
            <strong className="text-blue-300">InvestingPro</strong> (Fair Value multi-modello, Salute e ProTips),{' '}
            <strong className="text-indigo-300">Quantaste</strong> (Smart Quant Score a 5 pilastri e Regimi Macro) e{' '}
            <strong className="text-purple-300">Forecaster Terminal</strong> (Projection Engine a 30 anni, Market Mood Meter e flussi istituzionali).
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => fetchAnalysis()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-md cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Rianalizza</span>
          </button>
          <button
            onClick={handleCopySummary}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--border-color)] text-xs font-semibold transition cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-blue-400" />}
            <span>{copied ? 'Copiato!' : 'Copia'}</span>
          </button>
          <button
            onClick={handleExportJson}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--border-color)] text-xs font-semibold transition cursor-pointer"
            title="Esporta Report Completo in JSON"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>JSON</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-[var(--border-color)] text-xs font-bold">
        {[
          { id: 'all', label: 'Tutti i Moduli' },
          { id: 'quant', label: '1. Smart Quant (Quantaste)' },
          { id: 'investingpro', label: '2. Fair Value & Salute (InvestingPro)' },
          { id: 'forecaster', label: '3. Projection & Mood (Forecaster)' },
          { id: 'flows', label: '4. Flussi & Macro' },
          { id: 'probo', label: '5. Analisi Giacomo Probo (Screenshot AI)' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap cursor-pointer ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="p-12 text-center space-y-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]/50 backdrop-blur-sm animate-pulse">
          <BrainCircuit className="w-12 h-12 text-blue-500 mx-auto animate-bounce" />
          <h3 className="text-lg font-bold">Elaborazione Quantitativa in Corso...</h3>
          <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto">
            Aggregazione dei 6 modelli di Fair Value, calcolo dello Smart Quant Score su 5 pilastri, analisi delle divergenze DPO/Wyckoff e proiezione dei pattern storici a 30 anni.
          </p>
        </div>
      )}

      {/* Main Content */}
      {!loading && report && (
        <div className="space-y-6">
          {/* Executive Overview Card */}
          <div className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black text-white">{report.ticker}</span>
                  <span className="text-sm font-semibold text-[var(--text-muted)]">({report.name})</span>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    {report.asset_type}
                  </span>
                </div>
                <div className="text-xs text-[var(--text-muted)] mt-0.5">
                  Prezzo corrente: <strong className="text-[var(--text-main)] text-sm">{report.current_price} {report.currency}</strong>
                  <span className="mx-2">•</span>
                  Aggiornato: {new Date(report.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              {/* Big Score Badges */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border bg-black/20">
                  <span className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Quant Score</span>
                  <span className="text-lg font-black text-blue-400">{report.smart_quant.score}/100</span>
                </div>
                <div className={`px-3 py-1.5 rounded-xl border text-xs font-black uppercase tracking-wide shadow-sm flex items-center gap-1.5 ${getSignalBadgeColor(report.smart_quant.signal)}`}>
                  <Zap className="w-3.5 h-3.5" />
                  <span>{report.smart_quant.signal}</span>
                </div>
                <div className={`px-3 py-1.5 rounded-xl border text-xs font-black uppercase tracking-wide ${getMoodColor(report.market_mood.state)}`}>
                  <Gauge className="w-3.5 h-3.5 inline mr-1" />
                  <span>{report.market_mood.state}</span>
                </div>
              </div>
            </div>

            {/* Executive Summary Quote */}
            <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 space-y-2">
              <div className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Executive Summary & Sintesi Finanziaria</span>
              </div>
              <p className="text-xs md:text-sm text-slate-200 leading-relaxed">
                {report.executive_summary}
              </p>
            </div>
          </div>

          {/* D3.JS QUANT VISUAL DASHBOARD: GAUGE & RADAR CHARTS */}
          <div className="p-5 rounded-2xl border border-blue-500/30 bg-gradient-to-br from-[var(--bg-card)] via-[var(--bg-card)] to-blue-950/20 shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-[var(--border-color)] pb-3">
              <div className="space-y-0.5">
                <h3 className="text-sm md:text-base font-black text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-400" />
                  <span>Dashboard Quantitativa D3.js: Smart Quant Score & Radar 5 Pilastri</span>
                </h3>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Visualizzazione analitica interattiva basata su D3.js per il tachimetro del punteggio e la convergenza radar
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  D3.js ENGINE v7
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-400/30">
                  5 PILLARS RADAR
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
              {/* Left Column: D3 Speedometer Tachimetro (Gauge Chart) */}
              <div className="lg:col-span-5 flex flex-col items-center">
                <QuantGaugeChart
                  score={report.smart_quant.score}
                  signal={report.smart_quant.signal}
                  momentumActivated={report.smart_quant.momentum_activated}
                  theme={theme}
                  width={300}
                  height={190}
                />
              </div>

              {/* Right Column: D3 Radar Chart for 5 Pillars with Sector Comparison */}
              <div className="lg:col-span-7 flex flex-col items-center">
                <PillarsRadarChart
                  pillars={report.smart_quant.pillars}
                  ticker={report.ticker}
                  sectorName={category || 'Settore'}
                  theme={theme}
                  width={380}
                  height={280}
                />
              </div>
            </div>

            {/* Pillar Breakdown Quick Reference Footer */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-[var(--border-color)] text-[11px]">
              <div className="p-2 rounded-xl bg-black/20 border border-[var(--border-color)] text-center space-y-0.5">
                <span className="text-[9px] uppercase font-bold text-[var(--text-muted)] block">Macroeconomico</span>
                <span className="font-extrabold text-blue-400 text-xs">{report.smart_quant.pillars.macro?.score ?? 70}/100</span>
              </div>
              <div className="p-2 rounded-xl bg-black/20 border border-[var(--border-color)] text-center space-y-0.5">
                <span className="text-[9px] uppercase font-bold text-[var(--text-muted)] block">Fondamentale</span>
                <span className="font-extrabold text-emerald-400 text-xs">{report.smart_quant.pillars.fundamental?.score ?? 80}/100</span>
              </div>
              <div className="p-2 rounded-xl bg-black/20 border border-[var(--border-color)] text-center space-y-0.5">
                <span className="text-[9px] uppercase font-bold text-[var(--text-muted)] block">Tecnico & Volatilità</span>
                <span className="font-extrabold text-purple-400 text-xs">{report.smart_quant.pillars.technical?.score ?? 75}/100</span>
              </div>
              <div className="p-2 rounded-xl bg-black/20 border border-[var(--border-color)] text-center space-y-0.5">
                <span className="text-[9px] uppercase font-bold text-[var(--text-muted)] block">Stagionalità</span>
                <span className="font-extrabold text-amber-400 text-xs">{report.smart_quant.pillars.seasonality?.score ?? 70}/100</span>
              </div>
              <div className="p-2 rounded-xl bg-black/20 border border-[var(--border-color)] text-center space-y-0.5 col-span-2 sm:col-span-1">
                <span className="text-[9px] uppercase font-bold text-[var(--text-muted)] block">Consenso Analisti</span>
                <span className="font-extrabold text-cyan-400 text-xs">{report.smart_quant.pillars.analyst_consensus?.score ?? 78}/100</span>
              </div>
            </div>
          </div>

          {/* MODULO 1: PILASTRO QUANTITATIVO E MACRO (QUANTASTE) */}
          {(activeTab === 'all' || activeTab === 'quant') && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-l-4 border-blue-500 pl-3">
                <div>
                  <h2 className="text-base md:text-lg font-black tracking-tight text-white flex items-center gap-2">
                    Pilastro 1: Smart Quant Score & Analisi Macro (Quantaste)
                  </h2>
                  <p className="text-xs text-[var(--text-muted)]">
                    Punteggio sintetico ponderato su 5 pilastri con regime macroeconomico e rotazione settoriale
                  </p>
                </div>
                {report.smart_quant.momentum_activated && (
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-black uppercase flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    <span>Momentum Attivo</span>
                  </span>
                )}
              </div>

              {/* 5 Pillars Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {Object.entries(report.smart_quant.pillars).map(([key, pillar]) => {
                  const p = pillar as { score: number; label: string; commentary: string };
                  return (
                    <div key={key} className="p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] space-y-2 shadow-sm">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-[var(--text-muted)] truncate">{p.label}</span>
                        <span className={`font-black text-sm ${p.score >= 75 ? 'text-emerald-400' : p.score >= 50 ? 'text-blue-400' : 'text-amber-400'}`}>
                          {p.score}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-black/30 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${p.score >= 75 ? 'bg-emerald-500' : p.score >= 50 ? 'bg-blue-500' : 'bg-amber-500'}`}
                          style={{ width: `${p.score}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                        {p.commentary}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Macro Regime & Sector Rotation Card */}
              <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Fase del Ciclo Economico</span>
                  <div className="text-sm font-black text-white flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-indigo-400" />
                    <span>{report.smart_quant.macro_regime.phase}</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Regime Liquidità: <strong className="text-white">{report.smart_quant.macro_regime.liquidity_regime}</strong>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase">Settori Sovrappesati (Overweight)</span>
                  <div className="flex flex-wrap gap-1">
                    {report.smart_quant.macro_regime.overweight_sectors.map((s, idx) => (
                      <span key={idx} className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-amber-400 uppercase">Settori Sottopesati (Underweight)</span>
                  <div className="flex flex-wrap gap-1">
                    {report.smart_quant.macro_regime.underweight_sectors.map((s, idx) => (
                      <span key={idx} className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MODULO 2: PILASTRO VALUTAZIONE E FONDAMENTALI (INVESTINGPRO) */}
          {(activeTab === 'all' || activeTab === 'investingpro') && (
            <div className="space-y-4">
              <div className="border-l-4 border-emerald-500 pl-3">
                <h2 className="text-base md:text-lg font-black tracking-tight text-white flex items-center gap-2">
                  Pilastro 2: Fair Value Multi-Modello & Salute Finanziaria (InvestingPro)
                </h2>
                <p className="text-xs text-[var(--text-muted)]">
                  Stima del valore intrinseco aggregato, punteggio di salute su 5 dimensioni e ProTips qualitativi
                </p>
              </div>

              {/* Fair Value Hero Card */}
              <div className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
                <div className="space-y-2">
                  <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Fair Value Aggregato</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-emerald-400">
                      {report.fair_value.aggregated_fair_value} {report.currency}
                    </span>
                    <span className={`text-sm font-black px-2 py-0.5 rounded-full ${report.fair_value.upside_downside_pct >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                      {report.fair_value.upside_downside_pct >= 0 ? '+' : ''}{report.fair_value.upside_downside_pct}%
                    </span>
                  </div>
                  <div className="text-xs text-[var(--text-muted)] flex items-center gap-2">
                    <span>Incertezza del modello:</span>
                    <span className="font-bold text-white px-2 py-0.5 rounded bg-black/30 border border-white/10">
                      {report.fair_value.uncertainty_level}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 italic pt-1">
                    {report.fair_value.valuation_summary}
                  </p>
                </div>

                {/* Health Score Box */}
                <div className="space-y-3 p-4 rounded-xl bg-black/20 border border-[var(--border-color)]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--text-muted)] uppercase">Punteggio Salute Finanziaria</span>
                    <span className="text-xs font-black text-amber-400">⭐ {report.financial_health.rating_stars} / 5.0</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-2xl font-black text-white">{report.financial_health.overall_score}/100</div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                      {report.financial_health.verdict}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                    <div>Cash Flow: <strong className="text-white">{report.financial_health.cash_flow_score}%</strong></div>
                    <div>Redditività: <strong className="text-white">{report.financial_health.profitability_score}%</strong></div>
                    <div>Solvibilità: <strong className="text-white">{report.financial_health.solvency_debt_score}%</strong></div>
                    <div>Crescita: <strong className="text-white">{report.financial_health.growth_score}%</strong></div>
                  </div>
                </div>

                {/* Models Breakdown Bar Chart */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-[var(--text-muted)] uppercase">Confronto dei 6 Modelli</span>
                  <div className="space-y-1.5 text-xs">
                    {Object.entries(report.fair_value.models).map(([k, m]: any) => (
                      <div key={k} className="flex items-center justify-between gap-2">
                        <span className="text-[11px] text-[var(--text-muted)] truncate max-w-[140px]">{m.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-bold">{m.value} {report.currency}</span>
                          <span className="text-[10px] text-slate-400">({(m.weight * 100).toFixed(0)}%)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ProTips Cards */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  ProTips Chiave per l'Investitore
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {report.protips.map((pt) => {
                    const isBull = pt.type === 'BULLISH';
                    const isBear = pt.type === 'BEARISH';
                    return (
                      <div
                        key={pt.id}
                        className={`p-3.5 rounded-xl border transition shadow-sm space-y-1.5 ${
                          isBull
                            ? 'bg-emerald-500/5 border-emerald-500/30'
                            : isBear
                            ? 'bg-rose-500/5 border-rose-500/30'
                            : 'bg-blue-500/5 border-blue-500/30'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                            isBull ? 'bg-emerald-500/20 text-emerald-400' : isBear ? 'bg-rose-500/20 text-rose-400' : 'bg-blue-500/20 text-blue-400'
                          }`}>
                            {pt.tag}
                          </span>
                          <span className="text-xs font-bold text-white">{pt.title}</span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {pt.detail}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Competitor Comparison Table */}
              {report.competitors && report.competitors.length > 0 && (
                <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-400" />
                    <span>Confronto Competitor di Settore</span>
                  </span>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)] uppercase text-[10px]">
                          <th className="py-2">Ticker / Nome</th>
                          <th className="py-2">Market Cap</th>
                          <th className="py-2">P/E</th>
                          <th className="py-2">EV/EBITDA</th>
                          <th className="py-2">Margine Op.</th>
                          <th className="py-2">ROE</th>
                          <th className="py-2">Debito/Equity</th>
                          <th className="py-2">Upside FV</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-color)]">
                        {report.competitors.map((c, i) => (
                          <tr key={i} className={`hover:bg-white/5 transition ${c.isTarget ? 'bg-blue-500/10 font-bold' : ''}`}>
                            <td className="py-2.5 font-bold flex items-center gap-1.5">
                              <span className="text-white">{c.ticker}</span>
                              <span className="text-[var(--text-muted)] font-normal">({c.name})</span>
                              {c.isTarget && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-500 text-white">TARGET</span>
                              )}
                            </td>
                            <td className="py-2.5">{c.marketCap}</td>
                            <td className="py-2.5">{c.pe}x</td>
                            <td className="py-2.5">{c.ev_ebitda}x</td>
                            <td className="py-2.5 text-emerald-400">{c.operating_margin}%</td>
                            <td className="py-2.5">{c.roe}%</td>
                            <td className="py-2.5">{c.debt_equity}x</td>
                            <td className="py-2.5 font-black text-emerald-400">+{c.fair_value_upside}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MODULO 3: PILASTRO PREDIZIONE E TIMING (FORECASTER TERMINAL) */}
          {(activeTab === 'all' || activeTab === 'forecaster') && (
            <div className="space-y-4">
              <div className="border-l-4 border-purple-500 pl-3">
                <h2 className="text-base md:text-lg font-black tracking-tight text-white flex items-center gap-2">
                  Pilastro 3: Projection Engine & Market Mood Meter (Forecaster Terminal)
                </h2>
                <p className="text-xs text-[var(--text-muted)]">
                  Analisi predittiva dei pattern a 30 anni, condizioni di timing, Wyckoff Phase e divergenze prezzo-oscillatore
                </p>
              </div>

              {/* Projection & Mood Meter Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Projection Engine Card */}
                <div className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] space-y-4">
                  <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold uppercase text-[var(--text-muted)] flex items-center gap-1.5">
                        <Target className="w-3.5 h-3.5 text-purple-400" />
                        <span>Projection Engine ({report.projection.timeframe})</span>
                      </span>
                      <div className="text-sm font-black text-white">
                        Probabilità di Successo: <strong className="text-emerald-400">{report.projection.success_probability_pct}%</strong>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-[var(--text-muted)] uppercase block">Robustezza Pattern</span>
                      <span className="text-amber-400 font-bold">
                        {'⭐'.repeat(report.projection.robustness_stars)} ({report.projection.robustness_stars}/5)
                      </span>
                    </div>
                  </div>

                  {/* Scenarios */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                      <span className="text-[10px] uppercase font-bold text-emerald-400 block">Media Rialzista</span>
                      <div className="text-base font-black text-white mt-1">+{report.projection.scenarios.bullish_mean_pct}%</div>
                      <div className="text-[10px] text-slate-300">{report.projection.scenarios.bullish_price} {report.currency}</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30">
                      <span className="text-[10px] uppercase font-bold text-blue-400 block">Frattale Correlato</span>
                      <div className="text-base font-black text-white mt-1">r = {report.projection.scenarios.most_correlated_case.correlation_r}</div>
                      <div className="text-[10px] text-slate-300">Anno {report.projection.scenarios.most_correlated_case.year}</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30">
                      <span className="text-[10px] uppercase font-bold text-rose-400 block">Media Ribassista</span>
                      <div className="text-base font-black text-white mt-1">{report.projection.scenarios.bearish_mean_pct}%</div>
                      <div className="text-[10px] text-slate-300">{report.projection.scenarios.bearish_price} {report.currency}</div>
                    </div>
                  </div>

                  {/* Visual Projected Trajectory */}
                  <div className="p-3.5 rounded-xl bg-black/30 border border-white/5 space-y-2">
                    <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                      Traiettoria Proiettata a Scaglioni
                    </span>
                    <div className="flex items-center justify-between text-center gap-1 text-[11px]">
                      {report.projection.projected_path.map((pt, idx) => (
                        <div key={idx} className="flex-1 p-2 rounded-lg bg-white/5 border border-white/5">
                          <span className="text-[10px] text-slate-400 block">{pt.label}</span>
                          <span className="text-xs font-black text-emerald-400 block mt-0.5">{pt.bullish}</span>
                          <span className="text-[9px] text-rose-400 block">{pt.bearish}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pullback Alert */}
                  {report.projection.pullback_warning.expected && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-amber-300 font-bold">Attenzione Pullback Intermedio:</strong>{' '}
                        ritracciamento fisiologico atteso di circa -{report.projection.pullback_warning.estimated_pullback_pct}% fino al supporto di{' '}
                        <strong>{report.projection.pullback_warning.support_level} {report.currency}</strong> ({report.projection.pullback_warning.timing_bars}).
                        <div className="text-[11px] text-slate-300 mt-1">{report.projection.pullback_warning.advice}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Market Mood Meter & Timing Card */}
                <div className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] space-y-4">
                  <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold uppercase text-[var(--text-muted)] flex items-center gap-1.5">
                        <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Market Mood Meter (0-100)</span>
                      </span>
                      <div className="text-sm font-black text-white flex items-center gap-2">
                        <span>Punteggio:</span>
                        <span className="text-xl text-cyan-400">{report.market_mood.score}/100</span>
                        <span className={`text-xs px-2 py-0.5 rounded font-black ${getMoodColor(report.market_mood.state)}`}>
                          {report.market_mood.state}
                        </span>
                      </div>
                    </div>
                    <div className="text-right text-xs">
                      <span className="text-[10px] text-[var(--text-muted)] block uppercase">DPO Detrended</span>
                      <span className="font-bold text-white">{report.market_mood.dpo_value > 0 ? '+' : ''}{report.market_mood.dpo_value}</span>
                    </div>
                  </div>

                  {/* Mood Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="w-full h-3 bg-gradient-to-r from-indigo-500 via-cyan-500 via-emerald-500 via-amber-500 to-rose-500 rounded-full relative overflow-hidden">
                      <div
                        className="absolute top-0 bottom-0 w-1.5 bg-white border border-black shadow-md"
                        style={{ left: `${report.market_mood.score}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] text-[var(--text-muted)] uppercase font-semibold">
                      <span>Ipervenduto Estremo</span>
                      <span>Neutrale</span>
                      <span>Ipercomprato Estremo</span>
                    </div>
                  </div>

                  {/* Wyckoff & Divergence Box */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-black/20 border border-[var(--border-color)]">
                      <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold block">Fase di Wyckoff</span>
                      <strong className="text-white text-xs mt-0.5 block">{report.market_mood.wyckoff_phase}</strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-black/20 border border-[var(--border-color)]">
                      <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold block">Velocità del Prezzo</span>
                      <strong className="text-cyan-300 text-xs mt-0.5 block">{report.market_mood.price_velocity}</strong>
                    </div>
                  </div>

                  {/* Divergence Notification */}
                  {report.market_mood.divergence.detected && (
                    <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-start gap-2.5 text-xs">
                      <Zap className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 mr-1.5 uppercase">
                          DIVERGENZA: {report.market_mood.divergence.type}
                        </span>
                        <p className="text-slate-300 mt-1 leading-relaxed">
                          {report.market_mood.divergence.description}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Optimal Entry & Timing Box */}
                  <div className="p-4 rounded-xl bg-gradient-to-r from-blue-900/30 to-indigo-900/30 border border-blue-500/30 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-blue-300 uppercase">Timing di Ingresso Consigliato:</span>
                      <span className="font-black px-2 py-0.5 rounded bg-blue-600 text-white text-[11px]">
                        {report.market_mood.entry_timing.action}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center text-xs pt-1">
                      <div>
                        <span className="text-[9px] text-slate-400 block uppercase">Entry Ottimale</span>
                        <strong className="text-white">{report.market_mood.entry_timing.optimal_entry}</strong>
                      </div>
                      <div>
                        <span className="text-[9px] text-rose-400 block uppercase">Stop Loss</span>
                        <strong className="text-rose-300">{report.market_mood.entry_timing.stop_loss}</strong>
                      </div>
                      <div>
                        <span className="text-[9px] text-emerald-400 block uppercase">Take Profit</span>
                        <strong className="text-emerald-300">{report.market_mood.entry_timing.take_profit}</strong>
                      </div>
                      <div>
                        <span className="text-[9px] text-indigo-400 block uppercase">Risk / Reward</span>
                        <strong className="text-indigo-300">{report.market_mood.entry_timing.risk_reward_ratio}x</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MODULO 4: TRACCIAMENTO FLUSSI ISTITUZIONALI & COT */}
          {(activeTab === 'all' || activeTab === 'flows') && (
            <div className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] space-y-4">
              <div className="border-l-4 border-indigo-500 pl-3">
                <h2 className="text-base md:text-lg font-black tracking-tight text-white flex items-center gap-2">
                  Pilastro 4: Flussi Istituzionali, COT Report & Insider Tracking
                </h2>
                <p className="text-xs text-[var(--text-muted)]">
                  Monitoraggio del posizionamento Smart Money, operazioni degli insider e scambi fuori mercato (Dark Pool)
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-3.5 rounded-xl bg-black/20 border border-[var(--border-color)] space-y-1">
                  <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Posizionamento COT Commercials</span>
                  <div className="text-base font-black text-emerald-400">
                    {report.institutional_flows.cot_commercials_net} ({report.institutional_flows.cot_commercials_percentile}° percentile)
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Speculators: <strong className="text-white">{report.institutional_flows.cot_speculators_net}</strong>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-black/20 border border-[var(--border-color)] space-y-1">
                  <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Attività Insider Aziendali</span>
                  <div className="text-base font-black text-blue-400">
                    {report.institutional_flows.insider_activity}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Rapporto Acquisti/Vendite: <strong className="text-white">{report.institutional_flows.insider_buy_sell_ratio}x</strong>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-black/20 border border-[var(--border-color)] space-y-1">
                  <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Dark Pool Accumulation Score</span>
                  <div className="text-base font-black text-purple-400">
                    {report.institutional_flows.dark_pool_score} / 100
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Forte accumulazione istituzionale non segnalata su order book pubblico
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-indigo-500/5 border border-indigo-500/20 text-xs text-slate-300 leading-relaxed">
                <strong className="text-indigo-300 font-bold block mb-1">Commento sui Flussi:</strong>
                {report.institutional_flows.flow_commentary}
              </div>
            </div>
          )}

          {/* MODULO 5: ANALISI AI METODOLOGIA GIACOMO PROBO (SCREENSHOT & CONFLUENZA 5 TECNICHE) */}
          {(activeTab === 'all' || activeTab === 'probo') && (
            <div className="p-5 rounded-2xl border border-blue-500/30 bg-gradient-to-br from-[var(--bg-card)] via-[var(--bg-card)] to-indigo-950/25 shadow-md space-y-5">
              {/* Header Module Banner */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[var(--border-color)] pb-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="p-1.5 rounded-lg bg-blue-600 text-white shadow-xs">
                      <BookOpen className="w-4 h-4" />
                    </span>
                    <h2 className="text-base md:text-lg font-black tracking-tight text-white flex items-center gap-2">
                      <span>Pilastro 5: Analisi AI Metodologia Giacomo Probo</span>
                      <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-mono font-bold">
                        CONFLUENZA 5 TECNICHE
                      </span>
                    </h2>
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">
                    Analisi multimodale degli screenshot del grafico secondo le regole operative di Giacomo Probo (Stocastico Lento 10-6-3, Bollinger 5/1.8, Candlestick/Heiken Ashi, Medie Mobili, Volume Profile e Scaling Out al 50%).
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleCopyProboSummary}
                    disabled={!proboReport}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] hover:bg-[var(--border-color)] text-xs font-semibold transition cursor-pointer disabled:opacity-40"
                    title="Copia Setup Operativo Giacomo Probo"
                  >
                    {proboCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-blue-400" />}
                    <span>{proboCopied ? 'Copiato!' : 'Copia Setup'}</span>
                  </button>
                  <button
                    onClick={handleExportProboJson}
                    disabled={!proboReport}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] hover:bg-[var(--border-color)] text-xs font-semibold transition cursor-pointer disabled:opacity-40"
                    title="Esporta JSON Report Probo"
                  >
                    <Download className="w-3.5 h-3.5 text-indigo-400" />
                    <span>JSON</span>
                  </button>
                </div>
              </div>

              {/* Interactive Screenshot & Control Bar */}
              <div className="p-4 rounded-xl bg-black/25 border border-[var(--border-color)] space-y-3">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-xs cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Carica Screenshot Grafico</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleScreenshotUpload}
                        className="hidden"
                      />
                    </label>

                    <button
                      onClick={handleCaptureChartSnapshot}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 text-xs font-bold transition cursor-pointer"
                      title="Cattura istantanea automatica dei dati/canvas attuali"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Cattura Snapshot Grafico</span>
                    </button>

                    {/* Timeframe Selector */}
                    <div className="flex items-center gap-1 bg-[var(--bg-main)] p-1 rounded-xl border border-[var(--border-color)]">
                      {(['1d', '1h', '15m', '5m'] as const).map(tf => (
                        <button
                          key={tf}
                          onClick={() => {
                            setProboTimeframe(tf);
                          }}
                          className={`px-2.5 py-0.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                            proboTimeframe === tf
                              ? 'bg-blue-600 text-white'
                              : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                          }`}
                        >
                          {tf.toUpperCase()}
                        </button>
                      ))}
                    </div>

                    {proboScreenshot && (
                      <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-lg">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Screenshot caricato</span>
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => fetchProboAnalysis()}
                    disabled={proboLoading}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black transition shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${proboLoading ? 'animate-spin' : ''}`} />
                    <span>{proboLoading ? 'Analisi in Corso...' : 'Analizza con Metodologia Probo'}</span>
                  </button>
                </div>

                {/* Screenshot Preview Drawer (collapsible if image attached) */}
                {proboScreenshot && (
                  <div className="relative rounded-xl overflow-hidden border border-blue-500/30 max-h-48 bg-black/40 flex items-center justify-center">
                    <img
                      src={proboScreenshot}
                      alt="Screenshot Grafico per Analisi Probo"
                      className="max-h-48 object-contain w-auto rounded"
                    />
                    <button
                      onClick={() => setProboScreenshot(null)}
                      className="absolute top-2 right-2 p-1 rounded-lg bg-black/70 hover:bg-rose-600 text-white text-xs transition"
                      title="Rimuovi screenshot"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              {/* Loading State */}
              {proboLoading && (
                <div className="p-8 text-center space-y-3 rounded-xl border border-blue-500/30 bg-blue-500/5 animate-pulse">
                  <BrainCircuit className="w-8 h-8 text-blue-400 mx-auto animate-bounce" />
                  <h4 className="text-sm font-bold text-white">
                    Verifica Confluenza delle 5 Tecniche di Giacomo Probo in Corso...
                  </h4>
                  <p className="text-xs text-[var(--text-muted)] max-w-lg mx-auto">
                    Calcolo Stocastico Lento (10-6-3 con fasce 75/25), Bande di Bollinger (MM a 5 periodi e 1.8 Dev.Std), test di inversione Candlestick/Heiken Ashi, Volume Profile sul POC e dimensionamento della Size con Scaling Out al 50%.
                  </p>
                </div>
              )}

              {/* Probo Analysis Result Content */}
              {!proboLoading && proboReport && (
                <ProboAnalysisReport
                  report={proboReport}
                  onCopySetup={handleCopyProboSummary}
                  onExportJson={handleExportProboJson}
                />
              )}
            </div>
          )}

          {/* Custom Query Box */}
          <div className="p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase text-[var(--text-muted)]">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Chiedi un Audit o Scenario Specifico all'Agente Finanziario</span>
            </div>
            <form onSubmit={handleCustomSubmit} className="flex gap-2">
              <input
                type="text"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Es: Qual è l'impatto di un rialzo del prezzo del petrolio sui margini? Analizza il rischio di diluizione..."
                className="flex-1 px-3 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--input-bg)] text-xs text-[var(--text-main)] outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={loading || !customPrompt.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Invia</span>
              </button>
            </form>
          </div>

          {/* Compliance Disclaimer */}
          <div className="p-3.5 rounded-xl border border-white/5 bg-black/30 text-[10px] text-slate-400 leading-relaxed text-center">
            {report.disclaimer}
          </div>
        </div>
      )}
    </div>
  );
};
