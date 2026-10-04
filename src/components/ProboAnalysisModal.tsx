import React, { useState } from 'react';
import {
  BrainCircuit,
  BookOpen,
  X,
  Camera,
  Upload,
  Sliders
} from 'lucide-react';
import { CandleData, IndicatorConfig, ProboAnalysisReport as ProboAnalysisReportType } from '../types';
import { geminiService } from '../services/geminiService';
import { storageService } from '../services/storageService';
import { ProboAnalysisReport } from './ProboAnalysisReport';

interface ProboAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticker: string;
  timeframe: string;
  currentPrice: number;
  candles: CandleData[];
  onApplyProboPreset?: (config: IndicatorConfig) => void;
  onCaptureChartScreenshot?: () => Promise<string | null>;
}

export const ProboAnalysisModal: React.FC<ProboAnalysisModalProps> = ({
  isOpen,
  onClose,
  ticker,
  timeframe,
  currentPrice,
  candles,
  onApplyProboPreset,
  onCaptureChartScreenshot
}) => {
  const [report, setReport] = useState<ProboAnalysisReportType | null>(null);
  const [loading, setLoading] = useState(false);
  const [screenshotData, setScreenshotData] = useState<string | null>(null);
  const [customNotes, setCustomNotes] = useState('');
  const [presetApplied, setPresetApplied] = useState(false);

  if (!isOpen) return null;

  const handleApplyPreset = () => {
    if (!onApplyProboPreset) return;
    const base = storageService.getIndicatorConfig();
    const proboConfig: IndicatorConfig = {
      ...base,
      movingAverages: [
        { id: 'ma_probo_5', enabled: true, type: 'EMA', period: 5, color: '#2962ff', width: 2 },
        { id: 'ma_probo_20', enabled: true, type: 'EMA', period: 20, color: '#ff9800', width: 2 }
      ],
      bbEnabled: true,
      bbLen: 5, // Media Mobile a 5 periodi
      bbStd: 1.8, // Deviazione Standard a 1.8
      stochEnabled: true,
      stochK: 10, // Stocastico Lento 10-6-3
      stochD: 6,
      stochKColor: '#2962ff',
      stochDColor: '#f23645',
      stochOverbought: 75, // Fascia 75
      stochOverboughtColor: '#f23645',
      stochMid: 50,
      stochMidColor: '#787b86',
      stochOversold: 25, // Fascia 25
      stochOversoldColor: '#089981',
      smcEnabled: true,
      smcShowBosChoch: true,
      smcShowFvg: true,
      smcShowOrderBlocks: true,
      smcShowLiquiditySweeps: true
    };

    onApplyProboPreset(proboConfig);
    setPresetApplied(true);
    setTimeout(() => setPresetApplied(false), 3000);
  };

  const handleCaptureAndAnalyze = async () => {
    setLoading(true);
    try {
      let imageBase64 = screenshotData;
      if (!imageBase64 && onCaptureChartScreenshot) {
        imageBase64 = await onCaptureChartScreenshot();
        if (imageBase64) setScreenshotData(imageBase64);
      }

      const res = await geminiService.generateProboAnalysis({
        ticker,
        timeframe,
        currentPrice,
        candles,
        imageBase64: imageBase64 || undefined,
        customNotes: customNotes || undefined
      });
      setReport(res);
    } catch (e) {
      console.error('Errore analisi Probo:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const b64 = reader.result as string;
      setScreenshotData(b64);
    };
    reader.readAsDataURL(file);
  };

  const isBull = report ? report.operationVerdict === 'BUY' : true;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 md:p-6 overflow-y-auto animate-in fade-in duration-200 select-none">
      <div className="bg-[var(--bg-header)] border border-blue-500/40 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden text-xs text-[var(--text-main)]">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-blue-950/80 via-indigo-950/70 to-[var(--bg-header)] border-b border-[var(--border-color)]">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/30">
              <BookOpen className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-sm md:text-base font-black uppercase tracking-wide text-white flex items-center gap-2">
                <span>Analisi AI Metodologia Giacomo Probo</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-mono font-bold">
                  {ticker} • {timeframe.toUpperCase()}
                </span>
              </h2>
              <p className="text-[10.5px] text-[var(--text-muted)] mt-0.5">
                Confluenza delle 5 Tecniche, Stocastico Lento 10-6-3, Bollinger 5/1.8 e Scaling Out 50%
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleApplyPreset}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition cursor-pointer ${
                presetApplied
                  ? 'bg-emerald-600 text-white border-emerald-500'
                  : 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border-blue-500/40'
              }`}
              title="Configura automaticamente Stocastico 10-6-3, Bollinger 5/1.8 e Heiken Ashi sul grafico"
            >
              <Sliders className="w-3.5 h-3.5 text-blue-400" />
              <span>{presetApplied ? '✓ Preset Probo Applicato!' : 'Applica Preset Grafico Probo'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/10 text-[var(--text-muted)] hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 md:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Quick Action & Screenshot Bar */}
          <div className="p-3 rounded-xl bg-gradient-to-r from-blue-950/30 to-indigo-950/30 border border-blue-500/30 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-blue-400" />
                <span>Screenshot Grafico:</span>
              </span>
              {screenshotData ? (
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold text-[10px]">
                  ✓ Screenshot Acquisito
                </span>
              ) : (
                <span className="text-[11px] text-[var(--text-muted)]">
                  Nessun screenshot allegato (verranno utilizzati i dati OHLCV correnti)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <label className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--border-color)] text-[var(--text-muted)] hover:text-white font-semibold text-xs transition cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-blue-400" />
                <span>Carica Immagine</span>
                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </label>

              <button
                onClick={handleCaptureAndAnalyze}
                disabled={loading}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-black text-xs shadow-md shadow-blue-500/20 transition cursor-pointer disabled:opacity-50"
              >
                <BrainCircuit className={`w-4 h-4 ${loading ? 'animate-spin' : 'text-amber-300'}`} />
                <span>{loading ? 'Elaborazione Probo AI...' : report ? 'Rianalizza Grafico' : 'Avvia Analisi Probo AI'}</span>
              </button>
            </div>
          </div>

          {/* Screenshot Preview if available */}
          {screenshotData && (
            <div className="p-2 rounded-xl bg-black/40 border border-[var(--border-color)] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <img src={screenshotData} alt="Chart screenshot preview" className="h-14 w-28 object-cover rounded-lg border border-[var(--border-color)]" />
                <span className="text-[11px] text-[var(--text-muted)]">Screenshot pronto per l'analisi multimodale con Gemini AI</span>
              </div>
              <button
                onClick={() => setScreenshotData(null)}
                className="text-rose-400 hover:text-rose-300 font-bold text-[10px] cursor-pointer"
              >
                Rimuovi
              </button>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="py-16 flex flex-col items-center justify-center gap-3">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-4 border-blue-500/30 border-t-blue-500 animate-spin" />
                <BookOpen className="w-6 h-6 text-blue-400 absolute inset-0 m-auto" />
              </div>
              <div className="text-sm font-bold text-white">Analisi Metodologia Giacomo Probo in corso...</div>
              <div className="text-xs text-[var(--text-muted)] max-w-md text-center">
                Verifica della Confluenza delle 5 Tecniche: Grafica Classica, Candlestick & Heiken Ashi, Medie Mobili, Stocastico Lento 10-6-3, Bande di Bollinger 5/1.8 e Volume Profile.
              </div>
            </div>
          )}

          {/* Results Section */}
          {!loading && report && (
            <ProboAnalysisReport report={report} />
          )}

          {/* Initial Instructions if not analyzed yet */}
          {!loading && !report && (
            <div className="py-8 px-4 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-center mx-auto text-blue-400">
                <BookOpen className="w-8 h-8" />
              </div>
              <div className="space-y-1 max-w-lg mx-auto">
                <h3 className="text-sm font-bold text-white">Pronto per l'Analisi AI Giacomo Probo</h3>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  Clicca su <strong>"Avvia Analisi Probo AI"</strong> per analizzare la confluenza delle 5 tecniche sul grafico corrente ({ticker} [{timeframe.toUpperCase()}]), oppure carica uno screenshot personalizzato.
                </p>
              </div>
              <button
                onClick={handleCaptureAndAnalyze}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-500/20 transition cursor-pointer"
              >
                Avvia Analisi Adesso
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
