import React from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { IndicatorConfig, MovingAverageConfig } from '../types';

interface IndicatorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: IndicatorConfig;
  onChange: (newConfig: IndicatorConfig) => void;
}

export const IndicatorsModal: React.FC<IndicatorsModalProps> = ({
  isOpen,
  onClose,
  config,
  onChange
}) => {
  if (!isOpen) return null;

  const handleMaChange = (id: string, updates: Partial<MovingAverageConfig>) => {
    const updatedMAs = config.movingAverages.map(m => (m.id === id ? { ...m, ...updates } : m));
    onChange({ ...config, movingAverages: updatedMAs });
  };

  const handleAddMa = () => {
    const colors = ['#089981', '#f23645', '#ff9800', '#ab47bc', '#2962ff', '#00e676'];
    const nextColor = colors[config.movingAverages.length % colors.length];
    const newMa: MovingAverageConfig = {
      id: `ma_${Date.now()}`,
      enabled: true,
      type: 'SMA',
      period: 20 * (config.movingAverages.length + 1),
      color: nextColor,
      width: 2
    };
    onChange({ ...config, movingAverages: [...config.movingAverages, newMa] });
  };

  const handleRemoveMa = (id: string) => {
    onChange({
      ...config,
      movingAverages: config.movingAverages.filter(m => m.id !== id)
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-[var(--bg-header)] border border-[var(--border-color)] rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden text-xs">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)]">
          <h3 className="font-bold text-sm text-[var(--text-main)] uppercase tracking-wide">
            Configura Indicatori & Oscillatori
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {/* 1. Medie Mobili */}
          <div className="border-b border-[var(--border-color)] pb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold uppercase text-[11px] text-[var(--text-muted)]">
                Medie Mobili Personalizzabili
              </span>
              <button
                onClick={handleAddMa}
                className="flex items-center gap-1 px-2 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[11px] transition cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Aggiungi Media</span>
              </button>
            </div>

            <div className="space-y-1.5">
              {config.movingAverages.map(ma => (
                <div
                  key={ma.id}
                  className="flex items-center gap-2 p-1.5 rounded bg-[var(--bg-card)] border border-[var(--border-color)]"
                >
                  <input
                    type="checkbox"
                    checked={ma.enabled}
                    onChange={e => handleMaChange(ma.id, { enabled: e.target.checked })}
                    className="cursor-pointer"
                  />
                  <select
                    value={ma.type}
                    onChange={e => handleMaChange(ma.id, { type: e.target.value as any })}
                    className="px-1.5 py-0.5 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] font-semibold"
                  >
                    <option value="SMA">SMA</option>
                    <option value="EMA">EMA</option>
                  </select>
                  <input
                    type="number"
                    value={ma.period}
                    min={1}
                    max={500}
                    onChange={e => handleMaChange(ma.id, { period: parseInt(e.target.value) || 20 })}
                    className="w-14 px-1.5 py-0.5 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] text-center font-mono"
                  />
                  <input
                    type="color"
                    value={ma.color}
                    onChange={e => handleMaChange(ma.id, { color: e.target.value })}
                    className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent"
                  />
                  <select
                    value={ma.width}
                    onChange={e => handleMaChange(ma.id, { width: parseInt(e.target.value) || 2 })}
                    className="px-1.5 py-0.5 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)]"
                  >
                    <option value="1">1px</option>
                    <option value="2">2px</option>
                    <option value="3">3px</option>
                    <option value="4">4px</option>
                  </select>
                  <button
                    onClick={() => handleRemoveMa(ma.id)}
                    className="p-1 rounded text-red-500 hover:bg-red-500/10 transition ml-auto cursor-pointer"
                    title="Rimuovi"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Overlay Grafico */}
          <div className="border-b border-[var(--border-color)] pb-3 space-y-2">
            <span className="font-bold uppercase text-[11px] text-[var(--text-muted)] block">
              Overlay Grafico (Trend & Volatilità)
            </span>

            {/* Bollinger */}
            <div className="flex items-center justify-between p-2 rounded bg-[var(--bg-card)] border border-[var(--border-color)]">
              <label className="flex items-center gap-2 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={config.bbEnabled}
                  onChange={e => onChange({ ...config, bbEnabled: e.target.checked })}
                />
                <span>Bande di Bollinger</span>
              </label>
              <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
                <span>Len:</span>
                <input
                  type="number"
                  value={config.bbLen}
                  onChange={e => onChange({ ...config, bbLen: parseInt(e.target.value) || 20 })}
                  className="w-12 px-1 py-0.5 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] text-center"
                />
                <span>Dev:</span>
                <input
                  type="number"
                  step="0.5"
                  value={config.bbStd}
                  onChange={e => onChange({ ...config, bbStd: parseFloat(e.target.value) || 2.0 })}
                  className="w-12 px-1 py-0.5 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] text-center"
                />
              </div>
            </div>

            {/* Parabolic SAR */}
            <div className="flex items-center justify-between p-2 rounded bg-[var(--bg-card)] border border-[var(--border-color)]">
              <label className="flex items-center gap-2 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={config.sarEnabled}
                  onChange={e => onChange({ ...config, sarEnabled: e.target.checked })}
                />
                <span>Parabolic SAR</span>
              </label>
              <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
                <span>Step:</span>
                <input
                  type="number"
                  step="0.01"
                  value={config.sarStep}
                  onChange={e => onChange({ ...config, sarStep: parseFloat(e.target.value) || 0.02 })}
                  className="w-14 px-1 py-0.5 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] text-center"
                />
                <span>Max:</span>
                <input
                  type="number"
                  step="0.05"
                  value={config.sarMax}
                  onChange={e => onChange({ ...config, sarMax: parseFloat(e.target.value) || 0.2 })}
                  className="w-14 px-1 py-0.5 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] text-center"
                />
              </div>
            </div>

            {/* Supertrend */}
            <div className="flex items-center justify-between p-2 rounded bg-[var(--bg-card)] border border-[var(--border-color)]">
              <label className="flex items-center gap-2 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={config.supertrendEnabled}
                  onChange={e => onChange({ ...config, supertrendEnabled: e.target.checked })}
                />
                <span>Supertrend</span>
              </label>
              <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
                <span>Periodo:</span>
                <input
                  type="number"
                  value={config.supertrendPeriod}
                  onChange={e => onChange({ ...config, supertrendPeriod: parseInt(e.target.value) || 10 })}
                  className="w-12 px-1 py-0.5 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] text-center"
                />
                <span>Mult:</span>
                <input
                  type="number"
                  step="0.5"
                  value={config.supertrendMult}
                  onChange={e => onChange({ ...config, supertrendMult: parseFloat(e.target.value) || 3.0 })}
                  className="w-12 px-1 py-0.5 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] text-center"
                />
              </div>
            </div>

            {/* Trailing Stop Loss ATR */}
            <div className="flex items-center justify-between p-2 rounded bg-[var(--bg-card)] border border-[var(--border-color)]">
              <label className="flex items-center gap-2 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={config.atrTslEnabled}
                  onChange={e => onChange({ ...config, atrTslEnabled: e.target.checked })}
                />
                <span>ATR Trailing Stop Loss</span>
              </label>
              <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
                <span>Mult:</span>
                <input
                  type="number"
                  step="0.5"
                  value={config.atrTslMult}
                  onChange={e => onChange({ ...config, atrTslMult: parseFloat(e.target.value) || 2.0 })}
                  className="w-12 px-1 py-0.5 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] text-center"
                />
                <input
                  type="color"
                  value={config.atrTslColor}
                  onChange={e => onChange({ ...config, atrTslColor: e.target.value })}
                  className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent"
                />
              </div>
            </div>

            {/* Ichimoku Kinko Hyo */}
            <div className="p-2 rounded bg-[var(--bg-card)] border border-[var(--border-color)] space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer font-medium">
                  <input
                    type="checkbox"
                    checked={!!config.ichimokuEnabled}
                    onChange={e => onChange({ ...config, ichimokuEnabled: e.target.checked })}
                  />
                  <span>☁️ Ichimoku Kinko Hyo (Nuvola Kumo)</span>
                </label>
                <div className="flex items-center gap-1 text-[var(--text-muted)]">
                  <span>Tenkan:</span>
                  <input
                    type="number"
                    value={config.ichimokuConversionPeriod || 9}
                    onChange={e => onChange({ ...config, ichimokuConversionPeriod: parseInt(e.target.value) || 9 })}
                    className="w-10 px-1 py-0.5 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] text-center"
                  />
                  <span>Kijun:</span>
                  <input
                    type="number"
                    value={config.ichimokuBasePeriod || 26}
                    onChange={e => onChange({ ...config, ichimokuBasePeriod: parseInt(e.target.value) || 26 })}
                    className="w-10 px-1 py-0.5 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] text-center"
                  />
                  <span>Span B:</span>
                  <input
                    type="number"
                    value={config.ichimokuSpanBPeriod || 52}
                    onChange={e => onChange({ ...config, ichimokuSpanBPeriod: parseInt(e.target.value) || 52 })}
                    className="w-10 px-1 py-0.5 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] text-center"
                  />
                </div>
              </div>
            </div>

            {/* Pivot Points */}
            <div className="p-2 rounded bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={!!config.pivotEnabled}
                  onChange={e => onChange({ ...config, pivotEnabled: e.target.checked })}
                />
                <span>🎯 Pivot Points (Supporti & Resistenze)</span>
              </label>
              <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
                <span>Tipo:</span>
                <select
                  value={config.pivotType || 'STANDARD'}
                  onChange={e => onChange({ ...config, pivotType: e.target.value as any })}
                  className="px-1.5 py-0.5 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] font-semibold"
                >
                  <option value="STANDARD">Standard Floor</option>
                  <option value="FIBONACCI">Fibonacci</option>
                  <option value="CAMARILLA">Camarilla</option>
                </select>
              </div>
            </div>

            {/* Keltner Channels */}
            <div className="p-2 rounded bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={!!config.keltnerEnabled}
                  onChange={e => onChange({ ...config, keltnerEnabled: e.target.checked })}
                />
                <span>📊 Canali di Keltner (EMA + ATR)</span>
              </label>
              <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
                <span>Periodo:</span>
                <input
                  type="number"
                  value={config.keltnerPeriod || 20}
                  onChange={e => onChange({ ...config, keltnerPeriod: parseInt(e.target.value) || 20 })}
                  className="w-12 px-1 py-0.5 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] text-center"
                />
                <span>Mult:</span>
                <input
                  type="number"
                  step="0.1"
                  value={config.keltnerMult || 1.5}
                  onChange={e => onChange({ ...config, keltnerMult: parseFloat(e.target.value) || 1.5 })}
                  className="w-12 px-1 py-0.5 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] text-center"
                />
              </div>
            </div>

            {/* VWAP */}
            <div className="p-2 rounded bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={!!config.vwapEnabled}
                  onChange={e => onChange({ ...config, vwapEnabled: e.target.checked })}
                />
                <span>⚖️ VWAP (Volume Weighted Average Price con Deviazioni)</span>
              </label>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/15 text-blue-500 font-bold">
                {config.vwapEnabled ? 'ATTIVO (±1σ, ±2σ)' : 'DISATTIVO'}
              </span>
            </div>

            {/* AI Sentiment Background Overlay */}
            <div className="p-2.5 rounded-lg bg-linear-to-r from-emerald-500/10 via-blue-500/10 to-rose-500/10 border border-blue-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-[var(--text-main)]">
                  <input
                    type="checkbox"
                    checked={!!config.sentimentOverlayEnabled}
                    onChange={e => onChange({ ...config, sentimentOverlayEnabled: e.target.checked })}
                  />
                  <span>🧠 Overlay Sentiment AI sul Grafico</span>
                </label>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-600/20 text-blue-500 border border-blue-500/30">
                  {config.sentimentOverlayEnabled ? 'ATTIVO' : 'DISATTIVO'}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] pl-5">
                <span>Intensità Trasparenza:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0.10"
                    max="0.50"
                    step="0.05"
                    value={config.sentimentOverlayOpacity ?? 0.25}
                    onChange={e => onChange({ ...config, sentimentOverlayOpacity: parseFloat(e.target.value) || 0.25 })}
                    className="w-24 cursor-pointer accent-blue-500 h-1.5 bg-[var(--input-bg)] rounded"
                  />
                  <span className="font-mono text-xs font-bold text-[var(--text-main)] w-8 text-right">
                    {Math.round((config.sentimentOverlayOpacity ?? 0.25) * 100)}%
                  </span>
                </div>
              </div>

              <p className="text-[10px] text-[var(--text-muted)] pl-5 leading-relaxed">
                Colora lo sfondo di ogni barra di prezzo in base al punteggio di Sentiment elaborato da Gemini AI (Verde = Bullish, Rosso = Bearish).
              </p>
            </div>

            {/* Smart Money Concepts (SMC) & Market Structure */}
            <div className="p-3 rounded-xl bg-gradient-to-r from-blue-950/40 via-indigo-950/40 to-purple-950/40 border border-blue-500/40 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-white">
                  <input
                    type="checkbox"
                    checked={config.smcEnabled ?? true}
                    onChange={e => onChange({ ...config, smcEnabled: e.target.checked })}
                  />
                  <span>💎 Smart Money Concepts & Price Action Automatica</span>
                </label>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                  (config.smcEnabled ?? true) ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                }`}>
                  {(config.smcEnabled ?? true) ? 'ATTIVO' : 'DISATTIVO'}
                </span>
              </div>

              {(config.smcEnabled ?? true) && (
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[var(--border-color)]/60 text-[11px]">
                  <label className="flex items-center gap-2 cursor-pointer text-[var(--text-main)]">
                    <input
                      type="checkbox"
                      checked={config.smcShowBosChoch ?? true}
                      onChange={e => onChange({ ...config, smcShowBosChoch: e.target.checked })}
                    />
                    <span>Rilevamento BOS & CHoCH</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-[var(--text-main)]">
                    <input
                      type="checkbox"
                      checked={config.smcShowOrderBlocks ?? true}
                      onChange={e => onChange({ ...config, smcShowOrderBlocks: e.target.checked })}
                    />
                    <span>Order Blocks Istituzionali</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-[var(--text-main)]">
                    <input
                      type="checkbox"
                      checked={config.smcShowFvg ?? true}
                      onChange={e => onChange({ ...config, smcShowFvg: e.target.checked })}
                    />
                    <span>Fair Value Gaps (FVG)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-[var(--text-main)]">
                    <input
                      type="checkbox"
                      checked={config.smcShowLiquiditySweeps ?? true}
                      onChange={e => onChange({ ...config, smcShowLiquiditySweeps: e.target.checked })}
                    />
                    <span>Liquidity Sweeps (Wick Break)</span>
                  </label>
                </div>
              )}
            </div>

            {/* Multi-Timeframe Confluence Hub */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg-card)] border border-blue-500/30">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-[var(--text-main)]">
                <input
                  type="checkbox"
                  checked={config.multiTimeframeHubEnabled ?? true}
                  onChange={e => onChange({ ...config, multiTimeframeHubEnabled: e.target.checked })}
                />
                <span>🌐 Multi-Timeframe Confluence Hub (HUD 15m, 1h, 4h, 1d)</span>
              </label>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 font-bold">
                {(config.multiTimeframeHubEnabled ?? true) ? 'MOSTRA HUD' : 'NASCONDI'}
              </span>
            </div>
          </div>

          {/* 3. Oscillatori Spaziati */}
          <div className="space-y-3">
            <span className="font-bold uppercase text-[11px] text-[var(--text-muted)] block">
              Oscillatori Sotto-Grafico (Personalizzabili)
            </span>

            {/* RSI */}
            <div className="p-2 rounded bg-[var(--bg-card)] border border-[var(--border-color)] space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer font-medium">
                  <input
                    type="checkbox"
                    checked={config.rsiEnabled}
                    onChange={e => onChange({ ...config, rsiEnabled: e.target.checked })}
                  />
                  <span>RSI (Relative Strength Index)</span>
                </label>
                <div className="flex items-center gap-1 text-[var(--text-muted)]">
                  <span>Len:</span>
                  <input
                    type="number"
                    value={config.rsiLen}
                    onChange={e => onChange({ ...config, rsiLen: parseInt(e.target.value) || 14 })}
                    className="w-12 px-1 py-0.5 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] text-center"
                  />
                  <input
                    type="color"
                    value={config.rsiColor}
                    onChange={e => onChange({ ...config, rsiColor: e.target.value })}
                    className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent"
                  />
                  <select
                    value={config.rsiWidth}
                    onChange={e => onChange({ ...config, rsiWidth: parseInt(e.target.value) || 2 })}
                    className="px-1 py-0.5 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)]"
                  >
                    <option value="1">1px</option>
                    <option value="2">2px</option>
                    <option value="3">3px</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-[var(--text-muted)] pl-5">
                <div className="flex items-center gap-1">
                  <span>OB:</span>
                  <input
                    type="number"
                    value={config.rsiOverbought}
                    onChange={e => onChange({ ...config, rsiOverbought: parseInt(e.target.value) || 70 })}
                    className="w-10 px-1 py-0.5 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] text-center"
                  />
                  <input
                    type="color"
                    value={config.rsiOverboughtColor}
                    onChange={e => onChange({ ...config, rsiOverboughtColor: e.target.value })}
                    className="w-4 h-4 rounded cursor-pointer border-0 bg-transparent"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <span>MID:</span>
                  <input
                    type="number"
                    value={config.rsiMid}
                    onChange={e => onChange({ ...config, rsiMid: parseInt(e.target.value) || 50 })}
                    className="w-10 px-1 py-0.5 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] text-center"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <span>OS:</span>
                  <input
                    type="number"
                    value={config.rsiOversold}
                    onChange={e => onChange({ ...config, rsiOversold: parseInt(e.target.value) || 30 })}
                    className="w-10 px-1 py-0.5 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] text-center"
                  />
                  <input
                    type="color"
                    value={config.rsiOversoldColor}
                    onChange={e => onChange({ ...config, rsiOversoldColor: e.target.value })}
                    className="w-4 h-4 rounded cursor-pointer border-0 bg-transparent"
                  />
                </div>
              </div>
            </div>

            {/* MACD */}
            <div className="p-2 rounded bg-[var(--bg-card)] border border-[var(--border-color)] space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer font-medium">
                  <input
                    type="checkbox"
                    checked={config.macdEnabled}
                    onChange={e => onChange({ ...config, macdEnabled: e.target.checked })}
                  />
                  <span>MACD</span>
                </label>
                <div className="flex items-center gap-1 text-[var(--text-muted)]">
                  <span>F:</span>
                  <input
                    type="number"
                    value={config.macdFast}
                    onChange={e => onChange({ ...config, macdFast: parseInt(e.target.value) || 12 })}
                    className="w-10 px-1 py-0.5 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] text-center"
                  />
                  <span>S:</span>
                  <input
                    type="number"
                    value={config.macdSlow}
                    onChange={e => onChange({ ...config, macdSlow: parseInt(e.target.value) || 26 })}
                    className="w-10 px-1 py-0.5 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] text-center"
                  />
                  <span>Sig:</span>
                  <input
                    type="number"
                    value={config.macdSig}
                    onChange={e => onChange({ ...config, macdSig: parseInt(e.target.value) || 9 })}
                    className="w-10 px-1 py-0.5 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] text-center"
                  />
                </div>
              </div>
              <div className="flex items-center gap-4 text-[11px] text-[var(--text-muted)] pl-5">
                <div className="flex items-center gap-1">
                  <span>Linea MACD:</span>
                  <input
                    type="color"
                    value={config.macdColor}
                    onChange={e => onChange({ ...config, macdColor: e.target.value })}
                    className="w-4 h-4 rounded cursor-pointer border-0 bg-transparent"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <span>Segnale:</span>
                  <input
                    type="color"
                    value={config.macdSigColor}
                    onChange={e => onChange({ ...config, macdSigColor: e.target.value })}
                    className="w-4 h-4 rounded cursor-pointer border-0 bg-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Stocastico */}
            <div className="p-2 rounded bg-[var(--bg-card)] border border-[var(--border-color)] space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer font-medium">
                  <input
                    type="checkbox"
                    checked={config.stochEnabled}
                    onChange={e => onChange({ ...config, stochEnabled: e.target.checked })}
                  />
                  <span>Stocastico (%K / %D)</span>
                </label>
                <div className="flex items-center gap-1 text-[var(--text-muted)]">
                  <span>%K:</span>
                  <input
                    type="number"
                    value={config.stochK}
                    onChange={e => onChange({ ...config, stochK: parseInt(e.target.value) || 14 })}
                    className="w-10 px-1 py-0.5 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] text-center"
                  />
                  <input
                    type="color"
                    value={config.stochKColor}
                    onChange={e => onChange({ ...config, stochKColor: e.target.value })}
                    className="w-4 h-4 rounded cursor-pointer border-0 bg-transparent"
                  />
                  <span>%D:</span>
                  <input
                    type="number"
                    value={config.stochD}
                    onChange={e => onChange({ ...config, stochD: parseInt(e.target.value) || 3 })}
                    className="w-10 px-1 py-0.5 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] text-center"
                  />
                  <input
                    type="color"
                    value={config.stochDColor}
                    onChange={e => onChange({ ...config, stochDColor: e.target.value })}
                    className="w-4 h-4 rounded cursor-pointer border-0 bg-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Stochastic RSI */}
            <div className="p-2 rounded bg-[var(--bg-card)] border border-[var(--border-color)] space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer font-medium">
                  <input
                    type="checkbox"
                    checked={!!config.stochRsiEnabled}
                    onChange={e => onChange({ ...config, stochRsiEnabled: e.target.checked })}
                  />
                  <span>Stochastic RSI (%K / %D)</span>
                </label>
                <div className="flex items-center gap-1 text-[var(--text-muted)]">
                  <span>Len:</span>
                  <input
                    type="number"
                    value={config.stochRsiLen || 14}
                    onChange={e => onChange({ ...config, stochRsiLen: parseInt(e.target.value) || 14 })}
                    className="w-10 px-1 py-0.5 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] text-center"
                  />
                  <span>%K:</span>
                  <input
                    type="number"
                    value={config.stochRsiK || 3}
                    onChange={e => onChange({ ...config, stochRsiK: parseInt(e.target.value) || 3 })}
                    className="w-8 px-1 py-0.5 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] text-center"
                  />
                  <span>%D:</span>
                  <input
                    type="number"
                    value={config.stochRsiD || 3}
                    onChange={e => onChange({ ...config, stochRsiD: parseInt(e.target.value) || 3 })}
                    className="w-8 px-1 py-0.5 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] text-center"
                  />
                </div>
              </div>
            </div>

            {/* ADX / DMI */}
            <div className="p-2 rounded bg-[var(--bg-card)] border border-[var(--border-color)] space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer font-medium">
                  <input
                    type="checkbox"
                    checked={config.adxEnabled}
                    onChange={e => onChange({ ...config, adxEnabled: e.target.checked })}
                  />
                  <span>ADX / DMI (+DI / -DI)</span>
                </label>
                <div className="flex items-center gap-1 text-[var(--text-muted)]">
                  <span>Len:</span>
                  <input
                    type="number"
                    value={config.adxLen}
                    onChange={e => onChange({ ...config, adxLen: parseInt(e.target.value) || 14 })}
                    className="w-10 px-1 py-0.5 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] text-center"
                  />
                  <span className="text-[10px]">ADX:</span>
                  <input
                    type="color"
                    value={config.adxColor}
                    onChange={e => onChange({ ...config, adxColor: e.target.value })}
                    className="w-4 h-4 rounded cursor-pointer border-0 bg-transparent"
                  />
                  <span className="text-[10px]">+DI:</span>
                  <input
                    type="color"
                    value={config.plusDiColor}
                    onChange={e => onChange({ ...config, plusDiColor: e.target.value })}
                    className="w-4 h-4 rounded cursor-pointer border-0 bg-transparent"
                  />
                  <span className="text-[10px]">-DI:</span>
                  <input
                    type="color"
                    value={config.minusDiColor}
                    onChange={e => onChange({ ...config, minusDiColor: e.target.value })}
                    className="w-4 h-4 rounded cursor-pointer border-0 bg-transparent"
                  />
                </div>
              </div>
            </div>

            {/* ATR */}
            <div className="p-2 rounded bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={config.atrEnabled}
                  onChange={e => onChange({ ...config, atrEnabled: e.target.checked })}
                />
                <span>ATR (Average True Range)</span>
              </label>
              <div className="flex items-center gap-1 text-[var(--text-muted)]">
                <span>Periodo:</span>
                <input
                  type="number"
                  value={config.atrLen}
                  onChange={e => onChange({ ...config, atrLen: parseInt(e.target.value) || 14 })}
                  className="w-10 px-1 py-0.5 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)] text-center"
                />
                <input
                  type="color"
                  value={config.atrColor}
                  onChange={e => onChange({ ...config, atrColor: e.target.value })}
                  className="w-4 h-4 rounded cursor-pointer border-0 bg-transparent"
                />
                <select
                  value={config.atrWidth}
                  onChange={e => onChange({ ...config, atrWidth: parseInt(e.target.value) || 2 })}
                  className="px-1 py-0.5 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-main)]"
                >
                  <option value="1">1px</option>
                  <option value="2">2px</option>
                  <option value="3">3px</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-3 border-t border-[var(--border-color)] bg-[var(--bg-card)]">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold transition cursor-pointer"
          >
            Applica & Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};
