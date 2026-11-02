# dreamdex-bot-kit backtest `computeMetrics` reports `maxDrawdownPct` as the percentage of the largest ABSOLUTE drawdown, not the largest percentage drawdown
Severity: normal
Area: SDK

## Steps to reproduce
1. `git clone https://github.com/somnia-chain/dreamdex-bot-kit` (no install needed: the script loads `quant.py` directly, so `web3` is not required).
2. Save this as `repro.mts` in a separate directory (replace `<kit>` with the path of the clone). It uses stubbed clients / pure functions only: no funds, no key, no chain access.
```ts
import { computeMetrics } from "<kit>/packages/backtest/src/report/metrics.ts";
import { PortfolioLedger } from "<kit>/packages/backtest/src/sim/ledger.ts";
// 1000 -> 900 (-10%), then up to 2000, then 2000 -> 1850 (-7.5%, but a bigger absolute loss)
const curve = [1000, 900, 2000, 1850].map((equity, t) => ({ t, equity }));
const m = computeMetrics({ initialEquity: 1000, finalEquity: 1850, ledger: new PortfolioLedger(1000, 0), lastMid: 1, equityCurve: curve });
console.log("maxDrawdown", m.maxDrawdown, "maxDrawdownPct", m.maxDrawdownPct);
console.log("true worst peak-to-trough pct drawdown: 0.1");
```
3. Run `npx tsx repro.mts`

## Expected
`maxDrawdownPct` is the worst peak-to-trough percentage drawdown of the equity curve (0.10 here).

## Actual
```
maxDrawdown 150 maxDrawdownPct 0.075
true worst peak-to-trough pct drawdown: 0.1
```
`maxDrawdownPct` is 0.075: the pct belonging to the 150-unit drawdown, not the worst 10% one. The review table (`formatReviewTable`, 'maxDrawdn' column) prints this figure, so a run that lost 10% from an early peak shows a milder drawdown whenever a later, larger-equity drawdown is bigger in absolute terms.

## Evidence
`packages/backtest/src/report/metrics.ts` lines ~68-76: `maxDdPct` is only assigned inside `if (dd > maxDd)`, i.e. it is the pct of the max absolute drawdown. It should be tracked as `max(dd / peak)` independently.

Output above was captured on the kit at commit 4e75896 (stubbed clients, nothing sent on-chain).

## Environment
dreamdex-bot-kit main @ 4e75896, Node v22.23.4, tsx (npx), viem 2.x, @somnia-chain/markets-sdk as installed by the kit, Python 3 for core-py.
