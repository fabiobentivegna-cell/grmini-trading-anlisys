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

  const { sym, name, price, pe, ps, pb, roe, div, valScore, modelType } = JSON.parse(event.body);

  if (!ai) {
    const mockAnalysis = `### 📡 Modalità Simulazione AI attiva
*(Configura GEMINI_API_KEY nei Secrets di Netlify per sbloccare i modelli professionali)*

**Modello Selezionato:** **${modelType === 'buffett' ? 'Warren Buffett (Moat / Growth)' : modelType === 'dalio' ? 'Ray Dalio (All-Weather Asset Allocation)' : 'InvestingPro Pro-Valuation'}** per **${sym} (${name})**.

- **Stabilità Finanziaria:** L'asset è robusto. Rapporto P/E pari a ${pe} e un ROE del ${roe !== '—' ? roe : 'N/D'}%.
- **Valutazione del Modello:** Il punteggio di valore (${valScore}/100) suggerisce condizioni ottimali di accumulo nei portafogli strategici di lungo termine.
- **Conclusione:** Strategia consigliata in linea con i dettami tradizionali del Value Investing.`;
    return { statusCode: 200, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ analysis: mockAnalysis }) };
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

    return { statusCode: 200, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ analysis: response.text }) };
  } catch (error: any) {
    console.error("AI Fundamental error:", error);
    return { statusCode: 500, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ error: "Errore durante la generazione dell'analisi AI." }) };
  }
};
