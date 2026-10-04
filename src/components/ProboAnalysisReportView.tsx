import React, { useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Target,
  ShieldAlert,
  Zap,
  TrendingUp,
  TrendingDown,
  Layers,
  Info,
  Copy,
  Check,
  Download,
  Percent,
  Sliders,
  BarChart3
} from 'lucide-react';
import { ProboAnalysisReport } from '../types';

interface ProboAnalysisReportViewProps {
  report: ProboAnalysisReport;
  onCopySetup?: () => void;
  onExportJson?: () => void;
  className?: string;
}

export const ProboAnalysisReportView: React.FC<ProboAnalysisReportViewProps> = ({
  report,
  onCopySetup,
  onExportJson,
  className = ''
}) => {
  const [copied, setCopied] = useState(false);

  const handleLocalCopy = () => {
    if (onCopySetup) {
      onCopySetup();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      return;
    }

    const summaryText = `=== REPORT GIACOMO PROBO: ${report.ticker} [${report.timeframe}] ===
Indicazione: ${report.operationVerdict} | Size: ${report.sizeManagement.recommendedSize} (${report.sizeManagement.capitalRiskPct})
Confluenza Tecniche: ${report.confluence.totalConfirmedCount}/5 Concordi
--------------------------------------------------
Prezzo Ingresso: €${report.tacticalSetup.entryPrice}
Stop Loss: €${report.tacticalSetup.stopLossPrice} (${report.tacticalSetup.stopLossPlacementReason})
Take Profit 1 (50% Scaling Out): €${report.tacticalSetup.takeProfit1}
Take Profit 2 (Target Esteso): €${report.tacticalSetup.takeProfit2}
Rapporto Rischio/Rendimento: 1:${report.tacticalSetup.riskRewardRatio}
--------------------------------------------------
Stocastico Lento 10-6-3: %K=${report.confluence.oscillators.slowStochastic.kValue}, %D=${report.confluence.oscillators.slowStochastic.dValue} [${report.confluence.oscillators.slowStochastic.zone}]
Bande di Bollinger 5/1.8: ${report.confluence.oscillators.bollingerBands.pricePosition}
Point of Control (POC): €${report.confluence.volumeProfile.pocPrice}
Sintesi: ${report.executiveSummary}`;

    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLocalExport = () => {
    if (onExportJson) {
      onExportJson();
      return;
    }
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(report, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `probo-report-${report.ticker}-${report.timeframe}-${new Date().toISOString().split('T')[0]}.json`);
    dlAnchor.click();
  };

  // Badge styling for Size Recommendation
  const getSizeBadgeStyle = (size: string) => {
    const clean = size.toUpperCase();
    if (clean.includes('MASSIMA')) {
      return {
        badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-sm shadow-emerald-500/20',
        dot: 'bg-emerald-400',
        label: 'SIZE MASSIMA (5/5 CONFLUENZA)',
        icon: '💎'
      };
    } else if (clean.includes('INTERMEDIA')) {
      return {
        badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40 shadow-xs',
        dot: 'bg-blue-400',
        label: 'SIZE INTERMEDIA (3-4/5 CONFLUENZA)',
        icon: '⚖️'
      };
    } else if (clean.includes('MINIMA')) {
      return {
        badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        dot: 'bg-amber-400',
        label: 'SIZE MINIMA (SEGNALE PARZIALE)',
        icon: '⚠️'
      };
    } else {
      return {
        badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        dot: 'bg-rose-400',
        label: 'NESSUNA ENTRATA (RISCHIO ELEVATO)',
        icon: '🛑'
      };
    }
  };

  const sizeStyle = getSizeBadgeStyle(report.sizeManagement.recommendedSize);
  const isBull = report.operationVerdict === 'BUY';
  const isBear = report.operationVerdict === 'SELL';

  return (
    <div className={`space-y-5 text-xs text-[var(--text-main)] ${className}`}>
      {/* 1. Header Banner & Action Bar */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/70 via-indigo-950/50 to-[var(--bg-card)] border border-blue-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-md">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="p-1.5 rounded-lg bg-blue-600 text-white shadow-xs">
              <BookOpen className="w-4 h-4" />
            </span>
            <h3 className="text-sm md:text-base font-black uppercase text-white tracking-wide flex items-center gap-2">
              <span>Report Analisi AI Metodologia Giacomo Probo</span>
              <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-mono font-bold border border-blue-400/30">
                {report.ticker} • {report.timeframe}
              </span>
            </h3>
          </div>
          <p className="text-[11px] text-[var(--text-muted)]">
            Analisi rigorosa basata sulla confluenza delle 5 tecniche combinate, parametrizzazione Stocastico 10-6-3, Bollinger 5/1.8 e Scaling Out al 50%.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleLocalCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--border-color)] text-xs font-bold transition cursor-pointer shadow-xs"
            title="Copia negli appunti la sintesi operativa"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-blue-400" />}
            <span>{copied ? 'Copiato!' : 'Copia Report'}</span>
          </button>
          <button
            onClick={handleLocalExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--border-color)] text-xs font-bold transition cursor-pointer shadow-xs"
            title="Esporta il report completo in formato JSON"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>JSON</span>
          </button>
        </div>
      </div>

      {/* 2. Top Metric Cards Grid: Verdict, Size Badge, Risk/Reward, Confluence Count */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Operational Verdict Card */}
        <div className={`p-4 rounded-xl border flex flex-col justify-between ${
          isBull
            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-sm shadow-emerald-500/10'
            : isBear
            ? 'bg-rose-500/10 border-rose-500/40 text-rose-400 shadow-sm shadow-rose-500/10'
            : 'bg-amber-500/10 border-amber-500/40 text-amber-400'
        }`}>
          <div className="flex items-center justify-between text-[10px] uppercase font-bold text-[var(--text-muted)]">
            <span>Segnale Operativo</span>
            <span>{isBull ? '🟢 LONG' : isBear ? '🔴 SHORT' : '🟡 NEUTRO'}</span>
          </div>
          <div className="text-2xl font-black tracking-tight my-1 flex items-center gap-2">
            <span>{report.operationVerdict}</span>
            {isBull && <TrendingUp className="w-5 h-5 text-emerald-400" />}
            {isBear && <TrendingDown className="w-5 h-5 text-rose-400" />}
          </div>
          <div className="text-[11px] font-semibold text-slate-300">
            Trend Primario: <strong className="text-white">{report.marketScenario.primaryTrend}</strong>
          </div>
        </div>

        {/* Size Recommendation Specific Badge Card */}
        <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] flex flex-col justify-between space-y-1.5">
          <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Size Consigliata (Modulazione Capitale)</span>
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-black tracking-wider uppercase ${sizeStyle.badge}`}>
            <span>{sizeStyle.icon}</span>
            <span>{report.sizeManagement.recommendedSize}</span>
          </div>
          <div className="text-[10.5px] text-slate-300">
            Margine Rischio: <strong className="text-white">{report.sizeManagement.capitalRiskPct}</strong> del capitale
          </div>
        </div>

        {/* Risk / Reward Ratio Card */}
        <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] flex flex-col justify-between space-y-1">
          <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Rapporto Rischio / Rendimento</span>
          <div className="text-xl font-black font-mono text-blue-400">
            1 : {report.tacticalSetup.riskRewardRatio}
          </div>
          <div className="flex items-center gap-1 text-[10.5px] text-emerald-400 font-bold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{report.tacticalSetup.riskRewardCompliant ? 'Conforme (>= 1:2.0)' : 'Parametro Neutrale'}</span>
          </div>
        </div>

        {/* Confluence Score 0-5 Card */}
        <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] flex flex-col justify-between space-y-1">
          <div className="flex items-center justify-between text-[10px] uppercase font-bold text-[var(--text-muted)]">
            <span>Confluenza Tecniche</span>
            <span className="text-purple-300">{report.confluence.totalConfirmedCount}/5</span>
          </div>
          <div className="text-xl font-black text-purple-400">
            {report.confluence.totalConfirmedCount} / 5
          </div>
          <div className="w-full bg-black/40 h-2 rounded-full overflow-hidden border border-white/5">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-300"
              style={{ width: `${(report.confluence.totalConfirmedCount / 5) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* 3. Market Scenario Table & Context */}
      <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] space-y-3 shadow-xs">
        <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2">
          <h4 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-400" />
            <span>1. Scenario di Mercato & Livelli Chiave (Supporti e Resistenze)</span>
          </h4>
          <span className="text-[10px] font-mono text-[var(--text-muted)]">Prezzo Corrente: €{report.currentPrice}</span>
        </div>

        <p className="text-xs text-slate-200 leading-relaxed italic p-2.5 rounded-xl bg-black/20 border border-white/5">
          "{report.marketScenario.marketContext}"
        </p>

        {/* Key Levels Grid Table */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
          <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <span className="text-[9.5px] uppercase font-bold text-blue-300 block">Supporto Primario</span>
            <strong className="text-sm font-black text-white">€{report.marketScenario.primarySupport}</strong>
          </div>
          <div className="p-2.5 rounded-xl bg-blue-600/15 border border-blue-500/30">
            <span className="text-[9.5px] uppercase font-bold text-blue-400 block">Supporto Secondario (SL)</span>
            <strong className="text-sm font-black text-blue-200">€{report.marketScenario.secondarySupport}</strong>
          </div>
          <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
            <span className="text-[9.5px] uppercase font-bold text-indigo-300 block">Resistenza Primaria (TP1)</span>
            <strong className="text-sm font-black text-white">€{report.marketScenario.primaryResistance}</strong>
          </div>
          <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20">
            <span className="text-[9.5px] uppercase font-bold text-purple-300 block">Resistenza Secondaria (TP2)</span>
            <strong className="text-sm font-black text-purple-200">€{report.marketScenario.secondaryResistance}</strong>
          </div>
        </div>
      </div>

      {/* 4. Table of the 5 Combined Techniques (Confluenza delle 5 Tecniche) */}
      <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] overflow-hidden shadow-xs space-y-0">
        <div className="px-4 py-3 bg-[var(--bg-header)] border-b border-[var(--border-color)] flex items-center justify-between font-bold text-xs text-white">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-300" />
            <span>2. Confluenza delle 5 Tecniche Combinate di Giacomo Probo</span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30 font-mono text-[10px] font-bold">
            {report.confluence.totalConfirmedCount}/5 CONFERMATE
          </span>
        </div>

        {/* Structured Table Layout */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-color)] bg-black/20 text-[10px] uppercase text-[var(--text-muted)]">
                <th className="py-2.5 px-4 font-bold">Tecnica Combinata</th>
                <th className="py-2.5 px-4 font-bold">Stato / Segnale</th>
                <th className="py-2.5 px-4 font-bold">Parametri & Dettagli di Confluenza</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)] text-[11.5px]">
              {/* Row 1: Analisi Grafica Classica */}
              <tr className="hover:bg-white/5 transition-colors">
                <td className="py-3 px-4 font-bold text-blue-400">
                  1. Analisi Grafica Classica
                </td>
                <td className="py-3 px-4">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                    report.confluence.classicalGraph.confirmed ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-500/20 text-slate-400'
                  }`}>
                    {report.confluence.classicalGraph.confirmed ? '✓ CONFERMATO' : '– NEUTRO'}
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-300 leading-relaxed">
                  <div>{report.confluence.classicalGraph.trendlinesAndChannels}</div>
                  <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
                    S/R: {report.confluence.classicalGraph.supportResistance} • Fibonacci: {report.confluence.classicalGraph.fibonacciLevels}
                  </div>
                </td>
              </tr>

              {/* Row 2: Candlestick & Heiken Ashi */}
              <tr className="hover:bg-white/5 transition-colors">
                <td className="py-3 px-4 font-bold text-emerald-400">
                  2. Candlestick & Heiken Ashi
                </td>
                <td className="py-3 px-4">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                    report.confluence.candlestickHeikenAshi.confirmed ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-500/20 text-slate-400'
                  }`}>
                    {report.confluence.candlestickHeikenAshi.confirmed ? '✓ CONFERMATO' : '– NEUTRO'}
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-300 leading-relaxed">
                  Pattern: <strong className="text-white">{report.confluence.candlestickHeikenAshi.candlestickPattern}</strong>
                  <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
                    {report.confluence.candlestickHeikenAshi.heikenAshiTrend}
                  </div>
                </td>
              </tr>

              {/* Row 3: Medie Mobili */}
              <tr className="hover:bg-white/5 transition-colors">
                <td className="py-3 px-4 font-bold text-indigo-400">
                  3. Medie Mobili
                </td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold">
                    {report.confluence.movingAverages.primaryDirection}
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-300 leading-relaxed">
                  {report.confluence.movingAverages.details}
                </td>
              </tr>

              {/* Row 4a: Stocastico Lento 10-6-3 */}
              <tr className="hover:bg-white/5 transition-colors">
                <td className="py-3 px-4 font-bold text-amber-400">
                  4a. Stocastico Lento (10-6-3)
                </td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                    {report.confluence.oscillators.slowStochastic.zone}
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-300 leading-relaxed">
                  <div className="font-mono text-[10px] text-amber-300 font-bold">
                    %K: {report.confluence.oscillators.slowStochastic.kValue} | %D: {report.confluence.oscillators.slowStochastic.dValue}
                  </div>
                  <div>{report.confluence.oscillators.slowStochastic.crossover}</div>
                  <div className="text-[10px] text-[var(--text-muted)]">{report.confluence.oscillators.slowStochastic.divergence}</div>
                </td>
              </tr>

              {/* Row 4b: Bande di Bollinger 5/1.8 */}
              <tr className="hover:bg-white/5 transition-colors">
                <td className="py-3 px-4 font-bold text-cyan-400">
                  4b. Bollinger (5 / 1.8 Dev.Std)
                </td>
                <td className="py-3 px-4">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                    report.confluence.oscillators.bollingerBands.volatilityExcess ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    {report.confluence.oscillators.bollingerBands.pricePosition}
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-300 leading-relaxed">
                  {report.confluence.oscillators.bollingerBands.details}
                </td>
              </tr>

              {/* Row 5: Volume Profile & POC */}
              <tr className="hover:bg-white/5 transition-colors">
                <td className="py-3 px-4 font-bold text-purple-400">
                  5. Volume Profile & POC
                </td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold font-mono">
                    POC: €{report.confluence.volumeProfile.pocPrice}
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-300 leading-relaxed">
                  <div>{report.confluence.volumeProfile.valueArea}</div>
                  <div className="text-[10px] text-[var(--text-muted)]">{report.confluence.volumeProfile.volumeConfirmation}</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Tactical Setup Card & Scaling Out Strategy */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-900/30 via-indigo-900/20 to-purple-900/30 border border-blue-500/30 space-y-3 shadow-xs">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-blue-500/20 pb-2">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-black text-white uppercase tracking-wider">
              3. Set-Up Operativo & Strategia di Scaling Out al 50%
            </span>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
            RULES COMPLIANT
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="p-3 rounded-xl bg-black/30 border border-white/5 space-y-0.5">
            <span className="text-[9.5px] uppercase font-bold text-slate-400 block">Prezzo Ingresso</span>
            <strong className="text-sm font-black text-white">€{report.tacticalSetup.entryPrice}</strong>
          </div>
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-0.5">
            <span className="text-[9.5px] uppercase font-bold text-rose-400 block">Stop Loss Grafico</span>
            <strong className="text-sm font-black text-rose-300">€{report.tacticalSetup.stopLossPrice}</strong>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-0.5">
            <span className="text-[9.5px] uppercase font-bold text-emerald-400 block">TP1 (50% Scaling Out)</span>
            <strong className="text-sm font-black text-emerald-300">€{report.tacticalSetup.takeProfit1}</strong>
          </div>
          <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 space-y-0.5">
            <span className="text-[9.5px] uppercase font-bold text-indigo-400 block">TP2 (Target Esteso)</span>
            <strong className="text-sm font-black text-indigo-300">€{report.tacticalSetup.takeProfit2}</strong>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-slate-200 leading-relaxed space-y-1">
          <div className="text-blue-300 font-bold flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" />
            <span>Strategia di Scaling Out & Gestione dello Stop Loss:</span>
          </div>
          <p className="text-[11.5px]">{report.tacticalSetup.scalingOutStrategy}</p>
          <p className="text-[10.5px] text-[var(--text-muted)] italic">
            Posizionamento Stop Loss: {report.tacticalSetup.stopLossPlacementReason}
          </p>
        </div>
      </div>

      {/* 6. Executive Summary & Compliance Checklist Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Executive Summary */}
        <div className="lg:col-span-7 p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] space-y-2 shadow-xs">
          <div className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5" />
            <span>4. Sintesi Operativa Stile Giacomo Probo</span>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed">
            {report.executiveSummary}
          </p>
        </div>

        {/* Rules Compliance Checklist */}
        <div className="lg:col-span-5 p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20 space-y-2 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-blue-300 block">
            5. Checklist Rispondenza ai Manuali Probo
          </span>
          <div className="space-y-1.5 text-[11px]">
            {report.proboRulesCompliance.map((rule, idx) => (
              <div key={idx} className="flex items-center gap-2 text-slate-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{rule}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProboAnalysisReportView;
