export interface AssetOption {
  name: string;
  symbol: string;
}

export const ASSET_CATALOG: Record<string, AssetOption[]> = {
  "Mercato Italiano (FTSE MIB)": [
    { name: "FTSE MIB (Indice)", symbol: "FTSEMIB.MI" },
    { name: "Enel", symbol: "ENEL.MI" },
    { name: "Eni", symbol: "ENI.MI" },
    { name: "Intesa Sanpaolo", symbol: "ISP.MI" },
    { name: "UniCredit", symbol: "UCG.MI" },
    { name: "Ferrari", symbol: "RACE.MI" },
    { name: "Stellantis", symbol: "STLAM.MI" },
    { name: "STMicroelectronics", symbol: "STMMI.MI" },
    { name: "Generali Assicurazioni", symbol: "G.MI" },
    { name: "Telecom Italia", symbol: "TIT.MI" },
    { name: "Moncler", symbol: "MONC.MI" },
    { name: "Prysmian", symbol: "PRY.MI" },
    { name: "Leonardo", symbol: "LDO.MI" },
    { name: "Banco BPM", symbol: "BAMI.MI" },
    { name: "Poste Italiane", symbol: "PST.MI" },
    { name: "Campari", symbol: "CPR.MI" },
    { name: "FinecoBank", symbol: "FBK.MI" },
    { name: "Saipem", symbol: "SPM.MI" }
  ],
  "Generale (Tutte le Notizie)": [
    { name: "Mercati Finanziari Globali", symbol: "GLOBAL" },
    { name: "Macro Economia & Inflazione", symbol: "MACRO" },
    { name: "Borsa Italiana (Piazza Affari)", symbol: "FTSEMIB.MI" },
    { name: "Wall Street & Tech USA", symbol: "^IXIC" }
  ],
  "Mercato USA (Azioni)": [
    { name: "Apple", symbol: "AAPL" },
    { name: "Microsoft", symbol: "MSFT" },
    { name: "NVIDIA", symbol: "NVDA" },
    { name: "Alphabet (Google)", symbol: "GOOGL" },
    { name: "Amazon", symbol: "AMZN" },
    { name: "Meta Platforms", symbol: "META" },
    { name: "Tesla", symbol: "TSLA" },
    { name: "Broadcom", symbol: "AVGO" },
    { name: "AMD", symbol: "AMD" },
    { name: "Palantir", symbol: "PLTR" }
  ],
  "Indici Mondiali": [
    { name: "S&P 500", symbol: "^GSPC" },
    { name: "Nasdaq 100", symbol: "^NDX" },
    { name: "Dow Jones", symbol: "^DJI" },
    { name: "DAX 40 (Germania)", symbol: "^GDAXI" },
    { name: "Euro Stoxx 50", symbol: "^STOXX50E" }
  ],
  "Forex (Cambi Valutari)": [
    { name: "EUR / USD", symbol: "EURUSD=X" },
    { name: "GBP / USD", symbol: "GBPUSD=X" },
    { name: "USD / JPY", symbol: "USDJPY=X" },
    { name: "EUR / GBP", symbol: "EURGBP=X" }
  ],
  "Commodities (Materie Prime)": [
    { name: "Oro (Gold)", symbol: "GC=F" },
    { name: "Argento (Silver)", symbol: "SI=F" },
    { name: "Petrolio Greggio WTI", symbol: "CL=F" },
    { name: "Petrolio Brent", symbol: "BZ=F" },
    { name: "Gas Naturale", symbol: "NG=F" },
    { name: "Rame", symbol: "HG=F" }
  ],
  "Obbligazionario (Rendimenti)": [
    { name: "US 10Y Treasury Yield", symbol: "^TNX" },
    { name: "US 2Y Treasury Yield", symbol: "^IRX" },
    { name: "US 30Y Treasury Yield", symbol: "^TYX" }
  ],
  "Criptovalute": [
    { name: "Bitcoin (BTC/USD)", symbol: "BTC-USD" },
    { name: "Ethereum (ETH/USD)", symbol: "ETH-USD" },
    { name: "Solana (SOL/USD)", symbol: "SOL-USD" }
  ]
};

export const MACRO_PRESETS = [
  { name: "Nasdaq Composite (^IXIC)", symbol: "^IXIC" },
  { name: "S&P 500 (^GSPC)", symbol: "^GSPC" },
  { name: "CBOE VIX (^VIX)", symbol: "^VIX" },
  { name: "US 10Y Yield (^TNX)", symbol: "^TNX" },
  { name: "Brent Crude (BZ=F)", symbol: "BZ=F" },
  { name: "Oro (GC=F)", symbol: "GC=F" },
  { name: "EUR/USD (EURUSD=X)", symbol: "EURUSD=X" },
  { name: "Bitcoin (BTC-USD)", symbol: "BTC-USD" }
];
