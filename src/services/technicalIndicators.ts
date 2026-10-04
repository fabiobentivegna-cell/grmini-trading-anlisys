import { CandleData, IndicatorConfig, LineData } from '../types';

export interface CalculatedIndicators {
  candles: CandleData[];
  haCandles: CandleData[];
  lineData: LineData[];
  dynamicMas: Record<string, LineData[]>;
  overlays: {
    bbUpper: LineData[];
    bbLower: LineData[];
    sar: { time: string | number; value: number; color: string }[];
    supertrend: { time: string | number; value: number; color: string }[];
    supertrendUpper?: LineData[];
    supertrendLower?: LineData[];
    supertrendSignals?: { time: string | number; type: 'BUY' | 'SELL'; price: number }[];
    atrTsl: LineData[];
    // Ichimoku
    ichimoku?: {
      tenkan: LineData[];
      kijun: LineData[];
      senkouA: LineData[];
      senkouB: LineData[];
      chikou: LineData[];
    };
    // Pivot Points
    pivots?: {
      pp: LineData[];
      r1: LineData[];
      r2: LineData[];
      r3: LineData[];
      s1: LineData[];
      s2: LineData[];
      s3: LineData[];
    };
    // Keltner Channels
    keltner?: {
      upper: LineData[];
      middle: LineData[];
      lower: LineData[];
    };
    // VWAP
    vwap?: {
      vwap: LineData[];
      upper1: LineData[];
      lower1: LineData[];
      upper2: LineData[];
      lower2: LineData[];
    };
  };
  oscillators: {
    rsi: LineData[];
    macd: {
      line: LineData[];
      signal: LineData[];
      hist: { time: string | number; value: number; color: string }[];
    };
    stoch: {
      k: LineData[];
      d: LineData[];
    };
    stochRsi?: {
      k: LineData[];
      d: LineData[];
    };
    atr: LineData[];
    adx: {
      adx: LineData[];
      plusDi: LineData[];
      minusDi: LineData[];
    };
  };
}

export function computeTechnicalIndicators(
  candles: CandleData[],
  config: IndicatorConfig
): CalculatedIndicators {
  const n = candles.length;
  if (n === 0) {
    return {
      candles: [],
      haCandles: [],
      lineData: [],
      dynamicMas: {},
      overlays: { bbUpper: [], bbLower: [], sar: [], supertrend: [], atrTsl: [] },
      oscillators: {
        rsi: [],
        macd: { line: [], signal: [], hist: [] },
        stoch: { k: [], d: [] },
        atr: [],
        adx: { adx: [], plusDi: [], minusDi: [] }
      }
    };
  }

  const times = candles.map(c => c.time);
  const opens = candles.map(c => c.open);
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  const closes = candles.map(c => c.close);

  // Line data
  const lineData: LineData[] = candles.map(c => ({ time: c.time, value: c.close }));

  // Heikin-Ashi
  const haCandles: CandleData[] = [];
  let prevHaOpen = opens[0];
  let prevHaClose = (opens[0] + highs[0] + lows[0] + closes[0]) / 4;

  for (let i = 0; i < n; i++) {
    const haClose = (opens[i] + highs[i] + lows[i] + closes[i]) / 4;
    const haOpen = i === 0 ? opens[0] : (prevHaOpen + prevHaClose) / 2;
    const haHigh = Math.max(highs[i], haOpen, haClose);
    const haLow = Math.min(lows[i], haOpen, haClose);

    haCandles.push({
      time: times[i],
      open: Number(haOpen.toFixed(4)),
      high: Number(haHigh.toFixed(4)),
      low: Number(haLow.toFixed(4)),
      close: Number(haClose.toFixed(4))
    });

    prevHaOpen = haOpen;
    prevHaClose = haClose;
  }

  // Dynamic Moving Averages (SMA / EMA)
  const dynamicMas: Record<string, LineData[]> = {};
  for (const ma of config.movingAverages) {
    if (!ma.enabled) continue;
    const period = Math.max(1, ma.period);
    const res: LineData[] = [];

    if (ma.type === 'EMA') {
      const alpha = 2 / (period + 1);
      let ema = closes[0];
      for (let i = 0; i < n; i++) {
        if (i === 0) {
          ema = closes[0];
        } else {
          ema = alpha * closes[i] + (1 - alpha) * ema;
        }
        if (i >= period - 1) {
          res.push({ time: times[i], value: Number(ema.toFixed(4)) });
        }
      }
    } else {
      // SMA
      let sum = 0;
      for (let i = 0; i < n; i++) {
        sum += closes[i];
        if (i >= period) {
          sum -= closes[i - period];
        }
        if (i >= period - 1) {
          res.push({ time: times[i], value: Number((sum / period).toFixed(4)) });
        }
      }
    }
    dynamicMas[ma.id] = res;
  }

  // Bollinger Bands
  const bbUpper: LineData[] = [];
  const bbLower: LineData[] = [];
  const bbLen = Math.max(2, config.bbLen);
  const bbStd = config.bbStd;

  for (let i = bbLen - 1; i < n; i++) {
    const slice = closes.slice(i - bbLen + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / bbLen;
    const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / bbLen;
    const std = Math.sqrt(variance);
    bbUpper.push({ time: times[i], value: Number((mean + std * bbStd).toFixed(4)) });
    bbLower.push({ time: times[i], value: Number((mean - std * bbStd).toFixed(4)) });
  }

  // True Range (TR)
  const tr: number[] = [];
  for (let i = 0; i < n; i++) {
    if (i === 0) {
      tr.push(highs[i] - lows[i]);
    } else {
      const hl = highs[i] - lows[i];
      const hc = Math.abs(highs[i] - closes[i - 1]);
      const lc = Math.abs(lows[i] - closes[i - 1]);
      tr.push(Math.max(hl, hc, lc));
    }
  }

  // ATR
  const atrLen = Math.max(1, config.atrLen);
  const atrData: LineData[] = [];
  const atrValues: number[] = new Array(n).fill(0);
  let atrSum = 0;

  for (let i = 0; i < n; i++) {
    if (i < atrLen) {
      atrSum += tr[i];
      if (i === atrLen - 1) {
        atrValues[i] = atrSum / atrLen;
        atrData.push({ time: times[i], value: Number(atrValues[i].toFixed(4)) });
      }
    } else {
      atrValues[i] = (atrValues[i - 1] * (atrLen - 1) + tr[i]) / atrLen;
      atrData.push({ time: times[i], value: Number(atrValues[i].toFixed(4)) });
    }
  }

  // ATR Trailing Stop Loss
  const atrTsl: LineData[] = [];
  for (let i = atrLen - 1; i < n; i++) {
    const tsl = closes[i] - atrValues[i] * config.atrTslMult;
    atrTsl.push({ time: times[i], value: Number(tsl.toFixed(4)) });
  }

  // Parabolic SAR
  const sarData: { time: string | number; value: number; color: string }[] = [];
  if (n >= 2) {
    const afStart = config.sarStep;
    const afStep = config.sarStep;
    const afMax = config.sarMax;
    let isLong = closes[1] >= closes[0];
    let sar = isLong ? lows[0] : highs[0];
    let ep = isLong ? highs[1] : lows[1];
    let af = afStart;

    sarData.push({ time: times[1], value: Number(sar.toFixed(4)), color: isLong ? '#089981' : '#f23645' });

    for (let i = 2; i < n; i++) {
      let curSar = sar + af * (ep - sar);
      if (isLong) {
        curSar = Math.min(curSar, lows[i - 1], lows[i - 2]);
        if (lows[i] < curSar) {
          isLong = false;
          curSar = ep;
          ep = lows[i];
          af = afStart;
        } else {
          if (highs[i] > ep) {
            ep = highs[i];
            af = Math.min(af + afStep, afMax);
          }
        }
      } else {
        curSar = Math.max(curSar, highs[i - 1], highs[i - 2]);
        if (highs[i] > curSar) {
          isLong = true;
          curSar = ep;
          ep = highs[i];
          af = afStart;
        } else {
          if (lows[i] < ep) {
            ep = lows[i];
            af = Math.min(af + afStep, afMax);
          }
        }
      }
      sar = curSar;
      sarData.push({ time: times[i], value: Number(sar.toFixed(4)), color: isLong ? '#089981' : '#f23645' });
    }
  }

  // Supertrend
  const supertrendData: { time: string | number; value: number; color: string }[] = [];
  const stPeriod = Math.max(1, config.supertrendPeriod);
  const stMult = config.supertrendMult;
  if (n >= stPeriod) {
    let dir = 1;
    let lowerBand = 0;
    let upperBand = 0;

    for (let i = 0; i < n; i++) {
      if (i < stPeriod - 1) continue;
      const hl2 = (highs[i] + lows[i]) / 2;
      const curAtr = atrValues[i] || tr[i];
      const curUpper = hl2 + stMult * curAtr;
      const curLower = hl2 - stMult * curAtr;

      if (i === stPeriod - 1) {
        lowerBand = curLower;
        upperBand = curUpper;
        dir = closes[i] > upperBand ? 1 : -1;
      } else {
        if (closes[i] > upperBand) {
          dir = 1;
        } else if (closes[i] < lowerBand) {
          dir = -1;
        } else {
          if (dir === 1 && curLower < lowerBand) {
            // keep lowerBand
          } else {
            lowerBand = curLower;
          }
          if (dir === -1 && curUpper > upperBand) {
            // keep upperBand
          } else {
            upperBand = curUpper;
          }
        }
      }

      const stVal = dir === 1 ? lowerBand : upperBand;
      supertrendData.push({
        time: times[i],
        value: Number(stVal.toFixed(4)),
        color: dir === 1 ? '#089981' : '#f23645'
      });
    }
  }

  // Supertrend Advanced Upper/Lower bands & signals
  const stUpperData: LineData[] = [];
  const stLowerData: LineData[] = [];
  const stSignals: { time: string | number; type: 'BUY' | 'SELL'; price: number }[] = [];

  if (n >= stPeriod) {
    let prevDir = 1;
    for (let i = stPeriod - 1; i < n; i++) {
      const hl2 = (highs[i] + lows[i]) / 2;
      const curAtr = atrValues[i] || tr[i];
      const curUpper = hl2 + stMult * curAtr;
      const curLower = hl2 - stMult * curAtr;
      stUpperData.push({ time: times[i], value: Number(curUpper.toFixed(4)) });
      stLowerData.push({ time: times[i], value: Number(curLower.toFixed(4)) });

      const curColor = supertrendData.find(s => s.time === times[i])?.color;
      const curDir = curColor === '#089981' ? 1 : -1;
      if (i > stPeriod - 1 && curDir !== prevDir) {
        stSignals.push({
          time: times[i],
          type: curDir === 1 ? 'BUY' : 'SELL',
          price: curDir === 1 ? lows[i] : highs[i]
        });
      }
      prevDir = curDir;
    }
  }

  // -------------------------------------------------------------
  // Ichimoku Kinko Hyo (Tenkan 9, Kijun 26, Senkou B 52, Shift 26)
  // -------------------------------------------------------------
  const ichimokuTenkan: LineData[] = [];
  const ichimokuKijun: LineData[] = [];
  const ichimokuSenkouA: LineData[] = [];
  const ichimokuSenkouB: LineData[] = [];
  const ichimokuChikou: LineData[] = [];

  const convPeriod = config.ichimokuConversionPeriod || 9;
  const basePeriod = config.ichimokuBasePeriod || 26;
  const spanBPeriod = config.ichimokuSpanBPeriod || 52;

  const getHighLowMid = (start: number, end: number) => {
    let h = -Infinity;
    let l = Infinity;
    for (let k = start; k <= end; k++) {
      if (highs[k] > h) h = highs[k];
      if (lows[k] < l) l = lows[k];
    }
    return (h + l) / 2;
  };

  for (let i = 0; i < n; i++) {
    // Tenkan-sen
    if (i >= convPeriod - 1) {
      const tenkan = getHighLowMid(i - convPeriod + 1, i);
      ichimokuTenkan.push({ time: times[i], value: Number(tenkan.toFixed(4)) });
    }
    // Kijun-sen
    if (i >= basePeriod - 1) {
      const kijun = getHighLowMid(i - basePeriod + 1, i);
      ichimokuKijun.push({ time: times[i], value: Number(kijun.toFixed(4)) });
    }
    // Senkou Span A & B (evaluated at i, mapped to current time for display)
    if (i >= basePeriod - 1) {
      const tenkan = getHighLowMid(i - convPeriod + 1, i);
      const kijun = getHighLowMid(i - basePeriod + 1, i);
      const spanA = (tenkan + kijun) / 2;
      ichimokuSenkouA.push({ time: times[i], value: Number(spanA.toFixed(4)) });
    }
    if (i >= spanBPeriod - 1) {
      const spanB = getHighLowMid(i - spanBPeriod + 1, i);
      ichimokuSenkouB.push({ time: times[i], value: Number(spanB.toFixed(4)) });
    }
    // Chikou Span
    ichimokuChikou.push({ time: times[i], value: Number(closes[i].toFixed(4)) });
  }

  // -------------------------------------------------------------
  // Pivot Points (Standard, Fibonacci, Camarilla)
  // -------------------------------------------------------------
  const pivotPP: LineData[] = [];
  const pivotR1: LineData[] = [];
  const pivotR2: LineData[] = [];
  const pivotR3: LineData[] = [];
  const pivotS1: LineData[] = [];
  const pivotS2: LineData[] = [];
  const pivotS3: LineData[] = [];

  const pType = config.pivotType || 'STANDARD';
  const pivotWindow = 20;

  for (let i = pivotWindow; i < n; i++) {
    let pH = -Infinity;
    let pL = Infinity;
    for (let k = i - pivotWindow; k < i; k++) {
      if (highs[k] > pH) pH = highs[k];
      if (lows[k] < pL) pL = lows[k];
    }
    const pC = closes[i - 1];
    const diff = pH - pL;

    let pp = (pH + pL + pC) / 3;
    let r1 = 0, r2 = 0, r3 = 0, s1 = 0, s2 = 0, s3 = 0;

    if (pType === 'FIBONACCI') {
      pp = (pH + pL + pC) / 3;
      r1 = pp + 0.382 * diff;
      r2 = pp + 0.618 * diff;
      r3 = pp + 1.000 * diff;
      s1 = pp - 0.382 * diff;
      s2 = pp - 0.618 * diff;
      s3 = pp - 1.000 * diff;
    } else if (pType === 'CAMARILLA') {
      pp = (pH + pL + pC) / 3;
      r1 = pC + diff * 1.1 / 12;
      r2 = pC + diff * 1.1 / 6;
      r3 = pC + diff * 1.1 / 4;
      s1 = pC - diff * 1.1 / 12;
      s2 = pC - diff * 1.1 / 6;
      s3 = pC - diff * 1.1 / 4;
    } else {
      // Standard
      pp = (pH + pL + pC) / 3;
      r1 = 2 * pp - pL;
      s1 = 2 * pp - pH;
      r2 = pp + diff;
      s2 = pp - diff;
      r3 = pH + 2 * (pp - pL);
      s3 = pL - 2 * (pH - pp);
    }

    pivotPP.push({ time: times[i], value: Number(pp.toFixed(4)) });
    pivotR1.push({ time: times[i], value: Number(r1.toFixed(4)) });
    pivotR2.push({ time: times[i], value: Number(r2.toFixed(4)) });
    pivotR3.push({ time: times[i], value: Number(r3.toFixed(4)) });
    pivotS1.push({ time: times[i], value: Number(s1.toFixed(4)) });
    pivotS2.push({ time: times[i], value: Number(s2.toFixed(4)) });
    pivotS3.push({ time: times[i], value: Number(s3.toFixed(4)) });
  }

  // -------------------------------------------------------------
  // Keltner Channels (EMA + Multiplier * ATR)
  // -------------------------------------------------------------
  const keltnerUpper: LineData[] = [];
  const keltnerMiddle: LineData[] = [];
  const keltnerLower: LineData[] = [];
  const kLen = config.keltnerPeriod || 20;
  const kMult = config.keltnerMult || 1.5;

  if (n >= kLen) {
    const alphaK = 2 / (kLen + 1);
    let kEma = closes[0];
    for (let i = 0; i < n; i++) {
      if (i === 0) kEma = closes[0];
      else kEma = alphaK * closes[i] + (1 - alphaK) * kEma;

      if (i >= kLen - 1) {
        const curAtr = atrValues[i] || tr[i];
        keltnerMiddle.push({ time: times[i], value: Number(kEma.toFixed(4)) });
        keltnerUpper.push({ time: times[i], value: Number((kEma + kMult * curAtr).toFixed(4)) });
        keltnerLower.push({ time: times[i], value: Number((kEma - kMult * curAtr).toFixed(4)) });
      }
    }
  }

  // -------------------------------------------------------------
  // VWAP (Volume Weighted Average Price) & Standard Dev Bands
  // -------------------------------------------------------------
  const vwapLine: LineData[] = [];
  const vwapUpper1: LineData[] = [];
  const vwapLower1: LineData[] = [];
  const vwapUpper2: LineData[] = [];
  const vwapLower2: LineData[] = [];

  let cumVol = 0;
  let cumTypicalVol = 0;
  let cumTypicalVolSq = 0;

  for (let i = 0; i < n; i++) {
    const vol = candles[i].volume || 1000;
    const typicalPrice = (highs[i] + lows[i] + closes[i]) / 3;
    cumVol += vol;
    cumTypicalVol += typicalPrice * vol;
    cumTypicalVolSq += typicalPrice * typicalPrice * vol;

    const vwap = cumTypicalVol / (cumVol || 1);
    const variance = Math.max(0, (cumTypicalVolSq / (cumVol || 1)) - (vwap * vwap));
    const std = Math.sqrt(variance);

    vwapLine.push({ time: times[i], value: Number(vwap.toFixed(4)) });
    vwapUpper1.push({ time: times[i], value: Number((vwap + std).toFixed(4)) });
    vwapLower1.push({ time: times[i], value: Number((vwap - std).toFixed(4)) });
    vwapUpper2.push({ time: times[i], value: Number((vwap + 2 * std).toFixed(4)) });
    vwapLower2.push({ time: times[i], value: Number((vwap - 2 * std).toFixed(4)) });
  }

  // RSI
  const rsiData: LineData[] = [];
  const rsiLen = Math.max(2, config.rsiLen);
  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 1; i < n; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = Math.max(diff, 0);
    const loss = Math.max(-diff, 0);

    if (i <= rsiLen) {
      avgGain += gain;
      avgLoss += loss;
      if (i === rsiLen) {
        avgGain /= rsiLen;
        avgLoss /= rsiLen;
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        const rsi = 100 - 100 / (1 + rs);
        rsiData.push({ time: times[i], value: Number(rsi.toFixed(2)) });
      }
    } else {
      avgGain = (avgGain * (rsiLen - 1) + gain) / rsiLen;
      avgLoss = (avgLoss * (rsiLen - 1) + loss) / rsiLen;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      const rsi = 100 - 100 / (1 + rs);
      rsiData.push({ time: times[i], value: Number(rsi.toFixed(2)) });
    }
  }

  // MACD
  const macdLine: LineData[] = [];
  const macdSig: LineData[] = [];
  const macdHist: { time: string | number; value: number; color: string }[] = [];

  const fast = Math.max(1, config.macdFast);
  const slow = Math.max(fast + 1, config.macdSlow);
  const sig = Math.max(1, config.macdSig);

  const alphaFast = 2 / (fast + 1);
  const alphaSlow = 2 / (slow + 1);
  const alphaSig = 2 / (sig + 1);

  let emaFast = closes[0];
  let emaSlow = closes[0];
  const macdVals: number[] = [];

  for (let i = 0; i < n; i++) {
    emaFast = i === 0 ? closes[0] : alphaFast * closes[i] + (1 - alphaFast) * emaFast;
    emaSlow = i === 0 ? closes[0] : alphaSlow * closes[i] + (1 - alphaSlow) * emaSlow;
    const macd = emaFast - emaSlow;
    macdVals.push(macd);
    if (i >= slow - 1) {
      macdLine.push({ time: times[i], value: Number(macd.toFixed(4)) });
    }
  }

  let emaSig = 0;
  let sigCount = 0;
  for (let i = slow - 1; i < n; i++) {
    const val = macdVals[i];
    if (sigCount === 0) {
      emaSig = val;
    } else {
      emaSig = alphaSig * val + (1 - alphaSig) * emaSig;
    }
    sigCount++;

    if (sigCount >= sig) {
      macdSig.push({ time: times[i], value: Number(emaSig.toFixed(4)) });
      const h = val - emaSig;
      macdHist.push({
        time: times[i],
        value: Number(h.toFixed(4)),
        color: h >= 0 ? '#089981' : '#f23645'
      });
    }
  }

  // Stochastic (%K, %D)
  const stochK: LineData[] = [];
  const stochD: LineData[] = [];
  const sKPeriod = Math.max(1, config.stochK);
  const sDPeriod = Math.max(1, config.stochD);
  const rawK: number[] = [];

  for (let i = 0; i < n; i++) {
    if (i < sKPeriod - 1) {
      rawK.push(50);
      continue;
    }
    const lowSlice = lows.slice(i - sKPeriod + 1, i + 1);
    const highSlice = highs.slice(i - sKPeriod + 1, i + 1);
    const minLow = Math.min(...lowSlice);
    const maxHigh = Math.max(...highSlice);
    const denom = maxHigh - minLow;
    const k = denom === 0 ? 50 : ((closes[i] - minLow) / denom) * 100;
    rawK.push(k);
    stochK.push({ time: times[i], value: Number(k.toFixed(2)) });
  }

  for (let i = sKPeriod - 1 + sDPeriod - 1; i < n; i++) {
    const slice = rawK.slice(i - sDPeriod + 1, i + 1);
    const d = slice.reduce((a, b) => a + b, 0) / sDPeriod;
    stochD.push({ time: times[i], value: Number(d.toFixed(2)) });
  }

  // ADX & DMI (+DI, -DI)
  const adxData: LineData[] = [];
  const plusDiData: LineData[] = [];
  const minusDiData: LineData[] = [];
  const adxLen = Math.max(2, config.adxLen);

  const plusDm: number[] = [0];
  const minusDm: number[] = [0];
  for (let i = 1; i < n; i++) {
    const upMove = highs[i] - highs[i - 1];
    const downMove = lows[i - 1] - lows[i];
    plusDm.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDm.push(downMove > upMove && downMove > 0 ? downMove : 0);
  }

  let trSum = 0;
  let plusDmSum = 0;
  let minusDmSum = 0;
  const dxList: number[] = [];

  for (let i = 0; i < n; i++) {
    if (i < adxLen) {
      trSum += tr[i];
      plusDmSum += plusDm[i];
      minusDmSum += minusDm[i];
      if (i === adxLen - 1) {
        const pDi = trSum === 0 ? 0 : (plusDmSum / trSum) * 100;
        const mDi = trSum === 0 ? 0 : (minusDmSum / trSum) * 100;
        plusDiData.push({ time: times[i], value: Number(pDi.toFixed(2)) });
        minusDiData.push({ time: times[i], value: Number(mDi.toFixed(2)) });
        const diSum = pDi + mDi;
        const dx = diSum === 0 ? 0 : (Math.abs(pDi - mDi) / diSum) * 100;
        dxList.push(dx);
      }
    } else {
      trSum = trSum - trSum / adxLen + tr[i];
      plusDmSum = plusDmSum - plusDmSum / adxLen + plusDm[i];
      minusDmSum = minusDmSum - minusDmSum / adxLen + minusDm[i];
      const pDi = trSum === 0 ? 0 : (plusDmSum / trSum) * 100;
      const mDi = trSum === 0 ? 0 : (minusDmSum / trSum) * 100;
      plusDiData.push({ time: times[i], value: Number(pDi.toFixed(2)) });
      minusDiData.push({ time: times[i], value: Number(mDi.toFixed(2)) });
      const diSum = pDi + mDi;
      const dx = diSum === 0 ? 0 : (Math.abs(pDi - mDi) / diSum) * 100;
      dxList.push(dx);
    }
  }

  let adxVal = 0;
  for (let j = 0; j < dxList.length; j++) {
    if (j < adxLen) {
      adxVal += dxList[j];
      if (j === adxLen - 1) {
        adxVal /= adxLen;
        const targetIdx = adxLen - 1 + j;
        adxData.push({ time: times[targetIdx], value: Number(adxVal.toFixed(2)) });
      }
    } else {
      adxVal = (adxVal * (adxLen - 1) + dxList[j]) / adxLen;
      const targetIdx = adxLen - 1 + j;
      adxData.push({ time: times[targetIdx], value: Number(adxVal.toFixed(2)) });
    }
  }

  // -------------------------------------------------------------
  // Stochastic RSI (%K and %D)
  // -------------------------------------------------------------
  const stochRsiK: LineData[] = [];
  const stochRsiD: LineData[] = [];
  const srsiLen = config.stochRsiLen || 14;
  const srsiKPeriod = config.stochRsiK || 3;
  const srsiDPeriod = config.stochRsiD || 3;

  if (rsiData.length >= srsiLen) {
    const rawStochRsi: { time: string | number; value: number }[] = [];
    for (let i = srsiLen - 1; i < rsiData.length; i++) {
      let minR = Infinity;
      let maxR = -Infinity;
      for (let j = i - srsiLen + 1; j <= i; j++) {
        const val = rsiData[j].value;
        if (val < minR) minR = val;
        if (val > maxR) maxR = val;
      }
      const curR = rsiData[i].value;
      const stochVal = maxR === minR ? 50 : ((curR - minR) / (maxR - minR)) * 100;
      rawStochRsi.push({ time: rsiData[i].time, value: stochVal });
    }

    // %K smoothing (SMA of rawStochRsi)
    for (let i = srsiKPeriod - 1; i < rawStochRsi.length; i++) {
      const slice = rawStochRsi.slice(i - srsiKPeriod + 1, i + 1);
      const avgK = slice.reduce((sum, item) => sum + item.value, 0) / srsiKPeriod;
      stochRsiK.push({ time: rawStochRsi[i].time, value: Number(avgK.toFixed(2)) });
    }

    // %D smoothing (SMA of %K)
    for (let i = srsiDPeriod - 1; i < stochRsiK.length; i++) {
      const slice = stochRsiK.slice(i - srsiDPeriod + 1, i + 1);
      const avgD = slice.reduce((sum, item) => sum + item.value, 0) / srsiDPeriod;
      stochRsiD.push({ time: stochRsiK[i].time, value: Number(avgD.toFixed(2)) });
    }
  }

  // Pad series helpers to guarantee 100% time & logical range alignment across subcharts using WhitespaceData
  const pad = (arr: LineData[]): LineData[] => {
    const map = new Map<string | number, number>();
    arr.forEach(d => map.set(d.time, d.value));
    return times.map(t => {
      if (map.has(t)) {
        return { time: t, value: map.get(t)! };
      }
      return { time: t } as any; // WhitespaceData in lightweight-charts
    });
  };

  const padColored = (arr: { time: string | number; value: number; color: string }[]) => {
    const map = new Map<string | number, { value: number; color: string }>();
    arr.forEach(d => map.set(d.time, { value: d.value, color: d.color }));
    return times.map(t => {
      if (map.has(t)) {
        const item = map.get(t)!;
        return { time: t, value: item.value, color: item.color };
      }
      return { time: t } as any; // WhitespaceData in lightweight-charts
    });
  };

  // Pad dynamic MAs
  const paddedMas: Record<string, LineData[]> = {};
  Object.keys(dynamicMas).forEach(id => {
    paddedMas[id] = pad(dynamicMas[id]);
  });

  return {
    candles,
    haCandles,
    lineData,
    dynamicMas: paddedMas,
    overlays: {
      bbUpper: pad(bbUpper),
      bbLower: pad(bbLower),
      sar: padColored(sarData),
      supertrend: padColored(supertrendData),
      supertrendUpper: pad(stUpperData),
      supertrendLower: pad(stLowerData),
      supertrendSignals: stSignals,
      atrTsl: pad(atrTsl),
      ichimoku: {
        tenkan: pad(ichimokuTenkan),
        kijun: pad(ichimokuKijun),
        senkouA: pad(ichimokuSenkouA),
        senkouB: pad(ichimokuSenkouB),
        chikou: pad(ichimokuChikou)
      },
      pivots: {
        pp: pad(pivotPP),
        r1: pad(pivotR1),
        r2: pad(pivotR2),
        r3: pad(pivotR3),
        s1: pad(pivotS1),
        s2: pad(pivotS2),
        s3: pad(pivotS3)
      },
      keltner: {
        upper: pad(keltnerUpper),
        middle: pad(keltnerMiddle),
        lower: pad(keltnerLower)
      },
      vwap: {
        vwap: pad(vwapLine),
        upper1: pad(vwapUpper1),
        lower1: pad(vwapLower1),
        upper2: pad(vwapUpper2),
        lower2: pad(vwapLower2)
      }
    },
    oscillators: {
      rsi: pad(rsiData),
      macd: {
        line: pad(macdLine),
        signal: pad(macdSig),
        hist: padColored(macdHist)
      },
      stoch: {
        k: pad(stochK),
        d: pad(stochD)
      },
      stochRsi: {
        k: pad(stochRsiK),
        d: pad(stochRsiD)
      },
      atr: pad(atrData),
      adx: {
        adx: pad(adxData),
        plusDi: pad(plusDiData),
        minusDi: pad(minusDiData)
      }
    }
  };
}
