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
import { ShortcutsModal } from './components/ShortcutsModal';
import { DivergenceModal } from './components/DivergenceModal';

import { ChartPage } from './pages/ChartPage';
import { NewsAiPage } from './pages/NewsAiPage';
import { FundamentalPage } from './pages/FundamentalPage';
import { FinancialAgentPage } from './pages/FinancialAgentPage';
import { CalendarPage } from './pages/CalendarPage';
import { CorrelationsPage } from './pages/CorrelationsPage';
import { InflationPage } from './pages/InflationPage';
import { ScreenerPage } from './pages/ScreenerPage';
import { HeatmapPage } from './pages/HeatmapPage';
import { MultiChartPage } from './pages/MultiChartPage';

import {
  CandleData,
  IndicatorConfig,
  LiveTickUpdate,
  OverlayConfig,
  PageId,
  PriceAlert,
  SentimentDivergenceAlert,
  WatchlistItem,
  WebSocketStatus
} from './types';
import { storageService, DEFAULT_WATCHLIST } from './services/storageService';
import { marketDataService } from './services/marketDataService';
import { playAlertChime } from './services/soundService';
import { divergenceService } from './services/divergenceService';
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
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isBacktestOpen, setIsBacktestOpen] = useState(false);
  const [isDivergenceModalOpen, setIsDivergenceModalOpen] = useState(false);
  const [inspectedDivergence, setInspectedDivergence] = useState<SentimentDivergenceAlert | null>(null);

  // WebSocket Live Streaming State
  const [wsStatus, setWsStatus] = useState<WebSocketStatus>({
    connected: false,
    provider: 'Connessione in corso...',
    ticker: 'FTSEMIB.MI'
  });

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

  const [liveRefreshSeconds, setLiveRefreshSeconds] = useState(5);
  const liveIntervals = [5, 10, 30, 0];

  const [candles, setCandles] = useState<CandleData[]>([]);
  const [statusText, setStatusText] = useState('Pronto');
  const [isError, setIsError] = useState(false);

  const [ohlc, setOhlc] = useState<{ open: number | string; high: number | string; low: number | string; close: number | string; time?: string | number }>({
    open: '-',
    high: '-',
    low: '-',
    close: '-'
  });

  const [atrValue, setAtrValue] = useState<number | string | null>('-');
  const [maHoverValues, setMaHoverValues] = useState<Record<string, number | string>>({});
  const [scrollToRealTimeTrigger, setScrollToRealTimeTrigger] = useState<number>(0);

  useEffect(() => {
    document.body.classList.toggle('dark-theme', theme === 'dark');
    storageService.saveTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

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
            triggerBrowserNotification(alert, currentPrice);
            playAlertChime();
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
            close: last.close,
            time: last.time
          });
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

  useEffect(() => {
    const unsubscribeStatus = marketDataService.onWebSocketStatusChange((status) => {
      setWsStatus(status);
      if (status.connected) {
        setStatusText(`⚡ Live: ${status.provider} • ${status.ticker} [${interval.toUpperCase()}]`);
        setIsError(false);
      }
    });

    const unsubscribeTicks = marketDataService.subscribeLiveTicks(ticker, interval, (tick: LiveTickUpdate) => {
      setCandles(prev => {
        if (prev.length === 0) {
          return [{
            time: tick.time,
            open: tick.open,
            high: tick.high,
            low: tick.low,
            close: tick.close,
            volume: tick.volume
          }];
        }

        const last = prev[prev.length - 1];
        const isSameBar = String(last.time) === String(tick.time);

        let updated: CandleData[];
        if (isSameBar) {
          const updatedLast: CandleData = {
            ...last,
            high: Math.max(last.high, tick.high, tick.close),
            low: Math.min(last.low, tick.low, tick.close),
            close: tick.close,
            volume: tick.volume !== undefined ? (last.volume || 0) + tick.volume : last.volume
          };
          updated = [...prev.slice(0, -1), updatedLast];
        } else {
          const newBar: CandleData = {
            time: tick.time,
            open: tick.open,
            high: tick.high,
            low: tick.low,
            close: tick.close,
            volume: tick.volume
          };
          updated = [...prev, newBar];
        }

        return updated;
      });

      setOhlc({
        open: tick.open,
        high: tick.high,
        low: tick.low,
        close: tick.close,
        time: tick.time
      });

      checkPriceAlerts(tick.close, ticker);
    });

    const watchlistInterval = window.setInterval(() => {
      if (watchlistSymbols.length > 0) {
        marketDataService.getWatchlistQuotes(watchlistSymbols).then(setWatchlistQuotes).catch(() => {});
      }
    }, 10000);

    return () => {
      unsubscribeStatus();
      unsubscribeTicks();
      window.clearInterval(watchlistInterval);
    };
  }, [ticker, interval, checkPriceAlerts, watchlistSymbols]);

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

  useEffect(() => {
    refreshWatchlistQuotes(watchlistSymbols);
  }, []);

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

  useEffect(() => {
    if (activeToasts.length === 0) return;
    const timer = setTimeout(() => {
      setActiveToasts(prev => prev.slice(0, -1));
    }, 8000);
    return () => clearTimeout(timer);
  }, [activeToasts]);

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

  // Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      );

      if (e.key === 'Escape') {
        setIsShortcutsOpen(false);
        setIsIndicatorsOpen(false);
        setIsAlertsOpen(false);
        setIsApiHubOpen(false);
        setIsOverlayModalOpen(false);
        setIsWatchlistOpen(false);
        setIsBacktestOpen(false);
        setIsDivergenceModalOpen(false);
        return;
      }

      if (isInput || e.ctrlKey || e.metaKey || e.altKey) return;

      const key = e.key.toLowerCase();

      if (key === 'c' || key === '1') {
        setActivePage('chart');
      } else if (key === 'n' || key === '2') {
        setActivePage('news');
      } else if (key === 'f' || key === '3') {
        setActivePage('fundamental');
      } else if (key === 'e' || key === '4') {
        setActivePage('calendar');
      } else if (key === 'm' || key === '5') {
        setActivePage('correlations');
      } else if (key === 'i' || key === '6') {
        setActivePage('inflation');
      } else if (key === 's' || key === '7') {
        setActivePage('screener');
      } else if (key === 'h' || key === '8') {
        setActivePage('heatmap');
      } else if (key === 'b') {
        setIsBacktestOpen(prev => !prev);
      } else if (key === 'v') {
        setIsDivergenceModalOpen(prev => !prev);
      } else if (key === 'w') {
        setIsWatchlistOpen(prev => !prev);
      } else if (key === 'a') {
        setIsAlertsOpen(prev => !prev);
      } else if (key === 't' || key === 'k') {
        setIsIndicatorsOpen(prev => !prev);
      } else if (key === 'o') {
        setIsOverlayModalOpen(prev => !prev);
      } else if (key === 'p' || key === 'u') {
        setIsApiHubOpen(prev => !prev);
      } else if (key === 'd') {
        handleToggleTheme();
      } else if (e.key === '?' || key === '/') {
        setIsShortcutsOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleToggleTheme]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[var(--bg-main)] text-[var(--text-main)] select-none">
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
        wsStatus={wsStatus}
        onScrollToRealTime={() => setScrollToRealTimeTrigger(Date.now())}
        onOpenIndicators={() => setIsIndicatorsOpen(true)}
        onOpenOverlays={() => setIsOverlayModalOpen(true)}
        activeOverlaysCount={overlays.filter(o => o.visible).length}
        onOpenBacktest={() => setIsBacktestOpen(true)}
        onOpenApiHub={() => setIsApiHubOpen(true)}
        onOpenAlerts={() => setIsAlertsOpen(true)}
        activeAlertsCount={activeAlertsCount}
        onToggleWatchlist={() => setIsWatchlistOpen(!isWatchlistOpen)}
        isWatchlistOpen={isWatchlistOpen}
        watchlistCount={watchlistSymbols.length}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        drawColor={drawColor}
        onDrawColorChange={setDrawColor}
        drawWidth={drawWidth}
        onDrawWidthChange={setDrawWidth}
      />

      <StatusBar
        statusText={statusText}
        isError={isError}
        openPrice={ohlc.open}
        highPrice={ohlc.high}
        lowPrice={ohlc.low}
        closePrice={ohlc.close}
        barTime={ohlc.time}
        activeMAs={indicatorConfig.movingAverages}
        maValues={maHoverValues}
        atrValue={atrValue}
        atrPeriod={indicatorConfig.atrLen}
        atrColor={indicatorConfig.atrColor}
      />

      <div className="flex-1 flex overflow-hidden relative w-full h-full">
        <main className="flex-1 flex overflow-hidden relative w-full h-full">
          {activePage === 'chart' && (
            <ChartPage
              ticker={ticker}
              interval={interval}
              chartType={chartType}
              theme={theme}
              indicatorConfig={indicatorConfig}
              rawCandles={candles}
              alerts={alerts}
              onBarHover={handleBarHover}
              onMaHover={handleMaHover}
              onAtrHover={setAtrValue}
              scrollToRealTimeTrigger={scrollToRealTimeTrigger}
              drawColor={drawColor}
              drawWidth={drawWidth}
              overlays={overlays}
              onOverlaysChange={handleOverlaysChange}
              isOverlayModalOpen={isOverlayModalOpen}
              onOpenOverlayModal={() => setIsOverlayModalOpen(true)}
              onCloseOverlayModal={() => setIsOverlayModalOpen(false)}
              isBacktestOpen={isBacktestOpen}
              onOpenBacktest={() => setIsBacktestOpen(true)}
              onCloseBacktest={() => setIsBacktestOpen(false)}
              onUpdateIndicatorConfig={handleIndicatorsChange}
            />
          )}

          {activePage === 'news' && (
            <NewsAiPage ticker={ticker} category={category} />
          )}

          {activePage === 'fundamental' && (
            <FundamentalPage
              ticker={ticker}
              onNavigateToAgent={() => setActivePage('agent')}
            />
          )}

          {activePage === 'agent' && (
            <FinancialAgentPage
              ticker={ticker}
              category={category}
              candles={candles}
              theme={theme}
              onSelectTicker={(selected) => setTicker(selected)}
            />
          )}

          {activePage === 'calendar' && (
            <CalendarPage />
          )}

          {activePage === 'correlations' && (
            <CorrelationsPage ticker={ticker} />
          )}

          {activePage === 'inflation' && (
            <InflationPage theme={theme} />
          )}

          {activePage === 'screener' && (
            <ScreenerPage
              onSelectTicker={(selected) => setTicker(selected)}
              onNavigatePage={(page) => setActivePage(page)}
            />
          )}

          {activePage === 'heatmap' && (
            <HeatmapPage
              onSelectTicker={(selected) => setTicker(selected)}
              onNavigatePage={(page) => setActivePage(page)}
            />
          )}

          {activePage === 'multichart' && (
            <MultiChartPage
              initialTicker={ticker}
              theme={theme}
              onSelectTicker={(selected) => setTicker(selected)}
            />
          )}
        </main>

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

      <PriceAlertToast
        notifications={activeToasts}
        onDismiss={id => setActiveToasts(prev => prev.filter(t => t.id !== id))}
        onInspectDivergence={item => {
          if (item.alert) {
            setInspectedDivergence({
              id: item.id,
              ticker: item.alert.ticker,
              type: item.alert.divergenceType || 'BEARISH_DIVERGENCE',
              severity: item.alert.severity || 'MEDIUM',
              priceChangePct: item.alert.priceChangePct || 2.5,
              sentimentChange: item.alert.sentimentChange || -0.4,
              currentPrice: item.currentPrice,
              currentSentiment: item.alert.currentSentiment || 0,
              title: `Divergenza Rilevata su ${item.alert.ticker}`,
              description: item.alert.description || 'Divergenza tra azione del prezzo e Sentiment AI.',
              tradingImplication: item.alert.tradingImplication || 'Possibile esaurimento del movimento in corso.',
              timestamp: item.timestamp,
              triggered: true,
              active: true
            });
            setIsDivergenceModalOpen(true);
          }
        }}
      />

      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      <DivergenceModal
        isOpen={isDivergenceModalOpen}
        onClose={() => {
          setIsDivergenceModalOpen(false);
          setInspectedDivergence(null);
        }}
        alert={inspectedDivergence}
        monitoringEnabled={divergenceService.isMonitoringEnabled()}
        onToggleMonitoring={(enabled) => divergenceService.setMonitoringEnabled(enabled)}
        sensitivity={divergenceService.getSensitivity()}
        onChangeSensitivity={(s) => divergenceService.setSensitivity(s)}
        onOpenChart={() => {
          setIsDivergenceModalOpen(false);
          setActivePage('chart');
          setScrollToRealTimeTrigger(Date.now());
        }}
      />
    </div>
  );
}
