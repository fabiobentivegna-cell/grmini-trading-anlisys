import React, { useState, useEffect } from "react";
import { 
  TrendingUp, BarChart2, BookOpen, Shield, Bell, 
  Search, ListFilter, Plus, Download, LogIn, ChevronRight, 
  Grid, Cpu, CheckSquare, Settings, Sliders, Moon, Sun, 
  Trash2, Edit, Save, X, RefreshCw, Star, Info, LayoutTemplate,
  Globe, ExternalLink
} from "lucide-react";
import { Instrument, Trade, RealtimeMessage } from "./types";
import TradingChart from "./components/TradingChart";
import SeasonalityChart from "./components/SeasonalityChart";
import NotificationsPane from "./components/NotificationsPane";
import JournalEquityChart from "./components/JournalEquityChart";
import FundamentalIntelligence from "./components/FundamentalIntelligence";
import MacroNewsCalendar from "./components/MacroNewsCalendar";
import SectorIndexComparison from "./components/SectorIndexComparison";
import MarketCorrelations from "./components/MarketCorrelations";
import { getTradingViewUrl } from "./utils/tradingViewHelper";
import { initialInstruments, makeInstrument } from "./data/instruments";

export default function App() {
  const [instruments, setInstruments] = useState<Instrument[]>(initialInstruments);
  const [watchlist, setWatchlist] = useState<Instrument[]>(initialInstruments);
  const [activeIdx, setActiveIdx] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<"tecnica" | "fondamentale" | "screener" | "journal" | "macro">("macro");
  const [isDark, setIsDark] = useState<boolean>(false);
  const [showNotifications, setShowNotifications] = useState<boolean>(true);
  const [notifications, setNotifications] = useState<RealtimeMessage[]>([]);
  
  // Chart Grid configuration
  const [gridCount, setGridCount] = useState<number>(1);
  const [gridConfig, setGridConfig] = useState<{ [key: string]: { symIdx: number; tf: string; indicators: any } }>({
    "chart_0": { symIdx: 0, tf: "1H", indicators: { ema: { on: true, period: 20 }, ema2: { on: true, period: 50 }, sma200: { on: true, period: 200 }, vol: { on: true } } },
    "chart_1": { symIdx: 1, tf: "4H", indicators: { ema: { on: true, period: 20 }, vol: { on: true } } },
    "chart_2": { symIdx: 2, tf: "1D", indicators: { ema: { on: true, period: 20 }, sma200: { on: true, period: 200 } } },
    "chart_3": { symIdx: 3, tf: "15m", indicators: { ema: { on: true, period: 20 }, bb: { on: true } } },
    "chart_4": { symIdx: 4, tf: "1H", indicators: { ema: { on: true, period: 20 }, vol: { on: true } } },
    "chart_5": { symIdx: 5, tf: "4H", indicators: { ema: { on: true, period: 20 }, vol: { on: true } } },
  });

  // Watchlist custom add modal
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [formSym, setFormSym] = useState<string>("");
  const [formName, setFormName] = useState<string>("");
  const [formMarket, setFormMarket] = useState<"italia" | "usa" | "indici" | "forex" | "commodities" | "crypto">("italia");

  // Screener state variables
  const [scrMarket, setScrMarket] = useState<"tutti" | "italia" | "usa" | "indici">("tutti");
  const [scrPECeiling, setScrPECeiling] = useState<number>(80);
  const [scrMinDivCell, setScrMinDivCell] = useState<number>(0);
  const [scrMinRoe, setScrMinRoe] = useState<number>(0);
  const [screenerPreset, setScreenerPreset] = useState<string>("");
  const [scrSearchQuery, setScrSearchQuery] = useState<string>("");
  const [scrTechFilter, setScrTechFilter] = useState<string>("tutti");
  const [scrSortBy, setScrSortBy] = useState<string>("valScore");
  const [scrSortDir, setScrSortDir] = useState<"asc" | "desc">("desc");

  // Fundamental Guru analysis state variables
  const [fundamentalModelType, setFundamentalModelType] = useState<"buffett" | "dalio" | "investingpro">("buffett");
  const [fundamentalAiAnalysis, setFundamentalAiAnalysis] = useState<string>("");
  const [loadingFundamentalAi, setLoadingFundamentalAi] = useState<boolean>(false);

  // Seasonality customizable state (ref period, horizon and comparative forecaster mode)
  const [seasonRefPeriod, setSeasonRefPeriod] = useState<"1y" | "5y" | "10y">("5y");
  const [forecastHorizon, setForecastHorizon] = useState<3 | 6 | 12>(3);
  const [comparativeMode, setComparativeMode] = useState<boolean>(true);

  // Journal state
  const [trades, setTrades] = useState<Trade[]>(() => {
    const saved = localStorage.getItem("tradedesk_custom_trades");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return []; }
    }
    return [];
  });
  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(null);
  const [isEditingTrade, setIsEditingTrade] = useState<boolean>(false);
  const [formTrade, setFormTrade] = useState<Partial<Trade>>({
    sym: "", dir: "LONG", status: "OPEN", edate: new Date().toISOString().split("T")[0], xp: undefined, qty: 10, comm: 2
  });

  // Load and refresh market data and notifications on polling loops
  useEffect(() => {
    let currentInstruments = instruments;

    const loadMarketDataAndNotifications = async () => {
      try {
        setInstruments((prevInstruments: any) => {
          currentInstruments = prevInstruments;
          return prevInstruments;
        });

        const res = await fetch("/api/market-data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ instruments: currentInstruments })
        });
        const data = await res.json();
        if (data.instruments) {
          setInstruments(data.instruments);
          setWatchlist(data.instruments);
        }

        const noticesRes = await fetch("/api/notifications");
        const noticesData = await noticesRes.json();
        if (noticesData.notifications) {
          setNotifications(noticesData.notifications);
        }
      } catch (e) {
        console.error("Polling error fetching market data.", e);
      }
    };

    loadMarketDataAndNotifications();
    const intervalId = setInterval(loadMarketDataAndNotifications, 4000);
    return () => clearInterval(intervalId);
  }, []);

  // Save trades in localstorage
  useEffect(() => {
    localStorage.setItem("tradedesk_custom_trades", JSON.stringify(trades));
  }, [trades]);

  const activeInstrument = watchlist[activeIdx] || instruments[0] || null;

  // Sync index theme option
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  }, [isDark]);

  // Handle adding custom stocks to watchlist
  const handleAddWatchlistInstrument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSym) return;

    const targetMarket = formMarket.toLowerCase();
    const basePrice = targetMarket === 'crypto' ? 2500 : targetMarket === 'forex' ? 1.05 : targetMarket === 'commodities' ? 100 : targetMarket === 'indici' ? 10000 : 75;
    const isDup = instruments.find((i: any) => i.sym.toUpperCase() === formSym.toUpperCase());
    
    if (isDup) {
      alert("Strumento già presente.");
      return;
    }

    // Assuming makeInstrument is a local utility helper available in the scope
    const newInstrument = {
      id: Date.now(),
      sym: formSym.toUpperCase(),
      name: formName || formSym.toUpperCase(),
      market: targetMarket,
      price: basePrice,
      pe: 0, ps: 0, pb: 0, roe: 0, div: 0, valScore: 0, chgPct: 0
    } as unknown as Instrument;

    setInstruments(prev => {
      const next = [...prev, newInstrument];
      setWatchlist(next);
      setActiveIdx(next.length - 1);
      return next;
    });

    setShowAddModal(false);
    setFormSym("");
    setFormName("");
    setFormMarket("italia");
  };

  // Run AI Fundamental analysis
  const requestFundamentalAiAnalysis = async (type: "buffett" | "dalio" | "investingpro") => {
    if (!activeInstrument) return;
    setFundamentalModelType(type);
    setLoadingFundamentalAi(true);
    setFundamentalAiAnalysis("");

    try {
      const res = await fetch("/api/ai-fundamental", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sym: activeInstrument.sym,
          name: activeInstrument.name,
          price: activeInstrument.price,
          pe: activeInstrument.pe,
          ps: activeInstrument.ps,
          pb: activeInstrument.pb,
          roe: activeInstrument.roe,
          div: activeInstrument.div,
          valScore: activeInstrument.valScore,
          modelType: type
        })
      });
      const data = await res.json();
      setFundamentalAiAnalysis(data.analysis || "Nessuna tesi ricevuta.");
    } catch (e) {
      setFundamentalAiAnalysis("Errore generato durante l'elaborazione del modello AI di investimento.");
    } finally {
      setLoadingFundamentalAi(false);
    }
  };

  // Handle trade journal submissions
  const handleSaveTrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTrade.sym) {
      alert("Inserire il simbolo del titolo.");
      return;
    }

    const qty = Number(formTrade.qty) || 1;
    const ep = Number(formTrade.ep) || 0;
    const comm = Number(formTrade.comm) || 0;
    let pnl = undefined;

    if (formTrade.status === "CLOSED" && formTrade.xp) {
      const xp = Number(formTrade.xp);
      pnl = (formTrade.dir === "LONG" ? xp - ep : ep - xp) * qty - comm;
    }

    const targetTrade: Trade = {
      id: formTrade.id || `trade_${Date.now()}`,
      sym: formTrade.sym.toUpperCase(),
      dir: formTrade.dir as "LONG" | "SHORT",
      status: formTrade.status as "OPEN" | "CLOSED",
      edate: formTrade.edate || new Date().toISOString().split("T")[0],
      xdate: formTrade.xdate,
      ep,
      xp: formTrade.xp ? Number(formTrade.xp) : undefined,
      qty,
      comm,
      pnl,
      sl: formTrade.sl ? Number(formTrade.sl) : undefined,
      tp: formTrade.tp ? Number(formTrade.tp) : undefined,
      setup: formTrade.setup || "",
      tf: formTrade.tf || "",
      emo: formTrade.emo || "😌 Calmo",
      rating: Number(formTrade.rating) || 5,
      tags: formTrade.tags || [],
      ne: formTrade.ne || "",
      nx: formTrade.nx || ""
    };

    if (formTrade.id) {
      // Edit
      setTrades(trades.map(t => (t.id === formTrade.id ? targetTrade : t)));
    } else {
      // Create
      setTrades([...trades, targetTrade]);
    }

    setSelectedTradeId(targetTrade.id);
    setIsEditingTrade(false);
    setFormTrade({ sym: "", dir: "LONG", status: "OPEN", edate: new Date().toISOString().split("T")[0], xp: undefined, qty: 10, comm: 2 });
  };

  const handleEditTradeClick = (trade: Trade) => {
    setFormTrade(trade);
    setIsEditingTrade(true);
  };

  const handleDeleteTradeClick = (id: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo trade dal registro?")) return;
    setTrades(trades.filter(t => t.id !== id));
    if (selectedTradeId === id) setSelectedTradeId(null);
  };

  const handleExportJournalCSV = () => {
    if (!trades.length) {
      alert("Registro trade vuoto.");
      return;
    }
    const headers = "ID,Simbolo,Direzione,Stato,Entrata,Uscita,PrezzoEntrata,PrezzoUscita,Quantità,Commissioni,PnL,StopLoss,TakeProfit,Setup,Timeframe,Emozione,Rating,Note";
    const rows = trades.map(t => [
      t.id, t.sym, t.dir, t.status, t.edate, t.xdate || "", t.ep, t.xp || "", t.qty, t.comm, t.pnl || "", t.sl || "", t.tp || "", t.setup || "", t.tf || "", t.emo || "", t.rating || "", `"${(t.ne || "").replace(/"/g, "'")}"`
    ].join(","));

    const blob = new Blob([[headers, ...rows].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `trade_journal_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClearNotifications = () => {
    setNotifications([]);
  };

  // Screener computations and preset applicators
  const handleApplyPreset = (preset: "buffett" | "dalio" | "pro" | "value" | "growth") => {
    setScreenerPreset(preset);
    setScrSearchQuery("");
    setScrTechFilter("tutti");
    if (preset === "buffett") {
      setScrPECeiling(20);
      setScrMinDivCell(1);
      setScrMinRoe(15);
      setScrMarket("tutti");
    } else if (preset === "dalio") {
      setScrPECeiling(50);
      setScrMinDivCell(1.5);
      setScrMinRoe(8);
      // Ray Dalio seeks diversification, we can capture indices & safe stocks
      setScrMarket("tutti");
    } else if (preset === "pro") {
      setScrPECeiling(30);
      setScrMinDivCell(0);
      setScrMinRoe(15);
      setScrMarket("usa");
    } else if (preset === "value") {
      setScrPECeiling(12);
      setScrMinDivCell(2.5);
      setScrMinRoe(10);
      setScrMarket("tutti");
    } else if (preset === "growth") {
      setScrPECeiling(60);
      setScrMinDivCell(0);
      setScrMinRoe(20);
      setScrMarket("usa");
    }
  };

  // Helper function to generate technical rating & RSI values deterministically
  const getTechnicalRating = (inst: Instrument) => {
    const symCode = inst.sym.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    // stable mock RSI between 30 and 72
    const rsi = Math.round(30 + (symCode % 42)); 
    const chg = inst.chgPct || 0;
    
    let rating: "STRONG BUY" | "BUY" | "NEUTRAL" | "SELL" | "STRONG SELL" = "NEUTRAL";
    let score = 50;

    if (rsi > 62 && chg > 1) {
      rating = "STRONG BUY";
      score = Math.round(82 + (symCode % 14));
    } else if (rsi > 48 && chg >= 0) {
      rating = "BUY";
      score = Math.round(62 + (symCode % 18));
    } else if (rsi < 36 && chg < -1) {
      rating = "STRONG SELL";
      score = Math.round(10 + (symCode % 12));
    } else if (rsi < 44 || chg < 0) {
      rating = "SELL";
      score = Math.round(25 + (symCode % 18));
    } else {
      rating = "NEUTRAL";
      score = Math.round(45 + (symCode % 12));
    }
    
    return { rating, rsi, score };
  };

  const processedScreenerInstruments = instruments
    .map(inst => {
      const tech = getTechnicalRating(inst);
      return {
        ...inst,
        techRating: tech.rating,
        rsi: tech.rsi,
        techScore: tech.score
      };
    })
    .filter(inst => {
      // Market Check
      if (scrMarket === "italia" && inst.market !== "italia") return false;
      if (scrMarket === "usa" && inst.market !== "usa") return false;

      // Text search query
      if (scrSearchQuery) {
        const query = scrSearchQuery.toLowerCase();
        const matchesSym = inst.sym.toLowerCase().includes(query);
        const matchesName = inst.name.toLowerCase().includes(query);
        if (!matchesSym && !matchesName) return false;
      }

      // Technical filter
      if (scrTechFilter !== "tutti" && inst.techRating !== scrTechFilter) return false;

      // Convert potential values and do inequalities
      const peVal = typeof inst.pe === "number" ? inst.pe : Number(inst.pe) || 999;
      if (peVal > scrPECeiling) return false;

      const divVal = typeof inst.div === "number" ? inst.div : parseFloat(String(inst.div)) || 0;
      if (divVal < scrMinDivCell) return false;

      const roeVal = typeof inst.roe === "number" ? inst.roe : parseFloat(String(inst.roe)) || 0;
      if (roeVal < scrMinRoe) return false;

      return true;
    });

  // Apply dynamic sorting
  const filteredScreenerInstruments = [...processedScreenerInstruments].sort((a, b) => {
    let valA: any = a[scrSortBy as keyof typeof a];
    let valB: any = b[scrSortBy as keyof typeof b];

    if (scrSortBy === "pe") {
      valA = typeof a.pe === "number" ? a.pe : Number(a.pe) || 999;
      valB = typeof b.pe === "number" ? b.pe : Number(b.pe) || 999;
    } else if (scrSortBy === "roe") {
      valA = typeof a.roe === "number" ? a.roe : parseFloat(String(a.roe)) || 0;
      valB = typeof b.roe === "number" ? b.roe : parseFloat(String(b.roe)) || 0;
    } else if (scrSortBy === "div") {
      valA = typeof a.div === "number" ? a.div : parseFloat(String(a.div)) || 0;
      valB = typeof b.div === "number" ? b.div : parseFloat(String(b.div)) || 0;
    } else if (scrSortBy === "techRating") {
      const ratingWeights = { "STRONG BUY": 5, "BUY": 4, "NEUTRAL": 3, "SELL": 2, "STRONG SELL": 1 };
      valA = ratingWeights[a.techRating] || 0;
      valB = ratingWeights[b.techRating] || 0;
    }

    if (valA === undefined || valA === null) return 1;
    if (valB === undefined || valB === null) return -1;

    if (typeof valA === "string" && typeof valB === "string") {
      return scrSortDir === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }

    return scrSortDir === "asc" ? (valA - valB) : (valB - valA);
  });

  // Graham values
  const gVal = activeInstrument && activeInstrument.eps && activeInstrument.bvps ? 
    Math.sqrt(22.5 * activeInstrument.eps * activeInstrument.bvps) : null;
  const sectorFairVal = activeInstrument && activeInstrument.eps ? activeInstrument.eps * 22 : null;
  const dcfFairVal = activeInstrument && activeInstrument.fcfps ? activeInstrument.fcfps * 25 : null;

  let computedAverageFair = null;
  if (activeInstrument) {
    const list = [gVal, sectorFairVal, dcfFairVal, activeInstrument.fair].filter(v => typeof v === "number" && v > 0);
    if (list.length > 0) computedAverageFair = list.reduce((a, b) => a + b, 0) / list.length;
  }

  // Seasonality custom calculations based on reference period
  const activeSeas = React.useMemo(() => {
    if (!activeInstrument) return Array(12).fill(0);
    const originalSeas = activeInstrument.seas;
    if (seasonRefPeriod === "1y") {
      // 1 Year has higher volatility, reflect more recent momentum
      const charCode = activeInstrument.name.charCodeAt(0) || 1;
      return originalSeas.map((val, idx) => {
        const variation = Math.sin(idx + charCode) * 1.5;
        return Number((val * 1.6 + variation).toFixed(2));
      });
    } else if (seasonRefPeriod === "10y") {
      // 10 Years is highly smoothed long-term tendency
      const charCode = activeInstrument.name.charCodeAt(0) || 1;
      return originalSeas.map((val, idx) => {
        const variation = Math.cos(idx + charCode) * 0.4;
        return Number((val * 0.7 + variation).toFixed(2));
      });
    } else {
      // 5 Years is default
      return originalSeas;
    }
  }, [activeInstrument, seasonRefPeriod]);

  const activeWinRates = React.useMemo(() => {
    if (!activeInstrument) return Array(12).fill(50);
    const originalRecent = activeInstrument.recentMonths;
    if (seasonRefPeriod === "1y") {
      const charCode = activeInstrument.name.charCodeAt(1) || 1;
      return originalRecent.map((v, idx) => {
        const varWr = Math.round(Math.sin(idx * 2 + charCode) * 12);
        return Math.min(95, Math.max(10, Math.round(50 + v * 3.8) + varWr));
      });
    } else if (seasonRefPeriod === "10y") {
      const charCode = activeInstrument.name.charCodeAt(2) || 1;
      return originalRecent.map((v, idx) => {
        const varWr = Math.round(Math.cos(idx + charCode) * 5);
        return Math.min(85, Math.max(25, Math.round(52 + v * 2.2) + varWr));
      });
    } else {
      return originalRecent.map(v => Math.round(50 + v * 3));
    }
  }, [activeInstrument, seasonRefPeriod]);

  // Forecast Horizon Scenario Probabilities
  const { bullProb, bearProb, neutProb } = React.useMemo(() => {
    if (!activeInstrument) return { bullProb: 50, bearProb: 30, neutProb: 20 };
    const currentMonthIdx = new Date().getMonth();
    let accumReturn = 0;
    for (let i = 0; i < forecastHorizon; i++) {
      const mIdx = (currentMonthIdx + i) % 12;
      accumReturn += activeSeas[mIdx];
    }
    const multiplier = forecastHorizon === 3 ? 4 : forecastHorizon === 6 ? 2.5 : 1.5;
    let bull = Math.min(88, Math.max(12, Math.round(48 + accumReturn * multiplier)));
    let bear = Math.min(88, Math.max(12, Math.round(45 - accumReturn * multiplier)));
    if (bull + bear > 95) {
      const total = bull + bear;
      bull = Math.round((bull / total) * 90);
      bear = Math.round((bear / total) * 90);
    }
    const neut = 100 - bull - bear;
    return { bullProb: bull, bearProb: bear, neutProb: neut };
  }, [activeInstrument, activeSeas, forecastHorizon]);

  // Toggle indicators in chart panels
  const toggleIndicatorInGrid = (chartKey: string, indicatorKey: string) => {
    const current = { ...gridConfig };
    if (current[chartKey]) {
      const active = current[chartKey].indicators[indicatorKey]?.on;
      current[chartKey].indicators[indicatorKey] = {
        on: !active,
        period: current[chartKey].indicators[indicatorKey]?.period || 20
      };
      setGridConfig(current);
    }
  };

  const setGridTimeframe = (chartKey: string, tf: string) => {
    const current = { ...gridConfig };
    if (current[chartKey]) {
      current[chartKey].tf = tf;
      setGridConfig(current);
    }
  };

  const setGridSymIdx = (chartKey: string, idx: number) => {
    const current = { ...gridConfig };
    if (current[chartKey]) {
      current[chartKey].symIdx = idx;
      setGridConfig(current);
    }
  };

  // Journal metrics
  const closedTrades = trades.filter(t => t.status === "CLOSED");
  const winTrades = closedTrades.filter(t => (t.pnl || 0) > 0);
  const lossTrades = closedTrades.filter(t => (t.pnl || 0) < 0);
  const winRate = closedTrades.length > 0 ? Math.round((winTrades.length / closedTrades.length) * 100) : 0;
  const totPnl = closedTrades.reduce((acc, curr) => acc + (curr.pnl || 0), 0);
  const avgWin = winTrades.length ? winTrades.reduce((s, t) => s + (t.pnl || 0), 0) / winTrades.length : 0;
  const avgLoss = lossTrades.length ? lossTrades.reduce((s, t) => s + (t.pnl || 0), 0) / lossTrades.length : 0;
  const profFactor = avgLoss ? Math.abs(avgWin / avgLoss) : 0;

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${isDark ? "bg-[#0a0c0f] text-[#e8eaf0]" : "bg-[#f2f4f7] text-[#1a1d2e]"}`}>
      
      {/* 1. HEADER BAR */}
      <header className={`h-12 border-b flex items-center justify-between px-4 z-50 sticky top-0 shadow-sm transition-colors ${isDark ? "bg-[#111318] border-[#ffffff12]" : "bg-white border-[#e2e5ec]"}`}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[var(--green)] animate-pulse" />
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--text2)]">
            Terminal Monitor
          </span>
        </div>

        <nav className="flex items-center gap-1">
          <button 
            onClick={() => setActiveTab("macro")} 
            className={`px-3 py-1.5 rounded text-xs font-bold transition flex items-center gap-1 ${activeTab === "macro" ? "bg-[var(--green)]/15 text-[var(--green)]" : "text-[var(--text2)] hover:bg-[var(--bg3)]"}`}
          >
            <Globe className="w-3.5 h-3.5" />
            Notizie & Macro
          </button>

          <button 
            onClick={() => setActiveTab("tecnica")} 
            className={`px-3 py-1.5 rounded text-xs font-bold transition flex items-center gap-1 ${activeTab === "tecnica" ? "bg-[var(--green)]/15 text-[var(--green)]" : "text-[var(--text2)] hover:bg-[var(--bg3)]"}`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Analisi</span> Tecnica
          </button>
          
          <button 
            onClick={() => setActiveTab("fondamentale")} 
            className={`px-3 py-1.5 rounded text-xs font-bold transition flex items-center gap-1 ${activeTab === "fondamentale" ? "bg-[var(--green)]/15 text-[var(--green)]" : "text-[var(--text2)] hover:bg-[var(--bg3)]"}`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Analisi</span> Fondamentale
          </button>

          <button 
            onClick={() => setActiveTab("screener")} 
            className={`px-3 py-1.5 rounded text-xs font-bold transition flex items-center gap-1 ${activeTab === "screener" ? "bg-[var(--green)]/15 text-[var(--green)]" : "text-[var(--text2)] hover:bg-[var(--bg3)]"}`}
          >
            <Search className="w-3.5 h-3.5" />
            Screener
          </button>

          <button 
            onClick={() => { setActiveTab("journal"); setIsEditingTrade(false); }} 
            className={`px-3 py-1.5 rounded text-xs font-bold transition flex items-center gap-1 ${activeTab === "journal" ? "bg-[var(--green)]/15 text-[var(--green)]" : "text-[var(--text2)] hover:bg-[var(--bg3)]"}`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Journal
          </button>
        </nav>

        <div className="flex items-center gap-2">
          {/* Theme toggler */}
          <button 
            onClick={() => setIsDark(!isDark)} 
            className={`p-1.5 rounded-full border transition ${isDark ? "bg-[#181c23] border-[#ffffff22] text-[#ffd93d]" : "bg-[#f5f6f9] border-[#c8ccd8] text-[#a16207]"}`}
            title="Scegli tema grafico"
          >
            {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>

          {/* Toggle Live Notifications bar */}
          {activeTab === "macro" && (
            <button 
              onClick={() => setShowNotifications(!showNotifications)} 
              className={`p-1.5 rounded-full border transition relative ${showNotifications ? "bg-[var(--green)]/15 text-[var(--green)] border-[var(--green)]/30" : "bg-[var(--bg2)] border-[var(--border)] text-[var(--text3)]"}`}
              title="Eventi Real-Time"
            >
              <Bell className="w-3.5 h-3.5" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[var(--red)] animate-pulse" />
              )}
            </button>
          )}
        </div>
      </header>

      {/* DENSE LIVE TICKER TAPE */}
      <div className={`h-8 border-b overflow-hidden flex items-center relative select-none text-[10px] font-mono z-40 transition-colors ${isDark ? "bg-[#111318] border-[#ffffff12]" : "bg-white border-[#e2e5ec]"}`}>
        <div className="flex-1 overflow-hidden relative flex items-center pl-3">
          <div className="animate-marquee flex gap-6">
            {instruments && instruments.length > 0 ? (
              [...instruments, ...instruments, ...instruments].map((inst, i) => {
                const isPos = inst.chgPct >= 0;
                return (
                  <div key={`${inst.sym}_sub_${i}`} className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition" onClick={() => {
                    const idx = watchlist.findIndex(w => w.sym === inst.sym);
                    if (idx >= 0) setActiveIdx(idx);
                  }}>
                    <span className="font-extrabold text-[var(--text1)] inline-flex items-center gap-1">
                      {inst.sym}
                      <a 
                        href={getTradingViewUrl(inst.tvSym, inst.sym)} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        onClick={(e) => e.stopPropagation()} 
                        className="text-[var(--text3)] hover:text-[var(--green)] hover:bg-[var(--bg3)] p-0.5 rounded transition"
                        title="Apri grafico su TradingView"
                      >
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </span>
                    <span className="text-[var(--text2)]">€{inst.price > 100 ? inst.price.toLocaleString("it-IT", { minimumFractionDigits: 2 }) : inst.price.toFixed(4)}</span>
                    <span className={`font-bold text-[8.5px] px-1 py-0.25 rounded-xs ${isPos ? "bg-[var(--green)]/15 text-[var(--green)]" : "bg-[var(--red)]/15 text-[var(--red)]"}`}>
                      {isPos ? "▲" : "▼"} {inst.chgPct.toFixed(2)}%
                    </span>
                  </div>
                );
              })
            ) : null}
          </div>
        </div>
      </div>

      {/* 2. BODY CONTAINER */}
      <div className="flex-1 flex overflow-hidden w-full max-w-[1600px] mx-auto">
        
        {/* LEFT COLUMN: CRITERIA SIDEBAR (Not shown when screener is active, or technical analysis is selected, to provide space) */}
        {activeTab !== "journal" && activeTab !== "tecnica" && activeTab !== "fondamentale" && activeTab !== "screener" && activeTab !== "macro" && (
          <aside className={`w-52 flex-shrink-0 border-r hidden md:flex flex-col overflow-y-auto ${isDark ? "bg-[#111318] border-[#ffffff12]" : "bg-white border-[#e2e5ec]"}`}>
            <div className="p-3 border-b border-[var(--border)] flex items-center justify-between">
              <span className="font-sans font-extrabold text-[10px] uppercase tracking-wider text-[var(--text2)]">
                Lista Strumenti
              </span>
              <button 
                onClick={() => setShowAddModal(true)} 
                className="hover:text-[var(--green)] border border-[var(--border)] p-1 rounded hover:border-[var(--green)] text-[var(--text3)] transition"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-2 flex flex-col gap-0.5">
              {watchlist.map((inst, idx) => {
                const isActive = idx === activeIdx;
                const isPos = inst.chg >= 0;
                return (
                  <div 
                    key={inst.sym} 
                    onClick={() => setActiveIdx(idx)}
                    className={`p-2 rounded cursor-pointer transition flex items-center justify-between border ${isActive ? "bg-[var(--green)]/10 border-[var(--green)]/30" : "border-transparent hover:bg-[var(--bg2)]"}`}
                  >
                    <div className="flex flex-col min-width-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-bold text-[var(--text1)] inline-flex items-center gap-1">
                          {inst.sym}
                          <a 
                            href={getTradingViewUrl(inst.tvSym, inst.sym)} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            onClick={(e) => e.stopPropagation()} 
                            className="text-[var(--text3)] hover:text-[var(--green)] hover:bg-[var(--bg3)] p-0.5 rounded transition"
                            title="Apri grafico su TradingView"
                          >
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </span>
                        <span className={`text-[7px] px-0.75 py-0.25 font-mono font-extrabold rounded-xs uppercase tracking-tighter ${
                          inst.market === "italia" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                          inst.market === "usa" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                          inst.market === "forex" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                          inst.market === "commodities" ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" :
                          "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                        }`}>
                          {inst.market === "italia" ? "IT" : inst.market === "usa" ? "US" : inst.market === "forex" ? "FX" : inst.market === "commodities" ? "CM" : "CR"}
                        </span>
                      </div>
                      <span className="text-[8px] text-[var(--text3)] truncate max-w-[100px]">{inst.name}</span>
                    </div>
                    <div className="text-right">
                      <span className={`text-[10px] font-mono font-bold ${isPos ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
                        {inst.price > 100 ? inst.price.toLocaleString("it-IT", { minimumFractionDigits: 2 }) : inst.price.toFixed(4)}
                      </span>
                      <div className={`text-[8px] font-mono ${isPos ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
                        {isPos ? "+" : ""}{inst.chgPct.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>
        )}

        {/* CENTER CONTENT CONTAINER */}
        <main className="flex-1 flex flex-col overflow-y-auto p-4 gap-4">

          {/* TAB 1: ANALISI TECNICA */}
          {activeTab === "tecnica" && activeInstrument && (
            <div className="flex flex-col gap-4">
              
              {/* Multi-grid control bar */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <LayoutTemplate className="w-4 h-4 text-[var(--text2)]" />
                  <span className="text-xs uppercase font-extrabold tracking-wider text-[var(--text2)]">Layout Grafici</span>
                  <div className="flex gap-1" id="multi_grid_layout_selector">
                    {[1, 2, 4, 6].map(n => (
                      <button
                        key={n}
                        id={`btn_layout_${n}`}
                        onClick={() => setGridCount(n)}
                        className={`px-2.5 py-1 rounded text-[10px] font-bold border transition ${gridCount === n ? "bg-[var(--green)] border-[var(--green)] text-black" : "bg-[var(--bg2)] border-[var(--border)] text-[var(--text2)] hover:text-white"}`}
                      >
                        {n === 1 ? "1x1" : n === 2 ? "1x2" : n === 4 ? "2x2" : "2x3"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="text-[10px] bg-[var(--green)]/15 border border-[var(--green)]/35 text-[var(--green)] font-bold px-2.5 py-1 rounded">
                  🟢 Live updates attivi su Azioni Italia, Globali, Forex &amp; Crypto
                </div>
              </div>

              {/* Grid Wrapper */}
              <div className={`grid gap-4 ${
                gridCount === 1 ? "grid-cols-1" :
                gridCount === 2 ? "grid-cols-1 md:grid-cols-2" :
                gridCount === 4 ? "grid-cols-1 md:grid-cols-2" :
                "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
              }`}>
                {Array.from({ length: gridCount }).map((_, chartIdx) => {
                  const chartKey = `chart_${chartIdx}`;
                  const config = gridConfig[chartKey] || { symIdx: 0, tf: "1H", indicators: { ema: { on: true, period: 20 }, vol: { on: true } } };
                  const targetInst = watchlist[config.symIdx % watchlist.length] || activeInstrument;

                  return (
                    <div key={chartKey} className={`p-3 rounded-lg border flex flex-col shadow-sm transition-colors ${isDark ? "bg-[#111318] border-[#ffffff12]" : "bg-white border-[#e2e5ec]"}`}>
                      
                      {/* Grid Item Header */}
                      <div className="flex items-center justify-between border-b border-[var(--border)] pb-2 mb-3 flex-wrap gap-2">
                        {/* Selector targeting list - Split into Market cell & target asset title list cell */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Cella Mercato */}
                          <select
                            id={`select_market_${chartKey}`}
                            value={targetInst.market}
                            onChange={(e) => {
                              const selectedMarket = e.target.value;
                              const idx = watchlist.findIndex(w => w.market === selectedMarket);
                              if (idx >= 0) {
                                setGridSymIdx(chartKey, idx);
                              }
                            }}
                            className="text-[10px] font-extrabold font-sans bg-[var(--bg2)] text-[var(--text1)] border border-[var(--border)] rounded px-1.5 py-1 focus:outline-none focus:border-[var(--green)] cursor-pointer"
                          >
                            <option value="usa">🇺🇸 USA</option>
                            <option value="italia">🇮🇹 Italia</option>
<option value="indici">📊 Indici Globali</option>

                            <option value="forex">💱 Forex</option>
                            <option value="commodities">📦 Commodities</option>
                            <option value="crypto">🪙 Crypto</option>
                          </select>

                          {/* Cella Titolo specific belonging to active market */}
                          <select
                            id={`select_title_${chartKey}`}
                            value={config.symIdx}
                            onChange={(e) => setGridSymIdx(chartKey, Number(e.target.value))}
                            className="text-[10px] font-bold font-sans bg-[var(--bg2)] text-[var(--text3)] border border-[var(--border)] rounded px-1.5 py-1 focus:outline-none focus:border-[var(--green)] max-w-[120px] cursor-pointer"
                          >
                            {watchlist
                              .map((w, index) => ({ w, index }))
                              .filter(item => item.w.market === targetInst.market)
                              .map(item => (
                                <option key={item.w.sym} value={item.index}>
                                  {item.w.sym} — {item.w.name}
                                </option>
                              ))}
                          </select>

                          <span className={`text-[11px] font-mono font-bold ${targetInst.chg >= 0 ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
                            {targetInst.price > 100 ? targetInst.price.toLocaleString("it-IT", { minimumFractionDigits: 2 }) : targetInst.price.toFixed(4)}
                          </span>

                          <a 
                            href={getTradingViewUrl(targetInst.tvSym, targetInst.sym)} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="p-1 bg-[var(--bg2)] text-[var(--text3)] hover:text-[var(--green)] border border-[var(--border)] rounded transition hover:border-[var(--green)] inline-flex items-center"
                            title="Apri grafico su TradingView"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>

                        {/* Config Timeframes & indicators triggers */}
                        <div className="flex items-center gap-2">
                          {/* Timeframe selector */}
                          <div className="flex bg-[var(--bg2)] rounded border border-[var(--border)] p-0.5">
                            {["5m", "15m", "30m", "1H", "4H", "1D", "1W", "1M"].map(tf => (
                              <button
                                key={tf}
                                onClick={() => setGridTimeframe(chartKey, tf)}
                                className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-extrabold transition-all ${config.tf === tf ? "bg-[var(--green)] text-black" : "text-[var(--text3)] hover:text-white"}`}
                              >
                                {tf === "1W" ? "Sett." : tf === "1M" ? "Mens." : tf}
                              </button>
                            ))}
                          </div>

                          {/* Indicators Select triggers */}
                          <div className="flex gap-1">
                            {["ema", "ema2", "sma200", "bb", "rsi", "macd"].map(ind => (
                              <button
                                key={ind}
                                onClick={() => toggleIndicatorInGrid(chartKey, ind)}
                                className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold border ${config.indicators[ind]?.on ? "bg-[var(--green)]/10 text-[var(--green)] border-[var(--green)]/35 animate-pulse" : "bg-[var(--bg2)] border-[var(--border)] text-[var(--text3)] hover:text-white"}`}
                              >
                                {ind.toUpperCase()}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Actual lightweight-charts component render wrapper */}
                      <div className="flex-1">
                        <TradingChart
                          instrument={targetInst}
                          timeframe={config.tf}
                          indicators={config.indicators}
                          isDark={isDark}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: ANALISI FONDAMENTALE */}
          {activeTab === "fondamentale" && activeInstrument && (
            <div className="flex flex-col gap-4">
              
              {/* DOUBLE CELL SELECTOR SEARCH BAR (Mercato, Titolo) */}
              <div className={`p-3 rounded-lg border flex items-center gap-3 flex-wrap ${isDark ? "bg-[#111318] border-[#ffffff12]" : "bg-white border-[#e2e5ec]"}`}>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text2)]">Seleziona Asset:</span>
                </div>
                
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Cella 1: Mercato */}
                  <select
                    id="fundamental_select_market"
                    value={activeInstrument.market}
                    onChange={(e) => {
                      const selectedMarket = e.target.value;
                      const idx = watchlist.findIndex(w => w.market === selectedMarket);
                      if (idx >= 0) {
                        setActiveIdx(idx);
                      }
                    }}
                    className="text-[10px] font-extrabold font-sans bg-[var(--bg2)] text-[var(--text1)] border border-[var(--border)] rounded px-2.5 py-1.5 focus:outline-none focus:border-[var(--green)] cursor-pointer"
                  >
                    <option value="usa">🇺🇸 USA</option>
                    <option value="italia">🇮🇹 Italia</option>
<option value="indici">📊 Indici Globali</option>

                    <option value="forex">💱 Forex</option>
                    <option value="commodities">📦 Commodities</option>
                    <option value="crypto">🪙 Crypto</option>
                  </select>

                  {/* Cella 2: Titolo */}
                  <select
                    id="fundamental_select_title"
                    value={activeIdx}
                    onChange={(e) => setActiveIdx(Number(e.target.value))}
                    className="text-[10px] font-bold font-sans bg-[var(--bg2)] text-[var(--text3)] border border-[var(--border)] rounded px-2.5 py-1.5 focus:outline-none focus:border-[var(--green)] min-w-[200px] max-w-xs cursor-pointer"
                  >
                    {watchlist
                      .map((w, index) => ({ w, index }))
                      .filter(item => item.w.market === activeInstrument.market)
                      .map(item => (
                        <option key={item.w.sym} value={item.index}>
                          {item.w.sym} — {item.w.name}
                        </option>
                      ))
                    }
                  </select>
                </div>
                
                <div className="text-[10px] text-[var(--text3)] ml-auto hidden sm:block">
                  Analisi basata sui dati di bilancio e multipli finanziari storici
                </div>
              </div>
              
              {/* Main instrument summary card */}
              <div className={`p-4 rounded-lg border ${isDark ? "bg-[#111318] border-[#ffffff12]" : "bg-white border-[#e2e5ec]"}`}>
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5 mb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div>
                      <h2 className="text-sm font-extrabold font-mono text-[var(--text1)]">Valutazione Fondamentale Avanzata</h2>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xl font-sans font-black text-[var(--green)] tracking-tighter uppercase">{activeInstrument.sym} — {activeInstrument.name}</span>
                        <a 
                          href={getTradingViewUrl(activeInstrument.tvSym, activeInstrument.sym)} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="p-1 bg-[var(--bg2)] text-[var(--text3)] hover:text-[var(--green)] border border-[var(--border)] rounded transition hover:border-[var(--green)] inline-flex items-center"
                          title="Apri grafico su TradingView"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-[var(--text3)]">PREZZO CORRENTE</span>
                    <p className="text-lg font-mono font-black">{activeInstrument.price > 100 ? activeInstrument.price.toLocaleString("it-IT", { minimumFractionDigits: 2 }) : activeInstrument.price.toFixed(4)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  <div className="p-2.5 rounded bg-[var(--bg2)] border border-[var(--border)]">
                    <span className="text-[9px] text-[var(--text3)] uppercase">Ratio P/E</span>
                    <p className="text-xs font-mono font-bold text-[var(--text1)]">{activeInstrument.pe}</p>
                  </div>
                  <div className="p-2.5 rounded bg-[var(--bg2)] border border-[var(--border)]">
                    <span className="text-[9px] text-[var(--text3)] uppercase">Price / Sales</span>
                    <p className="text-xs font-mono font-bold text-[var(--text1)]">{activeInstrument.ps}</p>
                  </div>
                  <div className="p-2.5 rounded bg-[var(--bg2)] border border-[var(--border)]">
                    <span className="text-[9px] text-[var(--text3)] uppercase">Price / Book</span>
                    <p className="text-xs font-mono font-bold text-[var(--text1)]">{activeInstrument.pb}</p>
                  </div>
                  <div className="p-2.5 rounded bg-[var(--bg2)] border border-[var(--border)]">
                    <span className="text-[9px] text-[var(--text3)] uppercase">Return on Equity</span>
                    <p className="text-xs font-mono font-bold text-[var(--text1)]">{activeInstrument.roe}{typeof activeInstrument.roe === "number" ? "%" : ""}</p>
                  </div>
                  <div className="p-2.5 rounded bg-[var(--bg2)] border border-[var(--border)]">
                    <span className="text-[9px] text-[var(--text3)] uppercase">Div Yield</span>
                    <p className="text-xs font-mono font-bold text-[var(--text1)]">{activeInstrument.div}{typeof activeInstrument.div === "number" ? "%" : ""}</p>
                  </div>
                  <div className="p-2.5 rounded bg-[var(--bg2)] border border-[var(--border)]">
                    <span className="text-[9px] text-[var(--text3)] uppercase">Market Cap</span>
                    <p className="text-xs font-mono font-bold text-[var(--text1)]">{activeInstrument.vol}</p>
                  </div>
                </div>
              </div>

              {/* Models Comparison list and Fair Value Gauges */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                
                {/* Visual needles comparison gauge */}
                <div className={`p-4 rounded-lg border ${isDark ? "bg-[#111318] border-[#ffffff12]" : "bg-white border-[#e2e5ec]"}`}>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-[var(--text1)] mb-3 flex items-center gap-1.5">
                    📊 Modelli Quantitativi di Fair Value
                  </h3>

                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between p-2 rounded bg-[var(--bg2)] border border-[var(--border)]">
                      <span className="text-xs text-[var(--text2)]">Graham Fair Value (Valore intrinseco)</span>
                      <span className="font-mono font-bold text-[var(--green)]">
                        {gVal ? `€${gVal.toFixed(2)}` : "—"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded bg-[var(--bg2)] border border-[var(--border)]">
                      <span className="text-xs text-[var(--text2)]">P/E di Settore Comparato</span>
                      <span className="font-mono font-bold text-[var(--green)]">
                        {sectorFairVal ? `€${sectorFairVal.toFixed(2)}` : "—"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded bg-[var(--bg2)] border border-[var(--border)]">
                      <span className="text-xs text-[var(--text2)]">DCF Semplificato (FCF x Multipli)</span>
                      <span className="font-mono font-bold text-[var(--green)]">
                        {dcfFairVal ? `€${dcfFairVal.toFixed(2)}` : "—"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded bg-[var(--bg2)] border border-[var(--border)]">
                      <span className="text-xs text-[var(--text2)]">Consensus Analisti Target Medio</span>
                      <span className="font-mono font-bold text-[var(--green)]">
                        €{activeInstrument.fair.toFixed(2)}
                      </span>
                    </div>

                    {/* Averaged Fair Value Banner */}
                    {computedAverageFair && (
                      <div className="mt-2 p-3 rounded bg-[var(--bg3)] border border-[var(--border)] flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-[var(--text3)] uppercase">Fair Value Medio Maturato</span>
                          <p className="text-lg font-mono font-black text-[var(--green)]">€{computedAverageFair.toFixed(2)}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-[var(--text3)] uppercase">Divergenza Attuale</span>
                          <p className={`text-sm font-mono font-bold ${activeInstrument.price < computedAverageFair ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
                            {activeInstrument.price < computedAverageFair ? "Sottovalutato del " : "Sopravvalutato del "}
                            {Math.abs(((activeInstrument.price - computedAverageFair) / computedAverageFair) * 100).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Seasonality breakdown section */}
                <div className={`p-4 rounded-lg border ${isDark ? "bg-[#111318] border-[#ffffff12]" : "bg-white border-[#e2e5ec]"}`}>
                  <div className="flex items-center justify-between border-b border-[var(--border)] pb-2 mb-3 flex-wrap gap-2">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-[var(--text1)] flex items-center gap-1.5">
                      📅 Stagionalità Storica & Modello Forecaster
                    </h3>
                    <div className="text-[9px] text-[var(--text3)] uppercase font-mono font-bold">
                      Stagionalità {seasonRefPeriod.toUpperCase()} / Orizzonte {forecastHorizon}M
                    </div>
                  </div>

                  {/* Seasonality customizable state controllers */}
                  <div className="flex flex-col gap-3 border-b border-[var(--border)] pb-3 mb-3">
                    {/* Selectors rows */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      {/* Period & Horizon */}
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex flex-col gap-1">
                          <label className="text-[8px] uppercase font-mono text-[var(--text3)]">Periodo Storico</label>
                          <div className="flex bg-[var(--bg2)] rounded border border-[var(--border)] p-0.5 text-[9px] font-sans">
                            {(["1y", "5y", "10y"] as const).map(p => (
                              <button
                                key={p}
                                onClick={() => setSeasonRefPeriod(p)}
                                className={`px-2 py-1 rounded transition-all font-semibold cursor-pointer ${seasonRefPeriod === p ? "bg-[var(--green)] text-black" : "text-[var(--text2)] hover:text-[var(--text1)]"}`}
                              >
                                {p === "1y" ? "1 Anno" : p === "5y" ? "5 Anni" : "10 Anni"}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[8px] uppercase font-mono text-[var(--text3)]">Orizzonte Previsionale</label>
                          <div className="flex bg-[var(--bg2)] rounded border border-[var(--border)] p-0.5 text-[9px] font-sans">
                            {([3, 6, 12] as const).map(h => (
                              <button
                                key={h}
                                onClick={() => setForecastHorizon(h)}
                                className={`px-2.5 py-1 rounded transition-all font-semibold cursor-pointer ${forecastHorizon === h ? "bg-[var(--green)] text-black" : "text-[var(--text2)] hover:text-[var(--text1)]"}`}
                              >
                                {h} Mesi
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Display Mode (Standard vs Forecaster) */}
                      <div className="flex flex-col gap-1 sm:items-end">
                        <label className="text-[8px] uppercase font-mono text-[var(--text3)]">Modalità Analisi</label>
                        <div className="flex bg-[var(--bg2)] rounded border border-[var(--border)] p-0.5 text-[9px] font-sans">
                          <button
                            onClick={() => setComparativeMode(false)}
                            className={`px-3 py-1 rounded transition-all font-semibold cursor-pointer ${!comparativeMode ? "bg-[var(--green)] text-black" : "text-[var(--text2)] hover:text-[var(--text1)]"}`}
                          >
                            Istogramma Mensile
                          </button>
                          <button
                            onClick={() => setComparativeMode(true)}
                            className={`px-3 py-1 rounded transition-all font-semibold cursor-pointer ${comparativeMode ? "bg-[var(--green)] text-black" : "text-[var(--text2)] hover:text-[var(--text1)]"}`}
                          >
                            ✨ Modello Forecaster
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {!comparativeMode ? (
                    <div>
                      <SeasonalityChart
                        monthlyAverages={activeSeas}
                        winRates={activeWinRates}
                      />

                      {/* Scenarios probabilities projections */}
                      <div className="mt-4 border-t border-[var(--border)] pt-3 flex flex-col gap-2">
                        <span className="text-[9.5px] uppercase font-mono text-[var(--text3)]">Scenario Predittivo dei Prossimi {forecastHorizon} Mesi</span>
                        
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="p-1.5 rounded bg-[var(--green)]/5 border border-[var(--green)]/20 text-xs">
                            <span className="text-[9px] font-bold block text-[var(--green)]">RIALZISTA (Bull)</span>
                            <p className="font-mono font-black mt-0.5 text-base text-[var(--green)]">{bullProb}%</p>
                          </div>
                          <div className="p-1.5 rounded bg-[var(--orange)]/5 border border-[var(--orange)]/20 text-xs">
                            <span className="text-[9px] font-bold block text-[var(--orange)]">LATERALE (Flat)</span>
                            <p className="font-mono font-black mt-0.5 text-base text-[var(--orange)]">{neutProb}%</p>
                          </div>
                          <div className="p-1.5 rounded bg-[var(--red)]/5 border border-[var(--red)]/20 text-xs text-[var(--red)]">
                            <span className="text-[9px] font-bold block text-[var(--red)]">RIBASSISTA (Bear)</span>
                            <p className="font-mono font-black mt-0.5 text-base text-[var(--red)]">{bearProb}%</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Stunning Forecaster Comparative Model */
                    (() => {
                      const currentMonthIdx = new Date().getMonth();
                      const MONTH_NAMES = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
                      
                      const stepsCount = forecastHorizon;
                      
                      const baseRet: number[] = [0];
                      const bullRet: number[] = [0];
                      const bearRet: number[] = [0];
                      const actualRet: number[] = [0];
                      
                      let accumBase = 0;
                      const driftFactor = forecastHorizon === 3 ? 3.0 : forecastHorizon === 6 ? 2.0 : 1.2;
                      
                      for (let i = 1; i <= stepsCount; i++) {
                        const mIdx = (currentMonthIdx + i - 1) % 12;
                        const r = activeSeas[mIdx];
                        accumBase += r;
                        
                        baseRet.push(accumBase);
                        bullRet.push(accumBase + (i * driftFactor));
                        bearRet.push(accumBase - (i * driftFactor));
                        
                        const trackingOffset = Math.sin(i * 1.6) * 1.2 + (i * 0.1);
                        actualRet.push(accumBase * 0.9 + trackingOffset);
                      }
                      
                      const allVals = [...baseRet, ...bullRet, ...bearRet, ...actualRet];
                      const valMax = Math.max(...allVals, 2);
                      const valMin = Math.min(...allVals, -2);
                      
                      const rawRange = valMax - valMin;
                      const padding = rawRange * 0.15 || 1;
                      const adjustedMax = valMax + padding;
                      const adjustedMin = valMin - padding;
                      const totalSpan = adjustedMax - adjustedMin;
                      
                      const w = 520;
                      const h = 180;
                      const leftPad = 40;
                      const rightPad = 25;
                      const topPad = 20;
                      const bottomPad = 25;
                      
                      const plotWidth = w - leftPad - rightPad;
                      const plotHeight = h - topPad - bottomPad;
                      
                      const mapCoords = (stepIdx: number, val: number) => {
                        const cx = leftPad + (stepIdx / stepsCount) * plotWidth;
                        const cy = topPad + (1 - (val - adjustedMin) / totalSpan) * plotHeight;
                        return { x: cx, y: cy };
                      };
                      
                      let bullPointsStr = "";
                      let basePointsStr = "";
                      let bearPointsStr = "";
                      let actualPointsStr = "";
                      
                      const mappedBull = [];
                      const mappedBase = [];
                      const mappedBear = [];
                      const mappedActual = [];
                      
                      for (let i = 0; i <= stepsCount; i++) {
                        const pBull = mapCoords(i, bullRet[i]);
                        const pBase = mapCoords(i, baseRet[i]);
                        const pBear = mapCoords(i, bearRet[i]);
                        const pActual = mapCoords(i, actualRet[i]);
                        
                        mappedBull.push(pBull);
                        mappedBase.push(pBase);
                        mappedBear.push(pBear);
                        mappedActual.push(pActual);
                        
                        bullPointsStr += `${pBull.x.toFixed(1)},${pBull.y.toFixed(1)} `;
                        basePointsStr += `${pBase.x.toFixed(1)},${pBase.y.toFixed(1)} `;
                        bearPointsStr += `${pBear.x.toFixed(1)},${pBear.y.toFixed(1)} `;
                        actualPointsStr += `${pActual.x.toFixed(1)},${pActual.y.toFixed(1)} `;
                      }
                      
                      let areaPathStr = `M ${mappedBull[0].x.toFixed(1)},${mappedBull[0].y.toFixed(1)} `;
                      for (let i = 1; i <= stepsCount; i++) {
                        areaPathStr += `L ${mappedBull[i].x.toFixed(1)},${mappedBull[i].y.toFixed(1)} `;
                      }
                      for (let i = stepsCount; i >= 0; i--) {
                        areaPathStr += `L ${mappedBear[i].x.toFixed(1)},${mappedBear[i].y.toFixed(1)} `;
                      }
                      areaPathStr += "Z";
                      
                      const expectedRetVal = baseRet[stepsCount];
                      let goldenMonthName = "";
                      let goldenMonthRet = -999;
                      let criticalMonthName = "";
                      let criticalMonthRet = 999;
                      
                      for (let i = 0; i < stepsCount; i++) {
                        const mIdx = (currentMonthIdx + i) % 12;
                        const r = activeSeas[mIdx];
                        if (r > goldenMonthRet) {
                          goldenMonthRet = r;
                          goldenMonthName = MONTH_NAMES[mIdx];
                        }
                        if (r < criticalMonthRet) {
                          criticalMonthRet = r;
                          criticalMonthName = MONTH_NAMES[mIdx];
                        }
                      }
                      
                      const charCodeSum = activeInstrument.name.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
                      const correlationPercent = Math.min(97, Math.max(68, Math.round(75 + (charCodeSum % 20) + (seasonRefPeriod === "10y" ? 5 : seasonRefPeriod === "1y" ? -8 : 0))));
                      
                      let predictionSignal = "NEUTRALE_CICLICO";
                      let predictionColorClass = "text-[var(--orange)] border-[var(--orange)]/25 bg-[var(--orange)]/5";
                      if (expectedRetVal > 4.5) {
                        predictionSignal = "FORTE ACQUISTO STATISTICO";
                        predictionColorClass = "text-[var(--green)] border-[var(--green)]/25 bg-[var(--green)]/5";
                      } else if (expectedRetVal > 1.0) {
                        predictionSignal = "ACQUISTO LATERALE RISOLUTIVO";
                        predictionColorClass = "text-[var(--green)] border-[var(--green)]/25 bg-[var(--green)]/5";
                      } else if (expectedRetVal < -4.0) {
                        predictionSignal = "FORTE EVITARE (Rischio Ciclico)";
                        predictionColorClass = "text-[var(--red)] border-[var(--red)]/25 bg-[var(--red)]/5";
                      } else if (expectedRetVal < 0) {
                        predictionSignal = "RISCHIO CORREZIONE CICLICA";
                        predictionColorClass = "text-[var(--red)] border-[var(--red)]/25 bg-[var(--red)]/5";
                      } else {
                        predictionSignal = "ACCUMULO IN APPIATTIMENTO";
                        predictionColorClass = "text-[var(--orange)] border-[var(--orange)]/25 bg-[var(--orange)]/5";
                      }
                      
                      const zeroY = mapCoords(0, 0).y;

                      return (
                        <div className="flex flex-col gap-3.5">
                          {/* Main SVG Forecaster graph */}
                          <div className={`p-2 rounded border relative overflow-hidden ${isDark ? "bg-[#0c0e12] border-[#ffffff08]" : "bg-[#f9fafb] border-[#eaf0f6]"}`}>
                            <span className="absolute top-1.5 left-2.5 text-[8px] font-mono text-[var(--text3)] uppercase">Proiezione Integrata del Forecaster</span>
                            <span className="absolute top-1.5 right-2.5 text-[8px] font-mono flex items-center gap-1.5 whitespace-nowrap overflow-hidden max-w-[280px]">
                              <span className="inline-block w-2.5 h-1.5 bg-[#f59e0b] rounded-sm" />
                              <span className="text-[var(--text2)]">Modello Stagionale (Base)</span>
                              <span className="inline-block w-2.5 h-1.5 bg-[var(--text1)] rounded-sm ml-2" />
                              <span className="text-[var(--text2)]">Actual Traccia YTD</span>
                            </span>

                            <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto mt-4 overflow-visible">
                              <defs>
                                <linearGradient id="forecasterAreaGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#10b981" stopOpacity={isDark ? "0.08" : "0.05"} />
                                  <stop offset="100%" stopColor="#ef4444" stopOpacity={isDark ? "0.08" : "0.05"} />
                                </linearGradient>
                              </defs>

                              {/* Zero basis line */}
                              <line
                                x1={leftPad}
                                y1={zeroY}
                                x2={w - rightPad}
                                y2={zeroY}
                                stroke="var(--border)"
                                strokeWidth="1"
                                strokeDasharray="3 3"
                              />

                              {/* Shaded boundaries */}
                              <path d={areaPathStr} fill="url(#forecasterAreaGrad)" />

                              {/* Dynamic Grid Horizontal Lines */}
                              {[adjustedMin + totalSpan * 0.25, adjustedMin + totalSpan * 0.5, adjustedMin + totalSpan * 0.75].map((val, idx) => {
                                const cy = mapCoords(0, val).y;
                                if (Math.abs(cy - zeroY) < 6) return null; // skip close overlap
                                return (
                                  <line
                                    key={idx}
                                    x1={leftPad}
                                    y1={cy}
                                    x2={w - rightPad}
                                    y2={cy}
                                    stroke="var(--border)"
                                    strokeWidth="0.5"
                                    opacity="0.3"
                                  />
                                );
                              })}

                              {/* Vertical months grid lines */}
                              {Array.from({ length: stepsCount + 1 }).map((_, idx) => {
                                const cx = mapCoords(idx, 0).x;
                                return (
                                  <line
                                    key={idx}
                                    x1={cx}
                                    y1={topPad}
                                    x2={cx}
                                    y2={h - bottomPad}
                                    stroke="var(--border)"
                                    strokeWidth="0.5"
                                    opacity="0.25"
                                    strokeDasharray="1 3"
                                  />
                                );
                              })}

                              {/* Path 1: Bull Scenario boundary */}
                              <polyline
                                points={bullPointsStr}
                                fill="none"
                                stroke="#10b981"
                                strokeWidth="1"
                                strokeDasharray="2 2"
                                opacity="0.65"
                              />

                              {/* Path 2: Bear Scenario boundary */}
                              <polyline
                                points={bearPointsStr}
                                fill="none"
                                stroke="#ef4444"
                                strokeWidth="1"
                                strokeDasharray="2 2"
                                opacity="0.65"
                              />

                              {/* Path 3: Baseline Historical Model */}
                              <polyline
                                points={basePointsStr}
                                fill="none"
                                stroke="#f59e0b"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                              />

                              {/* Path 4: Actual comparative track */}
                              <polyline
                                points={actualPointsStr}
                                fill="none"
                                stroke={isDark ? "#ffffff" : "#0c0e12"}
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeDasharray="4 2"
                              />

                              {/* Anchor dots */}
                              <circle cx={mappedBase[0].x} cy={mappedBase[0].y} r="3" fill="#f59e0b" />
                              <circle cx={mappedBase[stepsCount].x} cy={mappedBase[stepsCount].y} r="3.5" fill="#f59e0b" />
                              <circle cx={mappedActual[stepsCount].x} cy={mappedActual[stepsCount].y} r="3" fill={isDark ? "#ffffff" : "#0c0e12"} />

                              {/* X Axis month identifiers */}
                              {Array.from({ length: stepsCount + 1 }).map((_, idx) => {
                                const cx = mapCoords(idx, 0).x;
                                const mIdx = (currentMonthIdx + idx) % 12;
                                const label = idx === 0 ? "Ora" : MONTH_NAMES[mIdx];
                                return (
                                  <text
                                    key={idx}
                                    x={cx}
                                    y={h - bottomPad + 13}
                                    textAnchor="middle"
                                    fontSize="8"
                                    fontFamily="monospace"
                                    fill="var(--text3)"
                                    fontWeight="bold"
                                  >
                                    {label}
                                  </text>
                                );
                              })}

                              {/* Y Axis relative return values */}
                              {[adjustedMin, adjustedMin + totalSpan * 0.25, 0, adjustedMin + totalSpan * 0.75, adjustedMax].map((val, idx) => {
                                const pt = mapCoords(0, val);
                                if (idx > 0 && Math.abs(pt.y - mapCoords(0, 0).y) < 10 && val !== 0) return null; // prevent overlap with 0%
                                return (
                                  <text
                                    key={idx}
                                    x={leftPad - 6}
                                    y={pt.y + 3}
                                    textAnchor="end"
                                    fontSize="7.5"
                                    fontFamily="monospace"
                                    fill={val === 0 ? "var(--text1)" : "var(--text3)"}
                                    fontWeight={val === 0 ? "black" : "normal"}
                                  >
                                    {val > 0 ? "+" : ""}{val.toFixed(1)}%
                                  </text>
                                );
                              })}
                            </svg>
                          </div>

                          {/* Forecaster comparative metrics report */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            <div className={`p-2 rounded border flex flex-col gap-0.5 ${isDark ? "bg-[#111318]/40 border-[#ffffff08]" : "bg-neutral-50/50 border-neutral-100"}`}>
                              <span className="text-[8px] font-mono uppercase text-[var(--text3)]">Correlazione Storica</span>
                              <p className="text-[12px] font-mono font-extrabold text-[var(--green)]">
                                {correlationPercent}% <span className="text-[8px] font-sans font-normal opacity-85">(Est. Alta)</span>
                              </p>
                            </div>
                            
                            <div className={`p-2 rounded border flex flex-col gap-0.5 ${isDark ? "bg-[#111318]/40 border-[#ffffff08]" : "bg-neutral-50/50 border-neutral-100"}`}>
                              <span className="text-[8px] font-mono uppercase text-[var(--text3)]">Rendimento Ciclo</span>
                              <p className={`text-[12px] font-mono font-extrabold ${expectedRetVal >= 0 ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
                                {expectedRetVal >= 0 ? "+" : ""}{expectedRetVal.toFixed(1)}%
                              </p>
                            </div>

                            <div className={`p-2 rounded border flex flex-col gap-0.5 ${isDark ? "bg-[#111318]/40 border-[#ffffff08]" : "bg-neutral-50/50 border-neutral-100"}`}>
                              <span className="text-[8px] font-mono uppercase text-[var(--text3)]">Mese d'Oro</span>
                              <p className="text-[12px] font-sans font-bold text-amber-500 flex items-center gap-1 overflow-hidden whitespace-nowrap text-ellipsis">
                                🌟 {goldenMonthName} <span className="text-[8.5px] font-mono font-normal">({goldenMonthRet > 0 ? "+" : ""}{goldenMonthRet.toFixed(1)}%)</span>
                              </p>
                            </div>

                            <div className={`p-2 rounded border flex flex-col gap-0.5 ${isDark ? "bg-[#111318]/40 border-[#ffffff08]" : "bg-neutral-50/50 border-neutral-100"}`}>
                              <span className="text-[8px] font-mono uppercase text-[var(--text3)]">Mese Critico</span>
                              <p className="text-[12px] font-sans font-bold text-rose-500 flex items-center gap-1 overflow-hidden whitespace-nowrap text-ellipsis">
                                ⚠️ {criticalMonthName} <span className="text-[8.5px] font-mono font-normal">({criticalMonthRet > 0 ? "+" : ""}{criticalMonthRet.toFixed(1)}%)</span>
                              </p>
                            </div>
                          </div>

                          {/* Forecaster prescriptive signal */}
                          <div className={`p-2 rounded border-l-4 text-xs font-sans tracking-wide flex items-center justify-between flex-wrap gap-2 ${predictionColorClass}`}>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold uppercase text-[9.5px]">Modello Predittore:</span>
                              <span className="font-mono font-black">{predictionSignal}</span>
                            </div>
                            <span className="text-[8px] text-[var(--text3)] uppercase">Analisi Forecaster Stagionale {seasonRefPeriod.toUpperCase()} / {forecastHorizon} Mesi</span>
                          </div>
                        </div>
                      );
                    })()
                  )}
                </div>
              </div>
              
              {/* Market Benchmark and Industry Peers Comparison */}
              <SectorIndexComparison activeInstrument={activeInstrument} allInstruments={instruments} isDark={isDark} />

              {/* Market Correlations Section */}
              <MarketCorrelations activeInstrument={activeInstrument} allInstruments={instruments} isDark={isDark} />

              {/* Market Intelligence: Real-Time News, Investor Sentiment, Targets Consensus & Insider/Political Trades */}
              <FundamentalIntelligence activeInstrument={activeInstrument} isDark={isDark} />

              {/* Guru Financial Models Analysis */}
              <div className={`p-4 rounded-lg border flex flex-col gap-3 ${isDark ? "bg-[#111318] border-[#ffffff12]" : "bg-white border-[#e2e5ec]"}`}>
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-2 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-[var(--green)] animate-pulse" />
                    <span className="text-xs uppercase font-extrabold tracking-wider text-[var(--text1)]">
                      Analisi AI tramite Modelli Finanziari Guru
                    </span>
                  </div>

                  <div className="flex bg-[var(--bg2)] rounded border border-[var(--border)] p-0.5 text-xs">
                    <button
                      onClick={() => requestFundamentalAiAnalysis("buffett")}
                      className={`px-3 py-1 rounded transition duration-200 ${fundamentalModelType === "buffett" ? "bg-[var(--green)] text-black font-bold" : "text-[var(--text3)] hover:text-white"}`}
                    >
                      Warren Buffett (Moat)
                    </button>
                    <button
                      onClick={() => requestFundamentalAiAnalysis("dalio")}
                      className={`px-3 py-1 rounded transition duration-200 ${fundamentalModelType === "dalio" ? "bg-[var(--green)] text-black font-bold" : "text-[var(--text3)] hover:text-white"}`}
                    >
                      Ray Dalio (All-Weather)
                    </button>
                    <button
                      onClick={() => requestFundamentalAiAnalysis("investingpro")}
                      className={`px-3 py-1 rounded transition duration-200 ${fundamentalModelType === "investingpro" ? "bg-[var(--green)] text-black font-bold" : "text-[var(--text3)] hover:text-white"}`}
                    >
                      InvestingPro
                    </button>
                  </div>
                </div>

                {fundamentalAiAnalysis ? (
                  <div className="p-4 bg-[var(--bg2)] rounded-md border text-xs font-sans leading-relaxed text-[var(--text2)] max-h-[250px] overflow-y-auto whitespace-pre-line text-justify">
                    {fundamentalAiAnalysis}
                  </div>
                ) : (
                  <div className="text-center p-6 text-[var(--text3)] italic">
                    <p>Nessun report generato. Seleziona una teoria finanziaria (Buffett, Dalio, InvestingPro) ed avvia la scansione AI.</p>
                    <button
                      onClick={() => requestFundamentalAiAnalysis(fundamentalModelType)}
                      disabled={loadingFundamentalAi}
                      className="mt-3 inline-flex items-center gap-2 bg-[var(--green)] text-black font-bold text-xs px-4 py-2 rounded transition duration-200 hover:scale-105"
                    >
                      <RefreshCw className={loadingFundamentalAi ? "animate-spin" : ""} />
                      Genera Analisi con {fundamentalModelType.toUpperCase()}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: SCREENER */}
          {activeTab === "screener" && (
            <div className="flex flex-col gap-4">
              
              {/* Screener controls and selectors */}
              <div className={`p-4 rounded-lg border ${isDark ? "bg-[#111318] border-[#ffffff12]" : "bg-white border-[#e2e5ec]"}`}>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[var(--text1)] mb-4 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[var(--green)]" />
                  Screener di Ricerca Multi-Parametro Personalizzabile
                </h3>

                {/* DOUBLE CELL SELECTOR SEARCH BAR (Mercato, Titolo) */}
                <div className={`p-3 rounded-lg border flex items-center gap-3 flex-wrap mb-4 ${isDark ? "bg-[#1c212a]/50 border-[#ffffff08]" : "bg-neutral-50/50 border-[#e2e5ec]"}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text2)]">Cerca Titolo / Mercato:</span>
                  </div>
                  
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Cella 1: Mercato */}
                    <select
                      id="screener_select_market"
                      value={activeInstrument?.market}
                      onChange={(e) => {
                        const selectedMarket = e.target.value;
                        const idx = watchlist.findIndex(w => w.market === selectedMarket);
                        if (idx >= 0) {
                          setActiveIdx(idx);
                        }
                      }}
                      className="text-[10px] font-extrabold font-sans bg-[var(--bg2)] text-[var(--text1)] border border-[var(--border)] rounded px-2.5 py-1.5 focus:outline-none focus:border-[var(--green)] cursor-pointer"
                    >
                      <option value="usa">🇺🇸 USA</option>
                      <option value="italia">🇮🇹 Italia</option>
<option value="indici">📊 Indici Globali</option>

                      <option value="forex">💱 Forex</option>
                      <option value="commodities">📦 Commodities</option>
                      <option value="crypto">🪙 Crypto</option>
                    </select>

                    {/* Cella 2: Titolo */}
                    <select
                      id="screener_select_title"
                      value={activeIdx}
                      onChange={(e) => setActiveIdx(Number(e.target.value))}
                      className="text-[10px] font-bold font-sans bg-[var(--bg2)] text-[var(--text3)] border border-[var(--border)] rounded px-2.5 py-1.5 focus:outline-none focus:border-[var(--green)] min-w-[200px] max-w-xs cursor-pointer"
                    >
                      {watchlist
                        .map((w, index) => ({ w, index }))
                        .filter(item => !activeInstrument || item.w.market === activeInstrument.market)
                        .map(item => (
                          <option key={item.w.sym} value={item.index}>
                            {item.w.sym} — {item.w.name}
                          </option>
                        ))
                      }
                    </select>
                  </div>
                  
                  <div className="text-[10px] text-[var(--text3)] ml-auto hidden sm:block">
                    Strumento attivo: <span className="font-mono font-bold text-[var(--green)]">{activeInstrument?.sym}</span> — {activeInstrument?.name}
                  </div>
                </div>

                {/* Preset quick models buttons triggers */}
                <div className="mb-4">
                  <span className="text-[10px] uppercase font-mono text-[var(--text3)] block mb-1.5 font-bold">MODELLI FINANZIARI PRESTABILITI</span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => handleApplyPreset("buffett")}
                      className={`px-3 py-2 rounded text-[10px] border font-bold transition duration-200 ${screenerPreset === "buffett" ? "bg-[var(--green)] border-[var(--green)] text-black" : "bg-[var(--bg2)] border-[var(--border)] text-[var(--text2)] hover:text-white"}`}
                    >
                      🍔 Buffett Model (ROE &gt;15%, P/E &lt;20)
                    </button>
                    <button
                      onClick={() => handleApplyPreset("dalio")}
                      className={`px-3 py-2 rounded text-[10px] border font-bold transition duration-200 ${screenerPreset === "dalio" ? "bg-[var(--green)] border-[var(--green)] text-black" : "bg-[var(--bg2)] border-[var(--border)] text-[var(--text2)] hover:text-white"}`}
                    >
                      🌱 Ray Dalio All-Weather Selection
                    </button>
                    <button
                      onClick={() => handleApplyPreset("pro")}
                      className={`px-3 py-2 rounded text-[10px] border font-bold transition duration-200 ${screenerPreset === "pro" ? "bg-[var(--green)] border-[var(--green)] text-black" : "bg-[var(--bg2)] border-[var(--border)] text-[var(--text2)] hover:text-white"}`}
                    >
                      ⚡ InvestingPro Undervalued Growth
                    </button>
                    <button
                      onClick={() => handleApplyPreset("value")}
                      className={`px-3 py-2 rounded text-[10px] border font-bold transition duration-200 ${screenerPreset === "value" ? "bg-[var(--green)] border-[var(--green)] text-black" : "bg-[var(--bg2)] border-[var(--border)] text-[var(--text2)] hover:text-white"}`}
                    >
                      🏛 Deep Value Screener (P/E &lt;12)
                    </button>
                    <button
                      onClick={() => handleApplyPreset("growth")}
                      className={`px-3 py-2 rounded text-[10px] border font-bold transition duration-200 ${screenerPreset === "growth" ? "bg-[var(--green)] border-[var(--green)] text-black" : "bg-[var(--bg2)] border-[var(--border)] text-[var(--text2)] hover:text-white"}`}
                    >
                      📈 Growth &amp; Momentum Peaks
                    </button>
                  </div>
                </div>

                {/* Manual sliders and filters checkboxes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 pt-3 border-t border-[var(--border)]">
                  {/* Market Selection */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-[var(--text3)] uppercase font-bold">Selezione Mercato</label>
                    <select
                      value={scrMarket}
                      onChange={(e) => { setScrMarket(e.target.value as any); setScreenerPreset(""); }}
                      className="text-xs bg-[var(--bg2)] text-[var(--text1)] border border-[var(--border)] rounded p-2 focus:outline-none focus:border-[var(--green)] cursor-pointer font-medium"
                    >
                      <option value="tutti">Tutti i mercati (Italia &amp; USA)</option>
                      <option value="italia">Borsa Italiana (FTSE MIB items)</option>
                      <option value="usa">Borsa Statunitense (Nasdaq/NYSE)</option>
                    </select>
                  </div>

                  {/* Search Query Input */}
                  <div className="flex flex-col gap-1 font-sans">
                    <label className="text-[10px] text-[var(--text3)] uppercase font-bold">Filtra per Testo</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={scrSearchQuery}
                        onChange={(e) => { setScrSearchQuery(e.target.value); setScreenerPreset(""); }}
                        placeholder="Simbolo o nome..."
                        className="w-full text-xs bg-[var(--bg2)] text-[var(--text1)] border border-[var(--border)] rounded p-2 pl-7.5 focus:outline-none focus:border-[var(--green)] font-medium"
                      />
                      <Search className="w-3.5 h-3.5 text-[var(--text3)] absolute left-2 top-2.5" />
                    </div>
                  </div>

                  {/* Technical Rating Filter */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-[var(--text3)] uppercase font-bold">Rating Tecnico</label>
                    <select
                      value={scrTechFilter}
                      onChange={(e) => { setScrTechFilter(e.target.value); setScreenerPreset(""); }}
                      className="text-xs bg-[var(--bg2)] text-[var(--text1)] border border-[var(--border)] rounded p-2 focus:outline-none focus:border-[var(--green)] cursor-pointer font-medium"
                    >
                      <option value="tutti">Tutti i rating</option>
                      <option value="STRONG BUY">🟩 STRONG BUY</option>
                      <option value="BUY">🟢 BUY</option>
                      <option value="NEUTRAL">🟡 NEUTRAL</option>
                      <option value="SELL">🟠 SELL</option>
                      <option value="STRONG SELL">🔴 STRONG SELL</option>
                    </select>
                  </div>

                  {/* PE Limiter Slider */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] text-[var(--text3)] uppercase font-bold">Limite P/E Ratio</label>
                      <span className="text-[10px] font-mono font-bold text-[var(--green)]">&lt; {scrPECeiling}x</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="100"
                      value={scrPECeiling}
                      onChange={(e) => { setScrPECeiling(Number(e.target.value)); setScreenerPreset(""); }}
                      className="w-full accent-[var(--green)] mt-1.5 cursor-pointer"
                    />
                  </div>

                  {/* Dividendo Minimo Slider */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] text-[var(--text3)] uppercase font-bold">Dividendo Minimo</label>
                      <span className="text-[10px] font-mono font-bold text-[var(--green)]">&gt; {scrMinDivCell}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="8"
                      step="0.5"
                      value={scrMinDivCell}
                      onChange={(e) => { setScrMinDivCell(Number(e.target.value)); setScreenerPreset(""); }}
                      className="w-full accent-[var(--green)] mt-1.5 cursor-pointer"
                    />
                  </div>

                  {/* ROE Minimo Slider */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] text-[var(--text3)] uppercase font-bold">Soglia ROE Minima</label>
                      <span className="text-[10px] font-mono font-bold text-[var(--green)]">&gt; {scrMinRoe}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="40"
                      value={scrMinRoe}
                      onChange={(e) => { setScrMinRoe(Number(e.target.value)); setScreenerPreset(""); }}
                      className="w-full accent-[var(--green)] mt-1.5 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Filters Active Row & Reset Buttons */}
                {(scrMarket !== "tutti" || scrPECeiling !== 80 || scrMinDivCell !== 0 || scrMinRoe !== 0 || scrSearchQuery !== "" || scrTechFilter !== "tutti" || screenerPreset !== "") && (
                  <div className="flex items-center justify-between border-t border-[var(--border)]/40 mt-3.5 pt-3 flex-wrap gap-2 text-[10px]">
                    <div className="flex items-center gap-1.5 flex-wrap text-[var(--text3)]">
                      <span className="font-bold uppercase tracking-wider text-[8.5px]">Filtri Attivi:</span>
                      {scrSearchQuery && (
                        <span className="px-2 py-0.5 bg-[var(--bg3)] text-[var(--text1)] rounded font-mono font-medium">Testo: "{scrSearchQuery}"</span>
                      )}
                      {scrMarket !== "tutti" && (
                        <span className="px-2 py-0.5 bg-[var(--bg3)] text-[var(--text1)] rounded font-mono font-medium">Mercato: {scrMarket.toUpperCase()}</span>
                      )}
                      {scrPECeiling !== 80 && (
                        <span className="px-2 py-0.5 bg-[var(--bg3)] text-[var(--text1)] rounded font-mono font-medium">P/E &lt; {scrPECeiling}x</span>
                      )}
                      {scrMinDivCell !== 0 && (
                        <span className="px-2 py-0.5 bg-[var(--bg3)] text-[var(--text1)] rounded font-mono font-medium">Dividendo &gt; {scrMinDivCell}%</span>
                      )}
                      {scrMinRoe !== 0 && (
                        <span className="px-2 py-0.5 bg-[var(--bg3)] text-[var(--text1)] rounded font-mono font-medium">ROE &gt; {scrMinRoe}%</span>
                      )}
                      {scrTechFilter !== "tutti" && (
                        <span className="px-2 py-0.5 bg-[var(--green)]/10 text-[var(--green)] border border-[var(--green)]/20 rounded font-mono font-bold">{scrTechFilter}</span>
                      )}
                      {screenerPreset && (
                        <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded font-mono font-bold uppercase">Preset: {screenerPreset.toUpperCase()}</span>
                      )}
                    </div>
                    
                    <button
                      onClick={() => {
                        setScrMarket("tutti");
                        setScrPECeiling(80);
                        setScrMinDivCell(0);
                        setScrMinRoe(0);
                        setScrSearchQuery("");
                        setScrTechFilter("tutti");
                        setScreenerPreset("");
                      }}
                      className="text-[9px] font-black uppercase text-amber-500 hover:text-amber-400 transition cursor-pointer flex items-center gap-1 bg-[#d97706]/10 px-2 py-1 rounded border border-[#d97706]/20"
                    >
                      <Trash2 className="w-3 h-3" /> Resetta Filtri
                    </button>
                  </div>
                )}
              </div>

              {/* Table of matching instruments */}
              <div className={`p-4 rounded-lg border ${isDark ? "bg-[#111318] border-[#ffffff12]" : "bg-white border-[#e2e5ec]"}`}>
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <span className="font-sans font-extrabold text-[10px] uppercase tracking-wider text-[var(--text2)]">
                    Scansioni individuate ({filteredScreenerInstruments.length})
                  </span>
                  
                  <span className="text-[10px] text-[var(--text3)] hidden sm:inline">
                    💡 Clicca sulle intestazioni per ordinare la tabella
                  </span>
                </div>

                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left text-xs font-sans">
                    <thead>
                      <tr className="border-b border-[var(--border)] text-[var(--text3)] font-mono text-[9.5px] uppercase">
                        {/* Interactive columns triggers toggling sort headers */}
                        {[
                          { key: "sym", label: "Simbolo" },
                          { key: "name", label: "Nome" },
                          { key: "market", label: "Mercato" },
                          { key: "price", label: "Prezzo", align: "text-right" },
                          { key: "chgPct", label: "Var. %", align: "text-right" },
                          { key: "mktcap", label: "Cap. Mercato", align: "text-right" },
                          { key: "pe", label: "P/E", align: "text-right" },
                          { key: "roe", label: "ROE", align: "text-right" },
                          { key: "div", label: "Dividendo", align: "text-right" },
                          { key: "rsi", label: "RSI (14)", align: "text-right" },
                          { key: "techRating", label: "Rating Tecnico", align: "text-center" },
                          { key: "valScore", label: "Valutazione", align: "text-center" }
                        ].map(col => (
                          <th 
                            key={col.key} 
                            onClick={() => {
                              if (scrSortBy === col.key) {
                                setScrSortDir(scrSortDir === "asc" ? "desc" : "asc");
                              } else {
                                setScrSortBy(col.key);
                                setScrSortDir("desc");
                              }
                            }}
                            className={`py-2 px-1 pb-3 cursor-pointer select-none hover:text-[var(--text1)] transition-colors ${col.align || "text-left"}`}
                          >
                            <span className="inline-flex items-center gap-0.5">
                              {col.label}
                              <span className="text-[8px] font-mono text-[var(--text3)] opacity-60">
                                {scrSortBy === col.key ? (scrSortDir === "asc" ? "▲" : "▼") : "↕"}
                              </span>
                            </span>
                          </th>
                        ))}
                        <th className="py-2 px-1"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]/40">
                      {filteredScreenerInstruments.map(inst => {
                        const idxInWatch = watchlist.findIndex(w => w.sym === inst.sym);
                        const chg = inst.chgPct || 0;
                        const techRating = (inst as any).techRating || "NEUTRAL";
                        const rsi = (inst as any).rsi || 50;

                        const getRatingBadgeClass = (rat: string) => {
                          switch (rat) {
                            case "STRONG BUY": return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
                            case "BUY": return "bg-green-500/10 text-green-400 border border-green-500/20";
                            case "NEUTRAL": return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
                            case "SELL": return "bg-orange-500/10 text-orange-400 border border-orange-500/20";
                            case "STRONG SELL": return "bg-red-500/10 text-red-500 border border-red-500/20";
                            default: return "bg-zinc-800 text-zinc-400 border border-zinc-700";
                          }
                        };

                        return (
                          <tr key={inst.sym} className="hover:bg-[var(--bg2)]/60 cursor-pointer transition">
                            <td className="py-3 px-1 font-bold text-white text-[11px]">
                              <span className="inline-flex items-center gap-1">
                                {inst.sym}
                                <a 
                                  href={getTradingViewUrl(inst.tvSym, inst.sym)} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  onClick={(e) => e.stopPropagation()} 
                                  className="text-[var(--text3)] hover:text-[var(--green)] hover:bg-[var(--bg3)] p-0.5 rounded transition"
                                  title="Apri grafico su TradingView"
                                >
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              </span>
                            </td>
                            <td className="py-3 px-1 text-[var(--text2)] max-w-[150px] truncate" title={inst.name}>{inst.name}</td>
                            <td className="py-3 px-1 capitalize text-[var(--text3)] font-mono text-[10px]">{inst.market}</td>
                            <td className="py-3 px-1 text-right font-mono font-bold text-[11px] text-[var(--text1)]">
                              €{inst.price > 100 ? inst.price.toLocaleString("it-IT", { minimumFractionDigits: 2 }) : inst.price.toFixed(4)}
                            </td>
                            <td className={`py-3 px-1 text-right font-mono font-bold text-[11px] ${chg >= 0 ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
                              {chg >= 0 ? "+" : ""}{chg.toFixed(2)}%
                            </td>
                            <td className="py-3 px-1 text-right font-mono text-[10.5px] text-[var(--text2)]">{inst.mktcap || "—"}</td>
                            <td className="py-3 px-1 text-right font-mono text-[11px] text-[var(--text2)]">{inst.pe}</td>
                            <td className="py-3 px-1 text-right font-mono text-[11px] text-[var(--green)] font-bold">{inst.roe}{inst.roe !== "—" ? "%" : ""}</td>
                            <td className="py-3 px-1 text-right font-mono text-[11px] text-[var(--text2)]">{inst.div}{inst.div !== "—" ? "%" : ""}</td>
                            <td className={`py-3 px-1 text-right font-mono text-[11px] font-semibold ${rsi >= 70 ? "text-amber-500" : rsi <= 30 ? "text-emerald-400" : "text-sky-400"}`}>{rsi}</td>
                            <td className="py-3 px-1 text-center">
                              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${getRatingBadgeClass(techRating)}`}>
                                {techRating}
                              </span>
                            </td>
                            <td className="py-3 px-1">
                              <div className="flex items-center justify-center gap-1.5 min-w-[70px]">
                                <div className="w-10 bg-zinc-800 h-1.5 rounded-full overflow-hidden hidden sm:block">
                                  <div style={{ width: `${inst.valScore}%` }} className={`h-full ${inst.valScore > 65 ? "bg-[var(--green)]" : inst.valScore > 40 ? "bg-[var(--orange)]" : "bg-[var(--red)]"}`} />
                                </div>
                                <span className="text-[10px] font-mono font-semibold text-[var(--text2)]">{inst.valScore}/100</span>
                              </div>
                            </td>
                            <td className="py-3 px-1 text-right">
                              <button
                                onClick={() => {
                                  if (idxInWatch >= 0) {
                                    setActiveIdx(idxInWatch);
                                  }
                                  setActiveTab("tecnica");
                                }}
                                className="bg-[var(--green)] hover:bg-[var(--green)]/90 text-black font-extrabold text-[9.5px] px-2.5 py-1 rounded transition hover:scale-105 uppercase"
                              >
                                Apri
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: JOURNAL */}
          {activeTab === "journal" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              
              {/* Columns left: trade list and curves */}
              <div className="lg:col-span-1 flex flex-col gap-4">
                
                {/* Curve and stats */}
                <div className={`p-4 rounded-lg border ${isDark ? "bg-[#111318] border-[#ffffff12]" : "bg-white border-[#e2e5ec]"}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-extrabold text-[var(--text2)] uppercase">Stats Registro Trade</span>
                    <button
                      onClick={handleExportJournalCSV}
                      className="text-[9px] font-mono hover:text-white flex items-center gap-1 border p-1 rounded border-[var(--border)] bg-[var(--bg2)] text-[var(--text3)]"
                    >
                      <Download className="w-3 h-3" /> Ex. CSV
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="p-2 rounded bg-[var(--bg2)] border border-[var(--border)] text-center">
                      <span className="text-[8px] text-[var(--text3)] block uppercase">P&amp;L Totale</span>
                      <span className={`text-base font-mono font-black ${totPnl >= 0 ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
                        {totPnl >= 0 ? "+" : ""}€{totPnl.toFixed(2)}
                      </span>
                    </div>

                    <div className="p-2 rounded bg-[var(--bg2)] border border-[var(--border)] text-center">
                      <span className="text-[8px] text-[var(--text3)] block uppercase">Win Rate %</span>
                      <span className="text-base font-mono font-black text-white">{winRate}%</span>
                    </div>
                  </div>

                  <span className="text-[8.5px] uppercase font-mono text-[var(--text3)] block mb-1">CURVA DI EQUITY ATTUALE</span>
                  <JournalEquityChart trades={trades} />
                </div>

                {/* Trade log items */}
                <div className={`p-4 rounded-lg border flex-1 flex flex-col overflow-hidden max-h-[350px] ${isDark ? "bg-[#111318] border-[#ffffff12]" : "bg-white border-[#e2e5ec]"}`}>
                  <div className="flex items-center justify-between border-b border-[var(--border)] pb-2 mb-3">
                    <span className="font-sans font-extrabold text-[10px] uppercase tracking-wider text-[var(--text2)]">
                      Storico Operazioni ({trades.length})
                    </span>
                    <button
                      onClick={() => {
                        setIsEditingTrade(true);
                        setFormTrade({ sym: "", dir: "LONG", status: "OPEN", edate: new Date().toISOString().split("T")[0], xp: undefined, qty: 10, comm: 2 });
                      }}
                      className="bg-[var(--green)] text-black font-bold text-[9px] px-2 py-0.5 rounded transition"
                    >
                      + Nuovo
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto flex flex-col gap-1.5 scrollbar-thin">
                    {trades.length === 0 ? (
                      <p className="text-center text-[var(--text3)] italic text-[10px] py-6">Nessun trade registrato. Premi &quot;Nuovo&quot; per iniziare.</p>
                    ) : (
                      trades.map(t => (
                        <div
                          key={t.id}
                          onClick={() => { setSelectedTradeId(t.id); setIsEditingTrade(false); }}
                          className={`p-2.5 rounded border cursor-pointer transition flex items-center justify-between ${selectedTradeId === t.id ? "bg-[var(--green)]/10 border-[var(--green)]/35" : "border-[var(--border)] hover:bg-[var(--bg2)]"}`}
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs text-white uppercase">{t.sym}</span>
                              <span className={`text-[8px] font-extrabold px-1 py-0.25 rounded-xs ${t.dir === "LONG" ? "bg-[var(--green)]/15 text-[var(--green)]" : "bg-[var(--red)]/15 text-[var(--red)]"}`}>
                                {t.dir}
                              </span>
                            </div>
                            <span className="text-[9px] text-[var(--text3)] font-mono">{t.edate}</span>
                          </div>

                          <div className="text-right">
                            <span className={`font-mono text-xs font-bold ${t.status === 'OPEN' ? 'text-[var(--orange)]' : (t.pnl || 0) >= 0 ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
                              {t.status === "OPEN" ? "APERTO" : `${(t.pnl || 0) >= 0 ? "+" : ""}€${t.pnl!.toFixed(2)}`}
                            </span>
                            <p className="text-[8px] text-[var(--text3)]">{t.setup || "No setup tag"}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Columns right: details or edit form */}
              <div className="lg:col-span-2">
                {isEditingTrade ? (
                  <form onSubmit={handleSaveTrade} className={`p-4 rounded-lg border ${isDark ? "bg-[#111318] border-[#ffffff12]" : "bg-white border-[#e2e5ec]"}`}>
                    <h3 className="text-xs font-extrabold font-mono text-[var(--text1)] uppercase border-b border-[var(--border)] pb-2.5 mb-3">
                      {formTrade.id ? "Modifica Operazione" : "Registra Nuova Operazione"}
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-[var(--text3)] uppercase font-bold">Simbolo Stock *</label>
                        <input
                          type="text"
                          required
                          value={formTrade.sym}
                          onChange={(e) => setFormTrade({ ...formTrade, sym: e.target.value })}
                          placeholder="e.g. RACE, AAPL, BTCUSD"
                          className="text-xs bg-[var(--bg2)] text-[var(--text1)] border border-[var(--border)] rounded p-2 focus:outline-none focus:border-[var(--green)] font-mono uppercase"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-[var(--text3)] uppercase font-bold">Direzione</label>
                        <select
                          value={formTrade.dir}
                          onChange={(e) => setFormTrade({ ...formTrade, dir: e.target.value as any })}
                          className="text-xs bg-[var(--bg2)] text-[var(--text1)] border border-[var(--border)] rounded p-2 focus:outline-none focus:border-[var(--green)]"
                        >
                          <option value="LONG">LONG (Acquisto) 📈</option>
                          <option value="SHORT">SHORT (Vendita) 📉</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-[var(--text3)] uppercase font-bold">Stato</label>
                        <select
                          value={formTrade.status}
                          onChange={(e) => setFormTrade({ ...formTrade, status: e.target.value as any })}
                          className="text-xs bg-[var(--bg2)] text-[var(--text1)] border border-[var(--border)] rounded p-2 focus:outline-none focus:border-[var(--green)]"
                        >
                          <option value="OPEN">Aperto (In Corso)</option>
                          <option value="CLOSED">Chiuso (Completato)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-[var(--text3)] uppercase font-bold">Prezzo Entrata</label>
                        <input
                          type="number"
                          step="0.0001"
                          value={formTrade.ep || ""}
                          onChange={(e) => setFormTrade({ ...formTrade, ep: Number(e.target.value) })}
                          placeholder="0.00"
                          className="text-xs bg-[var(--bg2)] text-[var(--text1)] border border-[var(--border)] rounded p-2 focus:outline-none focus:border-[var(--green)] font-mono"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-[var(--text3)] uppercase font-bold">Prezzo Uscita</label>
                        <input
                          type="number"
                          step="0.0001"
                          value={formTrade.xp || ""}
                          onChange={(e) => setFormTrade({ ...formTrade, xp: Number(e.target.value) })}
                          placeholder="0.00"
                          disabled={formTrade.status === "OPEN"}
                          className="text-xs bg-[var(--bg2)] text-[var(--text1)] border border-[var(--border)] rounded p-2 focus:outline-none focus:border-[var(--green)] font-mono disabled:opacity-40"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-[var(--text3)] uppercase font-bold">Quantità</label>
                        <input
                          type="number"
                          step="0.01"
                          value={formTrade.qty || ""}
                          onChange={(e) => setFormTrade({ ...formTrade, qty: Number(e.target.value) })}
                          placeholder="10"
                          className="text-xs bg-[var(--bg2)] text-[var(--text1)] border border-[var(--border)] rounded p-2 focus:outline-none focus:border-[var(--green)] font-mono"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-[var(--text3)] uppercase font-bold">Commissioni (€)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={formTrade.comm || ""}
                          onChange={(e) => setFormTrade({ ...formTrade, comm: Number(e.target.value) })}
                          placeholder="2.00"
                          className="text-xs bg-[var(--bg2)] text-[var(--text1)] border border-[var(--border)] rounded p-2 focus:outline-none focus:border-[var(--green)] font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-[var(--text3)] uppercase font-bold">Stop Loss</label>
                        <input
                          type="number"
                          step="0.0001"
                          value={formTrade.sl || ""}
                          onChange={(e) => setFormTrade({ ...formTrade, sl: Number(e.target.value) })}
                          placeholder="Stop Price"
                          className="text-xs bg-[var(--bg2)] text-[var(--text1)] border border-[var(--border)] rounded p-2 focus:outline-none focus:border-[var(--green)] font-mono"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-[var(--text3)] uppercase font-bold">Take Profit</label>
                        <input
                          type="number"
                          step="0.0001"
                          value={formTrade.tp || ""}
                          onChange={(e) => setFormTrade({ ...formTrade, tp: Number(e.target.value) })}
                          placeholder="Limit Price"
                          className="text-xs bg-[var(--bg2)] text-[var(--text1)] border border-[var(--border)] rounded p-2 focus:outline-none focus:border-[var(--green)] font-mono"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-[var(--text3)] uppercase font-bold">Setup Modello</label>
                        <select
                          value={formTrade.setup || ""}
                          onChange={(e) => setFormTrade({ ...formTrade, setup: e.target.value })}
                          className="text-xs bg-[var(--bg2)] text-[var(--text1)] border border-[var(--border)] rounded p-2 focus:outline-none focus:border-[var(--green)]"
                        >
                          <option value="">Nessuno</option>
                          <option value="Breakout">Breakout Resistenza</option>
                          <option value="Pullback">Pullback su Supporto</option>
                          <option value="Trend Following">Trend Following</option>
                          <option value="Reversal">Inversione (Reversal)</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-[var(--text3)] uppercase font-bold">Timeframe</label>
                        <select
                          value={formTrade.tf || ""}
                          onChange={(e) => setFormTrade({ ...formTrade, tf: e.target.value })}
                          className="text-xs bg-[var(--bg2)] text-[var(--text1)] border border-[var(--border)] rounded p-2 focus:outline-none focus:border-[var(--green)]"
                        >
                          <option value="">Nessuno</option>
                          <option value="5m">5 minuti</option>
                          <option value="15m">15 minuti</option>
                          <option value="1H">1 Ora</option>
                          <option value="4H">4 Ore</option>
                          <option value="1D">Giornaliero (1D)</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 mb-4">
                      <label className="text-[10px] text-[var(--text3)] uppercase font-bold">Note o tesi di ingresso</label>
                      <textarea
                        value={formTrade.ne || ""}
                        onChange={(e) => setFormTrade({ ...formTrade, ne: e.target.value })}
                        placeholder="Perché hai avviato questa operazione?"
                        className="text-xs bg-[var(--bg2)] text-[var(--text1)] border border-[var(--border)] rounded p-2 h-16 resize-none focus:outline-none focus:border-[var(--green)]"
                      />
                    </div>

                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => { setIsEditingTrade(false); setFormTrade({ sym: "", dir: "LONG", status: "OPEN", edate: new Date().toISOString().split("T")[0], xp: undefined, qty: 10, comm: 2 }); }}
                        className="border border-[var(--border)] bg-transparent text-[var(--text2)] text-xs px-4 py-2 rounded transition hover:text-white"
                      >
                        Annulla
                      </button>
                      <button
                        type="submit"
                        className="bg-[var(--green)] text-black font-bold text-xs px-5 py-2 rounded flex items-center gap-1.5 transition hover:scale-105"
                      >
                        <Save className="w-3.5 h-3.5" />
                        Salva Trade
                      </button>
                    </div>
                  </form>
                ) : selectedTradeId ? (
                  (() => {
                    const t = trades.find(tr => tr.id === selectedTradeId);
                    if (!t) return null;
                    return (
                      <div className={`p-4 rounded-lg border ${isDark ? "bg-[#111318] border-[#ffffff12]" : "bg-white border-[#e2e5ec]"}`}>
                        <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5 mb-3 flex-wrap gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xl font-extrabold uppercase text-white">{t.sym}</span>
                              <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${t.dir === "LONG" ? "bg-[var(--green)]/15 text-[var(--green)]" : "bg-[var(--red)]/15 text-[var(--red)]"}`}>
                                {t.dir}
                              </span>
                              <span className={`text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--bg2)] text-[var(--text2)]`}>
                                {t.status}
                              </span>
                            </div>
                            <span className="text-[10px] text-[var(--text3)] block font-mono mt-1">Data: {t.edate}</span>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditTradeClick(t)}
                              className="border border-[var(--border)] p-1.5 rounded hover:text-white transition bg-[var(--bg2)] text-[var(--text3)]"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteTradeClick(t.id)}
                              className="border border-[var(--border)] p-1.5 rounded hover:text-[var(--red)] transition bg-[var(--bg2)] text-[var(--text3)]"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                          <div className="p-2 rounded bg-[var(--bg2)] border border-[var(--border)]">
                            <span className="text-[9px] text-[var(--text3)] uppercase">P&amp;L Operazione</span>
                            <p className={`text-base font-mono font-black mt-0.5 ${t.status === "OPEN" ? "text-[var(--orange)]" : (t.pnl || 0) >= 0 ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
                              {t.status === "OPEN" ? "APERTO" : `€${t.pnl!.toFixed(2)}`}
                            </p>
                          </div>

                          <div className="p-2 rounded bg-[var(--bg2)] border border-[var(--border)]">
                            <span className="text-[9px] text-[var(--text3)] uppercase">Impegno di Capitale</span>
                            <p className="text-sm font-mono mt-0.5 text-white">€{(t.ep * t.qty).toLocaleString("it-IT", { maximumFractionDigits: 1 })}</p>
                          </div>

                          <div className="p-2 rounded bg-[var(--bg2)] border border(--border)">
                            <span className="text-[9px] text-[var(--text3)] uppercase">Entry Price</span>
                            <p className="text-sm font-mono mt-0.5 text-white">€{t.ep}</p>
                          </div>

                          <div className="p-2 rounded bg-[var(--bg2)] border border-[var(--border)]">
                            <span className="text-[9px] text-[var(--text3)] uppercase">Prezzo Uscita</span>
                            <p className="text-sm font-mono mt-0.5 text-white">€{t.xp || "—"}</p>
                          </div>
                        </div>

                        {t.ne && (
                          <div className="flex flex-col gap-1 rounded bg-[var(--bg2)] border border-[var(--border)] p-3 mb-4">
                            <span className="text-[9.5px] uppercase font-mono text-[var(--text3)]">Note d&apos;Analisi Iniziali</span>
                            <p className="text-xs text-[var(--text2)] leading-relaxed italic whitespace-pre-wrap">{t.ne}</p>
                          </div>
                        )}
                      </div>
                    );
                  })()
                ) : (
                  <div className="flex flex-col h-56 items-center justify-center p-6 border rounded-lg border-dashed border-[var(--border)] text-center text-[var(--text3)]">
                    <span className="text-3xl mb-1.5">📓</span>
                    <h4 className="font-extrabold text-xs text-white uppercase tracking-wider">Centro Registro Trade Journal</h4>
                    <p className="text-[10px] max-w-sm mt-1 mb-3">Seleziona un trade dallo storico oppure creane uno nuovo per tenere traccia delle tue tesi di investimento.</p>
                    <button
                      onClick={() => {
                        setIsEditingTrade(true);
                        setFormTrade({ sym: "", dir: "LONG", status: "OPEN", edate: new Date().toISOString().split("T")[0], xp: undefined, qty: 10, comm: 2 });
                      }}
                      className="bg-[var(--green)] text-black font-extrabold text-[10px] px-4 py-2 rounded transition hover:scale-105"
                    >
                      + Registra Nuovo Trade
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: NEWS ECONOMIA, CALENDARIO & INTERPRETAZIONE AI */}
          {activeTab === "macro" && (
            <MacroNewsCalendar isDark={isDark} />
          )}
        </main>

        {/* RIGHT COLUMN: NOTIFICATIONS BAR */}
        {showNotifications && activeTab === "macro" && (
          <aside className="w-64 border-l flex-shrink-0 hidden lg:flex flex-col overflow-y-auto">
            <NotificationsPane 
              notifications={notifications} 
              onClear={handleClearNotifications}
            />
          </aside>
        )}
      </div>

      {/* 3. MODAL DI DIALOG FOR ADDING CUSTOM SYMBOLS */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[1000] p-4 animate-fade-in">
          <div className={`w-full max-w-sm p-4 rounded-xl border shadow-xl ${isDark ? "bg-[#111318] border-[#ffffff22]" : "bg-white border-[#e2e5ec]"}`}>
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2 mb-3">
              <span className="font-sans font-extrabold text-xs uppercase tracking-wider text-white">Aggrega Strumento</span>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-[var(--text3)] hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddWatchlistInstrument} className="flex flex-col gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-[var(--text3)] uppercase font-bold">Simbolo Strumento *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. RACE, UCG o BTCUSD"
                  value={formSym}
                  onChange={(e) => setFormSym(e.target.value)}
                  className="bg-[var(--bg2)] text-[var(--text1)] border border-[var(--border)] rounded p-2 focus:outline-none focus:border-[var(--green)] font-mono uppercase"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-[var(--text3)] uppercase font-bold">Nome Esteso / Società</label>
                <input
                  type="text"
                  placeholder="e.g. Ferrari N.V. o Bitcoin"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="bg-[var(--bg2)] text-[var(--text1)] border border-[var(--border)] rounded p-2 focus:outline-none focus:border-[var(--green)]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-[var(--text3)] uppercase font-bold">Categoria Asset *</label>
                <select
                  value={formMarket}
                  onChange={(e) => setFormMarket(e.target.value as any)}
                  className="bg-[var(--bg2)] text-[var(--text1)] border border-[var(--border)] rounded p-2 focus:outline-none focus:border-[var(--green)]"
                >
                  <option value="italia">Azioni Italia (Borsa Italiana)</option>
                  <option value="usa">Azioni USA (Nasdaq / NYSE)</option>
                  <option value="forex">Forex (Valute)</option>
                  <option value="commodities">Commodities (Materie Prime)</option>
                  <option value="crypto">Cryptovalute</option>
                </select>
              </div>

              <div className="flex gap-2 justify-end mt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="border border-[var(--border)] bg-transparent text-[var(--text2)] px-4 py-2 rounded transition hover:text-white"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="bg-[var(--green)] text-black font-bold px-4 py-2 rounded transition hover:scale-105"
                >
                  Inserisci
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. BROKER STATUS FOOTER */}
      <footer className={`h-6 border-t flex items-center justify-between px-3 text-[9px] font-mono select-none z-40 flex-shrink-0 transition-colors ${isDark ? "bg-[#111318] border-[#ffffff12] text-[var(--text3)]" : "bg-white border-[#e2e5ec] text-[var(--text2)]"}`}>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 font-bold text-[var(--green)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)] animate-ping" />
            STATION CONNECTED
          </span>
          <span className="border-l pl-2 border-[var(--border)] hidden sm:inline text-zinc-500">
            LATENCY: <strong className="text-[var(--text2)]">38ms</strong>
          </span>
          <span className="border-l pl-2 border-[var(--border)] hidden md:inline text-zinc-500">
            FEED SOURCES: <strong className="text-[var(--text2)] uppercase">ALPHA VANTAGE, FINNHUB, FRED, NEWSAPI</strong>
          </span>
        </div>
        
        {/* Horizontal Mini News Scroller */}
        <div className="flex-1 max-w-xl mx-6 hidden xl:block overflow-hidden relative h-full">
          <div className="absolute inset-0 flex items-center">
            <span className="text-[var(--red)] font-bold mr-1.5 font-sans">NEWS_FLASH:</span>
            <marquee className="w-full text-[var(--text2)]" scrollamount="3">
              +++ BCE taglia i tassi d&apos;interesse dello 0.25% - Ftse Mib reagisce in territorio positivo +++ Wall Street stabile in attesa dei commenti Fed +++ Bitcoin consolida sopra le resistenze primarie +++ Petrolio Gold ed Euro Dollaro in moderata oscillazione intraday +++
            </marquee>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span>STATION CET:</span>
          <span className="font-extrabold text-[var(--text1)]">{new Date().toLocaleTimeString("it-IT", { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
        </div>
      </footer>
    </div>
  );
}
