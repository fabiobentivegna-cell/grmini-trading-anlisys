import { CandleData, DivergencePoint, SentimentDivergenceAlert } from '../types';
import { CandleSentimentInfo } from './sentimentOverlayService';

const STORAGE_KEYS = {
  DIVERGENCE_MONITORING: 'market_station_divergence_monitoring',
  DIVERGENCE_SENSITIVITY: 'market_station_divergence_sensitivity',
  DIVERGENCE_HISTORY: 'market_station_divergence_history'
};

export const divergenceService = {
  detectActiveDivergence(
    candles: CandleData[],
    sentimentMap: Map<string | number, CandleSentimentInfo>,
    ticker: string,
    sensitivity: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM'
  ): SentimentDivergenceAlert | null {
    if (!candles || candles.length < 10) return null;

    const n = candles.length;
    const currentCandle = candles[n - 1];
    const currentSentiment = sentimentMap.get(currentCandle.time);
    if (!currentSentiment) return null;

    const lookback = Math.min(25, n - 1);
    const windowCandles = candles.slice(n - lookback);

    let highestPrice = -Infinity;
    let lowestPrice = Infinity;
    let highestIndex = 0;
    let lowestIndex = 0;

    windowCandles.forEach((c, idx) => {
      if (c.high > highestPrice) {
        highestPrice = c.high;
        highestIndex = idx;
      }
      if (c.low < lowestPrice) {
        lowestPrice = c.low;
        lowestIndex = idx;
      }
    });

    const currentPrice = currentCandle.close;
    const startCandle = windowCandles[0];
    const startSentiment = sentimentMap.get(startCandle.time)?.score ?? 0;

    const priceChangePct = Number((((currentPrice - startCandle.close) / startCandle.close) * 100).toFixed(2));
    const sentimentChange = Number((currentSentiment.score - startSentiment).toFixed(2));

    const priceThreshold = sensitivity === 'HIGH' ? 1.0 : sensitivity === 'MEDIUM' ? 1.8 : 2.8;
    const sentimentThreshold = sensitivity === 'HIGH' ? 0.18 : sensitivity === 'MEDIUM' ? 0.28 : 0.40;

    // Peak comparison: Price higher high vs Sentiment lower high (Bearish)
    const prevPeakCandle = windowCandles[highestIndex];
    const prevPeakSentiment = sentimentMap.get(prevPeakCandle.time)?.score ?? 0;
    const isNewHighWithLowerSentiment =
      currentPrice >= highestPrice * 0.99 &&
      highestIndex < windowCandles.length - 2 &&
      currentSentiment.score < prevPeakSentiment - 0.20;

    // 1. BEARISH DIVERGENCE: Nuovo massimo di prezzo con inclinazione decrescente del sentiment AI
    const isPriceNearHighs = currentPrice >= highestPrice * 0.985 || priceChangePct >= priceThreshold;
    const isSentimentDropping = sentimentChange <= -sentimentThreshold || isNewHighWithLowerSentiment;

    if (isPriceNearHighs && isSentimentDropping) {
      const severity: 'HIGH' | 'MEDIUM' | 'LOW' =
        priceChangePct >= 2.5 && sentimentChange <= -0.35 ? 'HIGH' : priceChangePct >= 1.5 ? 'MEDIUM' : 'LOW';

      return {
        id: `div_bear_${ticker}_${currentCandle.time}_${Date.now()}`,
        ticker,
        type: 'BEARISH_DIVERGENCE',
        severity,
        priceChangePct,
        sentimentChange,
        currentPrice,
        currentSentiment: currentSentiment.score,
        title: `⚠️ Divergenza Ribassista Prezzo/Sentiment su ${ticker}`,
        description: `Il prezzo ha segnato un nuovo picco relativo (+${priceChangePct}%), ma la pendenza dello score Sentiment a 30 giorni è discendente (${sentimentChange >= 0 ? '+' : ''}${sentimentChange} pt, valore attuale: ${currentSentiment.score >= 0 ? '+' : ''}${currentSentiment.score}). Segnale di distribuzione e divergenza negativa.`,
        tradingImplication: 'Possibile esaurimento del momentum in acquisto. Rischio di ritracciamento o correzione fisiologica sul breve termine.',
        timestamp: new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        timeKey: currentCandle.time,
        triggered: true,
        active: true
      };
    }

    // Trough comparison: Price lower low vs Sentiment higher low (Bullish)
    const prevTroughCandle = windowCandles[lowestIndex];
    const prevTroughSentiment = sentimentMap.get(prevTroughCandle.time)?.score ?? 0;
    const isNewLowWithHigherSentiment =
      currentPrice <= lowestPrice * 1.01 &&
      lowestIndex < windowCandles.length - 2 &&
      currentSentiment.score > prevTroughSentiment + 0.20;

    // 2. BULLISH DIVERGENCE: Nuovo minimo di prezzo con inclinazione crescente del sentiment AI
    const isPriceNearLows = currentPrice <= lowestPrice * 1.015 || priceChangePct <= -priceThreshold;
    const isSentimentRising = sentimentChange >= sentimentThreshold || isNewLowWithHigherSentiment;

    if (isPriceNearLows && isSentimentRising) {
      const severity: 'HIGH' | 'MEDIUM' | 'LOW' =
        priceChangePct <= -2.5 && sentimentChange >= 0.35 ? 'HIGH' : priceChangePct <= -1.5 ? 'MEDIUM' : 'LOW';

      return {
        id: `div_bull_${ticker}_${currentCandle.time}_${Date.now()}`,
        ticker,
        type: 'BULLISH_DIVERGENCE',
        severity,
        priceChangePct,
        sentimentChange,
        currentPrice,
        currentSentiment: currentSentiment.score,
        title: `🚀 Divergenza Rialzista Prezzo/Sentiment su ${ticker}`,
        description: `Il prezzo ha testato nuovi minimi relativi (${priceChangePct}%), mentre la pendenza del sentiment Gemini AI è marcatamente ascendente (${sentimentChange >= 0 ? '+' : ''}${sentimentChange} pt, valore attuale: +${currentSentiment.score}). Segnale di accumulazione silenziosa.`,
        tradingImplication: 'Flusso di notizie favorevole non ancora incorporato nelle quotazioni di mercato. Potenziale opportunità di rimbalzo o inversione rialzista.',
        timestamp: new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        timeKey: currentCandle.time,
        triggered: true,
        active: true
      };
    }

    return null;
  },

  detectHistoricalDivergences(
    candles: CandleData[],
    sentimentMap: Map<string | number, CandleSentimentInfo>,
    ticker: string
  ): DivergencePoint[] {
    const points: DivergencePoint[] = [];
    if (!candles || candles.length < 15) return points;

    // Swing-based divergence detection: finds local peaks and troughs
    interface Swing {
      index: number;
      candle: CandleData;
      type: 'PEAK' | 'TROUGH';
      sentiment: number;
    }

    const swings: Swing[] = [];
    const radius = 3; // 3 bars left, 3 bars right

    for (let i = radius; i < candles.length - radius; i++) {
      const cur = candles[i];
      let isPeak = true;
      let isTrough = true;

      for (let r = 1; r <= radius; r++) {
        if (candles[i - r].high >= cur.high || candles[i + r].high > cur.high) {
          isPeak = false;
        }
        if (candles[i - r].low <= cur.low || candles[i + r].low < cur.low) {
          isTrough = false;
        }
      }

      const sent = sentimentMap.get(cur.time)?.score ?? 0;

      if (isPeak) {
        swings.push({ index: i, candle: cur, type: 'PEAK', sentiment: sent });
      } else if (isTrough) {
        swings.push({ index: i, candle: cur, type: 'TROUGH', sentiment: sent });
      }
    }

    // Compare consecutive peaks for Bearish Divergence
    const peaks = swings.filter(s => s.type === 'PEAK');
    for (let p = 1; p < peaks.length; p++) {
      const prev = peaks[p - 1];
      const curr = peaks[p];
      const barsApart = curr.index - prev.index;

      if (barsApart >= 4 && barsApart <= 35) {
        const priceSlope = (curr.candle.high - prev.candle.high) / prev.candle.high;
        const sentSlope = curr.sentiment - prev.sentiment;

        // Regular Bearish Divergence: Price Higher High, Sentiment Lower High
        if (priceSlope >= 0.015 && sentSlope <= -0.22) {
          points.push({
            time: curr.candle.time,
            type: 'BEARISH',
            price: curr.candle.high,
            sentimentScore: curr.sentiment,
            label: '▼ Div. Bearish',
            description: `Prezzo +${(priceSlope * 100).toFixed(1)}% vs Sentiment ${(sentSlope >= 0 ? '+' : '')}${sentSlope.toFixed(2)}`,
            severity: priceSlope >= 0.03 || sentSlope <= -0.40 ? 'HIGH' : 'MEDIUM'
          });
        }
      }
    }

    // Compare consecutive troughs for Bullish Divergence
    const troughs = swings.filter(s => s.type === 'TROUGH');
    for (let t = 1; t < troughs.length; t++) {
      const prev = troughs[t - 1];
      const curr = troughs[t];
      const barsApart = curr.index - prev.index;

      if (barsApart >= 4 && barsApart <= 35) {
        const priceSlope = (curr.candle.low - prev.candle.low) / prev.candle.low;
        const sentSlope = curr.sentiment - prev.sentiment;

        // Regular Bullish Divergence: Price Lower Low, Sentiment Higher Low
        if (priceSlope <= -0.015 && sentSlope >= 0.22) {
          points.push({
            time: curr.candle.time,
            type: 'BULLISH',
            price: curr.candle.low,
            sentimentScore: curr.sentiment,
            label: '▲ Div. Bullish',
            description: `Prezzo ${(priceSlope * 100).toFixed(1)}% vs Sentiment +${sentSlope.toFixed(2)}`,
            severity: priceSlope <= -0.03 || sentSlope >= 0.40 ? 'HIGH' : 'MEDIUM'
          });
        }
      }
    }

    return points;
  },

  isMonitoringEnabled(): boolean {
    try {
      const val = localStorage.getItem(STORAGE_KEYS.DIVERGENCE_MONITORING);
      return val !== null ? JSON.parse(val) : true;
    } catch {
      return true;
    }
  },

  setMonitoringEnabled(enabled: boolean): void {
    try {
      localStorage.setItem(STORAGE_KEYS.DIVERGENCE_MONITORING, JSON.stringify(enabled));
    } catch {}
  },

  getSensitivity(): 'HIGH' | 'MEDIUM' | 'LOW' {
    try {
      const val = localStorage.getItem(STORAGE_KEYS.DIVERGENCE_SENSITIVITY);
      return (val as any) || 'MEDIUM';
    } catch {
      return 'MEDIUM';
    }
  },

  setSensitivity(s: 'HIGH' | 'MEDIUM' | 'LOW'): void {
    try {
      localStorage.setItem(STORAGE_KEYS.DIVERGENCE_SENSITIVITY, s);
    } catch {}
  },

  getHistory(): SentimentDivergenceAlert[] {
    try {
      const val = localStorage.getItem(STORAGE_KEYS.DIVERGENCE_HISTORY);
      return val ? JSON.parse(val) : [];
    } catch {
      return [];
    }
  },

  saveAlertToHistory(alert: SentimentDivergenceAlert): void {
    try {
      const existing = this.getHistory();
      const isDuplicate = existing.some(
        a => a.ticker === alert.ticker && a.type === alert.type && Math.abs(a.priceChangePct - alert.priceChangePct) < 0.2
      );
      if (!isDuplicate) {
        const updated = [alert, ...existing].slice(0, 30);
        localStorage.setItem(STORAGE_KEYS.DIVERGENCE_HISTORY, JSON.stringify(updated));
      }
    } catch {}
  },

  clearHistory(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.DIVERGENCE_HISTORY);
    } catch {}
  }
};
