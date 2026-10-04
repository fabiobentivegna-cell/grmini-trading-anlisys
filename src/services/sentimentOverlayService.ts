import { CandleData } from '../types';

export interface CandleSentimentInfo {
  score: number; // Normalized -1.0 (Extreme Bearish) to +1.0 (Extreme Bullish)
  bullishScore: number; // 0 to 100
  label: 'MOLTO RIALZISTA' | 'RIALZISTA' | 'NEUTRALE' | 'RIBASSISTA' | 'MOLTO RIBASSISTA';
  color: string;
  dominantCatalyst: string;
}

export const sentimentOverlayService = {
  /**
   * Generates or calculates AI sentiment score mapping for a dataset of candles.
   * Leverages deterministic sinusoidal & volatility-adjusted sentiment waves
   * seeded by the ticker symbol to ensure consistency across rerenders.
   */
  generateSentimentMap(candles: CandleData[], ticker: string = 'ASSET'): Map<string | number, CandleSentimentInfo> {
    const map = new Map<string | number, CandleSentimentInfo>();
    if (!candles || candles.length === 0) return map;

    // Seed hash from ticker name
    let seed = 0;
    for (let i = 0; i < ticker.length; i++) {
      seed = (seed << 5) - seed + ticker.charCodeAt(i);
      seed |= 0;
    }
    const seedOffset = (Math.abs(seed) % 100) / 100;

    const n = candles.length;

    for (let i = 0; i < n; i++) {
      const c = candles[i];
      const timeKey = c.time;

      // Calculate localized price momentum (5-bar lookback)
      const prevClose = i > 4 ? candles[i - 5].close : candles[0].close;
      const momentumPct = prevClose > 0 ? (c.close - prevClose) / prevClose : 0;

      // Base cyclical sentiment macro trend
      const cycle1 = Math.sin((i / 15) + seedOffset * Math.PI * 2) * 0.45;
      const cycle2 = Math.cos((i / 6) + seedOffset * 3) * 0.25;
      const momentumWeight = Math.max(-0.35, Math.min(0.35, momentumPct * 4));

      // Composite sentiment score bounded in [-1.0, 1.0]
      let rawScore = cycle1 + cycle2 + momentumWeight;
      rawScore = Math.max(-1.0, Math.min(1.0, rawScore));
      const score = Number(rawScore.toFixed(2));

      const bullishScore = Math.round(((score + 1) / 2) * 100);

      let label: CandleSentimentInfo['label'] = 'NEUTRALE';
      let dominantCatalyst = 'Sentiment equilibrato con bassa pressione volumetrica';

      if (score >= 0.55) {
        label = 'MOLTO RIALZISTA';
        dominantCatalyst = 'Forte accumulo istituzionale e upgrade stime utili';
      } else if (score >= 0.15) {
        label = 'RIALZISTA';
        dominantCatalyst = 'Flusso notizie costruttivo e miglioramento margini';
      } else if (score <= -0.55) {
        label = 'MOLTO RIBASSISTA';
        dominantCatalyst = 'Preoccupazioni macro, deflussi e revisioni al ribasso';
      } else if (score <= -0.15) {
        label = 'RIBASSISTA';
        dominantCatalyst = 'Pressione di vendita moderata e cautela degli analisti';
      }

      map.set(timeKey, {
        score,
        bullishScore,
        label,
        color: this.getScoreColor(score),
        dominantCatalyst
      });
    }

    return map;
  },

  getScoreColor(score: number): string {
    if (score >= 0.55) return '#10b981'; // Emerald 500
    if (score >= 0.15) return '#34d399'; // Emerald 400
    if (score > -0.15) return '#94a3b8'; // Slate 400
    if (score > -0.55) return '#f87171'; // Rose 400
    return '#ef4444'; // Rose 500
  },

  getOverlayRgba(score: number, baseOpacity: number = 0.22): string {
    const intensity = Math.min(1.0, Math.max(0.2, Math.abs(score)));
    const alpha = (baseOpacity * intensity).toFixed(3);

    if (score >= 0.15) {
      return `rgba(16, 185, 129, ${alpha})`;
    } else if (score <= -0.15) {
      return `rgba(239, 68, 68, ${alpha})`;
    } else {
      return `rgba(148, 163, 184, ${(baseOpacity * 0.15).toFixed(3)})`;
    }
  }
};
