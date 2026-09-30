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
            className="p-1 rounded hover:bg-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition"
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
                className="flex items-center gap-1 px-2 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[11px] transition"
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
                    className="p-1 rounded text-red-500 hover:bg-red-500/10 transition ml-auto"
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
            className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold transition"
          >
            Applica & Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};
