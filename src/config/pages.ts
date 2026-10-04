import { PageDefinition, PageId } from '../types';

export const PAGES_CONFIG: PageDefinition[] = [
  {
    id: 'chart',
    title: 'Grafico Interattivo con Indicatori & Drawing',
    navTitle: '📈 Grafico',
    icon: 'TrendingUp',
    description: 'Grafico professionale TradingView Lightweight Charts con indicatori tecnici e strumenti di disegno'
  },
  {
    id: 'news',
    title: 'News in Tempo Reale & Analisi Sentiment AI',
    navTitle: '📰 News & AI',
    icon: 'Newspaper',
    description: 'Feed notizie finanziarie in tempo reale con punteggio e analisi macro sentiment elaborata da Google Gemini'
  },
  {
    id: 'fundamental',
    title: 'Analisi Fondamentale, Fair Value & Multipli',
    navTitle: '📊 Analisi Fondamentale',
    icon: 'BarChart3',
    description: 'Modelli DCF, Benjamin Graham, Peter Lynch, target analisti, stagionalità e audit quantitativo AI'
  },
  {
    id: 'agent',
    title: 'Financial Intelligence Agent (InvestingPro + Quantaste + Forecaster)',
    navTitle: '🧠 Quant Agent',
    icon: 'BrainCircuit',
    description: 'Analista finanziario quantitativo avanzato: Fair Value multi-modello, Smart Quant Score a 5 pilastri, Projection Engine, Market Mood Meter e flussi istituzionali'
  },
  {
    id: 'calendar',
    title: 'Calendario Economico Globale',
    navTitle: '📅 Calendario Economico',
    icon: 'Calendar',
    description: 'Rilasci macroeconomici con orari, stime di consenso, dati precedenti e rilevati storici'
  },
  {
    id: 'correlations',
    title: 'Matrice delle Correlazioni Multi-Asset (Pearson)',
    navTitle: '🔗 Correlazioni',
    icon: 'GitFork',
    description: 'Analisi statistica delle correlazioni storiche tra azioni, indici, materie prime e valute'
  },
  {
    id: 'inflation',
    title: 'Macro Hub & Inflazione (Quad View)',
    navTitle: '📉 Inflazione & Macro Hub',
    icon: 'LayoutGrid',
    description: 'Vista quadrigrafica simultanea per monitorare inflazione, rendimenti USA, petrolio, VIX e indici'
  },
  {
    id: 'screener',
    title: 'Stock Screener Pro & Modelli Quantitativi',
    navTitle: '🔍 Stock Screener',
    icon: 'Filter',
    description: 'Filtra e seleziona azioni con modelli preimpostati (Buffett, InvestingPro, Value, Growth, Dalio) e metriche personalizzate'
  },
  {
    id: 'heatmap',
    title: 'Heatmap di Mercato & Mappa Settoriale',
    navTitle: '🗺️ Heatmap',
    icon: 'LayoutGrid',
    description: 'Mappa visiva termica delle variazioni percentuali dei settori azionari e asset globali con selezione immediata del ticker'
  },
  {
    id: 'multichart',
    title: 'Multi-Chart Quad Matrix (Daily, 1h, 15m, 5m)',
    navTitle: '🎛️ Multi-Chart 4-TF',
    icon: 'Grid',
    description: 'Vista simultanea a 4 grafici sincronizzati (Daily, 1h, 15m, 5m) con disegno, oscillatori, indicatori e analisi approfondita AI Multi-Timeframe'
  },
  {
    id: 'market-analysis',
    title: 'Analisi dei Mercati & dei Paesi - Metodologia Giacomo Probo',
    navTitle: '🌍 Analisi Mercati Probo',
    icon: 'Globe',
    description: 'Valutazione macroeconomica a 3 pilastri (7 variabili, dati & sentiment, intermarket), rating quantitativo 0-100 (3 Stelle) e piano operativo per mercato e Paese'
  }
];

export const DEFAULT_PAGE_ID: PageId = 'chart';

export function getPageConfig(pageId: PageId): PageDefinition {
  const found = PAGES_CONFIG.find(p => p.id === pageId);
  return found || PAGES_CONFIG[0];
}
