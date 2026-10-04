import React, { useState } from 'react';
import {
  Globe,
  Star,
  BrainCircuit,
  TrendingUp,
  TrendingDown,
  Zap,
  ShieldAlert,
  Target,
  Scale,
  DollarSign,
  Copy,
  Check,
  Download,
  Upload,
  Camera,
  RefreshCw,
  BookOpen,
  Layers,
  BarChart3,
  Calendar,
  Activity,
  CheckCircle2,
  Info,
  Sparkles,
  Sliders,
  Gauge,
  Compass
} from 'lucide-react';
import { ProboMarketAnalysisReport } from '../types';
import { geminiService } from '../services/geminiService';

const MARKET_PRESETS = [
  { id: 'indices_ftse', label: '🇮🇹 FTSE MIB (Azionario Italia)', market: 'Indici Azionari (FTSE MIB)', country: 'Italia' },
  { id: 'indices_sp500', label: '🇺🇸 S&P 500 (Azionario USA)', market: 'Indici Azionari (S&P 500)', country: 'Stati Uniti (USA)' },
  { id: 'indices_dax', label: '🇩🇪 DAX 40 (Azionario Germania)', market: 'Indici Azionari (DAX 40)', country: 'Germania' },
  { id: 'indices_nasdaq', label: '🇺🇸 Nasdaq 100 (Tech USA)', market: 'Indici Azionari (Nasdaq 100)', country: 'Stati Uniti (USA)' },
  { id: 'forex_eurusd', label: '🇪🇺/🇺🇸 EUR/USD (Euro / Dollaro)', market: 'Forex / Valute (EUR/USD)', country: 'Eurozona vs USA' },
  { id: 'forex_gbpusd', label: '🇬🇧/🇺🇸 GBP/USD (Sterlina / Dollaro)', market: 'Forex / Valute (GBP/USD)', country: 'Regno Unito (UK)' },
  { id: 'forex_usdjpy', label: '🇺🇸/🇯🇵 USD/JPY (Dollaro / Yen)', market: 'Forex / Valute (USD/JPY)', country: 'Giappone' },
  { id: 'commodity_gold', label: '🥇 Oro (XAU/USD - Asset Rifugio)', market: 'Materie Prime (Oro / Gold)', country: 'Globale (Safe Haven)' },
  { id: 'commodity_oil', label: '🛢️ Petrolio WTI (Energia)', market: 'Materie Prime (Petrolio WTI)', country: 'Globale / OPEC+' },
  { id: 'commodity_copper', label: '🧱 Rame (Barometro Ciclo)', market: 'Materie Prime (Rame Industriale)', country: 'Cina & Industria Globale' },
  { id: 'bonds_btp', label: '🏛️ BTP Italia 10Y (Sovrano Italia)', market: 'Obbligazionario (BTP 10 Anni)', country: 'Italia' },
  { id: 'bonds_treasury', label: '🏛️ US Treasury 10Y (Rendimento USA)', market: 'Obbligazionario (US 10Y Treasury)', country: 'Stati Uniti (USA)' },
  { id: 'crypto_btc', label: '🪙 Bitcoin (BTC/USD)', market: 'Criptovalute (Bitcoin)', country: 'Globale (Digital Asset)' }
];

const COUNTRY_OPTIONS = [
  'Stati Uniti (USA)',
  'Eurozona (UE)',
  'Germania',
  'Italia',
  'Regno Unito (UK)',
  'Giappone',
  'Cina',
  'Svizzera',
  'Australia',
  'Canada',
  'Mercati Emergenti (EM)'
];

export const MarketAnalysisPage: React.FC = () => {
  const [selectedPreset, setSelectedPreset] = useState(MARKET_PRESETS[0].id);
  const [market, setMarket] = useState(MARKET_PRESETS[0].market);
  const [country, setCountry] = useState(MARKET_PRESETS[0].country);
  const [timeframe, setTimeframe] = useState<'1d' | '1w' | '4h' | '1h'>('1d');
  const [customNotes, setCustomNotes] = useState('');
  const [screenshotData, setScreenshotData] = useState<string | null>(null);

  const [report, setReport] = useState<ProboMarketAnalysisReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'cards' | 'markdown'>('cards');

  const handleSelectPreset = (presetId: string) => {
    setSelectedPreset(presetId);
    const found = MARKET_PRESETS.find(p => p.id === presetId);
    if (found) {
      setMarket(found.market);
      setCountry(found.country);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setScreenshotData(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRunAnalysis = async () => {
    setLoading(true);
    try {
      const res = await geminiService.generateMarketAnalysisReport({
        market,
        country,
        timeframe,
        imageBase64: screenshotData || undefined,
        customNotes: customNotes || undefined
      });
      setReport(res);
    } catch (e) {
      console.error('Error generating Probo market analysis:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!report) return;
    navigator.clipboard.writeText(report.markdownReport);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportJson = () => {
    if (!report) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(report, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `probo-market-report-${country.replace(/[^a-z0-9]/gi, '_')}-${new Date().toISOString().split('T')[0]}.json`);
    dlAnchor.click();
  };

  // Helper for size badge styling
  const getSizeStyle = (size: string) => {
    const s = size.toUpperCase();
    if (s.includes('MASSIMA')) {
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm shadow-emerald-500/20';
    } else if (s.includes('INTERMEDIA')) {
      return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
    } else if (s.includes('MINIMA')) {
      return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    } else {
      return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[var(--bg-main)] text-[var(--text-main)] p-4 md:p-6 space-y-6">
      {/* Header Page Title Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-950 via-indigo-950 to-[var(--bg-header)] border border-blue-500/30 shadow-xl space-y-2">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/30">
              <Globe className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-lg md:text-xl font-black uppercase tracking-wide text-white flex items-center gap-2">
                <span>Analisi dei Mercati & dei Paesi</span>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-xs font-mono font-bold border border-blue-400/30">
                  METODO GIACOMO PROBO
                </span>
              </h1>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Valutazione macroeconomica a 3 pilastri, rating quantitativo 0-100 (3 Stelle) e piano operativo trading/investimenti con Size Management.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-300 bg-black/30 px-3 py-1.5 rounded-xl border border-white/10">
            <BookOpen className="w-4 h-4 text-amber-400" />
            <span>3 Pilastri Macro • 7 Variabili • Rating 3 Stelle</span>
          </div>
        </div>
      </div>

      {/* Control Panel: Market Selection, Country & Analysis Form */}
      <div className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-md space-y-4">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-blue-400">
          <Sliders className="w-4 h-4" />
          <span>Configurazione Mercato & Paese di Riferimento</span>
        </div>

        {/* Quick Market Presets Grid */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase block">
            Seleziona un Preset di Mercato Rapido:
          </label>
          <div className="flex flex-wrap gap-2">
            {MARKET_PRESETS.map(preset => (
              <button
                key={preset.id}
                onClick={() => handleSelectPreset(preset.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                  selectedPreset === preset.id
                    ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-500/20'
                    : 'bg-[var(--bg-main)] hover:bg-[var(--border-color)] text-[var(--text-muted)] hover:text-white border-[var(--border-color)]'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Inputs: Market Name, Country Dropdown & Timeframe */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-[var(--border-color)]">
          <div>
            <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase block mb-1">
              Mercato / Asset di Riferimento:
            </label>
            <input
              type="text"
              value={market}
              onChange={e => setMarket(e.target.value)}
              placeholder="Es. FTSE MIB, S&P 500, EUR/USD, Oro..."
              className="w-full px-3 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--input-bg)] text-xs text-[var(--text-main)] outline-none focus:border-blue-500 font-bold"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase block mb-1">
              Paese / Area Economica:
            </label>
            <select
              value={country}
              onChange={e => setCountry(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--input-bg)] text-xs text-[var(--text-main)] outline-none focus:border-blue-500 font-bold cursor-pointer"
            >
              {COUNTRY_OPTIONS.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase block mb-1">
              Timeframe di Riferimento:
            </label>
            <div className="flex items-center gap-1 bg-[var(--bg-main)] p-1 rounded-xl border border-[var(--border-color)]">
              {(['1d', '1w', '4h', '1h'] as const).map(tf => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`flex-1 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    timeframe === tf
                      ? 'bg-blue-600 text-white'
                      : 'text-[var(--text-muted)] hover:text-white'
                  }`}
                >
                  {tf.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Screenshot Upload & Custom Notes Bar */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2 border-t border-[var(--border-color)]">
          <div className="md:col-span-8">
            <input
              type="text"
              value={customNotes}
              onChange={e => setCustomNotes(e.target.value)}
              placeholder="Note aggiuntive, quesiti macro o dettagli sul contesto (opzionale)..."
              className="w-full px-3 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--input-bg)] text-xs text-[var(--text-main)] outline-none focus:border-blue-500"
            />
          </div>

          <div className="md:col-span-4 flex items-center gap-2">
            <label className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] hover:bg-[var(--border-color)] text-[var(--text-muted)] hover:text-white text-xs font-bold transition cursor-pointer">
              <Upload className="w-3.5 h-3.5 text-blue-400" />
              <span>{screenshotData ? '✓ Grafico Caricato' : 'Allegato Grafico'}</span>
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </label>

            <button
              onClick={handleRunAnalysis}
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-xs font-black transition shadow-lg shadow-blue-500/20 cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shrink-0"
            >
              <BrainCircuit className={`w-4 h-4 ${loading ? 'animate-spin' : 'text-amber-300'}`} />
              <span>{loading ? 'Elaborazione Probo...' : 'Avvia Analisi Mercato'}</span>
            </button>
          </div>
        </div>

        {screenshotData && (
          <div className="p-2 rounded-xl bg-black/30 border border-blue-500/30 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <img src={screenshotData} alt="Chart Preview" className="h-12 w-24 object-cover rounded-lg" />
              <span className="text-[11px] text-slate-300">Screenshot allegato per l'analisi tecnica multimodale</span>
            </div>
            <button onClick={() => setScreenshotData(null)} className="text-rose-400 font-bold text-xs cursor-pointer">
              Rimuovi
            </button>
          </div>
        )}
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="py-16 flex flex-col items-center justify-center gap-4 p-8 rounded-2xl border border-blue-500/30 bg-blue-500/5 animate-pulse">
          <div className="relative">
            <div className="w-14 h-14 rounded-full border-4 border-blue-500/30 border-t-blue-500 animate-spin" />
            <Globe className="w-7 h-7 text-blue-400 absolute inset-0 m-auto" />
          </div>
          <div className="text-center space-y-1">
            <h3 className="text-base font-black text-white">Analisi Macroeconomica, Ciclica & Intermarket Metodo Probo</h3>
            <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto">
              Valutazione delle 7 Variabili Fondamentali, Indicatori di Fiducia (PMI/ISM), Ciclo Economico, Regime Risk On/Off e calcolo dello Score Quantitativo a 3 Stelle.
            </p>
          </div>
        </div>
      )}

      {/* Results Section */}
      {!loading && report && (
        <div className="space-y-6">
          {/* Top Score Rating Summary Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-950 via-indigo-950 to-[var(--bg-card)] border border-blue-500/40 shadow-xl space-y-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-blue-300 uppercase tracking-widest block">
                  RATING QUANTITATIVO DI CONFLUENZA • METODO PROBO
                </span>
                <h2 className="text-lg md:text-xl font-black text-white flex items-center gap-2">
                  <span>{report.market}</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-xs font-mono font-bold border border-blue-400/30">
                    {report.country}
                  </span>
                </h2>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="flex bg-[var(--bg-main)] p-1 rounded-xl border border-[var(--border-color)] text-xs font-bold">
                  <button
                    onClick={() => setActiveTab('cards')}
                    className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                      activeTab === 'cards' ? 'bg-blue-600 text-white' : 'text-[var(--text-muted)] hover:text-white'
                    }`}
                  >
                    Schede Analitiche
                  </button>
                  <button
                    onClick={() => setActiveTab('markdown')}
                    className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                      activeTab === 'markdown' ? 'bg-blue-600 text-white' : 'text-[var(--text-muted)] hover:text-white'
                    }`}
                  >
                    Report Markdown
                  </button>
                </div>

                <button
                  onClick={handleCopy}
                  className="p-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--border-color)] text-xs font-bold transition cursor-pointer"
                  title="Copia report Markdown negli appunti"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-blue-400" />}
                </button>
                <button
                  onClick={handleExportJson}
                  className="p-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--border-color)] text-xs font-bold transition cursor-pointer"
                  title="Esporta JSON completo"
                >
                  <Download className="w-4 h-4 text-indigo-400" />
                </button>
              </div>
            </div>

            {/* Score Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-3 border-t border-blue-500/20">
              {/* Score Box */}
              <div className="p-3.5 rounded-xl bg-black/40 border border-blue-500/30 text-center space-y-0.5">
                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase block">Probo Confluence Score</span>
                <div className="text-2xl md:text-3xl font-black text-amber-400 font-mono">
                  {report.confluenceScore} <span className="text-xs text-slate-400">/ 100</span>
                </div>
              </div>

              {/* Rating Stars Box */}
              <div className="p-3.5 rounded-xl bg-black/40 border border-blue-500/30 text-center space-y-0.5">
                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase block">Rating a Stelle</span>
                <div className="text-sm font-black text-amber-300 mt-1">
                  {report.ratingStars}
                </div>
                <span className="text-[10px] text-slate-400 font-semibold block">Vantaggio: {report.qualityGrade}</span>
              </div>

              {/* Action Verdict Box */}
              <div className="p-3.5 rounded-xl bg-black/40 border border-blue-500/30 text-center space-y-0.5">
                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase block">Indicazione Operativa</span>
                <div className={`text-sm font-black mt-1 px-2 py-0.5 rounded-lg inline-block ${
                  report.operationalPlan.action === 'BUY' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' :
                  report.operationalPlan.action === 'SELL' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' :
                  'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                }`}>
                  {report.operationalPlan.action}
                </div>
              </div>

              {/* Size Management Badge Box */}
              <div className="p-3.5 rounded-xl bg-black/40 border border-blue-500/30 text-center space-y-0.5">
                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase block">Size Consigliata</span>
                <div className={`text-xs font-black mt-1 px-2 py-1 rounded-lg border inline-block ${getSizeStyle(report.operationalPlan.sizeManagement)}`}>
                  {report.operationalPlan.sizeManagement}
                </div>
              </div>
            </div>

            {/* Score Breakdown Progress Bars */}
            <div className="space-y-2 pt-2 border-t border-blue-500/20">
              <span className="text-[10px] font-bold text-slate-300 uppercase block">
                Composizione Quantitativa del Punteggio (5 Fattori • Max 20 Punti ciascuno):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-[10.5px]">
                {/* 1. Macro Score */}
                <div className="p-2 rounded-lg bg-black/25 border border-white/5 space-y-1">
                  <div className="flex justify-between font-bold">
                    <span className="text-slate-300">1. Macro Fondamentali</span>
                    <span className="text-amber-400 font-mono">{report.scoringBreakdown.macroScore}/20</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-amber-400 h-full rounded-full" style={{ width: `${(report.scoringBreakdown.macroScore / 20) * 100}%` }} />
                  </div>
                </div>

                {/* 2. Intermarket Score */}
                <div className="p-2 rounded-lg bg-black/25 border border-white/5 space-y-1">
                  <div className="flex justify-between font-bold">
                    <span className="text-slate-300">2. Ciclo & Intermarket</span>
                    <span className="text-blue-400 font-mono">{report.scoringBreakdown.intermarketScore}/20</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-blue-400 h-full rounded-full" style={{ width: `${(report.scoringBreakdown.intermarketScore / 20) * 100}%` }} />
                  </div>
                </div>

                {/* 3. Data & Sentiment Score */}
                <div className="p-2 rounded-lg bg-black/25 border border-white/5 space-y-1">
                  <div className="flex justify-between font-bold">
                    <span className="text-slate-300">3. Dati & Banche Cent.</span>
                    <span className="text-purple-400 font-mono">{report.scoringBreakdown.dataSentimentScore}/20</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-purple-400 h-full rounded-full" style={{ width: `${(report.scoringBreakdown.dataSentimentScore / 20) * 100}%` }} />
                  </div>
                </div>

                {/* 4. Technical Score */}
                <div className="p-2 rounded-lg bg-black/25 border border-white/5 space-y-1">
                  <div className="flex justify-between font-bold">
                    <span className="text-slate-300">4. Confluenza Grafica</span>
                    <span className="text-indigo-400 font-mono">{report.scoringBreakdown.technicalConfluenceScore}/20</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-indigo-400 h-full rounded-full" style={{ width: `${(report.scoringBreakdown.technicalConfluenceScore / 20) * 100}%` }} />
                  </div>
                </div>

                {/* 5. Risk Reward Score */}
                <div className="p-2 rounded-lg bg-black/25 border border-white/5 space-y-1">
                  <div className="flex justify-between font-bold">
                    <span className="text-slate-300">5. Risk/Reward Ratio</span>
                    <span className="text-emerald-400 font-mono">{report.scoringBreakdown.riskRewardScore}/20</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${(report.scoringBreakdown.riskRewardScore / 20) * 100}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Cards View Tab */}
          {activeTab === 'cards' && (
            <div className="space-y-5">
              {/* PILLAR 1: LE 7 VARIABILI MACROECONOMICHE FONDAMENTALI */}
              <div className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] space-y-4 shadow-sm">
                <div className="flex items-center gap-2 border-b border-[var(--border-color)] pb-2">
                  <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300">
                    <Globe className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wide">
                      1. Le 7 Variabili Macroeconomiche Fondamentali (Paese: {report.country})
                    </h3>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      Analisi dei pilastri strutturali del Paese secondo il Metodo Probo
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-black/20 border border-[var(--border-color)] space-y-1">
                    <span className="text-[10px] font-bold text-amber-400 uppercase">1. Bilancia dei Pagamenti & Conto Corrente</span>
                    <p className="text-slate-200 leading-relaxed">{report.macroPillars.sevenVariables.balanceOfPayments}</p>
                  </div>

                  <div className="p-3 rounded-xl bg-black/20 border border-[var(--border-color)] space-y-1">
                    <span className="text-[10px] font-bold text-blue-400 uppercase">2. Tassi Ufficiali & Differenziali</span>
                    <p className="text-slate-200 leading-relaxed">{report.macroPillars.sevenVariables.interestRatesAndSpreads}</p>
                  </div>

                  <div className="p-3 rounded-xl bg-black/20 border border-[var(--border-color)] space-y-1">
                    <span className="text-[10px] font-bold text-rose-400 uppercase">3. Tasso di Inflazione (CPI / PPI)</span>
                    <p className="text-slate-200 leading-relaxed">{report.macroPillars.sevenVariables.inflation}</p>
                  </div>

                  <div className="p-3 rounded-xl bg-black/20 border border-[var(--border-color)] space-y-1">
                    <span className="text-[10px] font-bold text-purple-400 uppercase">4. Offerta di Moneta & Liquidità</span>
                    <p className="text-slate-200 leading-relaxed">{report.macroPillars.sevenVariables.moneySupplyAndLiquidity}</p>
                  </div>

                  <div className="p-3 rounded-xl bg-black/20 border border-[var(--border-color)] space-y-1">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase">5. Bilancio dello Stato & PIL (GDP)</span>
                    <p className="text-slate-200 leading-relaxed">{report.macroPillars.sevenVariables.stateBudgetAndGdp}</p>
                  </div>

                  <div className="p-3 rounded-xl bg-black/20 border border-[var(--border-color)] space-y-1">
                    <span className="text-[10px] font-bold text-indigo-400 uppercase">6. Mercato del Lavoro & Salari</span>
                    <p className="text-slate-200 leading-relaxed">{report.macroPillars.sevenVariables.laborMarket}</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs text-slate-300 leading-relaxed space-y-1">
                  <strong className="text-amber-300 font-bold block">7. Differenziale Crescita-Produttività & Sintesi Fondamentale:</strong>
                  <p>{report.macroPillars.sevenVariables.growthProductivityDiff}</p>
                  <p className="text-slate-200 pt-1 font-semibold border-t border-amber-500/20 mt-1">{report.macroPillars.sevenVariables.summary}</p>
                </div>
              </div>

              {/* PILLAR 2: INDICATORI MACROECONOMICHI & SENTIMENT */}
              <div className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] space-y-4 shadow-sm">
                <div className="flex items-center gap-2 border-b border-[var(--border-color)] pb-2">
                  <span className="p-1.5 rounded-lg bg-blue-500/20 text-blue-300">
                    <BarChart3 className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wide">
                      2. Indicatori Macroeconomici, Fiducia & Banche Centrali
                    </h3>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      Classificazione dei dati recenti (Ifo, ZEW, PMI/ISM, CPI/PPI e orientamento monetario)
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-black/20 border border-[var(--border-color)] space-y-1">
                    <span className="text-[10px] font-bold text-blue-300 uppercase">Indici di Fiducia (Ifo, ZEW, Consumer Confidence)</span>
                    <p className="text-slate-200 leading-relaxed">{report.macroPillars.macroIndicators.confidenceIndexes}</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-black/20 border border-[var(--border-color)] space-y-1">
                    <span className="text-[10px] font-bold text-indigo-300 uppercase">Attività Economica (PMI/ISM, NFP, Beni Durevoli)</span>
                    <p className="text-slate-200 leading-relaxed">{report.macroPillars.macroIndicators.economicActivity}</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-black/20 border border-[var(--border-color)] space-y-1">
                    <span className="text-[10px] font-bold text-rose-300 uppercase">Inflazione Anticipata (CPI Core, PPI)</span>
                    <p className="text-slate-200 leading-relaxed">{report.macroPillars.macroIndicators.inflationData}</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-black/20 border border-[var(--border-color)] space-y-1">
                    <span className="text-[10px] font-bold text-purple-300 uppercase">Attività Banche Centrali & Beige Book</span>
                    <p className="text-slate-200 leading-relaxed">{report.macroPillars.macroIndicators.centralBanks}</p>
                  </div>
                </div>
              </div>

              {/* PILLAR 3: CICLO ECONOMICO & DINAMICHE INTERMARKET */}
              <div className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] space-y-4 shadow-sm">
                <div className="flex items-center justify-between gap-2 border-b border-[var(--border-color)] pb-2">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-purple-500/20 text-purple-300">
                      <Activity className="w-4 h-4" />
                    </span>
                    <div>
                      <h3 className="text-sm font-black text-white uppercase tracking-wide">
                        3. Ciclo Economico & Dinamiche Intermarket
                      </h3>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        Posizionamento nelle 6 fasi cicliche e regime di mercato
                      </p>
                    </div>
                  </div>

                  <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase border ${
                    report.macroPillars.cyclicIntermarket.marketRegime === 'RISK ON'
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                  }`}>
                    REGIME: {report.macroPillars.cyclicIntermarket.marketRegime}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-black/20 border border-[var(--border-color)] space-y-1">
                    <span className="text-[10px] font-bold text-purple-300 uppercase">Fase del Ciclo Macroeconomico</span>
                    <p className="text-slate-200 leading-relaxed">{report.macroPillars.cyclicIntermarket.cyclicPhase}</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-black/20 border border-[var(--border-color)] space-y-1">
                    <span className="text-[10px] font-bold text-indigo-300 uppercase">Indicatori Intermarket & Correlazioni (r, Baltic Dry, Rame)</span>
                    <p className="text-slate-200 leading-relaxed">{report.macroPillars.cyclicIntermarket.intermarketCorrelations}</p>
                  </div>
                </div>
              </div>

              {/* PILLAR 4 & 5: OPERATIONAL PLAN (Trading & Investimenti) */}
              <div className="p-5 rounded-2xl border border-blue-500/30 bg-gradient-to-br from-[var(--bg-card)] to-indigo-950/30 space-y-4 shadow-md">
                <div className="flex items-center justify-between gap-2 border-b border-[var(--border-color)] pb-2">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300">
                      <Target className="w-4 h-4" />
                    </span>
                    <div>
                      <h3 className="text-sm font-black text-white uppercase tracking-wide">
                        4. Piano Operativo Trading & Investimenti Metodo Probo
                      </h3>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        Set-up tattico, Stop Loss, Scaling Out 50% e Rapporto Rischio/Rendimento
                      </p>
                    </div>
                  </div>

                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold text-xs border border-emerald-500/30">
                    R/R Ratio: {report.operationalPlan.riskRewardRatio}
                  </span>
                </div>

                {/* Tactical Setup Grid Table */}
                <div className="overflow-x-auto rounded-xl border border-[var(--border-color)] bg-black/30">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[var(--bg-header)] text-[var(--text-muted)] font-bold text-[10px] uppercase border-b border-[var(--border-color)]">
                        <th className="p-2.5">Parametro Tattico</th>
                        <th className="p-2.5">Valore / Livello Consigliato</th>
                        <th className="p-2.5">Regola Operativa Probo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-color)] text-slate-300">
                      <tr>
                        <td className="p-2.5 font-bold text-white flex items-center gap-1.5">
                          <DollarSign className="w-3.5 h-3.5 text-blue-400" />
                          <span>Prezzo d'Ingresso Consigliato</span>
                        </td>
                        <td className="p-2.5 font-bold text-blue-300 font-mono">{report.operationalPlan.recommendedEntry}</td>
                        <td className="p-2.5 text-[11px]">Ingresso al test del livello di supporto/resistenza di breve.</td>
                      </tr>

                      <tr className="bg-rose-500/5">
                        <td className="p-2.5 font-bold text-rose-300 flex items-center gap-1.5">
                          <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                          <span>Stop Loss Grafico</span>
                        </td>
                        <td className="p-2.5 font-bold text-rose-300 font-mono">{report.operationalPlan.stopLoss}</td>
                        <td className="p-2.5 text-[11px]">Posizionato oltre i punti di svolta secondari.</td>
                      </tr>

                      <tr className="bg-emerald-500/5">
                        <td className="p-2.5 font-bold text-emerald-300 flex items-center gap-1.5">
                          <Target className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Take Profit 1 (50% Scaling Out)</span>
                        </td>
                        <td className="p-2.5 font-bold text-emerald-300 font-mono">{report.operationalPlan.takeProfit1}</td>
                        <td className="p-2.5 text-[11px]">Primo ostacolo grafico: chiusura 50% e Stop a Breakeven.</td>
                      </tr>

                      <tr>
                        <td className="p-2.5 font-bold text-indigo-300 flex items-center gap-1.5">
                          <Target className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Take Profit 2 (Target Esteso)</span>
                        </td>
                        <td className="p-2.5 font-bold text-indigo-300 font-mono">{report.operationalPlan.takeProfit2}</td>
                        <td className="p-2.5 text-[11px]">Target finale per la metà posizione residua.</td>
                      </tr>

                      <tr className="bg-blue-500/5 font-bold">
                        <td className="p-2.5 text-white flex items-center gap-1.5">
                          <Scale className="w-3.5 h-3.5 text-blue-400" />
                          <span>Rapporto Rischio/Rendimento</span>
                        </td>
                        <td className="p-2.5 text-blue-300 font-mono">{report.operationalPlan.riskRewardRatio}</td>
                        <td className="p-2.5 text-[11px]">Favorevole (minimo 1:1.5, idealmente ≥ 1:2.0).</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="p-3.5 rounded-xl bg-blue-500/5 border border-blue-500/20 text-xs text-slate-200 leading-relaxed">
                  <strong className="text-blue-300 font-bold block mb-1">Motivazione del Piano Operativo:</strong>
                  {report.operationalPlan.rationale}
                </div>
              </div>
            </div>
          )}

          {/* Markdown View Tab */}
          {activeTab === 'markdown' && (
            <div className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] space-y-4 shadow-sm font-mono text-xs text-slate-200 overflow-x-auto whitespace-pre-wrap leading-relaxed">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border-color)]">
                <span className="text-xs font-bold text-blue-400 uppercase">Report Formattato Markdown Metodo Probo</span>
                <button
                  onClick={handleCopy}
                  className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-sans text-xs font-bold cursor-pointer"
                >
                  {copied ? 'Copiato!' : 'Copia Testo Markdown'}
                </button>
              </div>
              {report.markdownReport}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MarketAnalysisPage;
