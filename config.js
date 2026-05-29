/**
 * config.js - Configurazione Endpoint MarketPulse
 * Le chiavi API NON devono essere qui. 
 * Questo file punta al tuo proxy server (es. Vercel Functions).
 */
const MARKETPULSE_CONFIG = {
    // URL del tuo backend/proxy (dove risiedono le chiamate API protette)
    PROXY_BASE_URL: 'https://tuo-dominio-vercel.app/api',
    
    // Configurazione dei servizi
    SERVICES: {
        ALPHA_VANTAGE: '/alpha-vantage', // Proxy per Alpha Vantage
        FINNHUB:       '/finnhub',       // Proxy per Finnhub
        FRED:          '/fred',          // Proxy per FRED
        NEWS_API:      '/news'           // Proxy per NewsAPI
    }
};

/**
 * Helper per chiamate sicure
 */
async function getMarketData(service, params = {}) {
    const query = new URLSearchParams(params).toString();
    const url = `${MARKETPULSE_CONFIG.PROXY_BASE_URL}${MARKETPULSE_CONFIG.SERVICES[service]}?${query}`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Errore API: ${service}`);
        return await response.json();
    } catch (error) {
        console.error("MarketPulse Engine Error:", error);
        return null;
    }
}