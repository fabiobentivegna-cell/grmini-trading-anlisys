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

  // Real-time datasets fetched from backend
  const [newsItems, setNewsItems] = useState<MacroNewsItem[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);

  const fetchNewsData = async (force: boolean = false) => {
    setIsRefreshing(true);
    if (force) {
      setIsAiLoading(true);
    }
    try {
      const res = await fetch(`/api/news${force ? "?refresh=true" : ""}`);
      const data = await res.json();
      if (data.newsItems) setNewsItems(data.newsItems);
      if (data.calendarEvents) setCalendarEvents(data.calendarEvents);
      if (data.aiReportText) setAiReportText(data.aiReportText);
      
      // Auto-select first news as default in AI panel if none is active
      if (data.newsItems && data.newsItems.length > 0 && !selectedNews && !selectedEvent) {
        setSelectedNews(data.newsItems[0]);
      }
    } catch (e) {
      console.error("Error fetching live news:", e);
    } finally {
      setIsRefreshing(false);
      setIsAiLoading(false);
    }
  };

  useEffect(() => {
    fetchNewsData();
    const interval = setInterval(() => fetchNewsData(false), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (newsItems.length > 0 && !selectedNews && !selectedEvent) {
      setSelectedNews(newsItems[0]);
    }
  }, [newsItems]);

  const triggerGlobalMacroReport = () => {
    fetchNewsData(true);
  };

  const handleNewsClick = (item: MacroNewsItem) => {
    setSelectedEvent(null);
    setSelectedNews(item);
    setActiveModalNews(item);
  };

  const handleEventClick = (item: CalendarEvent) => {
    setSelectedNews(null);
    setSelectedEvent(item);
    setActiveModalEvent(item);
  };

  const forceDataRefresh = () => {
    fetchNewsData(true);
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
