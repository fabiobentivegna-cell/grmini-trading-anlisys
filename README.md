# 📈 Market Analytics Station - Pro Trader & Macro Hub

Una piattaforma di analisi finanziaria e trading professionale, modulare e moderna, sviluppata con **React 19**, **TypeScript**, **Tailwind CSS** e **TradingView Lightweight Charts v4**.

Il progetto è stato **completamente rifattorizzato e alleggerito**: l'originale file HTML monolitico è stato suddiviso in **pagine e componenti modulari indipendenti** basati sulle sezioni del menu in alto a sinistra.

---

## 🗂️ Architettura Modulare del Progetto

Il codice è organizzato in modo che **ogni singola pagina possa essere modificata indipendentemente dalle altre**, e nuove pagine possano essere aggiunte in pochissimi minuti:

```text
├── index.html                   # Entry point HTML snello e pulito
├── metadata.json                # Metadati dell'app
├── package.json                 # Dipendenze NPM (React, LightweightCharts, Tailwind, etc.)
├── tsconfig.json                # Configurazione TypeScript rigorosa
├── vite.config.ts               # Bundler Vite ad altissime prestazioni
├── python_desktop/              # Wrapper Python opzionale per desktop (pywebview)
│   ├── app.py
│   └── requirements.txt
└── src/
    ├── main.tsx                 # Bootstrap React
    ├── App.tsx                  # Controller principale & router delle viste
    ├── index.css                # Variabili CSS per Tema Chiaro / Scuro
    │
    ├── config/
    │   ├── pages.ts             # 🌟 REGISTRO DELLE PAGINE (per aggiungere o togliere pagine)
    │   └── catalog.ts           # Catalogo mercati: Azioni Italia (FTSE MIB), USA, Indici, Forex, Materie Prime, Crypto
    │
    ├── types/
    │   └── index.ts             # Definizioni TypeScript per Candele, Indicatori, Disegni, Fondamentali, News, ecc.
    │
    ├── services/
    │   ├── marketDataService.ts # Motore dati di mercato (candele, tick live, fondamentali, calendario, correlazioni)
    │   ├── technicalIndicators.ts # Calcolo indicatori matematici (SMA, EMA, Bollinger, SAR, Supertrend, ATR-TSL, RSI, MACD, Stoch, ADX, ATR)
    │   ├── geminiService.ts     # Integrazione Google Gemini AI per Sentiment News e Audit Fondamentale quantitativo
    │   └── storageService.ts    # Persistenza chiavi API, preferenze e disegni grafici
    │
    ├── components/
    │   ├── Header.tsx           # Barra di navigazione, selettore mercato/strumento, timeframe, badge LIVE, tema
    │   ├── StatusBar.tsx        # Barra di stato con prezzi OHLC e medie mobili istantanee
    │   ├── IndicatorsModal.tsx  # Modale configurazione completa indicatori e oscillatori
    │   ├── ApiHubModal.tsx      # Gestore chiavi API (Gemini, Finnhub, Alpha Vantage, FRED) ed export config.json
    │   ├── DrawingToolbar.tsx   # Barra laterale strumenti di disegno (Trendline, Fibo, Long/Short, ecc.)
    │   └── DrawingCanvas.tsx    # Overlay Canvas interattivo per disegni, canali e livelli Fibonacci
    │
    └── pages/                   # 📄 PAGINE INDIPENDENTI
        ├── ChartPage.tsx        # 1. 📈 Grafico TradingView con indicatori e oscillatori spaziati
        ├── NewsAiPage.tsx       # 2. 📰 News & Analisi Sentiment Gemini AI con indicatore visivo
        ├── FundamentalPage.tsx  # 3. 📊 Analisi Fondamentale, DCF, Graham, Lynch, Stagionalità & Audit AI
        ├── CalendarPage.tsx     # 4. 📅 Calendario Economico Globale (BCE, FED, CPI, NFP)
        ├── CorrelationsPage.tsx # 5. 🔗 Matrice delle Correlazioni Multi-Asset (Pearson Heatmap)
        └── InflationPage.tsx    # 6. 📉 Inflazione & Macro Hub (Quad View 2x2 simultanea)
```

---

## 🚀 Come aggiungere una Nuova Pagina (in 3 semplici passaggi)

L'architettura è stata progettata appositamente per permetterti di espandere l'app facilmente:

### Passo 1: Crea la pagina
Crea un nuovo file in `src/pages/`, ad esempio `src/pages/PortfolioPage.tsx`:
```tsx
import React from 'react';

export const PortfolioPage: React.FC = () => {
  return (
    <div className="flex-1 p-6 bg-[var(--bg-main)]">
      <h2 className="text-xl font-bold">💼 Il Mio Portafoglio</h2>
      <p className="text-xs text-[var(--text-muted)]">Gestione posizioni e asset allocation.</p>
    </div>
  );
};
```

### Passo 2: Registra la pagina in `src/config/pages.ts`
Aggiungi una voce all'array `PAGES_CONFIG`:
```ts
{
  id: 'portfolio',
  title: 'Gestione Portafoglio & Ordini',
  navTitle: '💼 Portafoglio',
  icon: 'Briefcase',
  description: 'Tracciamento del portafoglio e simulazione investimenti'
}
```

### Passo 3: Mostra il componente in `src/App.tsx`
Nel file `src/App.tsx`, importa il tuo componente e aggiungi la condizione nel blocco `<main>`:
```tsx
{activePage === 'portfolio' && <PortfolioPage />}
```
La nuova pagina comparirà automaticamente nel menu a discesa in alto a sinistra!

---

## 🛠️ Come Eseguire il Progetto in Locale

### Requisiti
- [Node.js](https://nodejs.org/) versione 18 o superiore
- npm (incluso con Node.js)

### Installazione e Avvio
```bash
# 1. Installa le dipendenze
npm install

# 2. Avvia il server di sviluppo
npm run dev
```
L'applicazione sarà attiva all'indirizzo: `http://localhost:3000`

### Build di Produzione
```bash
npm run build
```
I file compilati e ottimizzati saranno posizionati nella cartella `dist/`.

---

## 📦 Come Caricare il Progetto su GitHub

Per pubblicare questo progetto sul tuo repository GitHub:

```bash
# 1. Inizializza il repository Git (se non già fatto)
git init

# 2. Aggiungi tutti i file
git add .

# 3. Effettua il primo commit
git commit -m "feat: Market Analytics Station con architettura modulare divisa in pagine"

# 4. Collega il tuo repository remoto GitHub
git remote add origin https://github.com/TUO-USERNAME/NOME-REPO.git

# 5. Imposta il branch principale e pubblica
git branch -M main
git push -u origin main
```

---

## 💡 Funzionalità Principali Incluse

1. **📈 Grafico Interattivo**:
   - TradingView Lightweight Charts v4 (Candele, Linee, Heikin-Ashi).
   - Timeframe da 1 Minuto a Weekly.
   - Medie Mobili Dinamiche (aggiunta illimitata di SMA ed EMA personalizzabili per periodo, colore e spessore).
   - Bande di Bollinger, Parabolic SAR, Supertrend e ATR Trailing Stop Loss.
   - Oscillatori spaziati sincronizzati: RSI, MACD, Stocastico (%K / %D), ADX / DMI, ATR.
   - Toolbar di Disegno su Canvas con clonazione di canali paralleli e ritracciamento di Fibonacci con colori dei livelli personalizzabili.

2. **📰 News & Analisi AI con Gemini**:
   - Punteggio quantitativo da -1.0 a +1.0 con indicatore grafico colorato.
   - Sintesi dei trend di mercato ed estrazione dei driver principali (catalysts).
   - Feed news con link diretti e filtro di ricerca.

3. **📊 Analisi Fondamentale**:
   - Modelli di valutazione Fair Value: Discounted Cash Flow (DCF 5Y), Benjamin Graham Formula e Peter Lynch Value.
   - Margine di sicurezza (%) e rating (Sottovalutato / Sopravvalutato).
   - Target price analisti (medio, massimo, minimo) e consenso.
   - Quota detenuta da investitori istituzionali e insider.
   - Alpha e Beta rispetto all'indice di riferimento (FTSE MIB o S&P 500).
   - Grafico a barre interattivo della stagionalità storica mensile.
   - Tabella di comparazione multipli con i competitor di settore.
   - **Audit AI Quantitativo**: report CFA completo generato da Gemini.

4. **📅 Calendario Economico**:
   - Rilasci macroeconomici futuri con orari e consensi stimati.
   - Dati storici recenti con confronto fra effettivo e stima.
   - Filtro per paese e livello di impatto (Alto / Medio).

5. **🔗 Matrice delle Correlazioni**:
   - Calcolo del coefficiente di correlazione di Pearson multi-asset.
   - Orizzonti a 30, 90 e 365 giorni con colorazione heatmap in tempo reale.

6. **📉 Inflazione & Macro Hub (Quad View)**:
   - Griglia 2x2 simultanea con 4 grafici indipendenti per monitorare Nasdaq, S&P 500, VIX, Rendimento decennale USA, Petrolio Brent, Oro, EUR/USD e Bitcoin.
   - Ticker e timeframe personalizzabili per ciascun quadrante.

7. **🔑 API Hub**:
   - Gestione centralizzata chiavi API con salvataggio automatico nel browser e download di `config.json`.
   - Supporto per Google Gemini, Finnhub, Alpha Vantage, NewsAPI, FRED e Twelve Data.

8. **🌙 Tema Chiaro / Scuro**:
   - Switch istantaneo tra tema Dark professionale e tema Light ad alto contrasto.

9. **🔔 Allarmi di Prezzo & Notifiche Browser (Real-Time Price Alerts)**:
   - Configurazione di allarmi di prezzo per qualsiasi ticker con condizioni di attraversamento verso l'alto (≥) o verso il basso (≤).
   - Calcolo rapido dell'offset percentuale (+1%, +2%, +5%, -1%, -2%, -5%) rispetto al prezzo di mercato corrente.
   - **Notifiche Browser di Sistema (HTML5 Web Notification API)** che avvisano l'utente anche quando la finestra è minimizzata o in background.
   - **Avviso Acustico ad Alta Fedeltà (Audio Chime)** sintetizzato in tempo reale tramite Web Audio API.
   - **Banner/Toast Fluttuante In-App** con indicatore visivo della variazione e chiusura rapida.
   - Persistenza automatica degli allarmi nel `localStorage` del browser.

10. **⭐ Pannello Laterale 'Watchlist' (Lista Titoli Preferiti)**:
   - Pannello laterale a scomparsa integrato direttamente a destra della vista principale.
   - Visualizzazione dei titoli preferiti con **prezzo in tempo reale** e **variazione percentuale giornaliera colorata** (`+X.XX%` verde, `-X.XX%` rosso).
   - **Switch istantaneo dell'asset**: con un solo clic su qualsiasi riga della Watchlist, l'intera applicazione (grafico TradingView, analisi fondamentale, news e sentiment AI) passa al titolo selezionato.
   - Aggiunta rapida del ticker attivo o di qualsiasi ticker personalizzato da input.
   - Ricerca e filtro istantaneo per nome o simbolo.
   - Salvataggio e persistenza automatica nel browser tramite `localStorage`.

11. **📈 Sovrapposizione Storica & Analisi Correlazioni (Chart Overlays & Multi-Timeframe Correlation)**:
   - **Sovrapposizione di Titoli Secondari e Benchmark**: visualizzazione simultanea sul grafico principale di indici (es. S&P 500, Nasdaq 100, Euro Stoxx 50), materie prime (Oro, Petrolio WTI), crypto (Bitcoin) o singoli titoli azionari (es. NVIDIA, Apple, Enel).
   - **Multi-Timeframe Analysis (MTF)**: possibilità di sovrapporre lo stesso titolo su un orizzonte temporale superiore o differente (es. candele giornaliere con trendline settimanale `1wk` o oraria `1h`).
   - **Doppia Modalità di Visualizzazione**:
     - *Rendimento % Normalizzato*: entrambe le serie partono da una base $0.00\%$ all'inizio del periodo comune per confrontare visivamente l'alpha, l'outperformance o l'underperformance relativa.
     - *Doppio Asse Prezzo (Asse Sinistro)*: visualizzazione del prezzo assoluto del ticker secondario sulla scala sinistra dedicata, mantenendo intatte le candele del titolo principale sull'asse destro.
   - **Motore Quantitativo di Correlazione in Tempo Reale**:
     - Calcolo automatico del **Coefficiente di Correlazione di Pearson ($r$)** sui prezzi e sui rendimenti periodali con badge interpretativo (*Forte Diretta*, *Moderata Diretta*, *Scorrelato*, *Inversa/Hedging*).
     - Calcolo dello **Spread Differenziale di Rendimento** e del **Beta ($\beta$)**.
   - **HUD Fluttuante On-Chart e Modale Dedicata**:
     - Badge rapido e compatto direttamente in alto a sinistra sul grafico con valori live, rendimento percentuale, pulsante per nascondere/mostrare e rimozione rapida.
     - Pulsante dedicato *"Confronta"* con badge contatore nell'Header superiore e nella Drawing Toolbar laterale.

