# dreamdex-bot-kit backtest `winRate` uses only the LAST buy fill as the entry, so it can report 100% win rate for a round trip the ledger books as a loss
Severity: normal
Area: SDK

## Steps to reproduce
1. `git clone https://github.com/somnia-chain/dreamdex-bot-kit` (no install needed: the script loads `quant.py` directly, so `web3` is not required).
2. Save this as `repro.mts` in a separate directory (replace `<kit>` with the path of the clone). It uses stubbed clients / pure functions only: no funds, no key, no chain access.
```ts
import { computeMetrics } from "<kit>/packages/backtest/src/report/metrics.ts";
import { PortfolioLedger } from "<kit>/packages/backtest/src/sim/ledger.ts";
const f = (isBid: boolean, price: number, qty: number) =>
  ({ orderId: 1n, isBid, price, qty, fee: 0, timestamp: 1, role: "taker" as const });
const l = new PortfolioLedger(1000, 0);
for (const x of [f(true, 100, 1), f(true, 50, 1), f(false, 60, 2)]) l.applyFill(x);   // avg entry 75, sold at 60
const m = computeMetrics({ initialEquity: 1000, finalEquity: l.equity(60), ledger: l, lastMid: 60, equityCurve: [] });
console.log("ledger.realizedPnl:", l.realizedPnl, "| metrics.winRate:", m.winRate);
```
3. Run `npx tsx repro.mts`

## Expected
Selling 2 units at 60 after buying at 100 and 50 (average 75) is a losing round trip: realizedPnl -30 and winRate 0.

## Actual
```
ledger.realizedPnl: -30 | metrics.winRate: 1
```
The same report shows a realised loss and a 100% win rate. The win loop overwrites `entry` on every buy and discards it entirely on the first sell, so scale-ins and partial sells are mis-scored.

## Evidence
`packages/backtest/src/report/metrics.ts` lines ~52-64: `entry = { price: f.price, qty: f.qty }` (overwrites, never accumulates) and `if (f.price > entry.price) wins += 1; entry = undefined;` (partial sell closes the whole entry). `PortfolioLedger` already tracks `avgEntry`/`positionBase`; the metric ignores it. Grid and market-making strategies (many buys per sell) are the most affected.

Output above was captured on the kit at commit 4e75896 (stubbed clients, nothing sent on-chain).

## Environment
dreamdex-bot-kit main @ 4e75896, Node v22.23.4, tsx (npx), viem 2.x, @somnia-chain/markets-sdk as installed by the kit, Python 3 for core-py.
