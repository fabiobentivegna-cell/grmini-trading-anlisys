/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { StatusBar } from './components/StatusBar';
import { IndicatorsModal } from './components/IndicatorsModal';
import { ApiHubModal } from './components/ApiHubModal';
import { PriceAlertsModal } from './components/PriceAlertsModal';
import { PriceAlertToast, AlertNotificationItem } from './components/PriceAlertToast';
import { WatchlistPanel } from './components/WatchlistPanel';

import { ChartPage } from './pages/ChartPage';
import { NewsAiPage } from './pages/NewsAiPage';
import { FundamentalPage } from './pages/FundamentalPage';
import { CalendarPage } from './pages/CalendarPage';
import { CorrelationsPage } from './pages/CorrelationsPage';
import { InflationPage } from './pages/InflationPage';

import { CandleData, IndicatorConfig, OverlayConfig, PageId, PriceAlert, WatchlistItem } from './types';
import { storageService, DEFAULT_INDICATOR_CONFIG, DEFAULT_WATCHLIST } from './services/storageService';
import { marketDataService } from './services/marketDataService';
import { playAlertChime } from './services/soundService';
import { DEFAULT_PAGE_ID } from './config/pages';
import { ASSET_CATALOG } from './config/catalog';

export default function App() {
  const [activePage, setActivePage] = useState<PageId>(DEFAULT_PAGE_ID);
  const [category, setCategory] = useState<string>('Mercato Italiano (FTSE MIB)');
  const [ticker, setTicker] = useState<string>('FTSEMIB.MI');
  const [interval, setInterval] = useState<string>('1d');
  const [chartType, setChartType] = useState<'candlestick' | 'line' | 'heikin_ashi'>('candlestick');

  const [theme, setTheme] = useState<'dark' | 'light'>(() => storageService.getTheme());
  const [indicatorConfig, setIndicatorConfig] = useState<IndicatorConfig>(() =>
    storageService.getIndicatorConfig()
  );

  const [isIndicatorsOpen, setIsIndicatorsOpen] = useState(false);
  const [isApiHubOpen, setIsApiHubOpen] = useState(false);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [isWatchlistOpen, setIsWatchlistOpen] = useState(false);

  // Chart Overlays & Performance Correlation state
  const [overlays, setOverlays] = useState<OverlayConfig[]>(() => storageService.getChartOverlays());
  const [isOverlayModalOpen, setIsOverlayModalOpen] = useState(false);


  // Watchlist State
  const [watchlistSymbols, setWatchlistSymbols] = useState<string[]>(() => storageService.getWatchlist());
  const [watchlistQuotes, setWatchlistQuotes] = useState<WatchlistItem[]>([]);
  const [isWatchlistRefreshing, setIsWatchlistRefreshing] = useState(false);

  // Price Alerts & Browser Notifications state
  const [alerts, setAlerts] = useState<PriceAlert[]>(() => storageService.getPriceAlerts());
  const [activeToasts, setActiveToasts] = useState<AlertNotificationItem[]>([]);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'unsupported';
  });

  const [drawColor, setDrawColor] = useState('#2962ff');
  const [drawWidth, setDrawWidth] = useState(2);

  // Live Refresh interval cycle: 5s -> 10s -> 30s -> 0 (OFF) -> 5s
  const [liveRefreshSeconds, setLiveRefreshSeconds] = useState(5);
  const liveIntervals = [5, 10, 30, 0];

  // Market Candles data
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [statusText, setStatusText] = useState('Pronto');
  const [isError, setIsError] = useState(false);

  // Status Bar OHLC
  const [ohlc, setOhlc] = useState<{ open: number | string; high: number | string; low: number | string; close: number | string }>({
    open: '-',
    high: '-',
    low: '-',
    close: '-'
  });

  const [maHoverValues, setMaHoverValues] = useState<Record<string, number | string>>({});
  const [scrollToRealTimeTrigger, setScrollToRealTimeTrigger] = useState<number>(0);

  const liveTimerRef = useRef<any>(null);

  // Apply body theme class
  useEffect(() => {
    document.body.classList.toggle('dark-theme', theme === 'dark');
    storageService.saveTheme(theme);
  }, [theme]);

  // Sync notification permission state
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // Request browser notification permission
  const handleRequestNotificationPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        setNotificationPermission(perm);
        if (perm === 'granted') {
          new Notification('🔔 Notifiche Browser Abilitate', {
            body: 'Riceverai avvisi in tempo reale quando il prezzo dei tuoi asset attraverserà le soglie impostate.'
          });
        }
      } catch (err) {
        console.warn('Impossibile richiedere il permesso di notifica:', err);
      }
    }
  };

  // Helper to trigger browser notification
  const triggerBrowserNotification = useCallback((alert: PriceAlert, currentPrice: number) => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        try {
          const conditionLabel = alert.condition === 'ABOVE' ? 'superato' : 'rotto al ribasso';
          const symbol = alert.condition === 'ABOVE' ? '≥' : '≤';
          const title = `🔔 Allerta Prezzo: ${alert.ticker}`;
          const body = `Il prezzo attuale di ${alert.ticker} (${currentPrice.toFixed(2)}) ha ${conditionLabel} la soglia ${symbol} ${alert.targetPrice.toFixed(2)}!`;

          new Notification(title, {
            body,
            icon: '/favicon.ico',
            tag: `alert-${alert.id}-${Date.now()}`
          });
        } catch (err) {
          console.warn('Notifica nativa non riuscita:', err);
        }
      }
    }
  }, []);

  // Core Price Alert Evaluation Engine
  const checkPriceAlerts = useCallback((currentPrice: number, currentTicker: string) => {
    if (isNaN(currentPrice) || currentPrice <= 0) return;

    setAlerts(prevAlerts => {
      let hasTriggered = false;
      const updatedAlerts = prevAlerts.map(alert => {
        if (alert.active && !alert.triggered && alert.ticker === currentTicker) {
          const isTriggered =
            (alert.condition === 'ABOVE' && currentPrice >= alert.targetPrice) ||
            (alert.condition === 'BELOW' && currentPrice <= alert.targetPrice);

          if (isTriggered) {
            hasTriggered = true;
            // 1. Browser Notification
            triggerBrowserNotification(alert, currentPrice);
            // 2. Play Web Audio Chime
            playAlertChime();
            // 3. Trigger In-App Floating Toast
            const newToast: AlertNotificationItem = {
              id: `toast_${Date.now()}_${Math.random()}`,
              alert: { ...alert, triggered: true },
              currentPrice,
              timestamp: new Date().toLocaleTimeString()
            };
            setActiveToasts(toasts => [newToast, ...toasts]);

            return { ...alert, triggered: true };
          }
        }
        return alert;
      });

      if (hasTriggered) {
        storageService.savePriceAlerts(updatedAlerts);
        return updatedAlerts;
      }
      return prevAlerts;
    });
  }, [triggerBrowserNotification]);

  // Load candle data when ticker or interval changes
  const loadMarketData = async (isLiveBackground = false) => {
    if (!isLiveBackground) {
      setStatusText(`Caricamento ${ticker} [${interval.toUpperCase()}]...`);
      setIsError(false);
    }

    try {
      const res = await marketDataService.getCandlestickData(ticker, interval);
      if (res.status === 'success') {
        setCandles(res.candles);
        if (res.candles.length > 0) {
          const last = res.candles[res.candles.length - 1];
          setOhlc({
            open: last.open,
            high: last.high,
            low: last.low,
            close: last.close
          });
          // Check price alerts on initial data load
          checkPriceAlerts(last.close, res.ticker);
        }
        setStatusText(`${res.ticker} [${interval.toUpperCase()}] sincronizzato (${res.candles.length} barre)`);
        setIsError(false);
      } else {
        setStatusText('Errore nel recupero dati');
        setIsError(true);
      }
    } catch (e: any) {
      setStatusText(`Errore: ${e.message || e}`);
      setIsError(true);
    }
  };

  useEffect(() => {
    loadMarketData();
  }, [ticker, interval]);

  // Live auto-refresh timer with real-time API fetch and alert checks
  useEffect(() => {
    if (liveTimerRef.current) window.clearInterval(liveTimerRef.current);

    if (liveRefreshSeconds > 0) {
      liveTimerRef.current = window.setInterval(async () => {
        try {
          const res = await marketDataService.getCandlestickData(ticker, interval);
          if (res.status === 'success' && res.candles.length > 0) {
            setCandles(res.candles);
            const last = res.candles[res.candles.length - 1];
            setOhlc({
              open: last.open,
              high: last.high,
              low: last.low,
              close: last.close
            });
            checkPriceAlerts(last.close, ticker);
          }
        } catch {
          // Smooth fallback drift if offline
          setCandles(prev => {
            if (prev.length === 0) return prev;
            const isIntraday = ['1m', '5m', '15m', '30m', '1h', '4h'].includes(interval);
            const updatedLast = marketDataService.simulateLiveTick(prev[prev.length - 1], ticker, isIntraday);
            setOhlc({
              open: updatedLast.open,
              high: updatedLast.high,
              low: updatedLast.low,
              close: updatedLast.close
            });
            checkPriceAlerts(updatedLast.close, ticker);
            return [...prev.slice(0, -1), updatedLast];
          });
        }

        // Also refresh quotes for all watchlist items in background
        if (watchlistSymbols.length > 0) {
          marketDataService.getWatchlistQuotes(watchlistSymbols).then(setWatchlistQuotes).catch(() => {});
        }
      }, liveRefreshSeconds * 1000);
    }

    return () => {
      if (liveTimerRef.current) window.clearInterval(liveTimerRef.current);
    };
  }, [liveRefreshSeconds, ticker, interval, checkPriceAlerts, watchlistSymbols]);

  // Watchlist methods
  const refreshWatchlistQuotes = useCallback(async (symbolsToFetch = watchlistSymbols) => {
    if (symbolsToFetch.length === 0) return;
    setIsWatchlistRefreshing(true);
    try {
      const quotes = await marketDataService.getWatchlistQuotes(symbolsToFetch);
      setWatchlistQuotes(quotes);
    } catch (err) {
      console.warn('Errore refresh watchlist:', err);
    } finally {
      setIsWatchlistRefreshing(false);
    }
  }, [watchlistSymbols]);

  // Initial load of watchlist quotes
  useEffect(() => {
    refreshWatchlistQuotes(watchlistSymbols);
  }, []);

  // Stable callbacks for Chart hover to prevent re-render destruction cycles
  const handleBarHover = useCallback((bar: { open: number; high: number; low: number; close: number }) => {
    setOhlc(prev => {
      if (
        prev.open === bar.open &&
        prev.high === bar.high &&
        prev.low === bar.low &&
        prev.close === bar.close
      ) {
        return prev;
      }
      return bar;
    });
  }, []);

  const handleMaHover = useCallback((maVals: Record<string, number | string>) => {
    setMaHoverValues(prev => {
      const keysA = Object.keys(prev);
      const keysB = Object.keys(maVals);
      if (keysA.length === keysB.length && keysA.every(k => prev[k] === maVals[k])) {
        return prev;
      }
      return maVals;
    });
  }, []);

  const handleOverlaysChange = useCallback((newOverlays: OverlayConfig[]) => {
    setOverlays(newOverlays);
    storageService.saveChartOverlays(newOverlays);
  }, []);

  const handleSelectWatchlistTicker = (newTicker: string) => {
    const clean = newTicker.trim().toUpperCase();
    setTicker(clean);

    // Auto-select category if symbol is present in ASSET_CATALOG
    for (const [catName, assets] of Object.entries(ASSET_CATALOG)) {
      if (assets.some(a => a.symbol.toUpperCase() === clean)) {
        setCategory(catName);
        break;
      }
    }
  };

  const handleAddWatchlistTicker = (newTicker: string) => {
    const clean = newTicker.trim().toUpperCase();
    if (!clean || watchlistSymbols.includes(clean)) return;

    const updated = [clean, ...watchlistSymbols];
    setWatchlistSymbols(updated);
    storageService.saveWatchlist(updated);
    refreshWatchlistQuotes(updated);
  };

  const handleRemoveWatchlistTicker = (tickerToRemove: string) => {
    const clean = tickerToRemove.trim().toUpperCase();
    const updated = watchlistSymbols.filter(s => s !== clean);
    setWatchlistSymbols(updated);
    storageService.saveWatchlist(updated);
    setWatchlistQuotes(prev => prev.filter(q => q.symbol !== clean));
  };

  const handleResetWatchlistDefault = () => {
    setWatchlistSymbols(DEFAULT_WATCHLIST);
    storageService.saveWatchlist(DEFAULT_WATCHLIST);
    refreshWatchlistQuotes(DEFAULT_WATCHLIST);
  };

  // Auto-dismiss in-app toasts after 8 seconds
  useEffect(() => {
    if (activeToasts.length === 0) return;
    const timer = setTimeout(() => {
      setActiveToasts(prev => prev.slice(0, -1));
    }, 8000);
    return () => clearTimeout(timer);
  }, [activeToasts]);

  // Alert Management Handlers
  const handleAddAlert = (newAlertData: Omit<PriceAlert, 'id' | 'createdAt' | 'triggered'>) => {
    const newAlert: PriceAlert = {
      ...newAlertData,
      id: `alert_${Date.now()}`,
      createdAt: new Date().toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }),
      triggered: false
    };
    const updated = [newAlert, ...alerts];
    setAlerts(updated);
    storageService.savePriceAlerts(updated);

    // If permission has not been requested yet, prompt user
    if (notificationPermission === 'default') {
      handleRequestNotificationPermission();
    }
  };

  const handleRemoveAlert = (id: string) => {
    const updated = alerts.filter(a => a.id !== id);
    setAlerts(updated);
    storageService.savePriceAlerts(updated);
  };

  const handleToggleAlert = (id: string) => {
    const updated = alerts.map(a => (a.id === id ? { ...a, active: !a.active } : a));
    setAlerts(updated);
    storageService.savePriceAlerts(updated);
  };

  const handleResetAlert = (id: string) => {
    const updated = alerts.map(a => (a.id === id ? { ...a, triggered: false, active: true } : a));
    setAlerts(updated);
    storageService.savePriceAlerts(updated);
  };

  const handleClearAllAlerts = () => {
    setAlerts([]);
    storageService.savePriceAlerts([]);
  };

  const handleTestNotification = () => {
    playAlertChime();
    const currentPriceNum = typeof ohlc.close === 'number' ? ohlc.close : 100.00;
    const mockAlert: PriceAlert = {
      id: `test_${Date.now()}`,
      ticker,
      targetPrice: currentPriceNum,
      condition: 'ABOVE',
      createdAt: new Date().toLocaleDateString(),
      triggered: true,
      active: true
    };
    triggerBrowserNotification(mockAlert, currentPriceNum);
    setActiveToasts(prev => [
      {
        id: `toast_test_${Date.now()}`,
        alert: mockAlert,
        currentPrice: currentPriceNum,
        timestamp: new Date().toLocaleTimeString()
      },
      ...prev
    ]);
  };

  const handleToggleLiveRefresh = () => {
    const curIdx = liveIntervals.indexOf(liveRefreshSeconds);
    const nextIdx = (curIdx + 1) % liveIntervals.length;
    setLiveRefreshSeconds(liveIntervals[nextIdx]);
  };

  const handleToggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleIndicatorsChange = (newCfg: IndicatorConfig) => {
    setIndicatorConfig(newCfg);
    storageService.saveIndicatorConfig(newCfg);
  };

  const activeAlertsCount = alerts.filter(a => a.active && !a.triggered).length;
  const currentPriceNum = typeof ohlc.close === 'number' ? ohlc.close : parseFloat(ohlc.close as string) || 0;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[var(--bg-main)] text-[var(--text-main)] select-none">
      {/* 1. Header Superiore con Navigazione & Selettori */}
      <Header
        activePage={activePage}
        onSelectPage={setActivePage}
        category={category}
        onCategoryChange={setCategory}
        ticker={ticker}
        onTickerChange={setTicker}
        interval={interval}
        onIntervalChange={setInterval}
        chartType={chartType}
        onChartTypeChange={setChartType}
        liveRefreshSeconds={liveRefreshSeconds}
        onToggleLiveRefresh={handleToggleLiveRefresh}
        onScrollToRealTime={() => setScrollToRealTimeTrigger(Date.now())}
        onOpenIndicators={() => setIsIndicatorsOpen(true)}
        onOpenOverlays={() => setIsOverlayModalOpen(true)}
        activeOverlaysCount={overlays.filter(o => o.visible).length}
        onOpenApiHub={() => setIsApiHubOpen(true)}
        onOpenAlerts={() => setIsAlertsOpen(true)}
        activeAlertsCount={activeAlertsCount}
        onToggleWatchlist={() => setIsWatchlistOpen(!isWatchlistOpen)}
        isWatchlistOpen={isWatchlistOpen}
        watchlistCount={watchlistSymbols.length}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        drawColor={drawColor}
        onDrawColorChange={setDrawColor}
        drawWidth={drawWidth}
        onDrawWidthChange={setDrawWidth}
      />

      {/* 2. Barra di Stato & Valori OHLC (Visibile su Grafico o Macro) */}
      <StatusBar
        statusText={statusText}
        isError={isError}
        openPrice={ohlc.open}
        highPrice={ohlc.high}
        lowPrice={ohlc.low}
        closePrice={ohlc.close}
        activeMAs={indicatorConfig.movingAverages}
        maValues={maHoverValues}
      />

      {/* 3. Area Contenuto Modulare con Pannello Watchlist Laterale */}
      <div className="flex-1 flex overflow-hidden relative w-full h-full">
        <main className="flex-1 flex overflow-hidden relative w-full h-full">
          {/* Pagina 1: Grafico Interattivo con Indicatori & Drawing Tools */}
          {activePage === 'chart' && (
            <ChartPage
              ticker={ticker}
              interval={interval}
              chartType={chartType}
              theme={theme}
              indicatorConfig={indicatorConfig}
              rawCandles={candles}
              onBarHover={handleBarHover}
              onMaHover={handleMaHover}
              scrollToRealTimeTrigger={scrollToRealTimeTrigger}
              drawColor={drawColor}
              drawWidth={drawWidth}
              overlays={overlays}
              onOverlaysChange={handleOverlaysChange}
              isOverlayModalOpen={isOverlayModalOpen}
              onOpenOverlayModal={() => setIsOverlayModalOpen(true)}
              onCloseOverlayModal={() => setIsOverlayModalOpen(false)}
            />
          )}

          {/* Pagina 2: News in Tempo Reale & Analisi Sentiment Gemini AI */}
          {activePage === 'news' && (
            <NewsAiPage ticker={ticker} category={category} />
          )}

          {/* Pagina 3: Analisi Fondamentale, Fair Value & Multipli */}
          {activePage === 'fundamental' && (
            <FundamentalPage ticker={ticker} />
          )}

          {/* Pagina 4: Calendario Economico Globale */}
          {activePage === 'calendar' && (
            <CalendarPage />
          )}

          {/* Pagina 5: Matrice delle Correlazioni Multi-Asset */}
          {activePage === 'correlations' && (
            <CorrelationsPage ticker={ticker} />
          )}

          {/* Pagina 6: Inflazione & Macro Hub (Quad View 4 grafici) */}
          {activePage === 'inflation' && (
            <InflationPage theme={theme} />
          )}
        </main>

        {/* Pannello Watchlist Laterale a Scomparsa */}
        <WatchlistPanel
          isOpen={isWatchlistOpen}
          onClose={() => setIsWatchlistOpen(false)}
          items={watchlistQuotes}
          currentTicker={ticker}
          onSelectTicker={handleSelectWatchlistTicker}
          onAddTicker={handleAddWatchlistTicker}
          onRemoveTicker={handleRemoveWatchlistTicker}
          onResetDefault={handleResetWatchlistDefault}
          onRefreshQuotes={() => refreshWatchlistQuotes(watchlistSymbols)}
          isRefreshing={isWatchlistRefreshing}
        />
      </div>

      {/* Modali Fluttuanti */}
      <IndicatorsModal
        isOpen={isIndicatorsOpen}
        onClose={() => setIsIndicatorsOpen(false)}
        config={indicatorConfig}
        onChange={handleIndicatorsChange}
      />

      <ApiHubModal
        isOpen={isApiHubOpen}
        onClose={() => setIsApiHubOpen(false)}
      />

      {/* Modale Gestione Allarmi di Prezzo */}
      <PriceAlertsModal
        isOpen={isAlertsOpen}
        onClose={() => setIsAlertsOpen(false)}
        currentTicker={ticker}
        currentPrice={currentPriceNum}
        alerts={alerts}
        onAddAlert={handleAddAlert}
        onRemoveAlert={handleRemoveAlert}
        onToggleAlert={handleToggleAlert}
        onResetAlert={handleResetAlert}
        onClearAllAlerts={handleClearAllAlerts}
        onTestNotification={handleTestNotification}
        notificationPermission={notificationPermission}
        onRequestPermission={handleRequestNotificationPermission}
      />

      {/* In-App Floating Toast Notifications */}
      <PriceAlertToast
        notifications={activeToasts}
        onDismiss={id => setActiveToasts(prev => prev.filter(t => t.id !== id))}
      />
    </div>
  );
}

