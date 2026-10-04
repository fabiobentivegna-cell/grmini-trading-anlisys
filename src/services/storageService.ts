import { ApiKeysConfig, IndicatorConfig, MovingAverageConfig, OverlayConfig, PriceAlert, SentimentAlert } from '../types';

const STORAGE_KEYS = {
  API_CONFIG: 'market_station_api_keys',
  INDICATORS: 'market_station_indicators',
  THEME: 'market_station_theme',
  DRAWINGS_PREFIX: 'market_station_drawings_',
  ALERTS: 'market_station_price_alerts',
  SENTIMENT_ALERTS: 'market_station_sentiment_alerts',
  WATCHLIST: 'market_station_watchlist',
  OVERLAYS: 'market_station_chart_overlays'
};

export const DEFAULT_OVERLAYS: OverlayConfig[] = [
  {
    id: 'overlay_spy',
    ticker: 'SPY',
    name: 'S&P 500 (SPY)',
    interval: 'same',
    color: '#06b6d4', // Cyan
    lineWidth: 2,
    lineStyle: 'solid',
    seriesType: 'line',
    visible: true,
    scaleMode: 'percent'
  }
];

export const DEFAULT_WATCHLIST: string[] = [
  'FTSEMIB.MI',
  'ENEL.MI',
  'ISP.MI',
  'UCG.MI',
  'RACE.MI',
  'AAPL',
  'NVDA',
  'TSLA',
  'BTC-USD',
  'EURUSD=X',
  'GC=F',
  'BZ=F'
];

export const DEFAULT_MA_LIST: MovingAverageConfig[] = [
  { id: 'ma_1', enabled: true, type: 'SMA', period: 20, color: '#089981', width: 2 },
  { id: 'ma_2', enabled: true, type: 'EMA', period: 50, color: '#f23645', width: 2 },
  { id: 'ma_3', enabled: true, type: 'EMA', period: 200, color: '#ff9800', width: 2 }
];

export const DEFAULT_INDICATOR_CONFIG: IndicatorConfig = {
  movingAverages: DEFAULT_MA_LIST,
  bbEnabled: false,
  bbLen: 20,
  bbStd: 2.0,
  sarEnabled: false,
  sarStep: 0.02,
  sarMax: 0.2,
  supertrendEnabled: false,
  supertrendPeriod: 10,
  supertrendMult: 3.0,
  atrTslEnabled: false,
  atrTslMult: 2.0,
  atrTslColor: '#ff9800',
  // Oscillators
  rsiEnabled: true,
  rsiLen: 14,
  rsiColor: '#ab47bc',
  rsiWidth: 2,
  rsiOverbought: 70,
  rsiOverboughtColor: '#f23645',
  rsiMid: 50,
  rsiMidColor: '#787b86',
  rsiOversold: 30,
  rsiOversoldColor: '#089981',
  macdEnabled: true,
  macdFast: 12,
  macdSlow: 26,
  macdSig: 9,
  macdColor: '#2962ff',
  macdSigColor: '#ff6d00',
  stochEnabled: false,
  stochK: 14,
  stochD: 3,
  stochKColor: '#00e676',
  stochDColor: '#ff9100',
  stochOverbought: 80,
  stochOverboughtColor: '#f23645',
  stochMid: 50,
  stochMidColor: '#787b86',
  stochOversold: 20,
  stochOversoldColor: '#089981',
  adxEnabled: false,
  adxLen: 14,
  adxColor: '#ffd600',
  plusDiColor: '#089981',
  minusDiColor: '#f23645',
  atrEnabled: false,
  atrLen: 14,
  atrColor: '#26c6da',
  atrWidth: 2,
  sentimentOverlayEnabled: false,
  sentimentOverlayOpacity: 0.25
};

export const DEFAULT_API_KEYS: ApiKeysConfig = {
  GEMINI_API_KEY: '',
  ALPHAVANTAGE_API_KEY: '',
  FINNHUB_API_KEY: '',
  NEWSAPI_KEY: '',
  FRED_API_KEY: '',
  TWELVE_DATA_API_KEY: ''
};

export const storageService = {
  getApiKeys(): ApiKeysConfig {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.API_CONFIG);
      if (saved) {
        return { ...DEFAULT_API_KEYS, ...JSON.parse(saved) };
      }
    } catch {
      // fallback
    }
    return DEFAULT_API_KEYS;
  },

  saveApiKeys(keys: ApiKeysConfig): void {
    try {
      localStorage.setItem(STORAGE_KEYS.API_CONFIG, JSON.stringify(keys));
    } catch (e) {
      console.error('Errore salvataggio API keys:', e);
    }
  },

  getIndicatorConfig(): IndicatorConfig {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.INDICATORS);
      if (saved) {
        return { ...DEFAULT_INDICATOR_CONFIG, ...JSON.parse(saved) };
      }
    } catch {
      // fallback
    }
    return DEFAULT_INDICATOR_CONFIG;
  },

  saveIndicatorConfig(cfg: IndicatorConfig): void {
    try {
      localStorage.setItem(STORAGE_KEYS.INDICATORS, JSON.stringify(cfg));
    } catch (e) {
      console.error('Errore salvataggio indicatori:', e);
    }
  },

  getTheme(): 'dark' | 'light' {
    return (localStorage.getItem(STORAGE_KEYS.THEME) as 'dark' | 'light') || 'light';
  },

  saveTheme(theme: 'dark' | 'light'): void {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  },

  getDrawings(ticker: string, interval?: string): any[] {
    try {
      const cleanTicker = (ticker || 'DEFAULT').trim().toUpperCase();
      if (interval) {
        const intervalKey = `${STORAGE_KEYS.DRAWINGS_PREFIX}${cleanTicker}_${interval}`;
        const savedInterval = localStorage.getItem(intervalKey);
        if (savedInterval) return JSON.parse(savedInterval);
      }
      const saved = localStorage.getItem(`${STORAGE_KEYS.DRAWINGS_PREFIX}${cleanTicker}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  },

  saveDrawings(ticker: string, arg2: any, arg3?: any): void {
    try {
      const cleanTicker = (ticker || 'DEFAULT').trim().toUpperCase();
      let drawings: any[] = [];
      let interval: string | undefined = undefined;

      // Handle both saveDrawings(ticker, drawings, interval) and saveDrawings(ticker, interval, drawings)
      if (Array.isArray(arg2)) {
        drawings = arg2;
        interval = typeof arg3 === 'string' ? arg3 : undefined;
      } else if (typeof arg2 === 'string') {
        interval = arg2;
        drawings = Array.isArray(arg3) ? arg3 : [];
      } else if (Array.isArray(arg3)) {
        drawings = arg3;
      }

      if (interval) {
        const intervalKey = `${STORAGE_KEYS.DRAWINGS_PREFIX}${cleanTicker}_${interval}`;
        localStorage.setItem(intervalKey, JSON.stringify(drawings));
      }
      localStorage.setItem(`${STORAGE_KEYS.DRAWINGS_PREFIX}${cleanTicker}`, JSON.stringify(drawings));
    } catch (err) {
      console.warn('Errore salvataggio disegni per ticker:', err);
    }
  },

  getPriceAlerts(): PriceAlert[] {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ALERTS);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  },

  savePriceAlerts(alerts: PriceAlert[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(alerts));
    } catch {}
  },

  getSentimentAlerts(): SentimentAlert[] {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SENTIMENT_ALERTS);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 'sent_alert_default_1',
        ticker: 'FTSEMIB.MI',
        targetScore: 0.50,
        condition: 'ABOVE',
        createdAt: new Date().toISOString(),
        triggered: false,
        active: true
      },
      {
        id: 'sent_alert_default_2',
        ticker: 'FTSEMIB.MI',
        targetScore: -0.30,
        condition: 'BELOW',
        createdAt: new Date().toISOString(),
        triggered: false,
        active: true
      }
    ];
  },

  saveSentimentAlerts(alerts: SentimentAlert[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SENTIMENT_ALERTS, JSON.stringify(alerts));
    } catch {}
  },

  getWatchlist(): string[] {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.WATCHLIST);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_WATCHLIST;
  },

  saveWatchlist(symbols: string[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.WATCHLIST, JSON.stringify(symbols));
    } catch {}
  },

  getChartOverlays(): OverlayConfig[] {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.OVERLAYS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return DEFAULT_OVERLAYS;
  },

  saveChartOverlays(overlays: OverlayConfig[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.OVERLAYS, JSON.stringify(overlays));
    } catch {}
  }
};
