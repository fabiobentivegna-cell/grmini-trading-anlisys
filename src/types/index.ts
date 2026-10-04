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
  // Ichimoku Kinko Hyo
  ichimokuEnabled?: boolean;
  ichimokuConversionPeriod?: number; // 9
  ichimokuBasePeriod?: number; // 26
  ichimokuSpanBPeriod?: number; // 52
  ichimokuDisplacement?: number; // 26
  // Pivot Points
  pivotEnabled?: boolean;
  pivotType?: 'STANDARD' | 'FIBONACCI' | 'CAMARILLA';
  // Keltner Channels
  keltnerEnabled?: boolean;
  keltnerPeriod?: number;
  keltnerMult?: number;
  // VWAP
  vwapEnabled?: boolean;
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
  // Stochastic RSI
  stochRsiEnabled?: boolean;
  stochRsiLen?: number;
  stochRsiK?: number;
  stochRsiD?: number;
  // AI Sentiment Background Overlay
  sentimentOverlayEnabled?: boolean;
  sentimentOverlayOpacity?: number;
  // Smart Money Concepts (SMC) & Market Structure
  smcEnabled?: boolean;
  smcShowBosChoch?: boolean;
  smcShowFvg?: boolean;
  smcShowOrderBlocks?: boolean;
  smcShowLiquiditySweeps?: boolean;
  multiTimeframeHubEnabled?: boolean;
}

export interface SmcStructureBreak {
  id: string;
  type: 'BOS' | 'CHoCH';
  direction: 'BULLISH' | 'BEARISH';
  price: number;
  startIndex: number;
  endIndex: number;
  startTime: string | number;
  endTime: string | number;
  label: string;
}

export interface SmcFairValueGap {
  id: string;
  direction: 'BULLISH' | 'BEARISH';
  startIndex: number;
  endIndex: number;
  startTime: string | number;
  topPrice: number;
  bottomPrice: number;
  midPrice: number;
  mitigated: boolean;
}

export interface SmcOrderBlock {
  id: string;
  direction: 'BULLISH' | 'BEARISH';
  startIndex: number;
  endIndex: number;
  startTime: string | number;
  topPrice: number;
  bottomPrice: number;
  mitigated: boolean;
}

export interface SmcLiquiditySweep {
  id: string;
  direction: 'BULLISH' | 'BEARISH';
  index: number;
  time: string | number;
  levelPrice: number;
  wickPrice: number;
  closePrice: number;
  label: string;
}

export interface SmcAnalysisResult {
  structureBreaks: SmcStructureBreak[];
  fairValueGaps: SmcFairValueGap[];
  orderBlocks: SmcOrderBlock[];
  liquiditySweeps: SmcLiquiditySweep[];
  currentTrend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
}

export interface MultiTimeframeSummaryItem {
  interval: '15m' | '1h' | '4h' | '1d';
  label: string;
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  ema50: number;
  ema200: number;
  priceAboveEma50: boolean;
  priceAboveEma200: boolean;
  rsi: number;
  rsiStatus: 'OVERBOUGHT' | 'OVERSOLD' | 'NEUTRAL' | 'BULLISH_MOMENTUM' | 'BEARISH_MOMENTUM';
  supertrend: 'BULLISH' | 'BEARISH';
  macd: 'BULLISH' | 'BEARISH';
  score: number; // 0 to 100
}

export interface MultiTimeframeConfluence {
  ticker: string;
  items: MultiTimeframeSummaryItem[];
  overallAlignment: 'STRONG_BULLISH' | 'BULLISH' | 'MIXED' | 'BEARISH' | 'STRONG_BEARISH';
  confluenceScore: number; // 0 to 100
  alignedCount: number;
  totalCount: number;
}

export type DrawingToolType = 'cursor' | 'horizontal' | 'trendline' | 'fibonacci' | 'long' | 'short' | 'rectangle' | 'supply_demand' | 'harmonic' | 'measure';

export interface FibLevel {
  lvl: number;
  color: string;
}

export interface DrawingItem {
  id: string;
  type: 'horizontal' | 'trendline' | 'fibonacci' | 'long' | 'short' | 'rectangle' | 'supply_demand' | 'harmonic' | 'measure';
  color: string;
  width: number;
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  price?: number;
  p1?: { logical: number; price: number };
  p2?: { logical: number; price: number };
  p3?: { logical: number; price: number };
  p4?: { logical: number; price: number };
  p5?: { logical: number; price: number };
  points?: { logical: number; price: number }[];
  fillColor?: string;
  label?: string;
  stopPrice?: number;
  levels?: FibLevel[];
  zoneType?: 'supply' | 'demand' | 'auto';
  showMedianLine?: boolean;
  medianPrice?: number;
  // Position Sizing Calculator Properties
  positionRiskAmount?: number;
  positionAccountEquity?: number;
  positionRiskPct?: number;
  calculatedShares?: number;
  calculatedTotalValue?: number;
  calculatedMaxLoss?: number;
  calculatedMaxProfit?: number;
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

export interface BullishBearishReport {
  ticker: string;
  bullish_score: number; // 0 to 100
  bearish_score: number; // 0 to 100
  consensus: 'FORTE SEGNALE RIALZISTA (BULLISH)' | 'MODERATAMENTE RIALZISTA' | 'NEUTRALE / BILANCIATO' | 'MODERATAMENTE RIBASSISTA' | 'FORTE SEGNALE RIBASSISTA (BEARISH)';
  confidence_pct: number; // 0 to 100
  executive_summary: string;
  bullish_catalysts: string[];
  bearish_risks: string[];
  trader_takeaway: string;
  evaluated_articles_count: number;
  timestamp: string;
  // Quantitative score breakdown (0 to 100)
  macro_score?: number;
  financials_score?: number;
  sentiment_score?: number;
  technical_score?: number;
  catalyst_score?: number;
  // Estimated Price Targets
  target_3m?: number;
  target_6m?: number;
  target_12m?: number;
  target_confidence_low?: number;
  target_confidence_high?: number;
  risk_reward_score?: number; // 1.0 to 5.0
}

export interface FinancialReportAudit {
  report_title: string;
  ticker: string;
  period: string;
  overall_verdict: 'ECCELLENTE' | 'SOLIDO' | 'NEUTRALE' | 'ATTENZIONE / CAUTELA' | 'CRITICO';
  overall_score: number; // 0 to 100
  executive_summary: string;
  kpis: {
    revenue_growth_yoy: string;
    operating_margin: string;
    free_cash_flow: string;
    net_debt_ebitda: string;
    eps_actual_vs_estimate: string;
    future_guidance: string;
  };
  strengths: string[];
  red_flags: string[];
  analyst_rating: 'BUY' | 'OUTPERFORM' | 'HOLD' | 'UNDERPERFORM' | 'SELL';
  fair_value_estimate: string;
  strategic_takeaway: string;
  audit_timestamp: string;
}

export interface SentimentHistoryPoint {
  time: string; // 'YYYY-MM-DD'
  score: number; // between -1.0 and +1.0
  bullish_score: number; // 0 to 100
  bearish_score: number; // 0 to 100
  label: string;
  news_volume: number;
  headline?: string;
}

export interface SentimentHistoryResponse {
  ticker: string;
  points: SentimentHistoryPoint[];
  average_score_30d: number;
  trend_30d_pct: number;
  dominant_sentiment: string;
  peak_bullish_date: string;
  peak_bullish_score: number;
  peak_bearish_date: string;
  peak_bearish_score: number;
  total_news_volume: number;
}

export interface ValuationModels {
  dcf_fair_value: number;
  graham_number: number;
  peter_lynch_value: number;
  safety_margin_pct: number;
  expected_growth_pct: number;
  status_label: 'SOTTOVALUTATO' | 'SOPRAVVALUTATO' | 'CORRETTAMENTE VALUTATO' | 'MOLTO SOTTOVALUTATO' | 'MOLTO SOPRAVVALUTATO';
}

export interface StatementYearData {
  year: string;
  revenue: number;
  costOfRevenue: number;
  grossProfit: number;
  operatingExpenses: number;
  operatingIncome: number;
  netIncome: number;
  eps: number;
  ebitda: number;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  cashAndEquivalents: number;
  totalDebt: number;
  operatingCashFlow: number;
  capex: number;
  freeCashFlow: number;
  grossMarginPct: number;
  operatingMarginPct: number;
  netMarginPct: number;
}

export interface FinancialStatementReport {
  ticker: string;
  period: 'annual' | 'quarter';
  currency: string;
  years: StatementYearData[];
}

export interface HealthCategoryScore {
  name: 'Redditività' | 'Liquidità' | 'Solvibilità' | 'Crescita' | 'Valutazione';
  score: number; // 0 to 100
  status: 'ECCELLENTE' | 'BUONO' | 'MEDIO' | 'ATTENZIONE' | 'CRITICO';
  keyMetric: string;
  sectorMedian: string;
}

export interface FinancialRatiosReport {
  ticker: string;
  currency: string;
  pe_ratio: number;
  forward_pe: number;
  peg_ratio: number;
  ps_ratio: number;
  pb_ratio: number;
  ev_ebitda: number;
  ev_sales: number;
  pfcf_ratio: number;
  dividend_yield: number;
  roe_pct: number;
  roic_pct: number;
  roa_pct: number;
  gross_margin_pct: number;
  operating_margin_pct: number;
  net_margin_pct: number;
  fcf_margin_pct: number;
  current_ratio: number;
  quick_ratio: number;
  debt_to_equity: number;
  debt_to_ebitda: number;
  interest_coverage: number;
  altman_z_score: number;
  piotroski_f_score: number;
  health_score: number; // 0 to 100
  health_categories: HealthCategoryScore[];
}

export interface MultiModelFairValueItem {
  id: string;
  name: string;
  category: 'DCF' | 'MULTIPLI' | 'DIVIDENDI' | 'PATRIMONIALE';
  fair_value: number;
  weight: number;
  description: string;
}

export interface ProTipItem {
  id: string;
  type: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  tag: '[RIALZISTA]' | '[RIBASSISTA]' | '[NEUTRO]';
  title: string;
  description: string;
  detail?: string;
  impact_area?: 'Cash Flow' | 'Margini' | 'Debito' | 'Crescita' | 'Valutazione' | string;
}

export interface FairValueDcfReport {
  ticker: string;
  current_price: number;
  currency: string;
  fair_value_mean: number;
  safety_margin_pct: number;
  valuation_status: 'MOLTO SOTTOVALUTATO' | 'SOTTOVALUTATO' | 'CORRETTAMENTE VALUTATO' | 'SOPRAVVALUTATO' | 'MOLTO SOPRAVVALUTATO';
  uncertainty_level: 'BASSA' | 'MEDIA' | 'ALTA';
  models: MultiModelFairValueItem[];
  protips: ProTipItem[];
  smart_quant_fundamental_score: number; // 0 to 100
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
  financial_statements?: FinancialStatementReport;
  financial_ratios?: FinancialRatiosReport;
  fair_value_report?: FairValueDcfReport;
  health_score?: number;
  health_categories?: HealthCategoryScore[];
  protips?: ProTipItem[];
  smart_quant_fundamental_score?: number;
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

export interface SentimentAlert {
  id: string;
  ticker: string;
  targetScore: number; // Punteggio sentiment [-1.0 .. +1.0]
  condition: 'ABOVE' | 'BELOW';
  createdAt: string;
  triggered: boolean;
  active: boolean;
  lastTriggeredScore?: number;
  lastTriggeredAt?: string;
}

export type DivergenceType = 'BEARISH_DIVERGENCE' | 'BULLISH_DIVERGENCE' | 'NONE';

export interface SentimentDivergenceAlert {
  id: string;
  ticker: string;
  type: 'BEARISH_DIVERGENCE' | 'BULLISH_DIVERGENCE';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  priceChangePct: number;
  sentimentChange: number;
  currentPrice: number;
  currentSentiment: number;
  title: string;
  description: string;
  tradingImplication: string;
  timestamp: string;
  timeKey?: string | number;
  triggered: boolean;
  active: boolean;
}

export interface DivergencePoint {
  time: string | number;
  type: 'BEARISH' | 'BULLISH';
  price: number;
  sentimentScore: number;
  label: string;
  description: string;
  severity: 'HIGH' | 'MEDIUM';
}

// -------------------------------------------------------------
// Backtesting Engine Types (Moving Average Crossover Simulation)
// -------------------------------------------------------------
export type MaType = 'SMA' | 'EMA' | 'WMA';
export type BacktestDirection = 'LONG_ONLY' | 'LONG_AND_SHORT';
export type RegimeFilterType = 'NONE' | 'ADX_TREND' | 'SMA200_TREND' | 'MULTI_MA';

export interface BacktestConfig {
  fastPeriod: number;
  fastType: MaType;
  slowPeriod: number;
  slowType: MaType;
  direction: BacktestDirection;
  initialCapital: number;
  feePct: number; // in percent (e.g. 0.1 for 0.1%)
  stopLossPct: number; // in percent (0 = disattivato)
  takeProfitPct: number; // in percent (0 = disattivato)
  // Regime & Trend Filters
  regimeFilter: RegimeFilterType;
  adxThreshold: number; // e.g. 25
  regimeSmaPeriod: number; // e.g. 200
}

export interface BacktestTrade {
  id: number;
  type: 'LONG' | 'SHORT';
  entryDate: string;
  entryPrice: number;
  exitDate: string;
  exitPrice: number;
  returnPct: number;
  pnlDollars: number;
  durationBars: number;
  exitReason: 'CROSSOVER' | 'STOP_LOSS' | 'TAKE_PROFIT' | 'END_OF_DATA';
  cumulativeEquity: number;
}

export interface BacktestEquityPoint {
  time: string;
  equity: number;
  benchmarkEquity: number;
  drawdownPct: number;
}

export interface BacktestResult {
  config: BacktestConfig;
  ticker: string;
  interval: string;
  totalBars: number;
  startDate: string;
  endDate: string;
  initialCapital: number;
  finalCapital: number;
  netProfit: number;
  netProfitPct: number;
  benchmarkReturnPct: number;
  alphaPct: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRatePct: number;
  profitFactor: number;
  maxDrawdownPct: number;
  maxDrawdownDollars: number;
  sharpeRatio: number;
  // Metriche Aggiuntive Avanzate
  sortinoRatio: number;
  expectancyDollars: number;
  expectancyReturnPct: number;
  recoveryFactor: number;
  payoffRatio: number;
  tradesFilteredOutByRegime?: number;
  avgTradeReturnPct: number;
  bestTradePct: number;
  worstTradePct: number;
  avgTradeBars: number;
  equityCurve: BacktestEquityPoint[];
  trades: BacktestTrade[];
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

export type PageId = 'chart' | 'news' | 'fundamental' | 'agent' | 'calendar' | 'correlations' | 'inflation' | 'screener' | 'heatmap' | 'multichart';

// -------------------------------------------------------------
// Metodologia Giacomo Probo AI Analysis Types
// -------------------------------------------------------------
export interface ProboTechniquesConfluence {
  classicalGraph: {
    confirmed: boolean;
    trendlinesAndChannels: string;
    supportResistance: string;
    fibonacciLevels: string;
    chartPatterns: string;
  };
  candlestickHeikenAshi: {
    confirmed: boolean;
    candlestickPattern: string;
    heikenAshiTrend: string;
  };
  movingAverages: {
    confirmed: boolean;
    primaryDirection: 'RIALZISTA' | 'RIBASSISTA' | 'LATERALE';
    details: string;
  };
  oscillators: {
    confirmed: boolean;
    slowStochastic: {
      params: string;
      kValue: number;
      dValue: number;
      zone: 'IPERCOMPRATO (>75)' | 'IPERVENDUTO (<25)' | 'NEUTRALE';
      crossover: string;
      divergence: string;
    };
    bollingerBands: {
      params: string;
      pricePosition: 'USCITA BANDA SUPERIORE' | 'USCITA BANDA INFERIORE' | 'ALL INTERNO DELLE BANDE';
      volatilityExcess: boolean;
      details: string;
    };
  };
  volumeProfile: {
    confirmed: boolean;
    pocPrice: number;
    valueArea: string;
    volumeConfirmation: string;
  };
  totalConfirmedCount: number; // 0 to 5
}

export interface ProboAnalysisReport {
  ticker: string;
  timestamp: string;
  timeframe: string;
  currentPrice: number;
  marketScenario: {
    primaryTrend: 'RIALZISTA' | 'RIBASSISTA' | 'LATERALE';
    primarySupport: number;
    secondarySupport: number;
    primaryResistance: number;
    secondaryResistance: number;
    marketContext: string;
  };
  confluence: ProboTechniquesConfluence;
  operationVerdict: 'BUY' | 'SELL' | 'WAIT';
  sizeManagement: {
    recommendedSize: 'MASSIMA' | 'INTERMEDIA' | 'MINIMA' | 'NESSUNA ENTRATA';
    capitalRiskPct: string;
    sizeRationale: string;
  };
  tacticalSetup: {
    entryPrice: number;
    stopLossPrice: number;
    stopLossPlacementReason: string;
    takeProfit1: number;
    takeProfit2: number;
    scalingOutStrategy: string;
    riskRewardRatio: number;
    riskRewardCompliant: boolean;
  };
  executiveSummary: string;
  proboRulesCompliance: string[];
}

// -------------------------------------------------------------
// Multi-Timeframe Quad AI Analysis Report
// -------------------------------------------------------------
export interface TimeframeAnalysisItem {
  timeframe: '1d' | '1h' | '15m' | '5m' | string;
  label: string;
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  emaAlignment: 'STRONG_BULL' | 'BULL_CROSS' | 'BEAR_CROSS' | 'STRONG_BEAR';
  rsi: number;
  rsiCondition: 'OVERBOUGHT' | 'NEUTRAL' | 'OVERSOLD';
  supertrend: 'BULLISH' | 'BEARISH';
  macd: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  smcStructure: 'BOS_BULL' | 'BOS_BEAR' | 'CHOCH_BULL' | 'CHOCH_BEAR' | 'ORDER_BLOCK' | 'RANGING';
  keySupport: number;
  keyResistance: number;
  summary: string;
}

export interface MultiTimeframeAiReport {
  ticker: string;
  assetName: string;
  currentPrice: number;
  currency: string;
  timestamp: string;
  confluenceScore: number; // 0 to 100
  overallBias: 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL';
  biasClassification: string;
  alignmentSummary: string;
  timeframes: Record<string, TimeframeAnalysisItem>;
  crossDivergences: {
    title: string;
    description: string;
    impact: 'OPPORTUNITY' | 'RISK' | 'NEUTRAL';
  }[];
  tacticalPlan: {
    recommendedAction: 'ACCUMULA_LONG' | 'SCALP_LONG' | 'ATTENDI_PULLBACK' | 'DISTRIBUISCI_SHORT' | 'SCALP_SHORT';
    triggerCondition: string;
    entryZone: string;
    suggestedStopLoss: number;
    targetProfit1: number;
    targetProfit2: number;
    riskRewardRatio: string;
    timeHorizon: string;
  };
  institutionalFootprint: string;
}

// -------------------------------------------------------------
// Financial Intelligence Agent (InvestingPro + Quantaste + Forecaster Terminal)
// -------------------------------------------------------------
export interface FairValueModelItem {
  name: string;
  value: number;
  weight: number; // 0 to 1
  description: string;
}

export interface FairValueMultiModel {
  current_price: number;
  aggregated_fair_value: number;
  upside_downside_pct: number;
  uncertainty_level: 'Bassa' | 'Media' | 'Alta';
  models: {
    dcf_5_10y: FairValueModelItem;
    ev_ebitda: FairValueModelItem;
    pe_multiple: FairValueModelItem;
    ps_multiple: FairValueModelItem;
    pb_multiple: FairValueModelItem;
    dividend_discount: FairValueModelItem;
  };
  valuation_summary: string;
}

export interface FinancialHealthScore {
  overall_score: number; // 0 to 100
  rating_stars: number; // 1 to 5
  cash_flow_score: number; // 0 to 100
  profitability_score: number; // 0 to 100
  solvency_debt_score: number; // 0 to 100
  growth_score: number; // 0 to 100
  peer_relative_score: number; // 0 to 100
  verdict: 'ECCELLENTE' | 'MOLTO BUONO' | 'BUONO / NEUTRALE' | 'ATTENZIONE' | 'CRITICO';
  commentary: string;
}

export interface CompetitorComparisonItem {
  ticker: string;
  name: string;
  marketCap: string;
  pe: number;
  ev_ebitda: number;
  operating_margin: number; // %
  roe: number; // %
  debt_equity: number;
  fair_value_upside: number; // %
  isTarget?: boolean;
}

export interface SmartQuantScore {
  score: number; // 0 to 100
  signal: 'STRONG BUY' | 'BUY' | 'HOLD / NEUTRAL' | 'SELL' | 'STRONG SELL';
  signal_classification: string;
  momentum_activated: boolean; // true if score >= 75
  pillars: {
    macro: { score: number; label: string; commentary: string };
    fundamental: { score: number; label: string; commentary: string };
    technical: { score: number; label: string; commentary: string };
    seasonality: { score: number; label: string; commentary: string };
    analyst_consensus: { score: number; label: string; commentary: string };
  };
  macro_regime: {
    phase: 'Crescita (Goldilocks)' | 'Rallentamento / Inflazione' | 'Stagflazione' | 'Recessione / Contrazione' | 'Ripresa Ciclica';
    liquidity_regime: 'In Espansione' | 'Neutrale' | 'Restrittivo';
    overweight_sectors: string[];
    underweight_sectors: string[];
    commentary: string;
  };
}

export interface ProjectionScenario {
  bullish_mean_pct: number;
  bullish_price: number;
  bearish_mean_pct: number;
  bearish_price: number;
  most_correlated_case: {
    year: number;
    asset: string;
    correlation_r: number;
    path_pct: number;
    description: string;
  };
}

export interface ProjectionPoint {
  day: number;
  label: string;
  bullish: number;
  baseline: number;
  bearish: number;
}

export interface ProjectionEngine {
  timeframe: string; // e.g. "30-90 Giorni"
  success_probability_pct: number; // e.g. 78%
  robustness_stars: number; // 1 to 5
  historical_pattern_years: number; // 30
  dominant_direction: 'RIALZISTA' | 'RIBASSISTA' | 'LATERALE';
  scenarios: ProjectionScenario;
  pullback_warning: {
    expected: boolean;
    estimated_pullback_pct: number;
    support_level: number;
    timing_bars: string;
    advice: string;
  };
  projected_path: ProjectionPoint[];
}

export interface MarketMoodMeter {
  score: number; // 0 to 100
  state: 'IPERVENDUTO ESTREMO' | 'IPERVENDUTO' | 'NEUTRALE' | 'IPERCOMPRATO' | 'IPERCOMPRATO ESTREMO';
  dpo_value: number; // Detrended Price Oscillator
  wyckoff_phase: string;
  price_velocity: 'Alta Accelerazione' | 'Moderata' | 'Decelerazione / Consolidamento';
  divergence: {
    detected: boolean;
    type: 'RIALZISTA CLASSICA' | 'RIALZISTA NASCOSTA' | 'RIBASSISTA CLASSICA' | 'NESSUNA';
    description: string;
    reliability: 'ALTA' | 'MEDIA' | 'BASSA';
  };
  entry_timing: {
    action: 'BUY ON PULLBACK' | 'ACCUMULAZIONE GRADUALE' | 'ATTENDERE CONFERMA' | 'PRESE DI BENEFICIO' | 'SELL / HEDGE';
    optimal_entry: number;
    stop_loss: number;
    take_profit: number;
    risk_reward_ratio: number;
    time_horizon: string;
  };
}

export interface InstitutionalFlowsData {
  cot_commercials_net: 'NET LONG' | 'NET SHORT' | 'NEUTRALE';
  cot_commercials_percentile: number; // 0-100
  cot_speculators_net: 'NET LONG' | 'NET SHORT';
  insider_activity: 'NET BUYING' | 'NEUTRALE' | 'NET SELLING';
  insider_buy_sell_ratio: number;
  dark_pool_score: number; // 0-100
  flow_commentary: string;
}

export interface FinancialIntelligenceReport {
  ticker: string;
  name: string;
  asset_type: 'AZIONI' | 'ETF' | 'INDICE' | 'FOREX' | 'COMMODITY' | 'CRYPTO';
  currency: string;
  current_price: number;
  timestamp: string;
  executive_summary: string;
  // 1. InvestingPro Pillar
  fair_value: FairValueMultiModel;
  financial_health: FinancialHealthScore;
  protips: ProTipItem[];
  competitors: CompetitorComparisonItem[];
  // 2. Quantaste Pillar
  smart_quant: SmartQuantScore;
  // 3. Forecaster Terminal Pillar
  projection: ProjectionEngine;
  market_mood: MarketMoodMeter;
  institutional_flows: InstitutionalFlowsData;
  // Disclaimer
  disclaimer: string;
}

export interface HeatmapStockItem {
  symbol: string;
  name: string;
  market: 'IT' | 'US' | 'EU' | 'CRYPTO_COMMODITY';
  sector: string;
  price: number;
  currency: string;
  marketCap: number; // Mld € or $
  change1d: number; // %
  change1w: number; // %
  change1m: number; // %
  changeYtd: number; // %
  change1y: number; // %
  volume: string;
  pe?: number;
  rsi?: number;
}

export interface ScreenerStockItem {
  symbol: string;
  name: string;
  exchange: string;
  country: 'IT' | 'US' | 'EU' | 'OTHER';
  sector: string;
  industry: string;
  price: number;
  changePct: number;
  marketCap: number; // In Miliardi di EUR / USD
  marketCapCategory: 'Mega' | 'Large' | 'Mid' | 'Small';
  pe: number;
  forwardPe: number;
  pb: number;
  peg: number;
  evEbitda: number;
  pcf: number;
  roe: number; // %
  roa: number; // %
  operatingMargin: number; // %
  grossMargin: number; // %
  revenueGrowthYoY: number; // %
  epsGrowthYoY: number; // %
  debtToEquity: number;
  currentRatio: number;
  dividendYield: number; // %
  payoutRatio: number; // %
  rsi14: number;
  beta: number;
  priceAboveSma50: boolean;
  priceAboveSma200: boolean;
  fairValue: number;
  fairValueUpside: number; // %
  buffettScore: number; // 0 - 100
  investingProScore: number; // 1.0 - 5.0
  dalioScore: number; // 0 - 100
  growthScore: number; // 0 - 100
  valueScore: number; // 0 - 100
  roic?: number; // % Return on Invested Capital
  fcfYield?: number; // % Free Cash Flow Yield
  piotroskiScore?: number; // 0 - 9 F-Score
  // Composite Rank & Multi-Factor Confluence
  compositeRank?: number; // 0 - 100 Multi-Factor Confluence Rank
  technicalScore?: number; // 0 - 100
  fundamentalScore?: number; // 0 - 100
  sentimentScore?: number; // 0 - 100
}

export interface ScreenerFilterState {
  search: string;
  presetModel: string;
  country: string;
  sector: string;
  marketCapCategory: string;
  minCompositeRank?: number;
  minPe?: number;
  maxPe?: number;
  minPb?: number;
  maxPb?: number;
  minPeg?: number;
  maxPeg?: number;
  minRoe?: number;
  minRoic?: number;
  minFcfYield?: number;
  minPiotroskiScore?: number;
  minOperatingMargin?: number;
  minRevenueGrowth?: number;
  minEpsGrowth?: number;
  maxDebtToEquity?: number;
  minCurrentRatio?: number;
  minDividendYield?: number;
  maxPayoutRatio?: number;
  minFairValueUpside?: number;
  minRsi?: number;
  maxRsi?: number;
  smaTrend: 'ALL' | 'ABOVE_200' | 'ABOVE_50_200' | 'BELOW_200';
  minBeta?: number;
  maxBeta?: number;
}

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

export interface LiveTickUpdate {
  ticker: string;
  time: string | number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  isClosed?: boolean;
  source: string;
  provider: 'binance' | 'finnhub' | 'twelvedata' | 'feed';
}

export interface WebSocketStatus {
  connected: boolean;
  provider: string;
  ticker: string;
  latencyMs?: number;
  lastMessageTime?: number;
}
