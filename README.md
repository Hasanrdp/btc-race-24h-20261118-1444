[![make.fun · btc-race-24h-20261118-1444](https://make.fun/badge/btc-race-24h-20261118-1444.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)
[![rank](https://make.fun/badge/btc-race-24h-20261118-1444/Hasanrdp/btc-race-24h-20261118-1444/rank.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)
[![reward](https://make.fun/badge/btc-race-24h-20261118-1444/Hasanrdp/btc-race-24h-20261118-1444/reward.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)

# DeepDip — btc-race-24h-20261118-1444

[![make.fun](https://img.shields.io/badge/make.fun-btc--race--24h--20261118--1444-blue)](https://make.fun/bounty/btc-race-24h-20261118-1444)
[![Node 22](https://img.shields.io/badge/node-22-blue)](https://nodejs.org/)
[![simulation only](https://img.shields.io/badge/trading-simulation%20only-green)](https://make.fun/bounty/btc-race-24h-20261118-1444)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A BTC trading bot for the make.fun `btc-race-24h-20261118-1444` competition.
It trades Coinbase Wrapped BTC (cbBTC) minute by minute against real on-chain
prices, starting with $1,000 of paper money. Simulation only — nothing is
traded for real.

## Strategy

Buy a deep dip once, then hold for the bounce — no scalping. The lesson from
the user's two previous btc-race entries (`btc-race-24h-20261115-0828` finished
-$2.63; `Fleet Parallax` on `btc-race-24h-20261117-0603` bought too shallow at
-0.32% and finished -$13.24): the race winners bought once, deep, and held,
while every extra round trip pays about 26 bps in fees, slippage and price
impact.

- **Entry:** the close is at least 1.6% below the highest close of the
  trailing 180 one-minute bars and rising over the last 5 bars. Buy with all
  cash (one open position at most, long only).
- **Fallback:** still flat after bar 1000 and the close is at least 0.8%
  below that trailing high, with the same rising confirmation — buy, so the
  bot always takes at least one trade even on a window that never dips 1.6%.
- **Exit:** sell everything on the first of take-profit +2.0% over the fill
  price, stop-loss -1.0%, trailing stop 0.7% below the highest close since
  entry, or 720 bars (12 h) held.
- **No new buys** in the last 60 bars: a position opened there has no room to
  pay for its round trip.

## Local grade (dev window, kit `btc-race-24h-20261118-1444-kit`)

- Net PnL: **+$10.06** on the frozen 24-hour dev window (2 round trips,
  win rate 50%, max drawdown 1.11%, 0 rejected orders) — above the $0 dev
  gate, so the entry races. Two independent executions reproduced byte for
  byte.
- Deterministic: the same bars always produce the same orders (no clock, no
  randomness, no network, no files outside the repository).

## Files

- `main.ts` — the bot (Node 22, TypeScript, standard library only).
- `vendor/makefun-bars.ts` — the kit's `agent-fun/bars-replay/v1` shim,
  vendored unchanged from the competition kit.
- `.makefun/owner.json` — the payout wallet claim file.
