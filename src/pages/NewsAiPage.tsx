import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  RefreshCw,
  ExternalLink,
  Search,
  Newspaper,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Copy,
  Check,
  Zap,
  ShieldAlert,
  Compass,
  Bell,
  FileText,
  Upload,
  Award,
  FileSpreadsheet,
  Layers,
  Percent
} from 'lucide-react';
import { BullishBearishReport, FinancialReportAudit, NewsItem, SentimentAlert, SentimentAnalysis, SentimentHistoryResponse } from '../types';
import { marketDataService } from '../services/marketDataService';
import { geminiService } from '../services/geminiService';
import { storageService } from '../services/storageService';
import { playAlertChime } from '../services/soundService';
import { SentimentHistoryChart } from '../components/SentimentHistoryChart';
import { SentimentAlertsModal } from '../components/SentimentAlertsModal';
import { PriceAlertToast, AlertNotificationItem } from '../components/PriceAlertToast';

interface NewsAiPageProps {
  ticker: string;
  category: string;
}

const NEWS_CATEGORIES = [
  { id: 'all', label: 'Tutte le Notizie', icon: '🌐', desc: 'Notizie aggregate sul titolo e finanza generale' },
  { id: 'macro', label: 'Macroeconomia', icon: '🏛️', desc: 'Banche Centrali (BCE, Fed), Inflazione, Tassi e PIL' },
  { id: 'tech', label: 'Tech & AI', icon: '💻', desc: 'Semiconduttori, Big Tech, Software e Intelligenza Artificiale' },
  { id: 'commodities', label: 'Commodities', icon: '🛢️', desc: 'Petrolio Greggio, Oro, Gas Naturale e Materie Prime' },
  { id: 'banks', label: 'Banche & Finanza', icon: '🏦', desc: 'Istituti di credito, spread, dividendi e settore bancario' },
  { id: 'crypto', label: 'Crypto & Web3', icon: '🪙', desc: 'Bitcoin, Ethereum, Altcoin e Finanza Decentralizzata' },
  { id: 'italy', label: 'Mercato Italiano', icon: '🇮🇹', desc: 'Piazza Affari, FTSE MIB, BTP e Corporate Italia' },
  { id: 'forex', label: 'Forex & Valute', icon: '💱', desc: 'Cambio EUR/USD, DXY, Yen e Tassi di Cambio' },
];

export const NewsAiPage: React.FC<NewsAiPageProps> = ({ ticker }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [news, setNews] = useState<NewsItem[]>([]);
  const [sentiment, setSentiment] = useState<SentimentAnalysis | null>(null);
  const [report, setReport] = useState<BullishBearishReport | null>(null);
  const [sentimentHistory, setSentimentHistory] = useState<SentimentHistoryResponse | null>(null);

  const [sentimentAlerts, setSentimentAlerts] = useState<SentimentAlert[]>(() =>
    storageService.getSentimentAlerts()
  );
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false);
  const [activeToasts, setActiveToasts] = useState<AlertNotificationItem[]>([]);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'unsupported';
  });

  const [loadingNews, setLoadingNews] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [copied, setCopied] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [showPromptInput, setShowPromptInput] = useState(false);

  // Multimodal Financial PDF & Report Audit State
  const [financialAudit, setFinancialAudit] = useState<FinancialReportAudit | null>(null);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [selectedAuditReportName, setSelectedAuditReportName] = useState<string>('Enel S.p.A. - Relazione Q3 2026');
  const [auditFileName, setAuditFileName] = useState<string>('');

  const handleUploadFinancialDoc = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAuditFileName(file.name);
    setLoadingAudit(true);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      try {
        const auditRes = await geminiService.analyzeFinancialReport({
          ticker: ticker,
          reportTitle: file.name,
          period: 'Esercizio Corrente',
          fileBase64: base64,
          mimeType: file.type || 'application/pdf'
        });
        setFinancialAudit(auditRes);
      } catch (err) {
        console.error('Audit PDF error:', err);
      } finally {
        setLoadingAudit(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRunSampleAudit = async (sampleTitle: string, sampleTicker: string, samplePeriod: string) => {
    setSelectedAuditReportName(sampleTitle);
    setAuditFileName('');
    setLoadingAudit(true);
    try {
      const auditRes = await geminiService.analyzeFinancialReport({
        ticker: sampleTicker,
        reportTitle: sampleTitle,
        period: samplePeriod,
        textContent: `Official financial earnings release and 10-Q report for ${sampleTicker}. Revenue growth, operational margin expansion, FCF and EBITDA reconciliation for ${samplePeriod}.`
      });
      setFinancialAudit(auditRes);
    } catch (err) {
      console.error('Audit sample error:', err);
    } finally {
      setLoadingAudit(false);
    }
  };

  const triggerBrowserPushNotification = (alert: SentimentAlert, currentScore: number) => {
    const isAbove = alert.condition === 'ABOVE';
    const scoreFormatted = currentScore >= 0 ? `+${currentScore.toFixed(2)}` : currentScore.toFixed(2);
    const targetFormatted = alert.targetScore >= 0 ? `+${alert.targetScore.toFixed(2)}` : alert.targetScore.toFixed(2);

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(`🔔 Alert Sentiment Scattato: ${alert.ticker}`, {
          body: `Il punteggio di sentiment aggregato ha raggiunto ${scoreFormatted} (${isAbove ? '≥' : '≤'} ${targetFormatted})!`,
          icon: '/favicon.ico',
          tag: `sentiment-alert-${alert.id}`
        });
      } catch (err) {
        console.warn('Errore invio notifica browser:', err);
      }
    }
  };

  const checkSentimentAlerts = (score: number, currentTicker: string) => {
    const cleanTicker = currentTicker.trim().toUpperCase();
    let triggeredAny = false;

    const updatedAlerts = sentimentAlerts.map(alert => {
      if (alert.ticker.trim().toUpperCase() === cleanTicker && alert.active && !alert.triggered) {
        const isAbove = alert.condition === 'ABOVE';
        const isTriggered = isAbove ? score >= alert.targetScore : score <= alert.targetScore;

        if (isTriggered) {
          triggeredAny = true;

          playAlertChime();
          triggerBrowserPushNotification(alert, score);

          const toastId = `sent_${Date.now()}_${alert.id}`;
          setActiveToasts(prev => [
            {
              id: toastId,
              alert: {
                ticker: alert.ticker,
                targetScore: alert.targetScore,
                condition: alert.condition,
                type: 'sentiment'
              },
              currentPrice: score,
              timestamp: new Date().toLocaleTimeString('it-IT')
            },
            ...prev
          ]);

          return {
            ...alert,
            triggered: true,
            lastTriggeredScore: score,
            lastTriggeredAt: new Date().toISOString()
          };
        }
      }
      return alert;
    });

    if (triggeredAny) {
      setSentimentAlerts(updatedAlerts);
      storageService.saveSentimentAlerts(updatedAlerts);
    }
  };

  const loadNewsAndSentiment = async (categoryToUse: string = selectedCategory) => {
    setLoadingNews(true);
    setLoadingHistory(true);
    try {
      const feed = await marketDataService.getNewsFeed(ticker, categoryToUse);
      setNews(feed);
      const analysis = await geminiService.analyzeNewsSentiment(feed, ticker);
      setSentiment(analysis);

      if (analysis && typeof analysis.sentiment_score === 'number') {
        checkSentimentAlerts(analysis.sentiment_score, ticker);
      }

      geminiService.get30DaySentimentHistory(ticker).then(hist => {
        setSentimentHistory(hist);
        setLoadingHistory(false);
      }).catch(err => {
        console.warn('Errore storico sentiment:', err);
        setLoadingHistory(false);
      });

      setLoadingReport(true);
      const bbReport = await geminiService.generateBullishBearishReport(feed, ticker, customPrompt || undefined);
      setReport(bbReport);

      if (bbReport) {
        const netScore = (bbReport.bullish_score - bbReport.bearish_score) / 100;
        checkSentimentAlerts(netScore, ticker);
      }
    } catch (e) {
      console.error('Errore caricamento news e AI:', e);
    } finally {
      setLoadingNews(false);
      setLoadingReport(false);
      setLoadingHistory(false);
    }
  };

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    loadNewsAndSentiment(categoryId);
  };

  const handleGenerateReport = async () => {
    setLoadingReport(true);
    try {
      const currentNews = news.length > 0 ? news : await marketDataService.getNewsFeed(ticker, selectedCategory);
      if (news.length === 0) setNews(currentNews);
      const bbReport = await geminiService.generateBullishBearishReport(currentNews, ticker, customPrompt || undefined);
      setReport(bbReport);
    } catch (e) {
      console.error('Errore generazione report Bullish vs Bearish:', e);
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(() => {
    loadNewsAndSentiment(selectedCategory);
  }, [ticker]);

  const handleAddSentimentAlert = (newAlert: Omit<SentimentAlert, 'id' | 'createdAt' | 'triggered'>) => {
    const alertItem: SentimentAlert = {
      ...newAlert,
      id: `sent_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
      triggered: false
    };
    const updated = [alertItem, ...sentimentAlerts];
    setSentimentAlerts(updated);
    storageService.saveSentimentAlerts(updated);

    if (sentiment && typeof sentiment.sentiment_score === 'number') {
      checkSentimentAlerts(sentiment.sentiment_score, newAlert.ticker);
    }
  };

  const handleRemoveSentimentAlert = (id: string) => {
    const updated = sentimentAlerts.filter(a => a.id !== id);
    setSentimentAlerts(updated);
    storageService.saveSentimentAlerts(updated);
  };

  const handleToggleSentimentAlert = (id: string) => {
    const updated = sentimentAlerts.map(a =>
      a.id === id ? { ...a, active: !a.active } : a
    );
    setSentimentAlerts(updated);
    storageService.saveSentimentAlerts(updated);
  };

  const handleResetSentimentAlert = (id: string) => {
    const updated = sentimentAlerts.map(a =>
      a.id === id ? { ...a, triggered: false, active: true } : a
    );
    setSentimentAlerts(updated);
    storageService.saveSentimentAlerts(updated);
  };

  const handleClearAllSentimentAlerts = () => {
    setSentimentAlerts([]);
    storageService.saveSentimentAlerts([]);
  };

  const handleRequestPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const perm = await Notification.requestPermission();
      setNotificationPermission(perm);
    }
  };

  const handleTestNotification = () => {
    playAlertChime();
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(`🔔 Test Notifica Sentiment: ${ticker}`, {
        body: `Test completato! Riceverai un avviso appena il sentiment su ${ticker} supererà la soglia impostata.`,
        icon: '/favicon.ico'
      });
    }
    setActiveToasts(prev => [
      {
        id: `test_${Date.now()}`,
        alert: {
          ticker,
          targetScore: 0.50,
          condition: 'ABOVE',
          type: 'sentiment'
        },
        currentPrice: 0.65,
        timestamp: new Date().toLocaleTimeString('it-IT')
      },
      ...prev
    ]);
  };

  const filteredNews = news.filter(n =>
    n.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
    n.publisher.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const handleCopyReport = () => {
    if (!report) return;
    const textToCopy = `📈 REPORT BULLISH VS BEARISH - ${report.ticker}
Data: ${new Date(report.timestamp).toLocaleString('it-IT')}
Consensus: ${report.consensus} (Affidabilità: ${report.confidence_pct}%)
Score: Rialzista (Bullish) ${report.bullish_score}% vs Ribassista (Bearish) ${report.bearish_score}%

SINTESI ESECUTIVA:
${report.executive_summary}

🟢 CATALIZZATORI RIALZISTI:
${report.bullish_catalysts.map(c => `• ${c}`).join('\n')}

🔴 FATTORI DI RISCHIO RIBASSISTI:
${report.bearish_risks.map(r => `• ${r}`).join('\n')}

🎯 TAKEAWAY OPERATIVO PER IL TRADER:
${report.trader_takeaway}
`;

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getConsensusColor = (consensus: string) => {
    if (consensus.includes('FORTE SEGNALE RIALZISTA')) return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30';
    if (consensus.includes('MODERATAMENTE RIALZISTA')) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (consensus.includes('RIBASSISTA')) return 'text-rose-500 bg-rose-500/10 border-rose-500/30';
    return 'text-amber-500 bg-amber-500/10 border-amber-500/30';
  };

  const activeSentimentAlertsCount = sentimentAlerts.filter(a => a.active && !a.triggered).length;
  const currentTickerClean = ticker.trim().toUpperCase();
  const currentTickerActiveAlerts = sentimentAlerts.filter(
    a => a.ticker.trim().toUpperCase() === currentTickerClean && a.active && !a.triggered
  );
  const currentSentimentScore = sentiment?.sentiment_score ?? (report ? (report.bullish_score - report.bearish_score) / 100 : 0);

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[var(--bg-main)]">
      <div className="max-w-7xl mx-auto space-y-5">
        {/* Top Header Banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)]">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center p-1.5 rounded-lg bg-blue-600/10 text-blue-500 border border-blue-500/20">
                <Sparkles className="w-5 h-5 text-blue-500" />
              </span>
              <div>
                <h2 className="text-base font-bold text-[var(--text-main)] flex items-center gap-2">
                  <span>NewsAI Hub & Report Sentiment LLM</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/15 text-blue-500 border border-blue-500/30">
                    Gemini 1.5 Flash
                  </span>
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Aggregazione e sintesi quantitativa delle notizie finanziarie su <span className="font-semibold text-blue-500">{ticker}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAlertsModalOpen(true)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border font-bold text-xs transition cursor-pointer ${
                activeSentimentAlertsCount > 0
                  ? 'bg-amber-500/15 border-amber-500 text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'border-[var(--border-color)] bg-[var(--bg-main)] hover:bg-[var(--bg-header)] text-[var(--text-main)]'
              }`}
              title="Configura Alert di Sentiment e Notifiche Push"
            >
              <Bell className="w-4 h-4 text-amber-500" />
              <span>Alert Sentiment</span>
              {activeSentimentAlertsCount > 0 && (
                <span className="flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-amber-500 text-white text-[9px] font-bold">
                  {activeSentimentAlertsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setShowPromptInput(!showPromptInput)}
              className="px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] hover:bg-[var(--bg-header)] text-[var(--text-main)] font-semibold text-xs transition cursor-pointer"
              title="Personalizza il focus dell'analisi AI"
            >
              ⚙️ Focus Analisi
            </button>

            <button
              onClick={handleGenerateReport}
              disabled={loadingReport || loadingNews}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold text-xs transition shadow-md shadow-blue-500/20 cursor-pointer"
            >
              <Sparkles className={`w-4 h-4 ${loadingReport ? 'animate-spin' : 'text-amber-300'}`} />
              <span>{loadingReport ? 'Generazione Report LLM...' : '✨ Analizza Bullish vs Bearish'}</span>
            </button>

            <button
              onClick={() => loadNewsAndSentiment(selectedCategory)}
              disabled={loadingNews || loadingReport}
              className="p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] hover:bg-[var(--bg-header)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition cursor-pointer"
              title="Ricarica feed notizie"
            >
              <RefreshCw className={`w-4 h-4 ${loadingNews ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Optional Custom Prompt Drawer */}
        {showPromptInput && (
          <div className="p-3.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] flex flex-col gap-2">
            <label className="text-xs font-semibold text-[var(--text-muted)] flex items-center gap-1.5">
              <span>🎯 Focus personalizzato per l'LLM (es. impatto tassi, trimestrale imminente, prospettive dividendi):</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customPrompt}
                onChange={e => setCustomPrompt(e.target.value)}
                placeholder="Es: Concentrati sull'impatto delle recenti mosse delle banche centrali e sul potenziale upside dei prezzi..."
                className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] outline-none"
              />
              <button
                onClick={handleGenerateReport}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer"
              >
                Applica & Genera
              </button>
            </div>
          </div>
        )}

        {/* SELETTORE FILTRI PER CATEGORIA */}
        <div className="p-3.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider flex items-center gap-1.5">
                <span>Filtra Notizie per Categoria</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 font-semibold border border-blue-500/20">
                NewsAPI / RSS
              </span>
            </div>
            <span className="text-[11px] text-[var(--text-muted)] hidden sm:inline">
              Filtra il flusso informativo prima dell'analisi di sentiment Gemini AI
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {NEWS_CATEGORIES.map(cat => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => handleCategorySelect(cat.id)}
                  disabled={loadingNews}
                  title={cat.desc}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer border ${
                    isSelected
                      ? 'bg-blue-600 border-blue-600 text-white shadow-xs font-semibold'
                      : 'bg-[var(--bg-main)] border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-header)]'
                  } disabled:opacity-50`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* REPORT BULLISH VS BEARISH */}
        {report ? (
          <div className="p-5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-color)] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500 border border-purple-500/20">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[var(--text-main)] flex items-center gap-2">
                    <span>Report Aggregato Sentiment: Bullish vs Bearish</span>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-[var(--input-bg)] text-[var(--text-main)] border border-[var(--border-color)]">
                      {report.ticker}
                    </span>
                  </h3>
                  <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-2 mt-0.5">
                    <span>{report.evaluated_articles_count} fonti analizzate da Gemini AI</span>
                    <span>•</span>
                    <span>{new Date(report.timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${getConsensusColor(report.consensus)}`}>
                  {report.consensus}
                </span>

                <button
                  onClick={handleCopyReport}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] hover:bg-[var(--bg-header)] text-xs text-[var(--text-main)] transition cursor-pointer"
                  title="Copia report negli appunti"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-500 font-semibold">Copiato!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                      <span>Copia</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Bullish vs Bearish Meter */}
            <div className="p-4 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <div className="flex items-center gap-1.5 text-emerald-500">
                  <TrendingUp className="w-4 h-4" />
                  <span>BULLISH: {report.bullish_score}%</span>
                </div>
                <div className="text-[11px] text-[var(--text-muted)] font-medium font-mono">
                  Indice di Confidenza: <span className="text-[var(--text-main)] font-bold">{report.confidence_pct}%</span>
                </div>
                <div className="flex items-center gap-1.5 text-rose-500">
                  <span>BEARISH: {report.bearish_score}%</span>
                  <TrendingDown className="w-4 h-4" />
                </div>
              </div>

              <div className="h-3.5 w-full bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden flex p-0.5 border border-[var(--border-color)]">
                <div
                  className="h-full bg-emerald-500 rounded-l-full transition-all duration-700 shadow-xs"
                  style={{ width: `${report.bullish_score}%` }}
                  title={`Bullish: ${report.bullish_score}%`}
                />
                <div
                  className="h-full bg-rose-500 rounded-r-full transition-all duration-700 shadow-xs"
                  style={{ width: `${report.bearish_score}%` }}
                  title={`Bearish: ${report.bearish_score}%`}
                />
              </div>

              {currentTickerActiveAlerts.length > 0 && (
                <div className="pt-2 flex flex-wrap items-center gap-2 text-[11px] border-t border-[var(--border-color)]">
                  <span className="font-semibold text-[var(--text-muted)] flex items-center gap-1">
                    <Bell className="w-3 h-3 text-amber-500" />
                    <span>Soglie Alert Attive su {ticker}:</span>
                  </span>
                  {currentTickerActiveAlerts.map(a => (
                    <span
                      key={a.id}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                        a.condition === 'ABOVE'
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                          : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {a.condition === 'ABOVE' ? '≥' : '≤'} {a.targetScore >= 0 ? `+${a.targetScore.toFixed(2)}` : a.targetScore.toFixed(2)}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Sintesi Esecutiva */}
            <div className="p-3.5 rounded-lg bg-[var(--bg-main)] border border-[var(--border-color)] space-y-1">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-blue-500" />
                <span>Sintesi Esecutiva & Trend Atteso</span>
              </h4>
              <p className="text-xs leading-relaxed text-[var(--text-main)]">
                {report.executive_summary}
              </p>
            </div>

            {/* 5 Pilastri Quantitativi & Stime Target Price */}
            <div className="p-4 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border-color)]">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-500" />
                  <h4 className="font-bold text-xs uppercase tracking-wide text-[var(--text-main)]">
                    Audit Quantitativo su 5 Fattori di Mercato (Gemini AI Scoring)
                  </h4>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-500 text-[10px] font-mono font-bold">
                  <span>Rischio/Rendimento:</span>
                  <span className="text-emerald-500">{report.risk_reward_score || 3.8} / 5.0</span>
                </div>
              </div>

              {/* Grid 5 Fattori */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
                <div className="p-2.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] space-y-1">
                  <span className="text-[10px] text-[var(--text-muted)] block font-semibold">Macro & Tassi</span>
                  <div className="flex items-baseline justify-between font-mono">
                    <strong className="text-base text-blue-500">{report.macro_score ?? 68}</strong>
                    <span className="text-[10px] text-[var(--text-muted)]">/ 100</span>
                  </div>
                  <div className="w-full bg-[var(--border-color)] h-1 rounded-full overflow-hidden">
                    <div className="bg-blue-500 h-full rounded-full" style={{ width: `${report.macro_score ?? 68}%` }} />
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] space-y-1">
                  <span className="text-[10px] text-[var(--text-muted)] block font-semibold">Utili & Free Cash Flow</span>
                  <div className="flex items-baseline justify-between font-mono">
                    <strong className="text-base text-emerald-500">{report.financials_score ?? 76}</strong>
                    <span className="text-[10px] text-[var(--text-muted)]">/ 100</span>
                  </div>
                  <div className="w-full bg-[var(--border-color)] h-1 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${report.financials_score ?? 76}%` }} />
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] space-y-1">
                  <span className="text-[10px] text-[var(--text-muted)] block font-semibold">Sentiment Retail/Social</span>
                  <div className="flex items-baseline justify-between font-mono">
                    <strong className="text-base text-purple-500">{report.sentiment_score ?? report.bullish_score}</strong>
                    <span className="text-[10px] text-[var(--text-muted)]">/ 100</span>
                  </div>
                  <div className="w-full bg-[var(--border-color)] h-1 rounded-full overflow-hidden">
                    <div className="bg-purple-500 h-full rounded-full" style={{ width: `${report.sentiment_score ?? report.bullish_score}%` }} />
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] space-y-1">
                  <span className="text-[10px] text-[var(--text-muted)] block font-semibold">Tecnico & Momentum</span>
                  <div className="flex items-baseline justify-between font-mono">
                    <strong className="text-base text-amber-500">{report.technical_score ?? 72}</strong>
                    <span className="text-[10px] text-[var(--text-muted)]">/ 100</span>
                  </div>
                  <div className="w-full bg-[var(--border-color)] h-1 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full rounded-full" style={{ width: `${report.technical_score ?? 72}%` }} />
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] space-y-1">
                  <span className="text-[10px] text-[var(--text-muted)] block font-semibold">Catalizzatori & News</span>
                  <div className="flex items-baseline justify-between font-mono">
                    <strong className="text-base text-cyan-500">{report.catalyst_score ?? 66}</strong>
                    <span className="text-[10px] text-[var(--text-muted)]">/ 100</span>
                  </div>
                  <div className="w-full bg-[var(--border-color)] h-1 rounded-full overflow-hidden">
                    <div className="bg-cyan-500 h-full rounded-full" style={{ width: `${report.catalyst_score ?? 66}%` }} />
                  </div>
                </div>
              </div>

              {/* Price Targets Proiettivi */}
              {(report.target_3m || report.target_6m || report.target_12m) && (
                <div className="pt-2 border-t border-[var(--border-color)] flex flex-wrap items-center justify-between gap-3 text-xs">
                  <span className="font-semibold text-[var(--text-muted)]">Stime Price Target del Modello:</span>
                  <div className="flex items-center gap-4 font-mono">
                    {report.target_3m && (
                      <span>3 Mesi: <strong className="text-blue-500 font-bold">{report.target_3m.toFixed(2)}</strong></span>
                    )}
                    {report.target_6m && (
                      <span>6 Mesi: <strong className="text-emerald-500 font-bold">{report.target_6m.toFixed(2)}</strong></span>
                    )}
                    {report.target_12m && (
                      <span>12 Mesi: <strong className="text-indigo-500 font-bold">{report.target_12m.toFixed(2)}</strong></span>
                    )}
                    {report.target_confidence_low && report.target_confidence_high && (
                      <span className="text-[10px] text-[var(--text-muted)]">
                        (Intervallo 90%: {report.target_confidence_low.toFixed(2)} - {report.target_confidence_high.toFixed(2)})
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 2 Colonne */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-2.5">
                <div className="flex items-center gap-2 pb-1 border-b border-emerald-500/20">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <h4 className="font-bold text-xs text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                    Catalizzatori Rialzisti (Bullish Drivers)
                  </h4>
                </div>
                <ul className="space-y-2">
                  {report.bullish_catalysts.map((catalyst, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-[var(--text-main)]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="leading-snug">{catalyst}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/20 space-y-2.5">
                <div className="flex items-center gap-2 pb-1 border-b border-rose-500/20">
                  <ShieldAlert className="w-4 h-4 text-rose-500" />
                  <h4 className="font-bold text-xs text-rose-600 dark:text-rose-400 uppercase tracking-wide">
                    Fattori di Rischio & Pressioni (Bearish Headwinds)
                  </h4>
                </div>
                <ul className="space-y-2">
                  {report.bearish_risks.map((risk, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-[var(--text-main)]">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                      <span className="leading-snug">{risk}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Takeaway Operativo */}
            <div className="p-3.5 rounded-lg bg-blue-500/5 border border-blue-500/25 flex items-start gap-2.5">
              <span className="p-1 rounded bg-blue-500/15 text-blue-500 mt-0.5">
                🎯
              </span>
              <div className="space-y-0.5">
                <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                  Takeaway Operativo per il Trader:
                </span>
                <p className="text-xs text-[var(--text-main)] leading-relaxed font-medium">
                  {report.trader_takeaway}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] text-center space-y-3">
            <Sparkles className="w-8 h-8 text-blue-500 mx-auto animate-pulse" />
            <div className="text-xs text-[var(--text-muted)] font-medium">
              Elaborazione del report riassuntivo Bullish vs Bearish con Gemini AI in corso...
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* SEZIONE AUDIT MULTIMODALE REPORT FINANZIARI & PDF         */}
        {/* ======================================================== */}
        <div className="p-5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-color)] pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[var(--text-main)] flex items-center gap-2">
                  <span>📄 Audit Multimodale Report Finanziari & PDF</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-600/10 text-blue-500 border border-blue-500/20 font-bold">
                    Gemini AI Vision & Doc Analytics
                  </span>
                </h3>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  Carica un report PDF trimestrale / 10-K o seleziona un bilancio societario per l'analisi forense quantitativa automatica.
                </p>
              </div>
            </div>

            {/* Upload Button */}
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] hover:bg-[var(--bg-header)] text-xs text-[var(--text-main)] font-semibold transition cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-blue-500" />
                <span>{auditFileName ? `File: ${auditFileName.slice(0, 16)}...` : 'Carica PDF / Bilancio'}</span>
                <input
                  type="file"
                  accept="application/pdf,text/plain"
                  onChange={handleUploadFinancialDoc}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Quick Select Presets */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-[var(--text-muted)] font-semibold">Report di Esempio Rapidi:</span>
            <button
              onClick={() => handleRunSampleAudit('Enel S.p.A. - Relazione Q3', 'ENEL.MI', 'Q3 2026')}
              disabled={loadingAudit}
              className={`px-2.5 py-1 rounded-lg border transition cursor-pointer font-medium ${
                selectedAuditReportName.includes('Enel')
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-[var(--bg-main)] border-[var(--border-color)] text-[var(--text-main)] hover:bg-[var(--bg-header)]'
              }`}
            >
              🇮🇹 Enel Q3 (FCF & Transizione)
            </button>
            <button
              onClick={() => handleRunSampleAudit('NVIDIA Corp. - Q4 Earnings Release', 'NVDA', 'Q4 FY2026')}
              disabled={loadingAudit}
              className={`px-2.5 py-1 rounded-lg border transition cursor-pointer font-medium ${
                selectedAuditReportName.includes('NVIDIA')
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-[var(--bg-main)] border-[var(--border-color)] text-[var(--text-main)] hover:bg-[var(--bg-header)]'
              }`}
            >
              🤖 NVIDIA Q4 (Data Center AI)
            </button>
            <button
              onClick={() => handleRunSampleAudit('Apple Inc. - Annual Form 10-K', 'AAPL', 'FY2025/2026')}
              disabled={loadingAudit}
              className={`px-2.5 py-1 rounded-lg border transition cursor-pointer font-medium ${
                selectedAuditReportName.includes('Apple')
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-[var(--bg-main)] border-[var(--border-color)] text-[var(--text-main)] hover:bg-[var(--bg-header)]'
              }`}
            >
              🍏 Apple 10-K (Servizi & Margini)
            </button>
          </div>

          {/* Risultato Audit Finanziario */}
          {loadingAudit ? (
            <div className="p-8 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
              <div className="text-xs text-[var(--text-muted)] font-medium">
                Gemini AI sta analizzando il bilancio, i KPI e i rischi forensi del documento in formato nativo...
              </div>
            </div>
          ) : financialAudit ? (
            <div className="space-y-4 pt-1">
              {/* Header con Verdetto e Score */}
              <div className="p-4 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
                    <span>{financialAudit.report_title}</span>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-[var(--input-bg)] text-[var(--text-muted)] border border-[var(--border-color)]">
                      {financialAudit.period}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    Rating Consigliato: <strong className="text-emerald-500">{financialAudit.analyst_rating}</strong> • Fair Value: <strong className="text-blue-500">{financialAudit.fair_value_estimate}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Verdetto Forense</span>
                    <span className="text-xs font-extrabold px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      {financialAudit.overall_verdict}
                    </span>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-blue-600 text-white font-mono font-extrabold text-lg shadow-sm">
                    {financialAudit.overall_score}/100
                  </div>
                </div>
              </div>

              {/* Sintesi Esecutiva */}
              <div className="p-3.5 rounded-lg bg-[var(--bg-main)] border border-[var(--border-color)]">
                <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider block mb-1">
                  Sintesi Manageriale dell'Audit:
                </span>
                <p className="text-xs leading-relaxed text-[var(--text-main)] font-normal">
                  {financialAudit.executive_summary}
                </p>
              </div>

              {/* 6 KPI Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
                <div className="p-2.5 rounded-lg bg-[var(--bg-main)] border border-[var(--border-color)]">
                  <span className="text-[10px] text-[var(--text-muted)] block font-semibold">Crescita Ricavi</span>
                  <strong className="text-xs font-mono text-emerald-500 mt-1 block">{financialAudit.kpis.revenue_growth_yoy}</strong>
                </div>
                <div className="p-2.5 rounded-lg bg-[var(--bg-main)] border border-[var(--border-color)]">
                  <span className="text-[10px] text-[var(--text-muted)] block font-semibold">Margine Operativo</span>
                  <strong className="text-xs font-mono text-blue-500 mt-1 block">{financialAudit.kpis.operating_margin}</strong>
                </div>
                <div className="p-2.5 rounded-lg bg-[var(--bg-main)] border border-[var(--border-color)]">
                  <span className="text-[10px] text-[var(--text-muted)] block font-semibold">Free Cash Flow</span>
                  <strong className="text-xs font-mono text-indigo-500 mt-1 block">{financialAudit.kpis.free_cash_flow}</strong>
                </div>
                <div className="p-2.5 rounded-lg bg-[var(--bg-main)] border border-[var(--border-color)]">
                  <span className="text-[10px] text-[var(--text-muted)] block font-semibold">Debito / EBITDA</span>
                  <strong className="text-xs font-mono text-amber-500 mt-1 block">{financialAudit.kpis.net_debt_ebitda}</strong>
                </div>
                <div className="p-2.5 rounded-lg bg-[var(--bg-main)] border border-[var(--border-color)]">
                  <span className="text-[10px] text-[var(--text-muted)] block font-semibold">EPS vs Stime</span>
                  <strong className="text-xs font-mono text-emerald-500 mt-1 block">{financialAudit.kpis.eps_actual_vs_estimate}</strong>
                </div>
                <div className="p-2.5 rounded-lg bg-[var(--bg-main)] border border-[var(--border-color)]">
                  <span className="text-[10px] text-[var(--text-muted)] block font-semibold">Guidance Futura</span>
                  <strong className="text-[11px] font-sans text-[var(--text-main)] mt-1 block line-clamp-2">{financialAudit.kpis.future_guidance}</strong>
                </div>
              </div>

              {/* Punti di Forza e Red Flags */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Punti di Forza Strutturali</span>
                  </div>
                  <ul className="space-y-1.5">
                    {financialAudit.strengths.map((s, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-[var(--text-main)]">
                        <span className="text-emerald-500 shrink-0">•</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-3.5 rounded-xl bg-rose-500/5 border border-rose-500/20 space-y-2">
                  <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-bold text-xs uppercase">
                    <ShieldAlert className="w-4 h-4" />
                    <span>Red Flags & Attenzioni Forensi</span>
                  </div>
                  <ul className="space-y-1.5">
                    {financialAudit.red_flags.map((rf, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-[var(--text-main)]">
                        <span className="text-rose-500 shrink-0">⚠️</span>
                        <span>{rf}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Takeaway Strategico */}
              <div className="p-3.5 rounded-lg bg-indigo-500/10 border border-indigo-500/25 flex items-start gap-2.5">
                <Award className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
                    Conclusioni Operative di Portafoglio:
                  </span>
                  <p className="text-xs text-[var(--text-main)] mt-0.5 font-medium">
                    {financialAudit.strategic_takeaway}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-5 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] text-center space-y-2">
              <FileSpreadsheet className="w-6 h-6 text-[var(--text-muted)] mx-auto" />
              <p className="text-xs text-[var(--text-muted)]">
                Clicca su uno dei report di esempio in alto o trascina un file PDF per avviare l'audit intelligente con Gemini AI.
              </p>
            </div>
          )}
        </div>

        {/* GRAFICO STORICO SENTIMENT 30 GIORNI */}
        <SentimentHistoryChart
          data={sentimentHistory}
          isLoading={loadingHistory}
          ticker={ticker}
        />

        {/* SEZIONE NOTIZIE DETTAGLIATE */}
        <div className="p-5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] flex flex-col shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-color)] pb-3">
            <div className="flex items-center gap-2">
              <Newspaper className="w-4 h-4 text-blue-500" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-[var(--text-main)] flex items-center gap-2">
                <span>Feed Notizie Finanziarie in Tempo Reale ({filteredNews.length})</span>
                <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20">
                  {NEWS_CATEGORIES.find(c => c.id === selectedCategory)?.icon} {NEWS_CATEGORIES.find(c => c.id === selectedCategory)?.label}
                </span>
              </h3>
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-[var(--text-muted)]" />
              <input
                type="text"
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
                placeholder="Filtra notizie..."
                className="pl-8 pr-3 py-1 text-xs rounded-lg border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] outline-none w-48"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
            {filteredNews.length > 0 ? (
              filteredNews.map((item, idx) => (
                <a
                  key={idx}
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded-lg bg-[var(--bg-main)] hover:bg-[var(--bg-header)] border border-[var(--border-color)] hover:border-blue-500/50 transition group flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="text-xs font-semibold text-[var(--text-main)] group-hover:text-blue-500 transition leading-snug">
                      {item.title}
                    </h4>
                    <ExternalLink className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-blue-500 shrink-0 mt-0.5" />
                  </div>
                  <div className="flex items-center gap-3 mt-3 text-[11px] text-[var(--text-muted)]">
                    <span className="font-semibold px-2 py-0.5 rounded bg-[var(--input-bg)] text-[var(--text-muted)]">
                      {item.publisher}
                    </span>
                    {item.time && <span>{item.time}</span>}
                  </div>
                </a>
              ))
            ) : (
              <div className="col-span-2 py-8 text-center text-xs text-[var(--text-muted)]">
                Nessuna notizia trovata per i criteri specificati.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modale Gestione Alert di Sentiment */}
      <SentimentAlertsModal
        isOpen={isAlertsModalOpen}
        onClose={() => setIsAlertsModalOpen(false)}
        currentTicker={ticker}
        currentSentimentScore={currentSentimentScore}
        alerts={sentimentAlerts}
        onAddAlert={handleAddSentimentAlert}
        onRemoveAlert={handleRemoveSentimentAlert}
        onToggleAlert={handleToggleSentimentAlert}
        onResetAlert={handleResetSentimentAlert}
        onClearAllAlerts={handleClearAllSentimentAlerts}
        onTestNotification={handleTestNotification}
        notificationPermission={notificationPermission}
        onRequestPermission={handleRequestPermission}
      />

      {/* Floating Toast Notifications */}
      <PriceAlertToast
        notifications={activeToasts}
        onDismiss={id => setActiveToasts(prev => prev.filter(t => t.id !== id))}
      />
    </div>
  );
};
