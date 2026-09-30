import { CandleData, LineData, OverlayConfig, OverlayCorrelationStats, OverlayScaleMode } from '../types';

export interface OverlayPreset {
  ticker: string;
  name: string;
  category: 'Indici' | 'Azioni' | 'Commodity' | 'Crypto' | 'Valute' | 'Tassi';
  description: string;
  defaultColor: string;
}

export const OVERLAY_PRESETS: OverlayPreset[] = [
  {
    ticker: 'SPY',
    name: 'S&P 500 (SPY ETF)',
    category: 'Indici',
    description: 'Benchmark azionario globale USA',
    defaultColor: '#06b6d4' // Cyan
  },
  {
    ticker: 'QQQ',
    name: 'Nasdaq 100 (Invesco QQQ)',
    category: 'Indici',
    description: 'Tech, AI e crescita USA',
    defaultColor: '#a855f7' // Purple
  },
  {
    ticker: 'FTSEMIB.MI',
    name: 'FTSE MIB Italia',
    category: 'Indici',
    description: 'Indice principale Piazza Affari',
    defaultColor: '#10b981' // Emerald
  },
  {
    ticker: '^STOXX50E',
    name: 'Euro Stoxx 50',
    category: 'Indici',
    description: 'Blue chip dell\'Eurozona',
    defaultColor: '#3b82f6' // Blue
  },
  {
    ticker: 'BTC-USD',
    name: 'Bitcoin (USD)',
    category: 'Crypto',
    description: 'Asset digitale di riferimento e risk appetite',
    defaultColor: '#f59e0b' // Amber
  },
  {
    ticker: 'GC=F',
    name: 'Oro Future (Gold)',
    category: 'Commodity',
    description: 'Beni rifugio ed hedging inflazione',
    defaultColor: '#eab308' // Gold
  },
  {
    ticker: 'CL=F',
    name: 'Petrolio WTI Crude',
    category: 'Commodity',
    description: 'Energia ed aspettative ciclo economico',
    defaultColor: '#ef4444' // Red
  },
  {
    ticker: '^TNX',
    name: 'Rendimento Treasury USA 10Y',
    category: 'Tassi',
    description: 'Tasso privo di rischio e politica monetaria',
    defaultColor: '#ec4899' // Pink
  },
  {
    ticker: 'EURUSD=X',
    name: 'EUR / USD Forex',
    category: 'Valute',
    description: 'Tasso di cambio Euro / Dollaro',
    defaultColor: '#14b8a6' // Teal
  },
  {
    ticker: 'NVDA',
    name: 'NVIDIA Corp',
    category: 'Azioni',
    description: 'Leader semiconduttori e infrastruttura AI',
    defaultColor: '#84cc16' // Lime
  },
  {
    ticker: 'AAPL',
    name: 'Apple Inc',
    category: 'Azioni',
    description: 'Leader consumer tech & buyback',
    defaultColor: '#64748b' // Slate
  },
  {
    ticker: 'ENEL.MI',
    name: 'Enel SpA',
    category: 'Azioni',
    description: 'Utility globale e transizione energetica italiana',
    defaultColor: '#0ea5e9' // Sky
  }
];

// In-memory cache for fetched candles: ticker_interval -> { candles, timestamp }
const candleCache = new Map<string, { candles: CandleData[]; timestamp: number }>();
const CACHE_TTL_MS = 30000; // 30s cache

export const correlationOverlayService = {
  /**
   * Fetch historical candles for an overlay ticker and interval
   */
  async fetchOverlayCandles(ticker: string, interval: string): Promise<CandleData[]> {
    const cleanTicker = ticker.trim().toUpperCase();
    const cacheKey = `${cleanTicker}_${interval}`;
    const cached = candleCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.candles;
    }

    try {
      const res = await fetch(`/api/market/candles?ticker=${encodeURIComponent(cleanTicker)}&interval=${encodeURIComponent(interval)}`);
      if (!res.ok) {
        throw new Error(`Errore HTTP ${res.status} nel caricamento di ${cleanTicker}`);
      }
      const data = await res.json();
      const candles: CandleData[] = Array.isArray(data.candles) ? data.candles : [];
      candleCache.set(cacheKey, { candles, timestamp: Date.now() });
      return candles;
    } catch (err) {
      console.warn(`[Overlay] Impossibile recuperare candele per ${cleanTicker} (${interval}):`, err);
      return [];
    }
  },

  /**
   * Align overlay data to the main chart's time axis and compute normalized % performance or raw prices
   */
  alignOverlayData(
    mainCandles: CandleData[],
    overlayCandles: CandleData[],
    scaleMode: OverlayScaleMode
  ): {
    alignedData: LineData[];
    basePrice: number;
    currentPrice: number;
    mainBasePrice: number;
    mainCurrentPrice: number;
    firstMatchingTime: string | number | null;
  } {
    if (!mainCandles.length || !overlayCandles.length) {
      return {
        alignedData: [],
        basePrice: 0,
        currentPrice: 0,
        mainBasePrice: 0,
        mainCurrentPrice: 0,
        firstMatchingTime: null
      };
    }

    // Index overlay candles by time
    const overlayMap = new Map<string | number, number>();
    overlayCandles.forEach(c => {
      overlayMap.set(c.time, c.close);
    });

    // Find the first matching time between main and overlay
    let firstMatchingTime: string | number | null = null;
    let baseOverlayPrice = 0;
    let baseMainPrice = 0;

    for (let i = 0; i < mainCandles.length; i++) {
      const t = mainCandles[i].time;
      if (overlayMap.has(t)) {
        firstMatchingTime = t;
        baseOverlayPrice = overlayMap.get(t)!;
        baseMainPrice = mainCandles[i].close;
        break;
      }
    }

    // If no exact match (e.g. slight time shifts or different intervals), fallback to first available overlay price
    if (!baseOverlayPrice && overlayCandles.length > 0) {
      baseOverlayPrice = overlayCandles[0].close;
      baseMainPrice = mainCandles[0].close;
      firstMatchingTime = mainCandles[0].time;
    }

    let lastKnownOverlayPrice = baseOverlayPrice;
    let hasMatchedAny = false;

    const alignedData: LineData[] = [];

    for (let i = 0; i < mainCandles.length; i++) {
      const t = mainCandles[i].time;

      if (overlayMap.has(t)) {
        lastKnownOverlayPrice = overlayMap.get(t)!;
        hasMatchedAny = true;
      }

      if (!hasMatchedAny) {
        // Points prior to the first available overlay data point are rendered as whitespace
        alignedData.push({ time: t } as any);
        continue;
      }

      if (scaleMode === 'percent') {
        const pctReturn = baseOverlayPrice !== 0
          ? Number((((lastKnownOverlayPrice - baseOverlayPrice) / baseOverlayPrice) * 100).toFixed(2))
          : 0;
        alignedData.push({ time: t, value: pctReturn });
      } else {
        alignedData.push({ time: t, value: lastKnownOverlayPrice });
      }
    }

    const currentOverlayPrice = overlayCandles[overlayCandles.length - 1]?.close || lastKnownOverlayPrice;
    const currentMainPrice = mainCandles[mainCandles.length - 1]?.close || baseMainPrice;

    return {
      alignedData,
      basePrice: baseOverlayPrice,
      currentPrice: currentOverlayPrice,
      mainBasePrice: baseMainPrice,
      mainCurrentPrice: currentMainPrice,
      firstMatchingTime
    };
  },

  /**
   * Calculate Pearson Correlation, Return Correlation, Beta, and Performance Spread
   */
  calculateCorrelationStats(
    overlay: OverlayConfig,
    mainTicker: string,
    mainCandles: CandleData[],
    overlayCandles: CandleData[]
  ): OverlayCorrelationStats {
    if (!mainCandles.length || !overlayCandles.length) {
      return {
        overlayId: overlay.id,
        ticker: overlay.ticker,
        name: overlay.name,
        interval: overlay.interval,
        color: overlay.color,
        scaleMode: overlay.scaleMode,
        currentPrice: 0,
        correlationPrice: 0,
        correlationReturns: 0,
        correlationLabel: 'Dati insufficienti',
        mainReturnPct: 0,
        overlayReturnPct: 0,
        performanceSpread: 0,
        beta: 1,
        overlapBars: 0
      };
    }

    const overlayMap = new Map<string | number, number>();
    overlayCandles.forEach(c => overlayMap.set(c.time, c.close));

    const matchedMainCloses: number[] = [];
    const matchedOverlayCloses: number[] = [];
    let firstTime: string | number | undefined;
    let lastTime: string | number | undefined;

    for (let i = 0; i < mainCandles.length; i++) {
      const t = mainCandles[i].time;
      if (overlayMap.has(t)) {
        if (!firstTime) firstTime = t;
        lastTime = t;
        matchedMainCloses.push(mainCandles[i].close);
        matchedOverlayCloses.push(overlayMap.get(t)!);
      }
    }

    const n = matchedMainCloses.length;
    if (n < 3) {
      return {
        overlayId: overlay.id,
        ticker: overlay.ticker,
        name: overlay.name,
        interval: overlay.interval,
        color: overlay.color,
        scaleMode: overlay.scaleMode,
        currentPrice: overlayCandles[overlayCandles.length - 1]?.close || 0,
        correlationPrice: 0,
        correlationReturns: 0,
        correlationLabel: 'Storico sovrapposto insufficiente',
        mainReturnPct: 0,
        overlayReturnPct: 0,
        performanceSpread: 0,
        beta: 1,
        overlapBars: n
      };
    }

    // 1. Pearson Correlation on Price Levels
    const corrPrice = computePearson(matchedMainCloses, matchedOverlayCloses);

    // 2. Pearson Correlation on 1-period % Returns
    const mainReturns: number[] = [];
    const overlayReturns: number[] = [];
    for (let i = 1; i < n; i++) {
      const rM = (matchedMainCloses[i] - matchedMainCloses[i - 1]) / matchedMainCloses[i - 1];
      const rO = (matchedOverlayCloses[i] - matchedOverlayCloses[i - 1]) / matchedOverlayCloses[i - 1];
      mainReturns.push(rM);
      overlayReturns.push(rO);
    }
    const corrReturns = computePearson(mainReturns, overlayReturns);

    // 3. Total return over overlapping period
    const mainFirst = matchedMainCloses[0];
    const mainLast = matchedMainCloses[n - 1];
    const mainReturnPct = mainFirst !== 0 ? Number((((mainLast - mainFirst) / mainFirst) * 100).toFixed(2)) : 0;

    const overlayFirst = matchedOverlayCloses[0];
    const overlayLast = matchedOverlayCloses[n - 1];
    const overlayReturnPct = overlayFirst !== 0 ? Number((((overlayLast - overlayFirst) / overlayFirst) * 100).toFixed(2)) : 0;

    const spread = Number((mainReturnPct - overlayReturnPct).toFixed(2));

    // 4. Beta calculation: Cov(R_main, R_overlay) / Var(R_overlay)
    let beta = 1.0;
    if (overlayReturns.length > 2) {
      const meanO = overlayReturns.reduce((a, b) => a + b, 0) / overlayReturns.length;
      const meanM = mainReturns.reduce((a, b) => a + b, 0) / mainReturns.length;
      let cov = 0;
      let varO = 0;
      for (let i = 0; i < overlayReturns.length; i++) {
        const dM = mainReturns[i] - meanM;
        const dO = overlayReturns[i] - meanO;
        cov += dM * dO;
        varO += dO * dO;
      }
      if (varO > 0) {
        beta = Number((cov / varO).toFixed(2));
      }
    }

    // 5. Interpret Correlation Label
    let correlationLabel = 'Neutro / Scorrelato';
    if (corrPrice >= 0.70) {
      correlationLabel = 'Forte Correlazione Diretta';
    } else if (corrPrice >= 0.35) {
      correlationLabel = 'Moderata Correlazione Diretta';
    } else if (corrPrice <= -0.70) {
      correlationLabel = 'Forte Correlazione Inversa';
    } else if (corrPrice <= -0.35) {
      correlationLabel = 'Moderata Correlazione Inversa';
    }

    return {
      overlayId: overlay.id,
      ticker: overlay.ticker,
      name: overlay.name,
      interval: overlay.interval,
      color: overlay.color,
      scaleMode: overlay.scaleMode,
      currentPrice: overlayLast,
      correlationPrice: Number(corrPrice.toFixed(2)),
      correlationReturns: Number(corrReturns.toFixed(2)),
      correlationLabel,
      mainReturnPct,
      overlayReturnPct,
      performanceSpread: spread,
      beta,
      overlapBars: n,
      startDate: String(firstTime),
      endDate: String(lastTime)
    };
  }
};

/**
 * Standard Pearson correlation coefficient helper
 */
function computePearson(x: number[], y: number[]): number {
  const n = x.length;
  if (n !== y.length || n < 2) return 0;

  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let denX = 0;
  let denY = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }

  const den = Math.sqrt(denX * denY);
  if (den === 0 || isNaN(den)) return 0;
  return Math.max(-1, Math.min(1, num / den));
}
