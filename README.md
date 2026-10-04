# 📈 Zenith Trading Terminal & Analisi AI Giacomo Probo

Applicazione Full-Stack avanzata per l'analisi tecnica, ciclica e macroeconomica multi-asset basata rigorosamente sulla metodologia e sulle strategie di **Giacomo Probo**. Integrata con l'SDK `@google/genai` (Google Gemini 3.8 Flash) per audit di bilancio, analisi multimodale degli screenshot dei grafici, indicatori quantitativi e report di mercato.

---

## 🚀 Guida all'Esecuzione Locale su MacBook (macOS)

### 1. Requisiti di Sistema
- **macOS** (Apple Silicon M1/M2/M3/M4 o Intel)
- **Node.js**: v18.0.0 o superiore (scaricabile da [nodejs.org](https://nodejs.org/) oppure via Homebrew: `brew install node`)
- **Git**: [git-scm.com](https://git-scm.com/)

---

### 2. Configurazione del Repository GitHub

Apri il **Terminale** sul tuo MacBook e inserisci i seguenti comandi per clonare o collegare il repository GitHub:

```bash
# 1. Apri la cartella Progetti (o quella che preferisci)
cd ~/Documents

# 2. Clona il repository GitHub
git clone https://github.com/fabiobentivegna-cell/grmini-trading-anlisys.git

# 3. Entra nella cartella del progetto
cd grmini-trading-anlisys
```

*(Se la cartella esiste già oppure desideri inizializzare un nuovo push locale)*:
```bash
git init
git remote add origin https://github.com/fabiobentivegna-cell/grmini-trading-anlisys.git
git branch -M main
```

---

### 3. Installazione delle Dipendenze

All'interno della cartella del progetto sul tuo MacBook, esegui:

```bash
npm install
```

---

### 4. Configurazione della Chiave API Gemini (`.env`)

Crea il file `.env` copiando il modello `.env.example`:

```bash
cp .env.example .env
```

Apri il file `.env` ed inserisci la tua chiave API di Google Gemini (puoi ottenerne una gratuitamente su [Google AI Studio](https://aistudio.google.com/)):

```env
GEMINI_API_KEY="Incolla_Qui_La_Tua_Chiave_API_Gemini"
PORT=3000
```

---

### 5. Esecuzione dell'Applicazione in Locale

Per avviare il server Node.js + Vite in modalità sviluppo:

```bash
npm run dev
```

Apri il tuo browser su MacBook all'indirizzo:
👉 **`http://localhost:3000`**

---

### 6. Caricamento / Sync dei File su GitHub

Per sincronizzare tutti i file del progetto con il tuo repository GitHub (`https://github.com/fabiobentivegna-cell/grmini-trading-anlisys`):

```bash
# Aggiungi tutti i file
git add .

# Crea un commit con la descrizione
git commit -m "Aggiornamento Zenith Trading Terminal: Metodologia Giacomo Probo AI & Market Analysis"

# Effettua il push su GitHub
git push -u origin main
```

*(Se incontri conflitti con la cronologia remota durante il primo push, puoi usare `git push -u origin main --force`)*

---

## 🛠️ Architettura e Tecnologie Utilizzate

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide React, TradingView Lightweight Charts, D3.js.
- **Backend Proxy Route**: Express (Node.js con `tsx`), SDK `@google/genai` (Gemini 3.8 Flash).
- **Metodologia Probo**:
  - *Confluenza 5 Tecniche*: Grafica Classica, Candlestick/Heiken Ashi, Medie Mobili, Stocastico Lento (10-6-3 con fasce 75/25), Bande di Bollinger (5 periodi / 1.8 Dev.Std), Volume Profile (POC).
  - *Scaling Out 50%*: Chiusura del 50% della posizione al TP1 e Stop Loss a Breakeven sulla metà restante.
  - *Analisi dei Mercati e Paesi*: 3 Pilastri Macro (7 Variabili Fondamentali, Indicatori di Fiducia PMI/ISM/CPI/PPI, Ciclo Economico & Regime Risk On/Off Intermarket) con Rating 0-100 a 3 Stelle.
