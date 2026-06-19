import { Handler } from "@netlify/functions";
import YahooFinance from "yahoo-finance2";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const yahooFinance = new YahooFinance();
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

// Simple in-memory cache for news and calendar events
interface NewsCache {
  timestamp: number;
  newsItems: any[];
  calendarEvents: any[];
  aiReportText: string;
}

let cache: NewsCache | null = null;
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes cache

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      },
      body: "",
    };
  }

  const forceRefresh = event.queryStringParameters?.refresh === "true";

  // Check cache
  if (!forceRefresh && cache && (Date.now() - cache.timestamp < CACHE_DURATION)) {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        newsItems: cache.newsItems,
        calendarEvents: cache.calendarEvents,
        aiReportText: cache.aiReportText,
        cached: true,
        cachedAt: new Date(cache.timestamp).toLocaleTimeString()
      })
    };
  }

  try {
    // 1. Fetch news from Yahoo Finance
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

    // 2. Fetch economic calendar
    let rawCalendar: any[] = [];
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch("https://nfs.faireconomy.media/ff_calendar_thisweek.json", {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data: any = await res.json();
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

    // 3. Process with Gemini
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

    // 4. Fallbacks if Gemini fails or is not configured
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
          summary: `Notizia di mercato rilevata da ${n.publisher}. Consulta il link originale per i dettagli.`,
          sentiment: idx % 3 === 0 ? "RIALZISTA" : idx % 3 === 1 ? "NEUTRALE" : "RIBASSISTA",
          impact: idx % 3 === 0 ? "ALTO" : "MEDIO",
          aiSummary: `Aggiornamento in tempo reale del mercato: ${n.title}`,
          tradingImplication: "Monitorare la volatilità sui titoli correlati.",
          fullArticle: `${n.title}\n\nNotizia in lingua originale pubblicata da ${n.publisher}. Maggiori dettagli disponibili su Yahoo Finance.`
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

    // Cache the successful results
    if (newsItems.length > 0 || calendarEvents.length > 0) {
      cache = {
        timestamp: Date.now(),
        newsItems,
        calendarEvents,
        aiReportText
      };
    }

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        newsItems,
        calendarEvents,
        aiReportText,
        cached: false
      })
    };
  } catch (error: any) {
    console.error("General error in news Netlify function:", error);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ error: "Errore durante il recupero delle notizie e del calendario economico." })
    };
  }
};
