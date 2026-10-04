import { CandleData, BacktestConfig, BacktestResult, BacktestTrade, BacktestEquityPoint, MaType, RegimeFilterType } from '../types';

export const DEFAULT_BACKTEST_CONFIG: BacktestConfig = {
  fastPeriod: 9,
  fastType: 'EMA',
  slowPeriod: 21,
  slowType: 'EMA',
  direction: 'LONG_ONLY',
  initialCapital: 10000,
  feePct: 0.1, // 0.1% per trade
  stopLossPct: 0, // disattivato di default
  takeProfitPct: 0, // disattivato di default
  regimeFilter: 'NONE',
  adxThreshold: 25,
  regimeSmaPeriod: 200
};

export interface StrategyPreset {
  id: string;
  name: string;
  description: string;
  config: Partial<BacktestConfig>;
}

export const STRATEGY_PRESETS: StrategyPreset[] = [
  {
    id: 'momentum_9_21',
    name: '⚡ Momentum Swing (EMA 9 / 21)',
    description: 'Strategia reattiva per trend a medio/breve termine, ideale per catturare accelerazioni di prezzo.',
    config: { fastPeriod: 9, fastType: 'EMA', slowPeriod: 21, slowType: 'EMA', direction: 'LONG_ONLY', stopLossPct: 3, takeProfitPct: 8, regimeFilter: 'NONE' }
  },
  {
    id: 'adx_regime_filter',
    name: '🛡️ Trend Filter ADX + EMA (Anti-Whipsaw)',
    description: 'Apre trade solo in presenza di trend direzionale forte (ADX > 25), bloccando i falsi segnali in fasi laterali di congestione.',
    config: { fastPeriod: 9, fastType: 'EMA', slowPeriod: 21, slowType: 'EMA', direction: 'LONG_ONLY', stopLossPct: 3, takeProfitPct: 9, regimeFilter: 'ADX_TREND', adxThreshold: 25 }
  },
  {
    id: 'golden_cross_50_200',
    name: '🏆 Golden Cross Classico (SMA 50 / 200)',
    description: 'Il crossover istituzionale più famoso al mondo per filtrare i grandi trend di lungo periodo.',
    config: { fastPeriod: 50, fastType: 'SMA', slowPeriod: 200, slowType: 'SMA', direction: 'LONG_ONLY', stopLossPct: 0, takeProfitPct: 0, regimeFilter: 'NONE' }
  },
  {
    id: 'sma200_regime_filter',
    name: '🏛️ Regime Istituzionale SMA 200 + EMA 20/50',
    description: 'Filtro di regime macro: autorizza ingressi rialzisti esclusivamente quando il prezzo batte al di sopra della SMA a 200 periodi.',
    config: { fastPeriod: 20, fastType: 'EMA', slowPeriod: 50, slowType: 'EMA', direction: 'LONG_ONLY', stopLossPct: 4, takeProfitPct: 12, regimeFilter: 'SMA200_TREND', regimeSmaPeriod: 200 }
  },
  {
    id: 'long_short_fast_5_13',
    name: '⚔️ Long & Short Scalper (EMA 5 / 13)',
    description: 'Strategia bidirezionale veloce con posizioni sia rialziste che ribassiste attive continuamente.',
    config: { fastPeriod: 5, fastType: 'EMA', slowPeriod: 13, slowType: 'EMA', direction: 'LONG_AND_SHORT', stopLossPct: 2, takeProfitPct: 5, regimeFilter: 'NONE' }
  }
];

function calculateMa(candles: CandleData[], period: number, type: MaType): (number | null)[] {
  const result: (number | null)[] = new Array(candles.length).fill(null);
  if (candles.length < period) return result;

  const closes = candles.map(c => c.close);

  if (type === 'SMA') {
    let sum = 0;
    for (let i = 0; i < candles.length; i++) {
      sum += closes[i];
      if (i >= period) {
        sum -= closes[i - period];
      }
      if (i >= period - 1) {
        result[i] = sum / period;
      }
    }
  } else if (type === 'EMA') {
    const k = 2 / (period + 1);
    let ema: number | null = null;
    let initialSum = 0;

    for (let i = 0; i < candles.length; i++) {
      if (i < period - 1) {
        initialSum += closes[i];
      } else if (i === period - 1) {
        initialSum += closes[i];
        ema = initialSum / period;
        result[i] = ema;
      } else if (ema !== null) {
        ema = closes[i] * k + ema * (1 - k);
        result[i] = ema;
      }
    }
  } else if (type === 'WMA') {
    const weightSum = (period * (period + 1)) / 2;
    for (let i = period - 1; i < candles.length; i++) {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += closes[i - (period - 1 - j)] * (j + 1);
      }
      result[i] = sum / weightSum;
    }
  }

  return result;
}

function calculateAdxSeries(candles: CandleData[], period: number = 14) {
  const len = candles.length;
  const adx: (number | null)[] = new Array(len).fill(null);
  const plusDi: (number | null)[] = new Array(len).fill(null);
  const minusDi: (number | null)[] = new Array(len).fill(null);

  if (len < period + 1) return { adx, plusDi, minusDi };

  const tr: number[] = new Array(len).fill(0);
  const plusDm: number[] = new Array(len).fill(0);
  const minusDm: number[] = new Array(len).fill(0);

  for (let i = 1; i < len; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevHigh = candles[i - 1].high;
    const prevLow = candles[i - 1].low;
    const prevClose = candles[i - 1].close;

    tr[i] = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    const upMove = high - prevHigh;
    const downMove = prevLow - low;

    plusDm[i] = upMove > downMove && upMove > 0 ? upMove : 0;
    minusDm[i] = downMove > upMove && downMove > 0 ? downMove : 0;
  }

  let smoothedTr = 0;
  let smoothedPlusDm = 0;
  let smoothedMinusDm = 0;

  for (let i = 1; i <= period; i++) {
    smoothedTr += tr[i];
    smoothedPlusDm += plusDm[i];
    smoothedMinusDm += minusDm[i];
  }

  const dx: number[] = new Array(len).fill(0);

  if (smoothedTr > 0) {
    const pDi = (100 * smoothedPlusDm) / smoothedTr;
    const mDi = (100 * smoothedMinusDm) / smoothedTr;
    plusDi[period] = pDi;
    minusDi[period] = mDi;
    const diSum = pDi + mDi;
    dx[period] = diSum > 0 ? (100 * Math.abs(pDi - mDi)) / diSum : 0;
  }

  for (let i = period + 1; i < len; i++) {
    smoothedTr = smoothedTr - smoothedTr / period + tr[i];
    smoothedPlusDm = smoothedPlusDm - smoothedPlusDm / period + plusDm[i];
    smoothedMinusDm = smoothedMinusDm - smoothedMinusDm / period + minusDm[i];

    if (smoothedTr > 0) {
      const pDi = (100 * smoothedPlusDm) / smoothedTr;
      const mDi = (100 * smoothedMinusDm) / smoothedTr;
      plusDi[i] = pDi;
      minusDi[i] = mDi;
      const diSum = pDi + mDi;
      dx[i] = diSum > 0 ? (100 * Math.abs(pDi - mDi)) / diSum : 0;
    }
  }

  let dxSum = 0;
  const adxStart = period * 2;
  if (len > adxStart) {
    for (let i = period; i < adxStart; i++) {
      dxSum += dx[i];
    }
    let curAdx = dxSum / period;
    adx[adxStart] = curAdx;

    for (let i = adxStart + 1; i < len; i++) {
      curAdx = (curAdx * (period - 1) + dx[i]) / period;
      adx[i] = curAdx;
    }
  }

  return { adx, plusDi, minusDi };
}

export const backtestService = {
  runBacktest(
    candles: CandleData[],
    config: BacktestConfig,
    ticker: string = 'ASSET',
    interval: string = '1d'
  ): BacktestResult {
    if (!candles || candles.length < Math.max(config.fastPeriod, config.slowPeriod, 10)) {
      return this.getEmptyResult(config, ticker, interval, candles?.length || 0);
    }

    const fastMA = calculateMa(candles, config.fastPeriod, config.fastType);
    const slowMA = calculateMa(candles, config.slowPeriod, config.slowType);
    const sma200 = calculateMa(candles, config.regimeSmaPeriod || 200, 'SMA');
    const sma50 = calculateMa(candles, 50, 'SMA');
    const adxData = calculateAdxSeries(candles, 14);

    let tradesFilteredOutByRegime = 0;

    const trades: BacktestTrade[] = [];
    const equityCurve: BacktestEquityPoint[] = [];

    let currentEquity = config.initialCapital;
    let peakEquity = config.initialCapital;
    let maxDrawdownDollars = 0;
    let maxDrawdownPct = 0;

    const initialBenchmarkPrice = candles[0].close || 1;
    const initialCapital = config.initialCapital;
    const feeRate = Math.max(0, config.feePct) / 100;

    type ActivePosition = {
      type: 'LONG' | 'SHORT';
      entryIndex: number;
      entryDate: string;
      entryPrice: number;
      sizeDollars: number;
    };

    let activePosition: ActivePosition | null = null;
    let tradeCounter = 1;

    const startIndex = Math.max(config.fastPeriod, config.slowPeriod);

    for (let i = 0; i < candles.length; i++) {
      const c = candles[i];
      const timeStr = typeof c.time === 'string' ? c.time : new Date(Number(c.time) * 1000).toISOString().slice(0, 10);
      const close = c.close;
      const high = c.high;
      const low = c.low;

      const benchmarkEquity = initialCapital * (close / initialBenchmarkPrice);

      // Check Stop Loss & Take Profit
      if (activePosition && i > activePosition.entryIndex) {
        let exitReason: 'STOP_LOSS' | 'TAKE_PROFIT' | null = null;
        let exitPrice = close;

        if (activePosition.type === 'LONG') {
          if (config.stopLossPct > 0) {
            const slPrice = activePosition.entryPrice * (1 - config.stopLossPct / 100);
            if (low <= slPrice) {
              exitReason = 'STOP_LOSS';
              exitPrice = slPrice;
            }
          }
          if (!exitReason && config.takeProfitPct > 0) {
            const tpPrice = activePosition.entryPrice * (1 + config.takeProfitPct / 100);
            if (high >= tpPrice) {
              exitReason = 'TAKE_PROFIT';
              exitPrice = tpPrice;
            }
          }
        } else if (activePosition.type === 'SHORT') {
          if (config.stopLossPct > 0) {
            const slPrice = activePosition.entryPrice * (1 + config.stopLossPct / 100);
            if (high >= slPrice) {
              exitReason = 'STOP_LOSS';
              exitPrice = slPrice;
            }
          }
          if (!exitReason && config.takeProfitPct > 0) {
            const tpPrice = activePosition.entryPrice * (1 - config.takeProfitPct / 100);
            if (low <= tpPrice) {
              exitReason = 'TAKE_PROFIT';
              exitPrice = tpPrice;
            }
          }
        }

        if (exitReason) {
          const rawReturn = activePosition.type === 'LONG'
            ? (exitPrice - activePosition.entryPrice) / activePosition.entryPrice
            : (activePosition.entryPrice - exitPrice) / activePosition.entryPrice;

          const netReturn = rawReturn - (2 * feeRate);
          const pnlDollars = activePosition.sizeDollars * netReturn;
          currentEquity += pnlDollars;

          trades.push({
            id: tradeCounter++,
            type: activePosition.type,
            entryDate: activePosition.entryDate,
            entryPrice: Number(activePosition.entryPrice.toFixed(4)),
            exitDate: timeStr,
            exitPrice: Number(exitPrice.toFixed(4)),
            returnPct: Number((netReturn * 100).toFixed(2)),
            pnlDollars: Number(pnlDollars.toFixed(2)),
            durationBars: i - activePosition.entryIndex,
            exitReason,
            cumulativeEquity: Number(currentEquity.toFixed(2))
          });

          activePosition = null;
        }
      }

      // Check Moving Average Crossovers
      if (i >= startIndex) {
        const prevFast = fastMA[i - 1];
        const prevSlow = slowMA[i - 1];
        const curFast = fastMA[i];
        const curSlow = slowMA[i];

        if (prevFast !== null && prevSlow !== null && curFast !== null && curSlow !== null) {
          const isGoldenCross = prevFast <= prevSlow && curFast > curSlow;
          const isDeathCross = prevFast >= prevSlow && curFast < curSlow;

          if (isGoldenCross) {
            if (activePosition && activePosition.type === 'SHORT') {
              const rawReturn = (activePosition.entryPrice - close) / activePosition.entryPrice;
              const netReturn = rawReturn - (2 * feeRate);
              const pnlDollars = activePosition.sizeDollars * netReturn;
              currentEquity += pnlDollars;

              trades.push({
                id: tradeCounter++,
                type: 'SHORT',
                entryDate: activePosition.entryDate,
                entryPrice: Number(activePosition.entryPrice.toFixed(4)),
                exitDate: timeStr,
                exitPrice: Number(close.toFixed(4)),
                returnPct: Number((netReturn * 100).toFixed(2)),
                pnlDollars: Number(pnlDollars.toFixed(2)),
                durationBars: i - activePosition.entryIndex,
                exitReason: 'CROSSOVER',
                cumulativeEquity: Number(currentEquity.toFixed(2))
              });

              activePosition = null;
            }

            if (!activePosition) {
              const regime = config.regimeFilter || 'NONE';
              let allowed = true;

              if (regime === 'ADX_TREND') {
                const curAdx = adxData.adx[i] ?? 0;
                const pDi = adxData.plusDi[i] ?? 0;
                const mDi = adxData.minusDi[i] ?? 0;
                const thresh = config.adxThreshold || 25;
                if (curAdx < thresh || pDi <= mDi) {
                  allowed = false;
                }
              } else if (regime === 'SMA200_TREND') {
                const cur200 = sma200[i];
                if (cur200 !== null && close <= cur200) {
                  allowed = false;
                }
              } else if (regime === 'MULTI_MA') {
                const cur50 = sma50[i];
                const cur200 = sma200[i];
                if (cur50 === null || cur200 === null || close <= cur50 || cur50 <= cur200) {
                  allowed = false;
                }
              }

              if (allowed) {
                activePosition = {
                  type: 'LONG',
                  entryIndex: i,
                  entryDate: timeStr,
                  entryPrice: close,
                  sizeDollars: currentEquity
                };
              } else {
                tradesFilteredOutByRegime++;
              }
            }
          } else if (isDeathCross) {
            if (activePosition && activePosition.type === 'LONG') {
              const rawReturn = (close - activePosition.entryPrice) / activePosition.entryPrice;
              const netReturn = rawReturn - (2 * feeRate);
              const pnlDollars = activePosition.sizeDollars * netReturn;
              currentEquity += pnlDollars;

              trades.push({
                id: tradeCounter++,
                type: 'LONG',
                entryDate: activePosition.entryDate,
                entryPrice: Number(activePosition.entryPrice.toFixed(4)),
                exitDate: timeStr,
                exitPrice: Number(close.toFixed(4)),
                returnPct: Number((netReturn * 100).toFixed(2)),
                pnlDollars: Number(pnlDollars.toFixed(2)),
                durationBars: i - activePosition.entryIndex,
                exitReason: 'CROSSOVER',
                cumulativeEquity: Number(currentEquity.toFixed(2))
              });

              activePosition = null;
            }

            if (!activePosition && config.direction === 'LONG_AND_SHORT') {
              const regime = config.regimeFilter || 'NONE';
              let allowed = true;

              if (regime === 'ADX_TREND') {
                const curAdx = adxData.adx[i] ?? 0;
                const pDi = adxData.plusDi[i] ?? 0;
                const mDi = adxData.minusDi[i] ?? 0;
                const thresh = config.adxThreshold || 25;
                if (curAdx < thresh || mDi <= pDi) {
                  allowed = false;
                }
              } else if (regime === 'SMA200_TREND') {
                const cur200 = sma200[i];
                if (cur200 !== null && close >= cur200) {
                  allowed = false;
                }
              } else if (regime === 'MULTI_MA') {
                const cur50 = sma50[i];
                const cur200 = sma200[i];
                if (cur50 === null || cur200 === null || close >= cur50 || cur50 >= cur200) {
                  allowed = false;
                }
              }

              if (allowed) {
                activePosition = {
                  type: 'SHORT',
                  entryIndex: i,
                  entryDate: timeStr,
                  entryPrice: close,
                  sizeDollars: currentEquity
                };
              } else {
                tradesFilteredOutByRegime++;
              }
            }
          }
        }
      }

      let markToMarketEquity = currentEquity;
      if (activePosition) {
        const unrealizedReturn = activePosition.type === 'LONG'
          ? (close - activePosition.entryPrice) / activePosition.entryPrice
          : (activePosition.entryPrice - close) / activePosition.entryPrice;
        markToMarketEquity += activePosition.sizeDollars * (unrealizedReturn - feeRate);
      }

      if (markToMarketEquity > peakEquity) {
        peakEquity = markToMarketEquity;
      }
      const curDrawdownDollars = peakEquity - markToMarketEquity;
      const curDrawdownPct = peakEquity > 0 ? (curDrawdownDollars / peakEquity) * 100 : 0;

      if (curDrawdownDollars > maxDrawdownDollars) maxDrawdownDollars = curDrawdownDollars;
      if (curDrawdownPct > maxDrawdownPct) maxDrawdownPct = curDrawdownPct;

      equityCurve.push({
        time: timeStr,
        equity: Number(markToMarketEquity.toFixed(2)),
        benchmarkEquity: Number(benchmarkEquity.toFixed(2)),
        drawdownPct: Number(curDrawdownPct.toFixed(2))
      });
    }

    if (activePosition && candles.length > 0) {
      const lastCandle = candles[candles.length - 1];
      const lastClose = lastCandle.close;
      const lastTime = typeof lastCandle.time === 'string'
        ? lastCandle.time
        : new Date(Number(lastCandle.time) * 1000).toISOString().slice(0, 10);

      const rawReturn = activePosition.type === 'LONG'
        ? (lastClose - activePosition.entryPrice) / activePosition.entryPrice
        : (activePosition.entryPrice - lastClose) / activePosition.entryPrice;
      const netReturn = rawReturn - (2 * feeRate);
      const pnlDollars = activePosition.sizeDollars * netReturn;
      currentEquity += pnlDollars;

      trades.push({
        id: tradeCounter++,
        type: activePosition.type,
        entryDate: activePosition.entryDate,
        entryPrice: Number(activePosition.entryPrice.toFixed(4)),
        exitDate: lastTime,
        exitPrice: Number(lastClose.toFixed(4)),
        returnPct: Number((netReturn * 100).toFixed(2)),
        pnlDollars: Number(pnlDollars.toFixed(2)),
        durationBars: (candles.length - 1) - activePosition.entryIndex,
        exitReason: 'END_OF_DATA',
        cumulativeEquity: Number(currentEquity.toFixed(2))
      });
    }

    const finalCapital = currentEquity;
    const netProfit = finalCapital - initialCapital;
    const netProfitPct = (netProfit / initialCapital) * 100;

    const lastBenchmarkPrice = candles[candles.length - 1].close || initialBenchmarkPrice;
    const benchmarkReturnPct = ((lastBenchmarkPrice - initialBenchmarkPrice) / initialBenchmarkPrice) * 100;
    const alphaPct = netProfitPct - benchmarkReturnPct;

    const totalTrades = trades.length;
    const winningTrades = trades.filter(t => t.pnlDollars > 0).length;
    const losingTrades = trades.filter(t => t.pnlDollars < 0).length;
    const winRatePct = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

    const grossProfit = trades.filter(t => t.pnlDollars > 0).reduce((sum, t) => sum + t.pnlDollars, 0);
    const grossLoss = Math.abs(trades.filter(t => t.pnlDollars < 0).reduce((sum, t) => sum + t.pnlDollars, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99.9 : 0;

    const returnsArray = trades.map(t => t.returnPct);
    const avgTradeReturnPct = totalTrades > 0 ? returnsArray.reduce((a, b) => a + b, 0) / totalTrades : 0;
    const bestTradePct = totalTrades > 0 ? Math.max(...returnsArray) : 0;
    const worstTradePct = totalTrades > 0 ? Math.min(...returnsArray) : 0;
    const avgTradeBars = totalTrades > 0 ? trades.reduce((sum, t) => sum + t.durationBars, 0) / totalTrades : 0;

    let sharpeRatio = 0;
    if (returnsArray.length > 1) {
      const mean = avgTradeReturnPct;
      const variance = returnsArray.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (returnsArray.length - 1);
      const stdDev = Math.sqrt(variance);
      if (stdDev > 0) {
        const tradesPerYear = (totalTrades / (candles.length || 252)) * 252;
        sharpeRatio = Number(((mean / stdDev) * Math.sqrt(Math.max(1, tradesPerYear))).toFixed(2));
      }
    }

    // Sortino Ratio (Downside deviation only)
    let sortinoRatio = 0;
    const negativeReturns = returnsArray.filter(r => r < 0);
    if (negativeReturns.length > 0) {
      const downsideVariance = negativeReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / returnsArray.length;
      const downsideDev = Math.sqrt(downsideVariance);
      if (downsideDev > 0) {
        const tradesPerYear = (totalTrades / (candles.length || 252)) * 252;
        sortinoRatio = Number(((avgTradeReturnPct / downsideDev) * Math.sqrt(Math.max(1, tradesPerYear))).toFixed(2));
      }
    } else if (returnsArray.length > 0 && avgTradeReturnPct > 0) {
      sortinoRatio = 9.99;
    }

    // Expectancy and Payoff
    const avgWinDollars = winningTrades > 0 ? grossProfit / winningTrades : 0;
    const avgLossDollars = losingTrades > 0 ? grossLoss / losingTrades : 0;
    const winRateFrac = totalTrades > 0 ? winningTrades / totalTrades : 0;
    const lossRateFrac = totalTrades > 0 ? losingTrades / totalTrades : 0;

    const expectancyDollars = Number((winRateFrac * avgWinDollars - lossRateFrac * avgLossDollars).toFixed(2));

    const avgWinPct = winningTrades > 0 ? trades.filter(t => t.pnlDollars > 0).reduce((s, t) => s + t.returnPct, 0) / winningTrades : 0;
    const avgLossPct = losingTrades > 0 ? Math.abs(trades.filter(t => t.pnlDollars < 0).reduce((s, t) => s + t.returnPct, 0) / losingTrades) : 0;
    const expectancyReturnPct = Number((winRateFrac * avgWinPct - lossRateFrac * avgLossPct).toFixed(2));

    const recoveryFactor = maxDrawdownDollars > 0
      ? Number((netProfit / maxDrawdownDollars).toFixed(2))
      : netProfit > 0 ? 99.9 : 0;

    const payoffRatio = avgLossDollars > 0
      ? Number((avgWinDollars / avgLossDollars).toFixed(2))
      : avgWinDollars > 0 ? 99.9 : 0;

    const formatBarTime = (t: any): string => {
      if (typeof t === 'string') return t;
      if (typeof t === 'number') {
        return new Date(t > 1e10 ? t : t * 1000).toISOString().slice(0, 10);
      }
      return String(t || '-');
    };

    const startDateStr = formatBarTime(candles[0].time);
    const endDateStr = formatBarTime(candles[candles.length - 1].time);

    return {
      config,
      ticker,
      interval,
      totalBars: candles.length,
      startDate: startDateStr,
      endDate: endDateStr,
      initialCapital,
      finalCapital: Number(finalCapital.toFixed(2)),
      netProfit: Number(netProfit.toFixed(2)),
      netProfitPct: Number(netProfitPct.toFixed(2)),
      benchmarkReturnPct: Number(benchmarkReturnPct.toFixed(2)),
      alphaPct: Number(alphaPct.toFixed(2)),
      totalTrades,
      winningTrades,
      losingTrades,
      winRatePct: Number(winRatePct.toFixed(1)),
      profitFactor: Number(profitFactor.toFixed(2)),
      maxDrawdownPct: Number(maxDrawdownPct.toFixed(2)),
      maxDrawdownDollars: Number(maxDrawdownDollars.toFixed(2)),
      sharpeRatio,
      sortinoRatio,
      expectancyDollars,
      expectancyReturnPct,
      recoveryFactor,
      payoffRatio,
      tradesFilteredOutByRegime,
      avgTradeReturnPct: Number(avgTradeReturnPct.toFixed(2)),
      bestTradePct: Number(bestTradePct.toFixed(2)),
      worstTradePct: Number(worstTradePct.toFixed(2)),
      avgTradeBars: Number(avgTradeBars.toFixed(1)),
      equityCurve,
      trades: trades.reverse()
    };
  },

  getEmptyResult(config: BacktestConfig, ticker: string, interval: string, totalBars: number): BacktestResult {
    return {
      config,
      ticker,
      interval,
      totalBars,
      startDate: '-',
      endDate: '-',
      initialCapital: config.initialCapital,
      finalCapital: config.initialCapital,
      netProfit: 0,
      netProfitPct: 0,
      benchmarkReturnPct: 0,
      alphaPct: 0,
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRatePct: 0,
      profitFactor: 0,
      maxDrawdownPct: 0,
      maxDrawdownDollars: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      expectancyDollars: 0,
      expectancyReturnPct: 0,
      recoveryFactor: 0,
      payoffRatio: 0,
      tradesFilteredOutByRegime: 0,
      avgTradeReturnPct: 0,
      bestTradePct: 0,
      worstTradePct: 0,
      avgTradeBars: 0,
      equityCurve: [],
      trades: []
    };
  }
};
