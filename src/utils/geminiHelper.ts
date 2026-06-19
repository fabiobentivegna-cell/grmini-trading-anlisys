/**
 * Utility functions to call Gemini directly from the client (browser) using a user-provided API key.
 * This allows the application to run fully serverless when deployed on static environments like GitHub Pages.
 */

export async function callGeminiDirect(prompt: string, apiKey: string): Promise<string> {
  if (!apiKey) {
    throw new Error("Chiave API Gemini mancante.");
  }
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || "Errore chiamata API Gemini");
    }
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "Nessun output ricevuto da Gemini.";
  } catch (error: any) {
    console.error("Direct Gemini call error:", error);
    throw error;
  }
}

export async function callGeminiDirectJson(prompt: string, apiKey: string): Promise<any> {
  if (!apiKey) {
    throw new Error("Chiave API Gemini mancante.");
  }
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || "Errore chiamata API Gemini JSON");
    }
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    return JSON.parse(text);
  } catch (error: any) {
    console.error("Direct Gemini JSON call error:", error);
    throw error;
  }
}
