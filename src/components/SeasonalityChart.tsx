import React from "react";

interface SeasonalityChartProps {
  monthlyAverages: number[];
  winRates: number[];
}

const MONTHS_LBL = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];

export default function SeasonalityChart({ monthlyAverages, winRates }: SeasonalityChartProps) {
  const maxAbs = Math.max(...monthlyAverages.map(Math.abs), 1);

  return (
    <div className="flex flex-col gap-3">
      {/* Visual Bar Grid */}
      <div className="flex items-end gap-1.5 h-[100px] border-b border-[var(--border)] pb-1 pt-4">
        {monthlyAverages.map((avg, idx) => {
          const isPos = avg >= 0;
          const heightPct = Math.min(100, Math.floor((Math.abs(avg) / maxAbs) * 100));
          const heightStr = `${Math.max(4, heightPct)}%`;
          const winRate = winRates[idx] || 50;

          // Win Rate Indicator Color
          const wrColor = winRate >= 60 ? "bg-[var(--green)]" : winRate >= 40 ? "bg-[var(--orange)]" : "bg-[var(--red)]";

          return (
            <div key={idx} className="flex-1 flex flex-col justify-end items-center h-full group relative">
              {/* Tooltip */}
              <div className="absolute bottom-full mb-1 bg-[var(--bg3)] text-white border border-[var(--gray)] px-1.5 py-0.5 rounded text-[8px] font-mono opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-30">
                {isPos ? "+" : ""}{avg.toFixed(2)}% (Win: {winRate}%)
              </div>

              {/* Data label */}
              <span className={`text-[8px] font-mono font-bold mb-1 ${isPos ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
                {avg > 0 ? "+" : ""}{avg.toFixed(1)}%
              </span>

              {/* Styled Bar */}
              <div
                style={{ height: heightStr }}
                className={`w-full rounded-t-sm transition-all duration-300 ${
                  isPos ? "bg-[var(--green)]/70 group-hover:bg-[var(--green)]" : "bg-[var(--red)]/70 group-hover:bg-[var(--red)]"
                }`}
              />

              {/* Win Rate Dot/Line */}
              <div className={`h-1.5 w-full mt-1.5 rounded-full ${wrColor}`} title={`Win Rate: ${winRate}%`} />

              {/* Month identifier */}
              <span className="text-[9px] font-mono text-[var(--text3)] mt-1 font-bold">
                {MONTHS_LBL[idx]}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between text-[9px] text-[var(--text3)] font-mono">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 bg-[var(--green)]/70 rounded-xs" />
          <span>Bull Season</span>
          <span className="inline-block w-2.5 h-2.5 bg-[var(--red)]/70 rounded-xs ml-2" />
          <span>Bear Season</span>
        </div>
        <div className="flex items-center gap-2">
          <span>Storico Win Rate:</span>
          <span className="text-[var(--green)] font-bold">≥60%</span>
          <span className="text-[var(--orange)] font-bold">40-59%</span>
          <span className="text-[var(--red)] font-bold">&lt;40%</span>
        </div>
      </div>
    </div>
  );
}
