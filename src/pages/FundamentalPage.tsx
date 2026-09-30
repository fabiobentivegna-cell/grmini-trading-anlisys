import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  RefreshCw,
  TrendingUp,
  Target,
  Users,
  Calendar,
  Building2,
  PieChart,
  ShieldCheck
} from 'lucide-react';
import { FundamentalData } from '../types';
import { marketDataService } from '../services/marketDataService';
import { geminiService } from '../services/geminiService';

interface FundamentalPageProps {
  ticker: string;
}

export const FundamentalPage: React.FC<FundamentalPageProps> = ({ ticker }) => {
  const [data, setData] = useState<FundamentalData | null>(null);
  const [loading, setLoading] = useState(false);
  const [seasonPeriod, setSeasonPeriod] = useState('5y');
  const [aiVerdict, setAiVerdict] = useState<string>('');
  const [loadingAi, setLoadingAi] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await marketDataService.getFundamentalAnalysis(ticker, seasonPeriod);
      setData(res);
      setAiVerdict('');
    } catch (e) {
      console.error('Errore analisi fondamentale:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [ticker, seasonPeriod]);

  const handleGenerateAudit = async () => {
    if (!data) return;
    setLoadingAi(true);
    try {
      const audit = await geminiService.generateFundamentalAudit(data);
      setAiVerdict(audit);
    } catch (e) {
      setAiVerdict('Errore durante la generazione dell\'audit con Gemini: ' + e);
    } finally {
      setLoadingAi(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-[var(--bg-main)] text-[var(--text-muted)] text-sm">
        <RefreshCw className="w-5 h-5 animate-spin mr-2 text-blue-500" />
        <span>Caricamento bilanci e modelli fondamentali per {ticker}...</span>
      </div>
    );
  }

  if (!data) return null;

  const vm = data.valuation_models;
  const an = data.analyst_forecasts;
  const inst = data.institutional_holdings;
  const rel = data.relative_perf;

  const isUnderValued = vm.safety_margin_pct > 15;
  const isOverValued = vm.safety_margin_pct < -15;

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[var(--bg-main)]">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Hero Banner Azienda & Prezzo */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl md:text-2xl font-bold text-[var(--text-main)]">
                {data.name} ({data.ticker})
              </h2>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Settore: <span className="font-semibold text-[var(--text-main)]">{data.sector}</span> • Industria: {data.industry} • Valuta: {data.currency}
            </p>
          </div>

          <div className="text-right">
            <div className="text-2xl md:text-3xl font-extrabold text-blue-600 dark:text-blue-400 font-mono">
              {data.price.toFixed(2)} {data.currency}
            </div>
            <span
              className={`inline-block mt-1 px-3 py-1 rounded text-xs font-bold border ${
                isUnderValued
                  ? 'bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                  : isOverValued
                  ? 'bg-red-500/15 border-red-500 text-red-600 dark:text-red-400'
                  : 'bg-neutral-500/15 border-neutral-400 text-neutral-500'
              }`}
            >
              {vm.status_label} (Margine {vm.safety_margin_pct > 0 ? `+${vm.safety_margin_pct}%` : `${vm.safety_margin_pct}%`})
            </span>
          </div>
        </div>

        {/* 4 Cards Grid - Modelli Quantitativi */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* Card 1: Valutazione Fair Value & DCF */}
          <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] space-y-3 shadow-xs">
            <div className="flex items-center gap-2 pb-2 border-b border-[var(--border-color)]">
              <ShieldCheck className="w-4 h-4 text-blue-500" />
              <h3 className="font-bold uppercase tracking-wider text-[var(--text-main)]">
                Valutazione Fair Value
              </h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">DCF (5 Anni):</span>
                <strong className="font-mono text-emerald-500 font-bold">{vm.dcf_fair_value} {data.currency}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Benjamin Graham:</span>
                <strong className="font-mono text-[var(--text-main)]">{vm.graham_number} {data.currency}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Peter Lynch Value:</span>
                <strong className="font-mono text-[var(--text-main)]">{vm.peter_lynch_value} {data.currency}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Crescita EPS Attesa:</span>
                <strong className="font-mono text-blue-500">+{vm.expected_growth_pct}%</strong>
              </div>
              <div className="flex justify-between pt-1 border-t border-[var(--border-color)]">
                <span className="text-[var(--text-muted)] font-bold">Margine Sicurezza:</span>
                <strong className={`font-mono font-bold ${vm.safety_margin_pct > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {vm.safety_margin_pct > 0 ? `+${vm.safety_margin_pct}%` : `${vm.safety_margin_pct}%`}
                </strong>
              </div>
            </div>
          </div>

          {/* Card 2: Previsioni Analisti */}
          <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] space-y-3 shadow-xs">
            <div className="flex items-center gap-2 pb-2 border-b border-[var(--border-color)]">
              <Target className="w-4 h-4 text-purple-500" />
              <h3 className="font-bold uppercase tracking-wider text-[var(--text-main)]">
                Previsioni Analisti
              </h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Consenso Mercato:</span>
                <span className="px-2 py-0.5 rounded font-bold bg-blue-500/10 text-blue-500 border border-blue-500/30">
                  {an.recommendation}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Target Price Medio:</span>
                <strong className="font-mono text-[var(--text-main)]">{an.target_mean} {data.currency}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Target Massimo:</span>
                <strong className="font-mono text-emerald-500">{an.target_high} {data.currency}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Target Minimo:</span>
                <strong className="font-mono text-red-500">{an.target_low} {data.currency}</strong>
              </div>
              <div className="flex justify-between pt-1 border-t border-[var(--border-color)]">
                <span className="text-[var(--text-muted)]">Copertura Analisti:</span>
                <strong className="font-mono text-[var(--text-main)]">{an.num_analysts} analisti</strong>
              </div>
            </div>
          </div>

          {/* Card 3: Istituzionali & Insider */}
          <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] space-y-3 shadow-xs">
            <div className="flex items-center gap-2 pb-2 border-b border-[var(--border-color)]">
              <Users className="w-4 h-4 text-amber-500" />
              <h3 className="font-bold uppercase tracking-wider text-[var(--text-main)]">
                Azionariato & Struttura
              </h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Fondi Istituzionali:</span>
                <strong className="font-mono text-[var(--text-main)]">{inst.institutions_pct}%</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Insider / Management:</span>
                <strong className="font-mono text-[var(--text-main)]">{inst.insiders_pct}%</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Flottante (Float):</span>
                <strong className="font-mono text-[var(--text-main)]">{(inst.float_shares / 1e6).toFixed(1)}M azioni</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Dividend Yield:</span>
                <strong className="font-mono text-emerald-500">+{data.multiples.dividend_yield}%</strong>
              </div>
              <div className="flex justify-between pt-1 border-t border-[var(--border-color)]">
                <span className="text-[var(--text-muted)]">P/E Ratio:</span>
                <strong className="font-mono text-[var(--text-main)]">{data.multiples.pe}x</strong>
              </div>
            </div>
          </div>

          {/* Card 4: Performance vs Indice */}
          <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] space-y-3 shadow-xs">
            <div className="flex items-center gap-2 pb-2 border-b border-[var(--border-color)]">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <h3 className="font-bold uppercase tracking-wider text-[var(--text-main)]">
                Performance vs {rel.benchmark_name}
              </h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Rendimento Titolo (1M):</span>
                <strong className="font-mono text-emerald-500">+{rel.stock_1m}%</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Rendimento Indice (1M):</span>
                <strong className="font-mono text-[var(--text-main)]">+{rel.bench_1m}%</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Rendimento Titolo (1A):</span>
                <strong className="font-mono text-emerald-500">+{rel.stock_1y}%</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Alpha Sovraperformance:</span>
                <strong className="font-mono text-blue-500">+{rel.alpha_1y}%</strong>
              </div>
              <div className="flex justify-between pt-1 border-t border-[var(--border-color)]">
                <span className="text-[var(--text-muted)] font-bold">Beta Storico:</span>
                <strong className="font-mono font-bold text-[var(--text-main)]">{rel.beta}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Stagionalità Storica */}
        <div className="p-5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-color)] pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-500" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-[var(--text-main)]">
                Stagionalità Storica (Rendimento Medio per Mese)
              </h3>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <label className="text-[var(--text-muted)] font-semibold">Orizzonte:</label>
              <select
                value={seasonPeriod}
                onChange={e => setSeasonPeriod(e.target.value)}
                className="px-2 py-1 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] font-semibold outline-none"
              >
                <option value="1mo">1 Mese</option>
                <option value="3mo">3 Mesi</option>
                <option value="6mo">6 Mesi</option>
                <option value="1y">1 Anno</option>
                <option value="5y">5 Anni</option>
                <option value="10y">10 Anni</option>
              </select>
            </div>
          </div>

          {/* Bar Chart Container */}
          <div className="flex items-end justify-between gap-2 h-36 pt-4 px-2">
            {data.seasonality.map((pt, idx) => {
              const maxVal = Math.max(...data.seasonality.map(s => Math.abs(s.avg_return)), 1.0);
              const heightPct = Math.min((Math.abs(pt.avg_return) / maxVal) * 80, 80);
              const isPositive = pt.avg_return >= 0;

              return (
                <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full group">
                  <span className={`text-[10px] font-bold font-mono ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                    {isPositive ? `+${pt.avg_return}%` : `${pt.avg_return}%`}
                  </span>
                  <div
                    style={{ height: `${Math.max(heightPct, 6)}px` }}
                    className={`w-full max-w-[28px] rounded-t transition-all duration-300 ${
                      isPositive ? 'bg-emerald-500 group-hover:bg-emerald-400' : 'bg-red-500 group-hover:bg-red-400'
                    }`}
                  />
                  <span className="text-[11px] font-semibold text-[var(--text-muted)] mt-2">
                    {pt.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Confronto Titoli dello Stesso Settore */}
        <div className="p-5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-xs">
          <div className="flex items-center gap-2 border-b border-[var(--border-color)] pb-3 mb-3">
            <Building2 className="w-4 h-4 text-blue-500" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-[var(--text-main)]">
              Confronto Multipli di Mercato con i Concorrenti di Settore
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)] uppercase text-[10px]">
                  <th className="py-2.5 px-3">Azienda</th>
                  <th className="py-2.5 px-3">P/E</th>
                  <th className="py-2.5 px-3">P/B</th>
                  <th className="py-2.5 px-3">EV/EBITDA</th>
                  <th className="py-2.5 px-3">ROE (%)</th>
                  <th className="py-2.5 px-3">Div. Yield (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {/* Current company row */}
                <tr className="bg-blue-600/5 font-bold">
                  <td className="py-2.5 px-3 text-blue-500">{data.name} ({data.ticker}) ★</td>
                  <td className="py-2.5 px-3 font-mono">{data.multiples.pe}x</td>
                  <td className="py-2.5 px-3 font-mono">{data.multiples.pb}x</td>
                  <td className="py-2.5 px-3 font-mono">{data.multiples.ev_ebitda}x</td>
                  <td className="py-2.5 px-3 font-mono text-emerald-500">16.8%</td>
                  <td className="py-2.5 px-3 font-mono text-emerald-500">+{data.multiples.dividend_yield}%</td>
                </tr>
                {data.peers.map((peer, idx) => (
                  <tr key={idx} className="hover:bg-[var(--bg-main)] transition">
                    <td className="py-2 px-3 font-medium text-[var(--text-main)]">{peer.name} ({peer.symbol})</td>
                    <td className="py-2 px-3 font-mono text-[var(--text-muted)]">{peer.pe}x</td>
                    <td className="py-2 px-3 font-mono text-[var(--text-muted)]">{peer.pb}x</td>
                    <td className="py-2 px-3 font-mono text-[var(--text-muted)]">{peer.ev_ebitda}x</td>
                    <td className="py-2 px-3 font-mono text-[var(--text-muted)]">{peer.roe}%</td>
                    <td className="py-2 px-3 font-mono text-emerald-500">+{peer.div_yield}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* AI Quantitative Audit Section */}
        <div className="p-5 rounded-xl bg-[var(--bg-card)] border-l-4 border-l-blue-600 border border-[var(--border-color)] shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-500" />
              <h3 className="font-bold text-sm text-[var(--text-main)]">
                Analisi Complessiva AI del Valore Intrinseco & Prospettive di Crescita
              </h3>
            </div>
            <button
              onClick={handleGenerateAudit}
              disabled={loadingAi}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs transition shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingAi ? 'animate-spin' : ''}`} />
              <span>{loadingAi ? 'Elaborazione Audit AI...' : 'Genera Audit AI'}</span>
            </button>
          </div>

          <div className="p-4 rounded-lg bg-[var(--bg-main)] border border-[var(--border-color)] text-xs text-[var(--text-main)] leading-relaxed whitespace-pre-wrap font-sans">
            {aiVerdict || (
              <span className="text-[var(--text-muted)]">
                Clicca su <strong className="text-blue-500 font-semibold">'Genera Audit AI'</strong> per elaborare la valutazione quantitativa completa incrociata con i modelli DCF, multipli di settore, target analisti e prospettive macroeconomiche tramite Google Gemini.
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
