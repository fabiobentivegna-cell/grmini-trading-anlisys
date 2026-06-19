import React from "react";
import { Instrument } from "../types";
import { 
  BarChart4, 
  ArrowUpRight, 
  ArrowDownRight, 
  ShieldCheck, 
  TrendingUp, 
  Scale, 
  Layers, 
  ChevronRight,
  ExternalLink
} from "lucide-react";
import { getTradingViewUrl } from "../utils/tradingViewHelper";

interface SectorIndexComparisonProps {
  activeInstrument: Instrument;
  allInstruments: Instrument[];
  isDark: boolean;
}

// 1. Sector mapping helper
export const getSectorOfInstrument = (sym: string): string => {
  const s = sym.toUpperCase();
  if (["AAPL", "AMD", "AVGO", "NVDA", "MSFT", "STM"].includes(s)) return "Tecnologia & Semiconduttori";
  if (["ADBE", "CRM", "GOOGL", "META", "AMZN"].includes(s)) return "Software, Cloud & Digital Services";
  if (["ISP", "UCG", "BAMI", "BPE", "MB", "BGN", "AZM", "BMED", "BAC", "JPM", "V", "MA", "BRK.B", "PST", "UNI", "G"].includes(s)) return "Financials, Banking & Asset Management";
  if (["ENI", "TEN", "SPM", "ERG", "CVX", "XOM"].includes(s)) return "Energy, Oil & Gas Infrastructure";
  if (["ENEL", "STLAM", "TSLA", "RACE", "MONC", "BRN", "PIRE", "DIS", "NFLX", "HD"].includes(s)) return "Consumer Cyclical, Luxury & Automotive";
  if (["A2A", "HER", "SRG", "TRN"].includes(s)) return "Utilities & Green Energy Grid";
  if (["DIA", "REC", "JNJ", "LLY", "MRK", "UNH"].includes(s)) return "Healthcare, Pharma & Biotech";
  if (["COST", "KO", "PEP", "PG", "WMT"].includes(s)) return "Consumer Defensive, Foods & Retail";
  if (["EURUSD", "GBPUSD", "USDJPY", "EURJPY", "GBPJPY", "AUDUSD", "USDCAD", "USDCHF", "EURGBP", "EURCHF", "AUDJPY", "NZDUSD"].includes(s)) return "Valute Mercato Forex";
  return "Altri Settori / Altcoin (Crypto)";
};

// 2. Benchmarks definition
export interface IndexBenchmark {
  name: string;
  ticker: string;
  price: string;
  chgPct: number;
  pe: number;
  pb: number;
  div: number;
  roe: number;
}

export const getBenchmarkForMarket = (market: string): IndexBenchmark => {
  const m = market.toLowerCase();
  if (m === "italia") {
    return { name: "FTSE MIB", ticker: "^FTSEMIB", price: "34.250 PTS", chgPct: 14.2, pe: 9.8, pb: 1.1, div: 4.15, roe: 11.5 };
  } else if (m === "usa") {
    return { name: "S&P 500", ticker: "^SPX", price: "5.430 PTS", chgPct: 15.8, pe: 24.2, pb: 4.1, div: 1.35, roe: 18.5 };
  } else if (m === "crypto") {
    return { name: "Bitcoin Dominance", ticker: "BTC.D", price: "56.40%", chgPct: 8.4, pe: 0, pb: 0, div: 0, roe: 0 };
  } else if (m === "forex") {
    return { name: "U.S. Dollar Index", ticker: "DXY", price: "105.20", chgPct: 2.1, pe: 0, pb: 0, div: 0, roe: 0 };
  } else {
    return { name: "Bloomberg Commodity Index", ticker: "BCOM", price: "102.40", chgPct: -1.2, pe: 0, pb: 0, div: 0, roe: 0 };
  }
};

export default function SectorIndexComparison({ activeInstrument, allInstruments, isDark }: SectorIndexComparisonProps) {
  const sectorName = getSectorOfInstrument(activeInstrument.sym);
  const benchmark = getBenchmarkForMarket(activeInstrument.market);

  // Parse numerical metrics of our active instrument safely
  const stockPe = typeof activeInstrument.pe === "number" ? activeInstrument.pe : parseFloat(String(activeInstrument.pe)) || 0;
  const stockPb = typeof activeInstrument.pb === "number" ? activeInstrument.pb : parseFloat(String(activeInstrument.pb)) || 0;
  const stockRoe = typeof activeInstrument.roe === "number" ? activeInstrument.roe : parseFloat(String(activeInstrument.roe)) || 0;
  const stockDiv = typeof activeInstrument.div === "number" ? activeInstrument.div : parseFloat(String(activeInstrument.div)) || 0;

  // Filter instruments belonging to the same sector (excluding the active stock itself for peer list)
  const peers = allInstruments
    .filter(inst => inst.sym !== activeInstrument.sym && getSectorOfInstrument(inst.sym) === sectorName && inst.market === activeInstrument.market);

  // Calculate sector expectations
  const sectorAvgPe = peers.length > 0 
    ? peers.reduce((acc, p) => acc + (typeof p.pe === "number" ? p.pe : parseFloat(String(p.pe)) || 0), 0) / peers.length 
    : stockPe * 0.95;
  
  const sectorAvgRoe = peers.length > 0 
    ? peers.reduce((acc, p) => acc + (typeof p.roe === "number" ? p.roe : parseFloat(String(p.roe)) || 0), 0) / peers.length 
    : stockRoe * 0.98;

  const sectorAvgDiv = peers.length > 0
    ? peers.reduce((acc, p) => acc + (typeof p.div === "number" ? p.div : parseFloat(String(p.div)) || 0), 0) / peers.length
    : stockDiv * 1.05;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      
      {/* COLUMN 1: COMPARISON WITH MARKET BENCHMARK INDEX */}
      <div className={`p-4 rounded-lg border flex flex-col gap-3.5 ${isDark ? "bg-[#111318] border-[#ffffff12]" : "bg-white border-[#e2e5ec]"}`}>
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-[var(--green)]" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[var(--text1)]">
              📈 Confronto con Indice di Riferimento ({benchmark.name})
            </h3>
          </div>
          <span className="text-[10px] font-mono bg-[var(--bg2)] text-[var(--text3)] px-2 py-0.5 rounded border border-[var(--border)] font-bold">
            Ticker: {benchmark.ticker}
          </span>
        </div>

        {/* Index Quick Summary Banner */}
        <div className="grid grid-cols-3 gap-2.5 p-3 rounded-lg bg-[var(--bg2)] border border-[var(--border)]">
          <div className="flex flex-col">
            <span className="text-[9px] text-[var(--text3)] uppercase">Valore Indice</span>
            <span className="text-sm font-mono font-black text-[var(--text1)]">{benchmark.price}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] text-[var(--text3)] uppercase">Performance YTD</span>
            <span className={`text-sm font-mono font-black flex items-center gap-0.5 ${benchmark.chgPct >= 0 ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
              {benchmark.chgPct >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              {benchmark.chgPct > 0 ? "+" : ""}{benchmark.chgPct}%
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] text-[var(--text3)] uppercase">Sottostante Attivo</span>
            <span className="text-sm font-sans font-black text-[var(--green)] uppercase">{activeInstrument.sym}</span>
          </div>
        </div>

        {/* Comparison Bars */}
        <div className="flex flex-col gap-3">
          
          {/* 1. PE Comparison */}
          {benchmark.pe > 0 && stockPe > 0 && (
            <div className="flex flex-col gap-1 text-[11px] font-sans">
              <div className="flex items-center justify-between">
                <span className="text-[var(--text2)] font-medium">Prezzo / Utili (Ratio P/E)</span>
                <span className="text-[10px] text-[var(--text3)]">
                  {activeInstrument.sym}: <strong className="text-[var(--text1)]">{stockPe}x</strong> vs Indice: <strong className="text-blue-400">{benchmark.pe}x</strong>
                </span>
              </div>
              <div className="h-2 w-full bg-[var(--bg3)] rounded-full overflow-hidden relative">
                {/* Benchmark PE handle block */}
                <div 
                  style={{ width: `${Math.min(100, (benchmark.pe / 50) * 100)}%` }} 
                  className="bg-blue-400/30 h-full absolute rounded-full" 
                />
                {/* Stock PE indicator */}
                <div 
                  style={{ width: `${Math.min(100, (stockPe / 50) * 100)}%` }} 
                  className={`h-full absolute rounded-full ${stockPe < benchmark.pe ? "bg-[var(--green)]" : "bg-amber-500"}`} 
                />
              </div>
              <p className="text-[9px] text-[var(--text3)] leading-relaxed italic">
                {stockPe < benchmark.pe 
                  ? `✓ Valutazione favorevole: il P/E di ${activeInstrument.sym} è inferiore alla media di mercato del ${(((benchmark.pe - stockPe)/benchmark.pe)*100).toFixed(0)}%.`
                  : `⚠️ Multiplo Premium: il mercato sconta un tasso di crescita atteso superiore rispetto alla media dell'indice.`}
              </p>
            </div>
          )}

          {/* 2. Dividend Yield Comparison */}
          {benchmark.div > 0 && (
            <div className="flex flex-col gap-1 text-[11px] font-sans">
              <div className="flex items-center justify-between">
                <span className="text-[var(--text2)] font-medium">Rendimento da Dividendo (Yield)</span>
                <span className="text-[10px] text-[var(--text3)]">
                  {activeInstrument.sym}: <strong className="text-[var(--text1)]">{stockDiv}%</strong> vs Indice: <strong className="text-blue-400">{benchmark.div}%</strong>
                </span>
              </div>
              <div className="h-2 w-full bg-[var(--bg3)] rounded-full overflow-hidden relative">
                <div 
                  style={{ width: `${Math.min(100, (benchmark.div / 8) * 100)}%` }} 
                  className="bg-blue-400/30 h-full absolute rounded-full" 
                />
                <div 
                  style={{ width: `${Math.min(100, (stockDiv / 8) * 100)}%` }} 
                  className={`h-full absolute rounded-full ${stockDiv >= benchmark.div ? "bg-[var(--green)]" : "bg-neutral-500"}`} 
                />
              </div>
              <p className="text-[9px] text-[var(--text3)] leading-relaxed italic">
                {stockDiv >= benchmark.div 
                  ? `✓ Flusso di cassa robusto: rendimento del ${stockDiv}% superiore al dividendo medio dell'indice (${benchmark.div}%).`
                  : `Rendimento inferiore all'indice. L'azienda focalizza l'allocazione del capitale sul reinvestimento interno.`}
              </p>
            </div>
          )}

          {/* 3. ROE Comparison */}
          {benchmark.roe > 0 && stockRoe > 0 && (
            <div className="flex flex-col gap-1 text-[11px] font-sans">
              <div className="flex items-center justify-between">
                <span className="text-[var(--text2)] font-medium">Rendimento dei Mezzi Propri (ROE)</span>
                <span className="text-[10px] text-[var(--text3)]">
                  {activeInstrument.sym}: <strong className="text-[var(--text1)]">{stockRoe}%</strong> vs Indice: <strong className="text-blue-400">{benchmark.roe}%</strong>
                </span>
              </div>
              <div className="h-2 w-full bg-[var(--bg3)] rounded-full overflow-hidden relative">
                <div 
                  style={{ width: `${Math.min(100, (benchmark.roe / 40) * 100)}%` }} 
                  className="bg-blue-400/30 h-full absolute rounded-full" 
                />
                <div 
                  style={{ width: `${Math.min(100, (stockRoe / 40) * 100)}%` }} 
                  className="bg-[var(--green)] h-full absolute rounded-full" 
                />
              </div>
              <p className="text-[9px] text-[var(--text3)] leading-relaxed italic">
                {stockRoe >= benchmark.roe 
                  ? `✓ Redditività superiore: efficienza d'impiego del capitale netto superiore di ${Math.round(stockRoe - benchmark.roe)} punti percentuali rispetto alla media d'indice.`
                  : `Efficienza d'impresa inferiore alla media storica dell'indice di riferimento.`}
              </p>
            </div>
          )}

        </div>
      </div>

      {/* COLUMN 2: COMPARISON WITH INDUSTRY SECTOR PEERS */}
      <div className={`p-4 rounded-lg border flex flex-col gap-3.5 ${isDark ? "bg-[#111318] border-[#ffffff12]" : "bg-white border-[#e2e5ec]"}`}>
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[var(--green)]" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[var(--text1)]">
              🏢 Competitor dello Stesso Settore
            </h3>
          </div>
          <span className="text-[10px] font-bold text-[var(--green)] uppercase tracking-wider">
            {sectorName}
          </span>
        </div>

        {/* Sector Quick Insights */}
        <div className="grid grid-cols-3 gap-2 px-3 py-2 rounded bg-[var(--bg2)] border border-[var(--border)] text-[9px] font-mono text-[var(--text3)]">
          <div>
            PE MEDIO SETTORE: <strong className="text-[var(--text1)]">{sectorAvgPe.toFixed(1)}x</strong>
          </div>
          <div className="text-center">
            ROE MEDIO: <strong className="text-[var(--text1)]">{sectorAvgRoe.toFixed(1)}%</strong>
          </div>
          <div className="text-right">
            DIVIDENDO MEDIO: <strong className="text-[var(--text1)]">{sectorAvgDiv.toFixed(1)}%</strong>
          </div>
        </div>

        {/* Peers Comparison List Table */}
        <div className="flex-1 overflow-x-auto">
          <table className="w-full text-[10.5px] text-[var(--text2)] border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)] text-[8.5px] uppercase font-mono text-[var(--text3)] text-left">
                <th className="py-2 pr-2">Simbolo</th>
                <th className="py-2 text-right">Prezzo</th>
                <th className="py-2 text-right">P/E</th>
                <th className="py-2 text-right">ROE</th>
                <th className="py-2 text-right">Div Yield</th>
                <th className="py-2 text-right">Mkt Cap</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {/* Highlight active core stock first */}
              <tr className="bg-[var(--green)]/5 font-extrabold text-[var(--text1)]">
                <td className="py-2 pr-2">
                  <span className="flex items-center gap-1">
                    🌟 {activeInstrument.sym}
                    <a
                      href={getTradingViewUrl(activeInstrument.tvSym, activeInstrument.sym)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`Apri grafico ${activeInstrument.sym} su TradingView`}
                      className="inline-block p-0.5 text-[var(--text3)] hover:text-[var(--green)] transition"
                    >
                      <ExternalLink className="w-2.5 h-2.5 inline" />
                    </a>
                  </span>
                </td>
                <td className="py-2 text-right font-mono">
                  €{activeInstrument.price > 100 ? activeInstrument.price.toLocaleString("it-IT", { minimumFractionDigits: 2 }) : activeInstrument.price.toFixed(4)}
                </td>
                <td className="py-2 text-right font-mono">{activeInstrument.pe}x</td>
                <td className="py-2 text-right font-mono">{activeInstrument.roe}%</td>
                <td className="py-2 text-right font-mono">{activeInstrument.div}%</td>
                <td className="py-2 text-right font-mono">{activeInstrument.vol}</td>
              </tr>

              {/* List other peer elements from sector */}
              {peers.length > 0 ? (
                peers.slice(0, 4).map((p) => {
                  const pPe = typeof p.pe === "number" ? p.pe : parseFloat(String(p.pe)) || 0;
                  const pRoe = typeof p.roe === "number" ? p.roe : parseFloat(String(p.roe)) || 0;
                  return (
                    <tr key={p.sym} className="hover:bg-[var(--bg3)] transition-colors">
                      <td className="py-2 pr-2 font-bold text-[var(--text1)]">
                        <span className="flex items-center gap-1">
                          {p.sym}
                          <a
                            href={getTradingViewUrl(p.tvSym, p.sym)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block p-0.5 text-[var(--text3)] hover:text-[var(--green)] transition"
                            title={`Apri grafico ${p.sym} su TradingView`}
                          >
                            <ExternalLink className="w-2.5 h-2.5 inline" />
                          </a>
                        </span>
                      </td>
                      <td className="py-2 text-right font-mono">
                        €{p.price > 100 ? p.price.toLocaleString("it-IT", { minimumFractionDigits: 2 }) : p.price.toFixed(4)}
                      </td>
                      <td className="py-2 text-right font-mono">{p.pe}x</td>
                      <td className="py-2 text-right font-mono">{p.roe}%</td>
                      <td className="py-2 text-right font-mono">{p.div}%</td>
                      <td className="py-2 text-right font-mono">{p.vol}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-xs text-[var(--text3)] italic">
                    Nessun altro titolo del settore "{sectorName}" presente in watchlist attuale. Aggiungine altri per abilitare il confronto esteso.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Sector peer quick analysis banner */}
        <div className="text-[9.5px] leading-relaxed text-[var(--text3)] border-t border-[var(--border)] pt-2.5 flex items-start gap-1.5">
          <ShieldCheck className="w-4 h-4 text-[var(--green)] flex-shrink-0" />
          <span>
            {stockPe < sectorAvgPe && stockRoe > sectorAvgRoe ? (
              <span>
                <strong>Leader di Efficienza Settoriale:</strong> {activeInstrument.sym} mostra un posizionamento d'eccellenza con multipli valutativi scontati (P/E {stockPe}x vs {sectorAvgPe.toFixed(1)}x medio) e redditività dei mezzi propri superiore (ROE {stockRoe}% vs {sectorAvgRoe.toFixed(1)}%).
              </span>
            ) : stockPe < sectorAvgPe ? (
              <span>
                <strong>Margine di Sotto-Valutazione:</strong> Il titolo scambia a sconto di multipli rispetto ai peers di settore. Potenziale opportunità strategica in assenza di deterioramenti strutturali della redditività.
              </span>
            ) : (
              <span>
                <strong>Premium di Qualità:</strong> {activeInstrument.sym} quota a premio rispetto al settore. Il mercato premia l'eccellente capacità di saggio dei profitti o il posizionamento strategico (Moat) dominante dell'azienda.
              </span>
            )}
          </span>
        </div>

      </div>

    </div>
  );
}
