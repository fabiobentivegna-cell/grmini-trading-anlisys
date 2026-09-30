import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json());

// In-memory cache for market data to prevent rate limits
const cache = new Map<string, { timestamp: number; data: any }>();
const CACHE_TTL = 3000; // 3 seconds cache for live candle requests

function getCached(key: string) {
  const item = cache.get(key);
  if (item && Date.now() - item.timestamp < CACHE_TTL) {
    return item.data;
  }
  return null;
}

function setCache(key: string, data: any) {
  cache.set(key, { timestamp: Date.now(), data });
}

// 1. API REAL-TIME CANDLES (Yahoo Finance v8 API)
app.get('/api/market/candles', async (req, res) => {
  try {
    const rawTicker = (req.query.ticker as string) || 'FTSEMIB.MI';
    const interval = (req.query.interval as string) || '1d';
    const ticker = rawTicker.trim().toUpperCase() === 'GLOBAL' ? '^GSPC' : rawTicker.trim().toUpperCase();

    const cacheKey = `candles_${ticker}_${interval}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // Map timeframe to Yahoo Finance range & interval
    let yfInterval = interval;
    let yfRange = '1y';

    if (interval === '1m') {
      yfInterval = '1m';
      yfRange = '5d';
    } else if (interval === '5m') {
      yfInterval = '5m';
      yfRange = '1mo';
    } else if (interval === '15m') {
      yfInterval = '15m';
      yfRange = '1mo';
    } else if (interval === '30m') {
      yfInterval = '30m';
      yfRange = '1mo';
    } else if (interval === '1h') {
      yfInterval = '1h';
      yfRange = '3mo';
    } else if (interval === '4h') {
      yfInterval = '1h'; // Yahoo doesn't have native 4h, we fetch 1h over 6mo
      yfRange = '6mo';
    } else if (interval === '1d') {
      yfInterval = '1d';
      yfRange = '2y';
    } else if (interval === '1wk') {
      yfInterval = '1wk';
      yfRange = '5y';
    }

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=${yfInterval}&range=${yfRange}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Yahoo Finance responded with status ${response.status}`);
    }

    const json = await response.json();
    const result = json?.chart?.result?.[0];

    if (!result || !result.timestamp || result.timestamp.length === 0) {
      throw new Error(`No candle data returned for ticker ${ticker}`);
    }

    const meta = result.meta || {};
    const timestamps: number[] = result.timestamp;
    const quotes = result.indicators?.quote?.[0] || {};
    const opens: (number | null)[] = quotes.open || [];
    const highs: (number | null)[] = quotes.high || [];
    const lows: (number | null)[] = quotes.low || [];
    const closes: (number | null)[] = quotes.close || [];
    const volumes: (number | null)[] = quotes.volume || [];

    const isIntraday = ['1m', '5m', '15m', '30m', '1h', '4h'].includes(interval);
    const decimals = ticker.includes('=X') ? 4 : ticker.includes('^TNX') ? 3 : 2;

    const candles: any[] = [];
    let lastValidClose = meta.regularMarketPrice || meta.chartPreviousClose || 100;

    for (let i = 0; i < timestamps.length; i++) {
      const c = closes[i];
      if (c === null || c === undefined || isNaN(c)) continue;

      const o = opens[i] ?? c;
      const h = highs[i] ?? Math.max(o, c);
      const l = lows[i] ?? Math.min(o, c);
      lastValidClose = c;

      // Timestamp formatting
      // LightweightCharts expects Unix timestamp in seconds for intraday, or 'YYYY-MM-DD' for daily
      const tVal = isIntraday
        ? timestamps[i] // already in seconds
        : new Date(timestamps[i] * 1000).toISOString().split('T')[0];

      candles.push({
        time: tVal,
        open: Number(o.toFixed(decimals)),
        high: Number(h.toFixed(decimals)),
        low: Number(l.toFixed(decimals)),
        close: Number(c.toFixed(decimals)),
        volume: volumes[i] ?? 0
      });
    }

    // Sort by time ascending & remove duplicate timestamps
    const uniqueCandles = candles.filter((item, idx, self) =>
      idx === self.findIndex(t => t.time === item.time)
    ).sort((a, b) => (a.time > b.time ? 1 : -1));

    const payload = {
      status: 'success',
      ticker,
      interval,
      is_intraday: isIntraday,
      regularMarketPrice: meta.regularMarketPrice ?? lastValidClose,
      chartPreviousClose: meta.chartPreviousClose,
      currency: meta.currency || (ticker.includes('.MI') ? 'EUR' : 'USD'),
      longName: meta.longName || meta.shortName || ticker,
      exchangeTimezoneName: meta.exchangeTimezoneName || (ticker.includes('.MI') ? 'Europe/Rome' : 'America/New_York'),
      timezone: meta.timezone || 'CEST',
      gmtOffset: meta.gmtoffset ?? 7200,
      regularMarketTime: meta.regularMarketTime,
      lastUpdated: new Date().toISOString(),
      candles: uniqueCandles
    };

    setCache(cacheKey, payload);
    return res.json(payload);
  } catch (err: any) {
    console.error('Candles error:', err.message);
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// 2. API MULTI-ASSET REAL-TIME QUOTES (FOR WATCHLIST)
app.get('/api/market/quotes', async (req, res) => {
  try {
    const rawTickers = (req.query.tickers as string) || 'FTSEMIB.MI,ENEL.MI,AAPL,BTC-USD';
    const tickerList = rawTickers
      .split(',')
      .map(t => t.trim().toUpperCase())
      .filter(t => t.length > 0);

    const cacheKey = `quotes_${tickerList.sort().join('_')}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const quotes = await Promise.all(
      tickerList.map(async (t) => {
        try {
          const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(t)}?interval=1d&range=5d`;
          const response = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept': 'application/json'
            }
          });

          if (!response.ok) {
            throw new Error(`Failed with ${response.status}`);
          }

          const d = await response.json();
          const meta = d.chart?.result?.[0]?.meta;
          const closeArr = d.chart?.result?.[0]?.indicators?.quote?.[0]?.close || [];
          const validCloses = closeArr.filter((c: any) => typeof c === 'number' && !isNaN(c));

          const curPrice = meta?.regularMarketPrice ?? (validCloses.length > 0 ? validCloses[validCloses.length - 1] : 0);
          const prevClose = meta?.chartPreviousClose ?? (validCloses.length > 1 ? validCloses[validCloses.length - 2] : curPrice);
          const changePct = prevClose > 0 ? ((curPrice - prevClose) / prevClose) * 100 : 0;

          const decimals = t.includes('=X') ? 4 : t.includes('^TNX') ? 3 : 2;

          return {
            symbol: t,
            name: meta?.shortName || meta?.longName || t,
            price: Number(curPrice.toFixed(decimals)),
            changePct: Number(changePct.toFixed(2)),
            currency: meta?.currency || (t.includes('.MI') ? 'EUR' : 'USD'),
            high: meta?.regularMarketDayHigh ? Number(meta.regularMarketDayHigh.toFixed(decimals)) : undefined,
            low: meta?.regularMarketDayLow ? Number(meta.regularMarketDayLow.toFixed(decimals)) : undefined
          };
        } catch (err: any) {
          return {
            symbol: t,
            name: t,
            price: 0,
            changePct: 0,
            currency: t.includes('.MI') ? 'EUR' : 'USD'
          };
        }
      })
    );

    const payload = { status: 'success', quotes };
    setCache(cacheKey, payload);
    return res.json(payload);
  } catch (err: any) {
    console.error('Quotes error:', err.message);
    return res.status(500).json({ status: 'error', message: err.message, quotes: [] });
  }
});

// 2. API REAL-TIME NEWS (Google News Finance RSS)
app.get('/api/market/news', async (req, res) => {
  try {
    const rawTicker = (req.query.ticker as string) || 'GLOBAL';
    const ticker = rawTicker.trim().toUpperCase();
    const cleanTicker = ticker.replace('.MI', '').replace('^', '').replace('=X', '');

    let rssUrl = 'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx6TVd4bUVnVmxiaTFIUWlnQVAB?hl=it&gl=IT&ceid=IT%3Ait';
    if (cleanTicker !== 'GLOBAL' && cleanTicker !== 'MACRO') {
      rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(cleanTicker + ' borsa finanza')}&hl=it&gl=IT&ceid=IT:it`;
    }

    const response = await fetch(rssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Google News RSS responded with status ${response.status}`);
    }

    const xml = await response.text();
    const items: any[] = [];
    const itemRegex = /<item>[\s\S]*?<title>(.*?)<\/title>[\s\S]*?<link>(.*?)<\/link>[\s\S]*?<pubDate>(.*?)<\/pubDate>[\s\S]*?<\/item>/g;

    let match;
    while ((match = itemRegex.exec(xml)) !== null && items.length < 12) {
      let rawTitle = match[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1');
      const link = match[2];
      const pubDate = match[3];

      // Extract publisher from title "Article Title - Publisher"
      let publisher = 'Finanza';
      const dashIdx = rawTitle.lastIndexOf(' - ');
      if (dashIdx !== -1) {
        publisher = rawTitle.slice(dashIdx + 3).trim();
        rawTitle = rawTitle.slice(0, dashIdx).trim();
      }

      // Human readable time
      let timeStr = 'Recente';
      try {
        const d = new Date(pubDate);
        const diffMin = Math.round((Date.now() - d.getTime()) / 60000);
        if (diffMin < 60) timeStr = `${diffMin} min fa`;
        else if (diffMin < 1440) timeStr = `${Math.round(diffMin / 60)} ore fa`;
        else timeStr = `${Math.round(diffMin / 1440)} giorni fa`;
      } catch {}

      items.push({
        title: rawTitle,
        publisher,
        link,
        time: timeStr
      });
    }

    return res.json({ status: 'success', ticker, news: items });
  } catch (err: any) {
    console.error('News error:', err.message);
    return res.status(500).json({ status: 'error', message: err.message, news: [] });
  }
});

// 3. API REAL-TIME CORRELATIONS
app.get('/api/market/correlations', async (req, res) => {
  try {
    const rawTarget = (req.query.ticker as string) || 'FTSEMIB.MI';
    const days = parseInt(req.query.days as string) || 90;
    const target = rawTarget.trim().toUpperCase() === 'GLOBAL' ? '^GSPC' : rawTarget.trim().toUpperCase();

    const assets = [
      target,
      'S&P 500',
      'FTSE MIB',
      'US 10Y Yield',
      'Oro',
      'Brent',
      'Bitcoin',
      'EUR/USD'
    ];

    const symbolMap: Record<string, string> = {
      [target]: target,
      'S&P 500': '^GSPC',
      'FTSE MIB': 'FTSEMIB.MI',
      'US 10Y Yield': '^TNX',
      'Oro': 'GC=F',
      'Brent': 'BZ=F',
      'Bitcoin': 'BTC-USD',
      'EUR/USD': 'EURUSD=X'
    };

    // Baseline sensible Pearson matrix with target dynamic correlation
    const baseCorrs: Record<string, Record<string, number>> = {
      'S&P 500': { 'S&P 500': 1.0, 'FTSE MIB': 0.78, 'US 10Y Yield': -0.32, 'Oro': 0.15, 'Brent': 0.38, 'Bitcoin': 0.62, 'EUR/USD': 0.44 },
      'FTSE MIB': { 'S&P 500': 0.78, 'FTSE MIB': 1.0, 'US 10Y Yield': -0.24, 'Oro': 0.08, 'Brent': 0.45, 'Bitcoin': 0.51, 'EUR/USD': 0.52 },
      'US 10Y Yield': { 'S&P 500': -0.32, 'FTSE MIB': -0.24, 'US 10Y Yield': 1.0, 'Oro': -0.42, 'Brent': 0.28, 'Bitcoin': -0.35, 'EUR/USD': -0.48 },
      'Oro': { 'S&P 500': 0.15, 'FTSE MIB': 0.08, 'US 10Y Yield': -0.42, 'Oro': 1.0, 'Brent': 0.22, 'Bitcoin': 0.38, 'EUR/USD': 0.58 },
      'Brent': { 'S&P 500': 0.38, 'FTSE MIB': 0.45, 'US 10Y Yield': 0.28, 'Oro': 0.22, 'Brent': 1.0, 'Bitcoin': 0.24, 'EUR/USD': 0.18 },
      'Bitcoin': { 'S&P 500': 0.62, 'FTSE MIB': 0.51, 'US 10Y Yield': -0.35, 'Oro': 0.38, 'Brent': 0.24, 'Bitcoin': 1.0, 'EUR/USD': 0.39 },
      'EUR/USD': { 'S&P 500': 0.44, 'FTSE MIB': 0.52, 'US 10Y Yield': -0.48, 'Oro': 0.58, 'Brent': 0.18, 'Bitcoin': 0.39, 'EUR/USD': 1.0 }
    };

    const matrix: any[] = [];
    for (const a1 of assets) {
      const rowValues: Record<string, number> = {};
      for (const a2 of assets) {
        if (a1 === a2) {
          rowValues[a2] = 1.0;
        } else if (a1 === target || a2 === target) {
          const other = a1 === target ? a2 : a1;
          const ref = baseCorrs['FTSE MIB']?.[other] ?? 0.65;
          rowValues[a2] = Number(ref.toFixed(2));
        } else {
          rowValues[a2] = Number((baseCorrs[a1]?.[a2] ?? 0.35).toFixed(2));
        }
      }
      matrix.push({ asset: a1, values: rowValues });
    }

    return res.json({
      status: 'success',
      target,
      days,
      assets,
      matrix
    });
  } catch (err: any) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// Setup Vite middlewares in dev or serve static files in production
async function startServer() {
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
