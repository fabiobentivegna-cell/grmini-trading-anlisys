import { CandleData, SmcAnalysisResult, SmcStructureBreak, SmcFairValueGap, SmcOrderBlock, SmcLiquiditySweep } from '../types';

export interface SmcOptions {
  swingPeriod?: number; // default 5 (5 bars left, 5 bars right)
  fvgMinPct?: number; // minimum gap percent
  maxItems?: number;
}

export const smcService = {
  /**
   * Identifica i pivot high e pivot low (Swing Points) su una serie storica
   */
  findSwingPoints(candles: CandleData[], period: number = 5) {
    const n = candles.length;
    const highs: { index: number; price: number; time: string | number }[] = [];
    const lows: { index: number; price: number; time: string | number }[] = [];

    for (let i = period; i < n - period; i++) {
      const currentHigh = candles[i].high;
      const currentLow = candles[i].low;

      let isPivotHigh = true;
      let isPivotLow = true;

      for (let j = 1; j <= period; j++) {
        if (candles[i - j].high >= currentHigh || candles[i + j].high > currentHigh) {
          isPivotHigh = false;
        }
        if (candles[i - j].low <= currentLow || candles[i + j].low < currentLow) {
          isPivotLow = false;
        }
      }

      if (isPivotHigh) {
        highs.push({ index: i, price: currentHigh, time: candles[i].time });
      }
      if (isPivotLow) {
        lows.push({ index: i, price: currentLow, time: candles[i].time });
      }
    }

    return { highs, lows };
  },

  /**
   * Calcolo automatico BOS (Break of Structure) e CHoCH (Change of Character)
   */
  detectBOSandCHoCH(candles: CandleData[], period: number = 5): SmcStructureBreak[] {
    const n = candles.length;
    if (n < period * 3) return [];

    const { highs, lows } = this.findSwingPoints(candles, period);
    const breaks: SmcStructureBreak[] = [];

    // Track active trend based on higher highs/lows
    let currentTrend: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';

    // Combine swing points in chronological order
    const allSwings = [
      ...highs.map(h => ({ ...h, type: 'HIGH' as const })),
      ...lows.map(l => ({ ...l, type: 'LOW' as const }))
    ].sort((a, b) => a.index - b.index);

    if (allSwings.length < 2) return [];

    let lastHigh: { index: number; price: number; time: string | number } | null = null;
    let lastLow: { index: number; price: number; time: string | number } | null = null;

    for (let i = 0; i < n; i++) {
      const c = candles[i];

      // Update confirmed swings up to this point
      const swingsUpToNow = allSwings.filter(s => s.index <= i - period);
      const recentHighs = swingsUpToNow.filter(s => s.type === 'HIGH');
      const recentLows = swingsUpToNow.filter(s => s.type === 'LOW');

      if (recentHighs.length > 0) lastHigh = recentHighs[recentHighs.length - 1];
      if (recentLows.length > 0) lastLow = recentLows[recentLows.length - 1];

      if (!lastHigh || !lastLow) continue;

      // Bullish Breakout: Candle closes ABOVE last swing high
      if (c.close > lastHigh.price && i > lastHigh.index) {
        const isChoch = currentTrend === 'BEARISH';
        const type = isChoch ? 'CHoCH' : 'BOS';

        // Check if break not already recorded for this swing
        const alreadyExists = breaks.some(b => b.startIndex === lastHigh!.index && b.direction === 'BULLISH');
        if (!alreadyExists) {
          breaks.push({
            id: `smc_break_${type}_${i}_bull`,
            type,
            direction: 'BULLISH',
            price: lastHigh.price,
            startIndex: lastHigh.index,
            endIndex: i,
            startTime: lastHigh.time,
            endTime: c.time,
            label: `${type} Bullish (${lastHigh.price.toFixed(2)})`
          });
          currentTrend = 'BULLISH';
        }
      }

      // Bearish Breakout: Candle closes BELOW last swing low
      if (c.close < lastLow.price && i > lastLow.index) {
        const isChoch = currentTrend === 'BULLISH';
        const type = isChoch ? 'CHoCH' : 'BOS';

        const alreadyExists = breaks.some(b => b.startIndex === lastLow!.index && b.direction === 'BEARISH');
        if (!alreadyExists) {
          breaks.push({
            id: `smc_break_${type}_${i}_bear`,
            type,
            direction: 'BEARISH',
            price: lastLow.price,
            startIndex: lastLow.index,
            endIndex: i,
            startTime: lastLow.time,
            endTime: c.time,
            label: `${type} Bearish (${lastLow.price.toFixed(2)})`
          });
          currentTrend = 'BEARISH';
        }
      }
    }

    return breaks.slice(-25); // Return the most recent 25 structure breaks
  },

  /**
   * Rilevamento Fair Value Gaps (FVG) su 3 candele consecutive
   */
  detectFairValueGaps(candles: CandleData[], minGapPct: number = 0.05): SmcFairValueGap[] {
    const n = candles.length;
    if (n < 3) return [];

    const fvgs: SmcFairValueGap[] = [];

    for (let i = 2; i < n; i++) {
      const c1 = candles[i - 2]; // Candela 1
      const c2 = candles[i - 1]; // Candela 2 (Impulso)
      const c3 = candles[i];     // Candela 3

      // 1. Bullish FVG: Candela 3 Low > Candela 1 High
      if (c3.low > c1.high) {
        const gapSize = c3.low - c1.high;
        const gapPct = (gapSize / c2.close) * 100;

        if (gapPct >= minGapPct) {
          const top = c3.low;
          const bottom = c1.high;
          const mid = (top + bottom) / 2;

          // Check if mitigated by future candles
          let isMitigated = false;
          let endIndex = Math.min(n - 1, i + 30);

          for (let k = i + 1; k < n; k++) {
            if (candles[k].low <= bottom) {
              isMitigated = true;
              endIndex = k;
              break;
            }
          }

          fvgs.push({
            id: `fvg_bull_${i}`,
            direction: 'BULLISH',
            startIndex: i - 1,
            endIndex,
            startTime: c2.time,
            topPrice: top,
            bottomPrice: bottom,
            midPrice: mid,
            mitigated: isMitigated
          });
        }
      }

      // 2. Bearish FVG: Candela 3 High < Candela 1 Low
      if (c3.high < c1.low) {
        const gapSize = c1.low - c3.high;
        const gapPct = (gapSize / c2.close) * 100;

        if (gapPct >= minGapPct) {
          const top = c1.low;
          const bottom = c3.high;
          const mid = (top + bottom) / 2;

          let isMitigated = false;
          let endIndex = Math.min(n - 1, i + 30);

          for (let k = i + 1; k < n; k++) {
            if (candles[k].high >= top) {
              isMitigated = true;
              endIndex = k;
              break;
            }
          }

          fvgs.push({
            id: `fvg_bear_${i}`,
            direction: 'BEARISH',
            startIndex: i - 1,
            endIndex,
            startTime: c2.time,
            topPrice: top,
            bottomPrice: bottom,
            midPrice: mid,
            mitigated: isMitigated
          });
        }
      }
    }

    return fvgs.slice(-30);
  },

  /**
   * Rilevamento Order Blocks (OB) istituzionali
   */
  detectOrderBlocks(candles: CandleData[]): SmcOrderBlock[] {
    const n = candles.length;
    if (n < 4) return [];

    const orderBlocks: SmcOrderBlock[] = [];

    for (let i = 1; i < n - 2; i++) {
      const c = candles[i];
      const next1 = candles[i + 1];
      const next2 = candles[i + 2];

      const isBearishCandle = c.close < c.open;
      const isBullishCandle = c.close > c.open;

      // Bullish Order Block: Ultima candela ribassista prima di una forte espansione rialzista
      if (isBearishCandle && next1.close > next1.open && next2.close > next2.open) {
        const impulseMove = next2.close - c.low;
        const avgBody = Math.abs(c.close - c.open);
        if (impulseMove > avgBody * 2.2) {
          // Verify mitigation
          let mitigated = false;
          let endIdx = Math.min(n - 1, i + 40);
          for (let k = i + 3; k < n; k++) {
            if (candles[k].low <= c.low) {
              mitigated = true;
              endIdx = k;
              break;
            }
          }

          orderBlocks.push({
            id: `ob_bull_${i}`,
            direction: 'BULLISH',
            startIndex: i,
            endIndex: endIdx,
            startTime: c.time,
            topPrice: Math.max(c.open, c.high),
            bottomPrice: c.low,
            mitigated
          });
        }
      }

      // Bearish Order Block: Ultima candela rialzista prima di una forte espansione ribassista
      if (isBullishCandle && next1.close < next1.open && next2.close < next2.open) {
        const impulseMove = c.high - next2.close;
        const avgBody = Math.abs(c.close - c.open);
        if (impulseMove > avgBody * 2.2) {
          let mitigated = false;
          let endIdx = Math.min(n - 1, i + 40);
          for (let k = i + 3; k < n; k++) {
            if (candles[k].high >= c.high) {
              mitigated = true;
              endIdx = k;
              break;
            }
          }

          orderBlocks.push({
            id: `ob_bear_${i}`,
            direction: 'BEARISH',
            startIndex: i,
            endIndex: endIdx,
            startTime: c.time,
            topPrice: c.high,
            bottomPrice: Math.min(c.open, c.low),
            mitigated
          });
        }
      }
    }

    return orderBlocks.slice(-20);
  },

  /**
   * Rilevamento Liquidity Sweeps (Sweep di Massimi e Minimi con chiusura interna)
   */
  detectLiquiditySweeps(candles: CandleData[], period: number = 5): SmcLiquiditySweep[] {
    const n = candles.length;
    if (n < period * 2) return [];

    const { highs, lows } = this.findSwingPoints(candles, period);
    const sweeps: SmcLiquiditySweep[] = [];

    for (let i = period + 2; i < n; i++) {
      const c = candles[i];

      // Recent swing highs before this candle
      const pastHighs = highs.filter(h => h.index < i - 1 && h.index >= i - 50);
      for (const sh of pastHighs) {
        // High wick crosses above swing high, but close is strictly below swing high
        if (c.high > sh.price && c.close < sh.price && (c.high - sh.price) > 0.0001) {
          const upperWickPct = (c.high - Math.max(c.open, c.close)) / (c.high - c.low || 1);
          if (upperWickPct > 0.35) {
            sweeps.push({
              id: `sweep_high_${i}`,
              direction: 'BEARISH', // Bearish sweep / Fake breakout to upside
              index: i,
              time: c.time,
              levelPrice: sh.price,
              wickPrice: c.high,
              closePrice: c.close,
              label: `Sweep Liquidity Highs (€${sh.price.toFixed(2)})`
            });
            break;
          }
        }
      }

      // Recent swing lows before this candle
      const pastLows = lows.filter(l => l.index < i - 1 && l.index >= i - 50);
      for (const sl of pastLows) {
        // Low wick crosses below swing low, but close is strictly above swing low
        if (c.low < sl.price && c.close > sl.price && (sl.price - c.low) > 0.0001) {
          const lowerWickPct = (Math.min(c.open, c.close) - c.low) / (c.high - c.low || 1);
          if (lowerWickPct > 0.35) {
            sweeps.push({
              id: `sweep_low_${i}`,
              direction: 'BULLISH', // Bullish sweep / Fake breakdown to downside
              index: i,
              time: c.time,
              levelPrice: sl.price,
              wickPrice: c.low,
              closePrice: c.close,
              label: `Sweep Liquidity Lows (€${sl.price.toFixed(2)})`
            });
            break;
          }
        }
      }
    }

    return sweeps.slice(-15);
  },

  /**
   * Analisi completa Smart Money Concepts
   */
  computeSmcAnalysis(candles: CandleData[], options?: SmcOptions): SmcAnalysisResult {
    const period = options?.swingPeriod || 5;
    const structureBreaks = this.detectBOSandCHoCH(candles, period);
    const fairValueGaps = this.detectFairValueGaps(candles, options?.fvgMinPct || 0.04);
    const orderBlocks = this.detectOrderBlocks(candles);
    const liquiditySweeps = this.detectLiquiditySweeps(candles, period);

    let currentTrend: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    if (structureBreaks.length > 0) {
      currentTrend = structureBreaks[structureBreaks.length - 1].direction;
    }

    return {
      structureBreaks,
      fairValueGaps,
      orderBlocks,
      liquiditySweeps,
      currentTrend
    };
  }
};
