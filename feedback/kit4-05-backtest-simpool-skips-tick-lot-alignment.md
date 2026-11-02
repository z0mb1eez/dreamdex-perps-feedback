# dreamdex-bot-kit backtest `SimPool.place` does not snap price/qty to the tick/lot grid (the live `Pool.place` does), so backtests fill sizes and prices a real order is rounded away from
Severity: normal
Area: SDK

## Steps to reproduce
1. Save `e.mts` (imports the kit's own `SimPool` and `PortfolioLedger`; tick 0.01, lot 0.1, minQty 0.1):
```ts
import { SimPool } from "<kit>/packages/backtest/src/sim/sim-pool.ts";
import { PortfolioLedger } from "<kit>/packages/backtest/src/sim/ledger.ts";
import { alignToLot, toRaw } from "<kit>/packages/core/src/quant.ts";
const sp = new SimPool({ symbol: "X", meta: { tick: 0.01, lot: 0.1, minQty: 0.1 }, ledger: new PortfolioLedger(1000, 0) } as any);
sp.setCandle({ timestamp: 1, open: "1", high: "1.1", low: "0.9", close: "1", volume: "10" } as any);
const b = await sp.topOfBook(); console.log("book", b);
await sp.place({ isBid: true, price: b.bestAsk!, qty: 0.15, orderType: 2 } as any);   // IOC buy 0.15
console.log("sim ledger base after IOC buy qty=0.15:", sp.ledger.base);
console.log("live Pool.place sends qty raw:", alignToLot(toRaw(0.15, 18), 10n ** 17n), "(= 0.1)");
```
2. `<kit>/node_modules/.bin/tsx e.mts`

## Expected
`SimPool` implements the same surface as `Pool` ("Strategies call the same surface as live Pool"). The live `Pool.place` applies `alignToTick(...)` (bid down / ask up) and `alignToLot(...)` (down) and then asserts min quantity; the simulated pool should do the same so a backtest only trades sizes and prices the chain would accept.

## Actual
```
book { bestBid: 0.9995, bestAsk: 1.0005, mid: 1 }
sim ledger base after IOC buy qty=0.15: 0.15
live Pool.place sends qty raw: 100000000000000000n (= 0.1)
```
The sim fills 0.15 against a 0.1 lot (live would send 0.1), and the synthetic book itself carries prices (0.9995 / 1.0005) that are not on the 0.01 tick grid, so fills happen at prices that cannot exist on the venue. Only `args.qty < minQty` is checked, and before any lot snapping (the live path asserts min after snapping). Result: a strategy sizing at a non-lot multiple backtests with up to one lot more exposure per order than it will have live.

## Evidence
`packages/backtest/src/sim/sim-pool.ts` `place()` passes `args` straight to `FillEngine.place`; `packages/core/src/pool.ts` `place()` aligns first. `meta.tick` / `meta.lot` are stored on `SimPool` but never used to round.

## Environment
dreamdex-bot-kit main, Node 22, tsx.
