import { Handler } from "@netlify/functions";
import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance();

export const handler: Handler = async (event) => {
  // Solo POST o GET
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: { "Access-Control-Allow-Origin": "*" } };
  }

  try {
    let instruments: any[] = [];
    if (event.httpMethod === "POST" && event.body) {
      const body = JSON.parse(event.body);
      instruments = body.instruments || [];
    }

    if (!instruments || instruments.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Nessun dato fornito" })
      };
    }

    const symbolMap: Record<string, string> = {
      "A2A": "A2A.MI", "AMP": "AMP.MI", "AZM": "AZM.MI", "BAMI": "BAMI.MI", "BGN": "BGN.MI",
      "BMED": "BMED.MI", "BPE": "BPE.MI", "BRN": "BC.MI", "DIA": "DIA.MI", "ENEL": "ENEL.MI",
      "ENI": "ENI.MI", "ERG": "ERG.MI", "FBK": "FBK.MI", "G": "G.MI", "HER": "HER.MI",
      "INW": "INW.MI", "ISP": "ISP.MI", "LDO": "LDO.MI", "MB": "MB.MI", "MONC": "MONC.MI",
      "NEXI": "NEXI.MI", "PIRE": "PIRC.MI", "PRY": "PRY.MI", "PST": "PST.MI", "RACE": "RACE.MI",
      "REC": "REC.MI", "SPM": "SPM.MI", "SRG": "SRG.MI", "STLAM": "STLAM.MI", "STM": "STM.MI",
      "TEN": "TEN.MI", "TRN": "TRN.MI", "UCG": "UCG.MI", "UNI": "UNI.MI",
      "AAPL": "AAPL", "ADBE": "ADBE", "AMD": "AMD", "AMZN": "AMZN", "AVGO": "AVGO",
      "BAC": "BAC", "BRK.B": "BRK-B", "COST": "COST", "CRM": "CRM", "CVX": "CVX",
      "DIS": "DIS", "GOOGL": "GOOGL", "HD": "HD", "JNJ": "JNJ", "JPM": "JPM", "KO": "KO",
      "LLY": "LLY", "MA": "MA", "META": "META", "MRK": "MRK", "MSFT": "MSFT", "NFLX": "NFLX",
      "NVDA": "NVDA", "PEP": "PEP", "PG": "PG", "TSLA": "TSLA", "UNH": "UNH", "V": "V",
      "WMT": "WMT", "XOM": "XOM",
      "AUDJPY": "AUDJPY=X", "AUDUSD": "AUDUSD=X", "EURCHF": "EURCHF=X", "EURGBP": "EURGBP=X",
      "EURJPY": "EURJPY=X", "EURUSD": "EURUSD=X", "GBPJPY": "GBPJPY=X", "GBPUSD": "GBPUSD=X",
      "NZDUSD": "NZDUSD=X", "USDCAD": "USDCAD=X", "USDCHF": "USDCHF=X", "USDJPY": "USDJPY=X",
      "BRENT": "BZ=F", "COFFEE": "KC=F", "COPPER": "HG=F", "CORN": "ZC=F", "GOLD": "GC=F",
      "NATGAS": "NG=F", "PLATINUM": "PL=F", "SILVER": "SI=F", "SOYBEAN": "ZS=F", "SUGAR": "SB=F",
      "WHEAT": "ZW=F", "WTI": "CL=F",
      "ADAUSD": "ADA-USD", "AVAXUSD": "AVAX-USD", "BNBUSD": "BNB-USD", "BTCUSD": "BTC-USD",
      "DOGEUSD": "DOGE-USD", "DOTUSD": "DOT-USD", "ETHUSD": "ETH-USD", "LINKUSD": "LINK-USD",
      "LTCUSD": "LTC-USD", "MATICUSD": "MATIC-USD", "SOLUSD": "SOL-USD", "XRPUSD": "XRP-USD",
      "S&P500": "^GSPC", "NASDAQ": "^IXIC", "DOWJONES": "^DJI", "FTSEMIB": "FTSEMIB.MI",
      "DAX": "^GDAXI", "CAC40": "^FCHI", "NIKKEI": "^N225", "VIX": "^VIX"
    };

    const symbols = instruments.map(inst => symbolMap[inst.sym] || inst.sym);

    // Dividi in chunk di 50 per limiti API
    const chunkSize = 50;
    const chunks = [];
    for (let i = 0; i < symbols.length; i += chunkSize) {
      chunks.push(symbols.slice(i, i + chunkSize));
    }

    const quotes: any[] = [];
    for (const chunk of chunks) {
      const results = await yahooFinance.quote(chunk);
      quotes.push(...results);
    }

    instruments.forEach(inst => {
      const yfSym = symbolMap[inst.sym] || inst.sym;
      const quote = quotes.find(q => q.symbol === yfSym);
      if (quote && quote.regularMarketPrice) {
        inst.price = quote.regularMarketPrice;
        inst.chg = quote.regularMarketChange || 0;
        inst.chgPct = quote.regularMarketChangePercent || 0;
        if (quote.trailingPE) inst.pe = parseFloat(quote.trailingPE.toFixed(1));
        if (quote.priceToBook) inst.pb = parseFloat(quote.priceToBook.toFixed(2));
        if (quote.trailingAnnualDividendYield) inst.div = parseFloat((quote.trailingAnnualDividendYield * 100).toFixed(2));
        if (quote.epsTrailingTwelveMonths) inst.eps = quote.epsTrailingTwelveMonths;
        if (quote.bookValue) inst.bvps = quote.bookValue;
        if (quote.marketCap) {
          inst.mktcapN = quote.marketCap;
          if (quote.marketCap >= 1e12) inst.mktcap = (quote.marketCap / 1e12).toFixed(2) + "T";
          else if (quote.marketCap >= 1e9) inst.mktcap = (quote.marketCap / 1e9).toFixed(2) + "B";
          else if (quote.marketCap >= 1e6) inst.mktcap = (quote.marketCap / 1e6).toFixed(2) + "M";
        }
        if (quote.regularMarketVolume) {
          if (quote.regularMarketVolume >= 1e9) inst.vol = (quote.regularMarketVolume / 1e9).toFixed(2) + "B";
          else if (quote.regularMarketVolume >= 1e6) inst.vol = (quote.regularMarketVolume / 1e6).toFixed(2) + "M";
          else inst.vol = (quote.regularMarketVolume / 1e3).toFixed(1) + "K";
        }
        if (quote.fiftyTwoWeekHigh) inst.w52h = quote.fiftyTwoWeekHigh;
        if (quote.fiftyTwoWeekLow) inst.w52l = quote.fiftyTwoWeekLow;
      }
    });

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ instruments })
    };
  } catch (error) {
    console.error("Market data error:", error);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Errore recupero dati di mercato" })
    };
  }
};
