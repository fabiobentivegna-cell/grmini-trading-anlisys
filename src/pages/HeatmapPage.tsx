import React, { useState, useMemo } from 'react';
import {
  LayoutGrid,
  TrendingUp,
  Search,
  BarChart3,
  Newspaper,
  Star,
  ExternalLink,
  CheckCircle2,
  Layers,
  Zap,
  Activity,
  Flame,
  X
} from 'lucide-react';
import { HeatmapStockItem, PageId } from '../types';
import { heatmapDataService, HeatmapTimeframe, SectorPerformance } from '../services/heatmapDataService';
import { storageService } from '../services/storageService';

interface HeatmapPageProps {
  onSelectTicker: (ticker: string) => void;
  onNavigatePage: (pageId: PageId) => void;
}

export const HeatmapPage: React.FC<HeatmapPageProps> = ({
  onSelectTicker,
  onNavigatePage
}) => {
  const [marketFilter, setMarketFilter] = useState<'ALL' | 'IT' | 'US' | 'EU' | 'CRYPTO_COMMODITY'>('ALL');
  const [timeframe, setTimeframe] = useState<HeatmapTimeframe>('1d');
  const [sectorFilter, setSectorFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sizingMode, setSizingMode] = useState<'WEIGHTED' | 'UNIFORM'>('WEIGHTED');
  const [selectedStockDetail, setSelectedStockDetail] = useState<HeatmapStockItem | null>(null);
  const [watchlist, setWatchlist] = useState<string[]>(() => storageService.getWatchlist());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const allItems = useMemo(() => heatmapDataService.getAll(), []);

  const filteredItems = useMemo(() => {
    return allItems.filter(item => {
      if (marketFilter !== 'ALL' && item.market !== marketFilter) return false;
      if (sectorFilter !== 'ALL' && item.sector !== sectorFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchSymbol = item.symbol.toLowerCase().includes(q);
        const matchName = item.name.toLowerCase().includes(q);
        const matchSector = item.sector.toLowerCase().includes(q);
        if (!matchSymbol && !matchName && !matchSector) return false;
      }

      return true;
    });
  }, [allItems, marketFilter, sectorFilter, searchQuery]);

  const availableSectors = useMemo(() => {
    const set = new Set<string>();
    allItems.forEach(item => {
      if (marketFilter === 'ALL' || item.market === marketFilter) {
        set.add(item.sector);
      }
    });
    return Array.from(set);
  }, [allItems, marketFilter]);

  const sectorStats: SectorPerformance[] = useMemo(() => {
    return heatmapDataService.getSectorStats(filteredItems, timeframe);
  }, [filteredItems, timeframe]);

  const totalStocks = filteredItems.length;
  const advancingStocks = filteredItems.filter(i => heatmapDataService.getChangeByTimeframe(i, timeframe) > 0).length;
  const decliningStocks = filteredItems.filter(i => heatmapDataService.getChangeByTimeframe(i, timeframe) < 0).length;
  const unchangedStocks = totalStocks - advancingStocks - decliningStocks;
  const bullishRatio = totalStocks > 0 ? Math.round((advancingStocks / totalStocks) * 100) : 50;

  const itemsBySector = useMemo(() => {
    const map: Record<string, HeatmapStockItem[]> = {};
    filteredItems.forEach(item => {
      if (!map[item.sector]) map[item.sector] = [];
      map[item.sector].push(item);
    });

    Object.keys(map).forEach(sec => {
      map[sec].sort((a, b) => b.marketCap - a.marketCap);
    });

    return map;
  }, [filteredItems]);

  const handleTileClick = (stock: HeatmapStockItem) => {
    onSelectTicker(stock.symbol);
    setSelectedStockDetail(stock);
    setToastMessage(`Ticker attivo impostato su ${stock.symbol} (${stock.name})`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const toggleWatchlist = (symbol: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const exists = watchlist.includes(symbol);
    const updated = exists ? watchlist.filter(s => s !== symbol) : [...watchlist, symbol];
    setWatchlist(updated);
    storageService.saveWatchlist(updated);
  };

  const getHeatmapColorClass = (chg: number) => {
    if (chg >= 3.0) return 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-900/20';
    if (chg >= 1.5) return 'bg-emerald-700/90 hover:bg-emerald-600 text-emerald-50 border-emerald-500/60';
    if (chg >= 0.2) return 'bg-emerald-950/80 hover:bg-emerald-900/90 text-emerald-200 border-emerald-700/40';
    if (chg > -0.2) return 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border-slate-700';
    if (chg > -1.5) return 'bg-rose-950/80 hover:bg-rose-900/90 text-rose-200 border-rose-700/40';
    if (chg > -3.0) return 'bg-rose-700/90 hover:bg-rose-600 text-rose-50 border-rose-500/60';
    return 'bg-rose-600 hover:bg-rose-500 text-white border-rose-400 shadow-md shadow-rose-900/20';
  };

  const getTileSizeClass = (cap: number) => {
    if (sizingMode === 'UNIFORM') return 'col-span-1 min-h-[90px]';
    if (cap >= 1000) return 'col-span-2 sm:col-span-3 lg:col-span-4 min-h-[140px]';
    if (cap >= 200) return 'col-span-2 sm:col-span-2 lg:col-span-3 min-h-[120px]';
    if (cap >= 50) return 'col-span-1 sm:col-span-2 min-h-[105px]';
    return 'col-span-1 min-h-[90px]';
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[var(--bg-main)]">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header Sezione Heatmap */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-header)] shadow-sm">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-linear-to-r from-emerald-600 via-teal-600 to-blue-600 text-white shadow-md shadow-emerald-500/20">
              <Flame className="w-5 h-5 text-amber-300 animate-pulse" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-[var(--text-main)] uppercase tracking-wide">
                  Heatmap di Mercato & Mappa Settoriale
                </h1>
                <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  {totalStocks} Asset Mappati
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                Mappa termica delle variazioni percentuali. Clicca su qualsiasi riquadro per impostare il ticker globale o passare al Grafico.
              </p>
            </div>
          </div>

          {/* Timeframe Selector */}
          <div className="flex items-center gap-1 bg-[var(--input-bg)] p-1 rounded-xl border border-[var(--border-color)] self-start md:self-auto">
            {[
              { id: '1d', label: '1D (24h)' },
              { id: '1w', label: '1W (Sett.)' },
              { id: '1m', label: '1M (Mese)' },
              { id: 'ytd', label: 'YTD (Anno)' },
              { id: '1y', label: '1Y (1 Anno)' }
            ].map(tf => (
              <button
                key={tf.id}
                onClick={() => setTimeframe(tf.id as HeatmapTimeframe)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  timeframe === tf.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>

        {/* Barra di Controllo */}
        <div className="p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 bg-[var(--bg-main)] p-1 rounded-lg border border-[var(--border-color)] overflow-x-auto">
            {[
              { id: 'ALL', label: 'Tutti i Mercati', flag: '🌐' },
              { id: 'IT', label: 'Piazza Affari (MIB)', flag: '🇮🇹' },
              { id: 'US', label: 'Wall Street (S&P)', flag: '🇺🇸' },
              { id: 'EU', label: 'Europa (EuroStoxx)', flag: '🇪🇺' },
              { id: 'CRYPTO_COMMODITY', label: 'Crypto & Materie Prime', flag: '🪙' }
            ].map(m => (
              <button
                key={m.id}
                onClick={() => {
                  setMarketFilter(m.id as any);
                  setSectorFilter('ALL');
                }}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition cursor-pointer shrink-0 flex items-center gap-1 ${
                  marketFilter === m.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                <span>{m.flag}</span>
                <span>{m.label}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-1 min-w-[240px] max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[var(--text-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cerca ticker o titolo (es. Enel, NVDA, Bitcoin...)"
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] text-xs outline-none"
              />
            </div>

            <select
              value={sectorFilter}
              onChange={e => setSectorFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] text-xs font-semibold outline-none"
            >
              <option value="ALL">Tutti i Settori</option>
              {availableSectors.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 bg-[var(--bg-main)] p-1 rounded-lg border border-[var(--border-color)] text-xs">
            <button
              onClick={() => setSizingMode('WEIGHTED')}
              className={`px-2 py-1 rounded text-[10px] font-bold transition cursor-pointer flex items-center gap-1 ${
                sizingMode === 'WEIGHTED' ? 'bg-blue-600 text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
              title="Dimensiona i riquadri in proporzione alla Capitalizzazione di Mercato"
            >
              <Layers className="w-3 h-3" />
              <span>Ponderata per Cap</span>
            </button>
            <button
              onClick={() => setSizingMode('UNIFORM')}
              className={`px-2 py-1 rounded text-[10px] font-bold transition cursor-pointer flex items-center gap-1 ${
                sizingMode === 'UNIFORM' ? 'bg-blue-600 text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
              title="Visualizza riquadri di dimensione uniforme"
            >
              <LayoutGrid className="w-3 h-3" />
              <span>Griglia Uniforme</span>
            </button>
          </div>
        </div>

        {/* Statistiche Ampiezza & Classifica Settoriale */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] flex flex-col justify-between">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-[var(--text-main)] uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-blue-500" />
                <span>Ampiezza di Mercato ({timeframe.toUpperCase()})</span>
              </span>
              <span className="font-mono font-bold text-emerald-500">{bullishRatio}% Rialzisti</span>
            </div>

            <div className="mt-2.5">
              <div className="h-3 w-full rounded-full overflow-hidden flex bg-slate-800 border border-[var(--border-color)]">
                <div
                  className="bg-emerald-500 h-full transition-all duration-500"
                  style={{ width: `${bullishRatio}%` }}
                  title={`${advancingStocks} Titoli in Rialzo`}
                />
                <div
                  className="bg-rose-500 h-full transition-all duration-500"
                  style={{ width: `${100 - bullishRatio}%` }}
                  title={`${decliningStocks} Titoli in Ribasso`}
                />
              </div>

              <div className="flex items-center justify-between mt-1.5 text-[10px] font-mono">
                <span className="text-emerald-500 font-bold flex items-center gap-0.5">
                  ▲ {advancingStocks} In Rialzo
                </span>
                <span className="text-[var(--text-muted)]">
                  • {unchangedStocks} Invariati
                </span>
                <span className="text-rose-500 font-bold flex items-center gap-0.5">
                  ▼ {decliningStocks} In Ribasso
                </span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] flex flex-col justify-between">
            <div className="flex items-center justify-between text-[11px] mb-1.5">
              <span className="font-bold text-[var(--text-main)] uppercase tracking-wider flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-indigo-500" />
                <span>Classifica Performance Settoriale</span>
              </span>
              <span className="text-[10px] text-[var(--text-muted)]">Rendimento medio aggregato</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {sectorStats.slice(0, 8).map(sec => {
                const isPositive = sec.avgChange >= 0;
                return (
                  <div
                    key={sec.sector}
                    onClick={() => setSectorFilter(sec.sector)}
                    className="p-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] hover:border-blue-500/50 transition cursor-pointer flex items-center justify-between text-[11px]"
                    title={`Filtra solo ${sec.sector} (${sec.stocksCount} titoli)`}
                  >
                    <span className="font-semibold text-[var(--text-main)] truncate max-w-[110px] text-[10px]">
                      {sec.sector}
                    </span>
                    <span className={`font-mono font-bold text-[10px] ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {isPositive ? `+${sec.avgChange}%` : `${sec.avgChange}%`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Griglia Heatmap Raggruppata per Settore */}
        <div className="space-y-4">
          {Object.keys(itemsBySector).length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] space-y-3">
              <Layers className="w-8 h-8 text-[var(--text-muted)] mx-auto" />
              <p className="text-sm font-semibold text-[var(--text-main)]">
                Nessun asset corrisponde ai criteri di ricerca impostati.
              </p>
              <button
                onClick={() => {
                  setMarketFilter('ALL');
                  setSectorFilter('ALL');
                  setSearchQuery('');
                }}
                className="px-4 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition cursor-pointer"
              >
                Reimposta Visualizzazione Completa
              </button>
            </div>
          ) : (
            Object.entries(itemsBySector).map(([sectorName, stocks]) => {
              const sectorAvg = (stocks.reduce((sum, s) => sum + heatmapDataService.getChangeByTimeframe(s, timeframe), 0) / stocks.length).toFixed(2);
              const isSecPositive = parseFloat(sectorAvg) >= 0;

              return (
                <div
                  key={sectorName}
                  className="p-3.5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] space-y-2.5 shadow-sm"
                >
                  <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-main)]">
                        {sectorName}
                      </h2>
                      <span className="text-[10px] text-[var(--text-muted)]">
                        ({stocks.length} asset)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                        isSecPositive ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                      }`}>
                        Media Settore: {isSecPositive ? `+${sectorAvg}%` : `${sectorAvg}%`}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                    {stocks.map(stock => {
                      const chg = heatmapDataService.getChangeByTimeframe(stock, timeframe);
                      const isPositive = chg >= 0;
                      const sizeClass = getTileSizeClass(stock.marketCap);
                      const colorClass = getHeatmapColorClass(chg);
                      const isWatchlisted = watchlist.includes(stock.symbol);

                      return (
                        <div
                          key={stock.symbol}
                          onClick={() => handleTileClick(stock)}
                          className={`${sizeClass} ${colorClass} p-2.5 rounded-xl border transition-all duration-200 transform hover:scale-[1.02] cursor-pointer flex flex-col justify-between group relative select-none`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-mono font-bold text-xs sm:text-sm tracking-wide flex items-center gap-1">
                                <span>{stock.symbol}</span>
                              </div>
                              <div className="text-[10px] opacity-80 truncate max-w-[120px] font-sans">
                                {stock.name}
                              </div>
                            </div>

                            <button
                              onClick={(e) => toggleWatchlist(stock.symbol, e)}
                              className="p-1 rounded-md opacity-70 hover:opacity-100 hover:bg-black/20 transition cursor-pointer"
                              title={isWatchlisted ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
                            >
                              <Star className={`w-3 h-3 ${isWatchlisted ? 'fill-amber-300 text-amber-300' : ''}`} />
                            </button>
                          </div>

                          <div className="mt-2 flex items-baseline justify-between font-mono">
                            <span className="text-[10px] sm:text-xs opacity-90">
                              {stock.currency === 'EUR' ? '€' : '$'} {stock.price.toFixed(stock.price < 10 ? 2 : stock.price > 1000 ? 0 : 2)}
                            </span>

                            <span className="font-bold text-xs sm:text-sm flex items-center">
                              {isPositive ? '+' : ''}{chg.toFixed(2)}%
                            </span>
                          </div>

                          <div className="absolute inset-0 rounded-xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none backdrop-blur-2xs">
                            <span className="px-2 py-1 rounded bg-black/80 text-white font-bold text-[10px] flex items-center gap-1 shadow-lg border border-white/20">
                              <span>Imposta Ticker</span>
                              <ExternalLink className="w-3 h-3" />
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Pop-up Modale / Scheda Dettaglio Rapida al Click */}
      {selectedStockDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-[var(--bg-header)] border border-[var(--border-color)] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden text-xs">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-card)]">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-lg bg-blue-600 text-white">
                  <Zap className="w-4 h-4 text-amber-300" />
                </span>
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-sm text-[var(--text-main)]">
                    <span className="font-mono">{selectedStockDetail.symbol}</span>
                    <span>•</span>
                    <span>{selectedStockDetail.name}</span>
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)]">{selectedStockDetail.sector}</span>
                </div>
              </div>

              <button
                onClick={() => setSelectedStockDetail(null)}
                className="p-1.5 rounded-lg hover:bg-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3.5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="p-2 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)]">
                  <span className="text-[9px] uppercase text-[var(--text-muted)] font-bold">Prezzo Attuale</span>
                  <div className="font-bold text-sm font-mono mt-0.5 text-[var(--text-main)]">
                    {selectedStockDetail.currency === 'EUR' ? '€' : '$'} {selectedStockDetail.price.toFixed(2)}
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)]">
                  <span className="text-[9px] uppercase text-[var(--text-muted)] font-bold">Variazione 1D</span>
                  <div className={`font-bold text-sm font-mono mt-0.5 ${selectedStockDetail.change1d >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {selectedStockDetail.change1d >= 0 ? '+' : ''}{selectedStockDetail.change1d}%
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)]">
                  <span className="text-[9px] uppercase text-[var(--text-muted)] font-bold">Variazione 1M</span>
                  <div className={`font-bold text-sm font-mono mt-0.5 ${selectedStockDetail.change1m >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {selectedStockDetail.change1m >= 0 ? '+' : ''}{selectedStockDetail.change1m}%
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)]">
                  <span className="text-[9px] uppercase text-[var(--text-muted)] font-bold">Variazione YTD</span>
                  <div className={`font-bold text-sm font-mono mt-0.5 ${selectedStockDetail.changeYtd >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {selectedStockDetail.changeYtd >= 0 ? '+' : ''}{selectedStockDetail.changeYtd}%
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Capitalizzazione:</span>
                  <span className="font-mono font-bold text-[var(--text-main)]">{selectedStockDetail.marketCap} Mld {selectedStockDetail.currency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Volume Recente:</span>
                  <span className="font-mono text-[var(--text-main)]">{selectedStockDetail.volume}</span>
                </div>
                {selectedStockDetail.pe && (
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Rapporto P/E:</span>
                    <span className="font-mono text-[var(--text-main)]">{selectedStockDetail.pe}x</span>
                  </div>
                )}
                {selectedStockDetail.rsi && (
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">RSI (14 giorni):</span>
                    <span className="font-mono text-[var(--text-main)]">{selectedStockDetail.rsi}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => {
                    onSelectTicker(selectedStockDetail.symbol);
                    onNavigatePage('chart');
                  }}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition cursor-pointer shadow-xs"
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Apri Grafico</span>
                </button>

                <button
                  onClick={() => {
                    onSelectTicker(selectedStockDetail.symbol);
                    onNavigatePage('fundamental');
                  }}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] hover:bg-indigo-600 hover:text-white font-semibold text-xs transition cursor-pointer"
                >
                  <BarChart3 className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Fondamentali</span>
                </button>

                <button
                  onClick={() => {
                    onSelectTicker(selectedStockDetail.symbol);
                    onNavigatePage('news');
                  }}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] hover:bg-teal-600 hover:text-white font-semibold text-xs transition cursor-pointer"
                >
                  <Newspaper className="w-3.5 h-3.5 text-teal-500" />
                  <span>News & AI</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900/95 text-white border border-emerald-500/40 shadow-2xl text-xs font-semibold animate-fadeIn backdrop-blur-md">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
