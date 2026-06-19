import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import YahooFinance from "yahoo-finance2";
const yahooFinance = new YahooFinance();

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK with custom Telemetry User-Agent
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

// Global financial instruments in-memory database
function makeInstrument(raw: {
  sym: string;
  tvSym: string;
  name: string;
  market: "italia" | "usa" | "forex" | "commodities" | "crypto" | "indici";
  price: number;
  pe?: number | string;
  ps?: number | string;
  pb?: number | string;
  roe?: number | string;
  div?: number | string;
  vol: string;
  mktcap?: string;
  w52h: number;
  w52l: number;
  valScore: number;
  fair: number;
}) {
  const isCorporate = raw.market === "italia" || raw.market === "usa";
  const pe = raw.pe ?? (isCorporate ? +(10 + Math.random() * 20).toFixed(1) : "—");
  const ps = raw.ps ?? (isCorporate ? +(0.8 + Math.random() * 4).toFixed(2) : "—");
  const pb = raw.pb ?? (isCorporate ? +(1.1 + Math.random() * 5).toFixed(2) : "—");
  const roe = raw.roe ?? (isCorporate ? +(8 + Math.random() * 20).toFixed(1) : "—");
  const div = raw.div ?? (isCorporate ? +(1.5 + Math.random() * 4).toFixed(2) : "—");
  const mktcap = raw.mktcap ?? (isCorporate ? "15.4B" : "—");

  // chg and chgPct can be tiny realistic values
  const isUp = Math.random() > 0.45;
  const changePct = +(Math.random() * (raw.market === "crypto" ? 4.5 : raw.market === "forex" ? 0.4 : 1.2)).toFixed(2);
  const chgPct = isUp ? changePct : -changePct;
  const chg = +(raw.price * (chgPct / 100)).toFixed(raw.market === "forex" ? 4 : 2);

  const eps = typeof pe === 'number' && pe > 0 ? +(raw.price / pe).toFixed(2) : undefined;
  const bvps = typeof pb === 'number' && pb > 0 ? +(raw.price / pb).toFixed(2) : undefined;
  const fcfps = isCorporate ? +(raw.price * (0.05 + Math.random() * 0.05)).toFixed(2) : undefined;

  let mktcapN: number | undefined = undefined;
  if (mktcap && mktcap !== "—") {
    if (mktcap.endsWith("T")) mktcapN = parseFloat(mktcap) * 1e12;
    else if (mktcap.endsWith("B")) mktcapN = parseFloat(mktcap) * 1e9;
    else if (mktcap.endsWith("M")) mktcapN = parseFloat(mktcap) * 1e6;
  }

  const analystBuy = Math.floor(12 + Math.random() * 25);
  const analystHold = Math.floor(3 + Math.random() * 12);
  const analystSell = Math.floor(Math.random() * 4);

  const bRate = Math.floor(55 + Math.random() * 25);
  const sRate = Math.floor(Math.random() * (100 - bRate));
  const nRate = 100 - bRate - sRate;

  const seas = Array.from({ length: 12 }, () => +(Math.random() * 3.5 * (Math.random() > 0.4 ? 1 : -1)).toFixed(1));
  const recentMonths = [...seas];

  return {
    sym: raw.sym,
    tvSym: raw.tvSym,
    name: raw.name,
    market: raw.market,
    price: raw.price,
    chg,
    chgPct,
    pe,
    ps,
    pb,
    roe,
    eps,
    bvps,
    fcfps,
    vol: raw.vol,
    mktcap,
    mktcapN,
    w52h: raw.w52h,
    w52l: raw.w52l,
    div,
    analyst: { buy: analystBuy, hold: analystHold, sell: analystSell },
    valScore: raw.valScore,
    fair: raw.fair,
    sent: { bull: bRate, bear: sRate, neut: nRate },
    fgi: Math.floor(45 + Math.random() * 35),
    targets: [
      { firm: "Intesa Sanpaolo / WebSim", rating: "Buy", target: +(raw.price * 1.15).toFixed(raw.market === "forex" ? 4 : 2), date: "Giu 2026" },
      { firm: "Equita SIM / Kepler", rating: "Outperform", target: +(raw.price * 1.08).toFixed(raw.market === "forex" ? 4 : 2), date: "Mag 2026" }
    ],
    seas,
    recentMonths
  };
}

let instruments = [
  // ==================== ITALIA (FTSE MIB ALPHABETICAL) ====================
  makeInstrument({ sym: "A2A", tvSym: "MIL:A2A", name: "A2A S.p.A.", market: "italia", price: 1.95, pe: 10.8, ps: 0.48, pb: 0.98, roe: 9.1, div: 0.09, vol: "14.5M", mktcap: "6.1B", w52h: 2.18, w52l: 1.62, valScore: 73, fair: 2.25 }),
  makeInstrument({ sym: "AMP", tvSym: "MIL:AMP", name: "Amplifon S.p.A.", market: "italia", price: 29.84, pe: 34.2, ps: 2.85, pb: 6.20, roe: 18.5, div: 0.29, vol: "1.2M", mktcap: "6.7B", w52h: 35.40, w52l: 25.10, valScore: 50, fair: 28.00 }),
  makeInstrument({ sym: "AZM", tvSym: "MIL:AZM", name: "Azimut Holding S.p.A.", market: "italia", price: 24.12, pe: 10.1, ps: 1.80, pb: 1.95, roe: 18.2, div: 1.40, vol: "850k", mktcap: "3.4B", w52h: 27.80, w52l: 19.42, valScore: 72, fair: 25.50 }),
  makeInstrument({ sym: "BAMI", tvSym: "MIL:BAMI", name: "Banco BPM S.p.A.", market: "italia", price: 6.12, pe: 5.6, ps: 0.95, pb: 0.58, roe: 10.4, div: 0.56, vol: "11.2M", mktcap: "9.2B", w52h: 6.74, w52l: 3.82, valScore: 83, fair: 7.20 }),
  makeInstrument({ sym: "BGN", tvSym: "MIL:BGN", name: "Banca Generali S.p.A.", market: "italia", price: 38.45, pe: 13.5, ps: 3.10, pb: 3.25, roe: 24.0, div: 2.15, vol: "420k", mktcap: "4.5B", w52h: 41.20, w52l: 31.80, valScore: 68, fair: 40.00 }),
  makeInstrument({ sym: "BMED", tvSym: "MIL:BMED", name: "Banca Mediolanum S.p.A.", market: "italia", price: 10.42, pe: 10.4, ps: 2.10, pb: 1.85, roe: 17.8, div: 0.75, vol: "1.8M", mktcap: "7.7B", w52h: 11.50, w52l: 8.12, valScore: 74, fair: 11.20 }),
  makeInstrument({ sym: "BPE", tvSym: "MIL:BPE", name: "BPER Banca S.p.A.", market: "italia", price: 4.88, pe: 4.8, ps: 0.68, pb: 0.42, roe: 9.8, div: 0.30, vol: "14.2M", mktcap: "6.9B", w52h: 5.42, w52l: 2.85, valScore: 86, fair: 5.80 }),
  makeInstrument({ sym: "BRN", tvSym: "MIL:BC", name: "Brunello Cucinelli S.p.A.", market: "italia", price: 92.15, pe: 48.5, ps: 6.20, pb: 11.50, roe: 24.5, div: 0.95, vol: "310k", mktcap: "6.2B", w52h: 118.40, w52l: 72.10, valScore: 32, fair: 80.00 }),
  makeInstrument({ sym: "DIA", tvSym: "MIL:DIA", name: "DiaSorin S.p.A.", market: "italia", price: 101.40, pe: 28.2, ps: 5.10, pb: 4.50, roe: 15.8, div: 1.15, vol: "280k", mktcap: "5.5B", w52h: 115.42, w52l: 82.35, valScore: 50, fair: 95.00 }),
  makeInstrument({ sym: "ENEL", tvSym: "MIL:ENEL", name: "Enel S.p.A.", market: "italia", price: 6.74, pe: 11.2, ps: 0.65, pb: 1.24, roe: 11.1, div: 0.43, vol: "22.1M", mktcap: "68.5B", w52h: 7.24, w52l: 5.82, valScore: 74, fair: 7.50 }),
  makeInstrument({ sym: "ENI", tvSym: "MIL:ENI", name: "Eni S.p.A.", market: "italia", price: 14.32, pe: 9.4, ps: 0.52, pb: 0.95, roe: 10.4, div: 0.94, vol: "12.4M", mktcap: "47.8B", w52h: 15.82, w52l: 12.94, valScore: 78, fair: 16.50 }),
  makeInstrument({ sym: "ERG", tvSym: "MIL:ERG", name: "ERG S.p.A.", market: "italia", price: 25.14, pe: 14.5, ps: 1.85, pb: 1.62, roe: 11.5, div: 1.00, vol: "410k", mktcap: "3.8B", w52h: 29.50, w52l: 22.10, valScore: 68, fair: 27.50 }),
  makeInstrument({ sym: "FBK", tvSym: "MIL:FBK", name: "FinecoBank S.p.A.", market: "italia", price: 14.22, pe: 15.8, ps: 4.50, pb: 4.80, roe: 28.5, div: 0.69, vol: "3.8M", mktcap: "8.7B", w52h: 15.94, w52l: 11.12, valScore: 70, fair: 15.00 }),
  makeInstrument({ sym: "G", tvSym: "MIL:G", name: "Assicurazioni Generali S.p.A.", market: "italia", price: 22.84, pe: 9.8, ps: 0.38, pb: 1.45, roe: 14.8, div: 1.28, vol: "5.8M", mktcap: "35.8B", w52h: 24.50, w52l: 17.60, valScore: 72, fair: 24.90 }),
  makeInstrument({ sym: "HER", tvSym: "MIL:HER", name: "Hera S.p.A.", market: "italia", price: 3.42, pe: 11.5, ps: 0.32, pb: 1.05, roe: 9.2, div: 0.14, vol: "4.8M", mktcap: "5.1B", w52h: 3.84, w52l: 2.72, valScore: 75, fair: 3.80 }),
  makeInstrument({ sym: "INW", tvSym: "MIL:INW", name: "Inwit S.p.A.", market: "italia", price: 10.15, pe: 21.8, ps: 5.80, pb: 2.95, roe: 13.5, div: 0.48, vol: "2.1M", mktcap: "9.7B", w52h: 12.10, w52l: 9.50, valScore: 60, fair: 11.50 }),
  makeInstrument({ sym: "ISP", tvSym: "MIL:ISP", name: "Intesa Sanpaolo S.p.A.", market: "italia", price: 3.28, pe: 7.2, ps: 1.58, pb: 0.91, roe: 12.6, div: 0.28, vol: "45.0M", mktcap: "60.4B", w52h: 3.52, w52l: 2.24, valScore: 84, fair: 3.85 }),
  makeInstrument({ sym: "LDO", tvSym: "MIL:LDO", name: "Leonardo S.p.A.", market: "italia", price: 21.42, pe: 14.2, ps: 0.78, pb: 1.54, roe: 11.2, div: 0.28, vol: "6.4M", mktcap: "12.4B", w52h: 24.80, w52l: 10.20, valScore: 68, fair: 23.50 }),
  makeInstrument({ sym: "MB", tvSym: "MIL:MB", name: "Mediobanca S.p.A.", market: "italia", price: 13.12, pe: 8.8, ps: 1.82, pb: 1.05, roe: 12.1, div: 0.85, vol: "3.2M", mktcap: "11.2B", w52h: 14.80, w52l: 9.80, valScore: 77, fair: 14.50 }),
  makeInstrument({ sym: "MONC", tvSym: "MIL:MONC", name: "Moncler S.p.A.", market: "italia", price: 58.84, pe: 24.5, ps: 5.80, pb: 5.10, roe: 21.0, div: 1.12, vol: "2.1M", mktcap: "16.1B", w52h: 69.50, w52l: 48.20, valScore: 54, fair: 62.00 }),
  makeInstrument({ sym: "NEXI", tvSym: "MIL:NEXI", name: "Nexi S.p.A.", market: "italia", price: 5.94, pe: 12.1, ps: 0.82, pb: 1.15, roe: 9.5, div: 0.15, vol: "5.1M", mktcap: "7.8B", w52h: 8.84, w52l: 5.10, valScore: 84, fair: 8.50 }),
  makeInstrument({ sym: "PIRE", tvSym: "MIL:PRC", name: "Pirelli & C. S.p.A.", market: "italia", price: 5.84, pe: 11.4, ps: 0.88, pb: 1.12, roe: 10.2, div: 0.35, vol: "3.5M", mktcap: "5.8B", w52h: 6.42, w52l: 4.15, valScore: 71, fair: 6.30 }),
  makeInstrument({ sym: "PRY", tvSym: "MIL:PRY", name: "Prysmian S.p.A.", market: "italia", price: 54.12, pe: 18.2, ps: 0.85, pb: 2.90, roe: 16.5, div: 0.70, vol: "1.5M", mktcap: "15.4B", w52h: 58.40, w52l: 35.20, valScore: 64, fair: 58.00 }),
  makeInstrument({ sym: "PST", tvSym: "MIL:PST", name: "Poste Italiane S.p.A.", market: "italia", price: 12.14, pe: 9.2, ps: 0.42, pb: 1.18, roe: 13.0, div: 0.80, vol: "4.8M", mktcap: "15.8B", w52h: 13.20, w52l: 9.40, valScore: 76, fair: 13.80 }),
  makeInstrument({ sym: "RACE", tvSym: "MIL:RACE", name: "Ferrari N.V.", market: "italia", price: 382.40, pe: 51.2, ps: 11.2, pb: 14.5, roe: 28.4, div: 2.44, vol: "1.1M", mktcap: "72.4B", w52h: 412.00, w52l: 265.50, valScore: 35, fair: 320.00 }),
  makeInstrument({ sym: "REC", tvSym: "MIL:REC", name: "Recordati S.p.A.", market: "italia", price: 48.95, pe: 19.8, ps: 4.25, pb: 4.60, roe: 22.4, div: 1.15, vol: "820k", mktcap: "10.2B", w52h: 53.40, w52l: 41.50, valScore: 58, fair: 46.00 }),
  makeInstrument({ sym: "SPM", tvSym: "MIL:SPM", name: "Saipem S.p.A.", market: "italia", price: 2.18, pe: 15.2, ps: 0.22, pb: 1.05, roe: 6.8, div: 0.00, vol: "24.5M", mktcap: "4.3B", w52h: 2.54, w52l: 1.18, valScore: 65, fair: 2.75 }),
  makeInstrument({ sym: "SRG", tvSym: "MIL:SRG", name: "Snam S.p.A.", market: "italia", price: 4.35, pe: 13.4, ps: 1.48, pb: 1.82, roe: 13.5, div: 0.28, vol: "12.8M", mktcap: "14.6B", w52h: 5.12, w52l: 4.10, valScore: 69, fair: 4.80 }),
  makeInstrument({ sym: "STLAM", tvSym: "MIL:STLAM", name: "Stellantis N.V.", market: "italia", price: 19.84, pe: 3.8, ps: 0.25, pb: 0.45, roe: 14.2, div: 1.55, vol: "18.5M", mktcap: "62.4B", w52h: 27.35, w52l: 16.80, valScore: 82, fair: 26.50 }),
  makeInstrument({ sym: "STM", tvSym: "MIL:STM", name: "STMicroelectronics N.V.", market: "italia", price: 37.84, pe: 11.5, ps: 2.10, pb: 2.20, roe: 19.4, div: 0.24, vol: "4.5M", mktcap: "34.8B", w52h: 49.50, w52l: 33.10, valScore: 70, fair: 45.00 }),
  makeInstrument({ sym: "TEN", tvSym: "MIL:TEN", name: "Tenaris S.A.", market: "italia", price: 14.52, pe: 6.4, ps: 1.10, pb: 0.88, roe: 15.1, div: 0.52, vol: "3.9M", mktcap: "17.2B", w52h: 19.20, w52l: 12.80, valScore: 78, fair: 17.50 }),
  makeInstrument({ sym: "TRN", tvSym: "MIL:TRN", name: "Terna S.p.A.", market: "italia", price: 7.62, pe: 14.8, ps: 2.45, pb: 2.10, roe: 14.2, div: 0.35, vol: "8.2M", mktcap: "15.3B", w52h: 8.24, w52l: 6.94, valScore: 66, fair: 8.10 }),
  makeInstrument({ sym: "UCG", tvSym: "MIL:UCG", name: "UniCredit S.p.A.", market: "italia", price: 34.50, pe: 6.8, ps: 1.45, pb: 0.82, roe: 12.8, div: 1.80, vol: "15.2M", mktcap: "58.2B", w52h: 36.40, w52l: 18.25, valScore: 88, fair: 41.20 }),
  makeInstrument({ sym: "UNI", tvSym: "MIL:UNI", name: "Unipol S.p.A.", market: "italia", price: 9.15, pe: 8.2, ps: 0.45, pb: 0.95, roe: 11.5, div: 0.57, vol: "2.5M", mktcap: "6.5B", w52h: 10.42, w52l: 7.15, valScore: 75, fair: 9.80 }),

  // ==================== USA (S&P 500 ALPHABETICAL) ====================
  makeInstrument({ sym: "AAPL", tvSym: "NASDAQ:AAPL", name: "Apple Inc.", market: "usa", price: 189.34, pe: 28.4, ps: 7.20, pb: 42.10, roe: 156.0, div: 1.01, vol: "52.3M", mktcap: "2.94T", w52h: 199.62, w52l: 142.30, valScore: 42, fair: 175.00 }),
  makeInstrument({ sym: "ADBE", tvSym: "NASDAQ:ADBE", name: "Adobe Inc.", market: "usa", price: 485.20, pe: 32.1, ps: 10.50, pb: 11.20, roe: 35.0, div: 0.00, vol: "3.2M", mktcap: "218B", w52h: 638.12, w52l: 430.50, valScore: 54, fair: 520.00 }),
  makeInstrument({ sym: "AMD", tvSym: "NASDAQ:AMD", name: "Advanced Micro Devices Inc.", market: "usa", price: 168.42, pe: 52.4, ps: 10.40, pb: 4.85, roe: 9.2, div: 0.00, vol: "51.1M", mktcap: "272B", w52h: 227.30, w52l: 93.12, valScore: 40, fair: 155.00 }),
  makeInstrument({ sym: "AMZN", tvSym: "NASDAQ:AMZN", name: "Amazon.com Inc.", market: "usa", price: 178.15, pe: 58.1, ps: 3.20, pb: 9.10, roe: 19.5, div: 0.00, vol: "38.2M", mktcap: "1.85T", w52h: 189.77, w52l: 118.35, valScore: 52, fair: 188.00 }),
  makeInstrument({ sym: "AVGO", tvSym: "NASDAQ:AVGO", name: "Broadcom Inc.", market: "usa", price: 1320.00, pe: 48.5, ps: 14.20, pb: 24.10, roe: 52.0, div: 21.00, vol: "2.8M", mktcap: "614B", w52h: 1438.00, w52l: 780.50, valScore: 44, fair: 1220.00 }),
  makeInstrument({ sym: "BAC", tvSym: "NYSE:BAC", name: "Bank of America Corp.", market: "usa", price: 38.45, pe: 11.2, ps: 2.85, pb: 1.12, roe: 10.1, div: 0.96, vol: "41.5M", mktcap: "298B", w52h: 40.20, w52l: 25.10, valScore: 64, fair: 42.00 }),
  makeInstrument({ sym: "BRK.B", tvSym: "NYSE:BRK.B", name: "Berkshire Hathaway Inc.", market: "usa", price: 408.30, pe: 10.4, ps: 2.20, pb: 1.42, roe: 13.8, div: 0.00, vol: "4.1M", mktcap: "890B", w52h: 430.20, w52l: 330.12, valScore: 62, fair: 430.00 }),
  makeInstrument({ sym: "COST", tvSym: "NASDAQ:COST", name: "Costco Wholesale Corp.", market: "usa", price: 725.30, pe: 46.8, ps: 1.28, pb: 14.50, roe: 31.0, div: 4.60, vol: "2.1M", mktcap: "324B", w52h: 787.40, w52l: 472.10, valScore: 38, fair: 650.00 }),
  makeInstrument({ sym: "CRM", tvSym: "NYSE:CRM", name: "Salesforce Inc.", market: "usa", price: 268.40, pe: 29.8, ps: 7.15, pb: 4.54, roe: 15.2, div: 1.60, vol: "6.8M", mktcap: "258B", w52h: 318.50, w52l: 195.40, valScore: 59, fair: 285.00 }),
  makeInstrument({ sym: "CVX", tvSym: "NYSE:CVX", name: "Chevron Corp.", market: "usa", price: 154.20, pe: 12.8, ps: 1.35, pb: 1.70, roe: 13.2, div: 6.52, vol: "9.1M", mktcap: "288B", w52h: 172.50, w52l: 138.20, valScore: 68, fair: 172.00 }),
  makeInstrument({ sym: "DIS", tvSym: "NYSE:DIS", name: "The Walt Disney Co.", market: "usa", price: 104.20, pe: 22.1, ps: 2.12, pb: 1.95, roe: 8.8, div: 0.45, vol: "8.1M", mktcap: "190B", w52h: 123.50, w52l: 78.80, valScore: 62, fair: 120.00 }),
  makeInstrument({ sym: "GOOGL", tvSym: "NASDAQ:GOOGL", name: "Alphabet Inc.", market: "usa", price: 172.50, pe: 24.2, ps: 6.10, pb: 7.20, roe: 29.8, div: 0.80, vol: "28.5M", mktcap: "2.15T", w52h: 180.20, w52l: 115.40, valScore: 64, fair: 185.00 }),
  makeInstrument({ sym: "HD", tvSym: "NYSE:HD", name: "Home Depot Inc.", market: "usa", price: 345.80, pe: 22.4, ps: 2.15, pb: 18.50, roe: 120.0, div: 9.00, vol: "4.8M", mktcap: "344B", w52h: 396.40, w52l: 280.12, valScore: 52, fair: 360.00 }),
  makeInstrument({ sym: "JNJ", tvSym: "NYSE:JNJ", name: "Johnson & Johnson", market: "usa", price: 152.40, pe: 21.8, ps: 4.12, pb: 5.48, roe: 25.2, div: 4.96, vol: "7.8M", mktcap: "365B", w52h: 175.40, w52l: 142.80, valScore: 72, fair: 168.00 }),
  makeInstrument({ sym: "JPM", tvSym: "NYSE:JPM", name: "JPMorgan Chase & Co.", market: "usa", price: 195.40, pe: 11.8, ps: 3.10, pb: 1.65, roe: 14.5, div: 4.60, vol: "10.4M", mktcap: "560B", w52h: 205.80, w52l: 135.20, valScore: 60, fair: 185.00 }),
  makeInstrument({ sym: "KO", tvSym: "NYSE:KO", name: "The Coca-Cola Co.", market: "usa", price: 61.20, pe: 23.4, ps: 5.62, pb: 10.20, roe: 42.1, div: 1.94, vol: "12.5M", mktcap: "264B", w52h: 64.12, w52l: 51.55, valScore: 60, fair: 64.00 }),
  makeInstrument({ sym: "LLY", tvSym: "NYSE:LLY", name: "Eli Lilly & Co.", market: "usa", price: 755.40, pe: 85.2, ps: 18.40, pb: 38.20, roe: 45.0, div: 5.20, vol: "3.5M", mktcap: "715B", w52h: 800.40, w52l: 430.12, valScore: 30, fair: 680.00 }),
  makeInstrument({ sym: "MA", tvSym: "NYSE:MA", name: "Mastercard Inc.", market: "usa", price: 452.10, pe: 34.8, ps: 18.15, pb: 28.50, roe: 82.0, div: 2.64, vol: "3.2M", mktcap: "421B", w52h: 490.15, w52l: 360.50, valScore: 56, fair: 475.00 }),
  makeInstrument({ sym: "META", tvSym: "NASDAQ:META", name: "Meta Platforms Inc.", market: "usa", price: 475.20, pe: 28.5, ps: 9.20, pb: 7.80, roe: 28.2, div: 2.00, vol: "14.8M", mktcap: "1.21T", w52h: 531.40, w52l: 260.50, valScore: 55, fair: 450.00 }),
  makeInstrument({ sym: "MRK", tvSym: "NYSE:MRK", name: "Merck & Co. Inc.", market: "usa", price: 124.50, pe: 16.5, ps: 5.10, pb: 6.82, roe: 41.5, div: 3.08, vol: "8.5M", mktcap: "315B", w52h: 134.20, w52l: 98.40, valScore: 70, fair: 135.00 }),
  makeInstrument({ sym: "MSFT", tvSym: "NASDAQ:MSFT", name: "Microsoft Corp.", market: "usa", price: 421.90, pe: 36.4, ps: 13.50, pb: 12.80, roe: 38.5, div: 3.00, vol: "22.5M", mktcap: "3.13T", w52h: 430.80, w52l: 315.18, valScore: 48, fair: 410.00 }),
  makeInstrument({ sym: "NFLX", tvSym: "NASDAQ:NFLX", name: "Netflix Inc.", market: "usa", price: 612.50, pe: 38.5, ps: 7.82, pb: 12.40, roe: 32.2, div: 0.00, vol: "3.5M", mktcap: "264B", w52h: 639.00, w52l: 315.62, valScore: 46, fair: 580.00 }),
  makeInstrument({ sym: "NVDA", tvSym: "NASDAQ:NVDA", name: "Nvidia Corp.", market: "usa", price: 847.12, pe: 65.2, ps: 35.40, pb: 47.80, roe: 83.0, div: 0.03, vol: "41.1M", mktcap: "2.08T", w52h: 974.00, w52l: 385.50, valScore: 58, fair: 790.00 }),
  makeInstrument({ sym: "PEP", tvSym: "NASDAQ:PEP", name: "PepsiCo Inc.", market: "usa", price: 172.40, pe: 24.5, ps: 2.65, pb: 14.80, roe: 58.5, div: 5.06, vol: "5.1M", mktcap: "235B", w52h: 196.40, w52l: 155.03, valScore: 62, fair: 185.00 }),
  makeInstrument({ sym: "PG", tvSym: "NYSE:PG", name: "Procter & Gamble Co.", market: "usa", price: 162.80, pe: 26.5, ps: 4.85, pb: 7.15, roe: 27.1, div: 4.02, vol: "6.1M", mktcap: "385B", w52h: 168.50, w52l: 135.20, valScore: 54, fair: 170.00 }),
  makeInstrument({ sym: "TSLA", tvSym: "NASDAQ:TSLA", name: "Tesla Inc.", market: "usa", price: 248.50, pe: 72.1, ps: 8.10, pb: 13.20, roe: 18.0, div: 0.00, vol: "89.2M", mktcap: "792B", w52h: 299.29, w52l: 138.80, valScore: 28, fair: 220.00 }),
  makeInstrument({ sym: "UNH", tvSym: "NYSE:UNH", name: "UnitedHealth Group Inc.", market: "usa", price: 492.50, pe: 19.5, ps: 1.15, pb: 4.80, roe: 24.8, div: 8.40, vol: "3.8M", mktcap: "455B", w52h: 554.20, w52l: 440.10, valScore: 68, fair: 530.00 }),
  makeInstrument({ sym: "V", tvSym: "NYSE:V", name: "Visa Inc.", market: "usa", price: 274.20, pe: 31.2, ps: 15.42, pb: 14.80, roe: 48.0, div: 2.08, vol: "5.4M", mktcap: "558B", w52h: 290.80, w52l: 218.50, valScore: 58, fair: 290.00 }),
  makeInstrument({ sym: "WMT", tvSym: "NYSE:WMT", name: "Walmart Inc.", market: "usa", price: 60.15, pe: 26.1, ps: 0.74, pb: 5.12, roe: 19.8, div: 0.84, vol: "15.4M", mktcap: "481B", w52h: 61.24, w52l: 48.12, valScore: 52, fair: 64.00 }),
  makeInstrument({ sym: "XOM", tvSym: "NYSE:XOM", name: "Exxon Mobil Corp.", market: "usa", price: 115.82, pe: 12.4, ps: 1.15, pb: 1.85, roe: 15.4, div: 3.80, vol: "18.5M", mktcap: "462B", w52h: 122.10, w52l: 95.80, valScore: 66, fair: 125.00 }),

  // ==================== FOREX (ALPHABETICAL) ====================
  makeInstrument({ sym: "AUDJPY", tvSym: "FX:AUDJPY", name: "Dollaro Australiano / Yen Giapponese", market: "forex", price: 102.85, vol: "1.2B", w52h: 106.12, w52l: 93.40, valScore: 44, fair: 98.00 }),
  makeInstrument({ sym: "AUDUSD", tvSym: "FX:AUDUSD", name: "Dollaro Australiano / Dollaro US", market: "forex", price: 0.6654, vol: "2.1B", w52h: 0.6895, w52l: 0.6342, valScore: 55, fair: 0.68 }),
  makeInstrument({ sym: "EURCHF", tvSym: "FX:EURCHF", name: "Euro / Franco Svizzero", market: "forex", price: 0.9842, vol: "1.1B", w52h: 0.9985, w52l: 0.9250, valScore: 48, fair: 0.97 }),
  makeInstrument({ sym: "EURGBP", tvSym: "FX:EURGBP", name: "Euro / Sterlina", market: "forex", price: 0.8568, vol: "1.8B", w52h: 0.8760, w52l: 0.8492, valScore: 50, fair: 0.86 }),
  makeInstrument({ sym: "EURJPY", tvSym: "FX:EURJPY", name: "Euro / Yen Giapponese", market: "forex", price: 167.65, vol: "2.4B", w52h: 171.20, w52l: 154.10, valScore: 42, fair: 160.00 }),
  makeInstrument({ sym: "EURUSD", tvSym: "FX:EURUSD", name: "Euro / Dollaro US", market: "forex", price: 1.0842, vol: "4.2B", w52h: 1.1139, w52l: 1.0448, valScore: 52, fair: 1.09 }),
  makeInstrument({ sym: "GBPJPY", tvSym: "FX:GBPJPY", name: "Sterlina / Yen Giapponese", market: "forex", price: 195.82, vol: "2.1B", w52h: 200.40, w52l: 179.80, valScore: 38, fair: 185.00 }),
  makeInstrument({ sym: "GBPUSD", tvSym: "FX:GBPUSD", name: "Sterlina / Dollaro US", market: "forex", price: 1.2654, vol: "3.5B", w52h: 1.2894, w52l: 1.2035, valScore: 48, fair: 1.27 }),
  makeInstrument({ sym: "NZDUSD", tvSym: "FX:NZDUSD", name: "Dollaro Neozelandese / Dollaro US", market: "forex", price: 0.6124, vol: "1.1B", w52h: 0.6385, w52l: 0.5780, valScore: 52, fair: 0.62 }),
  makeInstrument({ sym: "USDCAD", tvSym: "FX:USDCAD", name: "Dollaro US / Dollaro Canadese", market: "forex", price: 1.3642, vol: "1.9B", w52h: 1.3892, w52l: 1.3180, valScore: 50, fair: 1.34 }),
  makeInstrument({ sym: "USDCHF", tvSym: "FX:USDCHF", name: "Dollaro US / Franco Svizzero", market: "forex", price: 0.9085, vol: "1.4B", w52h: 0.9240, w52l: 0.8405, valScore: 46, fair: 0.89 }),
  makeInstrument({ sym: "USDJPY", tvSym: "FX:USDJPY", name: "Dollaro US / Yen Giapponese", market: "forex", price: 154.67, vol: "5.1B", w52h: 161.94, w52l: 138.05, valScore: 40, fair: 145.00 }),

  // ==================== COMMODITIES (ALPHABETICAL) ====================
  makeInstrument({ sym: "BRENT", tvSym: "ICE:BRN1!", name: "Brent Crude Oil", market: "commodities", price: 82.34, vol: "1.2M", w52h: 95.34, w52l: 71.50, valScore: 70, fair: 88.00 }),
  makeInstrument({ sym: "COFFEE", tvSym: "NYBOT:KC1!", name: "Caffè Arabica Futures", market: "commodities", price: 224.50, vol: "42k", w52h: 245.00, w52l: 145.20, valScore: 55, fair: 210.00 }),
  makeInstrument({ sym: "COPPER", tvSym: "COMEX:HG1!", name: "Rame Spot", market: "commodities", price: 4.54, vol: "2.1M", w52h: 5.18, w52l: 3.55, valScore: 60, fair: 4.30 }),
  makeInstrument({ sym: "CORN", tvSym: "CBOT:ZC1!", name: "Mais Futures", market: "commodities", price: 452.00, vol: "85k", w52h: 582.00, w52l: 410.00, valScore: 74, fair: 480.00 }),
  makeInstrument({ sym: "GOLD", tvSym: "OANDA:XAUUSD", name: "Oro Spot (XAU/USD)", market: "commodities", price: 2315.40, vol: "35.8M", w52h: 2450.00, w52l: 1810.20, valScore: 65, fair: 2200.00 }),
  makeInstrument({ sym: "NATGAS", tvSym: "NYMEX:NG1!", name: "Gas Naturale (Henry Hub)", market: "commodities", price: 2.15, vol: "4.8M", w52h: 3.65, w52l: 1.48, valScore: 80, fair: 2.60 }),
  makeInstrument({ sym: "PLATINUM", tvSym: "NYMEX:PL1!", name: "Platino Spot", market: "commodities", price: 985.40, vol: "1.1M", w52h: 1105.00, w52l: 842.00, valScore: 68, fair: 1050.00 }),
  makeInstrument({ sym: "SILVER", tvSym: "COMEX:SI1!", name: "Argento Spot", market: "commodities", price: 29.40, vol: "12.5M", w52h: 32.50, w52l: 21.80, valScore: 58, fair: 28.00 }),
  makeInstrument({ sym: "SOYBEAN", tvSym: "CBOT:ZS1!", name: "Soia Futures", market: "commodities", price: 1180.00, vol: "94k", w52h: 1420.00, w52l: 1115.00, valScore: 76, fair: 1250.00 }),
  makeInstrument({ sym: "SUGAR", tvSym: "NYBOT:SB1!", name: "Zucchero Futures", market: "commodities", price: 18.95, vol: "115k", w52h: 27.20, w52l: 17.15, valScore: 68, fair: 21.00 }),
  makeInstrument({ sym: "WHEAT", tvSym: "CBOT:ZW1!", name: "Grano Futures", market: "commodities", price: 615.00, vol: "74k", w52h: 752.00, w52l: 540.00, valScore: 72, fair: 650.00 }),
  makeInstrument({ sym: "WTI", tvSym: "NYMEX:CL1!", name: "WTI Crude Oil", market: "commodities", price: 78.45, vol: "1.4M", w52h: 89.85, w52l: 67.20, valScore: 72, fair: 84.00 }),

  // ==================== CRYPTO (ALPHABETICAL) ====================
  makeInstrument({ sym: "ADAUSD", tvSym: "COINBASE:ADAUSD", name: "Cardano", market: "crypto", price: 0.3840, vol: "415M", mktcap: "13.2B", w52h: 0.8120, w52l: 0.2310, valScore: 55, fair: 0.45 }),
  makeInstrument({ sym: "AVAXUSD", tvSym: "COINBASE:AVAXUSD", name: "Avalanche", market: "crypto", price: 26.40, vol: "382M", mktcap: "9.8B", w52h: 65.40, w52l: 8.50, valScore: 62, fair: 35.00 }),
  makeInstrument({ sym: "BNBUSD", tvSym: "COINBASE:BNBUSD", name: "Binance Coin", market: "crypto", price: 585.40, vol: "2.1B", mktcap: "89.2B", w52h: 642.00, w52l: 202.00, valScore: 60, fair: 520.00 }),
  makeInstrument({ sym: "BTCUSD", tvSym: "COINBASE:BTCUSD", name: "Bitcoin / Dollaro US", market: "crypto", price: 67420.00, vol: "28.4B", mktcap: "1.32T", w52h: 73750.00, w52l: 25050.00, valScore: 61, fair: 62000.00 }),
  makeInstrument({ sym: "DOGEUSD", tvSym: "COINBASE:DOGEUSD", name: "Dogecoin", market: "crypto", price: 0.1245, vol: "1.8B", mktcap: "17.8B", w52h: 0.2280, w52l: 0.0550, valScore: 40, fair: 0.11 }),
  makeInstrument({ sym: "DOTUSD", tvSym: "COINBASE:DOTUSD", name: "Polkadot", market: "crypto", price: 5.85, vol: "215M", mktcap: "8.2B", w52h: 11.80, w52l: 3.42, valScore: 64, fair: 7.20 }),
  makeInstrument({ sym: "ETHUSD", tvSym: "COINBASE:ETHUSD", name: "Ethereum / Dollaro US", market: "crypto", price: 3480.15, vol: "14.2B", mktcap: "418B", w52h: 4090.00, w52l: 1540.00, valScore: 58, fair: 3200.00 }),
  makeInstrument({ sym: "LINKUSD", tvSym: "COINBASE:LINKUSD", name: "Chainlink", market: "crypto", price: 14.82, vol: "485M", mktcap: "8.5B", w52h: 22.80, w52l: 5.85, valScore: 70, fair: 18.00 }),
  makeInstrument({ sym: "LTCUSD", tvSym: "COINBASE:LTCUSD", name: "Litecoin", market: "crypto", price: 72.80, vol: "420M", mktcap: "5.4B", w52h: 112.50, w52l: 55.40, valScore: 66, fair: 85.00 }),
  makeInstrument({ sym: "MATICUSD", tvSym: "COINBASE:MATICUSD", name: "Polygon", market: "crypto", price: 0.58, vol: "280M", mktcap: "5.6B", w52h: 1.28, w52l: 0.48, valScore: 68, fair: 0.85 }),
  makeInstrument({ sym: "SOLUSD", tvSym: "COINBASE:SOLUSD", name: "Solana / Dollaro US", market: "crypto", price: 142.50, vol: "3.8B", mktcap: "64.2B", w52h: 210.00, w52l: 14.12, valScore: 65, fair: 130.00 }),
  makeInstrument({ sym: "XRPUSD", tvSym: "COINBASE:XRPUSD", name: "Ripple", market: "crypto", price: 0.4850, vol: "1.1B", mktcap: "26.4B", w52h: 0.7410, w52l: 0.4105, valScore: 55, fair: 0.55 }),

  // ==================== INDICI (ALPHABETICAL) ====================
  makeInstrument({ sym: "CAC40", tvSym: "INDEX:CAC40", name: "CAC 40", market: "indici", price: 7900.00, vol: "—", mktcap: "—", w52h: 8200.00, w52l: 6800.00, valScore: 50, fair: 8000 }),
  makeInstrument({ sym: "DAX", tvSym: "INDEX:DAX", name: "DAX Performance-Index", market: "indici", price: 18000.00, vol: "—", mktcap: "—", w52h: 18500.00, w52l: 14500.00, valScore: 55, fair: 18200 }),
  makeInstrument({ sym: "DOWJONES", tvSym: "INDEX:DJI", name: "Dow Jones Industrial Average", market: "indici", price: 39000.00, vol: "—", mktcap: "—", w52h: 40000.00, w52l: 32000.00, valScore: 58, fair: 39500 }),
  makeInstrument({ sym: "FTSEMIB", tvSym: "INDEX:FTSEMIB", name: "FTSE MIB", market: "indici", price: 34000.00, vol: "—", mktcap: "—", w52h: 35500.00, w52l: 27000.00, valScore: 60, fair: 34500 }),
  makeInstrument({ sym: "NASDAQ", tvSym: "INDEX:IXIC", name: "NASDAQ Composite", market: "indici", price: 16500.00, vol: "—", mktcap: "—", w52h: 16800.00, w52l: 12500.00, valScore: 65, fair: 17000 }),
  makeInstrument({ sym: "NIKKEI", tvSym: "INDEX:N225", name: "Nikkei 225", market: "indici", price: 38000.00, vol: "—", mktcap: "—", w52h: 41000.00, w52l: 30000.00, valScore: 50, fair: 39000 }),
  makeInstrument({ sym: "S&P500", tvSym: "INDEX:SPX", name: "S&P 500", market: "indici", price: 5200.00, vol: "—", mktcap: "—", w52h: 5300.00, w52l: 4100.00, valScore: 62, fair: 5350 }),
  makeInstrument({ sym: "VIX", tvSym: "INDEX:VIX", name: "CBOE Volatility Index", market: "indici", price: 13.50, vol: "—", mktcap: "—", w52h: 21.00, w52l: 11.50, valScore: 50, fair: 15.00 })
];

// Active notifications log
const notifications = [
  {
    type: "indicator" as const,
    id: "n_1",
    title: "Golden Cross rilevato",
    message: "La media mobile EMA 20 ha incrociato al rialzo la SMA 200 sul grafico di UniCredit (UCG) ad 1H.",
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }),
    severity: "success" as const
  },
  {
    type: "price" as const,
    id: "n_2",
    title: "BTCUSD Breakthrough",
    message: "Bitcoin ha superato la resistenza psicologica a $67k, con volumi in aumento del 18%.",
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }),
    severity: "info" as const
  },
  {
    type: "ai_alert" as const,
    id: "n_3",
    title: "Consulenza AI: Ferrari",
    message: "Modello Ray Dalio: RACE sovrappesato dell'8% rispetto all'allocazione strategica, valutare alleggerimento.",
    timestamp: new Date(Date.now() - 40 * 60 * 1000).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }),
    severity: "warning" as const
  }
];

const symbolMap: Record<string, string> = {
  // Italia
  "A2A": "A2A.MI", "AMP": "AMP.MI", "AZM": "AZM.MI", "BAMI": "BAMI.MI", "BGN": "BGN.MI",
  "BMED": "BMED.MI", "BPE": "BPE.MI", "BRN": "BC.MI", "DIA": "DIA.MI", "ENEL": "ENEL.MI",
  "ENI": "ENI.MI", "ERG": "ERG.MI", "FBK": "FBK.MI", "G": "G.MI", "HER": "HER.MI",
  "INW": "INW.MI", "ISP": "ISP.MI", "LDO": "LDO.MI", "MB": "MB.MI", "MONC": "MONC.MI",
  "NEXI": "NEXI.MI", "PIRE": "PIRC.MI", "PRY": "PRY.MI", "PST": "PST.MI", "RACE": "RACE.MI",
  "REC": "REC.MI", "SPM": "SPM.MI", "SRG": "SRG.MI", "STLAM": "STLAM.MI", "STM": "STM.MI",
  "TEN": "TEN.MI", "TRN": "TRN.MI", "UCG": "UCG.MI", "UNI": "UNI.MI",

  // USA
  "AAPL": "AAPL", "ADBE": "ADBE", "AMD": "AMD", "AMZN": "AMZN", "AVGO": "AVGO",
  "BAC": "BAC", "BRK.B": "BRK-B", "COST": "COST", "CRM": "CRM", "CVX": "CVX",
  "DIS": "DIS", "GOOGL": "GOOGL", "HD": "HD", "JNJ": "JNJ", "JPM": "JPM", "KO": "KO",
  "LLY": "LLY", "MA": "MA", "META": "META", "MRK": "MRK", "MSFT": "MSFT", "NFLX": "NFLX",
  "NVDA": "NVDA", "PEP": "PEP", "PG": "PG", "TSLA": "TSLA", "UNH": "UNH", "V": "V",
  "WMT": "WMT", "XOM": "XOM",

  // Forex
  "AUDJPY": "AUDJPY=X", "AUDUSD": "AUDUSD=X", "EURCHF": "EURCHF=X", "EURGBP": "EURGBP=X",
  "EURJPY": "EURJPY=X", "EURUSD": "EURUSD=X", "GBPJPY": "GBPJPY=X", "GBPUSD": "GBPUSD=X",
  "NZDUSD": "NZDUSD=X", "USDCAD": "USDCAD=X", "USDCHF": "USDCHF=X", "USDJPY": "USDJPY=X",

  // Commodities
  "BRENT": "BZ=F", "COFFEE": "KC=F", "COPPER": "HG=F", "CORN": "ZC=F", "GOLD": "GC=F",
  "NATGAS": "NG=F", "PLATINUM": "PL=F", "SILVER": "SI=F", "SOYBEAN": "ZS=F", "SUGAR": "SB=F",
  "WHEAT": "ZW=F", "WTI": "CL=F",

  // Crypto
  "ADAUSD": "ADA-USD", "AVAXUSD": "AVAX-USD", "BNBUSD": "BNB-USD", "BTCUSD": "BTC-USD",
  "DOGEUSD": "DOGE-USD", "DOTUSD": "DOT-USD", "ETHUSD": "ETH-USD", "LINKUSD": "LINK-USD",
  "LTCUSD": "LTC-USD", "MATICUSD": "MATIC-USD", "SOLUSD": "SOL-USD", "XRPUSD": "XRP-USD",

  // Indici
  "S&P500": "^GSPC", "NASDAQ": "^IXIC", "DOWJONES": "^DJI", "FTSEMIB": "FTSEMIB.MI",
  "DAX": "^GDAXI", "CAC40": "^FCHI", "NIKKEI": "^N225", "VIX": "^VIX"
};

const updateMarketData = async () => {
  try {
    const symbolsToFetch = instruments.map(inst => symbolMap[inst.sym] || inst.sym);
    
    // Chunk array into pieces of 50 to respect API limits
    const chunkSize = 50;
    const chunks = [];
    for (let i = 0; i < symbolsToFetch.length; i += chunkSize) {
      chunks.push(symbolsToFetch.slice(i, i + chunkSize));
    }

    const quotes = [];
    for (const chunk of chunks) {
      const results = await yahooFinance.quote(chunk);
      quotes.push(...results);
    }

    // Now update instruments array with REAL data
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
        if (quote.regularMarketDayVolume) {
          if (quote.regularMarketDayVolume >= 1e6) inst.vol = (quote.regularMarketDayVolume / 1e6).toFixed(1) + "M";
          else inst.vol = (quote.regularMarketDayVolume / 1e3).toFixed(1) + "k";
        }
        if (quote.fiftyTwoWeekHigh) inst.w52h = quote.fiftyTwoWeekHigh;
        if (quote.fiftyTwoWeekLow) inst.w52l = quote.fiftyTwoWeekLow;
        if (quote.targetMeanPrice) inst.fair = quote.targetMeanPrice;
      }
    });
  } catch (err) {
    console.error("Errore durante l'aggiornamento da Yahoo Finance:", err);
  }
};

const fetchRealNews = async () => {
  try {
    const res = await yahooFinance.search("market news", { newsCount: 3 });
    if (res.news && res.news.length > 0) {
      const newNotifs = res.news.map(n => ({
        type: "price",
        id: "news_" + n.uuid,
        title: "News Globale",
        message: n.title,
        timestamp: new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }),
        severity: "info"
      }));
      // Filter out existing by id
      for (const nn of newNotifs) {
        if (!notifications.find(existing => existing.id === nn.id)) {
          notifications.unshift(nn as any);
        }
      }
      if (notifications.length > 50) notifications.length = 50;
    }
  } catch (err) {
    console.error("Errore recupero news:", err);
  }
};

// Start real update loops
setInterval(updateMarketData, 10000); // 10s for prices
setInterval(fetchRealNews, 60000); // 1m for news
updateMarketData();
fetchRealNews();

// API Endpoints
app.get("/api/market-data", (req, res) => {
  res.json({ instruments });
});

app.post("/api/market-data/add", (req, res) => {
  const { sym, tvSym, name, market } = req.body;
  if (!sym || !market) {
    return res.status(400).json({ error: "Parametri mancanti." });
  }
  const targetMarket = market.toLowerCase();
  const basePrice = targetMarket === 'crypto' ? 2500 : targetMarket === 'forex' ? 1.05 : targetMarket === 'commodities' ? 100 : targetMarket === 'indici' ? 10000 : 75;
  const isDup = instruments.find(i => i.sym.toUpperCase() === sym.toUpperCase());
  if (isDup) {
    return res.json({ instruments, message: "Strumento già presente." });
  }

  instruments.push({
    sym: sym.toUpperCase(),
    tvSym: tvSym || sym,
    name: name || sym,
    market: targetMarket,
    price: basePrice,
    chg: 0,
    chgPct: 0,
    pe: 15,
    ps: 1.2,
    pb: 1.5,
    roe: 12,
    vol: "1.0M",
    mktcap: "2.5B",
    mktcapN: 2500000000,
    w52h: basePrice * 1.2,
    w52l: basePrice * 0.8,
    div: 2,
    analyst: { buy: 5, hold: 2, sell: 1 },
    valScore: 50,
    fair: basePrice,
    sent: { bull: 50, bear: 30, neut: 20 },
    fgi: 50,
    targets: [],
    seas: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    recentMonths: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  } as any);
  res.json({ instruments, success: true });
});

interface ServerNewsCache {
  timestamp: number;
  newsItems: any[];
  calendarEvents: any[];
  aiReportText: string;
}
let serverNewsCache: ServerNewsCache | null = null;
const SERVER_CACHE_DURATION = 15 * 60 * 1000;

app.get("/api/news", async (req, res) => {
  const forceRefresh = req.query.refresh === "true";

  if (!forceRefresh && serverNewsCache && (Date.now() - serverNewsCache.timestamp < SERVER_CACHE_DURATION)) {
    return res.json({
      newsItems: serverNewsCache.newsItems,
      calendarEvents: serverNewsCache.calendarEvents,
      aiReportText: serverNewsCache.aiReportText,
      cached: true
    });
  }

  try {
    let rawNews: any[] = [];
    try {
      const searchRes = await yahooFinance.search("global economy financial markets news", { newsCount: 10 });
      if (searchRes.news && searchRes.news.length > 0) {
        rawNews = searchRes.news.map((item, idx) => ({
          id: item.uuid || `news_${idx}`,
          title: item.title,
          publisher: item.publisher || "Yahoo Finance",
          link: item.link,
          timeEpoch: item.providerPublishTime ? new Date(item.providerPublishTime).getTime() : Date.now()
        }));
      }
    } catch (err) {
      console.error("Error fetching news from Yahoo Finance:", err);
    }

    let rawCalendar: any[] = [];
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const calendarRes = await fetch("https://nfs.faireconomy.media/ff_calendar_thisweek.json", {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (calendarRes.ok) {
        const data: any = await calendarRes.json();
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const endOfTomorrow = startOfDay + 2 * 24 * 60 * 60 * 1000;

        rawCalendar = data.filter((item: any) => {
          const itemTime = new Date(item.date).getTime();
          return itemTime >= startOfDay - (12 * 60 * 60 * 1000) && itemTime <= endOfTomorrow;
        }).slice(0, 12);
      }
    } catch (err) {
      console.error("Error fetching economic calendar:", err);
    }

    let newsItems: any[] = [];
    let calendarEvents: any[] = [];
    let aiReportText = "";

    if (ai && (rawNews.length > 0 || rawCalendar.length > 0)) {
      try {
        const prompt = `Sei un esperto di finanza e mercati globali. Traduci, arricchisci e formatta le notizie economiche e il calendario economico in italiano strutturato.

DATA DI RIFERIMENTO CORRENTE: ${new Date().toISOString()}

NOTIZIE IN INGRESSO (inglese):
${JSON.stringify(rawNews)}

CALENDARIO IN INGRESSO (inglese):
${JSON.stringify(rawCalendar)}

Devi rispondere ESCLUSIVAMENTE con un oggetto JSON valido che rispetta esattamente questa struttura:
{
  "newsItems": [
    {
      "id": "string (usa lo stesso id fornito)",
      "time": "string (calcola approssimativamente quanto tempo fa, es. '10 min fa', '2 ore fa' rispetto ad ora)",
      "category": "MONETARY | MACRO | EQUITIES | GEOPOLITICS",
      "source": "string (publisher)",
      "title": "string (tradotto e ottimizzato in italiano in modo attraente e formale)",
      "summary": "string (riassunto dettagliato in italiano di 2 frasi)",
      "sentiment": "RIALZISTA | NEUTRALE | RIBASSISTA",
      "impact": "ALTO | MEDIO | BASSO",
      "aiSummary": "string (analisi macro-economica in italiano del dato/notizia)",
      "tradingImplication": "string (implicazione operativa sui mercati, es. Borsa Italiana, BTP decennale, Euro/Dollaro)",
      "fullArticle": "string (articolo dettagliato in italiano di 2 paragrafi basato sul titolo e riassunto)"
    }
  ],
  "calendarEvents": [
    {
      "id": "string (genera un id univoco)",
      "time": "string (es. '14:30' o '10:00' convertito all'ora italiana locale)",
      "country": "IT | UE | US | UK | CA | JP | AU (mappa la valuta country, es. USD->US, EUR->UE, GBP->UK, JPY->JP, CAD->CA, AUD->AU, NZD->NZ)",
      "indicator": "string (tradotto in italiano, es. 'Indice dei Prezzi al Consumo')",
      "period": "string (periodo stimato, es. 'Giu' o 'Maggio' o 'Settimanale')",
      "actual": "string (valore effettivo o '—')",
      "forecast": "string (valore previsto o '—')",
      "previous": "string (valore precedente o '—')",
      "impact": "HIGH | MEDIUM | LOW",
      "status": "RILASCIATO | ATTESA (RILASCIATO se actual è presente e non vuoto, altrimenti ATTESA)",
      "aiInterpretation": "string (spiegazione dettagliata dell'impatto del rilascio macro e reazione della banca centrale)"
    }
  ],
  "aiReportText": "string (un report generale macroeconomico giornaliero in italiano di circa 3-4 paragrafi formattato in elegante Markdown che riassume l'impatto complessivo delle notizie e degli eventi di calendario di oggi, delineando scenari operativi e conclusioni)"
}

Assicurati che:
- Tutti i testi siano scritti in un italiano finanziario impeccabile ed estremamente professionale.
- Rispondi solo con il JSON puro, senza tag markdown come \`\`\`json o altro testo di contorno.`;

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
        });

        const cleanedText = response.text ? response.text.replace(/```json/g, "").replace(/```/g, "").trim() : "{}";
        const parsed = JSON.parse(cleanedText);
        
        newsItems = parsed.newsItems || [];
        calendarEvents = parsed.calendarEvents || [];
        aiReportText = parsed.aiReportText || "";
      } catch (err) {
        console.error("Gemini news processing error:", err);
      }
    }

    if (newsItems.length === 0 && rawNews.length > 0) {
      newsItems = rawNews.map((n, idx) => {
        const timeDiff = Date.now() - n.timeEpoch;
        const minutes = Math.floor(timeDiff / 60000);
        let timeStr = `${minutes} min fa`;
        if (minutes >= 60) {
          const hours = Math.floor(minutes / 60);
          timeStr = `${hours} ${hours === 1 ? "ora" : "ore"} fa`;
        }
        return {
          id: n.id,
          time: timeStr,
          category: idx % 4 === 0 ? "MONETARY" : idx % 4 === 1 ? "MACRO" : idx % 4 === 2 ? "EQUITIES" : "GEOPOLITICS",
          source: n.publisher,
          title: n.title,
          summary: `Notizia di mercato rilevata da ${n.publisher}.`,
          sentiment: idx % 3 === 0 ? "RIALZISTA" : idx % 3 === 1 ? "NEUTRALE" : "RIBASSISTA",
          impact: idx % 3 === 0 ? "ALTO" : "MEDIO",
          aiSummary: `Aggiornamento in tempo reale del mercato: ${n.title}`,
          tradingImplication: "Monitorare la volatilità sui titoli correlati.",
          fullArticle: `${n.title}\n\nNotizia originale da ${n.publisher}. Maggiori dettagli su Yahoo Finance.`
        };
      });
    }

    if (calendarEvents.length === 0 && rawCalendar.length > 0) {
      calendarEvents = rawCalendar.map((c, idx) => {
        const curDate = new Date(c.date);
        const timeStr = curDate.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
        const currencyMap: Record<string, string> = {
          "USD": "US", "EUR": "UE", "GBP": "UK", "JPY": "JP", "CAD": "CA", "AUD": "AU", "NZD": "NZ", "CHF": "CH"
        };
        return {
          id: `evt_${idx}_${curDate.getTime()}`,
          time: timeStr,
          country: currencyMap[c.country] || c.country,
          indicator: c.title,
          period: "Mese",
          actual: c.actual || "—",
          forecast: c.forecast || "—",
          previous: c.previous || "—",
          impact: c.impact === "High" ? "HIGH" : c.impact === "Medium" ? "MEDIUM" : "LOW",
          status: c.actual ? "RILASCIATO" : "ATTESA",
          aiInterpretation: `Rilascio dell'indicatore ${c.title} per la valuta ${c.country}.`
        };
      });
    }

    if (!aiReportText) {
      aiReportText = `### 🧠 QUADRO DI SINTESI MACROECONOMICO REALE
**Data di sincronizzazione**: ${new Date().toLocaleDateString("it-IT")} | **Aggiornamento**: In tempo reale

#### 1. SINTESI DEI MERCATI
Le ultime notizie indicano attività nei mercati globali con contributi da editori quali ${[...new Set(newsItems.map(n => n.source))].join(', ')}.

#### 2. FOCUS EVENTI MACRO
Sono attesi o stati rilasciati dati importanti per ${[...new Set(calendarEvents.map(c => c.country))].join(', ')}. Monitorare la volatilità nelle fasce orarie indicate nel calendario economico.`;
    }

    if (newsItems.length > 0 || calendarEvents.length > 0) {
      serverNewsCache = {
        timestamp: Date.now(),
        newsItems,
        calendarEvents,
        aiReportText
      };
    }

    res.json({ newsItems, calendarEvents, aiReportText, cached: false });
  } catch (error) {
    console.error("Error in /api/news:", error);
    res.status(500).json({ error: "Errore durante il recupero delle notizie e del calendario economico." });
  }
});

app.get("/api/notifications", (req, res) => {
  res.json({ notifications });
});

app.get("/api/chart-data", async (req, res) => {
  const { sym, tf } = req.query;
  if (!sym || typeof sym !== 'string') return res.status(400).json({ error: "Simbolo mancante" });

  const yfSym = symbolMap[sym] || sym;
  
  // Map timeframe to yahoo finance interval and period
  // tf: 5m, 15m, 1h, 4h, 1D, 1W, 1M
  let interval: '1m'|'2m'|'5m'|'15m'|'30m'|'60m'|'90m'|'1h'|'1d'|'5d'|'1wk'|'1mo'|'3mo' = '1d';
  let range = '1y'; // default data range

  const t = (tf as string).toLowerCase();
  if (t === '1m' || t === '5m') { interval = '5m'; range = '5d'; }
  else if (t === '15m' || t === '30m') { interval = '15m'; range = '1mo'; }
  else if (t === '1h') { interval = '60m'; range = '1mo'; }
  else if (t === '4h') { interval = '60m'; range = '3mo'; }
  else if (t === '1d') { interval = '1d'; range = '1y'; }
  else if (t === '1w' || t === 'sett.') { interval = '1wk'; range = '5y'; }
  else if (t === '1mo' || t === 'mens.') { interval = '1mo'; range = '10y'; }

  try {
    const queryOptions = { period1: range, interval };
    const result = await yahooFinance.chart(yfSym, queryOptions);
    
    if (result && result.quotes && result.quotes.length > 0) {
      // Format for lightweight-charts
      const data = result.quotes.map(q => ({
        time: Math.floor(new Date(q.date).getTime() / 1000),
        open: q.open || q.close,
        high: q.high || q.close,
        low: q.low || q.close,
        close: q.close,
        volume: q.volume || 0
      })).filter(q => q.close !== null && q.close !== undefined && !isNaN(q.close));

      res.json({ data });
    } else {
      res.json({ data: [] });
    }
  } catch (err) {
    console.error("Chart data error:", err);
    res.status(500).json({ error: "Errore recupero dati chart" });
  }
});

// AI endpoints using official @google/genai syntax
app.post("/api/ai-technical", async (req, res) => {
  const { sym, name, market, price, chgPct, timeframe, indicators, analysisType } = req.body;
  const type = analysisType || 'strategy';
  
  if (!ai) {
    let mockAnalysis = "";
    if (type === 'strategy') {
      mockAnalysis = `### 🛰️ Modalità Simulazione AI attiva (Consigli Operativi)
*(Configura GEMINI_API_KEY nei Secrets per attivare i modelli Gemini live)*

**Strategia di Trading per ${sym} (${name}) su grafico ${timeframe}:**
- **Direzione Consigliata:** **BUY/ACCUMULATE** 🟢
- **Ingresso Consigliato (Entry Area):** **€${(price * 0.992).toFixed(2)} - €${(price * 0.998).toFixed(2)}** (accumulare su rintracciamenti di breve).
- **Target Price (Take Profit):** **€${(price * 1.055).toFixed(2)}** (livello resistenziale su massimi settimanali).
- **Stop Loss Protettivo:** **€${(price * 0.965).toFixed(2)}** (posizionato sotto il minimo d'oscillazione precedente).
- **Rapporto Rischio/Rendimento:** 1:2.4`;
    } else if (type === 'levels') {
      mockAnalysis = `### 🛰️ Modalità Simulazione AI attiva (Supporti e Resistenze)
*(Configura GEMINI_API_KEY nei Secrets per attivare i modelli Gemini live)*

**Mappa Chiave di Prezzo per ${sym} (${name}):**
- **Resistenza 2 (R2 - Target Estremo):** **€${(price * 1.072).toFixed(2)}**
- **Resistenza 1 (R1 - Breakout):** **€${(price * 1.035).toFixed(2)}**
- **Pivot Point (Livello di Equilibrio):** **€${price.toFixed(2)}**
- **Supporto 1 (S1 - Rimbalzo potenziale):** **€${(price * 0.978).toFixed(2)}**
- **Supporto 2 (S2 - Ultimo baluardo):** **€${(price * 0.952).toFixed(2)}**
- **Nota Operativa:** L'indicatore a base ${timeframe} evidenzia che il superamento in volumi di R1 darebbe slancio verso R2. S1 rappresenta un'ottima zona per rimbalzi tecnici.`;
    } else {
      mockAnalysis = `### 🛰️ Modalità Simulazione AI attiva (Trend e Candlestick)
*(Configura GEMINI_API_KEY nei Secrets per attivare i modelli Gemini live)*

**Analisi Strutturale del Trend per ${sym} (${name}):**
- **Fase Primaria:** Rialzista di medio periodo con moderata crescita della volatilità (confermata dalle bande esterne).
- **Candlestick Pattern:** Rilevato un potenziale pattern di continuazione bullish (Marubozu/Bullish Engulfing parziale) sul timeframe a ${timeframe}.
- **Forza del Momentum:** RSI in area di forza relativa ma non ancora in ipercomprato. Gli indicatori attivi (${indicators && indicators.length ? indicators.join(', ') : 'RSI'}) suggeriscono persistenza del flusso in acquisto.
- **Rischio Reversione:** Basso (< 25%).`;
    }

    return res.json({ analysis: mockAnalysis });
  }

  try {
    let focusPrompt = "";
    if (type === 'strategy') {
      focusPrompt = `FOCALIZZATI PRINCIPAMENTE SU: Consigli pratici e operativi di strategia di trading (BUY, SELL, HOLD), determinando la direzione predominante, l'area ottimale di Ingresso (Entry Area), i target di Uscita (Take Profit) e il livello di stop di protezione (Stop Loss) con relativo rapporto Rischio/Rendimento.`;
    } else if (type === 'levels') {
      focusPrompt = `FOCALIZZATI PRINCIPAMENTE SU: Livelli chiave di prezzo, individuando chiaramente Supporti (S1, S2, S3), Resistenze (R1, R2, R3) e il Pivot Point corrente. Spiega l'importanza di questi livelli per l'accumulo o la distribuzione dei contratti.`;
    } else {
      focusPrompt = `FOCALIZZATI PRINCIPAMENTE SU: Struttura del Trend (Bullish, Bearish, Congestione), pattern candlestick rilevanti dell'ultima sessione sul grafico, analisi del momentum e convergenze/divergenze degli indicatori attivi.`;
    }

    const prompt = `Sei un consulente finanziario professionista ed esperto di analisi tecnica.
Analizza questo asset:
- Simbolo: ${sym}
- Nome: ${name}
- Mercato: ${market}
- Prezzo corrente: ${price}
- Variazione giornaliera: ${chgPct.toFixed(2)}%
- Timeframe di studio: ${timeframe}
- Indicatori attivi sul grafico: ${indicators && indicators.length ? indicators.join(', ') : 'Nessuno'}

${focusPrompt}

Fornisci un'analisi tecnica dettagliata scritta in ITALIANO.
Utilizza un formato Markdown elegante, scannabile ed estremamente professionale. Sii oggettivo, lucido e preciso.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({ analysis: response.text });
  } catch (error: any) {
    console.error("AI Technical error:", error);
    res.status(500).json({ error: "Errore durante la generazione dell'analisi AI." });
  }
});

app.post("/api/ai-fundamental", async (req, res) => {
  const { sym, name, price, pe, ps, pb, roe, div, valScore, modelType } = req.body;
  if (!ai) {
    return res.json({
      analysis: `### 📡 Modalità Simulazione AI attiva\n*(Configura GEMINI_API_KEY nei Secrets per sbloccare i modelli professionali)*\n\n**Modello Selezionato:** **${modelType === 'buffett' ? 'Warren Buffett (Moat / Growth)' : modelType === 'dalio' ? 'Ray Dalio (All-Weather Asset Allocation)' : 'InvestingPro Pro-Valuation'}** per **${sym} (${name})**.\n\n- **Stabilità Finanziaria:** L'asset è robusto. Rapporto P/E pari a ${pe} e un ROE del ${roe !== '—' ? roe : 'N/D'}%.\n- **Valutazione del Modello:** Il punteggio di valore (${valScore}/100) suggerisce condizioni ottimali di accumulo nei portafogli strategici di lungo termine.\n- **Conclusione:** Strategia consigliata in linea con i dettami tradizionali del Value Investing.`
    });
  }

  try {
    let frameworkPrompt = "";
    if (modelType === "buffett") {
      frameworkPrompt = "Analizza l'asset secondo il modello di Warren Buffett: forza del Moat (vantaggio competitivo), redditività del capitale (ROE), stabilità dei margini operativi, e prezzo d'acquisto rispetto alla sua intrinseca 'Fair Value'.";
    } else if (modelType === "dalio") {
      frameworkPrompt = "Analizza l'asset secondo la filosofia di Ray Dalio (All-Weather Portfolio): collocazione del titolo nei cicli economici e di inflazione, correlazioni macroeconomiche storiche, stabilità durante i drawdown e idoneità all'allocazione diversificata.";
    } else {
      frameworkPrompt = "Analizza l'asset secondo i criteri avanzati di InvestingPro: salute finanziaria complessiva, rating dei flussi di cassa liberi (FCF Yield), multipli di valutazione settoriale comparata, e catalizzatori di crescita previsti.";
    }

    const prompt = `Sei un gestore di portafogli e analista finanziario di altissimo livello.
Analizza questo strumento finanziario:
- Simbolo: ${sym}
- Nome: ${name}
- Prezzo: ${price}
- P/E Ratio: ${pe}
- P/S Ratio: ${ps}
- P/B Ratio: ${pb}
- Return on Equity (ROE): ${roe}
- Rendimento dividendi: ${div}
- Punteggio complessivo di valore: ${valScore}/100

Applica espressamente questo framework per la tua analisi:
"${frameworkPrompt}"

Scrivi un'analisi dettagliata in ITALIANO. Strutturala in paragrafi ordinati, evidenziando pro e contro, tesi d'investimento e rischio atteso. Massima obiettività finanziaria.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({ analysis: response.text });
  } catch (error: any) {
    console.error("AI Fundamental error:", error);
    res.status(500).json({ error: "Errore durante la generazione dell'analisi AI." });
  }
});


// Handle Vite middlewares or static files serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
