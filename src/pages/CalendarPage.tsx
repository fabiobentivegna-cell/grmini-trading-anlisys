import React, { useState, useEffect } from 'react';
import { Calendar, RefreshCw, AlertCircle, Search, Filter } from 'lucide-react';
import { EconomicCalendarData } from '../types';
import { marketDataService } from '../services/marketDataService';

export const CalendarPage: React.FC = () => {
  const [calendar, setCalendar] = useState<EconomicCalendarData | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [impactFilter, setImpactFilter] = useState<'ALL' | 'ALTO' | 'MEDIO'>('ALL');

  const loadCalendar = async () => {
    setLoading(true);
    try {
      const data = await marketDataService.getEconomicCalendar();
      setCalendar(data);
    } catch (e) {
      console.error('Errore calendario:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCalendar();
  }, []);

  const filterEvents = (events: any[]) => {
    return events.filter(ev => {
      const matchesSearch =
        ev.event.toLowerCase().includes(searchFilter.toLowerCase()) ||
        ev.country.toLowerCase().includes(searchFilter.toLowerCase());
      const matchesImpact = impactFilter === 'ALL' || ev.impact === impactFilter;
      return matchesSearch && matchesImpact;
    });
  };

  const getImpactColor = (impact: string) => {
    if (impact === 'ALTO') return 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30';
    if (impact === 'MEDIO') return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30';
    return 'bg-blue-500/15 text-blue-600 border-blue-500/30';
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[var(--bg-main)]">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header Banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-xs">
          <div>
            <h2 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              <span>Calendario Economico Globale & Rilasci Macro</span>
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Decisioni sui tassi di interesse (FED, BCE), inflazione CPI, Non-Farm Payrolls e dati sul PIL
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-[var(--text-muted)]" />
              <input
                type="text"
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
                placeholder="Cerca evento o paese..."
                className="pl-8 pr-3 py-1 text-xs rounded-lg border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] outline-none w-48"
              />
            </div>

            <select
              value={impactFilter}
              onChange={e => setImpactFilter(e.target.value as any)}
              className="px-2.5 py-1 text-xs rounded-lg border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] outline-none font-semibold"
            >
              <option value="ALL">Tutti gli impatti</option>
              <option value="ALTO">Solo Alto Impatto</option>
              <option value="MEDIO">Medio Impatto</option>
            </select>

            <button
              onClick={loadCalendar}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs transition shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Aggiorna</span>
            </button>
          </div>
        </div>

        {/* 1. Prossimi Rilasci in Arrivo */}
        <div className="p-5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-xs space-y-3">
          <div className="flex items-center gap-2 border-b border-[var(--border-color)] pb-3">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-blue-500">
              Prossimi Dati Macroeconomici in Arrivo (Previsioni & Consenso)
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)] uppercase text-[10px]">
                  <th className="py-2.5 px-3">Data & Ora</th>
                  <th className="py-2.5 px-3">Paese</th>
                  <th className="py-2.5 px-3">Evento Macroeconomico</th>
                  <th className="py-2.5 px-3">Impatto</th>
                  <th className="py-2.5 px-3">Precedente</th>
                  <th className="py-2.5 px-3">Previsione / Consenso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {calendar && filterEvents(calendar.upcoming_events).length > 0 ? (
                  filterEvents(calendar.upcoming_events).map((ev, idx) => (
                    <tr key={idx} className="hover:bg-[var(--bg-main)] transition">
                      <td className="py-2.5 px-3 font-mono font-bold text-[var(--text-main)]">{ev.date}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-main)]">
                          {ev.country}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-[var(--text-main)]">{ev.event}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getImpactColor(ev.impact)}`}>
                          ● {ev.impact}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[var(--text-muted)]">{ev.previous}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-blue-500">{ev.forecast}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-[var(--text-muted)]">
                      Nessun evento in programma con i filtri selezionati.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 2. Dati Pregressi Rilasciati */}
        <div className="p-5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-xs space-y-3">
          <div className="flex items-center gap-2 border-b border-[var(--border-color)] pb-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-emerald-500">
              Dati Pregressi Rilasciati di Recente (Effettivo vs Stima di Consenso)
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)] uppercase text-[10px]">
                  <th className="py-2.5 px-3">Data</th>
                  <th className="py-2.5 px-3">Paese</th>
                  <th className="py-2.5 px-3">Evento Macroeconomico</th>
                  <th className="py-2.5 px-3">Impatto</th>
                  <th className="py-2.5 px-3">Precedente</th>
                  <th className="py-2.5 px-3">Previsione</th>
                  <th className="py-2.5 px-3">Rilevato (Effettivo)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {calendar && filterEvents(calendar.past_events).length > 0 ? (
                  filterEvents(calendar.past_events).map((ev, idx) => (
                    <tr key={idx} className="hover:bg-[var(--bg-main)] transition">
                      <td className="py-2.5 px-3 font-mono font-bold text-[var(--text-main)]">{ev.date}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-main)]">
                          {ev.country}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-[var(--text-main)]">{ev.event}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getImpactColor(ev.impact)}`}>
                          ● {ev.impact}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[var(--text-muted)]">{ev.previous}</td>
                      <td className="py-2.5 px-3 font-mono text-[var(--text-muted)]">{ev.forecast}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-emerald-500">{ev.actual}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-xs text-[var(--text-muted)]">
                      Nessun dato storico trovato con i filtri correnti.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
