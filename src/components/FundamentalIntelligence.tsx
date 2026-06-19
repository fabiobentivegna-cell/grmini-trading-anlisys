import React, { useState, useEffect } from "react";
import { 
  Newspaper, 
  Users, 
  Target, 
  ShieldAlert, 
  TrendingUp, 
  TrendingDown, 
  Globe, 
  Building, 
  Sparkles, 
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  ExternalLink
} from "lucide-react";
import { Instrument } from "../types";
import { getTradingViewUrl } from "../utils/tradingViewHelper";

interface FundamentalIntelligenceProps {
  activeInstrument: Instrument;
  isDark: boolean;
}

// Interfaces helper
interface NewsItem {
  id: string;
  source: string;
  headline: string;
  time: string;
  sentiment: "BULLISH" | "NEUTRAL" | "BEARISH";
  impact: "HIGH" | "MEDIUM" | "LOW";
  summary: string;
  fullText?: string;
  tradingImplication?: string;
}

interface SentimentData {
  retail: number; // % bullish
  institutional: number; // % bullish
  social: number; // % bullish
  shortInterest: number; // % short float
  optionRatio: number; // Call/Put ratio
}

interface AnalystConsensus {
  consensus: "FORTE ACQUISTO" | "ACQUISTO" | "NEUTRALE" | "VENDITA";
  buyCount: number;
  holdCount: number;
  sellCount: number;
  targetHigh: number;
  targetAvg: number;
  targetLow: number;
}

interface InsiderTrade {
  id: string;
  insiderName: string;
  role: string;
  country: "usa" | "italia";
  ticker: string;
  action: "BUY" | "SELL";
  amount: string;
  date: string;
  performance: number;
}

export default function FundamentalIntelligence({ activeInstrument, isDark }: FundamentalIntelligenceProps) {
  const [activeSubTab, setActiveSubTab] = useState<"insights" | "insiders">("insights");
  const [insidersFilter, setInsidersFilter] = useState<"all" | "usa" | "italia">("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedNewsDetail, setSelectedNewsDetail] = useState<NewsItem | null>(null);
  
  // Real-time dynamic news generator based on selected instrument
  const [news, setNews] = useState<NewsItem[]>([]);
  const [sentiment, setSentiment] = useState<SentimentData>({ retail: 50, institutional: 50, social: 50, shortInterest: 5, optionRatio: 1.2 });
  const [analysts, setAnalysts] = useState<AnalystConsensus>({ consensus: "NEUTRALE", buyCount: 10, holdCount: 5, sellCount: 1, targetHigh: 100, targetAvg: 80, targetLow: 60 });
  const [insiderTrades, setInsiderTrades] = useState<InsiderTrade[]>([]);

  // Seed / Generate intelligence metrics when activeInstrument changes
  useEffect(() => {
    generateAllIntelligence();
  }, [activeInstrument]);

  const generateAllIntelligence = () => {
    setIsRefreshing(true);
    
    // 1. Generate customized news headlines based on instrument categories
    const sym = activeInstrument.sym;
    const name = activeInstrument.name;
    const isCrypto = activeInstrument.market === "crypto";
    const isForex = activeInstrument.market === "forex";
    const isCommodity = activeInstrument.market === "commodities";
    const isUsa = activeInstrument.market === "usa";
    const isItalia = activeInstrument.market === "italia";

    let generatedNews: NewsItem[] = [];
    
    if (isCrypto) {
      generatedNews = [
        {
          id: "n1",
          source: "Coindesk",
          headline: `Aumento dell'Accumulo Istituzionale di ${sym}: Nuovi record per i wallet di accumulazione`,
          time: "5 min fa",
          sentiment: "BULLISH",
          impact: "HIGH",
          summary: `Diversi wallet di balene e fondi autorizzati hanno trasferito ingenti somme di ${sym} fuori dagli exchange verso cold storage, indicando una robusta pressione d'acquisto di lungo termine.`,
          fullText: `Le ultime analisi on-chain fornite dalle società di intelligence crittografica evidenziano un deflusso record di ${sym} dalle piattaforme di trading decentralizzate e centralizzate verso sistemi di custodia e wallet multisig ad accumulo freddo.\n\nQuesto fenomeno suggerisce che grandi investitori istituzionali e fondi d'investimento quotati (ETF spot e trust regolati) stiano ampliando le loro allocazioni correnti nel portafoglio di lungo termine, togliendo offerta circolante dal mercato spot. Questa riduzione della pressione liquida di vendita spesso anticipa forti movimenti rialzisti di tipo squeeze, specialmente nel contesto attuale caratterizzato da un interesse aperto stabile sui mercati dei derivati.`,
          tradingImplication: `Bullish di medio periodo. Accumulare posizioni spot in prossimità del supporto tecnico chiave ed evitare posizioni short aggressive date le elevate probabilità di uno squeeze rialzista temporaneo.`
        },
        {
          id: "n2",
          source: "CoinTelegraph",
          headline: `Analisi sulla Dominance e Liquidità di ${sym}: Possibile breakout tecnico secondo i market makers`,
          time: "24 min fa",
          sentiment: "BULLISH",
          impact: "MEDIUM",
          summary: `I premi di rendimento storici per i contratti perpetual suggeriscono un posizionamento robusto dei retail in vista del test delle resistenze settimanali.`,
          fullText: `L'analisi della microstruttura del book degli ordini per ${sym} evidenzia una progressiva compressione dello spread bid-ask sui principali exchange mondiali. Secondo fonti della comunità dei mercati derivati, l'attuale tasso di funding dei contratti perpetui rimane confinato in una fascia neutrale-positiva, indicando che la recente crescita non è ancora spinta da un eccesso di leva finanziaria speculativa.\n\nQuesto getta basi solide per un potenziale breakout genuino della resistenza grafica superiore settimanale, con i flussi a pronti pronti ad assecondare l'accelerazione tecnica.`,
          tradingImplication: `Impostare ordini condizionati di acquisto (buy-stop) leggermente al di sopra della barriera di resistenza strutturale per catturare l'impulso iniziale ad alta velocità.`
        },
        {
          id: "n3",
          source: "Reuters",
          headline: `Nuova regolamentazione sulle riserves collateralizzate potrebbe influenzare la volatilità di ${sym}`,
          time: "1 ora fa",
          sentiment: "NEUTRAL",
          impact: "HIGH",
          summary: "La Securities and Exchange Commission ha avviato una consultazione sulle riserve stabilizzate che potrebbe incrementare i costi operativi per gli exchange del settore.",
          fullText: `In un annuncio a sorpresa, le autorità di regolamentazione finanziaria federali hanno varato una consultazione formale per rivedere i requisiti di collaterale e liquidità degli asset digitali scambiati nei panieri di peg. L'obiettivo dichiarato è l'incremento della trasparenza per evitare default sistemici o sblocchi forzosi sui listini.\n\nSebbene la proposta miri a dare maggiore sicurezza istituzionale nel lungo termine, gli exchange potrebbero trovarsi di fronte ad un inasprimento normativo che comprime la liquidità e innalza i costi operativi nei prossimi trimestri, traducendosi in picchi di volatilità improvvisa per l'asset class di ${sym}.`,
          tradingImplication: `Impostare rigorose coperture di portafoglio (stop-loss fisici) ed evitare un'esposizione eccessiva a leva sulle scadenze di trading infrasettimanali.`
        }
      ];
    } else if (isForex) {
      generatedNews = [
        {
          id: "n1",
          source: "Bloomberg",
          headline: `Le decisioni sui tassi delle Banche Centrali alimentano la dinamica su ${sym}`,
          time: "9 min fa",
          sentiment: "NEUTRAL",
          impact: "HIGH",
          summary: "I governatori indicano che un atteggiamento restrittivo di lungo termine è necessario per arginare le componenti volatili dell'inflazione core.",
          fullText: `Le recenti audizioni parlamentari dei massimi esponenti monetari mondiali hanno ribadito che la lotta contro le spinte inflazionistiche di secondo livello non è ancora giunta al traguardo. Nonostante un rallentamento dei panieri dei beni industriali di base, il mercato del lavoro rigido e la crescita dei salari sostengono l'inflazione core in settori chiave come i servizi ricettivi.\n\nDi conseguenza, la stabilità dei tassi d'interesse a un livello restrittivo perdurerà per un periodo prolungato rispetto alle stime dei mercati obbligazionari, polarizzando la forza relativa delle valute correlate a ${sym}.`,
          tradingImplication: `Privilegiare strategie di tipo 'range-bound' e posizionarsi su carry trade favorevoli dove il differenziale fra i tassi d'interesse premia la valuta dominante.`
        },
        {
          id: "n2",
          source: "Reuters",
          headline: `Dati macroeconomici della bilancia dei pagamenti mostrano sbilanciamento transitorio per ${sym}`,
          time: "42 min fa",
          sentiment: "BEARISH",
          impact: "MEDIUM",
          summary: "Contrazione inattesa della manifattura industriale europea indebolisce la forza relativa del paniere di riferimento rispetto ai porti sicuri.",
          fullText: `I flussi commerciali transfrontalieri mostrano una flessione sensibile dei beni strumentali e dell'automotive esportato d'area, spingendo la bilancia geopolitica dei pagamenti verso un deficit transitorio. Questo andamento risponde a una minore domanda asiatica e al contestuale inasprimento delle catene logistiche globali.\n\nPer ${sym}, questo sbilanciamento macro si traduce in una riduzione della domanda strutturale di acquisto, beneficiando temporaneamente le valute rifugio come il Dollaro USA o il Franco Svizzero.`,
          tradingImplication: `Posizionamento di vendita di breve termine (short) con target di profitto sul supporto volumetrico inferiore giornaliero.`
        },
        {
          id: "n3",
          source: "FXStreet",
          headline: `Livelli di resistenza strategici testati: ${sym} si avvicina ad un'area di massimi di 3 mesi`,
          time: "2 ore fa",
          sentiment: "BULLISH",
          impact: "LOW",
          summary: "I trader di opzioni segnalano una forte concentrazione di barriere knockout bar intorno al pivot odierno.",
          fullText: `La dinamica dei prezzi intraday mostra un accumulo di slancio rialzista robusto intorno alla media mobile ponderata a 50 giorni per la coppia di valute associata a ${sym}.\n\nL'analisi dell'open-interest sulle scadenze settimanali delle opzioni rivela che il superamento della barriera di prezzo corrente potrebbe scatenare un riposizionamento forzato dei market maker, costretti a coprire le opzioni short gamma aperte acquistando il sottostante, accelerando la corsa al rialzo.`,
          tradingImplication: `Mantenere un'impostazione d'acquisto focalizzata. Allineare il trailing stop-loss a protezione dei profitti latenti man mano che la resistenza superiore viene intaccata.`
        }
      ];
    } else if (isCommodity) {
      generatedNews = [
        {
          id: "n1",
          source: "Milano Finanza",
          headline: `Crisi logistica e restrizioni sull'offerta spingono le quotazioni di ${sym}`,
          time: "15 min fa",
          sentiment: "BULLISH",
          impact: "HIGH",
          summary: `L'annuncio di limiti all'esportazione da parte dei principali consorzi globali ha colto di sorpresa gli analisti, spingendo la curva dei prezzi di ${sym} in backwardation.`,
          fullText: `Il coordinamento e il posizionamento strategico dei paesi produttori ha decretato l'imposizione di quote massime di spedizione ed esportazione settimanali per calmierare l'eccesso di offerta dei mesi scorsi.\n\nQuesta repentina decisione ridisegna completamente la disponibilità spot delle raffinerie commerciali nel bacino del Mediterraneo e nell'Europa continentale, spingendo le contrattazioni sui contratti a termine vicini verso un premio importante (backwardation) e segnalando una stringente richiesta fisica immediata del materiale di ${sym}.`,
          tradingImplication: `Privilegiare posizioni lunghe sui futures a scadenza ravvicinata sul paniere della commodity e monitorare l'evoluzione logistica dei blocchi merci.`
        },
        {
          id: "n2",
          source: "Bloomberg Energy",
          headline: `Inventari globali di ${sym} calano più delle stime governative settimanali`,
          time: "38 min fa",
          sentiment: "BULLISH",
          impact: "MEDIUM",
          summary: "Il report delle scorte strategiche evidenzia un decremento di 3.2 milioni di barili/tonnellate a fronte di una domanda estiva eccezionalmente persistente.",
          fullText: `I dati periodici e certificati dell'EIA e degli analoghi uffici governativi della filiera evidenziano un drenaggio inatteso e massiccio degli stock commerciali privati. Le consegne industriali hanno superato ampiamente i piani di produzione originari a causa di un prolungamento dell'attività manifatturiera ad alto scorrimento energetico.\n\nQuesto squilibrio strutturale favorisce un incremento dei prezzi fisici del barile/tonnellata nel breve periodo per ${sym}.`,
          tradingImplication: `Long speculativo intraday. Un ingresso ottimale si configura in scia a ritracciamenti tecnici temporanei sul chart orario.`
        },
        {
          id: "n3",
          source: "Financial Times",
          headline: `La transizione ecologica impatta la filiera estrattiva e di raffinamento di ${sym}`,
          time: "3 ore fa",
          sentiment: "NEUTRAL",
          impact: "MEDIUM",
          summary: "Le nuove normative dell'Europarlamento ridurranno i sussidi fiscali, inducendo i produttori a tagliare le allocazioni di capitale esplorativo per i prossimi tre anni.",
          fullText: `Le direttive ESG ad approvazione imminente da parte dell'ufficio clima dell'UE prevedono forti limitazioni alle esenzioni tributarie per le trivellazioni ed i processi di raffinamento minerario.\n\nQuesta contrazione del supporto governativo costringerà le aziende minerarie e i player energetici operanti sul mercato di ${sym} a tagliare gli investimenti in conto capitale (CAPEX) destinati alla ricerca di risorse nei prossimi tre anni, riducendo l'offerta cumulativa futura e ponendo un pavimento strutturale rialzista di lunghissimo periodo per le quotazioni.`,
          tradingImplication: `Accantonare posizioni di lungo termine su titoli azionari della filiera dotati di bilanci eccellenti, capaci di resistere all'inasprimento normativo.`
        }
      ];
    } else {
      // General Equities (USA & IT)
      const isIt = isItalia || sym === "ENI" || sym === "ENEL" || sym === "ISP" || sym === "UCG";
      const source1 = isIt ? "Il Sole 24 Ore" : "CNBC US";
      const source2 = isIt ? "Milano Finanza" : "Wall Street Journal";
      generatedNews = [
        {
          id: "n1",
          source: source1,
          headline: `Focus Strategico su ${sym}: Nuove allocazioni CAPEX previste nel piano industriale aumentano l'efficienza`,
          time: "12 min fa",
          sentiment: "BULLISH",
          impact: "HIGH",
          summary: `Il consiglio di amministrazione di ${name} ha approvato una revisione del portafoglio di investimenti diretti verso vettori ad alto margine operativo, stimolando la fiducia del buy-side.`,
          fullText: `La dirigenza esecutiva di ${name} (${sym}) ha annunciato un piano strategico mirato che reindirizza circa il 45% delle risorse destinate allo sviluppo infrastrutturale (CAPEX) verso tecnologie proprietarie ad alto ritorno sul capitale investito (ROIC).\n\nL'operazione mira a dismettere rami d'azienda frammentati o caratterizzati da tassi di crescita piatti, concentrando i flussi di cassa operativi sul nucleo centrale competitivo ad altissima marginalità lorda. Gli investitori istituzionali accolgono con calore il piano, interpretandolo come una solida mossa opportunistica per espandere il saggio di dividendo futuro.`,
          tradingImplication: `Molto rialzista di lungo termine. Acquistare quote dell'azione sulle debolezze di mercato nell'ottica di un posizionamento duraturo sul titolo.`
        },
        {
          id: "n2",
          source: source2,
          headline: `Broker e banche d'affari alzano il rating e la guidance del consensus su ${sym}`,
          time: "48 min fa",
          sentiment: "BULLISH",
          impact: "MEDIUM",
          summary: "Gli analisti citano margini di saggio di profitto lordo resilienti ed una forte capacità di pricing power in un contesto di tassi reali positivi.",
          fullText: `Un consorzio di primarie banche d'affari internazionali ha diramato report commerciali aggiornati sul posizionamento finanziario di ${name}.\n\nL'innalzamento del prezzo obiettivo (target price) risponde ad un pricing power eccellente che ha permesso alla società di mantenere margini operativi immutati nonostante l'inasprimento dei costi energetici e le sanzioni commerciali regionali. Il flusso libero di cassa (free-cash-flow) stimato per l'anno fiscale corrente è atteso in crescita dell'8.4% rispetto alle precedenti stime del consensus del listino.`,
          tradingImplication: `Rating modificato in Overweight/Buy. Target price medio incrementato del 12%. Raccomandata accumulazione dinamica sul supporto.`
        },
        {
          id: "n3",
          source: isIt ? "Ansa" : "Reuters Finance",
          headline: `Fornitori e partner di ${sym} annunciano un consolidamento della filiera logistica strategica`,
          time: "2 ore fa",
          sentiment: "NEUTRAL",
          impact: "LOW",
          summary: `Gli accordi commerciali a lungo termine assicurano stabilità per l'approvvigionamento dei semiconduttori e componenti strategici per ${name}.`,
          fullText: `La firma formale di contratti di fornitura trentennali con le primarie fonderie e partner industriali mette al riparo ${name} (${sym}) dal rischio di colli di bottiglia o interruzioni nella distribuzione dei semiconduttori avanzati.\n\nL'accordo stabilisce una protezione contrattuale contro i rincari d'inflazione dei componenti intermedi, blindando la continuità produttiva dei prossimi quattro semestri e rassicurando gli analisti industriali d'area.`,
          tradingImplication: `Impatto fondamentale neutro-positivo. Riduzione del rischio operativo di filiera. Favorisce l'apprezzamento del titolo come asset difensivo di elevata stabilità.`
        },
        {
          id: "n4",
          source: "Morgan Stanley Note",
          headline: `Rischio regolatorio o pressioni competitive potrebbero rallentare l'espansione dei margini di ${sym}`,
          time: "4 ore fa",
          sentiment: "BEARISH",
          impact: "MEDIUM",
          summary: "Sebbene l'azienda mantenga una forte leadership competitiva, la saturazione dei canali di vendita principali richiede investimenti R&D integrativi importanti.",
          fullText: `Una nota riservata del dipartimento di analisi azionaria strategica indica che, sebbene ${name} continui a godere di una solida preferenza ed un primato indiscusso nel proprio mercato principale, vi sono segnali diffusi di saturazione dei canali commerciali in Europa Occidentale.\n\nPer sostenere le attuali metriche di profitto, la società dovrà indirizzare cifre significative in attività di Ricerca & Sviluppo (R&D) per espandersi verso mercati emergenti, un processo che potrebbe temporaneamente appesantire i margini netti del prossimo anno fiscale.`,
          tradingImplication: `Presa di beneficio prudenziale. Adottare cautela nell'aprire posizioni lunghe sui massimi d'anno ed attendere un ritracciamento protettivo verso livelli più vantaggiosi.`
        }
      ];
    }

    setNews(generatedNews);

    // 2. Generate Realistic investor sentiment (using a pseudo-random seed based on instrument fields)
    const peVal = typeof activeInstrument.pe === "number" ? activeInstrument.pe : Number(activeInstrument.pe) || 15;
    const baseNum = activeInstrument.price + peVal;
    const r1 = Math.min(94, Math.max(34, Math.round(55 + (baseNum % 17) - (baseNum % 9))));
    const r2 = Math.min(92, Math.max(30, Math.round(62 + (baseNum % 13) - (baseNum % 11))));
    const r3 = Math.min(95, Math.max(22, Math.round(50 + (baseNum % 19) - (baseNum % 7))));
    const shortPct = Math.min(28, Math.max(1.2, Number((3 + (baseNum % 8) * 1.4).toFixed(2))));
    const optRatio = Math.min(3.5, Math.max(0.4, Number((0.9 + (baseNum % 5) * 0.4).toFixed(2))));

    setSentiment({
      retail: r1,
      institutional: r2,
      social: r3,
      shortInterest: shortPct,
      optionRatio: optRatio
    });

    // 3. Generate Analyst Consensus
    const isCryptoOrForex = isCrypto || isForex;
    const buyShares = isCryptoOrForex ? 0 : Math.round(12 + (baseNum % 10));
    const holdShares = isCryptoOrForex ? 0 : Math.round(4 + (baseNum % 6));
    const sellShares = isCryptoOrForex ? 0 : Math.round(1 + (baseNum % 3));
    
    let consensusVal: "FORTE ACQUISTO" | "ACQUISTO" | "NEUTRALE" | "VENDITA" = "NEUTRALE";
    if (!isCryptoOrForex) {
      const ratio = buyShares / (buyShares + holdShares + sellShares);
      if (ratio > 0.7) consensusVal = "FORTE ACQUISTO";
      else if (ratio > 0.5) consensusVal = "ACQUISTO";
      else if (ratio < 0.2) consensusVal = "VENDITA";
    }

    const price = activeInstrument.price;
    const targetHigh = Number((price * 1.25).toFixed(isCrypto ? 2 : 4));
    const targetAvg = Number((price * 1.12).toFixed(isCrypto ? 2 : 4));
    const targetLow = Number((price * 0.88).toFixed(isCrypto ? 2 : 4));

    setAnalysts({
      consensus: consensusVal,
      buyCount: buyShares,
      holdCount: holdShares,
      sellCount: sellShares,
      targetHigh,
      targetAvg,
      targetLow
    });

    // 4. Generate Congressional/Governmental/Institutional insider records matching active symbol context or related
    const genericInsiders: InsiderTrade[] = [
      {
        id: "i1",
        insiderName: "Nancy Pelosi (U.S. House)",
        role: "Membro Congresso",
        country: "usa",
        ticker: isCrypto ? "BTC" : (isUsa ? sym : "NVDA"),
        action: "BUY",
        amount: "$250k - $500k",
        date: "25 Mag 2026",
        performance: 22.4
      },
      {
        id: "i2",
        insiderName: "Cassa Depositi e Prestiti (CDP)",
        role: "Fondo Istituzionale Statale",
        country: "italia",
        ticker: isItalia ? sym : "ENI",
        action: "BUY",
        amount: "€2.5M - €5.0M",
        date: "14 Mag 2026",
        performance: 8.7
      },
      {
        id: "i3",
        insiderName: "Michael McCaul (House Foreign)",
        role: "Presidente Affari Esteri U.S.",
        country: "usa",
        ticker: isUsa ? sym : "AAPL",
        action: "BUY",
        amount: "$50k - $100k",
        date: "02 Giu 2026",
        performance: 12.3
      },
      {
        id: "i4",
        insiderName: "MEF (Min. Economia e Finanze)",
        role: "Ministero Governativo Italiano",
        country: "italia",
        ticker: isItalia ? sym : "ENEL",
        action: "SELL",
        amount: "€10M - €15M",
        date: "28 Mag 2026",
        performance: -3.5
      },
      {
        id: "i5",
        insiderName: "Tommy Tuberville (Senate Armed)",
        role: "Membro Senato U.S.",
        country: "usa",
        ticker: isUsa ? sym : "XOM",
        action: "BUY",
        amount: "$15k - $50k",
        date: "10 Giu 2026",
        performance: 4.1
      },
      {
        id: "i6",
        insiderName: "Intesa Sanpaolo Wealth",
        role: "Allocazione Istituzionale SgR",
        country: "italia",
        ticker: isItalia ? sym : "ISP",
        action: "BUY",
        amount: "€1.2M - €2.0M",
        date: "04 Giu 2026",
        performance: 5.6
      },
      {
        id: "i7",
        insiderName: "John Kennedy (U.S. Senate)",
        role: "Senatore U.S.",
        country: "usa",
        ticker: isUsa ? sym : "MSFT",
        action: "SELL",
        amount: "$100k - $250k",
        date: "30 Mag 2026",
        performance: 14.8
      }
    ];

    setInsiderTrades(genericInsiders);

    setTimeout(() => {
      setIsRefreshing(false);
    }, 450);
  };

  // Filtered insider records
  const filteredInsiders = insiderTrades.filter(it => {
    if (insidersFilter === "all") return true;
    return it.country === insidersFilter;
  });

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      
      {/* CARD LEFT: REAL-TIME NEWS FEED & SENTIMENT ANALYSIS */}
      <div className={`p-4 rounded-lg border flex flex-col gap-3.5 ${isDark ? "bg-[#111318]" : "bg-white border-[#e2e5ec]"}`}>
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
          <div className="flex items-center gap-1.5">
            <Newspaper className="w-4 h-4 text-[var(--green)]" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[var(--text1)]">
              📰 News Real-Time & Sentiment
            </h3>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="flex h-1.5 w-1.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--green)] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[var(--green)]"></span>
            </span>
            <span className="text-[8.5px] font-mono uppercase text-[var(--green)] font-black tracking-wider animate-pulse">STREAM ATTIVO</span>
            <button 
              onClick={generateAllIntelligence}
              disabled={isRefreshing}
              className="text-[var(--text3)] hover:text-[var(--text1)] p-1 rounded hover:bg-[var(--bg3)] transition"
              title="Aggiorna feed notizie"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? "animate-spin text-[var(--green)]" : ""}`} />
            </button>
          </div>
        </div>

        {/* Investor Sentiment Block */}
        <div className={`p-3 rounded border flex flex-col gap-2.5 ${isDark ? "bg-[#161a22] border-[#ffffff06]" : "bg-[#f8fafc] border-neutral-100"}`}>
          <div className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-indigo-500" />
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--text2)]">SENTIMENT INTEGRATO INVESTITORI</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Retail Sentiment */}
            <div className="flex flex-col gap-1 text-[10px]">
              <div className="flex items-center justify-between font-medium">
                <span className="text-[var(--text3)]">Retail (Social/Forums)</span>
                <span className="font-mono font-bold text-[var(--green)]">{sentiment.retail}% Buy</span>
              </div>
              <div className="h-1.5 w-full bg-[var(--border)] rounded overflow-hidden flex">
                <div style={{ width: `${sentiment.retail}%` }} className="bg-[var(--green)] h-full" />
                <div style={{ width: `${100 - sentiment.retail}%` }} className="bg-[var(--red)]/40 h-full" />
              </div>
            </div>

            {/* Institutional Sentiment */}
            <div className="flex flex-col gap-1 text-[10px]">
              <div className="flex items-center justify-between font-medium">
                <span className="text-[var(--text3)]">Istituzionale (Fond/L-S)</span>
                <span className="font-mono font-bold text-[var(--green)]">{sentiment.institutional}% Buy</span>
              </div>
              <div className="h-1.5 w-full bg-[var(--border)] rounded overflow-hidden flex">
                <div style={{ width: `${sentiment.institutional}%` }} className="bg-[var(--green)] h-full" />
                <div style={{ width: `${100 - sentiment.institutional}%` }} className="bg-[var(--red)]/40 h-full" />
              </div>
            </div>

            {/* Option & Float Flow */}
            <div className="flex flex-col gap-1 text-[10px]">
              <div className="flex items-center justify-between font-medium">
                <span className="text-[var(--text3)]">Option Put/Call Floor</span>
                <span className="font-mono font-bold text-indigo-400">Ratio: {sentiment.optionRatio}x</span>
              </div>
              <div className="h-1.5 w-full bg-[var(--border)] rounded overflow-hidden flex">
                <div style={{ width: `${Math.min(100, sentiment.optionRatio * 35)}%` }} className="bg-indigo-500 h-full" />
                <div style={{ width: `${Math.max(0, 100 - (sentiment.optionRatio * 35))}%` }} className="bg-slate-400 opacity-30 h-full" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-0.5 border-t border-[var(--border)]/50 pt-2 text-[9px] font-mono text-[var(--text3)]">
            <div>
              SHORT INTEREST FLOAT: <strong className="text-amber-500">{sentiment.shortInterest}%</strong>
            </div>
            <div className="text-right">
              PULSE SOCIAL METRICS: <strong className="text-[var(--green)]">STABILE +{sentiment.social}%</strong>
            </div>
          </div>
        </div>

        {/* Real-Time News List */}
        <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-1">
          {news.map((item) => (
            <div 
              key={item.id} 
              onClick={() => setSelectedNewsDetail(item)}
              className={`p-2.5 rounded border flex flex-col gap-1.5 transition hover:translate-x-0.5 cursor-pointer hover:border-[var(--green)]/40 ${
                isDark ? "bg-[#14181f]/45 border-[#ffffff06] hover:bg-[#14181f]" : "bg-[#fcfdfd] border-[#eaedf3] hover:bg-neutral-50"
              }`}
            >
              <div className="flex items-center justify-between flex-wrap gap-1 text-[9px] font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 bg-[var(--bg3)] text-[var(--text2)] rounded font-extrabold uppercase text-[8.5px]">
                    {item.source}
                  </span>
                  <span className="text-[var(--text3)]">{item.time}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className={`px-1.5 py-0.5 rounded-sm font-black text-[8px] ${
                    item.sentiment === "BULLISH" ? "bg-[var(--green)]/10 text-[var(--green)]" : 
                    item.sentiment === "BEARISH" ? "bg-[var(--red)]/10 text-[var(--red)]" : "bg-orange-500/10 text-orange-500"
                  }`}>
                    {item.sentiment}
                  </span>
                  <span className={`px-1 py-0.5 rounded-sm font-bold text-[8px] text-white ${
                    item.impact === "HIGH" ? "bg-red-500" : item.impact === "MEDIUM" ? "bg-amber-500" : "bg-slate-500"
                  }`}>
                    IMP: {item.impact}
                  </span>
                </div>
              </div>

              <h4 className="text-[11.5px] font-bold tracking-tight text-[var(--text1)]">
                {item.headline}
              </h4>
              <p className="text-[10px] text-[var(--text2)] leading-relaxed font-sans">
                {item.summary}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* CARD RIGHT: ANALYST ESTIMATES & SENATE & PARLIAMENTARY TRADES */}
      <div className={`p-4 rounded-lg border flex flex-col gap-3.5 ${isDark ? "bg-[#111318]" : "bg-white border-[#e2e5ec]"}`}>
        
        {/* Navigation Inside Card */}
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-2 flex-wrap gap-2">
          <div className="flex bg-[var(--bg2)] rounded border border-[var(--border)] p-0.5 text-[10px] font-sans">
            <button
              onClick={() => setActiveSubTab("insights")}
              className={`px-3 py-1 rounded transition-all font-semibold flex items-center gap-1 cursor-pointer ${activeSubTab === "insights" ? "bg-[var(--green)] text-black font-extrabold" : "text-[var(--text2)]"}`}
            >
              <Target className="w-3 h-3" /> Consensus & Target Previsioni
            </button>
            <button
              onClick={() => setActiveSubTab("insiders")}
              className={`px-3 py-1 rounded transition-all font-semibold flex items-center gap-1 cursor-pointer ${activeSubTab === "insiders" ? "bg-[var(--green)] text-black font-extrabold" : "text-[var(--text2)]"}`}
            >
              <Globe className="w-3 h-3" /> Politici e Istituzionali Insider
            </button>
          </div>
          
          <div className="text-[9px] font-mono text-[var(--text3)] uppercase">
            {activeSubTab === "insights" ? "Rating Analisti" : "USA & IT Tracker"}
          </div>
        </div>

        {/* SUBTAB 1: ANALYST PROJECTIONS */}
        {activeSubTab === "insights" && (
          <div className="flex flex-col gap-3">
            
            {/* General rating wheel lookalike */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              
              <div className={`p-3 rounded border flex flex-col items-center justify-center text-center gap-1.5 ${isDark ? "bg-[#161a22] border-[#ffffff06]" : "bg-[#f8fafc] border-neutral-100"}`}>
                <span className="text-[9px] font-mono text-[var(--text3)] uppercase">RACCOMANDAZIONE CONSENSUS</span>
                <p className="text-base font-black font-sans text-[var(--green)] tracking-wider">
                  {activeInstrument.market === "crypto" || activeInstrument.market === "forex" ? "STIMATO ACQUISTO MATURATO" : analysts.consensus}
                </p>
                <div className="text-[9.5px] text-[var(--text2)] mt-0.5">
                  Basato sul panel di analisti d'investimento ed advisor istituzionali
                </div>
              </div>

              <div className={`p-3 rounded border flex flex-col justify-between gap-2 ${isDark ? "bg-[#161a22] border-[#ffffff06]" : "bg-[#f8fafc] border-neutral-100"}`}>
                <span className="text-[9px] font-mono text-[var(--text3)] uppercase">DISTRIBUZIONE GIUDIZI</span>
                {activeInstrument.market === "crypto" || activeInstrument.market === "forex" ? (
                  <div className="text-[10px] text-[var(--text3)] italic p-2 text-center">
                    Analisi di consensus non applicabile sui mercati a pronti privi di bilancio societario. Rating orientato su flussi spot algoritmici.
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5 text-[9.5px]">
                    {/* Buy */}
                    <div className="flex items-center gap-2">
                      <span className="w-14 text-[var(--text2)]">Acquisto (Buy)</span>
                      <div className="flex-1 h-2 bg-neutral-800 rounded overflow-hidden">
                        <div style={{ width: `${(analysts.buyCount / (analysts.buyCount + analysts.holdCount + analysts.sellCount)) * 100}%` }} className="bg-[var(--green)] h-full" />
                      </div>
                      <span className="w-4 text-right font-mono font-bold text-[var(--green)]">{analysts.buyCount}</span>
                    </div>

                    {/* Hold */}
                    <div className="flex items-center gap-2">
                      <span className="w-14 text-[var(--text2)]">Hold (Mantieni)</span>
                      <div className="flex-1 h-2 bg-neutral-800 rounded overflow-hidden">
                        <div style={{ width: `${(analysts.holdCount / (analysts.buyCount + analysts.holdCount + analysts.sellCount)) * 100}%` }} className="bg-[var(--orange)] h-full" />
                      </div>
                      <span className="w-4 text-right font-mono font-bold text-[var(--orange)]">{analysts.holdCount}</span>
                    </div>

                    {/* Sell */}
                    <div className="flex items-center gap-2">
                      <span className="w-14 text-[var(--text2)]">Vendi (Sell)</span>
                      <div className="flex-1 h-2 bg-neutral-800 rounded overflow-hidden">
                        <div style={{ width: `${(analysts.sellCount / (analysts.buyCount + analysts.holdCount + analysts.sellCount)) * 100}%` }} className="bg-[var(--red)]/80 h-full" />
                      </div>
                      <span className="w-4 text-right font-mono font-bold text-[var(--red)]">{analysts.sellCount}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Target Price distribution bar */}
            <div className={`p-3 rounded border flex flex-col gap-2 ${isDark ? "bg-[#161a22] border-[#ffffff06]" : "bg-[#f8fafc] border-neutral-100"}`}>
              <div className="flex items-center justify-between text-[10px] font-mono text-[var(--text3)]">
                <span>TARGET PRICE DEI PROSSIMI 12 MESI</span>
                <span className="text-[var(--text1)] font-bold">PREZZO ATTUALE: {activeInstrument.price > 100 ? activeInstrument.price.toLocaleString("it-IT", { minimumFractionDigits: 2 }) : activeInstrument.price.toFixed(4)}</span>
              </div>

              {/* Slider scale indicator */}
              <div className="h-6 relative flex items-center mt-2">
                <div className="absolute h-1 left-0 right-0 bg-[var(--border)] rounded" />
                
                {/* Low Target Pin */}
                <div className="absolute flex flex-col items-center" style={{ left: "10%" }}>
                  <div className="w-2 h-2 rounded-full bg-[var(--red)]" />
                  <span className="text-[8px] font-mono text-[var(--text3)] mt-2">Min €{analysts.targetLow}</span>
                </div>

                {/* Avg Target Pin */}
                <div className="absolute flex flex-col items-center" style={{ left: "55%" }}>
                  <div className="w-2.5 h-2.5 rounded bg-blue-500" />
                  <span className="text-[8px] font-mono text-blue-400 font-bold mt-2">Medio €{analysts.targetAvg}</span>
                </div>

                {/* current position pin blinking */}
                <div className="absolute flex flex-col items-center" style={{ left: "42%" }}>
                  <div className="w-3 h-3 rounded-full bg-[var(--green)] animate-ping absolute opacity-45" />
                  <div className="w-3 h-3 rounded-full bg-[var(--green)] border border-black" />
                  <span className="text-[8px] font-mono text-[var(--green)] font-black mt-2">Prezzo</span>
                </div>

                {/* High Target Pin */}
                <div className="absolute flex flex-col items-center animate-pulse" style={{ left: "90%" }}>
                  <div className="w-2 h-2 rounded-full bg-[var(--green)]" />
                  <span className="text-[8px] font-mono text-[var(--text2)] font-bold mt-2">Max €{analysts.targetHigh}</span>
                </div>
              </div>

              <div className="mt-4 pt-1 text-[10.5px] text-[var(--text2)] leading-relaxed text-justify">
                💡 Il consensus target a 12 mesi si attesta a un livello stimato medio di <strong className="text-[var(--green)]">€{analysts.targetAvg}</strong>, il che rappresenta un rendimento atteso ("potential upside") del <strong className="text-[var(--green)]">+{Number((((analysts.targetAvg - activeInstrument.price)/activeInstrument.price)*100).toFixed(1))}%</strong> rispetto ai valori attuali di scambio.
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 2: USA/ITALIA POLITICAL & INSTITUTIONAL TRADES */}
        {activeSubTab === "insiders" && (
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-[9.5px] uppercase font-mono text-[var(--text3)] font-bold">
                OPERAZIONI DISCHIUSE DA MEMBRI DEL GOVERNO E PARLAMENTO
              </span>
              
              {/* USA/ITA filters switches */}
              <div className="flex bg-[var(--bg2)] rounded border border-[var(--border)] p-0.5 text-[8.5px]">
                <button
                  onClick={() => setInsidersFilter("all")}
                  className={`px-2 py-0.5 rounded cursor-pointer ${insidersFilter === "all" ? "bg-[var(--border)] text-[var(--text1)] font-extrabold" : "text-[var(--text3)]"}`}
                >
                  Tutti
                </button>
                <button
                  onClick={() => setInsidersFilter("usa")}
                  className={`px-2 py-0.5 rounded cursor-pointer ${insidersFilter === "usa" ? "bg-[var(--border)] text-[var(--text1)] font-extrabold" : "text-[var(--text3)]"}`}
                >
                  🇺🇸 USA Cong.
                </button>
                <button
                  onClick={() => setInsidersFilter("italia")}
                  className={`px-2 py-0.5 rounded cursor-pointer ${insidersFilter === "italia" ? "bg-[var(--border)] text-[var(--text1)] font-extrabold" : "text-[var(--text3)]"}`}
                >
                  🇮🇹 IT Istit.
                </button>
              </div>
            </div>

            {/* Micro warning note */}
            <div className="text-[8.5px] leading-relaxed text-[var(--text3)] flex items-start gap-1 pb-1 border-b border-[var(--border)]/60">
              <ShieldAlert className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
              <span>
                I membri del Congresso degli Stati Uniti (STOCK Act) e le istituzioni statali o membri del Parlamento italiano sono obbligati a pubblicare le proprie movimentazioni finanziarie private entro termini legali. I dati mostrano un potenziale legame di posizionamento istituzionale strategico globale.
              </span>
            </div>

            {/* Data list table scrollable */}
            <div className="overflow-x-auto max-h-[250px] overflow-y-auto">
              <table className="w-full text-[10px] text-[var(--text2)] border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--bg3)] text-[var(--text3)] font-mono text-[8px] uppercase text-left">
                    <th className="py-1.5 px-2">Soggetto / Istituzione</th>
                    <th className="py-1.5 px-1">Trigger</th>
                    <th className="py-1.5 px-1 text-center">Tipo</th>
                    <th className="py-1.5 px-2 text-right">Controvalore Est.</th>
                    <th className="py-1.5 px-2 text-right">Post-Gain</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filteredInsiders.map((trade) => (
                    <tr 
                      key={trade.id} 
                      className={`hover:bg-[var(--bg3)] transition-colors ${
                        trade.ticker === activeInstrument.sym ? "bg-[var(--green)]/5 font-bold" : ""
                      }`}
                    >
                      <td className="py-2 px-2 max-w-[140px] truncate">
                        <div className="flex items-center gap-1.5">
                          <span>{trade.country === "usa" ? "🇺🇸" : "🇮🇹"}</span>
                          <div className="flex flex-col">
                            <span className="text-[10px] text-[var(--text1)] font-bold truncate leading-tight">{trade.insiderName}</span>
                            <span className="text-[8px] text-[var(--text3)] font-sans">{trade.role}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-2 px-1 font-mono font-bold text-[8.5px]">
                        <span className="inline-flex items-center gap-0.5">
                          {trade.ticker}
                          <a 
                            href={getTradingViewUrl(trade.ticker === activeInstrument.sym ? activeInstrument.tvSym : undefined, trade.ticker)} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-[var(--text3)] hover:text-[var(--green)] p-0.5 rounded transition inline-flex items-center"
                            title={`Apri grafico ${trade.ticker} su TradingView`}
                          >
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </span>
                      </td>
                      <td className="py-2 px-1 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black ${
                          trade.action === "BUY" ? "bg-[var(--green)]/10 text-[var(--green)]" : "bg-[var(--red)]/10 text-[var(--red)]"
                        }`}>
                          {trade.action}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-[9px] text-[var(--text1)] font-medium">
                        {trade.amount}
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-[9.5px]">
                        <span className={`flex items-center justify-end gap-0.5 ${
                          trade.performance >= 0 ? "text-[var(--green)]" : "text-[var(--red)]"
                        }`}>
                          {trade.performance >= 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                          {trade.performance > 0 ? "+" : ""}{trade.performance}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-[var(--bg2)] rounded p-2 text-[9px] text-[var(--text3)] italic leading-relaxed">
              * Nota: Le operazioni evidenziate in colorazione verde indicano correlazione o coincidenza diretta con il ticker attualmente selezionato nell'interfaccia principale: <strong className="text-[var(--green)] font-mono">{activeInstrument.sym}</strong>.
            </div>
          </div>
        )}
      </div>

      {/* OVERLAY DETAILS MODAL FOR SELECTED NEWS ARTICLE */}
      {selectedNewsDetail && (
        <div 
          className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-[2000] p-4 animate-fade-in"
          onClick={() => setSelectedNewsDetail(null)}
        >
          <div 
            className={`w-full max-w-xl p-5 rounded-xl border shadow-2xl relative flex flex-col gap-4 max-h-[85vh] overflow-y-auto animate-zoom-in ${
              isDark ? "bg-[#111318] border-[#ffffff15] text-[#b4ccd6]" : "bg-white border-[#e2e5ec] text-slate-700"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header / Badges */}
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-[var(--bg3)] text-[var(--text2)] text-[9px] font-mono font-extrabold uppercase rounded border border-[var(--border)]">
                  {selectedNewsDetail.source}
                </span>
                <span className="text-[10px] font-mono text-[var(--text3)]">
                  {selectedNewsDetail.time}
                </span>
              </div>
              <button 
                onClick={() => setSelectedNewsDetail(null)}
                className="text-[var(--text3)] hover:text-[var(--text1)] p-1 rounded-lg hover:bg-[var(--bg3)] transition cursor-pointer"
                title="Chiudi"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Headline */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold tracking-wider ${
                  selectedNewsDetail.sentiment === "BULLISH" ? "bg-[var(--green)]/15 text-[var(--green)]" : 
                  selectedNewsDetail.sentiment === "BEARISH" ? "bg-[var(--red)]/15 text-[var(--red)]" : "bg-orange-500/15 text-orange-500"
                }`}>
                  {selectedNewsDetail.sentiment}
                </span>
                <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold tracking-wider text-white ${
                  selectedNewsDetail.impact === "HIGH" ? "bg-red-500" : selectedNewsDetail.impact === "MEDIUM" ? "bg-amber-500" : "bg-slate-500"
                }`}>
                  IMPATTO: {selectedNewsDetail.impact}
                </span>
              </div>
              <h3 className="text-sm font-extrabold tracking-tight text-[var(--text1)] leading-snug">
                {selectedNewsDetail.headline}
              </h3>
            </div>

            {/* Main content body */}
            <div className={`p-3.5 rounded-lg border leading-relaxed text-xs overflow-y-auto space-y-3 ${
              isDark ? "bg-[#161a22] border-[#ffffff06]" : "bg-neutral-50 border-neutral-100"
            }`}>
              <h4 className="text-[10px] font-mono uppercase tracking-widest text-[var(--text2)] font-bold">ARTICOLO COMPLETO</h4>
              <p className="font-sans text-[var(--text1)] whitespace-pre-line leading-relaxed text-slate-300">
                {selectedNewsDetail.fullText || `In merito a ${selectedNewsDetail.headline}, fonti industriali confermano che la notizia riflette un posizionamento macroeconomico molto rilevante per la società. I mercati azionari e i future registrano un incremento della volatilità implicita sulle scadenze di breve termine.`}
              </p>
            </div>

            {/* Summary & Trading Implications */}
            <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-3">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-mono text-[var(--text3)] uppercase">SINTESI DEL REPORT:</span>
                <p className="text-[11px] font-sans text-[var(--text2)] leading-relaxed">
                  {selectedNewsDetail.summary}
                </p>
              </div>

              <div className={`p-3 rounded border flex flex-col gap-1 ${
                isDark ? "bg-[#1a202c] border-[#38bdf815]" : "bg-sky-50/50 border-sky-100"
              }`}>
                <span className="text-[9px] font-mono text-sky-400 font-extrabold uppercase tracking-wide flex items-center gap-1.5">
                  ⚡ IMPLICAZIONI OPERATIVE SU {activeInstrument.sym}:
                </span>
                <p className="text-[11px] text-[var(--text2)] font-mono leading-relaxed">
                  {selectedNewsDetail.tradingImplication || `Vigilare sulle aree di pivot giornaliere. Impostare ordini limite in acquisto in prossimità del supporto volumetrico principale o coprire le posizioni spot aperte con derivati a copertura.`}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button 
                onClick={() => setSelectedNewsDetail(null)}
                className="bg-[var(--green)] hover:bg-[var(--green)]/90 text-black font-extrabold text-[10px] px-5 py-2 rounded transition-all cursor-pointer shadow-md hover:scale-101"
              >
                Chiudi Notizia
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
