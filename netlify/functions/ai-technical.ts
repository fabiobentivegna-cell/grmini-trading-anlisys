import { Handler } from "@netlify/functions";
import { GoogleGenAI } from "@google/genai";

const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: { "Access-Control-Allow-Origin": "*" } };
  }

  if (event.httpMethod !== "POST" || !event.body) {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid request" }) };
  }

  const { sym, name, market, price, chgPct, timeframe, indicators, analysisType } = JSON.parse(event.body);
  const type = analysisType || 'strategy';

  if (!ai) {
    let mockAnalysis = "";
    if (type === 'strategy') {
      mockAnalysis = `### 🛰️ Modalità Simulazione AI attiva (Consigli Operativi)
*(Configura GEMINI_API_KEY nei Secrets di Netlify per attivare i modelli Gemini live)*

**Strategia di Trading per ${sym} (${name}) su grafico ${timeframe}:**
- **Direzione Consigliata:** **BUY/ACCUMULATE** 🟢
- **Ingresso Consigliato (Entry Area):** **€${(price * 0.992).toFixed(2)} - €${(price * 0.998).toFixed(2)}** (accumulare su rintracciamenti di breve).
- **Target Price (Take Profit):** **€${(price * 1.055).toFixed(2)}** (livello resistenziale su massimi settimanali).
- **Stop Loss Protettivo:** **€${(price * 0.965).toFixed(2)}** (posizionato sotto il minimo d'oscillazione precedente).
- **Rapporto Rischio/Rendimento:** 1:2.4`;
    } else if (type === 'levels') {
      mockAnalysis = `### 🛰️ Modalità Simulazione AI attiva (Supporti e Resistenze)
*(Configura GEMINI_API_KEY nei Secrets di Netlify per attivare i modelli Gemini live)*

**Mappa Chiave di Prezzo per ${sym} (${name}):**
- **Resistenza 2 (R2 - Target Estremo):** **€${(price * 1.072).toFixed(2)}**
- **Resistenza 1 (R1 - Breakout):** **€${(price * 1.035).toFixed(2)}**
- **Pivot Point (Livello di Equilibrio):** **€${price.toFixed(2)}**
- **Supporto 1 (S1 - Rimbalzo potenziale):** **€${(price * 0.978).toFixed(2)}**
- **Supporto 2 (S2 - Ultimo baluardo):** **€${(price * 0.952).toFixed(2)}**
- **Nota Operativa:** L'indicatore a base ${timeframe} evidenzia che il superamento in volumi di R1 darebbe slancio verso R2. S1 rappresenta un'ottima zona per rimbalzi tecnici.`;
    } else {
      mockAnalysis = `### 🛰️ Modalità Simulazione AI attiva (Trend e Candlestick)
*(Configura GEMINI_API_KEY nei Secrets di Netlify per attivare i modelli Gemini live)*

**Analisi Strutturale del Trend per ${sym} (${name}):**
- **Fase Primaria:** Rialzista di medio periodo con moderata crescita della volatilità (confermata dalle bande esterne).
- **Candlestick Pattern:** Rilevato un potenziale pattern di continuazione bullish (Marubozu/Bullish Engulfing parziale) sul timeframe a ${timeframe}.
- **Forza del Momentum:** RSI in area di forza relativa ma non ancora in ipercomprato. Gli indicatori attivi (${indicators && indicators.length ? indicators.join(', ') : 'RSI'}) suggeriscono persistenza del flusso in acquisto.
- **Rischio Reversione:** Basso (< 25%).`;
    }

    return { statusCode: 200, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ analysis: mockAnalysis }) };
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

    return { statusCode: 200, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ analysis: response.text }) };
  } catch (error: any) {
    console.error("AI Technical error:", error);
    return { statusCode: 500, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ error: "Errore durante la generazione dell'analisi AI." }) };
  }
};
