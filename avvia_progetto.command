#!/bin/bash

# Portiamo l'esecuzione nella cartella in cui risiede questo script
cd "$(dirname "$0")"

# Reset del terminale per una presentazione pulita
clear
echo "================================================================="
echo "  📈 TRADING DASHBOARD & ANALYTICS - AVVIO AUTOMATICO MACOS      "
echo "================================================================="
echo ""

# Verifica se Node.js è installato nel sistema
if ! command -v node &> /dev/null
then
    echo "❌ Errore: Node.js non è installato su questo MacBook!"
    echo "Per favore, scarica e installa l'ultima versione LTS di Node.js"
    echo "da: https://nodejs.org/"
    echo ""
    echo "Dopodiché potrai riavviare questo script."
    echo ""
    read -p "Premi [INVIO] per uscire..."
    exit 1
fi

echo "🟢 Node.js rilevato: $(node -v)"
echo "🟢 npm rilevato: $(npm -v)"
echo ""

# Verifica se le dipendenze devono essere installate
if [ ! -d "node_modules" ]; then
    echo "📦 Cartella 'node_modules' non trovata."
    echo "Installazione delle dipendenze in corso (richiede connessione internet)..."
    echo "Attendere prego..."
    echo ""
    npm install
    
    if [ $? -ne 0 ]; then
        echo ""
        echo "❌ Errore critico durante l'installazione delle dipendenze!"
        echo "Verifica la tua connessione ad Internet o i tuoi permessi di scrittura."
        echo ""
        read -p "Premi [INVIO] per uscire..."
        exit 1
    fi
    echo ""
    echo "✅ Dipendenze installate con successo!"
    echo ""
fi

# Avvio del server di sviluppo ed apertura del browser locale in background
echo "🚀 Avvio dell'applicazione in corso..."
echo "Apertura automatica di http://localhost:3000 nel browser di sistema..."
echo ""

# Apre la pagina web automatica dopo 2 secondi per permettere all'applicazione di fare il boot
(sleep 2.5 && open "http://localhost:3000") &

# Start del server di sviluppo Express + Vite
npm run dev
