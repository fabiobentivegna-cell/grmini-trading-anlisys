import { Handler } from "@netlify/functions";
import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance();

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: { "Access-Control-Allow-Origin": "*" } };
  }

  const sym = event.queryStringParameters?.sym;
  const tf = event.queryStringParameters?.tf;

  if (!sym || typeof sym !== "string") {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Simbolo mancante" })
    };
  }

  let interval: '1m'|'2m'|'5m'|'15m'|'30m'|'60m'|'90m'|'1h'|'1d'|'5d'|'1wk'|'1mo'|'3mo' = '1d';
  let range = '1y'; 

  const t = (tf || "1d").toLowerCase();
  if (t === '1m' || t === '5m') { interval = '5m'; range = '5d'; }
  else if (t === '15m' || t === '30m') { interval = '15m'; range = '1mo'; }
  else if (t === '1h') { interval = '60m'; range = '1mo'; }
  else if (t === '4h') { interval = '60m'; range = '3mo'; }
  else if (t === '1d') { interval = '1d'; range = '1y'; }
  else if (t === '1w' || t === 'sett.') { interval = '1wk'; range = '5y'; }
  else if (t === '1mo' || t === 'mens.') { interval = '1mo'; range = '10y'; }

  try {
    const queryOptions = { period1: range, interval };
    const result = await yahooFinance.chart(sym, queryOptions);
    
    if (result && result.quotes && result.quotes.length > 0) {
      const data = result.quotes.map(q => ({
        time: Math.floor(new Date(q.date).getTime() / 1000),
        open: q.open || q.close,
        high: q.high || q.close,
        low: q.low || q.close,
        close: q.close,
        volume: q.volume || 0
      })).filter(q => q.close !== null && q.close !== undefined && !isNaN(q.close));

      return {
        statusCode: 200,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ data })
      };
    } else {
      return {
        statusCode: 200,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ data: [] })
      };
    }
  } catch (err) {
    console.error("Chart data error:", err);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Errore recupero dati chart" })
    };
  }
};
