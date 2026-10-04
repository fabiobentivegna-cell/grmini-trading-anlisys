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
  Copy,
  Check,
  Download,
  Info,
  Scale,
  DollarSign
} from 'lucide-react';
import { ProboAnalysisReport as ProboAnalysisReportType } from '../types';

export interface ProboAnalysisReportProps {
  report: ProboAnalysisReportType;
  onCopySetup?: () => void;
  onExportJson?: () => void;
  className?: string;
}

export const ProboAnalysisReport: React.FC<ProboAnalysisReportProps> = ({
  report,
  onCopySetup,
  onExportJson,
  className = ''
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (onCopySetup) {
      onCopySetup();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      return;
    }

    const summary = `=== REPORT GIACOMO PROBO: ${report.ticker} [${report.timeframe}] ===
Operazione: ${report.operationVerdict} | Size: ${report.sizeManagement.recommendedSize} (${report.sizeManagement.capitalRiskPct})
Confluenza 5 Tecniche: ${report.confluence.totalConfirmedCount}/5 Concordi
--------------------------------------------------
Prezzo Ingresso: €${report.tacticalSetup.entryPrice}
Stop Loss Grafico: €${report.tacticalSetup.stopLossPrice} (${report.tacticalSetup.stopLossPlacementReason})
Take Profit 1 (50% Scaling Out): €${report.tacticalSetup.takeProfit1}
Take Profit 2 (Target Esteso): €${report.tacticalSetup.takeProfit2}
Rapporto Rischio/Rendimento: 1:${report.tacticalSetup.riskRewardRatio}
--------------------------------------------------
Sintesi: ${report.executiveSummary}`;

    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = () => {
    if (onExportJson) {
      onExportJson();
      return;
    }
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(report, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `probo-report-${report.ticker}-${report.timeframe}.json`);
    dlAnchor.click();
  };

  // Badge Styling for Size Recommendation based on Giacomo Probo methodology rules
  const getSizeBadgeStyle = (size: string) => {
    const s = size.toUpperCase();
    if (s.includes('MASSIMA')) {
      return {
        bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm shadow-emerald-500/20',
        dot: 'bg-emerald-400',
        icon: '💎',
        tag: 'SIZE MASSIMA (5/5 CONFLUENZA)',
        desc: 'Confluenza totale delle 5 tecniche (o Stocastico + Bollinger + Candela di Inversione). Margine di rischio max 2%-5%.'
      };
    } else if (s.includes('INTERMEDIA')) {
      return {
        bg: 'bg-blue-500/20 text-blue-300 border-blue-500/40 shadow-xs',
        dot: 'bg-blue-400',
        icon: '⚖️',
        tag: 'SIZE INTERMEDIA (3-4/5 CONFLUENZA)',
        desc: '3 o 4 tecniche concordano. Operazione solida con esposizione moderata e contenimento del rischio.'
      };
    } else if (s.includes('MINIMA')) {
      return {
        bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        dot: 'bg-amber-400',
        icon: '⚠️',
        tag: 'SIZE MINIMA (SEGNALE DEBOLE)',
        desc: 'Segnale parziale o non completamente confermato dagli oscillatori. Ridurre al minimo il capitale.'
      };
    } else {
      return {
        bg: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        dot: 'bg-rose-400',
        icon: '🛑',
        tag: 'NESSUNA ENTRATA (WAIT)',
        desc: 'Nessuna confluenza o oscillatori in conflitto (es. Bollinger fuori senza conferma Stocastico Lento).'
      };
    }
  };

  const sizeInfo = getSizeBadgeStyle(report.sizeManagement.recommendedSize);

  // Operation verdict styling
  const getVerdictStyle = (verdict: string) => {
    if (verdict === 'BUY') {
      return {
        badge: 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-500/30',
        label: 'COMPRA (BUY LONG)',
        icon: TrendingUp
      };
    } else if (verdict === 'SELL') {
      return {
        badge: 'bg-rose-600 text-white border-rose-400 shadow-md shadow-rose-500/30',
        label: 'VENDI (SELL SHORT)',
        icon: TrendingDown
      };
    } else {
      return {
        badge: 'bg-amber-600 text-white border-amber-400 shadow-md shadow-amber-500/30',
        label: 'ATTENDI (WAIT)',
        icon: Zap
      };
    }
  };

  const verdictStyle = getVerdictStyle(report.operationVerdict);
  const VerdictIcon = verdictStyle.icon;

  return (
    <div className={`space-y-5 text-xs text-[var(--text-main)] ${className}`}>
      {/* Top Banner with Ticker, Verdict, Size Badge & Action Buttons */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/80 via-indigo-950/60 to-[var(--bg-card)] border border-blue-500/30 shadow-md space-y-3">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="p-1.5 rounded-lg bg-blue-600 text-white shadow-xs">
                <BookOpen className="w-4 h-4" />
              </span>
              <h3 className="text-sm md:text-base font-black uppercase text-white tracking-wide flex items-center gap-2">
                <span>Metodologia Giacomo Probo AI</span>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-mono font-bold border border-blue-400/30">
                  {report.ticker} • {report.timeframe.toUpperCase()}
                </span>
              </h3>
            </div>
            <p className="text-[11px] text-[var(--text-muted)]">
              Prezzo Corrente: <strong className="text-white">€{report.currentPrice}</strong> • Data Report: {new Date(report.timestamp).toLocaleDateString('it-IT')}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--border-color)] text-xs font-bold transition cursor-pointer shadow-xs"
              title="Copia negli appunti la sintesi operativa"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-blue-400" />}
              <span>{copied ? 'Copiato!' : 'Copia Setup'}</span>
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--border-color)] text-xs font-bold transition cursor-pointer shadow-xs"
              title="Esporta il report completo in formato JSON"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              <span>JSON</span>
            </button>
          </div>
        </div>

        {/* Highlight Banner: Operation Verdict & Size Recommendation Badge */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-blue-500/20">
          {/* Verdict Box */}
          <div className="p-3 rounded-xl bg-black/30 border border-white/10 flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase block">Indicazione Operativa</span>
              <div className="text-base font-black text-white mt-0.5">{verdictStyle.label}</div>
            </div>
            <span className={`px-3 py-1.5 rounded-xl border font-black text-xs flex items-center gap-1.5 ${verdictStyle.badge}`}>
              <VerdictIcon className="w-4 h-4" />
              <span>{report.operationVerdict}</span>
            </span>
          </div>

          {/* Size Recommendation Badge Box */}
          <div className="p-3 rounded-xl bg-black/30 border border-white/10 flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase block">Size Recommendation (Capitale)</span>
              <div className="text-xs font-black text-white flex items-center gap-1">
                <span>Rischio Capitale:</span>
                <span className="text-amber-400 font-mono font-bold">{report.sizeManagement.capitalRiskPct}</span>
              </div>
            </div>
            {/* Visual Badge for Size Recommendation */}
            <span className={`px-3 py-1.5 rounded-xl border text-xs font-black flex items-center gap-1.5 ${sizeInfo.bg}`}>
              <span className={`w-2 h-2 rounded-full ${sizeInfo.dot} animate-ping`} />
              <span>{sizeInfo.icon} {report.sizeManagement.recommendedSize}</span>
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 1: MARKET SCENARIO (Scenario di Mercato) */}
      <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] space-y-3 shadow-xs">
        <div className="flex items-center justify-between gap-2 border-b border-[var(--border-color)] pb-2">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-blue-500/10 text-blue-400">
              <Layers className="w-4 h-4" />
            </span>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              1. Scenario di Mercato & Livelli Chiave
            </h4>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            report.marketScenario.primaryTrend === 'RIALZISTA' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
            report.marketScenario.primaryTrend === 'RIBASSISTA' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
            'bg-amber-500/20 text-amber-300 border border-amber-500/30'
          }`}>
            TREND PRIMARIO: {report.marketScenario.primaryTrend}
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed italic">
          "{report.marketScenario.marketContext}"
        </p>

        {/* Key Levels Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          <div className="p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-center">
            <span className="text-[10px] text-emerald-400 font-bold block uppercase">Supporto Primario</span>
            <span className="text-sm font-black text-white font-mono">€{report.marketScenario.primarySupport}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center">
            <span className="text-[10px] text-emerald-300 font-bold block uppercase">Supporto Secondario (SL)</span>
            <span className="text-sm font-black text-emerald-300 font-mono">€{report.marketScenario.secondarySupport}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-rose-500/5 border border-rose-500/20 text-center">
            <span className="text-[10px] text-rose-400 font-bold block uppercase">Resistenza Primaria</span>
            <span className="text-sm font-black text-white font-mono">€{report.marketScenario.primaryResistance}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-center">
            <span className="text-[10px] text-rose-300 font-bold block uppercase">Resistenza Secondaria</span>
            <span className="text-sm font-black text-rose-300 font-mono">€{report.marketScenario.secondaryResistance}</span>
          </div>
        </div>
      </div>

      {/* SECTION 2: CONFLUENCE OF 5 TECHNIQUES (Confluenza delle 5 Tecniche) */}
      <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] space-y-3 shadow-xs">
        <div className="flex items-center justify-between gap-2 border-b border-[var(--border-color)] pb-2">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-indigo-500/10 text-indigo-400">
              <Zap className="w-4 h-4" />
            </span>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              2. Confluenza delle 5 Tecniche Combinate di Giacomo Probo
            </h4>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-blue-600/20 text-blue-300 font-mono font-bold text-xs border border-blue-500/30">
            {report.confluence.totalConfirmedCount}/5 Tecniche Concordi
          </span>
        </div>

        {/* Confluence Table */}
        <div className="overflow-x-auto rounded-xl border border-[var(--border-color)] bg-black/20">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[var(--bg-header)] text-[var(--text-muted)] font-bold text-[10px] uppercase border-b border-[var(--border-color)]">
                <th className="p-2.5">Tecnica Probo</th>
                <th className="p-2.5 text-center">Stato</th>
                <th className="p-2.5">Dettagli Operativi & Parametri</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)] text-slate-300">
              {/* 1. Grafica Classica */}
              <tr>
                <td className="p-2.5 font-bold text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                  <span>1. Analisi Grafica Classica</span>
                </td>
                <td className="p-2.5 text-center">
                  {report.confluence.classicalGraph.confirmed ? (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">✓ CONFERMATO</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-slate-700 text-slate-400 font-bold text-[10px]">IN ATTESA</span>
                  )}
                </td>
                <td className="p-2.5 space-y-0.5 text-[11px]">
                  <div>Trendlines & Canali: <strong className="text-white">{report.confluence.classicalGraph.trendlinesAndChannels}</strong></div>
                  <div>Supporti/Resistenze: <strong className="text-slate-200">{report.confluence.classicalGraph.supportResistance}</strong></div>
                  <div>Fibonacci & Figure: <span className="text-slate-400">{report.confluence.classicalGraph.fibonacciLevels} | {report.confluence.classicalGraph.chartPatterns}</span></div>
                </td>
              </tr>

              {/* 2. Candlestick & Heiken Ashi */}
              <tr>
                <td className="p-2.5 font-bold text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-400" />
                  <span>2. Candlestick & Heiken Ashi</span>
                </td>
                <td className="p-2.5 text-center">
                  {report.confluence.candlestickHeikenAshi.confirmed ? (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">✓ CONFERMATO</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-slate-700 text-slate-400 font-bold text-[10px]">IN ATTESA</span>
                  )}
                </td>
                <td className="p-2.5 space-y-0.5 text-[11px]">
                  <div>Pattern Candela: <strong className="text-white">{report.confluence.candlestickHeikenAshi.candlestickPattern}</strong></div>
                  <div>Trend Heiken Ashi: <strong className="text-indigo-300">{report.confluence.candlestickHeikenAshi.heikenAshiTrend}</strong></div>
                </td>
              </tr>

              {/* 3. Medie Mobili */}
              <tr>
                <td className="p-2.5 font-bold text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span>3. Medie Mobili (Direzione)</span>
                </td>
                <td className="p-2.5 text-center">
                  {report.confluence.movingAverages.confirmed ? (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">✓ CONFERMATO</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-slate-700 text-slate-400 font-bold text-[10px]">IN ATTESA</span>
                  )}
                </td>
                <td className="p-2.5 text-[11px]">
                  Direzione Primaria: <strong className="text-white">{report.confluence.movingAverages.primaryDirection}</strong> • {report.confluence.movingAverages.details}
                </td>
              </tr>

              {/* 4. Indicatori & Oscillatori (Stocastico 10-6-3 & Bollinger 5/1.8) */}
              <tr>
                <td className="p-2.5 font-bold text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  <span>4. Stocastico 10-6-3 & Bollinger 5/1.8</span>
                </td>
                <td className="p-2.5 text-center">
                  {report.confluence.oscillators.confirmed ? (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">✓ CONFERMATO</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-slate-700 text-slate-400 font-bold text-[10px]">IN ATTESA</span>
                  )}
                </td>
                <td className="p-2.5 space-y-1 text-[11px]">
                  <div className="p-1.5 rounded bg-black/30 border border-white/5 flex flex-wrap items-center justify-between gap-2">
                    <span>
                      Stocastico Lento 10-6-3: <strong className="text-blue-300">%K={report.confluence.oscillators.slowStochastic.kValue}, %D={report.confluence.oscillators.slowStochastic.dValue}</strong>
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold text-[10px]">
                      {report.confluence.oscillators.slowStochastic.zone}
                    </span>
                  </div>
                  <div className="p-1.5 rounded bg-black/30 border border-white/5 flex flex-wrap items-center justify-between gap-2">
                    <span>
                      Bollinger 5/1.8: <strong className="text-purple-300">{report.confluence.oscillators.bollingerBands.pricePosition}</strong>
                    </span>
                    <span className="text-slate-400">{report.confluence.oscillators.bollingerBands.details}</span>
                  </div>
                </td>
              </tr>

              {/* 5. Volume Profile / Volumi */}
              <tr>
                <td className="p-2.5 font-bold text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>5. Volume Profile & POC</span>
                </td>
                <td className="p-2.5 text-center">
                  {report.confluence.volumeProfile.confirmed ? (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">✓ CONFERMATO</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-slate-700 text-slate-400 font-bold text-[10px]">IN ATTESA</span>
                  )}
                </td>
                <td className="p-2.5 text-[11px]">
                  Point of Control (POC): <strong className="text-emerald-300 font-mono">€{report.confluence.volumeProfile.pocPrice}</strong> • Value Area: <span className="text-slate-200">{report.confluence.volumeProfile.valueArea}</span> ({report.confluence.volumeProfile.volumeConfirmation})
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 3: DETAILED TACTICAL SETUP & SCALING OUT TABLE */}
      <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] space-y-3 shadow-xs">
        <div className="flex items-center justify-between gap-2 border-b border-[var(--border-color)] pb-2">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-emerald-500/10 text-emerald-400">
              <Target className="w-4 h-4" />
            </span>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              3. Dettaglio Set-up Operativo & Gestione del Rischio (Scaling Out 50%)
            </h4>
          </div>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${
            report.tacticalSetup.riskRewardCompliant
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
          }`}>
            {report.tacticalSetup.riskRewardCompliant ? '✓ R/R CONFORME (≥ 1:2)' : '⚠️ R/R NON CONFORME'}
          </span>
        </div>

        {/* Detailed Setup Table */}
        <div className="overflow-x-auto rounded-xl border border-[var(--border-color)] bg-black/20">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[var(--bg-header)] text-[var(--text-muted)] font-bold text-[10px] uppercase border-b border-[var(--border-color)]">
                <th className="p-2.5">Parametro Operativo</th>
                <th className="p-2.5 text-right font-mono">Valore (€)</th>
                <th className="p-2.5">Note & Regola di Money Management Giacomo Probo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)] text-slate-300">
              {/* Entry Price */}
              <tr>
                <td className="p-2.5 font-bold text-white flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-blue-400" />
                  <span>Prezzo d'Ingresso (Entry)</span>
                </td>
                <td className="p-2.5 text-right font-mono font-bold text-white text-sm">
                  €{report.tacticalSetup.entryPrice}
                </td>
                <td className="p-2.5 text-[11px] text-slate-300">
                  Ingresso confermato al breakout/ritracciamento dopo segnale di confluenza.
                </td>
              </tr>

              {/* Stop Loss */}
              <tr className="bg-rose-500/5">
                <td className="p-2.5 font-bold text-rose-300 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                  <span>Stop Loss Grafico</span>
                </td>
                <td className="p-2.5 text-right font-mono font-bold text-rose-300 text-sm">
                  €{report.tacticalSetup.stopLossPrice}
                </td>
                <td className="p-2.5 text-[11px] text-slate-300">
                  <strong className="text-rose-300">{report.tacticalSetup.stopLossPlacementReason}</strong> (posizionato oltre le ombre dei punti di svolta).
                </td>
              </tr>

              {/* Take Profit 1 (Scaling Out) */}
              <tr className="bg-emerald-500/5">
                <td className="p-2.5 font-bold text-emerald-300 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Take Profit 1 (Scaling Out 50%)</span>
                </td>
                <td className="p-2.5 text-right font-mono font-bold text-emerald-300 text-sm">
                  €{report.tacticalSetup.takeProfit1}
                </td>
                <td className="p-2.5 text-[11px] text-slate-300">
                  Primo ostacolo grafico: <strong className="text-emerald-300">Chiusura 50% posizione</strong> per incassare il profitto e <strong className="text-white">spostamento Stop Loss a Breakeven</strong> sulla metà restante.
                </td>
              </tr>

              {/* Take Profit 2 */}
              <tr>
                <td className="p-2.5 font-bold text-indigo-300 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Take Profit 2 (Target Esteso)</span>
                </td>
                <td className="p-2.5 text-right font-mono font-bold text-indigo-300 text-sm">
                  €{report.tacticalSetup.takeProfit2}
                </td>
                <td className="p-2.5 text-[11px] text-slate-300">
                  Target grafico secondario per la posizione residua con Stop a pareggio.
                </td>
              </tr>

              {/* Risk Reward Ratio */}
              <tr className="bg-blue-500/5 font-bold">
                <td className="p-2.5 text-white flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-blue-400" />
                  <span>Rapporto Rischio/Rendimento</span>
                </td>
                <td className="p-2.5 text-right font-mono text-blue-300 text-sm">
                  1:{report.tacticalSetup.riskRewardRatio}
                </td>
                <td className="p-2.5 text-[11px] text-slate-200">
                  Rapporto R/R inderogabilmente favorevole (richiesto min 1:2 o preferibilmente 1:3).
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Scaling Out Strategy Rationale Box */}
        <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/20 text-xs text-slate-300 leading-relaxed">
          <strong className="text-indigo-300 font-bold block mb-1">Tecnica di Scaling Out Spiegata:</strong>
          {report.tacticalSetup.scalingOutStrategy}
        </div>
      </div>

      {/* SECTION 4: EXECUTIVE SUMMARY & PROBO COMPLIANCE CHECKLIST */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Executive Summary Card */}
        <div className="lg:col-span-7 p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] space-y-2 shadow-xs">
          <div className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5" />
            <span>4. Sintesi Operativa Stile Giacomo Probo</span>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed">
            {report.executiveSummary}
          </p>
        </div>

        {/* Compliance Checklist Card */}
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

export default ProboAnalysisReport;
