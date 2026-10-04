#!/usr/bin/env bash

# ==============================================================================
# Script di Avvio Automatico - Zenith Trading Terminal & Analisi Giacomo Probo
# ==============================================================================

set -e

# Colori per il Terminale
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}====================================================================${NC}"
echo -e "${BLUE}🚀 AVVIO AUTOMATICO: Zenith Trading Terminal (Metodo Giacomo Probo)${NC}"
echo -e "${CYAN}====================================================================${NC}"

# 1. Verifica presenza di Node.js e npm
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ ERRORE: Node.js non risulta installato sul tuo MacBook.${NC}"
    echo -e "${YELLOW}Per favore installa Node.js (v18+) da https://nodejs.org/ prima di proseguire.${NC}"
    exit 1
fi

NODE_VERSION=$(node -v)
echo -e "${GREEN}✓ Node.js rilevato:${NC} ${NODE_VERSION}"

# 2. Verifica ed eventuale creazione del file .env
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️ File .env non trovato. Creazione automatica da .env.example...${NC}"
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${GREEN}✓ File .env creato con successo!${NC}"
    else
        echo -e "GEMINI_API_KEY=\"\"\nPORT=3000" > .env
        echo -e "${GREEN}✓ File .env generato.${NC}"
    fi
else
    echo -e "${GREEN}✓ File .env già presente.${NC}"
fi

# 3. Controllo presenza della cartella 'node_modules' (npm install solo se necessario)
if [ ! -d "node_modules" ] || [ ! -d "node_modules/concurrently" ]; then
    echo -e "${BLUE}📦 Cartella 'node_modules' non trovata o incompleta. Esecuzione di 'npm install'...${NC}"
    npm install
else
    echo -e "${GREEN}✓ Cartella 'node_modules' esistente e dipendenze già presenti.${NC}"
fi

# 4. Avvio simultaneo di Frontend e Backend mediante 'concurrently'
echo -e "${CYAN}--------------------------------------------------------------------${NC}"
echo -e "${GREEN}🌐 Avvio del Server Full-Stack con 'concurrently' su macOS...${NC}"
echo -e "${BLUE}👉 L'applicazione sarà accessibile nel browser a:${NC} ${YELLOW}http://localhost:3000${NC}"
echo -e "${CYAN}--------------------------------------------------------------------${NC}"

# Esecuzione simultanea tramite concurrently
npx concurrently \
  --names "SERVER,VITE" \
  --prefix-colors "blue,magenta" \
  "npx tsx server.ts"
