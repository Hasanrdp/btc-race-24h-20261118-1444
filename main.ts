// DeepDip — a buy-the-deep-dip cbBTC bot for make.fun btc-race-24h-20261118-1444.
//
// Strategy (the lesson from the user's two previous btc-race entries, agreed
// 18 Nov 2026: buy-and-hold a DEEP dip, never scalp — one full-size round trip
// pays about 26 bps in fees, slippage and price impact, so small moves lose
// money and the race winners bought once, deep, and held):
//
// - Flat: buy with all cash when the latest close is at least 1.6% below the
//   highest close of the trailing 180 one-minute bars (a real dip, not noise)
//   and the close is rising over the last 5 bars (the dip is turning up).
// - Fallback: still flat after bar 1000 and the close is at least 0.8% below
//   that trailing high, with the same rising confirmation — buy, so the bot
//   always takes at least one trade even on a window that never dips 1.6%.
// - Holding: sell everything on the first of
//     * take-profit:  close >= entry price * 1.02,
//     * stop-loss:    close <= entry price * 0.99,
//     * trailing stop: close <= highest close since entry * 0.993,
//     * time stop:   720 bars (12 h) held.
// - No new buys once 1380 bars have been seen: a position opened in the last
//   hour has no room to pay for its round trip.
//
// Long only, one open position at most, standard library only. Deterministic:
// every decision is a pure function of the bars seen so far — no clock, no
// randomness, no network, no files outside the repository.

import { runBars, type BarsState, type Batch, type OrderInput } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';
const LOOKBACK = 180; // bars of trailing high for the dip reference (3 hours)
const DIP_BPS = 160n; // buy when close is >= 1.6% below the trailing high
const FALLBACK_BAR = 1000; // from here, a shallower dip also counts as a buy
const FALLBACK_DIP_BPS = 80n; // fallback dip: 0.8% below the trailing high
const MOM_BARS = 5; // rising confirmation: close above the close 5 bars ago
const TAKE_PROFIT_BPS = 200n; // sell at +2.0% over the entry (fill) price
const STOP_LOSS_BPS = 100n; // sell at -1.0% under the entry (fill) price
const TRAIL_BPS = 70n; // sell 0.7% below the highest close since entry
const MAX_HOLD_BARS = 720; // sell after 12 hours held, whatever the price
const NO_BUY_AFTER_BARS = 1380; // no new buys in the last 60 bars of the window
const MAX_SLIPPAGE_BPS = 200; // fills are at the next open; 2% covers any 1-min gap
const BPS = 10_000n;

const closes: bigint[] = []; // latest close per bar, raw price units
let entryPx: bigint | null = null; // fill price of the open position, raw units
let entryBar = -1; // index (in closes) of the bar the buy was decided on
let highSince: bigint | null = null; // highest close since entry, raw units

await runBars({
  onBatch(state: BarsState, batch: Batch): OrderInput[] {
    for (const bar of batch.bars) {
      if (bar.symbol === SYMBOL) closes.push(BigInt(bar.c));
    }
    if (state.warmingUp) return [];
    const n = closes.length;
    if (n === 0) return [];
    const close = closes[n - 1]!;
    const holding = state.positions.get(SYMBOL);
    const qty = holding === undefined ? 0n : holding.qty;

    if (qty === 0n) {
      entryPx = null;
      entryBar = -1;
      highSince = null;
      if (n < LOOKBACK || n >= NO_BUY_AFTER_BARS) return [];
      let high = closes[n - LOOKBACK]!;
      for (let i = n - LOOKBACK + 1; i < n; i++) {
        if (closes[i]! > high) high = closes[i]!;
      }
      const rising = close > closes[n - 1 - MOM_BARS]!;
      const deep = close * BPS <= high * (BPS - DIP_BPS);
      const shallow =
        n >= FALLBACK_BAR && close * BPS <= high * (BPS - FALLBACK_DIP_BPS);
      if (rising && (deep || shallow)) {
        entryBar = n - 1;
        return [{ side: 'buy', symbol: SYMBOL, notional_quote_units: state.cash, max_slippage_bps: MAX_SLIPPAGE_BPS }];
      }
      return [];
    }

    // Holding: derive the exact fill price from the position's cost.
    if (entryPx === null) {
      const quoteScale = state.hello.capital.quote_scale;
      const sym = state.symbols.get(SYMBOL)!;
      entryPx =
        (holding!.cost * 10n ** BigInt(sym.qty_scale + sym.price_scale)) /
        (qty * 10n ** BigInt(quoteScale));
      highSince = entryPx;
    }
    if (close > highSince!) highSince = close;
    const entry = entryPx;
    if (
      close * BPS >= entry * (BPS + TAKE_PROFIT_BPS) ||
      close * BPS <= entry * (BPS - STOP_LOSS_BPS) ||
      close * BPS <= highSince! * (BPS - TRAIL_BPS) ||
      n - 1 - entryBar >= MAX_HOLD_BARS
    ) {
      return [{ side: 'sell', symbol: SYMBOL, qty, max_slippage_bps: MAX_SLIPPAGE_BPS }];
    }
    return [];
  },
});
