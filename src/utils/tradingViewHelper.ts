/**
 * Helper to get the correct TradingView chart link for any instrument.
 * It uses the predefined `tvSym` from the Instrument model or falls back to a clean query.
 */
export const getTradingViewUrl = (tvSym: string | undefined, sym: string): string => {
  if (tvSym) {
    // If tvSym is like "MIL:A2A", replace colons with %3A to make it URL-safe for the chart page
    return `https://it.tradingview.com/chart/?symbol=${encodeURIComponent(tvSym)}`;
  }
  return `https://it.tradingview.com/chart/?symbol=${encodeURIComponent(sym)}`;
};
