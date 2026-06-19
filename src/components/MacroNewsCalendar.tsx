import React, { useState, useEffect } from "react";
import { 
  Newspaper, 
  Calendar, 
  Sparkles, 
  Cpu, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Clock, 
  RefreshCw, 
  CheckCircle2, 
  Globe, 
  Filter, 
  ArrowRight,
  Gauge,
  HelpCircle,
  Search,
  BookOpen,
  X
} from "lucide-react";

interface MacroNewsCalendarProps {
  isDark: boolean;
}

// Interfaces
interface MacroNewsItem {
  id: string;
  time: string;
  category: "MONETARY" | "MACRO" | "EQUITIES" | "GEOPOLITICS";
  source: string;
  title: string;
  summary: string;
  sentiment: "RIALZISTA" | "NEUTRALE" | "RIBASSISTA";
  impact: "ALTO" | "MEDIO" | "BASSO";
  aiSummary: string;
  tradingImplication: string;
  fullArticle?: string;
}

interface CalendarEvent {
  id: string;
  time: string;
  country: "IT" | "UE" | "US" | "UK";
  indicator: string;
  period: string;
  actual: string;
  forecast: string;
  previous: string;
  impact: "HIGH" | "MEDIUM" | "LOW";
  status: "RILASCIATO" | "ATTESA";
  aiInterpretation: string;
  fullDetails?: string;
}

export default function MacroNewsCalendar({ isDark }: MacroNewsCalendarProps) {
  const [newsFilter, setNewsFilter] = useState<"all" | "MONETARY" | "MACRO" | "EQUITIES" | "GEOPOLITICS">("all");
  const [impactFilter, setImpactFilter] = useState<"all" | "ALTO" | "MEDIO">("all");
  const [calCountryFilter, setCalCountryFilter] = useState<"all" | "IT" | "UE" | "US">("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  const [selectedNews, setSelectedNews] = useState<MacroNewsItem | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [activeModalNews, setActiveModalNews] = useState<MacroNewsItem | null>(null);
  const [activeModalEvent, setActiveModalEvent] = useState<CalendarEvent | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiReportText, setAiReportText] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Hardcoded premium mock datasets in Italian
  const [newsItems, setNewsItems] = useState<MacroNewsItem[]>([
    {
      id: "mn1",
      time: "10 min fa",
      category: "MONETARY",
      source: "Milano Finanza",
      title: "I governatori BCE indicano possibile taglio tassi di 25pb a Luglio",
      summary: "Fonti interne segnalano un consenso crescente tra i membri falchi del Consiglio Direttivo BCE per avviare una prima riduzione dello spread di tasso di riferimento, grazie al contenimento dell'inflazione core al 2.4%.",
      sentiment: "RIALZISTA",
      impact: "ALTO",
      aiSummary: "La BCE si prepara a invertire la politica monetaria restrittiva. Questo riduce i rendimenti obbligazionari sovrani (BTP) ed incrementa i flussi verso l'azionario a leva (banche e utilities).",
      tradingImplication: "Acquisto speculativo su FTSE MIB in prossimità del supporto volumetrico. Calo dei rendimenti atteso sul BTP decennale.",
      fullArticle: "MILANO — Il Consiglio Direttivo della Banca Centrale Europea (BCE) starebbe convergendo verso una decisione storica per il prossimo meeting di Luglio. Secondo fonti qualificate vicine al board di Francoforte, l'inflazione 'core' armonizzata (depurata dalle componenti energetiche e alimentari volatili) si è assestata stabilmente al 2.4%, aprendo uno spazio di manovra confortevole per allentare la morsa restrittiva.\n\nSebbene i governatori considerati tradizionalmente 'falchi' (tra cui esponenti della Bundesbank tedesca) abbiano espresso cautela circa i possibili effetti di secondo round sui salari di servizio, si registra un ampio consenso di massima per un primo taglio del saggio di sconto di riferimento pari a 25 punti base. Gli investitori istituzionali accolgono favorevolmente l'indiscrezione, che ridurrebbe i costi di finanziamento per lo stato italiano (contrazione del rendimento dei BTP decennali) e darebbe nuova linfa alle utility e banche commerciali quotate a Piazza Affari."
    },
    {
      id: "mn2",
      time: "25 min fa",
      category: "MACRO",
      source: "Il Sole 24 Ore",
      title: "La produzione industriale italiana batte le aspettative nel Q2: +0.6%",
      summary: "Aumento robusto dei beni strumentali e della meccanica di precisione. L'import-export verso i paesi extra-UE funge da volano principale per la ripresa manifatturiera.",
      sentiment: "RIALZISTA",
      impact: "ALTO",
      aiSummary: "Il settore industriale italiano mostra una resilienza inaspettata. Questo mitiga le paure di recessione nell'Eurozona e rafforza il premio al rischio sul listino milanese.",
      tradingImplication: "Bullish su comparto industriale medio-cap e banche retail italiane.",
      fullArticle: "ROMA — Sorpresa macroeconomica dal comparto manifatturiero italiano: nel secondo trimestre dell'anno la produzione industriale ha superato ogni stima di consensus degli analisti, facendo registrare un incremento robustissimo dello 0.6% su base congiunturale rispetto al trimestre precedente. I dati diffusi dall'ISTAT evidenziano un vigore spettacolare per i segmenti dei beni strumentali, della robotica avanzata e della meccanica di precisione.\n\nIl principale motore di questa rinascita si conferma l'export, alimentato da contratti bilaterali ad alta tecnologia con partner americani ed asiatici. Gli analisti di settore fanno notare che la manifattura italiana sta dimostrando una flessibilità operativa di gran lunga superiore a quella tedesca, attenuando la percezione di debolezza recessiva per la periferia dell'Eurozona e inducendo una forte rivalutazione dell'indice FTSE MIB."
    },
    {
      id: "mn3",
      time: "1 ora fa",
      category: "GEOPOLITICS",
      source: "Reuters Italia",
      title: "Nuove tensioni sui dazi doganali USA-Cina: tariffe del 20% su semilavorati tecnologici",
      summary: "La Casa Bianca giustifica le nuove misure come necessarie per proteggere le filiere dometiche di semiconduttori e stelle fotovoltaiche. Pechino promette contromisure simmetriche.",
      sentiment: "RIBASSISTA",
      impact: "ALTO",
      aiSummary: "L'aumento dell'inflazione importata potrebbe frenare il ritmo di discesa dei tassi di interesse della Federal Reserve, ostacolando i titoli tecnologici ad alta capitalizzazione.",
      tradingImplication: "Short tattico Nasdaq 100/Micro-chip. Copertura su materie prime (Oro).",
      fullArticle: "WASHINGTON — Il Dipartimento del Commercio degli Stati Uniti d'America ha ufficializzato l'adozione di un nuovo pacchetto di tariffe protezionistiche su vasta scala, concentrato in particolar modo sui semilavorati tecnologici, moduli fotovoltaici e semiconduttori in arrivo dalla Repubblica Popolare Cinese. Le imposte doganali subiranno un incremento immediato fino al 20%, una misura definita dalla Casa Bianca 'essenziale per preservare la sovranità tecnologica ed incoraggiare la produzione all'interno dei confini nazionali'.\n\nLa reazione di Pechino non si è fatta attendere, con il Ministero degli Esteri cinese che ha definito la delibera unilaterale 'un grave vulnus al commercio globale multilaterale' ed ha promesso rappresaglie simmetriche e mirate sulle materie prime industriali (terre rare ed alluminio). Le implicazioni sui mercati preoccupano i gestori di fondi tematici, data la probabile interruzione delle catene di approvvigionamento tecnologiche."
    },
    {
      id: "mn4",
      time: "2 ore fa",
      category: "MACRO",
      source: "Bloomberg Term",
      title: "Inflazione Core (CPI) USA si attesta al 3.2% a/a, leggermente sotto il 3.3% stimato",
      summary: "I dati del Dipartimento del Lavoro statunitense evidenziano un raffreddamento nei costi degli immobili residenziali e dei servizi di trasporto, sollevando i mercati azionari mondiali.",
      sentiment: "RIALZISTA",
      impact: "ALTO",
      aiSummary: "Allontanamento dello scenario di inflazione persistente 'sticky'. Aumenta all'82% la probabilità implicita nei futures sui tassi di un primo allentamento Fed a Settembre.",
      tradingImplication: "Long EUR/USD, long obbligazionario US Treasury 10Y. Rally di sollievo sull'azionariato tecnologico.",
      fullArticle: "NEW YORK — L'ufficio di statistica del lavoro degli Stati Uniti (BLS) ha comunicato l'andamento dei prezzi al consumo (CPI) relativo al mese precedente. L'inflazione di fondo 'Core' (escludendo i beni alimentari ed energetici) si attesta al 3.2% su base annua, leggermente al di sotto delle proiezioni medie degli esperti che si attendevano un consolidamento al 3.3%. Il rallentamento è stato trainato da un calo generalizzato delle tariffe aeree, dei servizi alberghieri e di un limitato allentamento del comparto immobiliare domestico.\n\nI mercati finanziari globali hanno reagito con estremo entusiasmo a questo dato energetico: i futures sui tassi federali indicano ora un'impennata all'82% della probabilità implicita che la Federal Reserve avvii il primo storico taglio del costo del denaro durante la sessione governativa del prossimo Settembre."
    },
    {
      id: "mn5",
      time: "3 ore fa",
      category: "EQUITIES",
      source: "CNBC",
      title: "ENI stringe accordo strategico in Libia per l'approvvigionamento di gas naturale",
      summary: "Investimento programmato da 4 miliardi di dollari per lo sviluppo di due campi offshore ad alta capacità produttiva. Fornitura garantita all'Italia a partire dal 2027.",
      sentiment: "NEUTRALE",
      impact: "MEDIO",
      aiSummary: "Miglioramento dell'indipendenza energetica domestica italiana. ENI consolida il proprio posizionamento strategico nel Mediterraneo, proteggendo la stabilità dei dividendi futuri.",
      tradingImplication: "Acquisto sul supporto per investitori di lungo termine alla ricerca di dividendo stabile. Target price immutato.",
      fullArticle: "ROMA — Il gruppo energetico guidato da Claudio Descalzi ha siglato a Tripoli un memorandum d'intesa vincolante della durata di venticinque anni con l'istituzione petrolifera nazionale libica (NOC) per sbloccare investimenti strategici per oltre 4 miliardi di dollari. L'accordo consentirà lo sviluppo congiunto di due nuovi grandi giacimenti offshore di gas naturale capaci di convogliare annualmente oltre 10 miliardi di metri cubi verso la rete continentale.\n\nLa fornitura, destinata a incrementare sensibilmente l'indipendenza energetica dell'Italia, sarà commercializzata interamente a partire dal primo trimestre del 2027 tramite la condotta transmediterranea. Gli esperti di Corporate Finance ritengono che l'operazione permetterà alla compagnia di conseguire flussi di cassa solidi a lungo termine, a protezione del piano di buyback e dividendi del titolo."
    },
    {
      id: "mn6",
      time: "4 ore fa",
      category: "GEOPOLITICS",
      source: "Ansa Economia",
      title: "Il greggio Brent sale a 82.5$ al barile tra timori logistici nel Canale di Suez",
      summary: "Nuovi attacchi a portacontainer costringono le compagnie marittime a circumnavigare l'Africa. I costi dei noli marittimi subiscono un rialzo del 15% in sole 48 ore.",
      sentiment: "RIBASSISTA",
      impact: "MEDIO",
      aiSummary: "Premio al rischio geopolitico sui contratti energetici. Il prolungarsi di queste deviazioni logistiche rischia di causare un moderato shock d'offerta transitorio nei beni di consumo.",
      tradingImplication: "Long su contratti Brent spot e posizionamento su compagnie di logistica merci marittima globale.",
      fullArticle: "LONDRA — Tensione e nervosismo sul mercato energetico spot: le quotazioni del petrolio greggio di qualità Brent del Mare del Nord hanno rotto con violenza la resistenza tecnica di breve periodo a quota 82.5 dollari al barile. La spinta rialzista è originata dall'ennesima ondata di attacchi missilistici asimmetrici contro le navi commerciali in transito nel Canale di Suez, che ha costretto le primarie agenzie di navigazione globali a deviare tutte le navi portacontainer attorno al Capo di Buona Speranza in Africa.\n\nQuesta deviazione logistica allunga i tempi di percoronza marittima di oltre 12 giorni, causando un brusco rialzo delle tariffe di trasporto (noli) del 15% nel giro di poche ore. Gli analisti temono che in mancanza di una rapida stabilizzazione la strozzatura logistica possa innescare una nuova spinta inflazionistica transitoria nell'Eurozona."
    },
    {
      id: "mn7",
      time: "6 ore fa",
      category: "MONETARY",
      source: "Reuters",
      title: "La Banca d'Inghilterra taglia a sorpresa il tasso di sconto ufficiale dal 5.25% al 5.00%",
      summary: "La BoE è la prima grande banca centrale anglosassone ad agire sul costo del denaro, citando una discesa stabile dell'indice d'inflazione armonizzato stabilmente al target del 2.0%.",
      sentiment: "RIALZISTA",
      impact: "ALTO",
      aiSummary: "Azione monetaria aggressiva che riflette una vittoria definitiva sulla spiralizzazione dei prezzi. Questa mossa mette sotto pressione la Fed e la BCE affinché accelerino i propri piani d'azione.",
      tradingImplication: "Pressione ribassista immediata sulla Sterlina (GBP/USD). Buona accoglienza per le aziende edili e i mutuatari residenziali UK.",
      fullArticle: "LONDRA — Con una mossa a sorpresa che ha disorientato gran parte della piazza finanziaria globale, il Comitato di Politica Monetaria della Bank of England (BoE) ha deliberato a maggioranza la contrazione del tasso di rifinanziamento principale dal 5.25% al 5.00%. La decisione rappresenta un capitolo cruciale nella lotta globale contro l'inflazione degli ultimi anni, rendendo la BoE la prima grande istituzione anglosassone ad allentare significativamente il costo del capitale.\n\nIl governatore Andrew Bailey ha dichiarato che la discesa dell'indice dei prezzi al consumo armonizzato si è stabilizzata stabilmente nell'intorno del target istituzionale del 2.0%, consentendo di dare sostegno all'economia reale ed in particolare al comparto edilizio domestico che si trovava sotto una severa morsa creditizia."
    }
  ]);

  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([
    {
      id: "c1",
      time: "09:00",
      country: "IT",
      indicator: "Fatturato dell'industria m/m",
      period: "Mag",
      actual: "+0.8%",
      forecast: "+0.2%",
      previous: "-0.4%",
      impact: "MEDIUM",
      status: "RILASCIATO",
      aiInterpretation: "La domanda domestica e l'export italiano tengono straordinariamente bene. La revisione al rialzo del dato precedente conferma un quadro strutturale positivo per la manifattura.",
      fullDetails: "Questo indice misura il fatturato generato dalle imprese industriali italiane operanti sul territorio nazionale ed estero. Nel mese di maggio si è registrato un formidabile +0.8%, superando ampiamente le previsioni degli analisti che si attestavano ad un prudente +0.2%. Il dato indica una tenuta formidabile della domanda e smentisce i timori di una recessione immediata d'area, sostenendo le aziende industriali a media capitalizzazione quotate sul listino FTSE MIB."
    },
    {
      id: "c2",
      time: "11:00",
      country: "UE",
      indicator: "Indice dei Prezzi al Consumo (CPI) a/a (Armonizzato)",
      period: "Giu",
      actual: "+2.4%",
      forecast: "+2.5%",
      previous: "+2.6%",
      impact: "HIGH",
      status: "RILASCIATO",
      aiInterpretation: "Discesa più veloce del previsto dell'indice armonizzato. Rimuove l'ultimo ostacolo per la BCE per attuare politiche distensive nel comitato di Luglio.",
      fullDetails: "L'indice armonizzato dei prezzi al consumo (HICP) monitora la variazione dei prezzi dei beni e dei servizi in tutta l'Eurozona secondo standard unificati. Il rallentamento al +2.4% annuo rispetto alle attese del +2.5% costituisce un segnale rialzista per l'azionario europeo e conferma il superamento definitivo delle pressioni inflattive, spianando la strada per tagli successivi del costo del denaro."
    },
    {
      id: "c3",
      time: "14:30",
      country: "US",
      indicator: "Nuove Richieste Sussidi Disoccupazione",
      period: "Settimanale",
      actual: "218k",
      forecast: "225k",
      previous: "221k",
      impact: "HIGH",
      status: "RILASCIATO",
      aiInterpretation: "Il mercato del lavoro americano si conferma estremamente rigido. Meno licenziamenti indicano che l'economia americana continua a viaggiare in territorio di espansione, limitando le spinte Fed a tagli multipli.",
      fullDetails: "Il report delle richieste settimanali di disoccupazione negli Stati Uniti misura il numero di individui che presentano domanda di indennizzo per la prima volta. Il dato di 218k (inferiore alle 225k stimate) denota un mercato del lavoro ancora molto tonico e resiliente. Sebbene rifletta un'economia forte, questo costringe la Federal Reserve a muoversi con estrema cautela prima di avviare cicli aggressivi di ribasso dei tassi d'interesse."
    },
    {
      id: "c4",
      time: "14:30",
      country: "US",
      indicator: "Permessi di Costruzione Rilasciati",
      period: "Maggio",
      actual: "1.38M",
      forecast: "1.42M",
      previous: "1.34M",
      impact: "MEDIUM",
      status: "RILASCIATO",
      aiInterpretation: "Frenata modesta nel comparto immobiliare a causa dei tassi di mutuo trentennali ancora insostenibili sopra il 6.8%. Segnale di raffreddamento controllato.",
      fullDetails: "Il rilascio di permessi di costruzione rappresenta un indicatore anticipatore fondamentale della salute del mercato immobiliare statunitense d'area. Il consuntivo di 1.38 milioni conferma una lieve contrazione dovuta ai tassi d'interesse ancora elevati per i mutui ipotecari commerciali. Si tratta tuttavia di una flessione ordinata che supporta il percorso di stabilizzazione macro senza generare crisi sistemiche."
    },
    {
      id: "c5",
      time: "16:00",
      country: "UE",
      indicator: "Indice di Fiducia dei Consumatori",
      period: "Giu",
      actual: "—",
      forecast: "-13.5",
      previous: "-14.3",
      impact: "MEDIUM",
      status: "ATTESA",
      aiInterpretation: "Un aumento della fiducia consumer indicherebbe che il calo dell'inflazione ed il bonus energia stanno migliorando il potere d'acquisto dei cittadini dell'area euro.",
      fullDetails: "Questo sondaggio rileva il clima di ottimismo economico delle famiglie nell'Eurozona su posizioni occupazionali, risparmiali e investimenti programmati. Un rimbalzo stimato a -13.5 punti rispetto al precedente -14.3 segnala gli effetti benefici della stabilità dell'occupazione e del rallentamento del paniere energia/carburante sui consumi domestici di base."
    },
    {
      id: "c6",
      time: "Domani 10:00",
      country: "IT",
      indicator: "Bilancia Commerciale Mensile",
      period: "Maggio",
      actual: "—",
      forecast: "4.86B",
      previous: "4.21B",
      impact: "LOW",
      status: "ATTESA",
      aiInterpretation: "Surplus commerciale atteso in crescita grazie alla diminuzione del valore nominale energetico importato e alla ripresa dell'export chimico/meccanico.",
      fullDetails: "La bilancia commerciale italiana misura lo scarto netto di valore monetario tra beni esportati ed importati. Il surplus stimato in crescita a 4.86 miliardi testimonia la straordinaria competitività globale della meccanica, del bio-farmaco e della moda italiana, in concomitanza con la decisa contrazione dei costi di importazione delle materie prime energetiche (gas)."
    },
    {
      id: "c7",
      time: "Ven 14:30",
      country: "US",
      indicator: "Indice dei Prezzi PCE Core m/m (Indicatore Fed)",
      period: "Maggio",
      actual: "—",
      forecast: "+0.1%",
      previous: "+0.2%",
      impact: "HIGH",
      status: "ATTESA",
      aiInterpretation: "Questo è l'indicatore principe monitorato dalla Federal Reserve. Se confermato allo 0.1% mensile, sbloccherà una proiezioni pluriennale di rendimenti calanti sui bond americani.",
      fullDetails: "L'indice Core PCE (Personal Consumption Expenditures) misura le variazioni di spesa dei consumatori americani depurate dalle componenti volatili cibo ed alimentari. Trattandosi dell'indicatore di inflazione preferito dalla Fed, un dato effettivo allineato allo +0.1% mensile fornirebbe l'evidenza empirica che i fautori di tagli dei tassi cercano per procedere speditamente già a partire da fine estate."
    }
  ]);

  // Handle active details
  useEffect(() => {
    // Select first news as default in AI panel
    if (newsItems.length > 0 && !selectedNews && !selectedEvent) {
      setSelectedNews(newsItems[0]);
    }
  }, [newsItems]);

  // Generate Global AI Macro Report
  const triggerGlobalMacroReport = () => {
    setIsAiLoading(true);
    setAiReportText("");
    
    setTimeout(() => {
      const report = `### 🧠 REPORT GENERATION: COGNITIVE INTELLIGENCE MACRO ITALIA
**Data Elaborazione**: 17 Giugno 2026 | **Modello AI**: *Gemini-3.5-Intelligence-Core*
**Status Operativo**: GENERAZIONE OTTIMIZZATA PER TERMINAL MONITOR

---

#### 1. QUADRO DI SINTESI MACROECONOMICO (ZONA EURO & ITALIA)
La combinazione dei dati macro odierni delinea uno scenario di **"Soft Landing controllato"** molto favorevole per i mercati azionari dell'Europa periferica, in particolare per il listino **FTSE MIB (Milano)**. 
- **Inflazione Area Euro (CPI) scesa al +2.4%**: Questo valore confuta i timori di inflazione persistente ("sticky inflation") e offre un margine di tolleranza di quasi 60 punti base rispetto al target statutario BCE del 2%.
- **Resilienza Industriale Italiana (+0.6%)**: Sfata le aspettative di una contrazione nel secondo trimestre. Il manifatturiero italiano si dimostra più flessibile di quello tedesco, beneficiando di linee di approvvigionamento diversificate.

#### 2. VALUTAZIONE DI RISCHIO E CORRELAZIONE ASSET
L'indicatore di **Rischio Sistemico Interno** si attesta attualmente a un livello di **35/100 (Basso-Moderato)**.
- **BTP Decennale Italiano**: Il rendimento spot è impostato per scendere verso l'area **3.65%** con contrazione dello **Spread BTP-Bund** sotto la soglia critica dei 128 punti base. Questo stimola immediatamente i titoli finanziari (Intesa Sanpaolo, Unicredit) e i grandi distributori energetici ad alto dividendo (Enel, Terna).
- **EUR/USD (Cambio Euro-Dollaro)**: Bias direzionale debolmente rialzista verso **1.0920** sostenuto dalla divergenza tra il rigido mercato del lavoro US (richieste sussidi a 218K) e l'allentamento delle dinamiche monetarie dell'eurozona.

#### 3. SCENARIO PREDITTIVO A 15 GIORNI (TRADING STRATEGIES)
* **SCENARIO A (70% Probabilità) - RALLENTAMENTO CONTROLLATO CPI**: Il listino milanese rompe la resistenza dinamica a 34.200 punti, trascinato dal recupero di utilities e bancari sensibili allo spread. *Azione: Accumulare titoli con P/E inferiore a 14 e Dividend Yield > 5%.*
* **SCENARIO B (30% Probabilità) - RISCHIO GEOPOLITICO NOLI**: Escalation nel canale di Suez che forza il Brent di nuovo sopra i 86$. Spinte inflazionistiche isolate rinviano i tagli dei tassi complessivi a fine autunno. *Azione: Hedge parziale con titoli energetici (Eni, Saras) ed acquisto opzioni protettive Put.*`;

      setAiReportText(report);
      setIsAiLoading(false);
    }, 1200);
  };

  useEffect(() => {
    triggerGlobalMacroReport();
  }, []);

  const handleNewsClick = (item: MacroNewsItem) => {
    setSelectedEvent(null);
    setSelectedNews(item);
    setActiveModalNews(item);
    setIsAiLoading(true);
    
    // Simulate smart AI analysis on this specific news item
    setTimeout(() => {
      setIsAiLoading(false);
    }, 300);
  };

  const handleEventClick = (item: CalendarEvent) => {
    setSelectedNews(null);
    setSelectedEvent(item);
    setActiveModalEvent(item);
    setIsAiLoading(true);
    
    // Simulate smart AI analysis on this specific event
    setTimeout(() => {
      setIsAiLoading(false);
    }, 300);
  };

  const forceDataRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      // randomly permute slightly actual values or times to simulate real-time live connection
      const updatedNews = [...newsItems];
      updatedNews[0].time = "Ora";
      setNewsItems(updatedNews);
      
      const updatedEvents = [...calendarEvents];
      if (updatedEvents[4].actual === "—") {
        updatedEvents[4].actual = "-13.2";
        updatedEvents[4].status = "RILASCIATO";
      }
      setCalendarEvents(updatedEvents);
      
      setIsRefreshing(false);
    }, 500);
  };

  // Filter computations
  const searchedNews = newsItems.filter(item => {
    // category filter
    const matchCategory = newsFilter === "all" || item.category === newsFilter;
    // impact filter
    const matchImpact = impactFilter === "all" || item.impact === impactFilter;
    // search text query
    const matchSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        item.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        item.source.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchImpact && matchSearch;
  });

  const filteredEvents = calendarEvents.filter(evt => {
    if (calCountryFilter === "all") return true;
    return evt.country === calCountryFilter;
  });

  return (
    <div className="flex flex-col gap-4 font-sans">
      
      {/* 1. TOP HEADER & STREAM STATUS BAR */}
      <div className={`p-4 rounded-lg border flex flex-col md:flex-row items-start md:items-center justify-between gap-3 ${isDark ? "bg-[#111318] border-[#ffffff12]" : "bg-white border-[#e2e5ec]"}`}>
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-sky-400" />
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-[var(--text1)]">
              Dashboard Macroeconomica & Notizie Real-Time in Italiano
            </h2>
            <span className="px-2 py-0.5 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-xs text-[8px] font-black font-mono">
              INTELLIGENZA COGNITIVA IA
            </span>
          </div>
          <p className="text-[11px] text-[var(--text2)] font-sans">
            Monitoraggio flussi macro, verbali delle Banche Centrali (BCE, Fed) e calendario eventi integrati con l'analisi di impatto sui mercati.
          </p>
        </div>

        <div className="flex items-center gap-3 self-stretch md:self-auto justify-between border-t md:border-t-0 border-[var(--border)] pt-2 md:pt-0">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--green)] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--green)]"></span>
            </span>
            <div className="flex flex-col text-[9.5px] font-mono leading-tight">
              <span className="text-[var(--text1)] font-bold uppercase">SATELLITE ITALIA</span>
              <span className="text-[var(--text3)] text-[8px]">STREAM ATTIVO GMT+2</span>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 font-sans">
            <button 
              onClick={forceDataRefresh}
              disabled={isRefreshing}
              className="px-2.5 py-1.5 bg-[var(--bg2)] text-[var(--text2)] hover:text-white border border-[var(--border)] rounded text-[10.5px] font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[var(--green)] ${isRefreshing ? "animate-spin" : ""}`} />
              Sincronizza
            </button>
            <button 
              onClick={triggerGlobalMacroReport}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10.5px] font-black uppercase flex items-center gap-1 shadow-sm transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Genera Report AI
            </button>
          </div>
        </div>
      </div>

      {/* 2. THE MAIN THREE-COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* COLUMN 1: NEWS ECONOMIC FEEDS (5 COLS) */}
        <div className={`col-span-1 lg:col-span-5 p-4 rounded-lg border flex flex-col gap-3.5 ${isDark ? "bg-[#111318] border-[#ffffff12]" : "bg-white border-[#e2e5ec]"}`}>
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-2 flex-wrap gap-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-[var(--text1)] flex items-center gap-1.5">
              <Newspaper className="w-4 h-4 text-emerald-400" /> Notizie Economia e Mercati
            </h3>
            
            <span className="text-[9.5px] font-mono text-[var(--text3)] font-bold">
              Trovate: {searchedNews.length}
            </span>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cerca notizie..."
                className="w-full text-[10.5px] bg-[var(--bg3)] text-[var(--text1)] border border-[var(--border)] rounded px-2.5 py-1.5 focus:outline-none focus:border-[var(--green)] font-medium"
              />
            </div>
            
            <div className="flex items-center justify-between flex-wrap gap-1.5">
              <div className="flex gap-0.5 bg-[var(--bg2)] rounded border border-[var(--border)] p-0.5 text-[9px] font-bold">
                <button 
                  onClick={() => setNewsFilter("all")}
                  className={`px-2 py-1 rounded cursor-pointer ${newsFilter === "all" ? "bg-[var(--border)] text-[var(--text1)] font-extrabold" : "text-[var(--text3)]"}`}
                >
                  Tutte
                </button>
                <button 
                  onClick={() => setNewsFilter("MONETARY")}
                  className={`px-2 py-1 rounded cursor-pointer ${newsFilter === "MONETARY" ? "bg-[var(--border)] text-[var(--text1)] font-extrabold" : "text-[var(--text3)]"}`}
                  title="Politica Monetaria & Banche Centrali"
                >
                  Banche Cent.
                </button>
                <button 
                  onClick={() => setNewsFilter("MACRO")}
                  className={`px-2 py-1 rounded cursor-pointer ${newsFilter === "MACRO" ? "bg-[var(--border)] text-[var(--text1)] font-extrabold" : "text-[var(--text3)]"}`}
                  title="Dati Macroeconomici Nazionali"
                >
                  Macro
                </button>
                <button 
                  onClick={() => setNewsFilter("GEOPOLITICS")}
                  className={`px-2 py-1 rounded cursor-pointer ${newsFilter === "GEOPOLITICS" ? "bg-[var(--border)] text-[var(--text1)] font-extrabold" : "text-[var(--text3)]"}`}
                  title="Geopolitica & Commercio"
                >
                  Geop.
                </button>
              </div>

              <select
                value={impactFilter}
                onChange={(e) => setImpactFilter(e.target.value as any)}
                className="text-[9px] font-bold bg-[var(--bg2)] text-[var(--text3)] border border-[var(--border)] rounded px-2 py-1.5 focus:outline-none cursor-pointer"
              >
                <option value="all">Tutti gli impatti</option>
                <option value="ALTO">Impatti Alti 🔴</option>
                <option value="MEDIO">Impatti Medi 🟡</option>
              </select>
            </div>
          </div>

          {/* List layout */}
          <div className="flex flex-col gap-2.5 max-h-[520px] overflow-y-auto pr-1">
            {searchedNews.length === 0 ? (
              <div className="p-8 text-center text-[11px] text-[var(--text3)] bg-[var(--bg2)]/40 rounded border border-dashed border-[var(--border)]">
                Nessuna notizia corrisponde ai filtri impostati. Prova a inserire un termine differente.
              </div>
            ) : (
              searchedNews.map((item) => {
                const isSelected = selectedNews?.id === item.id;
                
                return (
                  <div 
                    key={item.id}
                    onClick={() => handleNewsClick(item)}
                    className={`p-3 rounded border text-left cursor-pointer transition-all duration-200 select-none group relative ${
                      isSelected 
                        ? "bg-indigo-500/10 border-indigo-500 text-[var(--text1)] shadow-inner" 
                        : isDark 
                          ? "bg-[#14181f]/45 border-[#ffffff06] hover:bg-[#14181f] hover:border-[#ffffff12]" 
                          : "bg-[#fcfdfd] border-[#eaedf3] hover:bg-neutral-50 hover:border-neutral-200"
                    }`}
                  >
                    {/* Top row */}
                    <div className="flex items-center justify-between mb-1 text-[9px] font-mono">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-extrabold uppercase bg-[var(--bg3)] text-[var(--text2)] px-1.5 py-0.5 rounded text-[8px]">
                          {item.source}
                        </span>
                        <span className="text-[var(--text3)]">{item.time}</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <span className={`px-1.5 py-0.25 rounded font-black text-[7.5px] uppercase border ${
                          item.sentiment === "RIALZISTA" ? "bg-[var(--green)]/10 text-[var(--green)] border-[var(--green)]/20" : 
                          item.sentiment === "RIBASSISTA" ? "bg-[var(--red)]/10 text-[var(--red)] border-[var(--red)]/20" : 
                          "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        }`}>
                          {item.sentiment}
                        </span>
                        <span className={`px-1 rounded-sm text-[8px] font-extrabold text-white ${
                          item.impact === "ALTO" ? "bg-red-500" : "bg-amber-500"
                        }`}>
                          {item.impact}
                        </span>
                      </div>
                    </div>

                    <h4 className={`text-[11.5px] font-bold leading-tight mb-1 group-hover:text-[var(--green)] transition ${
                      isSelected ? "text-indigo-400" : "text-[var(--text1)]"
                    }`}>
                      {item.title}
                    </h4>
                    
                    <p className="text-[10px] text-[var(--text2)] leading-relaxed line-clamp-2 mb-1.5 font-sans">
                      {item.summary}
                    </p>

                    <div className="flex items-center justify-between text-[8px] font-mono border-t border-[var(--border)]/30 pt-1.5 mt-1">
                      <span className="text-[var(--text3)]">Categoria: <strong className="text-[var(--text2)]">{item.category}</strong></span>
                      <span className="text-indigo-400 font-extrabold group-hover:translate-x-1 transition flex items-center gap-0.5">
                        Analisi IA <ArrowRight className="w-2.5 h-2.5" />
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* COLUMN 2: ECONOMIC CALENDAR (7 COLS TOT) */}
        <div className="col-span-1 lg:col-span-7 flex flex-col gap-4">
          
          {/* TOP CALENDAR TABLE */}
          <div className={`p-4 rounded-lg border flex flex-col gap-3.5 ${isDark ? "bg-[#111318] border-[#ffffff12]" : "bg-white border-[#e2e5ec]"}`}>
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2 flex-wrap gap-2">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-sky-400" />
                <h3 className="text-xs font-black uppercase tracking-wider text-[var(--text1)]">
                  📅 Calendario Economico Macroeconomico
                </h3>
              </div>

              {/* Country Select Filter */}
              <div className="flex bg-[var(--bg2)] rounded border border-[var(--border)] p-0.5 text-[8.5px] font-bold">
                <button
                  onClick={() => setCalCountryFilter("all")}
                  className={`px-2 py-0.5 rounded cursor-pointer ${calCountryFilter === "all" ? "bg-[var(--border)] text-[var(--text1)] font-extrabold" : "text-[var(--text3)]"}`}
                >
                  Tutti
                </button>
                <button
                  onClick={() => setCalCountryFilter("IT")}
                  className={`px-2 py-0.5 rounded cursor-pointer ${calCountryFilter === "IT" ? "bg-[var(--border)] text-[var(--text1)] font-extrabold" : "text-[var(--text3)]"}`}
                  title="Italia"
                >
                  🇮🇹 IT
                </button>
                <button
                  onClick={() => setCalCountryFilter("UE")}
                  className={`px-2 py-0.5 rounded cursor-pointer ${calCountryFilter === "UE" ? "bg-[var(--border)] text-[var(--text1)] font-extrabold" : "text-[var(--text3)]"}`}
                  title="Unione Europea"
                >
                  🇪🇺 UE
                </button>
                <button
                  onClick={() => setCalCountryFilter("US")}
                  className={`px-2 py-0.5 rounded cursor-pointer ${calCountryFilter === "US" ? "bg-[var(--border)] text-[var(--text1)] font-extrabold" : "text-[var(--text3)]"}`}
                  title="Stati Uniti"
                >
                  🇺🇸 US
                </button>
              </div>
            </div>

            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-[11px] font-sans border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[8.5px] font-mono text-[var(--text3)] uppercase tracking-wider">
                    <th className="py-2 px-1">Orario</th>
                    <th className="py-2 px-1 text-center">Zona</th>
                    <th className="py-2 px-2">Rapporto / Indicatore</th>
                    <th className="py-2 px-1 text-center">Rilev.</th>
                    <th className="py-2 px-1 text-right">Attuale</th>
                    <th className="py-2 px-1 text-right">Prev.</th>
                    <th className="py-2 px-1 text-right">Prec.</th>
                    <th className="py-2 px-1 text-center">Imp.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]/40 text-[var(--text2)]">
                  {filteredEvents.map((evt) => {
                    const isSelected = selectedEvent?.id === evt.id;
                    const countryFlag = evt.country === "IT" ? "🇮🇹" : evt.country === "UE" ? "🇪🇺" : evt.country === "US" ? "🇺🇸" : "🇬🇧";
                    
                    return (
                      <tr 
                        key={evt.id}
                        onClick={() => handleEventClick(evt)}
                        className={`hover:bg-[var(--bg3)]/75 cursor-pointer transition duration-150 ${
                          isSelected ? "bg-indigo-500/10 font-bold text-[var(--text1)]" : ""
                        }`}
                      >
                        <td className="py-2.5 px-1 font-mono text-[10px] text-[var(--text1)] font-medium">
                          {evt.time}
                        </td>
                        <td className="py-2.5 px-1 text-center text-xs">
                          <span title={evt.country}>{countryFlag}</span>
                        </td>
                        <td className="py-2.5 px-2 font-medium text-[var(--text1)] max-w-[190px] truncate">
                          {evt.indicator}
                          <span className="block text-[8px] text-[var(--text3)] font-mono font-normal">Periodo MoM/YoY: {evt.period}</span>
                        </td>
                        <td className="py-2.5 px-1 text-center">
                          <span className={`px-1 py-0.25 text-[8px] font-extrabold uppercase rounded-xs ${
                            evt.status === "RILASCIATO" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                          }`}>
                            {evt.status}
                          </span>
                        </td>
                        <td className={`py-2.5 px-1 text-right font-mono font-bold text-[11.5px] ${
                          evt.status === "RILASCIATO" && evt.actual !== "—" && evt.forecast !== "—"
                            ? parseFloat(evt.actual) >= parseFloat(evt.forecast) ? "text-[var(--green)]" : "text-[var(--red)]"
                            : ""
                        }`}>
                          {evt.actual}
                        </td>
                        <td className="py-2.5 px-1 text-right font-mono font-medium text-[var(--text3)]">
                          {evt.forecast}
                        </td>
                        <td className="py-2.5 px-1 text-right font-mono text-[var(--text3)]">
                          {evt.previous}
                        </td>
                        <td className="py-2.5 px-1 text-center">
                          <span className={`px-1 py-0.25 font-black text-[7.5px] rounded-sm text-white ${
                            evt.impact === "HIGH" ? "bg-rose-600" : evt.impact === "MEDIUM" ? "bg-amber-500" : "bg-slate-500"
                          }`}>
                            {evt.impact}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="text-[9.5px] text-[var(--text3)] flex items-start gap-1 pb-1 pt-1 border-t border-[var(--border)]/40 mt-1">
              <span className="text-sky-400">💡 Tip:</span>
              <span>
                Filtra gli eventi o clicca direttamente su una riga per richiamare lo spaccato di interpretazione sul terminale simulato AI a fianco.
              </span>
            </div>
          </div>

          {/* DUAL AI INSIGHTS ANALYSIS BOX */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            
            {/* LEFT HALF IS DYNAMIC REPORTING */}
            <div className={`md:col-span-12 p-4 rounded-lg border flex flex-col gap-3 ${isDark ? "bg-[#111318] border-[#ffffff12]" : "bg-white border-[#e2e5ec]"}`}>
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2 flex-wrap gap-2">
                <div className="flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-black uppercase tracking-wider text-[var(--text1)]">
                    🔮 Analisi Cognitiva Integrata IA
                  </span>
                </div>
                
                <span className="text-[9px] font-mono text-[var(--text3)] font-semibold uppercase">
                  {selectedNews ? "FOCUS NEWS SELEZIONATA" : selectedEvent ? "FOCUS EVENTO CALENDARIO" : "SINTESI GENERALE GLOBAL"}
                </span>
              </div>

              {isAiLoading ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                  <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] text-[var(--text1)] font-bold font-mono">ELABORAZIONE FLUSSI MACRO IN CORSO...</span>
                    <span className="text-[9px] text-[var(--text3)]">Calcolo delle correlazioni di mercato FTSE MIB, BTP e Gold</span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3.5">
                  
                  {/* Single selected focus presentation */}
                  {(selectedNews || selectedEvent) ? (
                    <div className={`p-3 rounded-lg border ${isDark ? "bg-[#161a22] border-[#ffffff06]" : "bg-[#f8fafc] border-neutral-100"}`}>
                      {selectedNews && (
                        <div className="flex flex-col gap-1.5 font-sans">
                          <div className="flex items-center justify-between text-[9px] font-mono text-indigo-400 font-extrabold uppercase mb-1">
                            <span>Sorgente: {selectedNews.source}</span>
                            <span>IMPATTO NEWS: {selectedNews.impact}</span>
                          </div>
                          <h4 className="text-[12.5px] font-extrabold text-[var(--text1)] leading-snug">{selectedNews.title}</h4>
                          <p className="text-[11px] text-[var(--text2)] leading-relaxed italic border-l-2 border-indigo-400/40 pl-2 mt-1">{selectedNews.summary}</p>
                          
                          <div className="border-t border-[var(--border)]/50 pt-2.5 mt-2 flex flex-col gap-2">
                            <div>
                              <span className="text-[8.5px] font-mono text-[var(--text3)] uppercase block font-black">Interpretazione Macro IA</span>
                              <p className="text-[11px] text-[var(--text1)] leading-relaxed">{selectedNews.aiSummary}</p>
                            </div>
                            <div>
                              <span className="text-[8.5px] font-mono text-emerald-400 uppercase block font-black">Implicazione Operativa sui Mercati (Borsa Italiana)</span>
                              <p className="text-[11.5px] text-emerald-300 font-medium leading-relaxed bg-emerald-950/15 p-2 rounded border border-emerald-950/40 mt-1">{selectedNews.tradingImplication}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {selectedEvent && (
                        <div className="flex flex-col gap-1.5 font-sans">
                          <div className="flex items-center justify-between text-[9px] font-mono text-indigo-400 font-extrabold uppercase mb-1">
                            <span>Zona Geografica: {selectedEvent.country}</span>
                            <span>IMPATTO EVENTO: {selectedEvent.impact}</span>
                          </div>
                          <h4 className="text-[12.5px] font-extrabold text-[var(--text1)] leading-snug">{selectedEvent.indicator}</h4>
                          <div className="grid grid-cols-4 gap-2 text-[10px] font-mono bg-[var(--bg3)] p-1.5 rounded text-center mt-1 text-[var(--text2)]">
                            <div>Periodo: <strong className="text-[var(--text1)]">{selectedEvent.period}</strong></div>
                            <div>Attuale: <strong className="text-emerald-400">{selectedEvent.actual}</strong></div>
                            <div>Previsione: <strong className="text-sky-400">{selectedEvent.forecast}</strong></div>
                            <div>Precedente: <strong className="text-[var(--text3)]">{selectedEvent.previous}</strong></div>
                          </div>
                          
                          <div className="border-t border-[var(--border)]/50 pt-2.5 mt-2 flex flex-col gap-1">
                            <span className="text-[8.5px] font-mono text-indigo-400 uppercase block font-black">Interpretazione Dati IA & Reattività Banche Centrali</span>
                            <p className="text-[11px] text-[var(--text1)] leading-relaxed">{selectedEvent.aiInterpretation}</p>
                          </div>
                        </div>
                      )}

                      <button
                        onClick={() => {
                          setSelectedNews(null);
                          setSelectedEvent(null);
                        }}
                        className="text-[9.5px] text-[var(--text3)] hover:text-white underline mt-3.5 block text-right font-mono"
                      >
                        ← Mostra Report Globale Macro Economico
                      </button>
                    </div>
                  ) : (
                    /* Global macro report */
                    <div className="flex flex-col gap-3">
                      <div className="p-3 bg-[var(--bg2)] rounded border border-[var(--border)] max-h-[350px] overflow-y-auto font-mono text-[10.5px] leading-relaxed text-[var(--text1)] whitespace-pre-wrap">
                        {aiReportText}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1 text-[10px] font-sans">
                        <div className={`p-2.5 rounded border ${isDark ? "bg-[#161a22]/65 border-[#ffffff06]" : "bg-[#f8fafc] border-neutral-100"}`}>
                          <div className="flex items-center gap-1 text-[var(--text1)] font-bold mb-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[var(--green)]" />
                            <span>Opportunità Operative Rilevate</span>
                          </div>
                          <ul className="list-disc pl-4 text-[var(--text2)] space-y-1">
                            <li>Accumulo banche commerciali FTSE MIB per allargamento margine d'interesse stabile.</li>
                            <li>BTP decennale in prossimità di quota 3.75%: ottimo rendimento in entrata.</li>
                          </ul>
                        </div>

                        <div className={`p-2.5 rounded border ${isDark ? "bg-[#161a22]/65 border-[#ffffff06]" : "bg-[#f8fafc] border-neutral-100"}`}>
                          <div className="flex items-center gap-1 text-[var(--text1)] font-bold mb-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                            <span>Vulnerabilità Attenzionate</span>
                          </div>
                          <ul className="list-disc pl-4 text-[var(--text2)] space-y-1">
                            <li>Rischio geopolitico in Suez incrementa i tempi di logistica (costi porti +15%).</li>
                            <li>Tasso mutuo USA oltre 6.8% limita acquisto immobiliare residenziale.</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              )}

            </div>
          </div>

        </div>

      </div>

      {/* OVERLAY MODAL FOR MACRO NEWS DETAIL */}
      {activeModalNews && (
        <div 
          className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-[2000] p-4 animate-fade-in"
          onClick={() => setActiveModalNews(null)}
        >
          <div 
            className={`w-full max-w-xl p-5 rounded-xl border shadow-2xl relative flex flex-col gap-4 max-h-[85vh] overflow-y-auto animate-zoom-in ${
              isDark ? "bg-[#111318] border-[#ffffff15] text-[#b4ccd6]" : "bg-white border-[#e2e5ec] text-slate-700"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-[var(--bg3)] text-[var(--text2)] text-[9px] font-mono font-extrabold uppercase rounded border border-[var(--border)]">
                  {activeModalNews.source}
                </span>
                <span className="text-[10px] font-mono text-[var(--text3)]">
                  {activeModalNews.time}
                </span>
              </div>
              <button 
                onClick={() => setActiveModalNews(null)}
                className="text-[var(--text3)] hover:text-[var(--text1)] p-1 rounded-lg hover:bg-[var(--bg3)] transition cursor-pointer"
                title="Chiudi"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Headline / Title */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold tracking-wider ${
                  activeModalNews.sentiment === "RIALZISTA" ? "bg-[var(--green)]/15 text-[var(--green)]" : 
                  activeModalNews.sentiment === "RIBASSISTA" ? "bg-[var(--red)]/15 text-[var(--red)]" : "bg-orange-500/15 text-orange-500"
                }`}>
                  {activeModalNews.sentiment}
                </span>
                <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold tracking-wider text-white ${
                  activeModalNews.impact === "ALTO" ? "bg-red-500" : activeModalNews.impact === "MEDIO" ? "bg-amber-500" : "bg-slate-500"
                }`}>
                  IMPATTO: {activeModalNews.impact}
                </span>
                <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-indigo-500/10 text-indigo-400">
                  {activeModalNews.category}
                </span>
              </div>
              <h3 className="text-sm font-extrabold tracking-tight text-[var(--text1)] leading-snug">
                {activeModalNews.title}
              </h3>
            </div>

            {/* Main content body */}
            <div className={`p-3.5 rounded-lg border leading-relaxed text-xs space-y-3 ${
              isDark ? "bg-[#161a22] border-[#ffffff06]" : "bg-neutral-50 border-neutral-100"
            }`}>
              <h4 className="text-[10px] font-mono uppercase tracking-widest text-[var(--text2)] font-bold">ARTICOLO COMPLETO</h4>
              <p className="font-sans text-[var(--text1)] whitespace-pre-line leading-relaxed text-slate-300 text-xs">
                {activeModalNews.fullArticle || activeModalNews.summary}
              </p>
            </div>

            {/* AI Summary & Trading implications */}
            <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-3">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-mono text-[var(--text3)] uppercase">SINTESI DELL'INTELLIGENCE AI:</span>
                <p className="text-[11px] font-sans text-[var(--text2)] leading-relaxed">
                  {activeModalNews.aiSummary}
                </p>
              </div>

              <div className={`p-3 rounded border flex flex-col gap-1 ${
                isDark ? "bg-[#1a202c] border-[#38bdf815]" : "bg-sky-50/50 border-sky-100"
              }`}>
                <span className="text-[9px] font-mono text-sky-400 font-extrabold uppercase tracking-wide flex items-center gap-1.5">
                  ⚡ IMPLICAZIONI OPERATIVE SU MERCATI:
                </span>
                <p className="text-[11px] text-[var(--text2)] font-mono leading-relaxed">
                  {activeModalNews.tradingImplication}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button 
                onClick={() => setActiveModalNews(null)}
                className="bg-[var(--green)] hover:bg-[var(--green)]/90 text-black font-extrabold text-[10px] px-5 py-2 rounded transition-all cursor-pointer shadow-md hover:scale-101"
              >
                Chiudi Notizia
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OVERLAY MODAL FOR CALENDAR EVENT DETAIL */}
      {activeModalEvent && (
        <div 
          className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-[2000] p-4 animate-fade-in"
          onClick={() => setActiveModalEvent(null)}
        >
          <div 
            className={`w-full max-w-xl p-5 rounded-xl border shadow-2xl relative flex flex-col gap-4 max-h-[85vh] overflow-y-auto animate-zoom-in ${
              isDark ? "bg-[#111318] border-[#ffffff15] text-[#b4ccd6]" : "bg-white border-[#e2e5ec] text-slate-700"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs">
                  {activeModalEvent.country === "IT" ? "🇮🇹 ITALIA" : activeModalEvent.country === "UE" ? "🇪🇺 EUROZONA" : activeModalEvent.country === "US" ? "🇺🇸 STATI UNITI" : "🇬🇧 REGNO UNITO"}
                </span>
                <span className="text-[10px] font-mono text-[var(--text3)]">
                  Rilascio: {activeModalEvent.time}
                </span>
              </div>
              <button 
                onClick={() => setActiveModalEvent(null)}
                className="text-[var(--text3)] hover:text-[var(--text1)] p-1 rounded-lg hover:bg-[var(--bg3)] transition cursor-pointer"
                title="Chiudi"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Indicator Details Header */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold tracking-wider ${
                  activeModalEvent.status === "RILASCIATO" ? "bg-[var(--green)]/15 text-[var(--green)]" : "bg-amber-500/15 text-amber-500"
                }`}>
                  {activeModalEvent.status}
                </span>
                <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold tracking-wider text-white ${
                  activeModalEvent.impact === "HIGH" ? "bg-red-500" : activeModalEvent.impact === "MEDIUM" ? "bg-amber-500" : "bg-slate-500"
                }`}>
                  IMPATTO: {activeModalEvent.impact}
                </span>
                <span className="px-1.5 py-0.5 rounded text-[8px] font-mono bg-neutral-500/10 text-[var(--text3)]">
                  Stagionalità: {activeModalEvent.period}
                </span>
              </div>
              <h3 className="text-sm font-extrabold tracking-tight text-[var(--text1)] leading-snug">
                {activeModalEvent.indicator}
              </h3>
            </div>

            {/* Metrics block */}
            <div className="grid grid-cols-3 gap-2.5 bg-[var(--bg3)] p-3 rounded-lg border border-[var(--border)] text-center font-mono">
              <div className="flex flex-col gap-0.5">
                <span className="text-[8.5px] text-[var(--text3)] uppercase">Attuale</span>
                <strong className="text-[11px] text-[var(--text1)]">{activeModalEvent.actual}</strong>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[8.5px] text-[var(--text3)] uppercase">Previsto</span>
                <strong className="text-[11px] text-[var(--text1)]">{activeModalEvent.forecast}</strong>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[8.5px] text-[var(--text3)] uppercase">Precedente</span>
                <strong className="text-[11px] text-[var(--text1)]">{activeModalEvent.previous}</strong>
              </div>
            </div>

            {/* Detailed description paragraph */}
            <div className={`p-3.5 rounded-lg border leading-relaxed text-xs space-y-2.5 ${
              isDark ? "bg-[#161a22] border-[#ffffff06]" : "bg-neutral-50 border-neutral-100"
            }`}>
              <h4 className="text-[10px] font-mono uppercase tracking-widest text-[var(--text2)] font-bold">ANALISI DELL'INDICATORE</h4>
              <p className="font-sans text-[var(--text1)] leading-relaxed text-slate-300 text-xs">
                {activeModalEvent.fullDetails || `Questo comunicato descrive lo stato dell'attività congiunturale sull'arco temporale ${activeModalEvent.period}. I mercati di borsa tendono ad anticipare o incorporare le variazioni con una spinta di volatilità se lo scostamento tra dato effettivo e forecast supera la deviazione standard.`}
              </p>
            </div>

            {/* AI Interpretation */}
            <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-3">
              <div className={`p-3 rounded border flex flex-col gap-1.5 ${
                isDark ? "bg-[#1a202c] border-[#38bdf815]" : "bg-sky-50/50 border-sky-100"
              }`}>
                <span className="text-[9px] font-mono text-sky-400 font-extrabold uppercase tracking-wide flex items-center gap-1.5">
                  🔮 INTERPRETAZIONE PREVISIONALE AI:
                </span>
                <p className="text-[11px] text-[var(--text2)] font-mono leading-relaxed">
                  {activeModalEvent.aiInterpretation}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button 
                onClick={() => setActiveModalEvent(null)}
                className="bg-[var(--green)] hover:bg-[var(--green)]/90 text-black font-extrabold text-[10px] px-5 py-2 rounded transition-all cursor-pointer shadow-md hover:scale-101"
              >
                Chiudi Evento
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
