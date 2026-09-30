import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, ExternalLink, Search, Newspaper, CheckCircle2 } from 'lucide-react';
import { NewsItem, SentimentAnalysis } from '../types';
import { marketDataService } from '../services/marketDataService';
import { geminiService } from '../services/geminiService';

interface NewsAiPageProps {
  ticker: string;
  category: string;
}

export const NewsAiPage: React.FC<NewsAiPageProps> = ({ ticker, category }) => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [sentiment, setSentiment] = useState<SentimentAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  const loadNewsAndSentiment = async () => {
    setLoading(true);
    try {
      const feed = await marketDataService.getNewsFeed(ticker, category);
      setNews(feed);
      const analysis = await geminiService.analyzeNewsSentiment(feed, ticker);
      setSentiment(analysis);
    } catch (e) {
      console.error('Errore caricamento news e AI:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNewsAndSentiment();
  }, [ticker, category]);

  const filteredNews = news.filter(n =>
    n.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
    n.publisher.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const getScoreColor = (score: number) => {
    if (score >= 0.3) return '#089981';
    if (score <= -0.3) return '#f23645';
    return '#787b86';
  };

  // Convert -1.0..+1.0 score to percentage 0..100%
  const scorePercent = sentiment ? Math.min(Math.max(((sentiment.sentiment_score + 1) / 2) * 100, 0), 100) : 50;

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[var(--bg-main)]">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Top Header Banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)]">
          <div>
            <h2 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
              <Newspaper className="w-5 h-5 text-blue-500" />
              <span>Notizie di Mercato & Sentiment Analysis Gemini AI</span>
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Monitoraggio in tempo reale del flusso informativo su <span className="font-semibold text-blue-500">{ticker}</span> e macroeconomia
            </p>
          </div>

          <button
            onClick={loadNewsAndSentiment}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs transition shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Elaborazione AI...' : 'Aggiorna Notizie & AI'}</span>
          </button>
        </div>

        {/* 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Card Sinistra: Gemini AI Sentiment Report */}
          <div className="lg:col-span-5 p-5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] flex flex-col gap-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-500" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-[var(--text-main)]">
                  Gemini AI Macro Sentiment
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-500 border border-blue-500/30">
                {ticker}
              </span>
            </div>

            {/* Score & Gauge */}
            {sentiment ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span
                    className="px-2.5 py-1 rounded text-xs font-bold border"
                    style={{
                      backgroundColor: `${getScoreColor(sentiment.sentiment_score)}20`,
                      borderColor: getScoreColor(sentiment.sentiment_score),
                      color: getScoreColor(sentiment.sentiment_score)
                    }}
                  >
                    {sentiment.sentiment_label}
                  </span>
                  <div className="font-mono text-base font-bold text-[var(--text-main)]">
                    Score: {sentiment.sentiment_score > 0 ? `+${sentiment.sentiment_score.toFixed(2)}` : sentiment.sentiment_score.toFixed(2)}
                  </div>
                </div>

                {/* Score Bar Meter */}
                <div className="space-y-1">
                  <div className="h-2.5 w-full bg-[var(--input-bg)] rounded-full overflow-hidden border border-[var(--border-color)]">
                    <div
                      className="h-full transition-all duration-500"
                      style={{
                        width: `${scorePercent}%`,
                        backgroundColor: getScoreColor(sentiment.sentiment_score)
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-[var(--text-muted)] font-mono">
                    <span>-1.0 (Ribassista)</span>
                    <span>0.0 (Neutrale)</span>
                    <span>+1.0 (Rialzista)</span>
                  </div>
                </div>

                {/* Sintesi Discorsiva */}
                <div className="space-y-1.5 pt-2">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    Sintesi Strategica & Trend Atteso:
                  </h4>
                  <p className="text-xs leading-relaxed text-[var(--text-main)] bg-[var(--bg-main)] p-3 rounded-lg border border-[var(--border-color)]">
                    {sentiment.summary}
                  </p>
                </div>

                {/* Driver Principali */}
                <div className="space-y-1.5 pt-1">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    Fattori Chiave (Catalysts):
                  </h4>
                  <ul className="space-y-1.5 text-xs text-[var(--text-main)]">
                    {sentiment.key_drivers.map((driver, idx) => (
                      <li key={idx} className="flex items-start gap-2 bg-[var(--bg-main)] p-2 rounded border border-[var(--border-color)]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{driver}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-[var(--text-muted)]">
                Caricamento analisi sentiment con Gemini AI...
              </div>
            )}
          </div>

          {/* Card Destra: Feed Notizie in Tempo Reale */}
          <div className="lg:col-span-7 p-5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] flex flex-col shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-color)] pb-3 mb-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-[var(--text-main)]">
                Feed Notizie Finanziarie in Tempo Reale
              </h3>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={e => setSearchFilter(e.target.value)}
                  placeholder="Cerca notizie..."
                  className="pl-8 pr-3 py-1 text-xs rounded-lg border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] outline-none w-44"
                />
              </div>
            </div>

            <div className="space-y-2.5 overflow-y-auto max-h-[600px] pr-1">
              {filteredNews.length > 0 ? (
                filteredNews.map((item, idx) => (
                  <a
                    key={idx}
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-3 rounded-lg bg-[var(--bg-main)] hover:bg-[var(--bg-header)] border border-[var(--border-color)] hover:border-blue-500/50 transition group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h4 className="text-xs font-semibold text-[var(--text-main)] group-hover:text-blue-500 transition leading-snug">
                        {item.title}
                      </h4>
                      <ExternalLink className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-blue-500 shrink-0 mt-0.5" />
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-[var(--text-muted)]">
                      <span className="font-semibold px-2 py-0.5 rounded bg-[var(--input-bg)] text-[var(--text-muted)]">
                        {item.publisher}
                      </span>
                      {item.time && <span>{item.time}</span>}
                    </div>
                  </a>
                ))
              ) : (
                <div className="py-12 text-center text-xs text-[var(--text-muted)]">
                  Nessuna notizia trovata con i filtri correnti.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
