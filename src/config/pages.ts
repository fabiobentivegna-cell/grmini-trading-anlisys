import { PageDefinition, PageId } from '../types';

/**
 * REGISTRO DELLE PAGINE DELL'APPLICAZIONE
 * ========================================
 * Per aggiungere una nuova pagina all'applicazione:
 * 1. Crea il tuo componente in `src/pages/MiaNuovaPagina.tsx`
 * 2. Aggiungi la definizione qui sotto nell'array `PAGES_CONFIG`
 * 3. Importa il componente in `src/App.tsx`
 * 
 * Ogni pagina è completamente autonoma e disaccoppiata dalle altre.
 */
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
  }
];

export const DEFAULT_PAGE_ID: PageId = 'chart';

export function getPageConfig(pageId: PageId): PageDefinition {
  const found = PAGES_CONFIG.find(p => p.id === pageId);
  return found || PAGES_CONFIG[0];
}
