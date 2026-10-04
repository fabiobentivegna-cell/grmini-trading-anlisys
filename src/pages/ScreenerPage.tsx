import React, { useState, useMemo } from 'react';
import {
  Filter,
  Search,
  Sliders,
  RotateCcw,
  Sparkles,
  Download,
  ArrowUpDown,
  TrendingUp,
  BarChart3,
  Newspaper,
  Star,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-react';
import { ScreenerStockItem, ScreenerFilterState } from '../types';
import { screenerDataService, SCREENER_PRESET_MODELS, ScreenerPresetModel } from '../services/screenerDataService';
import { storageService } from '../services/storageService';

interface ScreenerPageProps {
  onSelectTicker: (ticker: string) => void;
  onNavigatePage: (pageId: any) => void;
}

const DEFAULT_FILTERS: ScreenerFilterState = {
  search: '',
  presetModel: 'all',
  country: 'ALL',
  sector: 'ALL',
  marketCapCategory: 'ALL',
  smaTrend: 'ALL'
};

export const ScreenerPage: React.FC<ScreenerPageProps> = ({
  onSelectTicker,
  onNavigatePage
}) => {
  const [filters, setFilters] = useState<ScreenerFilterState>(DEFAULT_FILTERS);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [sortField, setSortField] = useState<keyof ScreenerStockItem>('fairValueUpside');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [watchlist, setWatchlist] = useState<string[]>(() => storageService.getWatchlist());
  const [exportCopied, setExportCopied] = useState(false);
  const [watchlistSavedCount, setWatchlistSavedCount] = useState<number | null>(null);

  const handleSaveAllToWatchlist = () => {
    if (filteredStocks.length === 0) return;
    const newSymbols = filteredStocks.map(s => s.symbol);
    const combined = Array.from(new Set([...watchlist, ...newSymbols]));
    setWatchlist(combined);
    storageService.saveWatchlist(combined);
    setWatchlistSavedCount(filteredStocks.length);
    setTimeout(() => setWatchlistSavedCount(null), 3000);
  };

  const allStocks = useMemo(() => screenerDataService.getAllStocks(), []);

  const handleApplyPreset = (preset: ScreenerPresetModel) => {
    setSelectedPresetId(preset.id);
    if (preset.id === 'all') {
      setFilters(DEFAULT_FILTERS);
    } else {
      setFilters(prev => ({
        ...DEFAULT_FILTERS,
        search: prev.search,
        country: prev.country,
        presetModel: preset.id,
        ...preset.filters
      }));
    }
  };

  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setSelectedPresetId('all');
  };

  const filteredStocks = useMemo(() => {
    const list = screenerDataService.filterStocks(allStocks, filters);
    return [...list].sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];
      if (typeof valA === 'string') {
        return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      valA = valA ?? 0;
      valB = valB ?? 0;
      return sortDirection === 'asc' ? valA - valB : valB - valA;
    });
  }, [allStocks, filters, sortField, sortDirection]);

  const handleSort = (field: keyof ScreenerStockItem) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const toggleWatchlist = (symbol: string) => {
    const exists = watchlist.includes(symbol);
    const updated = exists ? watchlist.filter(s => s !== symbol) : [...watchlist, symbol];
    setWatchlist(updated);
    storageService.saveWatchlist(updated);
  };

  const exportToCsv = () => {
    if (filteredStocks.length === 0) return;
    const headers = 'Ticker,Nome,Paese,Settore,Prezzo,Variazione %,Cap (Mld €),P/E,Forward P/E,P/B,ROE %,Margine Op %,Debt/Equity,Div Yield %,Fair Value,Upside %,Buffett Score,InvestingPro Score\n';
    const rows = filteredStocks.map(s =>
      `"${s.symbol}","${s.name}","${s.country}","${s.sector}",${s.price},${s.changePct}%,${s.marketCap},${s.pe},${s.forwardPe},${s.pb},${s.roe}%,${s.operatingMargin}%,${s.debtToEquity},${s.dividendYield}%,${s.fairValue},${s.fairValueUpside}%,${s.buffettScore},${s.investingProScore}`
    ).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Screener_Stocks_${selectedPresetId}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setExportCopied(true);
    setTimeout(() => setExportCopied(false), 2000);
  };

  const avgPe = filteredStocks.length > 0 ? (filteredStocks.reduce((sum, s) => sum + s.pe, 0) / filteredStocks.length).toFixed(1) : '-';
  const avgRoe = filteredStocks.length > 0 ? (filteredStocks.reduce((sum, s) => sum + s.roe, 0) / filteredStocks.length).toFixed(1) : '-';
  const avgUpside = filteredStocks.length > 0 ? (filteredStocks.reduce((sum, s) => sum + s.fairValueUpside, 0) / filteredStocks.length).toFixed(1) : '-';
  const avgDivYield = filteredStocks.length > 0 ? (filteredStocks.reduce((sum, s) => sum + s.dividendYield, 0) / filteredStocks.length).toFixed(1) : '-';

  const currentPreset = SCREENER_PRESET_MODELS.find(p => p.id === selectedPresetId) || SCREENER_PRESET_MODELS[0];

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[var(--bg-main)]">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header Sezione Screener */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-header)] shadow-sm">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
              <Filter className="w-5 h-5 text-amber-300" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-[var(--text-main)] uppercase tracking-wide">
                  Stock Screener Pro & Modelli Quantitativi
                </h1>
                <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20">
                  {filteredStocks.length} / {allStocks.length} Titoli Filtrati
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                Filtra l'universo azionario globale con modelli istituzionali (*Buffett, InvestingPro, Deep Value, Dalio*) o definisci parametri su misura.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveAllToWatchlist}
              disabled={filteredStocks.length === 0}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-semibold text-xs transition cursor-pointer ${
                watchlistSavedCount !== null
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'border-blue-500/40 bg-blue-600/15 hover:bg-blue-600 hover:text-white text-blue-400'
              }`}
              title="Salva tutti i risultati filtrati nella Watchlist laterale"
            >
              <Star className={`w-3.5 h-3.5 ${watchlistSavedCount !== null ? 'fill-white' : 'fill-blue-400'}`} />
              <span>{watchlistSavedCount !== null ? `Aggiunti (${watchlistSavedCount})!` : 'Salva in Watchlist'}</span>
            </button>

            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-semibold text-xs transition cursor-pointer ${
                showAdvancedFilters
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-[var(--border-color)] bg-[var(--bg-main)] hover:bg-[var(--border-color)] text-[var(--text-main)]'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Filtri Dettagliati</span>
              {showAdvancedFilters ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={exportToCsv}
              disabled={filteredStocks.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] hover:bg-[var(--border-color)] text-[var(--text-main)] font-semibold text-xs transition disabled:opacity-50 cursor-pointer"
              title="Esporta risultati in formato CSV"
            >
              <Download className="w-3.5 h-3.5 text-emerald-500" />
              <span>{exportCopied ? 'Scaricato!' : 'Esporta CSV'}</span>
            </button>
          </div>
        </div>

        {/* Barra di Ricerca e Filtri Mercato */}
        <div className="p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[var(--text-muted)]" />
            <input
              type="text"
              value={filters.search}
              onChange={e => setFilters({ ...filters, search: e.target.value })}
              placeholder="Cerca per ticker, azienda o settore (es. Enel, AAPL, Ferrari, Banche...)"
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] text-xs outline-none"
            />
          </div>

          <div className="flex items-center gap-1 bg-[var(--bg-main)] p-1 rounded-lg border border-[var(--border-color)]">
            {[
              { id: 'ALL', label: 'Tutti i Mercati', flag: '🌐' },
              { id: 'IT', label: 'Borsa Italiana', flag: '🇮🇹' },
              { id: 'US', label: 'Wall Street', flag: '🇺🇸' },
              { id: 'EU', label: 'Europa', flag: '🇪🇺' }
            ].map(c => (
              <button
                key={c.id}
                onClick={() => setFilters({ ...filters, country: c.id })}
                className={`px-2 py-1 rounded text-[10px] font-bold transition cursor-pointer flex items-center gap-1 ${
                  filters.country === c.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                <span>{c.flag}</span>
                <span className="hidden sm:inline">{c.label}</span>
              </button>
            ))}
          </div>

          <button
            onClick={handleResetFilters}
            className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-main)] flex items-center gap-1 px-2 py-1 rounded hover:bg-[var(--border-color)] transition cursor-pointer"
            title="Azzera tutti i filtri e criteri"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>

        {/* Carosello Modelli Preimpostati */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-main)] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Modelli Quantitativi & Filtri Istituzionali</span>
            </span>
            <span className="text-[10px] text-[var(--text-muted)]">
              Clicca su un modello per applicare istantaneamente le regole di screening
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {SCREENER_PRESET_MODELS.map(preset => {
              const isSelected = selectedPresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => handleApplyPreset(preset)}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-blue-600/10 border-blue-600 text-[var(--text-main)] shadow-xs ring-1 ring-blue-500'
                      : 'bg-[var(--bg-card)] border-[var(--border-color)] hover:border-blue-500/50 text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  <div>
                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded inline-block mb-1 bg-linear-to-r ${preset.color} text-white`}>
                      {preset.badge}
                    </span>
                    <div className="font-bold text-[11px] text-[var(--text-main)] line-clamp-1">
                      {preset.name}
                    </div>
                  </div>
                  <div className="text-[9px] text-[var(--text-muted)] mt-1 truncate">
                    {preset.author}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Banner Informativo del Modello Attivo */}
        {selectedPresetId !== 'all' && (
          <div className="p-3 rounded-xl border border-blue-500/30 bg-blue-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <strong className="text-blue-500 font-bold">{currentPreset.name}</strong>
                <span className="text-[10px] text-[var(--text-muted)]">• {currentPreset.author}</span>
              </div>
              <p className="text-[11px] text-[var(--text-main)]">
                {currentPreset.description}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
              {currentPreset.criteriaSummary.map((c, i) => (
                <span key={i} className="px-2 py-0.5 rounded-md bg-[var(--bg-card)] border border-[var(--border-color)] text-[10px] font-mono text-[var(--text-muted)]">
                  ✓ {c}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Pannello Filtri Avanzati */}
        {showAdvancedFilters && (
          <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2">
              <span className="font-bold text-xs uppercase tracking-wider text-[var(--text-main)] flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-blue-500" />
                <span>Imposta Valori Personalizzati di Screener</span>
              </span>
              <button
                onClick={handleResetFilters}
                className="text-[10px] text-rose-500 hover:underline cursor-pointer"
              >
                Azzera Criteri
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase text-[var(--text-muted)] mb-1">
                  P/E Massimo:
                </label>
                <input
                  type="number"
                  placeholder="Es. 20"
                  value={filters.maxPe ?? ''}
                  onChange={e => setFilters({ ...filters, maxPe: e.target.value ? parseFloat(e.target.value) : undefined })}
                  className="w-full px-2 py-1 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] font-mono text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[var(--text-muted)] mb-1">
                  P/B Massimo:
                </label>
                <input
                  type="number"
                  placeholder="Es. 2.5"
                  value={filters.maxPb ?? ''}
                  onChange={e => setFilters({ ...filters, maxPb: e.target.value ? parseFloat(e.target.value) : undefined })}
                  className="w-full px-2 py-1 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] font-mono text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[var(--text-muted)] mb-1">
                  ROE Minimo (%):
                </label>
                <input
                  type="number"
                  placeholder="Es. 15"
                  value={filters.minRoe ?? ''}
                  onChange={e => setFilters({ ...filters, minRoe: e.target.value ? parseFloat(e.target.value) : undefined })}
                  className="w-full px-2 py-1 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] font-mono text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[var(--text-muted)] mb-1">
                  Margine Op. Min (%):
                </label>
                <input
                  type="number"
                  placeholder="Es. 12"
                  value={filters.minOperatingMargin ?? ''}
                  onChange={e => setFilters({ ...filters, minOperatingMargin: e.target.value ? parseFloat(e.target.value) : undefined })}
                  className="w-full px-2 py-1 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] font-mono text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[var(--text-muted)] mb-1">
                  Crescita Ricavi (%):
                </label>
                <input
                  type="number"
                  placeholder="Es. 10"
                  value={filters.minRevenueGrowth ?? ''}
                  onChange={e => setFilters({ ...filters, minRevenueGrowth: e.target.value ? parseFloat(e.target.value) : undefined })}
                  className="w-full px-2 py-1 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] font-mono text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[var(--text-muted)] mb-1">
                  Div. Yield Min (%):
                </label>
                <input
                  type="number"
                  placeholder="Es. 3.0"
                  value={filters.minDividendYield ?? ''}
                  onChange={e => setFilters({ ...filters, minDividendYield: e.target.value ? parseFloat(e.target.value) : undefined })}
                  className="w-full px-2 py-1 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] font-mono text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[var(--text-muted)] mb-1">
                  Debt/Equity Max:
                </label>
                <input
                  type="number"
                  placeholder="Es. 1.0"
                  value={filters.maxDebtToEquity ?? ''}
                  onChange={e => setFilters({ ...filters, maxDebtToEquity: e.target.value ? parseFloat(e.target.value) : undefined })}
                  className="w-full px-2 py-1 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] font-mono text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[var(--text-muted)] mb-1">
                  Fair Value Upside Min (%):
                </label>
                <input
                  type="number"
                  placeholder="Es. 15"
                  value={filters.minFairValueUpside ?? ''}
                  onChange={e => setFilters({ ...filters, minFairValueUpside: e.target.value ? parseFloat(e.target.value) : undefined })}
                  className="w-full px-2 py-1 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] font-mono text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[var(--text-muted)] mb-1">
                  Trend Tecnico:
                </label>
                <select
                  value={filters.smaTrend}
                  onChange={e => setFilters({ ...filters, smaTrend: e.target.value as any })}
                  className="w-full px-2 py-1 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] text-xs outline-none font-semibold"
                >
                  <option value="ALL">Tutti i Trend</option>
                  <option value="ABOVE_200">Sopra SMA 200 (Rialzista)</option>
                  <option value="ABOVE_50_200">Sopra SMA 50 & 200 (Super Bull)</option>
                  <option value="BELOW_200">Sotto SMA 200 (Ribassista)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[var(--text-muted)] mb-1">
                  Beta Volatilità Max:
                </label>
                <input
                  type="number"
                  placeholder="Es. 0.90"
                  value={filters.maxBeta ?? ''}
                  onChange={e => setFilters({ ...filters, maxBeta: e.target.value ? parseFloat(e.target.value) : undefined })}
                  className="w-full px-2 py-1 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] font-mono text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[var(--text-muted)] mb-1">
                  ROIC Minimo (%):
                </label>
                <input
                  type="number"
                  placeholder="Es. 15"
                  value={filters.minRoic ?? ''}
                  onChange={e => setFilters({ ...filters, minRoic: e.target.value ? parseFloat(e.target.value) : undefined })}
                  className="w-full px-2 py-1 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] font-mono text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[var(--text-muted)] mb-1">
                  FCF Yield Minimo (%):
                </label>
                <input
                  type="number"
                  placeholder="Es. 5.0"
                  value={filters.minFcfYield ?? ''}
                  onChange={e => setFilters({ ...filters, minFcfYield: e.target.value ? parseFloat(e.target.value) : undefined })}
                  className="w-full px-2 py-1 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] font-mono text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[var(--text-muted)] mb-1">
                  Piotroski Score Min (0-9):
                </label>
                <input
                  type="number"
                  min="0"
                  max="9"
                  placeholder="Es. 7"
                  value={filters.minPiotroskiScore ?? ''}
                  onChange={e => setFilters({ ...filters, minPiotroskiScore: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="w-full px-2 py-1 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] font-mono text-xs outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Metriche Riassuntive */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">P/E Medio Basket</span>
            <div className="text-lg font-bold font-mono text-[var(--text-main)] mt-1">{avgPe}x</div>
          </div>
          <div className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">ROE Medio Basket</span>
            <div className="text-lg font-bold font-mono text-emerald-500 mt-1">{avgRoe}%</div>
          </div>
          <div className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Upside Medio Fair Value</span>
            <div className="text-lg font-bold font-mono text-blue-500 mt-1">+{avgUpside}%</div>
          </div>
          <div className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Dividend Yield Medio</span>
            <div className="text-lg font-bold font-mono text-amber-500 mt-1">{avgDivYield}%</div>
          </div>
        </div>

        {/* Tabella Titoli */}
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] overflow-hidden shadow-sm">
          <div className="overflow-x-auto max-h-[600px]">
            {filteredStocks.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <Info className="w-8 h-8 text-[var(--text-muted)] mx-auto" />
                <p className="text-sm font-semibold text-[var(--text-main)]">
                  Nessun titolo azionario soddisfa tutti i criteri impostati.
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  Prova ad allentare i vincoli numerici o a selezionare il modello preimpostato 'Tutte le Azioni'.
                </p>
                <button
                  onClick={handleResetFilters}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition cursor-pointer"
                >
                  Azzera Tutti i Filtri
                </button>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-[var(--bg-header)] sticky top-0 border-b border-[var(--border-color)] text-[10px] uppercase font-bold text-[var(--text-muted)] z-10 select-none">
                  <tr>
                    <th className="py-2.5 px-3">Azione / Ticker</th>
                    <th className="py-2.5 px-3 cursor-pointer hover:text-[var(--text-main)]" onClick={() => handleSort('price')}>
                      <div className="flex items-center gap-1">
                        <span>Prezzo</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="py-2.5 px-3 cursor-pointer hover:text-[var(--text-main)]" onClick={() => handleSort('pe')}>
                      <div className="flex items-center gap-1">
                        <span>P/E</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="py-2.5 px-3 cursor-pointer hover:text-[var(--text-main)]" onClick={() => handleSort('roe')}>
                      <div className="flex items-center gap-1">
                        <span>ROE %</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="py-2.5 px-3 cursor-pointer hover:text-[var(--text-main)]" onClick={() => handleSort('operatingMargin')}>
                      <div className="flex items-center gap-1">
                        <span>Margine Op.</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="py-2.5 px-3 cursor-pointer hover:text-[var(--text-main)]" onClick={() => handleSort('dividendYield')}>
                      <div className="flex items-center gap-1">
                        <span>Div. Yield</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="py-2.5 px-3 cursor-pointer hover:text-[var(--text-main)]" onClick={() => handleSort('fairValueUpside')}>
                      <div className="flex items-center gap-1">
                        <span>Fair Value & Upside</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="py-2.5 px-3 cursor-pointer hover:text-[var(--text-main)]" onClick={() => handleSort('roic' as any)}>
                      <div className="flex items-center gap-1">
                        <span>ROIC / FCF</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="py-2.5 px-3 cursor-pointer hover:text-[var(--text-main)]" onClick={() => handleSort('piotroskiScore' as any)}>
                      <div className="flex items-center gap-1">
                        <span>Piotroski</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="py-2.5 px-3 cursor-pointer hover:text-[var(--text-main)]" onClick={() => handleSort('compositeRank' as any)}>
                      <div className="flex items-center gap-1">
                        <span className="text-amber-400">Composite Rank</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="py-2.5 px-3 cursor-pointer hover:text-[var(--text-main)]" onClick={() => handleSort('buffettScore')}>
                      <div className="flex items-center gap-1">
                        <span>Buffett Score</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="py-2.5 px-3 cursor-pointer hover:text-[var(--text-main)]" onClick={() => handleSort('investingProScore')}>
                      <div className="flex items-center gap-1">
                        <span>InvestingPro</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="py-2.5 px-3">Trend SMA</th>
                    <th className="py-2.5 px-3 text-right">Azioni Rapide</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {filteredStocks.map(stock => {
                    const isWatchlisted = watchlist.includes(stock.symbol);
                    const flag = stock.country === 'IT' ? '🇮🇹' : stock.country === 'US' ? '🇺🇸' : stock.country === 'EU' ? '🇪🇺' : '🌐';

                    return (
                      <tr key={stock.symbol} className="hover:bg-blue-500/5 transition">
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleWatchlist(stock.symbol)}
                              className={`p-1 rounded hover:bg-[var(--border-color)] transition cursor-pointer ${
                                isWatchlisted ? 'text-amber-500' : 'text-[var(--text-muted)]'
                              }`}
                              title={isWatchlisted ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
                            >
                              <Star className={`w-3.5 h-3.5 ${isWatchlisted ? 'fill-amber-500' : ''}`} />
                            </button>

                            <div>
                              <div className="flex items-center gap-1.5 font-bold text-[var(--text-main)]">
                                <span>{flag}</span>
                                <span className="font-mono">{stock.symbol}</span>
                                <span className="text-[10px] text-[var(--text-muted)] font-normal truncate max-w-[140px]">
                                  {stock.name}
                                </span>
                              </div>
                              <div className="text-[10px] text-[var(--text-muted)] truncate max-w-[200px]">
                                {stock.sector}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-2.5 px-3 font-mono">
                          <div className="font-bold text-[var(--text-main)]">
                            {stock.price.toFixed(2)}
                          </div>
                          <div className={`text-[10px] font-semibold flex items-center gap-0.5 ${
                            stock.changePct >= 0 ? 'text-emerald-500' : 'text-rose-500'
                          }`}>
                            {stock.changePct >= 0 ? '+' : ''}{stock.changePct.toFixed(2)}%
                          </div>
                        </td>

                        <td className="py-2.5 px-3 font-mono">
                          <span className={`px-1.5 py-0.5 rounded font-bold text-[11px] ${
                            stock.pe <= 12 ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : stock.pe <= 25 ? 'bg-blue-500/10 text-blue-500' : 'bg-rose-500/10 text-rose-500'
                          }`}>
                            {stock.pe.toFixed(1)}x
                          </span>
                          <div className="text-[9px] text-[var(--text-muted)] mt-0.5">Fwd: {stock.forwardPe.toFixed(1)}x</div>
                        </td>

                        <td className="py-2.5 px-3 font-mono">
                          <span className={`font-bold ${stock.roe >= 15 ? 'text-emerald-500' : 'text-[var(--text-main)]'}`}>
                            {stock.roe.toFixed(1)}%
                          </span>
                          <div className="text-[9px] text-[var(--text-muted)]">D/E: {stock.debtToEquity.toFixed(2)}</div>
                        </td>

                        <td className="py-2.5 px-3 font-mono">
                          <span className="font-bold text-[var(--text-main)]">
                            {stock.operatingMargin.toFixed(1)}%
                          </span>
                          <div className="text-[9px] text-[var(--text-muted)]">Gross: {stock.grossMargin.toFixed(1)}%</div>
                        </td>

                        <td className="py-2.5 px-3 font-mono">
                          <span className={`font-bold ${stock.dividendYield >= 4.0 ? 'text-amber-500' : 'text-[var(--text-main)]'}`}>
                            {stock.dividendYield.toFixed(1)}%
                          </span>
                          <div className="text-[9px] text-[var(--text-muted)]">Payout: {stock.payoutRatio}%</div>
                        </td>

                        <td className="py-2.5 px-3 font-mono">
                          <div className="text-[11px] font-semibold text-[var(--text-main)]">
                            € {stock.fairValue.toFixed(2)}
                          </div>
                          <span className={`px-1.5 py-0.2 rounded font-bold text-[10px] inline-block ${
                            stock.fairValueUpside >= 15
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                              : stock.fairValueUpside > 0
                              ? 'bg-blue-500/10 text-blue-500'
                              : 'bg-rose-500/10 text-rose-500'
                          }`}>
                            {stock.fairValueUpside >= 0 ? `+${stock.fairValueUpside.toFixed(1)}%` : `${stock.fairValueUpside.toFixed(1)}%`}
                          </span>
                        </td>

                        <td className="py-2.5 px-3 font-mono">
                          <div className={`font-bold ${(stock.roic ?? 12) >= 15 ? 'text-emerald-500' : 'text-[var(--text-main)]'}`}>
                            {(stock.roic ?? 12).toFixed(1)}%
                          </div>
                          <div className="text-[10px] text-cyan-600 dark:text-cyan-400">
                            FCF: {(stock.fcfYield ?? 5.2).toFixed(1)}%
                          </div>
                        </td>

                        <td className="py-2.5 px-3 font-mono">
                          <span className={`px-2 py-0.5 rounded font-bold text-[10px] inline-block ${
                            (stock.piotroskiScore ?? 6) >= 7
                              ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/20'
                              : (stock.piotroskiScore ?? 6) >= 5
                              ? 'bg-blue-500/10 text-blue-500'
                              : 'bg-amber-500/10 text-amber-500'
                          }`}>
                            F-Score: {stock.piotroskiScore ?? 6}/9
                          </span>
                        </td>

                        <td className="py-2.5 px-3 font-mono">
                          <div className="flex items-center gap-1.5">
                            <span className={`px-2 py-0.5 rounded font-black text-[11px] ${
                              (stock.compositeRank ?? 70) >= 80
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : (stock.compositeRank ?? 70) >= 60
                                ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
                                : 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                            }`}>
                              {stock.compositeRank ?? Math.round((stock.buffettScore + (stock.investingProScore * 20) + (stock.fairValueUpside > 0 ? 80 : 40)) / 3)}
                            </span>
                          </div>
                          <div className="text-[9px] text-[var(--text-muted)] flex items-center gap-1 mt-0.5">
                            <span title="Fattore Tecnico">T: {stock.technicalScore ?? Math.round(stock.rsi14 > 45 && stock.priceAboveSma50 ? 78 : 52)}</span>
                            <span>•</span>
                            <span title="Fattore Fondamentale">F: {stock.fundamentalScore ?? Math.round(stock.buffettScore)}</span>
                            <span>•</span>
                            <span title="Fattore Sentiment AI">AI: {stock.sentimentScore ?? Math.round(stock.investingProScore * 18)}</span>
                          </div>
                        </td>

                        <td className="py-2.5 px-3 font-mono">
                          <div className="flex items-center gap-1.5">
                            <div className="w-12 h-2 bg-[var(--input-bg)] rounded-full overflow-hidden border border-[var(--border-color)]">
                              <div
                                className={`h-full rounded-full ${
                                  stock.buffettScore >= 85 ? 'bg-emerald-500' : stock.buffettScore >= 70 ? 'bg-amber-500' : 'bg-rose-500'
                                }`}
                                style={{ width: `${stock.buffettScore}%` }}
                              />
                            </div>
                            <span className="font-bold text-[11px] text-[var(--text-main)]">{stock.buffettScore}</span>
                          </div>
                        </td>

                        <td className="py-2.5 px-3 font-mono">
                          <span className={`px-1.5 py-0.5 rounded font-bold text-[11px] ${
                            stock.investingProScore >= 4.0
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                              : stock.investingProScore >= 3.0
                              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                              : 'bg-rose-500/10 text-rose-500'
                          }`}>
                            ⭐ {stock.investingProScore.toFixed(1)} / 5
                          </span>
                        </td>

                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1">
                            <span className={`px-1 py-0.2 rounded text-[9px] font-bold ${
                              stock.priceAboveSma50 ? 'bg-emerald-500/15 text-emerald-500' : 'bg-rose-500/15 text-rose-500'
                            }`}>
                              50d
                            </span>
                            <span className={`px-1 py-0.2 rounded text-[9px] font-bold ${
                              stock.priceAboveSma200 ? 'bg-emerald-500/15 text-emerald-500' : 'bg-rose-500/15 text-rose-500'
                            }`}>
                              200d
                            </span>
                          </div>
                        </td>

                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => {
                                onSelectTicker(stock.symbol);
                                onNavigatePage('chart');
                              }}
                              className="p-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] hover:bg-blue-600 hover:text-white transition cursor-pointer"
                              title={`Apri ${stock.symbol} nel Grafico`}
                            >
                              <TrendingUp className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => {
                                onSelectTicker(stock.symbol);
                                onNavigatePage('fundamental');
                              }}
                              className="p-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] hover:bg-indigo-600 hover:text-white transition cursor-pointer"
                              title={`Apri ${stock.symbol} in Analisi Fondamentale`}
                            >
                              <BarChart3 className="w-3.5 h-3.5 text-indigo-500" />
                            </button>

                            <button
                              onClick={() => {
                                onSelectTicker(stock.symbol);
                                onNavigatePage('news');
                              }}
                              className="p-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] hover:bg-teal-600 hover:text-white transition cursor-pointer"
                              title={`Apri ${stock.symbol} in NewsAI`}
                            >
                              <Newspaper className="w-3.5 h-3.5 text-teal-500" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
