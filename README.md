Trading Dashboard Web • Flask + Lightweight Charts

Descrizione
- Dashboard di trading multi-chart, lato frontend puro (HTML5/CSS3/JS)
- Grafici Lightweight Charts, layout 1/2/4/6 pannelli, tema chiaro/scuro
- Dati live via yfinance (USA/Italia/Forex/Commodities)
- Crypto stream via Hyperliquid WebSocket (mock o endpoint reale)
- Indicatori: RSI, MACD, Bollinger Bands, Volume Profile, Fair Value Gap
- Porta di sviluppo: 5000 (Flask)

Installazione
1) Crea ambiente virtuale
   python -m venv venv
   source venv/bin/activate (Linux/macOS) o venv\Scripts\activate (Windows)
2) Installa dipendenze
   pip install -r backend/requirements.txt
3) Avvia backend
   python backend/app.py
4) Apri browser su http://localhost:5000 ( frontend serve static files in /frontend )

Struttura progetto
- backend/app.py: API Flask
- frontend/index.html, styles.css, script.js: UI e grafici
- frontend/libs/lightweight-charts.min.js: libreria grafici
- README.md: questa guida

Note
- Per live reali, espandere nota: caching, gestione errori, rate limiting, autenticazione API
- Per una versione completa, integra gestione stato lato server per sessioni utente
