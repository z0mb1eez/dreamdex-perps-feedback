# dreamdex-bot-kit: `Pool.place()` returns no fill information, and momentum/grid/twap record the FULL requested size as bought/sold after any IOC order that does not throw
Severity: normal
Area: SDK

## Steps to reproduce
1. `git clone https://github.com/somnia-chain/dreamdex-bot-kit && cd dreamdex-bot-kit && npm install`.
2. Read `PlaceOrderResult` in `packages/core/src/execute.ts`: it is `{ txHash, orderId, gasUsed }` only; there is no filled quantity. `ORDER_TYPE.ImmediateOrCancel` is documented in the same kit (`packages/core/src/gotchas.ts`) as "Fill what you can now, cancel the rest. The taker default", i.e. partial fills (and zero fills of the remainder) are normal outcomes.
3. Run the kit's `Momentum` class against a stub pool whose `place()` resolves like the real one (tx mined, `OrderPlaced` log, no fill info). Save `mo.mjs` in a separate directory and run it from `strategies/momentum` with tsx:
```js
import { Momentum } from "<kit>/strategies/momentum/src/strategy.ts";
let mid = 1.00, placed = [];
const pool = { minQty: 0.001,
  topOfBook: async () => ({ bestBid: mid - 0.0005, bestAsk: mid + 0.0005, mid }),
  place: async (o) => { placed.push(o); return { txHash: "0xabc", orderId: 1n, gasUsed: 1n }; } };
const cfg = { windowSize: 6, entryMomentum: 0.001, exitMomentum: 0, takeProfitPct: 0.05, stopLossPct: 0.05, notionalUsdso: 10, crossBps: 10, dryRun: false };
const m = new Momentum(pool, cfg, () => {});
for (const v of [1.000, 1.000, 1.000, 1.002, 1.003, 1.004, 1.005]) { mid = v; await m.tick(); }
console.log("orders sent:", placed.length, "| strategy believes it holds a position:", !!m.position, m.position);
```
4. `cd <kit>/strategies/momentum && npx tsx /path/to/mo.mjs`

## Expected
After an IOC entry the strategy knows how much was actually filled (partial fill, or none) before it records a position, or the core `Pool.place()` exposes the filled quantity (the perp-core `placePerp` already does: it sums `res.fills`).

## Actual
```
orders sent: 1 | strategy believes it holds a position: true { entry: 1.0045, qty: 9.955201592832255 }
```
The strategy sets `position = { entry: bestAsk, qty }` with the requested size as soon as `pool.place()` does not throw. The same assumption is in `strategies/grid/src/strategy.ts` (`this.lots.push({ price, qty })` after `pool.place`, `closeLots` after the sell) and `strategies/twap/src/strategy.ts` (`filledBase += qty`, "best-effort"). With a partial fill, or a book that moved so the (tick-rounded-down) bid no longer crosses, the bot then tracks inventory it does not hold, sizes its exit for the full amount (exit orders fail or oversell what the wallet has), and reports PnL/summary on fills that did not happen.

## Evidence
Output above (stub pool, kit's own strategy class run under tsx, 2026-11-02). The stub matches the shape returned by the real `Pool.place()` (`PlaceOrderResult`).

## Environment
dreamdex-bot-kit main (packages/core + strategies), Node 22, tsx.
