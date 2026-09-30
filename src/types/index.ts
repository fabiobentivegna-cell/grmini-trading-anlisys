export interface CandleData {
  time: string | number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface LineData {
  time: string | number;
  value: number;
}

export interface MovingAverageConfig {
  id: string;
  enabled: boolean;
  type: 'SMA' | 'EMA';
  period: number;
  color: string;
  width: number;
}

export interface IndicatorConfig {
  movingAverages: MovingAverageConfig[];
  bbEnabled: boolean;
  bbLen: number;
  bbStd: number;
  sarEnabled: boolean;
  sarStep: number;
  sarMax: number;
  supertrendEnabled: boolean;
  supertrendPeriod: number;
  supertrendMult: number;
  atrTslEnabled: boolean;
  atrTslMult: number;
  atrTslColor: string;
  // Oscillators
  rsiEnabled: boolean;
  rsiLen: number;
  rsiColor: string;
  rsiWidth: number;
  rsiOverbought: number;
  rsiOverboughtColor: string;
  rsiMid: number;
  rsiMidColor: string;
  rsiOversold: number;
  rsiOversoldColor: string;
  macdEnabled: boolean;
  macdFast: number;
  macdSlow: number;
  macdSig: number;
  macdColor: string;
  macdSigColor: string;
  stochEnabled: boolean;
  stochK: number;
  stochD: number;
  stochKColor: string;
  stochDColor: string;
  stochOverbought: number;
  stochOverboughtColor: string;
  stochMid: number;
  stochMidColor: string;
  stochOversold: number;
  stochOversoldColor: string;
  adxEnabled: boolean;
  adxLen: number;
  adxColor: string;
  plusDiColor: string;
  minusDiColor: string;
  atrEnabled: boolean;
  atrLen: number;
  atrColor: string;
  atrWidth: number;
}

export type DrawingToolType = 'cursor' | 'horizontal' | 'trendline' | 'fibonacci' | 'long' | 'short';

export interface FibLevel {
  lvl: number;
  color: string;
}

export interface DrawingItem {
  id: string;
  type: 'horizontal' | 'trendline' | 'fibonacci' | 'long' | 'short';
  color: string;
  width: number;
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  price?: number;
  p1?: { logical: number; price: number };
  p2?: { logical: number; price: number };
  stopPrice?: number;
  levels?: FibLevel[];
}

export interface NewsItem {
  title: string;
  publisher: string;
  link: string;
  time?: string;
}

export interface SentimentAnalysis {
  sentiment_score: number;
  sentiment_label: 'MOLTO RIALZISTA' | 'MODERATAMENTE RIALZISTA' | 'NEUTRALE' | 'MODERATAMENTE RIBASSISTA' | 'MOLTO RIBASSISTA';
  summary: string;
  key_drivers: string[];
}

export interface ValuationModels {
  dcf_fair_value: number;
  graham_number: number;
  peter_lynch_value: number;
  safety_margin_pct: number;
  expected_growth_pct: number;
  status_label: 'SOTTOVALUTATO' | 'SOPRAVVALUTATO' | 'CORRETTAMENTE VALUTATO';
}

export interface AnalystForecasts {
  target_mean: number;
  target_high: number;
  target_low: number;
  recommendation: string;
  num_analysts: number;
}

export interface PeerCompany {
  symbol: string;
  name: string;
  pe: number;
  pb: number;
  ev_ebitda: number;
  div_yield: number;
  roe: number;
}

export interface SeasonalityPoint {
  label: string;
  avg_return: number;
}

export interface RelativePerformance {
  benchmark_name: string;
  stock_1m: number;
  bench_1m: number;
  stock_1y: number;
  bench_1y: number;
  alpha_1y: number;
  beta: number;
}

export interface FundamentalData {
  ticker: string;
  name: string;
  currency: string;
  sector: string;
  industry: string;
  price: number;
  valuation_models: ValuationModels;
  institutional_holdings: {
    institutions_pct: number;
    insiders_pct: number;
    float_shares: number;
  };
  analyst_forecasts: AnalystForecasts;
  seasonality: SeasonalityPoint[];
  relative_perf: RelativePerformance;
  peers: PeerCompany[];
  multiples: {
    pe: number;
    peg: number;
    pb: number;
    ev_ebitda: number;
    dividend_yield: number;
  };
}

export interface CalendarEvent {
  date: string;
  country: string;
  event: string;
  impact: 'ALTO' | 'MEDIO' | 'BASSO';
  previous: string;
  forecast: string;
  actual?: string;
}

export interface EconomicCalendarData {
  upcoming_events: CalendarEvent[];
  past_events: CalendarEvent[];
}

export interface CorrelationRow {
  asset: string;
  values: Record<string, number>;
}

export interface CorrelationMatrixData {
  target: string;
  days: number;
  assets: string[];
  matrix: CorrelationRow[];
}

export interface ApiKeysConfig {
  GEMINI_API_KEY: string;
  ALPHAVANTAGE_API_KEY: string;
  FINNHUB_API_KEY: string;
  NEWSAPI_KEY: string;
  FRED_API_KEY: string;
  TWELVE_DATA_API_KEY: string;
}

export interface PriceAlert {
  id: string;
  ticker: string;
  targetPrice: number;
  condition: 'ABOVE' | 'BELOW';
  createdAt: string;
  triggered: boolean;
  active: boolean;
}

export interface WatchlistItem {
  symbol: string;
  name: string;
  price: number;
  changePct: number;
  currency?: string;
  high?: number;
  low?: number;
}

export type PageId = 'chart' | 'news' | 'fundamental' | 'calendar' | 'correlations' | 'inflation';

export interface PageDefinition {
  id: PageId;
  title: string;
  navTitle: string;
  icon: string;
  description: string;
}

export type OverlayScaleMode = 'percent' | 'price';
export type OverlaySeriesType = 'line' | 'area';
export type OverlayLineStyle = 'solid' | 'dashed' | 'dotted';

export interface OverlayConfig {
  id: string;
  ticker: string;
  name: string;
  interval: string; // 'same' or explicit '1d', '1wk', '1h', '4h', etc.
  color: string;
  lineWidth: number;
  lineStyle: OverlayLineStyle;
  seriesType: OverlaySeriesType;
  visible: boolean;
  scaleMode: OverlayScaleMode;
}

export interface OverlayCorrelationStats {
  overlayId: string;
  ticker: string;
  name: string;
  interval: string;
  color: string;
  scaleMode: OverlayScaleMode;
  currentPrice: number;
  correlationPrice: number; // Pearson r on prices [-1, 1]
  correlationReturns: number; // Pearson r on period returns [-1, 1]
  correlationLabel: string;
  mainReturnPct: number;
  overlayReturnPct: number;
  performanceSpread: number; // mainReturnPct - overlayReturnPct
  beta: number;
  overlapBars: number;
  startDate?: string;
  endDate?: string;
}

