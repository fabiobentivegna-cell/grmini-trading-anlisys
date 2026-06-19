export interface Instrument {
  sym: string;
  tvSym: string;
  name: string;
  market: 'italia' | 'usa' | 'forex' | 'commodities' | 'crypto';
  price: number;
  chg: number;
  chgPct: number;
  pe: string | number;
  ps: string | number;
  pb: string | number;
  roe: string | number;
  eps?: number;
  bvps?: number;
  fcfps?: number;
  vol: string;
  mktcap: string;
  mktcapN?: number;
  w52h: number;
  w52l: number;
  div: string | number;
  analyst: {
    buy: number;
    hold: number;
    sell: number;
  };
  valScore: number;
  fair: number;
  sent: {
    bull: number;
    bear: number;
    neut: number;
  };
  fgi: number;
  targets: Array<{
    firm: string;
    rating: string;
    target: number;
    date: string;
  }>;
  seas: number[];
  recentMonths: number[];
  historicalPrevision?: {
    optimizedScenario: string;
    description: string;
  };
}

export interface Trade {
  id: string;
  sym: string;
  dir: 'LONG' | 'SHORT';
  status: 'OPEN' | 'CLOSED';
  edate: string;
  xdate?: string;
  ep: number;
  xp?: number;
  qty: number;
  comm: number;
  pnl?: number;
  sl?: number;
  tp?: number;
  setup?: string;
  tf?: string;
  emo?: string;
  rating?: number;
  tags?: string[];
  ne?: string;
  nx?: string;
  ss?: string;
}

export interface RealtimeMessage {
  type: 'price' | 'indicator' | 'ai_alert';
  id: string;
  title: string;
  message: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'success';
}
