# dreamdex-bot-kit backtest `FillEngine.tryCross` applies slippage after clamping to the limit price, so IOC limit orders fill worse than their own limit (buy above, sell below) and backtests report fills a real order could never get
Severity: normal
Area: SDK

## Steps to reproduce
1. `git clone https://github.com/somnia-chain/dreamdex-bot-kit` (no install needed: the script loads `quant.py` directly, so `web3` is not required).
2. Save this as `repro.mts` in a separate directory (replace `<kit>` with the path of the clone). It uses stubbed clients / pure functions only: no funds, no key, no chain access.
```ts
import { FillEngine } from "<kit>/packages/backtest/src/sim/fill-engine.ts";
import { ORDER_TYPE } from "<kit>/packages/core/dist/index.js";
const candle: any = { timestamp: 1000, open: "100", high: "101", low: "99", close: "100", volume: "10" };
const e = new FillEngine({ slippageBps: 100 });
const buy = e.place({ isBid: true, price: 100, qty: 1, orderType: ORDER_TYPE.ImmediateOrCancel } as any,
  { bestBid: 99.9, bestAsk: 100, mid: 99.95 }, candle);
console.log("IOC limit BUY  @ 100 filled at", buy.fills[0].price);
const sell = e.place({ isBid: false, price: 100, qty: 1, orderType: ORDER_TYPE.ImmediateOrCancel } as any,
  { bestBid: 100, bestAsk: 100.1, mid: 100.05 }, candle);
console.log("IOC limit SELL @ 100 filled at", sell.fills[0].price);
```
3. Run `npx tsx repro.mts`

## Expected
An order with a limit price never fills worse than that price: the buy above fills at most at 100 and the sell at least at 100. Slippage should be applied to the touch and then capped by the order's limit (or the order should not fill if slipped price breaches the limit).

## Actual
```
IOC limit BUY  @ 100 filled at 101
IOC limit SELL @ 100 filled at 99
```
Both fills break the order's own limit price by the full slippage amount.

## Evidence
`packages/backtest/src/sim/fill-engine.ts` lines ~234 and ~250: `const price = Math.min(args.price, book.bestAsk) * (1 + slip);` and `Math.max(args.price, book.bestBid) * (1 - slip);` - the slippage multiplier is applied after the limit clamp, with no re-clamp. Every strategy that crosses the book with `shiftBps(ask, crossBps)` as its limit (momentum, mean-reversion, ensemble) therefore gets modelled fills outside the limit it sent whenever `--slippage-bps` is set.

Output above was captured on the kit at commit 4e75896 (stubbed clients, nothing sent on-chain).

## Environment
dreamdex-bot-kit main @ 4e75896, Node v22.23.4, tsx (npx), viem 2.x, @somnia-chain/markets-sdk as installed by the kit, Python 3 for core-py.
